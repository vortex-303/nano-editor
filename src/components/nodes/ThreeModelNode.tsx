import React, { useState, useRef, useCallback, useEffect, startTransition } from 'react';
import { Handle, Position } from '@xyflow/react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Upload, Camera, RotateCcw, Play, Pause, Settings } from 'lucide-react';
import { Canvas, useLoader } from '@react-three/fiber';
import { OrbitControls, Center } from '@react-three/drei';
import { useNodeDataContext } from '@/contexts/NodeDataContext';
import { NodeData } from '@/types/nodeEditor';
import { ThreeModelPositioningModal } from '@/components/ThreeModelPositioningModal';
import { ImagePreviewModal } from '../ImagePreviewModal';
import * as THREE from 'three';
import { STLLoader } from 'three/addons/loaders/STLLoader.js';
import { OBJLoader } from 'three/addons/loaders/OBJLoader.js';

interface ThreeModelNodeProps {
  data: NodeData;
  id: string;
}

interface ModelProps {
  url: string;
  fileType: string;
  color?: string;
}

function Model({ url, fileType, color = '#888888' }: ModelProps) {
  const [model, setModel] = useState<THREE.Object3D | null>(null);
  const [error, setError] = useState<string>('');

  useEffect(() => {
    if (!url) return;

    const loadModel = async () => {
      try {
        setError('');
        setModel(null);
        
        if (fileType === 'stl') {
          const loader = new STLLoader();
          loader.load(
            url,
            (geometry) => {
              const material = new THREE.MeshPhongMaterial({ color });
              const mesh = new THREE.Mesh(geometry, material);
              
              // Center and scale the geometry properly
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
            },
            undefined,
            (err) => {
              console.error('STL loading error:', err);
              setError('Failed to load STL file');
            }
          );
        } else if (fileType === 'obj') {
          const loader = new OBJLoader();
          loader.load(
            url,
            (object) => {
              // Apply material and center the object
              object.traverse((child) => {
                if (child instanceof THREE.Mesh) {
                  child.material = new THREE.MeshPhongMaterial({ color });
                }
              });
              
              // Center and scale the object properly
              const box = new THREE.Box3().setFromObject(object);
              const center = box.getCenter(new THREE.Vector3());
              const size = box.getSize(new THREE.Vector3());
              const maxSize = Math.max(size.x, size.y, size.z);
              const scale = 2.0 / maxSize;
              
              // Apply transformations to center and scale properly
              object.scale.setScalar(scale);
              object.position.copy(center.multiplyScalar(-scale));
              
              setModel(object);
            },
            undefined,
            (err) => {
              console.error('OBJ loading error:', err);
              setError('Failed to load OBJ file');
            }
          );
        } else {
          // For GLB/GLTF and other formats, show placeholder for now
          const geometry = new THREE.BoxGeometry(1, 1, 1);
          const material = new THREE.MeshPhongMaterial({ color });
          const mesh = new THREE.Mesh(geometry, material);
          setModel(mesh);
        }
      } catch (err) {
        setError('Failed to load model');
        console.error('Model loading error:', err);
      }
    };

    loadModel();
  }, [url, fileType]);

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

export const ThreeModelNode: React.FC<ThreeModelNodeProps> = ({ data, id }) => {
  const [modelFile, setModelFile] = useState<File | null>(null);
  const [modelUrl, setModelUrl] = useState<string>(data.modelUrl || '');
  const [fileType, setFileType] = useState<string>(data.fileType || '');
  const [capturedImage, setCapturedImage] = useState<string>(data.image || '');
  const [modelColor, setModelColor] = useState<string>(data.modelColor || '#888888');
  const [autoRotate, setAutoRotate] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const { updateNodeData, getNodeData } = useNodeDataContext();

  // Sync with node data context
  useEffect(() => {
    const contextData = getNodeData(id);
    if (contextData.modelUrl && contextData.modelUrl !== modelUrl) {
      setModelUrl(contextData.modelUrl);
    }
    if (contextData.fileType && contextData.fileType !== fileType) {
      setFileType(contextData.fileType);
    }
    if (contextData.image && contextData.image !== capturedImage) {
      setCapturedImage(contextData.image);
    }
    if (contextData.modelColor && contextData.modelColor !== modelColor) {
      setModelColor(contextData.modelColor);
    }
  }, [id]);

  // Update node data when values change
  useEffect(() => {
    updateNodeData(id, { 
      modelUrl, 
      fileType, 
      image: capturedImage,
      modelColor
    });
  }, [modelUrl, fileType, capturedImage, modelColor, id]);

  const handleFileUpload = useCallback((file: File) => {
    startTransition(() => {
      const extension = file.name.split('.').pop()?.toLowerCase();
      const supportedFormats = ['obj', 'stl', 'glb', 'gltf'];
      
      if (!extension || !supportedFormats.includes(extension)) {
        alert('Please upload a valid 3D model file (OBJ, STL, GLB, GLTF)');
        return;
      }

      setIsLoading(true);
      const url = URL.createObjectURL(file);
      setModelFile(file);
      setModelUrl(url);
      setFileType(extension);
      setIsLoading(false);
    });
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    const files = Array.from(e.dataTransfer.files);
    if (files.length > 0) {
      handleFileUpload(files[0]);
    }
  }, [handleFileUpload]);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
  }, []);

  const captureFrame = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    try {
      // Create a temporary canvas with white background
      const tempCanvas = document.createElement('canvas');
      tempCanvas.width = canvas.width;
      tempCanvas.height = canvas.height;
      const ctx = tempCanvas.getContext('2d');
      
      if (ctx) {
        // Fill with white background
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, tempCanvas.width, tempCanvas.height);
        
        // Draw the 3D canvas on top
        ctx.drawImage(canvas, 0, 0);
        
        // Ensure high quality PNG output with proper MIME type
        const dataURL = tempCanvas.toDataURL('image/png', 1.0);
        console.log('ThreeModelNode - Captured frame data URL format:', dataURL.substring(0, 50));
        setCapturedImage(dataURL);
      }
    } catch (error) {
      console.error('Failed to capture frame:', error);
    }
  }, []);

  const handleModalApply = useCallback((capturedImage: string, color: string, cameraPosition: [number, number, number]) => {
    setCapturedImage(capturedImage);
    setModelColor(color);
    setIsModalOpen(false);
  }, []);

  const getFileTypeColor = (type: string) => {
    switch (type) {
      case 'glb':
      case 'gltf':
        return 'bg-green-500';
      case 'obj':
        return 'bg-blue-500';
      case 'stl':
        return 'bg-purple-500';
      default:
        return 'bg-gray-500';
    }
  };

  return (
    <Card className="w-80">
      <CardContent className="p-4">
        <div className="flex items-center justify-between mb-3">
          <span className="text-sm font-medium">3D Model</span>
          {fileType && (
            <Badge className={`text-white ${getFileTypeColor(fileType)}`}>
              {fileType.toUpperCase()}
            </Badge>
          )}
        </div>

        {/* File Upload Area */}
        {!modelUrl && (
          <div
            className="border-2 border-dashed border-border rounded-lg p-6 text-center mb-4 hover:border-primary/50 transition-colors"
            onDrop={handleDrop}
            onDragOver={handleDragOver}
          >
            <Upload className="w-8 h-8 mx-auto mb-2 text-muted-foreground" />
            <p className="text-sm text-muted-foreground mb-2">
              Drop 3D model file here
            </p>
            <p className="text-xs text-muted-foreground">
              Supports OBJ, STL, GLB, GLTF
            </p>
            <input
              type="file"
              accept=".obj,.stl,.glb,.gltf"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) handleFileUpload(file);
              }}
              className="hidden"
              id={`file-${id}`}
            />
            <Button
              variant="outline"
              size="sm"
              className="mt-2"
              onClick={() => document.getElementById(`file-${id}`)?.click()}
            >
              Browse Files
            </Button>
          </div>
        )}

        {/* 3D Viewer */}
        {modelUrl && (
          <div className="mb-4">
            <div className="w-full h-48 bg-white border rounded-lg overflow-hidden">
              <Canvas
                ref={canvasRef}
                camera={{ position: [0, 0, 5], fov: 50 }}
                gl={{ 
                  preserveDrawingBuffer: true,
                  alpha: false
                }}
              >
                <color attach="background" args={['#ffffff']} />
                <ambientLight intensity={0.4} />
                <directionalLight position={[10, 10, 5]} intensity={0.8} />
                <directionalLight position={[-10, -10, -5]} intensity={0.3} />
                <pointLight position={[0, 10, 0]} intensity={0.5} />
                <Model url={modelUrl} fileType={fileType} color={modelColor} />
                <OrbitControls 
                  autoRotate={autoRotate}
                  autoRotateSpeed={2}
                  enableDamping
                  dampingFactor={0.05}
                />
              </Canvas>
            </div>

            {/* Controls */}
            <div className="flex gap-2 mt-3">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setAutoRotate(!autoRotate)}
              >
                {autoRotate ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={captureFrame}
              >
                <Camera className="w-4 h-4" />
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsModalOpen(true)}
              >
                <Settings className="w-4 h-4" />
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setModelUrl('');
                  setFileType('');
                  setCapturedImage('');
                  setModelFile(null);
                  setModelColor('#888888');
                }}
              >
                <RotateCcw className="w-4 h-4" />
              </Button>
            </div>
          </div>
        )}

        {/* Captured Image Preview */}
        {capturedImage && (
          <div className="mb-3">
            <p className="text-xs text-muted-foreground mb-2">Captured Frame:</p>
            <img
              src={capturedImage}
              alt="Captured frame"
              className="w-full h-24 object-cover rounded border cursor-pointer"
              onClick={() => setIsPreviewOpen(true)}
            />
          </div>
        )}

        {isLoading && (
          <div className="text-center py-4">
            <p className="text-sm text-muted-foreground">Loading model...</p>
          </div>
        )}

        <ThreeModelPositioningModal
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          modelUrl={modelUrl}
          fileType={fileType}
          currentColor={modelColor}
          onApply={handleModalApply}
        >
          {null}
        </ThreeModelPositioningModal>

        <ImagePreviewModal
          isOpen={isPreviewOpen}
          onClose={() => setIsPreviewOpen(false)}
          imageUrl={capturedImage}
        />

        <Handle
          type="source"
          position={Position.Right}
          id="image"
          className="w-3 h-3 bg-green-500"
        />
      </CardContent>
    </Card>
  );
};