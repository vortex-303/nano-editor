import { useCallback } from 'react';
import JSZip from 'jszip';
import { Node, Edge } from '@xyflow/react';
import { NodeData } from '@/types/nodeEditor';

interface ImportResult {
  success: boolean;
  data?: {
    nodes: Node[];
    edges: Edge[];
    nodeData: { [key: string]: NodeData };
    manifest: any;
  };
  error?: string;
}

export const useProjectImport = () => {
  const blobToDataURL = (blob: Blob): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  };

  const restoreAssetReferences = async (
    data: any,
    assetFiles: { [filename: string]: Blob }
  ): Promise<any> => {
    if (typeof data === 'string' && data.startsWith('assets/')) {
      const filename = data.replace('assets/', '');
      if (assetFiles[filename]) {
        return await blobToDataURL(assetFiles[filename]);
      }
      return data;
    }
    
    if (Array.isArray(data)) {
      const results = await Promise.all(
        data.map(item => restoreAssetReferences(item, assetFiles))
      );
      return results;
    }
    
    if (data && typeof data === 'object') {
      const result: any = {};
      for (const [key, value] of Object.entries(data)) {
        result[key] = await restoreAssetReferences(value, assetFiles);
      }
      return result;
    }
    
    return data;
  };

  const validateProjectStructure = (manifest: any, workflow: any): boolean => {
    // Basic validation
    if (!manifest || !workflow) return false;
    if (!manifest.version || !workflow.nodes || !workflow.edges) return false;
    
    // Check required properties
    if (!Array.isArray(workflow.nodes) || !Array.isArray(workflow.edges)) return false;
    
    return true;
  };

  const importProject = useCallback(async (file: File): Promise<ImportResult> => {
    try {
      const zip = new JSZip();
      const zipData = await zip.loadAsync(file);
      
      // Read manifest and workflow
      const manifestFile = zipData.file('manifest.json');
      const workflowFile = zipData.file('workflow.json');
      
      if (!manifestFile || !workflowFile) {
        return { success: false, error: 'Invalid project file: Missing required files' };
      }

      const manifest = JSON.parse(await manifestFile.async('text'));
      const workflow = JSON.parse(await workflowFile.async('text'));

      // Validate structure
      if (!validateProjectStructure(manifest, workflow)) {
        return { success: false, error: 'Invalid project structure' };
      }

      // Load assets
      const assetFiles: { [filename: string]: Blob } = {};
      const assetsFolder = zipData.folder('assets');
      
      if (assetsFolder) {
        const assetPromises: Promise<void>[] = [];
        
        assetsFolder.forEach((relativePath, file) => {
          if (!file.dir) {
            assetPromises.push(
              file.async('blob').then(blob => {
                assetFiles[relativePath] = blob;
              })
            );
          }
        });
        
        await Promise.all(assetPromises);
      }

      // Restore asset references
      console.log('Project Import - Original workflow:', workflow);
      const restoredNodes = await restoreAssetReferences(workflow.nodes, assetFiles);
      const restoredNodeData = await restoreAssetReferences(workflow.nodeData || {}, assetFiles);
      console.log('Project Import - Restored nodes:', restoredNodes);
      console.log('Project Import - Restored node data:', restoredNodeData);

      return {
        success: true,
        data: {
          nodes: restoredNodes,
          edges: workflow.edges,
          nodeData: restoredNodeData,
          manifest
        }
      };
    } catch (error) {
      console.error('Import failed:', error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Import failed' 
      };
    }
  }, []);

  return { importProject };
};