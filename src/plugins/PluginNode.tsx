import React, { useState, useEffect, useMemo } from 'react';
import { Handle, Position, useReactFlow } from '@xyflow/react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Slider } from '@/components/ui/slider';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2, Play, Download } from 'lucide-react';
import { toast } from 'sonner';
import { NodeData } from '@/types/nodeEditor';
import { useNodeDataContext } from '@/contexts/NodeDataContext';
import { ImagePreviewModal } from '@/components/ImagePreviewModal';
import { PORT_COLORS, type PluginManifest, type PluginParam } from './types';
import { executePlugin, type RuntimeInputs } from './runtimes';

interface PluginNodeProps {
  data: NodeData;
  id: string;
}

const paramDefaults = (manifest: PluginManifest): Record<string, unknown> =>
  Object.fromEntries(manifest.params.map((p) => [p.key, p.default]));

const ParamField: React.FC<{
  param: PluginParam;
  value: unknown;
  onChange: (v: unknown) => void;
  disabled: boolean;
}> = ({ param, value, onChange, disabled }) => {
  switch (param.kind) {
    case 'text':
      return param.multiline ? (
        <Textarea
          placeholder={param.placeholder}
          value={String(value ?? '')}
          onChange={(e) => onChange(e.target.value)}
          disabled={disabled}
          className="min-h-[60px] text-xs resize-none nodrag"
        />
      ) : (
        <Input
          placeholder={param.placeholder}
          value={String(value ?? '')}
          onChange={(e) => onChange(e.target.value)}
          disabled={disabled}
          className="h-7 text-xs nodrag"
        />
      );
    case 'select':
      return (
        <Select value={String(value ?? param.options[0].value)} onValueChange={onChange} disabled={disabled}>
          <SelectTrigger className="h-7 text-xs nodrag"><SelectValue /></SelectTrigger>
          <SelectContent>
            {param.options.map((o) => (
              <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      );
    case 'slider':
      return (
        <Slider
          value={[Number(value ?? param.min)]}
          onValueChange={([v]) => onChange(v)}
          min={param.min}
          max={param.max}
          step={param.step}
          disabled={disabled}
          className="nodrag"
        />
      );
    case 'toggle':
      return <Switch checked={!!value} onCheckedChange={onChange} disabled={disabled} />;
  }
};

/** Creates the React component for a manifest-declared plugin node. */
export const createPluginNodeComponent = (manifest: PluginManifest): React.FC<PluginNodeProps> => {
  const PluginNodeComponent: React.FC<PluginNodeProps> = ({ data, id }) => {
    const [params, setParams] = useState<Record<string, unknown>>({
      ...paramDefaults(manifest),
      ...((data.pluginParams as Record<string, unknown>) ?? {}),
    });
    const [result, setResult] = useState<string>((data.result as string) || '');
    const [resultKind, setResultKind] = useState<'image' | 'text'>('image');
    const [processing, setProcessing] = useState(false);
    const [progress, setProgress] = useState('');
    const [isPreviewOpen, setIsPreviewOpen] = useState(false);
    const { getConnectedNodeData, updateNodeData } = useNodeDataContext();
    const { getEdges } = useReactFlow();

    const edges = getEdges();

    // Resolve declared input ports into runtime inputs
    const runtimeInputs = useMemo((): RuntimeInputs => {
      const inputs: RuntimeInputs = {};
      for (const port of manifest.inputs) {
        const raw = getConnectedNodeData(id, edges, port.id);
        const value = Array.isArray(raw) ? raw : raw;
        if (value == null) continue;
        if (port.type === 'image' || port.type === 'mask') {
          inputs.image = inputs.image ?? (Array.isArray(value) ? value[0] : value);
        } else if (port.type === 'images' || port.type === 'batch') {
          inputs.images = Array.isArray(value) ? value : [value];
        } else if (port.type === 'text' || port.type === 'context') {
          inputs.text = inputs.text ?? (Array.isArray(value) ? value.join('\n') : String(value));
        }
      }
      return inputs;
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [id, edges, getConnectedNodeData]);

    // Write-back contract: text results feed prompt/context inputs downstream
    useEffect(() => {
      updateNodeData(id, {
        result,
        processing,
        pluginParams: params,
        pluginId: manifest.id,
        ...(resultKind === 'text' ? { prompt: result, contextData: result } : {}),
      });
    }, [result, resultKind, processing, params, id, updateNodeData]);

    const handleRun = async () => {
      setProcessing(true);
      try {
        const output = await executePlugin(manifest, runtimeInputs, params, setProgress);
        setResultKind(output.kind);
        setResult(output.value);
        toast.success(`${manifest.name} done`);
      } catch (error) {
        console.error(`Plugin ${manifest.id} failed:`, error);
        toast.error(error instanceof Error ? error.message : `${manifest.name} failed`);
      } finally {
        setProcessing(false);
        setProgress('');
      }
    };

    const handleDownload = () => {
      if (!result || resultKind !== 'image') return;
      const link = document.createElement('a');
      link.href = result;
      link.download = `${manifest.id}-${Date.now()}.png`;
      link.click();
    };

    const needsImage = manifest.inputs.some((p) => p.type === 'image' || p.type === 'mask');
    const canRun = !needsImage || !!runtimeInputs.image;

    const inputStep = 100 / (manifest.inputs.length + 1);
    const outputStep = 100 / (manifest.outputs.length + 1);

    return (
      <Card className="w-72 p-4">
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-base leading-none">{manifest.icon}</span>
              <span className="text-sm font-medium">{manifest.name}</span>
            </div>
            <Badge variant="secondary" className="text-[10px]">{manifest.badge || 'Plugin'}</Badge>
          </div>

          {runtimeInputs.image ? (
            <img src={runtimeInputs.image} alt="Input" className="w-full h-20 object-cover rounded border" />
          ) : needsImage ? (
            <p className="text-xs text-muted-foreground">{manifest.description}</p>
          ) : null}

          {manifest.params.map((param) => (
            <div key={param.key} className="space-y-1">
              <Label className="text-xs">{param.label}</Label>
              <ParamField
                param={param}
                value={params[param.key]}
                onChange={(v) => setParams((s) => ({ ...s, [param.key]: v }))}
                disabled={processing}
              />
            </div>
          ))}

          <Button
            variant="outline"
            size="sm"
            className="w-full h-7 text-xs"
            onClick={handleRun}
            disabled={!canRun || processing}
          >
            {processing ? (
              <>
                <Loader2 className="w-3 h-3 mr-1 animate-spin" />
                {progress || 'Running...'}
              </>
            ) : (
              <>
                <Play className="w-3 h-3 mr-1" /> Run
              </>
            )}
          </Button>

          {result && resultKind === 'image' && (
            <div className="space-y-1">
              <img
                src={result}
                alt="Result"
                className="w-full h-24 object-contain rounded border cursor-pointer"
                onClick={() => setIsPreviewOpen(true)}
              />
              <Button variant="ghost" size="sm" className="w-full h-6 text-xs" onClick={handleDownload}>
                <Download className="w-3 h-3 mr-1" /> Download
              </Button>
            </div>
          )}
          {result && resultKind === 'text' && (
            <div className="space-y-1">
              <Label className="text-xs">Result</Label>
              <Textarea
                value={result}
                onChange={(e) => setResult(e.target.value)}
                className="min-h-[60px] text-xs resize-none nodrag"
              />
            </div>
          )}
        </div>

        {manifest.inputs.map((port, i) => (
          <Handle
            key={port.id}
            type="target"
            position={Position.Left}
            id={port.id}
            style={{ top: `${(i + 1) * inputStep}%` }}
            className={`w-3 h-3 ${PORT_COLORS[port.type]}`}
            title={port.label || port.id}
          />
        ))}
        {manifest.outputs.map((port, i) => (
          <Handle
            key={port.id}
            type="source"
            position={Position.Right}
            id={port.id}
            style={{ top: `${(i + 1) * outputStep}%` }}
            className={`w-3 h-3 ${PORT_COLORS[port.type]}`}
            title={port.label || port.id}
          />
        ))}

        <ImagePreviewModal
          isOpen={isPreviewOpen}
          onClose={() => setIsPreviewOpen(false)}
          imageUrl={result}
        />
      </Card>
    );
  };
  PluginNodeComponent.displayName = `PluginNode(${manifest.id})`;
  return PluginNodeComponent;
};
