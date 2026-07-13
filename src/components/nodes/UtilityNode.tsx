import React, { useState } from 'react';
import { Handle, Position } from '@xyflow/react';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Slider } from '@/components/ui/slider';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Settings, Play } from 'lucide-react';
import { NodeData } from '@/types/nodeEditor';

interface UtilityNodeProps {
  data: NodeData;
  id: string;
}

const utilityTypes = [
  { value: 'resize', label: 'Resize' },
  { value: 'crop', label: 'Crop' },
  { value: 'color', label: 'Color Correction' },
  { value: 'enhance', label: 'Enhancement' },
];

export const UtilityNode: React.FC<UtilityNodeProps> = ({ data, id }) => {
  const [utilityType, setUtilityType] = useState('resize');
  const [width, setWidth] = useState('1024');
  const [height, setHeight] = useState('1024');
  const [brightness, setBrightness] = useState([0]);
  const [contrast, setContrast] = useState([0]);
  const [saturation, setSaturation] = useState([0]);
  const [processing, setProcessing] = useState(false);

  const handleProcess = async () => {
    setProcessing(true);
    // Simulate processing
    setTimeout(() => {
      setProcessing(false);
    }, 1500);
  };

  return (
    <Card className="w-64 p-4">
      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <Settings size={16} className="text-primary" />
          <span className="text-sm font-medium">Utility</span>
        </div>

        <div className="space-y-2">
          <Label className="text-xs">Operation</Label>
          <Select value={utilityType} onValueChange={setUtilityType}>
            <SelectTrigger className="text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {utilityTypes.map((type) => (
                <SelectItem key={type.value} value={type.value}>
                  {type.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {utilityType === 'resize' && (
          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-1">
              <Label className="text-xs">Width</Label>
              <Input
                type="number"
                value={width}
                onChange={(e) => setWidth(e.target.value)}
                className="text-xs"
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Height</Label>
              <Input
                type="number"
                value={height}
                onChange={(e) => setHeight(e.target.value)}
                className="text-xs"
              />
            </div>
          </div>
        )}

        {utilityType === 'color' && (
          <div className="space-y-3">
            <div className="space-y-1">
              <Label className="text-xs">Brightness: {brightness[0]}</Label>
              <Slider
                value={brightness}
                onValueChange={setBrightness}
                min={-50}
                max={50}
                step={1}
                className="w-full"
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Contrast: {contrast[0]}</Label>
              <Slider
                value={contrast}
                onValueChange={setContrast}
                min={-50}
                max={50}
                step={1}
                className="w-full"
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Saturation: {saturation[0]}</Label>
              <Slider
                value={saturation}
                onValueChange={setSaturation}
                min={-50}
                max={50}
                step={1}
                className="w-full"
              />
            </div>
          </div>
        )}

        <Button
          size="sm"
          className="w-full"
          onClick={handleProcess}
          disabled={processing}
        >
          <Play size={14} />
          {processing ? 'Processing...' : 'Apply'}
        </Button>

        {processing && (
          <div className="w-full bg-secondary rounded-full h-2">
            <div className="bg-primary h-2 rounded-full animate-pulse w-1/3"></div>
          </div>
        )}
      </div>

      <Handle
        type="target"
        position={Position.Left}
        className="w-3 h-3 bg-secondary"
      />
      <Handle
        type="source"
        position={Position.Right}
        className="w-3 h-3 bg-primary"
      />
    </Card>
  );
};