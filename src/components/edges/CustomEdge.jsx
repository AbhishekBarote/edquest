import React from 'react';
import { BaseEdge, EdgeLabelRenderer, getBezierPath, useReactFlow } from '@xyflow/react';
import { Plus } from 'lucide-react';

export default function CustomEdge({
    id,
    sourceX,
    sourceY,
    targetX,
    targetY,
    sourcePosition,
    targetPosition,
    style = {},
    markerEnd,
    source,
    target,
}) {
    const { setEdges, setNodes } = useReactFlow();
    const [isHovered, setIsHovered] = React.useState(false);
    const [edgePath, labelX, labelY] = getBezierPath({
        sourceX,
        sourceY,
        sourcePosition,
        targetX,
        targetY,
        targetPosition,
    });

    const onEdgeClick = (evt) => {
        evt.stopPropagation();

        const newNodeId = `${Date.now()}`;

        // Create a new node centered on the edge with improved positioning
        const newNode = {
            id: newNodeId,
            type: 'model',
            position: { x: labelX - 100, y: labelY - 50 },
            data: { model: 'gemini-2.5-flash', label: 'New Node' },
        };

        setNodes((nodes) => nodes.concat(newNode));

        setEdges((edges) => {
            const newEdges = edges.filter((e) => e.id !== id);
            newEdges.push({
                id: `${id}-to-${newNodeId}`,
                source: source,
                target: newNodeId,
                type: 'custom',
                animated: true
            });
            newEdges.push({
                id: `${newNodeId}-to-${target}`,
                source: newNodeId,
                target: target,
                type: 'custom',
                animated: true
            });
            return newEdges;
        });
    };

    return (
        <>
            <BaseEdge path={edgePath} markerEnd={markerEnd} style={style} />
            {/* Invisible interaction path for better hover detection */}
            <path
                d={edgePath}
                fill="none"
                stroke="transparent"
                strokeWidth={20}
                style={{ cursor: 'pointer' }}
                onMouseEnter={() => setIsHovered(true)}
                onMouseLeave={() => setIsHovered(false)}
            />

            <EdgeLabelRenderer>
                <div
                    style={{
                        position: 'absolute',
                        transform: `translate(-50%, -50%) translate(${labelX}px,${labelY}px)`,
                        fontSize: 12,
                        pointerEvents: isHovered ? 'all' : 'none',
                        opacity: isHovered ? 1 : 0,
                        transition: 'opacity 0.2s ease-in-out',
                    }}
                    className="nopan"
                    onMouseEnter={() => setIsHovered(true)}
                    onMouseLeave={() => setIsHovered(false)}
                >
                    <button
                        title="Insert Node"
                        style={{
                            width: '24px',
                            height: '24px',
                            background: 'var(--surface-color)',
                            border: '1px solid var(--primary-color)',
                            borderRadius: '50%',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            color: 'var(--primary-color)',
                            boxShadow: '0 2px 5px rgba(0,0,0,0.2)',
                            transition: 'all 0.2s',
                        }}
                        onClick={onEdgeClick}
                    >
                        <Plus size={14} />
                    </button>
                </div>
            </EdgeLabelRenderer>
        </>
    );
}
