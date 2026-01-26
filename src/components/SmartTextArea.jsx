
import React from 'react';
import { useNodeData } from '../NodeContext';

const SmartTextArea = ({ value, onChange, placeholder, rows = 3 }) => {
    const { nodes } = useNodeData();
    const [showSuggestions, setShowSuggestions] = React.useState(false);
    const [cursorIdx, setCursorIdx] = React.useState(0);
    const [filter, setFilter] = React.useState('');
    const wrapperRef = React.useRef(null);
    const textareaRef = React.useRef(null);

    // Generate suggestions list
    const suggestions = React.useMemo(() => {
        const list = ['sys.query'];
        if (nodes) {
            nodes.forEach(n => {
                const id = n.id;
                if (n.type === 'llm') list.push(`${id}.text`);
                else if (n.type === 'tool') list.push(`${id}.body`);
                else if (n.type === 'code' || n.type === 'condition') list.push(`${id}.result`);
                else list.push(`${id}.output`);
            });
        }
        return list;
    }, [nodes]);

    const insertSuggestion = (suggestion) => {
        if (!textareaRef.current) return;

        const val = value || '';
        const textBeforeCursor = val.slice(0, cursorIdx);
        const textAfterCursor = val.slice(cursorIdx);

        // Find start of {{
        const lastOpen = textBeforeCursor.lastIndexOf('{{');
        if (lastOpen === -1) return;

        const newVal = val.slice(0, lastOpen + 2) + suggestion + '}}' + textAfterCursor;

        // Create synthetic event
        const event = { target: { value: newVal } };
        onChange(event);
        setShowSuggestions(false);

        // Restore focus (timeout needed for React state update)
        setTimeout(() => {
            textareaRef.current.focus();
            // textareaRef.current.setSelectionRange(lastOpen + cursorIdx + 2, lastOpen + cursorIdx + 2);
        }, 10);
    };

    const filteredSuggestions = suggestions.filter(s => s.toLowerCase().includes(filter.toLowerCase()));

    const handleChange = (e) => {
        // We handle real updates here
        const val = e.target.value;
        const idx = e.target.selectionStart;
        setCursorIdx(idx);
        onChange(e);

        // Check for {{
        const textBeforeCursor = val.slice(0, idx);
        const match = textBeforeCursor.match(/\{\{([a-zA-Z0-9_.]*)$/);

        if (match) {
            setShowSuggestions(true);
            setFilter(match[1]);
        } else {
            setShowSuggestions(false);
        }
    };

    // Helper to ensure we catch cursor movement even without text change
    const handleSelect = (e) => {
        const idx = e.target.selectionStart;
        setCursorIdx(idx);
        // Re-check trigger
        const val = e.target.value;
        const textBeforeCursor = val.slice(0, idx);
        const match = textBeforeCursor.match(/\{\{([a-zA-Z0-9_.]*)$/);
        if (match) {
            setShowSuggestions(true);
            setFilter(match[1]);
        } else {
            setShowSuggestions(false);
        }
    }

    const handleKeyDown = (e) => {
        // Stop React Flow from capturing keys if we are focused here
        e.stopPropagation();

        if (e.key === 'Tab') {
            if (showSuggestions && filteredSuggestions.length > 0) {
                e.preventDefault();
                insertSuggestion(filteredSuggestions[0]);
            }
        }
    };

    return (
        <div style={{ position: 'relative', width: '100%' }} ref={wrapperRef}>
            <textarea
                ref={textareaRef}
                className="nodrag"
                value={value || ''}
                onChange={handleChange}
                onKeyDown={handleKeyDown}
                onSelect={handleSelect}
                onClick={handleSelect}
                onKeyUp={handleSelect}
                placeholder={placeholder}
                rows={rows}
                style={{
                    width: '100%',
                    background: 'var(--bg-color)',
                    border: '1px solid var(--border-color)',
                    borderRadius: '4px',
                    padding: '6px',
                    fontSize: '0.8rem',
                    color: 'var(--text-primary)',
                    resize: 'vertical',
                    fontFamily: 'monospace'
                }}
            />
            {showSuggestions && filteredSuggestions.length > 0 && (
                <div style={{
                    position: 'absolute',
                    top: '100%', left: 0,
                    width: '100%',
                    maxHeight: '150px',
                    overflowY: 'auto',
                    background: 'var(--surface-color)',
                    border: '1px solid var(--primary-color)',
                    borderRadius: '4px',
                    zIndex: 1000,
                    boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.2)'
                }}>
                    {filteredSuggestions.map(s => (
                        <div
                            key={s}
                            onClick={() => insertSuggestion(s)}
                            style={{
                                padding: '4px 8px',
                                cursor: 'pointer',
                                fontSize: '0.8rem',
                                color: 'var(--text-primary)',
                                borderBottom: '1px solid var(--border-color)'
                            }}
                            onMouseEnter={(e) => e.target.style.background = 'var(--primary-color)'}
                            onMouseLeave={(e) => e.target.style.background = 'transparent'}
                        >
                            {s}
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};

export default SmartTextArea;
