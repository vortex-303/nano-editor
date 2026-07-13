import React, { useState, useRef } from 'react';
import { Handle, Position } from '@xyflow/react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import PixelArtGrid, { PixelCell } from '@/components/PixelArtGrid';
import { generatePixelArtSVG, svgToDataURL, downloadSVG } from '@/utils/svgExport';
import { useNodeDataContext } from '@/contexts/NodeDataContext';
import { NodeData } from '@/types/nodeEditor';
import { toast } from 'sonner';
import { Download, Trash2 } from 'lucide-react';

interface PixelArtNodeProps {
  data: NodeData;
  id: string;
}

type GridPreset = '16x16' | '32x32' | '64x64' | '128x128' | 'custom';

const PRESET_SIZES = {
  '16x16': { width: 16, height: 16 },
  '32x32': { width: 32, height: 32 },
  '64x64': { width: 64, height: 64 },
  '128x128': { width: 128, height: 128 },
};

export const PixelArtNode: React.FC<PixelArtNodeProps> = ({ data, id }) => {
  const { updateNodeData } = useNodeDataContext();
  
  const [gridPreset, setGridPreset] = useState<GridPreset>('32x32');
  const [customWidth, setCustomWidth] = useState(32);
  const [customHeight, setCustomHeight] = useState(32);
  const [paintColor, setPaintColor] = useState('#FFFFFF');
  const [cells, setCells] = useState<PixelCell[][]>([]);
  const gridKey = useRef(0);

  const currentWidth = gridPreset === 'custom' ? customWidth : PRESET_SIZES[gridPreset].width;
  const currentHeight = gridPreset === 'custom' ? customHeight : PRESET_SIZES[gridPreset].height;

  const handleGridChange = (newCells: PixelCell[][]) => {
    setCells(newCells);
    
    // Generate SVG and update node data
    const svgString = generatePixelArtSVG({
      cells: newCells,
      cellSize: 10, // Export cell size
    });
    const dataUrl = svgToDataURL(svgString);
    
    updateNodeData(id, {
      result: dataUrl,
      image: dataUrl,
      cells: newCells,
      gridWidth: currentWidth,
      gridHeight: currentHeight,
    });
  };

  const handleExportSVG = () => {
    const svgString = generatePixelArtSVG({
      cells,
      cellSize: 10,
    });
    
    downloadSVG(svgString, 'pixel-art.svg');
    toast.success('SVG exported successfully');
  };

  const handleClearGrid = () => {
    gridKey.current += 1;
    const emptyCells = Array(currentHeight).fill(null).map(() =>
      Array(currentWidth).fill(null).map(() => ({ filled: false, color: '#000000' }))
    );
    setCells(emptyCells);
    handleGridChange(emptyCells);
    toast.success('Grid cleared');
  };

  const handlePresetChange = (value: GridPreset) => {
    setGridPreset(value);
    gridKey.current += 1;
  };

  const handleCustomSizeApply = () => {
    gridKey.current += 1;
    toast.success('Custom grid size applied');
  };

  return (
    <Card className="w-[400px]">
      <CardHeader>
        <CardTitle className="text-lg flex items-center gap-2">
          🎨 Pixel Art
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Grid Size Selection */}
        <div className="space-y-2">
          <Label>Grid Size</Label>
          <Select value={gridPreset} onValueChange={handlePresetChange}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="16x16">16 × 16</SelectItem>
              <SelectItem value="32x32">32 × 32</SelectItem>
              <SelectItem value="64x64">64 × 64</SelectItem>
              <SelectItem value="128x128">128 × 128</SelectItem>
              <SelectItem value="custom">Custom Size</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Custom Size Inputs */}
        {gridPreset === 'custom' && (
          <div className="space-y-2">
            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label htmlFor="width" className="text-xs">Width</Label>
                <Input
                  id="width"
                  type="number"
                  min="1"
                  max="256"
                  value={customWidth}
                  onChange={(e) => setCustomWidth(Math.max(1, Math.min(256, parseInt(e.target.value) || 1)))}
                />
              </div>
              <div>
                <Label htmlFor="height" className="text-xs">Height</Label>
                <Input
                  id="height"
                  type="number"
                  min="1"
                  max="256"
                  value={customHeight}
                  onChange={(e) => setCustomHeight(Math.max(1, Math.min(256, parseInt(e.target.value) || 1)))}
                />
              </div>
            </div>
            <Button size="sm" onClick={handleCustomSizeApply} className="w-full">
              Apply Custom Size
            </Button>
          </div>
        )}

        {/* Color Picker */}
        <div className="space-y-2">
          <Label htmlFor="color">Paint Color</Label>
          <div className="flex gap-2">
            <Input
              id="color"
              type="color"
              value={paintColor}
              onChange={(e) => setPaintColor(e.target.value)}
              className="w-20 h-10 cursor-pointer"
            />
            <Input
              type="text"
              value={paintColor}
              onChange={(e) => setPaintColor(e.target.value)}
              className="flex-1"
              placeholder="#000000"
            />
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-2">
          <Button
            size="sm"
            variant="outline"
            onClick={handleClearGrid}
            className="flex-1"
          >
            <Trash2 className="w-4 h-4 mr-2" />
            Clear
          </Button>
          <Button
            size="sm"
            onClick={handleExportSVG}
            className="flex-1"
          >
            <Download className="w-4 h-4 mr-2" />
            Export SVG
          </Button>
        </div>

        {/* Pixel Grid */}
        <div className="space-y-2">
          <Label>Canvas (Click to paint, Right-click to erase)</Label>
          <PixelArtGrid
            key={gridKey.current}
            widthCells={currentWidth}
            heightCells={currentHeight}
            cellSize={10}
            paintColor={paintColor}
            onGridChange={handleGridChange}
          />
        </div>

        {/* Preview */}
        {data.result && (
          <div className="space-y-2">
            <Label>Preview</Label>
            <div className="border border-border rounded p-2 bg-background">
              <img src={data.result as string} alt="Pixel art preview" className="w-full h-auto" />
            </div>
          </div>
        )}
      </CardContent>

      {/* Output Handle */}
      <Handle
        type="source"
        position={Position.Right}
        id="svg"
        className="w-3 h-3 !bg-purple-500"
      />
    </Card>
  );
};

export default PixelArtNode;
