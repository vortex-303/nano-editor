import { useState, useCallback } from 'react';
import { Edge, Node } from '@xyflow/react';
import { NodeData } from '@/types/nodeEditor';

export interface NodeDataState {
  [nodeId: string]: NodeData;
}

export const useNodeData = () => {
  const [nodeData, setNodeData] = useState<NodeDataState>({});

  const updateNodeData = useCallback((nodeId: string, data: Partial<NodeData>) => {
    setNodeData(prev => ({ ...prev, [nodeId]: { ...prev[nodeId], ...data } }));
  }, []);

  /** Replace the entire node-data store (used by undo/redo and project load). */
  const setAllNodeData = useCallback((data: NodeDataState) => {
    setNodeData(data);
  }, []);

  const getNodeData = useCallback((nodeId: string): NodeData => {
    const data = nodeData[nodeId] || {};
    console.log(`useNodeData - Getting data for node ${nodeId}:`, data);
    return data;
  }, [nodeData]);

  const getConnectedNodeData = useCallback((
    nodeId: string, 
    edges: Edge[], 
    handleType: string
  ): any => {
    // Find edges connected to this node's target handles
    const connectedEdge = edges.find(edge => 
      edge.target === nodeId && edge.targetHandle === handleType
    );
    
    if (!connectedEdge) return null;
    
    const sourceNodeData = nodeData[connectedEdge.source];
    if (!sourceNodeData) return null;
    
    // Return the appropriate data based on handle type
    if (handleType === 'image' || handleType.startsWith('image-') || handleType === 'content' || handleType === 'style') {
      return sourceNodeData.image || sourceNodeData.result;
    } else if (handleType === 'prompt') {
      return sourceNodeData.prompt || sourceNodeData.label;
    } else if (handleType === 'result') {
      return sourceNodeData.result || sourceNodeData.image;
    } else if (handleType === 'images') {
      // For variants gallery - return the full results array
      return sourceNodeData.result;
    } else if (handleType === 'context') {
      return sourceNodeData.contextData || sourceNodeData.result;
    } else if (handleType === 'batch-input') {
      // For batch processing - return array of image URLs
      return sourceNodeData.batchOutput || sourceNodeData.images || [];
    }
    
    return null;
  }, [nodeData]);

  const getAllConnectedNodeData = useCallback((
    nodeId: string,
    edges: Edge[],
    handlePrefix: string
  ): any[] => {
    const results = [];
    const connectedEdges = edges.filter(edge => 
      edge.target === nodeId && (
        edge.targetHandle === handlePrefix || 
        edge.targetHandle?.startsWith(handlePrefix + '-') ||
        (handlePrefix === 'image' && edge.targetHandle?.startsWith('image-'))
      )
    );
    
    console.log(`getAllConnectedNodeData for ${nodeId} with prefix ${handlePrefix}:`, connectedEdges);
    
    for (const edge of connectedEdges) {
      const sourceNodeData = nodeData[edge.source];
      console.log(`Source node ${edge.source} data:`, sourceNodeData);
      if (sourceNodeData) {
        if (handlePrefix === 'image') {
          const data = sourceNodeData.image || sourceNodeData.result;
          if (data) results.push(data);
        } else if (handlePrefix === 'prompt') {
          const data = sourceNodeData.prompt || sourceNodeData.label;
          if (data) results.push(data);
        } else if (handlePrefix === 'context') {
          const data = sourceNodeData.contextData || sourceNodeData.result;
          if (data) results.push(data);
        }
      }
    }
    
    console.log(`getAllConnectedNodeData results for ${handlePrefix}:`, results);
    return results;
  }, [nodeData]);

  const propagateDataChange = useCallback((
    changedNodeId: string,
    edges: Edge[],
    nodes: Node[]
  ) => {
    // Find all nodes that depend on the changed node
    const dependentEdges = edges.filter(edge => edge.source === changedNodeId);
    
    dependentEdges.forEach(edge => {
      const targetNode = nodes.find(n => n.id === edge.target);
      if (targetNode) {
        // Trigger update on dependent nodes by updating their data
        setNodeData(prev => ({
          ...prev,
          [edge.target]: { 
            ...prev[edge.target], 
            _lastUpdate: Date.now() // Trigger re-render
          }
        }));
      }
    });
  }, []);

  return {
    nodeData,
    updateNodeData,
    setAllNodeData,
    getNodeData,
    getConnectedNodeData,
    getAllConnectedNodeData,
    propagateDataChange
  };
};