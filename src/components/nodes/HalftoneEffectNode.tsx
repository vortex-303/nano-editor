import React, { useState, useEffect } from 'react';
import { Handle, Position, NodeProps, useReactFlow } from '@xyflow/react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useNodeDataContext } from '@/contexts/NodeDataContext';
import { toast } from 'sonner';
import { Sparkles, Loader2 } from 'lucide-react';
import { ImagePreviewModal } from '../ImagePreviewModal';

interface HalftoneEffectNodeData {
  label?: string;
  image?: string;
  result?: string;
  mode?: 'dot' | 'ordered' | 'dithering';
  cellSize?: number;
  angle?: number;
  dotShape?: 'circle' | 'square' | 'line';
  colorSeparation?: boolean;
  blendMode?: 'normal' | 'multiply' | 'screen';
}

const HalftoneEffectNode: React.FC<NodeProps> = ({ id, data }) => {
  const { updateNodeData, getConnectedNodeData } = useNodeDataContext();
  const { getEdges } = useReactFlow();
  const edges = getEdges();
  
  const nodeData = data as HalftoneEffectNodeData;
  const [mode, setMode] = useState<'dot' | 'ordered' | 'dithering'>(nodeData.mode || 'dot');
  const [cellSize, setCellSize] = useState(nodeData.cellSize || 8);
  const [angle, setAngle] = useState(nodeData.angle || 45);
  const [dotShape, setDotShape] = useState<'circle' | 'square' | 'line'>(nodeData.dotShape || 'circle');
  const [colorSeparation, setColorSeparation] = useState(nodeData.colorSeparation || false);
  const [blendMode, setBlendMode] = useState<'normal' | 'multiply' | 'screen'>(nodeData.blendMode || 'normal');
  const [processing, setProcessing] = useState(false);
  const [result, setResult] = useState(nodeData.result || '');
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [previewImage, setPreviewImage] = useState('');

  // Get connected image data
  const connectedImage = getConnectedNodeData(id, edges, 'image');
  const imageUrl = Array.isArray(connectedImage) ? connectedImage[0] : connectedImage;

  useEffect(() => {
    updateNodeData(id, { result });
  }, [result, id, updateNodeData]);

  const createWebGLShader = (gl: WebGLRenderingContext, type: number, source: string): WebGLShader | null => {
    const shader = gl.createShader(type);
    if (!shader) return null;
    
    gl.shaderSource(shader, source);
    gl.compileShader(shader);
    
    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
      console.error('Shader compile error:', gl.getShaderInfoLog(shader));
      gl.deleteShader(shader);
      return null;
    }
    
    return shader;
  };

  const getFragmentShader = (mode: string, dotShape: string, colorSep: boolean): string => {
    const baseShader = `
      precision mediump float;
      uniform sampler2D u_image;
      uniform vec2 u_resolution;
      uniform float u_cellSize;
      uniform float u_angle;
      varying vec2 v_texCoord;
      
      const float PI = 3.14159265359;
      
      vec2 rotate(vec2 v, float a) {
        float s = sin(a);
        float c = cos(a);
        mat2 m = mat2(c, -s, s, c);
        return m * v;
      }
      
      float circle(vec2 p, float r) {
        return smoothstep(r + 0.1, r - 0.1, length(p));
      }
      
      float square(vec2 p, float s) {
        vec2 d = abs(p) - vec2(s);
        return smoothstep(0.1, -0.1, max(d.x, d.y));
      }
      
      float line(vec2 p, float w) {
        return smoothstep(w + 0.1, w - 0.1, abs(p.y));
      }
    `;

    if (mode === 'dot') {
      return baseShader + `
        void main() {
          // Flip Y coordinate to fix vertical flip
          vec2 flippedCoord = vec2(v_texCoord.x, 1.0 - v_texCoord.y);
          vec4 color = texture2D(u_image, flippedCoord);
          float brightness = dot(color.rgb, vec3(0.299, 0.587, 0.114));
          
          // Apply rotation only to pattern calculation
          vec2 pixel = v_texCoord * u_resolution;
          float angleRad = u_angle * PI / 180.0;
          float s = sin(angleRad);
          float c = cos(angleRad);
          vec2 rotatedPixel = vec2(
            pixel.x * c - pixel.y * s,
            pixel.x * s + pixel.y * c
          );
          
          vec2 cell = floor(rotatedPixel / u_cellSize);
          vec2 cellCenter = (cell + 0.5) * u_cellSize;
          vec2 localPos = (rotatedPixel - cellCenter) / u_cellSize;
          
          float dotSize = brightness * 0.5;
          float mask;
          ${dotShape === 'circle' ? 'mask = circle(localPos, dotSize);' : 
            dotShape === 'square' ? 'mask = square(localPos, dotSize);' : 
            'mask = line(localPos, dotSize);'}
          
          gl_FragColor = vec4(vec3(mask), 1.0);
        }
      `;
    } else if (mode === 'ordered') {
      return baseShader + `
        const mat4 bayer = mat4(
          0.0/16.0, 8.0/16.0, 2.0/16.0, 10.0/16.0,
          12.0/16.0, 4.0/16.0, 14.0/16.0, 6.0/16.0,
          3.0/16.0, 11.0/16.0, 1.0/16.0, 9.0/16.0,
          15.0/16.0, 7.0/16.0, 13.0/16.0, 5.0/16.0
        );
        
        void main() {
          vec2 flippedCoord = vec2(v_texCoord.x, 1.0 - v_texCoord.y);
          vec4 color = texture2D(u_image, flippedCoord);
          float brightness = dot(color.rgb, vec3(0.299, 0.587, 0.114));
          
          vec2 pixel = v_texCoord * u_resolution;
          int x = int(mod(pixel.x, 4.0));
          int y = int(mod(pixel.y, 4.0));
          float threshold = bayer[x][y];
          
          float result = brightness > threshold ? 1.0 : 0.0;
          gl_FragColor = vec4(vec3(result), 1.0);
        }
      `;
    } else {
      return baseShader + `
        void main() {
          vec2 flippedCoord = vec2(v_texCoord.x, 1.0 - v_texCoord.y);
          vec4 color = texture2D(u_image, flippedCoord);
          float brightness = dot(color.rgb, vec3(0.299, 0.587, 0.114));
          
          vec2 pixel = v_texCoord * u_resolution / u_cellSize;
          float noise = fract(sin(dot(pixel, vec2(12.9898, 78.233))) * 43758.5453);
          float result = brightness + (noise - 0.5) * 0.2 > 0.5 ? 1.0 : 0.0;
          
          gl_FragColor = vec4(vec3(result), 1.0);
        }
      `;
    }
  };

  const processWithWebGL = async (img: HTMLImageElement): Promise<string> => {
    const canvas = document.createElement('canvas');
    canvas.width = img.width;
    canvas.height = img.height;
    
    const gl = canvas.getContext('webgl');
    if (!gl) throw new Error('WebGL not supported');

    const vertexShaderSource = `
      attribute vec2 a_position;
      attribute vec2 a_texCoord;
      varying vec2 v_texCoord;
      
      void main() {
        gl_Position = vec4(a_position, 0.0, 1.0);
        v_texCoord = a_texCoord;
      }
    `;

    const fragmentShaderSource = getFragmentShader(mode, dotShape, colorSeparation);

    const vertexShader = createWebGLShader(gl, gl.VERTEX_SHADER, vertexShaderSource);
    const fragmentShader = createWebGLShader(gl, gl.FRAGMENT_SHADER, fragmentShaderSource);
    
    if (!vertexShader || !fragmentShader) throw new Error('Failed to create shaders');

    const program = gl.createProgram();
    if (!program) throw new Error('Failed to create program');
    
    gl.attachShader(program, vertexShader);
    gl.attachShader(program, fragmentShader);
    gl.linkProgram(program);

    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
      throw new Error('Program link error: ' + gl.getProgramInfoLog(program));
    }

    gl.useProgram(program);

    const positions = new Float32Array([
      -1, -1,  1, -1,  -1, 1,
      -1, 1,   1, -1,   1, 1,
    ]);
    
    const texCoords = new Float32Array([
      0, 0,  1, 0,  0, 1,
      0, 1,  1, 0,  1, 1,
    ]);

    const posBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, posBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, positions, gl.STATIC_DRAW);
    
    const posLoc = gl.getAttribLocation(program, 'a_position');
    gl.enableVertexAttribArray(posLoc);
    gl.vertexAttribPointer(posLoc, 2, gl.FLOAT, false, 0, 0);

    const texBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, texBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, texCoords, gl.STATIC_DRAW);
    
    const texLoc = gl.getAttribLocation(program, 'a_texCoord');
    gl.enableVertexAttribArray(texLoc);
    gl.vertexAttribPointer(texLoc, 2, gl.FLOAT, false, 0, 0);

    const texture = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, texture);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, img);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);

    gl.uniform2f(gl.getUniformLocation(program, 'u_resolution'), canvas.width, canvas.height);
    gl.uniform1f(gl.getUniformLocation(program, 'u_cellSize'), cellSize);
    gl.uniform1f(gl.getUniformLocation(program, 'u_angle'), angle);

    gl.viewport(0, 0, canvas.width, canvas.height);
    gl.drawArrays(gl.TRIANGLES, 0, 6);

    return canvas.toDataURL('image/png');
  };

  const processWithCanvas = async (img: HTMLImageElement): Promise<string> => {
    const canvas = document.createElement('canvas');
    canvas.width = img.width;
    canvas.height = img.height;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Canvas not supported');

    ctx.drawImage(img, 0, 0);
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const data = imageData.data;

    for (let y = 0; y < canvas.height; y++) {
      for (let x = 0; x < canvas.width; x++) {
        const i = (y * canvas.width + x) * 4;
        const brightness = (data[i] * 0.299 + data[i + 1] * 0.587 + data[i + 2] * 0.114) / 255;

        let result = 0;
        
        if (mode === 'dot') {
          const localX = (x % cellSize) / cellSize - 0.5;
          const localY = (y % cellSize) / cellSize - 0.5;
          
          if (dotShape === 'circle') {
            const dist = Math.sqrt(localX * localX + localY * localY);
            result = dist < brightness * 0.5 ? 255 : 0;
          } else if (dotShape === 'square') {
            const dist = Math.max(Math.abs(localX), Math.abs(localY));
            result = dist < brightness * 0.5 ? 255 : 0;
          } else {
            result = Math.abs(localY) < brightness * 0.5 ? 255 : 0;
          }
        } else if (mode === 'ordered') {
          const bayerMatrix = [
            [0, 8, 2, 10],
            [12, 4, 14, 6],
            [3, 11, 1, 9],
            [15, 7, 13, 5]
          ];
          const threshold = bayerMatrix[y % 4][x % 4] / 16;
          result = brightness > threshold ? 255 : 0;
        } else {
          const noise = (Math.random() - 0.5) * 0.2;
          result = brightness + noise > 0.5 ? 255 : 0;
        }

        data[i] = data[i + 1] = data[i + 2] = result;
      }
    }

    ctx.putImageData(imageData, 0, 0);
    return canvas.toDataURL('image/png');
  };

  const handleApplyEffect = async () => {
    if (!imageUrl) {
      toast.error('No image connected');
      return;
    }

    setProcessing(true);
    
    try {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      
      await new Promise((resolve, reject) => {
        img.onload = resolve;
        img.onerror = reject;
        img.src = imageUrl;
      });

      let resultImage: string;
      
      try {
        resultImage = await processWithWebGL(img);
        console.log('WebGL processing successful');
      } catch (glError) {
        console.warn('WebGL failed, using Canvas fallback:', glError);
        resultImage = await processWithCanvas(img);
      }

      setResult(resultImage);
      toast.success('Halftone effect applied');
    } catch (error) {
      console.error('Error applying halftone:', error);
      toast.error('Failed to apply halftone effect');
    } finally {
      setProcessing(false);
    }
  };

  return (
    <Card className="w-80 p-4">
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <Sparkles size={16} className="text-primary" />
          <span className="text-sm font-medium">Halftone Effect</span>
        </div>

        <div className="space-y-3">
          <div className="space-y-2">
            <Label className="text-xs">Mode</Label>
            <Select value={mode} onValueChange={(v: any) => setMode(v)}>
              <SelectTrigger className="text-xs h-8">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-popover z-50">
                <SelectItem value="dot">Dot Halftone</SelectItem>
                <SelectItem value="ordered">Ordered Dithering</SelectItem>
                <SelectItem value="dithering">Floyd-Steinberg</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {mode === 'dot' && (
            <>
              <div className="space-y-2">
                <Label className="text-xs">Dot Shape</Label>
                <Select value={dotShape} onValueChange={(v: any) => setDotShape(v)}>
                  <SelectTrigger className="text-xs h-8">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-popover z-50">
                    <SelectItem value="circle">Circle</SelectItem>
                    <SelectItem value="square">Square</SelectItem>
                    <SelectItem value="line">Line</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label className="text-xs">Angle: {angle}°</Label>
                <div className="px-2">
                  <Slider value={[angle]} onValueChange={([v]) => setAngle(v)} min={0} max={180} step={1} className="w-full" />
                  <div className="flex justify-between text-xs text-muted-foreground mt-1">
                    <span>0°</span>
                    <span>180°</span>
                  </div>
                </div>
              </div>
            </>
          )}

          <div className="space-y-2">
            <Label className="text-xs">Cell Size: {cellSize}px</Label>
            <div className="px-2">
              <Slider value={[cellSize]} onValueChange={([v]) => setCellSize(v)} min={2} max={32} step={1} className="w-full" />
              <div className="flex justify-between text-xs text-muted-foreground mt-1">
                <span>Fine</span>
                <span>Coarse</span>
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <div className="text-xs text-muted-foreground">
              {imageUrl ? (
                <div className="text-blue-500">✓ Image connected</div>
              ) : (
                <div className="text-muted-foreground">⚠ Connect an image</div>
              )}
              {imageUrl && (
                <img
                  src={imageUrl}
                  alt="Input"
                  className="w-8 aspect-square object-cover rounded border cursor-pointer mt-2"
                  onClick={() => {
                    setPreviewImage(imageUrl);
                    setIsPreviewOpen(true);
                  }}
                />
              )}
            </div>

            <Button 
              onClick={handleApplyEffect} 
              disabled={processing || !imageUrl}
              className="w-full"
              size="sm"
            >
              {processing ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Processing...
                </>
              ) : (
                <>
                  <Sparkles className="mr-2 h-4 w-4" />
                  Apply Halftone
                </>
              )}
            </Button>
          </div>

          {result && (
            <div className="space-y-2">
              <Label className="text-xs">Result</Label>
              <img
                src={result}
                alt="Halftone result"
                className="w-full aspect-square object-cover rounded border cursor-pointer"
                onClick={() => {
                  setPreviewImage(result);
                  setIsPreviewOpen(true);
                }}
              />
            </div>
          )}
        </div>
      </div>

      {/* Input Handle */}
      <Handle
        type="target"
        position={Position.Left}
        id="image"
        className="w-3 h-3 bg-blue-500"
      />

      {/* Output Handle */}
      <Handle
        type="source"
        position={Position.Right}
        id="result"
        className="w-3 h-3 bg-blue-500"
      />

      <ImagePreviewModal
        isOpen={isPreviewOpen}
        onClose={() => setIsPreviewOpen(false)}
        imageUrl={previewImage}
      />
    </Card>
  );
};

export default HalftoneEffectNode;
