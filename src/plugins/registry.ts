import type { ComponentType } from 'react';
import type { NodeDefinition, PortSpec, PortType } from './types';

/**
 * Central node registry. Built-ins register at startup (builtins.ts), plugins
 * at load/install time. NodeEditor and NodePalette read from here via
 * useSyncExternalStore so the palette updates live on install/uninstall.
 */
const definitions = new Map<string, NodeDefinition>();
const listeners = new Set<() => void>();

// Cached snapshots — must be referentially stable between changes for
// useSyncExternalStore and to keep ReactFlow's nodeTypes prop stable.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let nodeTypesSnapshot: Record<string, ComponentType<any>> = {};
let catalogSnapshot: NodeDefinition[] = [];

const rebuild = () => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const types: Record<string, ComponentType<any>> = {};
  for (const def of definitions.values()) types[def.type] = def.component;
  nodeTypesSnapshot = types;
  catalogSnapshot = [...definitions.values()].filter(d => !d.hidden);
  listeners.forEach((l) => l());
};

export const registerNode = (def: NodeDefinition): void => {
  definitions.set(def.type, def);
  rebuild();
};

export const registerNodes = (defs: NodeDefinition[]): void => {
  for (const def of defs) definitions.set(def.type, def);
  rebuild();
};

export const unregisterNode = (type: string): void => {
  if (definitions.delete(type)) rebuild();
};

export const getDefinition = (type: string): NodeDefinition | undefined => definitions.get(type);

export const hasNodeType = (type: string): boolean => definitions.has(type);

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const getNodeTypesSnapshot = (): Record<string, ComponentType<any>> => nodeTypesSnapshot;

export const getCatalogSnapshot = (): NodeDefinition[] => catalogSnapshot;

export const subscribe = (listener: () => void): (() => void) => {
  listeners.add(listener);
  return () => listeners.delete(listener);
};

/** Port spec lookup for connection validation; undefined = unknown (permissive). */
export const getPortSpec = (
  nodeType: string | undefined,
  handleId: string | null | undefined,
  direction: 'inputs' | 'outputs'
): PortSpec | undefined => {
  if (!nodeType || !handleId) return undefined;
  return definitions.get(nodeType)?.[direction]?.find((p) => p.id === handleId);
};

export const getPortType = (
  nodeType: string | undefined,
  handleId: string | null | undefined,
  direction: 'inputs' | 'outputs'
): PortType | undefined => getPortSpec(nodeType, handleId, direction)?.type;
