import { createContext, useContext } from 'react';

export const NodeContext = createContext({
    updateNodeData: (id, key, value) => { },
    runNode: (id) => { },
    nodes: []
});

export const useNodeData = () => useContext(NodeContext);
