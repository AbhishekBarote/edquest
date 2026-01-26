import React, { useCallback, useRef, useState, useEffect, Component } from 'react';
import {
  ReactFlow,
  addEdge,
  Background,
  Controls,
  useNodesState,
  useEdgesState,
  MiniMap,
  ReactFlowProvider,
  useReactFlow
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { StartNode, LLMNode, ConditionNode, ToolNode, CodeNode, EndNode } from './components/nodes/CustomNodes';
import CustomEdge from './components/edges/CustomEdge';
import { NodeContext } from './NodeContext';
import { Play, Box, Layout, GitBranch, Globe, Code, CheckCircle, MessageSquare, Cpu, Share2, Terminal } from 'lucide-react';

// --- Error Boundary ---
class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true };
  }

  componentDidCatch(error, errorInfo) {
    this.setState({ error, errorInfo });
    console.error("Uncaught error:", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{ padding: '2rem', color: '#ef4444', background: '#0f172a', height: '100vh', overflow: 'auto' }}>
          <h1>Something went wrong.</h1>
          <details style={{ whiteSpace: 'pre-wrap', fontFamily: 'monospace' }}>
            {this.state.error && this.state.error.toString()}
            <br />
            {this.state.errorInfo && this.state.errorInfo.componentStack}
          </details>
        </div>
      );
    }
    return this.props.children;
  }
}

const nodeTypes = {
  start: StartNode,
  llm: LLMNode,
  condition: ConditionNode,
  tool: ToolNode,
  code: CodeNode,
  end: EndNode
};

const edgeTypes = {
  custom: CustomEdge,
};

const initialNodes = [
  {
    id: 'start_1',
    type: 'start',
    position: { x: 50, y: 200 },
    data: { output: {} }
  },
  {
    id: 'llm_1',
    type: 'llm',
    position: { x: 400, y: 200 },
    data: {
      model: 'gemini-2.5-flash',
      prompt: 'Write a short poem about {{sys.query}}.'
    }
  },
  {
    id: 'end_1',
    type: 'end',
    position: { x: 800, y: 200 },
    data: { output_var: '{{llm_1.text}}' }
  }
];

const initialEdges = [
  { id: 'e1', source: 'start_1', target: 'llm_1', type: 'custom', animated: true },
  { id: 'e2', source: 'llm_1', target: 'end_1', type: 'custom', animated: true }
];

const Sidebar = () => {
  const onDragStart = (event, nodeType) => {
    event.dataTransfer.setData('application/reactflow', nodeType);
    event.dataTransfer.effectAllowed = 'move';
  };

  const DraggableNode = ({ type, label, icon: Icon, color, subLabel }) => (
    <div
      className="sidebar-node"
      onDragStart={(event) => onDragStart(event, type)}
      draggable
      style={{
        display: 'flex', alignItems: 'center', gap: '10px',
        padding: '10px', borderRadius: '8px',
        background: 'rgba(255,255,255,0.03)',
        border: '1px solid transparent',
        cursor: 'grab',
        marginBottom: '8px',
        transition: 'all 0.2s'
      }}
    >
      <div style={{ padding: '8px', background: `${color}20`, borderRadius: '6px' }}>
        <Icon size={18} color={color} />
      </div>
      <div>
        <div style={{ fontWeight: 600, fontSize: '0.9rem' }}>{label}</div>
        <div style={{ fontSize: '0.7rem', color: 'var(--text-secondary)' }}>{subLabel}</div>
      </div>
    </div>
  );

  return (
    <aside className="glass-panel" style={{ width: '260px', padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '0.5rem', margin: '1rem', borderRight: '1px solid var(--border-color)', overflowY: 'auto' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1rem' }}>
        <Box size={24} color="var(--primary-color)" />
        <h2 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 700 }}>Nodes</h2>
      </div>

      <div style={{ fontSize: '0.75rem', fontWeight: 600, color: '#64748b', marginTop: '10px', marginBottom: '6px', textTransform: 'uppercase' }}>Core</div>
      <DraggableNode type="start" label="Start" icon={Play} color="#6366f1" subLabel="Trigger Workflow" />
      <DraggableNode type="end" label="End" icon={CheckCircle} color="#10b981" subLabel="Return Output" />

      <div style={{ fontSize: '0.75rem', fontWeight: 600, color: '#64748b', marginTop: '10px', marginBottom: '6px', textTransform: 'uppercase' }}>Logic</div>
      <DraggableNode type="llm" label="LLM" icon={Cpu} color="#ec4899" subLabel="Generate Text" />
      <DraggableNode type="condition" label="Condition" icon={GitBranch} color="#f59e0b" subLabel="If / Else Branch" />
      <DraggableNode type="code" label="Code" icon={Code} color="#8b5cf6" subLabel="Python Script" />
      <DraggableNode type="tool" label="API Request" icon={Globe} color="#3b82f6" subLabel="HTTP Call" />
    </aside>
  );
};

const OutputPanel = ({ logs }) => {
  return (
    <aside className="glass-panel" style={{
      width: '320px',
      padding: '1.5rem',
      display: 'flex',
      flexDirection: 'column',
      gap: '0.5rem',
      margin: '1rem 1rem 1rem 0',
      borderLeft: '1px solid var(--border-color)',
      overflowY: 'auto',
      background: 'rgba(15, 23, 42, 0.6)'
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '1rem' }}>
        <Terminal size={20} color="#10b981" />
        <h2 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 700 }}>Run Output</h2>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        {logs.length === 0 ? (
          <div style={{ color: 'var(--text-secondary)', fontSize: '0.8rem', textAlign: 'center', marginTop: '2rem' }}>
            Run the workflow to see output here.
          </div>
        ) : (
          logs.map((log, index) => (
            <div key={index} style={{
              background: 'rgba(255,255,255,0.03)',
              borderRadius: '8px',
              padding: '10px',
              borderLeft: `3px solid ${log.status === 'completed' ? '#10b981' : '#ef4444'}`
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                <span style={{ fontSize: '0.75rem', fontWeight: 600, color: '#e2e8f0' }}>{log.nodeId}</span>
                <span style={{ fontSize: '0.65rem', color: 'var(--text-secondary)' }}>
                  {new Date().toLocaleTimeString()}
                </span>
              </div>
              {log.output && (
                <pre style={{
                  margin: 0,
                  fontSize: '0.7rem',
                  fontFamily: 'monospace',
                  color: '#94a3b8',
                  whiteSpace: 'pre-wrap',
                  overflowX: 'auto'
                }}>
                  {typeof log.output === 'object' ? JSON.stringify(log.output, null, 2) : log.output}
                </pre>
              )}
            </div>
          ))
        )}
      </div>
    </aside>
  );
};

const FlowBuilder = () => {
  const reactFlowWrapper = useRef(null);
  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);
  const [isRunning, setIsRunning] = useState(false);
  const [sysQuery, setSysQuery] = useState("Artificial Intelligence");
  const [isSharedMode, setIsSharedMode] = useState(false);
  const [executionLogs, setExecutionLogs] = useState([]);
  const { screenToFlowPosition, fitView } = useReactFlow();

  // Load Workflow from URL if present
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const flowId = params.get('flowId');
    if (flowId) {
      setIsSharedMode(true);
      const fetchWorkflow = async () => {
        try {
          const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';
          const res = await fetch(`${API_URL}/workflow/${flowId}`);
          if (!res.ok) throw new Error('Workflow not found');
          const data = await res.json();
          setNodes(data.nodes || []);
          setEdges(data.edges || []);
          if (data.inputs && data.inputs.query) {
            setSysQuery(data.inputs.query);
          }
          setTimeout(() => fitView(), 500);
        } catch (e) {
          console.error("Failed to load workflow:", e);
          alert("Failed to load workflow: " + e.message);
        }
      };
      fetchWorkflow();
    }
  }, [fitView, setNodes, setEdges]);

  const publishWorkflow = async () => {
    try {
      const flowData = {
        nodes: nodes.map(n => ({ id: n.id, type: n.type, data: n.data, position: n.position })),
        edges: edges.map(e => ({
          id: e.id,
          source: e.source,
          target: e.target,
          sourceHandle: e.sourceHandle
        })),
        inputs: { query: sysQuery }
      };

      const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';
      const response = await fetch(`${API_URL}/publish`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(flowData)
      });

      if (!response.ok) throw new Error("Failed to publish");
      const result = await response.json();

      const shareUrl = `${window.location.origin}?flowId=${result.id}`;
      prompt("Workflow Published! Share this URL:", shareUrl);

    } catch (e) {
      console.error(e);
      alert("Publish Failed: " + e.message);
    }
  };

  const updateNodeData = useCallback((id, key, value) => {
    setNodes((nds) =>
      nds.map((node) => {
        if (node.id === id) {
          return { ...node, data: { ...node.data, [key]: value } };
        }
        return node;
      })
    );
  }, [setNodes]);

  const onConnect = useCallback(
    (params) => setEdges((eds) => addEdge({ ...params, type: 'custom', animated: true }, eds)),
    [setEdges],
  );

  const onDragOver = useCallback((event) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = 'move';
  }, []);

  const onDrop = useCallback(
    (event) => {
      event.preventDefault();
      const type = event.dataTransfer.getData('application/reactflow');
      if (typeof type === 'undefined' || !type) return;

      const position = screenToFlowPosition({
        x: event.clientX,
        y: event.clientY,
      });

      const newNode = {
        id: `${type}_${Date.now()}`,
        type,
        position,
        data: { label: `${type} node` },
      };

      setNodes((nds) => nds.concat(newNode));
    },
    [screenToFlowPosition, setNodes],
  );

  const runFlow = async () => {
    setIsRunning(true);
    setExecutionLogs([]);
    setNodes(nds => nds.map(n => ({
      ...n,
      className: '',
      data: { ...n.data, status: undefined, output: undefined }
    })));

    try {
      const flowData = {
        nodes: nodes.map(n => ({ id: n.id, type: n.type, data: n.data })),
        edges: edges.map(e => ({
          id: e.id,
          source: e.source,
          target: e.target,
          sourceHandle: e.sourceHandle
        })),
        inputs: { query: sysQuery }
      };

      const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';
      const response = await fetch(`${API_URL}/execute`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(flowData)
      });

      if (!response.ok) throw new Error(`Error: ${response.statusText}`);

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          if (!line.trim()) continue;
          try {
            const data = JSON.parse(line);

            if (data.status === 'completed' || data.status === 'failed') {
              setExecutionLogs(prev => [...prev, { nodeId: data.node_id, status: data.status, output: data.output }]);
            }

            if (data.status === 'running') {
              fitView({
                nodes: [{ id: data.node_id }],
                duration: 800,
                padding: 0.5,
                maxZoom: 1
              });
            }

            setNodes((nds) => nds.map((n) => {
              if (n.id === data.node_id) {
                return {
                  ...n,
                  className: data.status === 'running' ? 'running-node' : '',
                  data: {
                    ...n.data,
                    status: data.status,
                    ...(data.output ? { output: data.output } : {})
                  }
                };
              }
              return n;
            }));
          } catch (e) {
            console.error('Json Parse Error:', e);
          }
        }
      }
    } catch (error) {
      console.error(error);
      alert('Execution Failed: ' + error.message);
    } finally {
      setIsRunning(false);
    }
  };

  const runNode = async (nodeId) => {
    const node = nodes.find(n => n.id === nodeId);
    if (!node) return;

    // Set status to running
    setNodes(nds => nds.map(n => n.id === nodeId ? { ...n, className: 'running-node', data: { ...n.data, status: 'running' } } : n));

    // Build Context from existing outputs + sys input
    const context = { sys: { query: sysQuery } };
    nodes.forEach(n => {
      if (n.data.output) {
        context[n.id] = n.data.output;
      }
    });

    try {
      const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';
      const response = await fetch(`${API_URL}/execute-node`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          node: { id: node.id, type: node.type, data: node.data },
          context
        })
      });

      const result = await response.json();

      setNodes(nds => nds.map(n => {
        if (n.id === nodeId) {
          return {
            ...n,
            className: '',
            data: { ...n.data, status: result.status, output: result.output }
          };
        }
        return n;
      }));

    } catch (error) {
      console.error(error);
      setNodes(nds => nds.map(n => n.id === nodeId ? { ...n, className: '', data: { ...n.data, status: 'failed' } } : n));
    }
  };

  return (
    <NodeContext.Provider value={{ updateNodeData, runNode, nodes }}>
      <div style={{ width: '100%', height: '100vh', display: 'flex', flexDirection: 'column', background: 'var(--bg-color)' }}>
        <div className="glass-panel" style={{
          margin: '1rem',
          padding: '1rem 2rem',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          borderRadius: '16px',
          border: '1px solid var(--border-color)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <div style={{
              width: '40px', height: '40px',
              background: 'linear-gradient(135deg, #6366f1, #ec4899)',
              borderRadius: '12px',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              boxShadow: '0 4px 10px rgba(99, 102, 241, 0.4)'
            }}>
              <Box color="white" size={24} />
            </div>
            <div>
              <h1 style={{ margin: 0, fontSize: '1.5rem', fontWeight: 700 }}>AI Workflow Studio</h1>
              <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Visual Automation Engine</span>
            </div>
          </div>

          <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', background: 'var(--surface-color)', padding: '6px 12px', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
              <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', fontWeight: 600 }}>System Input (sys.query):</span>
              <input
                type="text"
                value={sysQuery}
                onChange={e => setSysQuery(e.target.value)}
                style={{ background: 'transparent', border: 'none', color: 'var(--text-primary)', outline: 'none', width: '200px' }}
              />
            </div>

            {!isSharedMode && (
              <button className="btn" onClick={publishWorkflow} style={{ padding: '0.75rem 1rem', display: 'flex', alignItems: 'center', gap: '8px', background: 'rgba(255,255,255,0.1)', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', marginRight: '8px' }}>
                <Share2 size={18} />
                Publish
              </button>
            )}

            <button className="btn btn-primary" onClick={runFlow} disabled={isRunning} style={{ padding: '0.75rem 1.5rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
              {isRunning ? <div className="spinner"></div> : <Play size={18} fill="white" />}
              {isRunning ? 'Running...' : 'Run Workflow'}
            </button>
          </div>
        </div>

        <div style={{ flex: 1, display: 'flex', overflow: 'hidden', padding: '0 1rem 1rem 1rem', gap: '1rem' }}>
          {!isSharedMode && <Sidebar />}
          <div className="glass-panel" style={{ flex: 1, height: '100%', position: 'relative', overflow: 'hidden', borderRadius: '16px', border: '1px solid var(--border-color)' }} ref={reactFlowWrapper}>
            <ReactFlow
              nodes={nodes}
              edges={edges}
              onNodesChange={onNodesChange}
              onEdgesChange={onEdgesChange}
              onConnect={onConnect}
              onDrop={onDrop}
              onDragOver={onDragOver}
              nodeTypes={nodeTypes}
              edgeTypes={edgeTypes}
              fitView
              nodesDraggable={!isSharedMode}
              proOptions={{ hideAttribution: true }}
              style={{ background: 'transparent' }}
            >
              <Background color="#475569" size={1} gap={24} variant="dots" style={{ opacity: 0.1 }} />
              <Controls style={{ background: 'var(--surface-color)', border: '1px solid var(--border-color)', borderRadius: '8px', overflow: 'hidden' }} showInteractive={false} />
              <MiniMap
                style={{
                  background: 'var(--surface-color)',
                  border: '1px solid var(--border-color)',
                  height: 100,
                  borderRadius: 8
                }}
                nodeColor={(n) => {
                  if (n.type === 'start') return '#6366f1';
                  if (n.type === 'llm') return '#ec4899';
                  if (n.type === 'condition') return '#f59e0b';
                  if (n.type === 'end') return '#10b981';
                  return '#64748b';
                }}
              />
            </ReactFlow>
          </div>
          <OutputPanel logs={executionLogs} />
        </div>
      </div>
    </NodeContext.Provider>
  );
};

export default function App() {
  return (
    <ErrorBoundary>
      <ReactFlowProvider>
        <FlowBuilder />
      </ReactFlowProvider>
    </ErrorBoundary>
  );
}
