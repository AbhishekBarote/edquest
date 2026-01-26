from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from typing import List, Dict, Any, Optional
import os
import networkx as nx
import asyncio
import json
from dotenv import load_dotenv
import openai
import google.generativeai as genai
import re
import httpx
import traceback
import uuid

load_dotenv()

app = FastAPI()

# Allow CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Configure APIs
OPENAI_API_KEY = os.getenv("OPENAI_API_KEY")
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")

if GEMINI_API_KEY:
    genai.configure(api_key=GEMINI_API_KEY)

# --- Data Models ---

class Node(BaseModel):
    id: str
    type: str  # 'start', 'llm', 'condition', 'tool', 'code', 'end', 'gmail' (legacy support)
    data: Dict[str, Any]
    position: Optional[Dict[str, float]] = None

class Edge(BaseModel):
    id: str
    source: str
    target: str
    sourceHandle: Optional[str] = None
    targetHandle: Optional[str] = None

class FlowRequest(BaseModel):
    nodes: List[Node]
    edges: List[Edge]
    inputs: Optional[Dict[str, Any]] = {} # Initial inputs like sys.query

# --- Helper Functions ---

def resolve_variables(text: str, context: Dict[str, Any]) -> str:
    """
    Replaces {{variable}} patterns in text with values from context.
    Supports dot notation e.g., {{node_1.output}}
    """
    if not isinstance(text, str):
        return text

    def replace_match(match):
        key_path = match.group(1).strip()
        parts = key_path.split('.')
        
        current = context
        try:
            for part in parts:
                if isinstance(current, dict):
                    current = current.get(part)
                else:
                    return match.group(0) # path invalid
            
            if current is None:
                return "" # or keep original?
            return str(current)
        except Exception:
            return match.group(0)

    # Regex for {{ variable }}
    return re.sub(r'\{\{(.*?)\}\}', replace_match, text)

def resolve_nested_data(data: Any, context: Dict[str, Any]) -> Any:
    """Recursively resolves variables in a dictionary or list."""
    if isinstance(data, str):
        return resolve_variables(data, context)
    elif isinstance(data, dict):
        return {k: resolve_nested_data(v, context) for k, v in data.items()}
    elif isinstance(data, list):
        return [resolve_nested_data(i, context) for i in data]
    return data

async def run_llm_node(data: Dict[str, Any], context: Dict[str, Any]):
    model_name = data.get('model', 'gemini-2.5-flash')
    prompt_template = data.get('prompt', '')
    
    # Resolve prompt
    resolved_prompt = resolve_variables(prompt_template, context)
    
    try:
        if "gpt" in model_name.lower():
            if not OPENAI_API_KEY:
                raise ValueError("OpenAI API Key missing")
            client = openai.OpenAI(api_key=OPENAI_API_KEY)
            response = client.chat.completions.create(
                model=model_name,
                messages=[{"role": "user", "content": resolved_prompt}]
            )
            return {"text": response.choices[0].message.content}
            
        elif "gemini" in model_name.lower():
            if not GEMINI_API_KEY:
                raise ValueError("Gemini API Key missing")
            model = genai.GenerativeModel(model_name)
            response = model.generate_content(resolved_prompt)
            return {"text": response.text}
        else:
            return {"error": f"Unsupported model: {model_name}"}
    except Exception as e:
        raise Exception(f"LLM Error: {str(e)}")

async def run_tool_node(data: Dict[str, Any], context: Dict[str, Any]):
    url = resolve_variables(data.get('url', ''), context)
    method = data.get('method', 'GET')
    headers = resolve_nested_data(data.get('headers', {}), context)
    body = resolve_nested_data(data.get('body', {}), context)
    
    async with httpx.AsyncClient() as client:
        try:
            if method == 'GET':
                resp = await client.get(url, headers=headers, params=body)
            elif method == 'POST':
                resp = await client.post(url, headers=headers, json=body)
            else:
                raise ValueError(f"Unsupported method {method}")
            
            # Try parsing JSON, else text
            try:
                return {"status": resp.status_code, "body": resp.json()}
            except:
                return {"status": resp.status_code, "text": resp.text}
        except Exception as e:
            raise Exception(f"API Error: {str(e)}")

def run_code_node(data: Dict[str, Any], context: Dict[str, Any]):
    code = data.get('code', '')
    # Dangerous! Sandbox needed in production.
    # We will pass 'context' and expect 'result'
    
    local_env = {"context": context, "result": None}
    try:
        exec(code, {}, local_env)
        return {"result": local_env.get("result")}
    except Exception as e:
        raise Exception(f"Code Execution Error: {str(e)}")

def run_condition_node(data: Dict[str, Any], context: Dict[str, Any]):
    # Evaluates expression and returns "true" or "false"
    # Simple Python eval
    expression = data.get('expression', 'False')
    resolved_expr = resolve_variables(expression, context) # Basic substitution first
    
    # Or better: let user write "sys.query == 'hello'" and we allow specific vars
    # For safety, we might prefer basic comparison logic, but for "Code Node" power we use eval.
    # Let's try to be somewhat safe by only allowing 'context' access
    
    try:
        # We allow accessing context variables directly in eval?
        # e.g. context['node_1']['text'] == 'foo'
        # user writes: {{node_1.text}} == 'foo' -> resolved to "foo" == 'foo'
        # This works for string comparisons.
        
        # If the resolved_expr is literally "True", return True
        # but let's just eval it.
        result = eval(resolved_expr)
        return {"result": bool(result)}
    except Exception as e:
         raise Exception(f"Condition Error: {str(e)}")


# --- Execution Engine ---

@app.post("/execute")
async def execute_flow(flow: FlowRequest):
    G = nx.DiGraph()
    node_map = {n.id: n for n in flow.nodes}
    
    # Build Graph
    for node in flow.nodes:
        G.add_node(node.id)
    for edge in flow.edges:
        G.add_edge(edge.source, edge.target, data=edge)
        
    if not nx.is_directed_acyclic_graph(G):
        raise HTTPException(status_code=400, detail="Flow contains cycles")
        
    execution_order = list(nx.topological_sort(G))
    
    # Initialize Global Context
    context = {"sys": flow.inputs or {}}
    
    async def execution_generator():
        # Track executed nodes to handle skipping
        executed_nodes = set()
        # Track skipped nodes (due to condition branches)
        skipped_nodes = set()
        
        for node_id in execution_order:
            node = node_map.get(node_id)
            if not node: continue
            
            # Check upstream dependencies
            predecessors = list(G.predecessors(node_id))
            
            # If any predecessor was skipped, check if we should be skipped
            # Valid logic: A node executes if AT LEAST ONE valid path reaches it? 
            # OR ALL required paths? 
            # Dify/N8N usually: If a node is on a path that is "false", it doesn't run.
            
            # Simplified Logic:
            # If a predecessor is a Condition Node:
            # Check the edge connecting Predecessor -> Current Node.
            # Does the edge handle match the Condition result?
            
            should_skip = False
            for pred_id in predecessors:
                if pred_id in skipped_nodes:
                    should_skip = True # Propagate skip
                    break
                
                # Check condition logic
                pred_node = node_map[pred_id]
                if pred_node.type == 'condition' and pred_id in context:
                    result = context[pred_id].get('result', False) # True/False
                    
                    # Find edge
                    edge_data = G.get_edge_data(pred_id, node_id)['data']
                    source_handle = edge_data.sourceHandle # 'true' or 'false'
                    
                    # If edge is labeled 'true' but result is False -> Skip
                    if source_handle == 'true' and not result:
                        should_skip = True
                    # If edge is labeled 'false' but result is True -> Skip
                    elif source_handle == 'false' and result:
                        should_skip = True
            
            if should_skip:
                skipped_nodes.add(node_id)
                # Yield skipped status?
                yield json.dumps({"node_id": node_id, "status": "skipped"}) + "\n"
                continue

            # Execute Node
            yield json.dumps({"node_id": node_id, "status": "running"}) + "\n"
            
            try:
                output = {}
                
                if node.type == 'start':
                    # Start node passes sys data to output for consistency
                    output = context.get('sys', {})
                    
                elif node.type == 'llm':
                    output = await run_llm_node(node.data, context)
                    
                elif node.type == 'condition':
                    output = run_condition_node(node.data, context)
                    
                elif node.type == 'tool':
                    output = await run_tool_node(node.data, context)
                    
                elif node.type == 'code':
                    output = run_code_node(node.data, context)
                    
                elif node.type == 'end':
                    # Return specific variable?
                    target_var = node.data.get('output_var')
                    if target_var:
                        output = {"final_result": resolve_variables(target_var, context)}
                    else:
                        output = {"final_result": context} # Dump all?
                
                elif node.type == 'gmail': # Legacy/Specific
                    output = {"status": "sent", "details": f"Mock email to {node.data.get('recipient')}"}
                
                elif node.type == 'prompt': # Legacy
                    output = {"text": node.data.get('text')}
                    
                elif node.type == 'model': # Legacy
                    # Quick adapter for old model node
                    full_input = "\n".join([str(context[p]) for p in predecessors if p in context])
                    output = await run_llm_node({"model": node.data.get('model'), "prompt": full_input}, context)

                elif node.type == 'output': # Legacy
                     output = {"result": "Done"}

                # Update Context
                context[node_id] = output
                
                # Yield Success
                yield json.dumps({
                    "node_id": node_id, 
                    "status": "completed", 
                    "output": output
                }) + "\n"
                
                executed_nodes.add(node_id)
                
            except Exception as e:
                # Log error
                error_msg = str(e) + traceback.format_exc()
                yield json.dumps({
                    "node_id": node_id, 
                    "status": "failed", 
                    "output": {"error": str(e)}
                }) + "\n"
                # Stop execution on error?
                break


    return StreamingResponse(execution_generator(), media_type="application/x-ndjson")

class SingleNodeRequest(BaseModel):
    node: Node
    context: Dict[str, Any]

@app.post("/execute-node")
async def execute_single_node(request: SingleNodeRequest):
    node = request.node
    context = request.context
    
    try:
        output = {}
        if node.type == 'start':
            output = context.get('sys', {})
        elif node.type == 'llm':
            output = await run_llm_node(node.data, context)
        elif node.type == 'condition':
            output = run_condition_node(node.data, context)
        elif node.type == 'tool':
            output = await run_tool_node(node.data, context)
        elif node.type == 'code':
            output = run_code_node(node.data, context)
        elif node.type == 'end':
             target_var = node.data.get('output_var')
             if target_var:
                output = {"final_result": resolve_variables(target_var, context)}
             else:
                output = {"final_result": "End Node Reached"}

        return {"status": "completed", "output": output, "node_id": node.id}

    except Exception as e:
        return {"status": "failed", "output": {"error": str(e)}, "node_id": node.id}

@app.get("/")
def read_root():
    return {"message": "AI Studio Backend Running"}


# Legacy Validation (Keep frontend happy)
class SMTPRequest(BaseModel):
    server: str
    port: int
    email: str
    password: str

@app.post("/validate-smtp")
async def validate_smtp(request: SMTPRequest):
    return {"status": "success"}

# --- Persistence / Publishing ---

WORKFLOW_DIR = os.path.join(os.path.dirname(__file__), "workflows")
os.makedirs(WORKFLOW_DIR, exist_ok=True)

class PublishResponse(BaseModel):
    id: str
    url: str

@app.post("/publish", response_model=PublishResponse)
async def publish_workflow(flow: FlowRequest):
    """Saves the current flow configuration to a persistent JSON file."""
    workflow_id = str(uuid.uuid4())[:8] # Short ID
    file_path = os.path.join(WORKFLOW_DIR, f"{workflow_id}.json")
    
    data = {
        "nodes": [n.dict() for n in flow.nodes],
        "edges": [e.dict() for e in flow.edges],
        "inputs": flow.inputs
    }
    
    with open(file_path, "w") as f:
        json.dump(data, f, indent=2)
        
    # maintain generic local URL for demo
    return {"id": workflow_id, "url": f"/app/{workflow_id}"} 

@app.get("/workflow/{workflow_id}")
async def get_workflow(workflow_id: str):
    """Retrieves a workflow by ID."""
    file_path = os.path.join(WORKFLOW_DIR, f"{workflow_id}.json")
    
    if not os.path.exists(file_path):
        raise HTTPException(status_code=404, detail="Workflow not found")
        
    with open(file_path, "r") as f:
        data = json.load(f)
        
    return data
