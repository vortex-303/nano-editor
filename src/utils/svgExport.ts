interface PixelCell {
  filled: boolean;
  color: string;
}

interface SVGExportOptions {
  cells: PixelCell[][];
  cellSize: number;
  backgroundColor?: string;
}

export function generatePixelArtSVG(options: SVGExportOptions): string {
  const { cells, cellSize, backgroundColor } = options;
  const height = cells.length;
  const width = cells[0]?.length || 0;
  const viewBoxWidth = width * cellSize;
  const viewBoxHeight = height * cellSize;
  
  let svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${viewBoxWidth} ${viewBoxHeight}" width="${viewBoxWidth}" height="${viewBoxHeight}">`;
  
  // Optional background
  if (backgroundColor) {
    svg += `\n  <rect width="${viewBoxWidth}" height="${viewBoxHeight}" fill="${backgroundColor}"/>`;
  }
  
  // Render filled cells
  cells.forEach((row, y) => {
    row.forEach((cell, x) => {
      if (cell.filled) {
        const cx = x * cellSize;
        const cy = y * cellSize;
        svg += `\n  <rect x="${cx}" y="${cy}" width="${cellSize}" height="${cellSize}" fill="${cell.color}"/>`;
      }
    });
  });
  
  svg += '\n</svg>';
  return svg;
}

export function svgToDataURL(svgString: string): string {
  return `data:image/svg+xml;base64,${btoa(svgString)}`;
}

export function downloadSVG(svgString: string, filename: string = 'pixel-art.svg') {
  const blob = new Blob([svgString], { type: 'image/svg+xml' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
