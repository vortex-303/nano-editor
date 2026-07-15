import React, { useCallback, useState, useSyncExternalStore } from 'react';
import {
  ReactFlow,
  useNodesState,
  useEdgesState,
  addEdge,
  Connection,
  Edge,
  Node,
  Background,
  Controls,
  MiniMap,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';

import { NodePalette } from './NodePalette';
import { WorkflowToolbar } from './WorkflowToolbar';
import { ConnectionLegend } from './ConnectionLegend';
import { useNodeData } from '@/hooks/useNodeData';
import { NodeData } from '@/types/nodeEditor';
import { NodeDataContext } from '@/contexts/NodeDataContext';
import { subscribe, getNodeTypesSnapshot, getPortType, hasNodeType } from '@/plugins/registry';
import { portsCompatible } from '@/plugins/types';

const initialNodes: Node[] = [];
const initialEdges: Edge[] = [];


export const NodeEditor = () => {
  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);
  const [selectedNode, setSelectedNode] = useState<Node | null>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const { nodeData, updateNodeData, getNodeData, getConnectedNodeData, getAllConnectedNodeData, propagateDataChange } = useNodeData();
  // Registry-driven node types: updates live when plugins are installed/removed
  const nodeTypes = useSyncExternalStore(subscribe, getNodeTypesSnapshot);

  // Typed-port connection validation. Unknown ports stay permissive so
  // legacy/untyped nodes keep working.
  const isValidConnection = useCallback((connection: Connection | Edge) => {
    const sourceNode = nodes.find((n) => n.id === connection.source);
    const targetNode = nodes.find((n) => n.id === connection.target);
    const sourceType = getPortType(sourceNode?.type, connection.sourceHandle, 'outputs');
    const targetType = getPortType(targetNode?.type, connection.targetHandle, 'inputs');
    if (!sourceType || !targetType) return true;
    return portsCompatible(sourceType, targetType);
  }, [nodes]);

  // Function to add a new ImageInput node with an image
  const addImageInputNode = useCallback((imageUrl: string) => {
    const newNode: Node = {
      id: `imageInput-${Date.now()}`,
      type: 'imageInput',
      position: { x: Math.random() * 300, y: Math.random() * 300 }, // Random position to avoid overlap
      data: { label: 'Image Input', image: imageUrl },
    };
    setNodes((nds) => [...nds, newNode]);
    
    // Update node data to ensure the image is properly set
    setTimeout(() => {
      updateNodeData(newNode.id, { image: imageUrl });
    }, 0);
  }, [setNodes, updateNodeData]);

  const onConnect = useCallback(
    (params: Connection | Edge) => {
      setEdges((eds) => {
        const newEdges = addEdge(params, eds);
        // Propagate data when new connection is made
        if (params.source) {
          setTimeout(() => propagateDataChange(params.source!, newEdges, nodes), 0);
        }
        return newEdges;
      });
    },
    [setEdges, propagateDataChange, nodes]
  );

  const onNodeClick = useCallback((_: React.MouseEvent, node: Node) => {
    setSelectedNode(node);
  }, []);

  const onPaneClick = useCallback(() => {
    setSelectedNode(null);
  }, []);

  const addNode = useCallback((type: string, position: { x: number; y: number }) => {
    const newNode: Node = {
      id: `${type}-${Date.now()}`,
      type,
      position,
      data: { label: `${type} node` },
    };
    setNodes((nds) => [...nds, newNode]);
  }, [setNodes]);

  const onDragOver = useCallback((event: React.DragEvent) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = 'move';
  }, []);

  const onDrop = useCallback(
    (event: React.DragEvent) => {
      event.preventDefault();

      const type = event.dataTransfer.getData('application/reactflow');
      const files = Array.from(event.dataTransfer.files);

      // Check if it's an image file being dropped
      const imageFiles = files.filter(file => file.type.startsWith('image/'));

      const reactFlowBounds = (event.target as Element).closest('.react-flow')?.getBoundingClientRect();
      if (!reactFlowBounds) return;

      const position = {
        x: event.clientX - reactFlowBounds.left,
        y: event.clientY - reactFlowBounds.top,
      };

      if (imageFiles.length > 0) {
        // Handle dropped image files
        imageFiles.forEach((file, index) => {
          const reader = new FileReader();
          reader.onload = (e) => {
            const imageUrl = e.target?.result as string;
            const newNode: Node = {
              id: `imageInput-${Date.now()}-${index}`,
              type: 'imageInput',
              position: {
                x: position.x + (index * 20), // Offset multiple images slightly
                y: position.y + (index * 20),
              },
              data: { 
                label: `Image: ${file.name}`,
                image: imageUrl
              },
            };
            setNodes((nds) => [...nds, newNode]);
            
            // Update node data context with the image
            setTimeout(() => {
              updateNodeData(newNode.id, { image: imageUrl });
            }, 0);
          };
          reader.readAsDataURL(file);
        });
        return;
      }

      // Handle node palette drops
      if (typeof type === 'undefined' || !type) {
        return;
      }

      addNode(type, position);
    },
    [addNode, setNodes, updateNodeData]
  );

  const clearWorkflow = useCallback(() => {
    setNodes([]);
    setEdges([]);
    setSelectedNode(null);
  }, [setNodes, setEdges]);

  const handleImport = useCallback((importedNodes: Node[], importedEdges: Edge[], importedNodeData: { [key: string]: NodeData }) => {
    console.log('NodeEditor - Importing project:');
    console.log('- Nodes:', importedNodes.length, importedNodes);
    console.log('- Edges:', importedEdges.length, importedEdges);
    console.log('- Node Data:', Object.keys(importedNodeData).length, importedNodeData);

    // Nodes whose type isn't registered (usually an uninstalled plugin) render
    // as a MissingPluginNode placeholder instead of xyflow's fallback box.
    const resolvedNodes = importedNodes.map((node) =>
      node.type && !hasNodeType(node.type)
        ? { ...node, type: 'missingPlugin', data: { ...node.data, _originalType: node.type } }
        : node
    );
    const missing = resolvedNodes.filter((n) => n.type === 'missingPlugin').length;
    if (missing > 0) {
      console.warn(`NodeEditor - ${missing} node(s) use plugins that are not installed`);
    }

    setNodes(resolvedNodes);
    setEdges(importedEdges);
    
    // Update the node data context with imported data - add small delay to ensure nodes are rendered first
    setTimeout(() => {
      Object.entries(importedNodeData).forEach(([nodeId, data]) => {
        console.log(`NodeEditor - Updating node data for ${nodeId}:`, data);
        updateNodeData(nodeId, data);
      });
      console.log('NodeEditor - Import complete');
    }, 100);
    
    setSelectedNode(null);
  }, [setNodes, setEdges, updateNodeData]);

  const onNodesDelete = useCallback((nodesToDelete: Node[]) => {
    setSelectedNode(null);
  }, []);

  const onEdgesDelete = useCallback((edgesToDelete: Edge[]) => {
    // Edge deletion is handled automatically by React Flow
  }, []);

  const toggleFullscreen = useCallback(() => {
    setIsFullscreen(prev => !prev);
  }, []);

  return (
    <NodeDataContext.Provider value={{
      nodeData,
      updateNodeData,
      getNodeData,
      getConnectedNodeData,
      getAllConnectedNodeData,
      propagateDataChange,
      addImageInputNode
    }}>
      <div className={`${isFullscreen ? 'fixed inset-0 z-50 bg-background' : 'h-[800px]'} w-full bg-card rounded-lg border overflow-hidden`}>
        <WorkflowToolbar 
          onClear={clearWorkflow}
          nodes={nodes}
          edges={edges}
          nodeData={nodeData}
          onImport={handleImport}
          isFullscreen={isFullscreen}
          onToggleFullscreen={toggleFullscreen}
        />
        <div className="flex h-full">
          <NodePalette onAddNode={addNode} />
          <div className="flex-1 relative">
            <div 
              className="h-full w-full"
              onDrop={onDrop}
              onDragOver={onDragOver}
            >
              <ReactFlow
                nodes={nodes}
                edges={edges}
                onNodesChange={onNodesChange}
                onEdgesChange={onEdgesChange}
                onConnect={onConnect}
                onNodeClick={onNodeClick}
                onPaneClick={onPaneClick}
                onNodesDelete={onNodesDelete}
                onEdgesDelete={onEdgesDelete}
                nodeTypes={nodeTypes}
                isValidConnection={isValidConnection}
                fitView
                deleteKeyCode={['Delete', 'Backspace']}
                className="bg-background"
                connectionLineStyle={{ stroke: 'hsl(var(--primary))', strokeWidth: 2 }}
                defaultEdgeOptions={{ 
                  style: { stroke: 'hsl(var(--primary))', strokeWidth: 2 },
                  type: 'smoothstep'
                }}
              >
                <Background />
                <Controls position="bottom-left" />
                <MiniMap />
                <ConnectionLegend />
              </ReactFlow>
            </div>
          </div>
        </div>
      </div>
    </NodeDataContext.Provider>
  );
};