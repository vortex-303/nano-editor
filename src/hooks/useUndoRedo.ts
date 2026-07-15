import { useCallback, useRef, useState } from 'react';
import { Node, Edge } from '@xyflow/react';
import type { NodeDataState } from './useNodeData';

interface Snapshot {
  nodes: Node[];
  edges: Edge[];
  nodeData: NodeDataState;
}

interface UndoRedoParams {
  getSnapshot: () => Snapshot;
  applySnapshot: (s: Snapshot) => void;
  limit?: number;
}

/**
 * Structural undo/redo for the node graph. Callers invoke `takeSnapshot()`
 * immediately BEFORE a structural mutation (add/delete node, connect/delete
 * edge, drag). Undo restores the previous snapshot; redo re-applies.
 */
export const useUndoRedo = ({ getSnapshot, applySnapshot, limit = 50 }: UndoRedoParams) => {
  const past = useRef<Snapshot[]>([]);
  const future = useRef<Snapshot[]>([]);
  const [canUndo, setCanUndo] = useState(false);
  const [canRedo, setCanRedo] = useState(false);

  const sync = () => {
    setCanUndo(past.current.length > 0);
    setCanRedo(future.current.length > 0);
  };

  const clone = (s: Snapshot): Snapshot => ({
    nodes: JSON.parse(JSON.stringify(s.nodes)),
    edges: JSON.parse(JSON.stringify(s.edges)),
    nodeData: JSON.parse(JSON.stringify(s.nodeData)),
  });

  const takeSnapshot = useCallback(() => {
    past.current.push(clone(getSnapshot()));
    if (past.current.length > limit) past.current.shift();
    future.current = [];
    sync();
  }, [getSnapshot, limit]);

  const undo = useCallback(() => {
    if (past.current.length === 0) return;
    const current = clone(getSnapshot());
    const prev = past.current.pop()!;
    future.current.push(current);
    applySnapshot(prev);
    sync();
  }, [getSnapshot, applySnapshot]);

  const redo = useCallback(() => {
    if (future.current.length === 0) return;
    const current = clone(getSnapshot());
    const next = future.current.pop()!;
    past.current.push(current);
    applySnapshot(next);
    sync();
  }, [getSnapshot, applySnapshot]);

  const reset = useCallback(() => {
    past.current = [];
    future.current = [];
    sync();
  }, []);

  return { takeSnapshot, undo, redo, reset, canUndo, canRedo };
};
