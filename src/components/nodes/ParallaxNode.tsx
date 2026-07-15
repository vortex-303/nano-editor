import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Handle, Position, useReactFlow } from '@xyflow/react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Slider } from '@/components/ui/slider';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2, Clapperboard, Download } from 'lucide-react';
import { NodeData } from '@/types/nodeEditor';
import { useNodeDataContext } from '@/contexts/NodeDataContext';
import { estimateDepth, loadImageElement } from '@/lib/localAi';
import { exportCanvasAnimation, webCodecsAvailable, type ExportFormat } from '@/lib/canvasExport';
import { toast } from 'sonner';

interface ParallaxNodeProps {
  data: NodeData;
  id: string;
}

const VERT = `
attribute vec2 aPos;
varying vec2 vUv;
void main() {
  vUv = aPos * 0.5 + 0.5;
  gl_Position = vec4(aPos, 0.0, 1.0);
}`;

const FRAG = `
precision mediump float;
varying vec2 vUv;
uniform sampler2D uImage;
uniform sampler2D uDepth;
uniform vec2 uOffset;
uniform float uAmp;
void main() {
  vec2 uv = vec2(vUv.x, 1.0 - vUv.y);
  float d = texture2D(uDepth, uv).r - 0.5;
  vec2 shifted = clamp(uv + d * uAmp * uOffset, 0.0, 1.0);
  gl_FragColor = texture2D(uImage, shifted);
}`;

const LOOP_SECONDS = 4;
const EXPORT_FPS = 30;

const VIDEO_SUPPORTED = webCodecsAvailable();

export const ParallaxNode: React.FC<ParallaxNodeProps> = ({ data, id }) => {
  const [amplitude, setAmplitude] = useState([0.04]);
  const [format, setFormat] = useState<ExportFormat>(VIDEO_SUPPORTED ? 'mp4' : 'gif');
  const [depthUrl, setDepthUrl] = useState<string>('');
  const [preparing, setPreparing] = useState(false);
  const [recording, setRecording] = useState(false);
  const [progress, setProgress] = useState('');
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const glStateRef = useRef<{ gl: WebGLRenderingContext; offsetLoc: WebGLUniformLocation | null; ampLoc: WebGLUniformLocation | null } | null>(null);
  const renderFnRef = useRef<((tSec: number) => void) | null>(null);
  const rafRef = useRef<number>(0);
  const ampRef = useRef(0.04);
  const { getConnectedNodeData, updateNodeData } = useNodeDataContext();
  const { getEdges } = useReactFlow();

  const edges = getEdges();
  const connectedImage = getConnectedNodeData(id, edges, 'image');
  const imageUrl = Array.isArray(connectedImage) ? connectedImage[0] : connectedImage;
  const connectedDepth = getConnectedNodeData(id, edges, 'image-depth');
  const externalDepth = Array.isArray(connectedDepth) ? connectedDepth[0] : connectedDepth;

  useEffect(() => {
    updateNodeData(id, { processing: preparing || recording });
  }, [preparing, recording, id, updateNodeData]);

  useEffect(() => {
    ampRef.current = amplitude[0];
  }, [amplitude]);

  // Reset when inputs change
  useEffect(() => {
    setDepthUrl(externalDepth || '');
  }, [imageUrl, externalDepth]);

  const setupScene = useCallback(async (image: HTMLImageElement, depth: HTMLImageElement) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const maxDim = 768;
    let width = image.naturalWidth;
    let height = image.naturalHeight;
    if (width > maxDim || height > maxDim) {
      const scaleFactor = Math.min(maxDim / width, maxDim / height);
      width = Math.round(width * scaleFactor);
      height = Math.round(height * scaleFactor);
    }
    canvas.width = width;
    canvas.height = height;

    const gl = canvas.getContext('webgl', { preserveDrawingBuffer: true });
    if (!gl) throw new Error('WebGL not available');

    const compile = (type: number, src: string) => {
      const shader = gl.createShader(type)!;
      gl.shaderSource(shader, src);
      gl.compileShader(shader);
      if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
        throw new Error(gl.getShaderInfoLog(shader) || 'Shader compile failed');
      }
      return shader;
    };

    const program = gl.createProgram()!;
    gl.attachShader(program, compile(gl.VERTEX_SHADER, VERT));
    gl.attachShader(program, compile(gl.FRAGMENT_SHADER, FRAG));
    gl.linkProgram(program);
    gl.useProgram(program);

    const quad = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, quad);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);
    const posLoc = gl.getAttribLocation(program, 'aPos');
    gl.enableVertexAttribArray(posLoc);
    gl.vertexAttribPointer(posLoc, 2, gl.FLOAT, false, 0, 0);

    const bindTexture = (unit: number, source: HTMLImageElement) => {
      const tex = gl.createTexture();
      gl.activeTexture(gl.TEXTURE0 + unit);
      gl.bindTexture(gl.TEXTURE_2D, tex);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, source);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    };

    bindTexture(0, image);
    bindTexture(1, depth);
    gl.uniform1i(gl.getUniformLocation(program, 'uImage'), 0);
    gl.uniform1i(gl.getUniformLocation(program, 'uDepth'), 1);
    gl.viewport(0, 0, width, height);

    glStateRef.current = {
      gl,
      offsetLoc: gl.getUniformLocation(program, 'uOffset'),
      ampLoc: gl.getUniformLocation(program, 'uAmp'),
    };

    // Deterministic frame renderer — shared by the live preview and exports
    const renderAtTime = (tSec: number) => {
      const state = glStateRef.current;
      if (!state) return;
      const t = (tSec / LOOP_SECONDS) * Math.PI * 2;
      state.gl.uniform2f(state.offsetLoc, Math.cos(t), Math.sin(t) * 0.5);
      state.gl.uniform1f(state.ampLoc, ampRef.current);
      state.gl.drawArrays(state.gl.TRIANGLE_STRIP, 0, 4);
    };
    renderFnRef.current = renderAtTime;

    const animate = (time: number) => {
      if (!glStateRef.current) return;
      renderAtTime((time / 1000) % LOOP_SECONDS);
      rafRef.current = requestAnimationFrame(animate);
    };
    rafRef.current = requestAnimationFrame(animate);
  }, []);

  const handleStart = async () => {
    if (!imageUrl) {
      toast.error('Connect an image first');
      return;
    }
    setPreparing(true);
    try {
      let depth = depthUrl || externalDepth;
      if (!depth) {
        depth = await estimateDepth(imageUrl, setProgress);
        setDepthUrl(depth);
      }
      const [imageEl, depthEl] = await Promise.all([loadImageElement(imageUrl), loadImageElement(depth)]);
      cancelAnimationFrame(rafRef.current);
      await setupScene(imageEl, depthEl);
      toast.success('Parallax preview running');
    } catch (error) {
      console.error('Parallax setup failed:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to start parallax');
    } finally {
      setPreparing(false);
      setProgress('');
    }
  };

  const handleExport = async () => {
    const canvas = canvasRef.current;
    const renderFrame = renderFnRef.current;
    if (!canvas || !renderFrame) {
      toast.error('Start the preview first');
      return;
    }
    setRecording(true);
    // Pause the live preview so export frames render deterministically
    cancelAnimationFrame(rafRef.current);
    try {
      const blob = await exportCanvasAnimation({
        canvas,
        renderFrame,
        durationSec: LOOP_SECONDS,
        fps: format === 'gif' ? 15 : EXPORT_FPS,
        format,
        onProgress: setProgress,
      });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `parallax-${Date.now()}.${format}`;
      link.click();
      URL.revokeObjectURL(url);
      toast.success(`Parallax exported (${format.toUpperCase()}, frame-exact)`);
    } catch (error) {
      console.error('Export failed:', error);
      toast.error(error instanceof Error ? error.message : 'Export failed');
    } finally {
      setRecording(false);
      setProgress('');
      // Resume the live preview
      const animate = (time: number) => {
        if (!glStateRef.current || !renderFnRef.current) return;
        renderFnRef.current((time / 1000) % LOOP_SECONDS);
        rafRef.current = requestAnimationFrame(animate);
      };
      rafRef.current = requestAnimationFrame(animate);
    }
  };

  // Cleanup on unmount
  useEffect(() => () => cancelAnimationFrame(rafRef.current), []);

  return (
    <Card className="w-80 p-4">
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Clapperboard size={16} className="text-primary" />
            <span className="text-sm font-medium">Depth Parallax</span>
          </div>
          <Badge variant="secondary" className="text-[10px]">Local · Free</Badge>
        </div>

        {!imageUrl && (
          <p className="text-xs text-muted-foreground">
            Connect an image (and optionally a Depth Map node) to create a 2.5D parallax animation. Depth is computed automatically if not connected.
          </p>
        )}

        <canvas
          ref={canvasRef}
          className="w-full rounded border nodrag"
          style={{ display: glStateRef.current || preparing ? 'block' : 'none' }}
        />

        {imageUrl && !glStateRef.current && !preparing && (
          <img src={imageUrl} alt="Input" className="w-full h-28 object-cover rounded border" />
        )}

        <div className="space-y-1">
          <Label className="text-xs">Parallax strength: {(amplitude[0] * 100).toFixed(0)}</Label>
          <Slider
            value={amplitude}
            onValueChange={setAmplitude}
            min={0.01}
            max={0.09}
            step={0.005}
            className="nodrag"
          />
        </div>

        <div className="space-y-1">
          <Label className="text-xs">Export format</Label>
          <Select value={format} onValueChange={(v) => setFormat(v as ExportFormat)}>
            <SelectTrigger className="h-7 text-xs nodrag">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="mp4" disabled={!VIDEO_SUPPORTED}>
                MP4 (H.264){!VIDEO_SUPPORTED ? ' — needs WebCodecs' : ''}
              </SelectItem>
              <SelectItem value="webm" disabled={!VIDEO_SUPPORTED}>
                WebM (VP9){!VIDEO_SUPPORTED ? ' — needs WebCodecs' : ''}
              </SelectItem>
              <SelectItem value="gif">GIF (animated, 480p)</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            className="flex-1 h-7 text-xs"
            onClick={handleStart}
            disabled={!imageUrl || preparing || recording}
          >
            {preparing ? (
              <>
                <Loader2 className="w-3 h-3 mr-1 animate-spin" />
                {progress || 'Preparing...'}
              </>
            ) : (
              glStateRef.current ? 'Restart Preview' : 'Start Preview'
            )}
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="flex-1 h-7 text-xs"
            onClick={handleExport}
            disabled={!glStateRef.current || preparing || recording}
          >
            {recording ? (
              <>
                <Loader2 className="w-3 h-3 mr-1 animate-spin" /> Recording...
              </>
            ) : (
              <>
                <Download className="w-3 h-3 mr-1" /> Export {format.toUpperCase()}
              </>
            )}
          </Button>
        </div>
      </div>

      <Handle
        type="target"
        position={Position.Left}
        id="image"
        style={{ top: '35%' }}
        className="w-3 h-3 bg-blue-500"
      />
      <Handle
        type="target"
        position={Position.Left}
        id="image-depth"
        style={{ top: '65%' }}
        className="w-3 h-3 bg-blue-500"
      />
    </Card>
  );
};
