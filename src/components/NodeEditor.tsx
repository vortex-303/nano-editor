import React, { useCallback, useState, useSyncExternalStore, useRef, useEffect } from 'react';
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
  type ReactFlowInstance,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';

import { NodePalette } from './NodePalette';
import { WorkflowToolbar } from './WorkflowToolbar';
import { ConnectionLegend } from './ConnectionLegend';
import { useNodeData } from '@/hooks/useNodeData';
import { useUndoRedo } from '@/hooks/useUndoRedo';
import { getToolPreset } from '@/lib/toolPresets';
import { toast } from 'sonner';
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
  const { nodeData, updateNodeData, setAllNodeData, getNodeData, getConnectedNodeData, getAllConnectedNodeData, propagateDataChange } = useNodeData();
  // Registry-driven node types: updates live when plugins are installed/removed
  const nodeTypes = useSyncExternalStore(subscribe, getNodeTypesSnapshot);

  // Live refs so keyboard/history closures always see current state
  const rfInstance = useRef<ReactFlowInstance | null>(null);
  const stateRef = useRef({ nodes, edges, nodeData });
  stateRef.current = { nodes, edges, nodeData };

  const { takeSnapshot, undo, redo, reset: resetHistory } = useUndoRedo({
    getSnapshot: () => ({ ...stateRef.current }),
    applySnapshot: (s) => {
      setNodes(s.nodes);
      setEdges(s.edges);
      setAllNodeData(s.nodeData);
    },
  });

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
    takeSnapshot();
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
  }, [setNodes, updateNodeData, takeSnapshot]);

  const onConnect = useCallback(
    (params: Connection | Edge) => {
      takeSnapshot();
      setEdges((eds) => {
        const newEdges = addEdge(params, eds);
        // Propagate data when new connection is made
        if (params.source) {
          setTimeout(() => propagateDataChange(params.source!, newEdges, nodes), 0);
        }
        return newEdges;
      });
    },
    [setEdges, propagateDataChange, nodes, takeSnapshot]
  );

  const onNodeClick = useCallback((_: React.MouseEvent, node: Node) => {
    setSelectedNode(node);
  }, []);

  const onPaneClick = useCallback(() => {
    setSelectedNode(null);
  }, []);

  const addNode = useCallback((type: string, position: { x: number; y: number }) => {
    takeSnapshot();
    const newNode: Node = {
      id: `${type}-${Date.now()}`,
      type,
      position,
      data: { label: `${type} node` },
    };
    setNodes((nds) => [...nds, newNode]);
  }, [setNodes, takeSnapshot]);

  // Duplicate the currently selected node (Cmd/Ctrl+D)
  const duplicateSelected = useCallback(() => {
    const { nodes: curNodes, nodeData: curData } = stateRef.current;
    const selected = curNodes.find((n) => n.selected) || selectedNode;
    if (!selected) return;
    takeSnapshot();
    const newId = `${selected.type}-${Date.now()}`;
    const newNode: Node = {
      ...selected,
      id: newId,
      selected: false,
      position: { x: selected.position.x + 40, y: selected.position.y + 40 },
      data: { ...selected.data },
    };
    setNodes((nds) => [...nds.map((n) => ({ ...n, selected: false })), newNode]);
    const srcData = curData[selected.id];
    if (srcData) setTimeout(() => updateNodeData(newId, { ...srcData }), 0);
  }, [selectedNode, setNodes, updateNodeData, takeSnapshot]);

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
        takeSnapshot();
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
    takeSnapshot();
    setNodes([]);
    setEdges([]);
    setSelectedNode(null);
  }, [setNodes, setEdges, takeSnapshot]);

  // Snapshot before React Flow deletes nodes/edges, so Undo can restore them
  const onBeforeDelete = useCallback(async () => {
    takeSnapshot();
    return true;
  }, [takeSnapshot]);

  const onNodeDragStart = useCallback(() => {
    takeSnapshot();
  }, [takeSnapshot]);

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
    resetHistory();
  }, [setNodes, setEdges, updateNodeData, resetHistory]);

  const onNodesDelete = useCallback((nodesToDelete: Node[]) => {
    setSelectedNode(null);
  }, []);

  // Deep-link from a /tools/* landing page: ?tool=<id> preloads a starter graph
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const tool = params.get('tool');
    if (!tool) return;
    const preset = getToolPreset(tool);
    // Only preload into an empty canvas so we never clobber existing work
    if (preset && stateRef.current.nodes.length === 0) {
      setNodes(preset.nodes);
      setEdges(preset.edges);
      setTimeout(() => {
        rfInstance.current?.fitView({ padding: 0.3, duration: 400 });
        toast.info('Add your image to the Image Input node, then run.');
      }, 200);
    }
    // Clean the URL so reloads/saves don't retrigger
    window.history.replaceState({}, '', window.location.pathname);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Keyboard shortcuts
  useEffect(() => {
    const isTyping = (el: EventTarget | null) => {
      const t = el as HTMLElement | null;
      if (!t) return false;
      const tag = t.tagName;
      return tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || t.isContentEditable;
    };
    const onKey = (e: KeyboardEvent) => {
      const mod = e.metaKey || e.ctrlKey;
      if (mod && e.key.toLowerCase() === 'z') {
        e.preventDefault();
        if (e.shiftKey) redo(); else undo();
        return;
      }
      if (mod && e.key.toLowerCase() === 'y') { e.preventDefault(); redo(); return; }
      if (mod && e.key.toLowerCase() === 's') {
        e.preventDefault();
        window.dispatchEvent(new CustomEvent('nano:save'));
        return;
      }
      if (mod && e.key.toLowerCase() === 'd') {
        e.preventDefault();
        duplicateSelected();
        return;
      }
      // Single-key shortcuts only when not typing in a field
      if (isTyping(e.target)) return;
      if (e.key === 'f' || e.key === 'F') {
        e.preventDefault();
        rfInstance.current?.fitView({ padding: 0.2, duration: 300 });
      } else if (e.key === 'Escape') {
        setSelectedNode(null);
      } else if (e.key === '?') {
        e.preventDefault();
        window.dispatchEvent(new CustomEvent('nano:shortcuts'));
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [undo, redo, duplicateSelected]);

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
                onInit={(instance) => { rfInstance.current = instance; }}
                onNodesChange={onNodesChange}
                onEdgesChange={onEdgesChange}
                onConnect={onConnect}
                onNodeClick={onNodeClick}
                onPaneClick={onPaneClick}
                onNodesDelete={onNodesDelete}
                onEdgesDelete={onEdgesDelete}
                onBeforeDelete={onBeforeDelete}
                onNodeDragStart={onNodeDragStart}
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