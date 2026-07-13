import React, { createContext, useContext } from 'react';
import { NodeData } from '@/types/nodeEditor';

interface NodeDataContextType {
  nodeData: any;
  updateNodeData: (nodeId: string, data: Partial<NodeData>) => void;
  getNodeData: (nodeId: string) => NodeData;
  getConnectedNodeData: (nodeId: string, edges: any[], handleType: string) => any;
  getAllConnectedNodeData: (nodeId: string, edges: any[], handlePrefix: string) => any[];
  propagateDataChange: (changedNodeId: string, edges: any[], nodes: any[]) => void;
  addImageInputNode?: (imageUrl: string) => void;
}

export const NodeDataContext = createContext<NodeDataContextType | undefined>(undefined);

export const useNodeDataContext = () => {
  const context = useContext(NodeDataContext);
  if (!context) {
    throw new Error('useNodeDataContext must be used within a NodeDataProvider');
  }
  return context;
};