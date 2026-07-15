import React from 'react';
import { Handle, Position } from '@xyflow/react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { PackageX } from 'lucide-react';
import { NodeData } from '@/types/nodeEditor';

interface MissingPluginNodeProps {
  data: NodeData & { _originalType?: string; _pluginId?: string };
  id: string;
}

/**
 * Rendered in place of a node whose type isn't registered (usually a plugin
 * that isn't installed). Preserves the node's position and connections so
 * reinstalling the plugin and reloading the project restores everything.
 */
export const MissingPluginNode: React.FC<MissingPluginNodeProps> = ({ data }) => {
  const pluginId = data._pluginId || data._originalType?.replace(/^plugin\./, '');
  return (
    <Card className="w-64 p-4 border-dashed border-destructive/50">
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <PackageX size={16} className="text-destructive" />
            <span className="text-sm font-medium">Missing plugin</span>
          </div>
          <Badge variant="destructive" className="text-[10px]">Not installed</Badge>
        </div>
        <p className="text-xs text-muted-foreground">
          This project uses <span className="font-mono">{pluginId || data._originalType || 'an unknown node'}</span>,
          which isn't installed in this browser.
        </p>
        <p className="text-[10px] text-muted-foreground">
          Install it from the Plugins panel (top right), then reload the project.
        </p>
      </div>
      <Handle type="target" position={Position.Left} id="image" className="w-3 h-3 bg-gray-400" />
      <Handle type="source" position={Position.Right} id="result" className="w-3 h-3 bg-gray-400" />
    </Card>
  );
};
