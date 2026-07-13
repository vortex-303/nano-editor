import React, { useState, useRef, useEffect } from 'react';

export interface PixelCell {
  filled: boolean;
  color: string;
}

interface PixelArtGridProps {
  widthCells: number;
  heightCells: number;
  cellSize: number;
  paintColor: string;
  onGridChange?: (cells: PixelCell[][]) => void;
  initialCells?: PixelCell[][];
}

export const PixelArtGrid: React.FC<PixelArtGridProps> = ({
  widthCells,
  heightCells,
  cellSize,
  paintColor,
  onGridChange,
  initialCells,
}) => {
  const [cells, setCells] = useState<PixelCell[][]>(() => {
    if (initialCells && initialCells.length === heightCells && initialCells[0]?.length === widthCells) {
      return initialCells;
    }
    return Array(heightCells).fill(null).map(() =>
      Array(widthCells).fill(null).map(() => ({ filled: false, color: '#000000' }))
    );
  });
  
  const [isPainting, setIsPainting] = useState(false);
  const [isErasing, setIsErasing] = useState(false);
  const svgRef = useRef<SVGSVGElement>(null);

  // Reset grid when dimensions change
  useEffect(() => {
    if (initialCells && initialCells.length === heightCells && initialCells[0]?.length === widthCells) {
      setCells(initialCells);
    } else {
      const newCells = Array(heightCells).fill(null).map(() =>
        Array(widthCells).fill(null).map(() => ({ filled: false, color: '#000000' }))
      );
      setCells(newCells);
      onGridChange?.(newCells);
    }
  }, [widthCells, heightCells]);

  useEffect(() => {
    onGridChange?.(cells);
  }, [cells]);

  const paintCell = (row: number, col: number, erase: boolean = false) => {
    setCells(prev => {
      const newCells = prev.map(r => r.map(c => ({ ...c })));
      if (erase) {
        newCells[row][col] = { filled: false, color: '#000000' };
      } else {
        newCells[row][col] = { filled: true, color: paintColor };
      }
      return newCells;
    });
  };

  const handleSvgMouseDown = (e: React.MouseEvent<SVGSVGElement>) => {
    e.preventDefault();
    e.stopPropagation();
    const svg = svgRef.current;
    if (!svg) return;

    const rect = svg.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    
    // Convert to SVG coordinates
    const scaleX = viewBoxWidth / rect.width;
    const scaleY = viewBoxHeight / rect.height;
    const svgX = x * scaleX;
    const svgY = y * scaleY;
    
    // Calculate cell
    const col = Math.floor(svgX / cellSize);
    const row = Math.floor(svgY / cellSize);
    
    if (row >= 0 && row < heightCells && col >= 0 && col < widthCells) {
      console.log('Cell clicked:', row, col, 'Color:', paintColor);
      const eraseMode = e.button === 2;
      setIsErasing(eraseMode);
      setIsPainting(true);
      paintCell(row, col, eraseMode);
    }
  };

  const handleSvgMouseMove = (e: React.MouseEvent<SVGSVGElement>) => {
    if (!isPainting) return;
    
    const svg = svgRef.current;
    if (!svg) return;

    const rect = svg.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    
    const scaleX = viewBoxWidth / rect.width;
    const scaleY = viewBoxHeight / rect.height;
    const svgX = x * scaleX;
    const svgY = y * scaleY;
    
    const col = Math.floor(svgX / cellSize);
    const row = Math.floor(svgY / cellSize);
    
    if (row >= 0 && row < heightCells && col >= 0 && col < widthCells) {
      paintCell(row, col, isErasing);
    }
  };

  const handleMouseUp = () => {
    setIsPainting(false);
    setIsErasing(false);
  };

  const handleContextMenu = (e: React.MouseEvent) => {
    e.preventDefault();
  };

  useEffect(() => {
    document.addEventListener('mouseup', handleMouseUp);
    return () => {
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, []);

  const viewBoxWidth = widthCells * cellSize;
  const viewBoxHeight = heightCells * cellSize;

  const handleDivClick = (e: React.MouseEvent<HTMLDivElement>) => {
    console.log('DIV CLICKED - events are working!');
  };

  return (
    <div 
      onClick={handleDivClick}
      onMouseDown={(e) => {
        console.log('DIV MOUSE DOWN');
        e.stopPropagation(); // Stop React Flow from capturing
      }}
      className="nodrag nowheel" 
      style={{ touchAction: 'none' }}
    >
      <svg
        ref={svgRef}
        viewBox={`0 0 ${viewBoxWidth} ${viewBoxHeight}`}
        className="w-full h-auto border border-border rounded bg-muted/20"
        style={{ maxHeight: '400px', cursor: 'crosshair', userSelect: 'none', display: 'block' }}
        onMouseDown={handleSvgMouseDown}
        onMouseMove={handleSvgMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        onContextMenu={handleContextMenu}
      >
      {/* Grid background - dark gray */}
      <rect width={viewBoxWidth} height={viewBoxHeight} fill="#2a2a2a" />
      
      {/* Grid cells */}
      {cells.map((row, y) =>
        row.map((cell, x) => {
          const cx = x * cellSize;
          const cy = y * cellSize;
          
          return (
            <rect
              key={`${y}-${x}`}
              x={cx}
              y={cy}
              width={cellSize}
              height={cellSize}
              fill={cell.filled ? cell.color : 'transparent'}
              stroke="#666666"
              strokeWidth="0.5"
              pointerEvents="none"
            />
          );
        })
      )}
    </svg>
    </div>
  );
};

export default PixelArtGrid;
