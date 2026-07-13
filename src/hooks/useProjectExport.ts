import { useCallback } from 'react';
import JSZip from 'jszip';
import { Node, Edge } from '@xyflow/react';
import { NodeData } from '@/types/nodeEditor';

interface ProjectExportOptions {
  projectName?: string;
}

interface AssetMapping {
  [originalRef: string]: string;
}

export const useProjectExport = () => {
  const dataURLToBlob = (dataURL: string): Blob => {
    const arr = dataURL.split(',');
    const mime = arr[0].match(/:(.*?);/)?.[1] || 'image/png';
    const bstr = atob(arr[1]);
    let n = bstr.length;
    const u8arr = new Uint8Array(n);
    while (n--) {
      u8arr[n] = bstr.charCodeAt(n);
    }
    return new Blob([u8arr], { type: mime });
  };

  const extractAssetsFromNodes = (nodes: Node[], nodeData: { [key: string]: NodeData }) => {
    const assets: AssetMapping = {};
    const assetFiles: { [filename: string]: Blob } = {};
    let assetCounter = 1;

    // Extract images from node data and direct node data
    nodes.forEach(node => {
      const data = nodeData[node.id] || node.data || {};
      
      // Check for various image properties including all possible image fields
      const imageProperties = [
        'image', 'result', 'styleImage', 'contentImage', 
        'imageUrl', 'processedImage', 'originalImage', 'outputImage'
      ];
      
      // Also check for any property that contains image data
      const allProps = Object.keys(data);
      allProps.forEach(prop => {
        const imageData = data[prop];
        if (imageData && typeof imageData === 'string' && imageData.startsWith('data:image/')) {
          const extension = imageData.includes('data:image/png') ? 'png' : 
                          imageData.includes('data:image/jpeg') ? 'jpg' : 
                          imageData.includes('data:image/webp') ? 'webp' : 'png';
          const filename = `asset-${assetCounter}.${extension}`;
          
          if (!assets[imageData]) { // Avoid duplicates
            assets[imageData] = filename;
            assetFiles[filename] = dataURLToBlob(imageData);
            assetCounter++;
          }
        }
      });
    });

    // Also check nodeData separately for any orphaned image data
    Object.values(nodeData).forEach(data => {
      if (data && typeof data === 'object') {
        Object.values(data).forEach(value => {
          if (value && typeof value === 'string' && value.startsWith('data:image/')) {
            const extension = value.includes('data:image/png') ? 'png' : 
                            value.includes('data:image/jpeg') ? 'jpg' : 
                            value.includes('data:image/webp') ? 'webp' : 'png';
            const filename = `asset-${assetCounter}.${extension}`;
            
            if (!assets[value]) { // Avoid duplicates
              assets[value] = filename;
              assetFiles[filename] = dataURLToBlob(value);
              assetCounter++;
            }
          }
        });
      }
    });

    return { assets, assetFiles };
  };

  const replaceAssetReferences = (data: any, assets: AssetMapping): any => {
    if (typeof data === 'string' && assets[data]) {
      return `assets/${assets[data]}`;
    }
    
    if (Array.isArray(data)) {
      return data.map(item => replaceAssetReferences(item, assets));
    }
    
    if (data && typeof data === 'object') {
      const result: any = {};
      for (const [key, value] of Object.entries(data)) {
        result[key] = replaceAssetReferences(value, assets);
      }
      return result;
    }
    
    return data;
  };

  const exportProject = useCallback(async (
    nodes: Node[],
    edges: Edge[],
    nodeData: { [key: string]: NodeData },
    options: ProjectExportOptions = {}
  ) => {
    try {
      console.log('Export - Starting export process');
      console.log('Export - Input nodes:', nodes.length, nodes);
      console.log('Export - Input nodeData:', Object.keys(nodeData).length, nodeData);
      
      if (nodes.length === 0) {
        throw new Error('No nodes to export');
      }
      
      const zip = new JSZip();
      const { assets, assetFiles } = extractAssetsFromNodes(nodes, nodeData);
      
      console.log('Export - Extracted assets:', Object.keys(assets).length, assets);
      console.log('Export - Asset files:', Object.keys(assetFiles).length, Object.keys(assetFiles));
      
      // Create assets folder only if there are assets
      if (Object.keys(assetFiles).length > 0) {
        const assetsFolder = zip.folder('assets');
        if (assetsFolder) {
          Object.entries(assetFiles).forEach(([filename, blob]) => {
            try {
              assetsFolder.file(filename, blob);
            } catch (error) {
              console.warn(`Failed to add asset ${filename}:`, error);
            }
          });
        }
      }

      // Create manifest
      const manifest = {
        version: '1.0',
        projectName: options.projectName || 'Untitled Workflow',
        createdAt: new Date().toISOString(),
        nodeCount: nodes.length,
        edgeCount: edges.length,
        assetCount: Object.keys(assetFiles).length,
        assets
      };

      // Create workflow data with replaced asset references
      const workflowData = {
        nodes: replaceAssetReferences(nodes, assets),
        edges: edges || [],
        nodeData: replaceAssetReferences(nodeData, assets)
      };

      // Add files to ZIP
      zip.file('manifest.json', JSON.stringify(manifest, null, 2));
      zip.file('workflow.json', JSON.stringify(workflowData, null, 2));

      // Generate ZIP file with compression
      const zipBlob = await zip.generateAsync({ 
        type: 'blob',
        compression: 'DEFLATE',
        compressionOptions: { level: 6 }
      });
      
      // Download the file
      const url = URL.createObjectURL(zipBlob);
      const link = document.createElement('a');
      link.href = url;
      const fileName = `${manifest.projectName.replace(/[^a-z0-9]/gi, '_').toLowerCase()}_workflow.zip`;
      link.download = fileName;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      console.log('Export completed successfully:', fileName);
      return { success: true };
    } catch (error) {
      console.error('Export failed:', error);
      return { success: false, error: error instanceof Error ? error.message : 'Export failed' };
    }
  }, []);

  return { exportProject };
};