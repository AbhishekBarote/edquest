import React, { memo } from 'react';
import { Handle, Position } from '@xyflow/react';
import {
    MessageSquare,
    Cpu,
    FileText,
    Mail,
    Play,
    GitBranch,
    Globe,
    Code,
    CheckCircle
} from 'lucide-react';
import { useNodeData } from '../../NodeContext';

// --- Shared Components ---

const NodeHeader = ({ icon: Icon, label, color, id, status }) => {
    const { runNode } = useNodeData();
    return (
        <div style={{
            padding: '8px 12px',
            borderBottom: '1px solid var(--border-color)',
            background: 'rgba(255,255,255,0.05)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '8px',
            fontWeight: 600,
            fontSize: '0.9rem'
        }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Icon size={16} color={color} />
                {label}
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <button
                    className="nodrag"
                    onClick={(e) => { e.stopPropagation(); runNode(id); }}
                    title="Run Node"
                    style={{
                        background: 'transparent', border: 'none', cursor: 'pointer',
                        display: 'flex', alignItems: 'center', padding: '4px',
                        color: 'var(--text-secondary)'
                    }}
                >
                    <Play size={12} fill="var(--text-secondary)" />
                </button>
                {status && (
                    <div style={{
                        width: '8px', height: '8px', borderRadius: '50%',
                        background: status === 'running' ? '#fbbf24' :
                            status === 'completed' ? '#10b981' :
                                status === 'failed' ? '#ef4444' :
                                    status === 'skipped' ? '#9ca3af' : 'transparent',
                        boxShadow: status === 'running' ? '0 0 8px #fbbf24' : 'none'
                    }} title={status} />
                )}
                <div style={{
                    fontSize: '0.65rem',
                    background: 'var(--bg-color)',
                    padding: '2px 6px',
                    borderRadius: '4px',
                    color: 'var(--text-secondary)',
                    fontFamily: 'monospace'
                }}>
                    ID: {id}
                </div>
            </div>
        </div>
    );
};

const NodeWrapper = ({ children, selected }) => (
    <div style={{
        minWidth: '280px',
        background: 'var(--surface-color)',
        borderRadius: '8px',
        border: `1px solid ${selected ? 'var(--primary-color)' : 'var(--border-color)'}`,
        boxShadow: selected ? '0 0 0 2px rgba(99, 102, 241, 0.2)' : '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
        transition: 'all 0.2s',
        color: 'var(--text-primary)'
    }}>
        {children}
    </div>
);

const Label = ({ children }) => (
    <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginBottom: '4px', marginTop: '8px' }}>
        {children}
    </div>
);

import SmartTextArea from '../SmartTextArea';

const TextArea = SmartTextArea;

const Input = ({ value, onChange, placeholder }) => (
    <input
        type="text"
        className="nodrag"
        value={value || ''}
        onChange={onChange}
        placeholder={placeholder}
        style={{
            width: '100%',
            background: 'var(--bg-color)',
            border: '1px solid var(--border-color)',
            borderRadius: '4px',
            padding: '6px',
            fontSize: '0.8rem',
            color: 'var(--text-primary)'
        }}
    />
);

const OutputDisplay = ({ output }) => {
    if (!output) return null;
    let display = output;
    if (typeof output === 'object') display = JSON.stringify(output, null, 2);

    return (
        <div style={{
            marginTop: '8px',
            background: '#0f172a',
            borderRadius: '4px',
            padding: '8px',
            maxHeight: '100px',
            overflowY: 'auto',
            border: '1px solid var(--border-color)'
        }}>
            <div style={{ fontSize: '0.7rem', color: '#64748b', marginBottom: '4px' }}>Latest Output:</div>
            <pre style={{ margin: 0, fontSize: '0.75rem', fontFamily: 'monospace', color: '#10b981', whiteSpace: 'pre-wrap' }}>
                {display}
            </pre>
        </div>
    );
};

// --- Nodes ---

export const StartNode = memo(({ id, data, isConnectable, selected }) => {
    const { updateNodeData } = useNodeData();
    return (
        <NodeWrapper selected={selected}>
            <NodeHeader icon={Play} label="Start" color="#6366f1" id={id} status={data.status} />
            <div style={{ padding: '12px' }}>
                <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                    Triggered on execution.
                    <br />
                    Input available as <code style={{ color: '#6366f1' }}>sys.query</code>
                </div>
                <OutputDisplay output={data.output} />
            </div>
            <Handle type="source" position={Position.Right} isConnectable={isConnectable} />
        </NodeWrapper>
    );
});

export const LLMNode = memo(({ id, data, isConnectable, selected }) => {
    const { updateNodeData } = useNodeData();
    return (
        <NodeWrapper selected={selected}>
            <Handle type="target" position={Position.Left} isConnectable={isConnectable} />
            <NodeHeader icon={Cpu} label="LLM" color="#ec4899" id={id} status={data.status} />
            <div style={{ padding: '12px' }}>
                <Label>Model</Label>
                <select
                    className="nodrag"
                    value={data.model || 'gemini-2.5-flash'}
                    onChange={(e) => updateNodeData(id, 'model', e.target.value)}
                    style={{ width: '100%', padding: '6px', borderRadius: '4px', border: '1px solid var(--border-color)', background: 'var(--bg-color)', color: 'var(--text-primary)', fontSize: '0.8rem' }}
                >
                    <option value="gemini-2.5-flash">Gemini 2.5 Flash</option>
                    <option value="gemini-pro">Gemini Pro</option>
                    <option value="gpt-4o">GPT-4o</option>
                    <option value="gpt-3.5-turbo">GPT-3.5 Turbo</option>
                </select>

                <Label>System / User Prompt</Label>
                <TextArea
                    value={data.prompt}
                    onChange={(e) => updateNodeData(id, 'prompt', e.target.value)}
                    placeholder="Describe task. Use {{node.output}} for vars."
                />
                <OutputDisplay output={data.output} />
            </div>
            <Handle type="source" position={Position.Right} isConnectable={isConnectable} />
        </NodeWrapper>
    );
});

export const ConditionNode = memo(({ id, data, isConnectable, selected }) => {
    const { updateNodeData } = useNodeData();
    return (
        <NodeWrapper selected={selected}>
            <Handle type="target" position={Position.Left} isConnectable={isConnectable} />
            <NodeHeader icon={GitBranch} label="Condition" color="#f59e0b" id={id} status={data.status} />
            <div style={{ padding: '12px' }}>
                <Label>Expression (Python Syntax)</Label>
                <TextArea
                    value={data.expression}
                    onChange={(e) => updateNodeData(id, 'expression', e.target.value)}
                    placeholder="e.g. {{sys.query}} == 'check status' or len({{llm_1.text}}) > 100"
                    rows={2}
                />
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', marginTop: '8px', color: 'var(--text-secondary)' }}>
                    <span>False Path</span>
                    <span>True Path</span>
                </div>
                <OutputDisplay output={data.output} />
            </div>
            {/* Custom handles for True/False branches */}
            <Handle
                type="source"
                position={Position.Right}
                id="true"
                isConnectable={isConnectable}
                style={{ top: '30%', background: '#10b981' }}
                title="True"
            />
            <Handle
                type="source"
                position={Position.Right}
                id="false"
                isConnectable={isConnectable}
                style={{ top: '70%', background: '#ef4444' }}
                title="False"
            />
        </NodeWrapper>
    );
});

export const ToolNode = memo(({ id, data, isConnectable, selected }) => {
    const { updateNodeData } = useNodeData();
    return (
        <NodeWrapper selected={selected}>
            <Handle type="target" position={Position.Left} isConnectable={isConnectable} />
            <NodeHeader icon={Globe} label="API Request" color="#3b82f6" id={id} status={data.status} />
            <div style={{ padding: '12px' }}>
                <Label>URL</Label>
                <Input value={data.url} onChange={(e) => updateNodeData(id, 'url', e.target.value)} placeholder="https://api.example.com/data" />

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '8px' }}>
                    <div>
                        <Label>Method</Label>
                        <select
                            className="nodrag"
                            value={data.method || 'GET'}
                            onChange={(e) => updateNodeData(id, 'method', e.target.value)}
                            style={{ width: '100%', padding: '6px', borderRadius: '4px', border: '1px solid var(--border-color)', background: 'var(--bg-color)', color: 'var(--text-primary)', fontSize: '0.8rem' }}
                        >
                            <option value="GET">GET</option>
                            <option value="POST">POST</option>
                            <option value="PUT">PUT</option>
                            <option value="DELETE">DELETE</option>
                        </select>
                    </div>
                </div>

                <Label>JSON Body (Optional)</Label>
                <TextArea value={data.body} onChange={(e) => updateNodeData(id, 'body', e.target.value)} placeholder='{"key": "{{val}}"}' rows={2} />
                <OutputDisplay output={data.output} />
            </div>
            <Handle type="source" position={Position.Right} isConnectable={isConnectable} />
        </NodeWrapper>
    );
});

export const CodeNode = memo(({ id, data, isConnectable, selected }) => {
    const { updateNodeData } = useNodeData();
    return (
        <NodeWrapper selected={selected}>
            <Handle type="target" position={Position.Left} isConnectable={isConnectable} />
            <NodeHeader icon={Code} label="Python Code" color="#8b5cf6" id={id} status={data.status} />
            <div style={{ padding: '12px' }}>
                <Label>Code (Result in 'result' var)</Label>
                <TextArea
                    value={data.code}
                    onChange={(e) => updateNodeData(id, 'code', e.target.value)}
                    placeholder="result = context['sys']['query'].upper()"
                    rows={4}
                />
                <OutputDisplay output={data.output} />
            </div>
            <Handle type="source" position={Position.Right} isConnectable={isConnectable} />
        </NodeWrapper>
    );
});

export const EndNode = memo(({ id, data, isConnectable, selected }) => {
    const { updateNodeData } = useNodeData();
    return (
        <NodeWrapper selected={selected}>
            <Handle type="target" position={Position.Left} isConnectable={isConnectable} />
            <NodeHeader icon={CheckCircle} label="End" color="#10b981" id={id} status={data.status} />
            <div style={{ padding: '12px' }}>
                <Label>Output Variable</Label>
                <Input value={data.output_var} onChange={(e) => updateNodeData(id, 'output_var', e.target.value)} placeholder="{{llm_node.text}}" />
                <OutputDisplay output={data.output} />
            </div>
        </NodeWrapper>
    );
});

// Alias for compatibility if needed, or export these new ones
