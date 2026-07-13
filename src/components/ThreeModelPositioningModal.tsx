import React, { useState, useRef, useCallback, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Camera, RotateCcw, Grid3X3, Palette } from 'lucide-react';
import { Canvas, useThree, useFrame } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import * as THREE from 'three';

interface ThreeModelPositioningModalProps {
  isOpen: boolean;
  onClose: () => void;
  modelUrl: string;
  fileType: string;
  currentColor: string;
  onApply: (capturedImage: string, color: string, cameraPosition: [number, number, number]) => void;
  children: React.ReactNode;
}

interface ModelProps {
  url: string;
  fileType: string;
  color: string;
  onModelReady: (model: THREE.Object3D) => void;
}

interface CameraControllerProps {
  targetPosition: [number, number, number] | null;
  onPositionChange: (position: [number, number, number]) => void;
}

const DEFAULT_MODEL_COLOR = '#b3b3b3'; // Gray from uploaded image (RGB 179, 179, 179)

const CAMERA_PRESETS = [
  { name: 'Front', position: [0, 0, 5] as [number, number, number] },
  { name: 'Back', position: [0, 0, -5] as [number, number, number] },
  { name: 'Left', position: [-5, 0, 0] as [number, number, number] },
  { name: 'Right', position: [5, 0, 0] as [number, number, number] },
  { name: 'Top', position: [0, 5, 0] as [number, number, number] },
  { name: 'Bottom', position: [0, -5, 0] as [number, number, number] },
  { name: 'Isometric', position: [3, 3, 3] as [number, number, number] },
];

function CameraController({ targetPosition, onPositionChange }: CameraControllerProps) {
  const { camera } = useThree();
  const [isTransitioning, setIsTransitioning] = useState(false);
  const startPosition = useRef<THREE.Vector3>(new THREE.Vector3());
  const targetPos = useRef<THREE.Vector3>(new THREE.Vector3());
  const transitionProgress = useRef(0);

  useEffect(() => {
    if (targetPosition) {
      startPosition.current.copy(camera.position);
      targetPos.current.set(...targetPosition);
      transitionProgress.current = 0;
      setIsTransitioning(true);
    }
  }, [targetPosition, camera]);

  useFrame(() => {
    if (isTransitioning) {
      transitionProgress.current += 0.05;
      if (transitionProgress.current >= 1) {
        transitionProgress.current = 1;
        setIsTransitioning(false);
      }
      
      const t = transitionProgress.current;
      // Smooth easing function
      const eased = t * t * (3 - 2 * t);
      
      camera.position.lerpVectors(startPosition.current, targetPos.current, eased);
      camera.lookAt(0, 0, 0);
      
      onPositionChange([camera.position.x, camera.position.y, camera.position.z]);
    }
  });

  return null;
}

function Model({ url, fileType, color, onModelReady }: ModelProps) {
  const [model, setModel] = useState<THREE.Object3D | null>(null);
  const [error, setError] = useState<string>('');

  useEffect(() => {
    if (!url) return;

    const loadModel = async () => {
      try {
        setError('');
        setModel(null);
        
        if (fileType === 'stl') {
          const { STLLoader } = await import('three/addons/loaders/STLLoader.js');
          const loader = new STLLoader();
          loader.load(
            url,
            (geometry) => {
              const material = new THREE.MeshPhongMaterial({ color });
              const mesh = new THREE.Mesh(geometry, material);
              
              // Better centering and scaling
              geometry.computeBoundingBox();
              const box = geometry.boundingBox!;
              const center = box.getCenter(new THREE.Vector3());
              const size = box.getSize(new THREE.Vector3());
              
              // Center the geometry at origin
              geometry.translate(-center.x, -center.y, -center.z);
              geometry.computeBoundingBox(); // Recompute after translation
              
              // Scale to fit nicely in viewport
              const maxSize = Math.max(size.x, size.y, size.z);
              const scale = 2.0 / maxSize;
              mesh.scale.setScalar(scale);
              
              // Ensure mesh is positioned at origin
              mesh.position.set(0, 0, 0);
              
              setModel(mesh);
              onModelReady(mesh);
            },
            undefined,
            (err) => {
              console.error('STL loading error:', err);
              setError('Failed to load STL file');
            }
          );
        } else if (fileType === 'obj') {
          const { OBJLoader } = await import('three/addons/loaders/OBJLoader.js');
          const loader = new OBJLoader();
          loader.load(
            url,
            (object) => {
              object.traverse((child) => {
                if (child instanceof THREE.Mesh) {
                  child.material = new THREE.MeshPhongMaterial({ color });
                }
              });
              
              const box = new THREE.Box3().setFromObject(object);
              const center = box.getCenter(new THREE.Vector3());
              const size = box.getSize(new THREE.Vector3());
              const maxSize = Math.max(size.x, size.y, size.z);
              const scale = 2.0 / maxSize;
              
              // Move to origin and scale
              object.position.copy(center.negate());
              object.scale.setScalar(scale);
              
              // Ensure final position is at origin
              object.position.set(0, 0, 0);
              
              setModel(object);
              onModelReady(object);
            },
            undefined,
            (err) => {
              console.error('OBJ loading error:', err);
              setError('Failed to load OBJ file');
            }
          );
        } else {
          const geometry = new THREE.BoxGeometry(1, 1, 1);
          const material = new THREE.MeshPhongMaterial({ color });
          const mesh = new THREE.Mesh(geometry, material);
          setModel(mesh);
          onModelReady(mesh);
        }
      } catch (err) {
        setError('Failed to load model');
        console.error('Model loading error:', err);
      }
    };

    loadModel();
  }, [url, fileType, color, onModelReady]);

  // Update color when it changes
  useEffect(() => {
    if (model) {
      model.traverse((child) => {
        if (child instanceof THREE.Mesh) {
          if (child.material instanceof THREE.MeshPhongMaterial) {
            child.material.color.setHex(parseInt(color.replace('#', '0x')));
          }
        }
      });
    }
  }, [model, color]);

  if (error) {
    return (
      <mesh>
        <boxGeometry args={[1, 1, 1]} />
        <meshBasicMaterial color="red" />
      </mesh>
    );
  }

  if (!model) {
    return (
      <mesh>
        <boxGeometry args={[0.5, 0.5, 0.5]} />
        <meshBasicMaterial color="gray" />
      </mesh>
    );
  }

  return <primitive object={model} />;
}

export const ThreeModelPositioningModal: React.FC<ThreeModelPositioningModalProps> = ({
  isOpen,
  onClose,
  modelUrl,
  fileType,
  currentColor,
  onApply,
  children
}) => {
  const [selectedColor, setSelectedColor] = useState(currentColor || DEFAULT_MODEL_COLOR);
  const [customColor, setCustomColor] = useState(currentColor || DEFAULT_MODEL_COLOR);
  const [showGrid, setShowGrid] = useState(true);
  const [currentCameraPosition, setCurrentCameraPosition] = useState<[number, number, number]>([0, 0, 5]);
  const [targetCameraPosition, setTargetCameraPosition] = useState<[number, number, number] | null>(null);
  const [captureResolution, setCaptureResolution] = useState('1024');
  const [model, setModel] = useState<THREE.Object3D | null>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const handlePresetView = useCallback((position: [number, number, number]) => {
    setTargetCameraPosition(position);
  }, []);

  const handleColorChange = useCallback((color: string) => {
    setSelectedColor(color);
    setCustomColor(color);
  }, []);

  const captureFrame = useCallback(() => {
    const canvas = canvasRef.current;
    console.log('ThreeModelPositioningModal - Canvas ref:', canvas);
    
    if (!canvas) {
      console.error('ThreeModelPositioningModal - Canvas ref is null');
      return;
    }

    // Add additional checks for canvas properties
    if (!canvas.width || !canvas.height) {
      console.error('ThreeModelPositioningModal - Canvas dimensions invalid:', { width: canvas.width, height: canvas.height });
      return;
    }

    try {
      const resolution = parseInt(captureResolution);
      console.log('ThreeModelPositioningModal - Capture resolution:', resolution);
      
      // Create a temporary canvas with white background
      const tempCanvas = document.createElement('canvas');
      tempCanvas.width = resolution;
      tempCanvas.height = resolution;
      const ctx = tempCanvas.getContext('2d');
      
      if (ctx) {
        // Fill with white background
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, resolution, resolution);
        
        // Draw the 3D canvas on top
        ctx.drawImage(canvas, 0, 0, resolution, resolution);
        
        // Ensure high quality PNG output with proper MIME type
        const dataURL = tempCanvas.toDataURL('image/png', 1.0);
        console.log('ThreeModelPositioningModal - Captured frame data URL format:', dataURL.substring(0, 50));
        onApply(dataURL, selectedColor, currentCameraPosition);
        onClose();
      } else {
        console.error('ThreeModelPositioningModal - Failed to get 2D context');
      }
    } catch (error) {
      console.error('ThreeModelPositioningModal - Failed to capture frame:', error);
    }
  }, [captureResolution, onApply, selectedColor, currentCameraPosition, onClose]);

  const handleReset = useCallback(() => {
    setTargetCameraPosition([0, 0, 5]);
    setSelectedColor(currentColor || DEFAULT_MODEL_COLOR);
    setCustomColor(currentColor || DEFAULT_MODEL_COLOR);
  }, [currentColor]);

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-6xl max-h-[85vh] bg-background border-border">
        <DialogHeader>
          <DialogTitle className="text-foreground">Position 3D Model</DialogTitle>
        </DialogHeader>
        
        <div className="flex gap-6 h-[70vh] overflow-hidden">
          {/* 3D Viewer */}
          <div className="flex-1 bg-card rounded-lg border border-border p-4">
            <div className="w-full h-full bg-white rounded-lg overflow-hidden">
              <Canvas
                ref={canvasRef}
                camera={{ position: [0, 0, 5], fov: 50 }}
                gl={{ 
                  preserveDrawingBuffer: true,
                  alpha: false
                }}
                onCreated={(state) => {
                  console.log('ThreeModelPositioningModal - Canvas created:', {
                    canvas: state.gl.domElement,
                    width: state.gl.domElement.width,
                    height: state.gl.domElement.height
                  });
                }}
                style={{ width: '100%', height: '100%' }}
              >
                <color attach="background" args={['#ffffff']} />
                
                {/* Professional 3-point lighting */}
                <ambientLight intensity={0.4} />
                <directionalLight position={[10, 10, 5]} intensity={0.8} />
                <directionalLight position={[-10, -10, -5]} intensity={0.3} />
                <pointLight position={[0, 10, 0]} intensity={0.5} />
                
                {/* Grid */}
                {showGrid && (
                  <gridHelper args={[10, 20, '#cccccc', '#cccccc']} />
                )}
                
                <Model 
                  url={modelUrl} 
                  fileType={fileType} 
                  color={selectedColor}
                  onModelReady={setModel}
                />
                
                <CameraController 
                  targetPosition={targetCameraPosition}
                  onPositionChange={setCurrentCameraPosition}
                />
                
                <OrbitControls 
                  enableDamping
                  dampingFactor={0.05}
                  maxDistance={20}
                  minDistance={1}
                />
              </Canvas>
            </div>
          </div>
          
          {/* Controls */}
          <div className="w-80 bg-card rounded-lg border border-border p-4 space-y-6 overflow-y-auto">
            {/* Camera Presets */}
            <div>
              <h3 className="text-sm font-medium mb-3 text-foreground">Camera Views</h3>
              <div className="grid grid-cols-3 gap-1">
                {CAMERA_PRESETS.map((preset) => (
                  <Button
                    key={preset.name}
                    variant="outline"
                    size="sm"
                    onClick={() => handlePresetView(preset.position)}
                    className="text-xs h-7"
                  >
                    {preset.name}
                  </Button>
                ))}
              </div>
            </div>
            
            {/* Model Color */}
            <div>
              <h3 className="text-sm font-medium mb-3 text-foreground">Model Color</h3>
              <div className="flex gap-2">
                <input
                  type="color"
                  value={customColor}
                  onChange={(e) => handleColorChange(e.target.value)}
                  className="w-8 h-8 rounded border"
                />
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleColorChange(customColor)}
                  className="flex-1 text-xs"
                >
                  <Palette className="w-3 h-3 mr-1" />
                  Custom Color
                </Button>
              </div>
            </div>
            
            {/* View Options */}
            <div>
              <h3 className="text-sm font-medium mb-3 text-foreground">View Options</h3>
              <div className="flex gap-2">
                <Button
                  variant={showGrid ? "default" : "outline"}
                  size="sm"
                  onClick={() => setShowGrid(!showGrid)}
                  className="flex-1 text-xs"
                >
                  <Grid3X3 className="w-3 h-3 mr-1" />
                  {showGrid ? 'Hide Grid' : 'Show Grid'}
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleReset}
                  className="flex-1 text-xs"
                >
                  <RotateCcw className="w-3 h-3 mr-1" />
                  Reset
                </Button>
              </div>
            </div>
            
            {/* Capture Settings */}
            <div>
              <h3 className="text-sm font-medium mb-3 text-foreground">Capture Frame</h3>
              <div className="space-y-3">
                <div>
                  <label className="text-xs text-muted-foreground">Resolution</label>
                  <Select value={captureResolution} onValueChange={setCaptureResolution}>
                    <SelectTrigger className="h-8">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="512">512x512</SelectItem>
                      <SelectItem value="1024">1024x1024</SelectItem>
                      <SelectItem value="2048">2048x2048</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <Button
                  onClick={captureFrame}
                  className="w-full"
                >
                  <Camera className="w-4 h-4 mr-2" />
                  Capture & Apply
                </Button>
              </div>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};