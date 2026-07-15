import React, { useSyncExternalStore } from 'react';
import { Card } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { subscribe, getCatalogSnapshot } from '@/plugins/registry';
import type { NodeCategory, NodeDefinition } from '@/plugins/types';

interface NodePaletteProps {
  onAddNode: (type: string, position: { x: number; y: number }) => void;
}

const CATEGORY_ORDER: NodeCategory[] = ['Input', 'Processing', 'Output', 'Community'];

export const NodePalette: React.FC<NodePaletteProps> = ({ onAddNode }) => {
  const catalog = useSyncExternalStore(subscribe, getCatalogSnapshot);

  const categories = CATEGORY_ORDER
    .map((title) => ({ title, nodes: catalog.filter((d) => d.category === title) }))
    .filter((c) => c.nodes.length > 0);

  const onDragStart = (event: React.DragEvent, nodeType: string) => {
    event.dataTransfer.setData('application/reactflow', nodeType);
    event.dataTransfer.effectAllowed = 'move';
  };

  const handleNodeAdd = (type: string) => {
    // Add node at center of canvas
    onAddNode(type, { x: 400, y: 300 });
  };

  const renderIcon = (node: NodeDefinition) => {
    if (node.icon) {
      const Icon = node.icon;
      return <Icon size={14} className="mt-0.5 text-primary group-hover:text-black" />;
    }
    return <span className="text-sm leading-none mt-0.5">{node.emoji || '✨'}</span>;
  };

  return (
    <Card className="w-64 h-full rounded-none border-r border-l-0 border-t-0 border-b-0 flex flex-col">
      <div className="p-4 border-b flex-shrink-0">
        <h3 className="font-semibold text-sm">Node Library</h3>
      </div>
      <ScrollArea className="flex-1 overflow-auto">
        <div className="p-2 pb-8">
          {categories.map((category, idx) => (
            <div key={category.title} className="mb-3">
              <h4 className="text-xs font-medium text-muted-foreground mb-1.5 px-2">
                {category.title}
              </h4>
              <div className="space-y-0.5">
                {category.nodes.map((node) => (
                  <div
                    key={node.type}
                    className="group w-full justify-start h-auto p-2 text-left border rounded-md cursor-grab hover:bg-accent transition-colors"
                    draggable
                    onDragStart={(event) => onDragStart(event, node.type)}
                    onClick={() => handleNodeAdd(node.type)}
                  >
                    <div className="flex items-start gap-2">
                      {renderIcon(node)}
                      <div className="flex-1 min-w-0">
                        <div className="text-xs font-medium group-hover:text-black">{node.title}</div>
                        <div className="text-[10px] text-muted-foreground group-hover:text-black leading-tight mt-1">
                          {node.description}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
              {idx < categories.length - 1 && <Separator className="mt-2" />}
            </div>
          ))}
        </div>
      </ScrollArea>
    </Card>
  );
};
