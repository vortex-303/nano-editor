import { Node, Edge } from '@xyflow/react';
import { NodeData } from '@/types/nodeEditor';
import { projectStore, putRecord, getRecord, deleteRecord, listRecords, newId } from '@/lib/localDb';

export interface CloudProject {
  id: string;
  name: string;
  description?: string;
  projectData: {
    nodes: Node[];
    edges: Edge[];
    nodeData: { [key: string]: NodeData };
  };
  thumbnail?: string;
  /** Plugin node types used by this project (informational, for install prompts) */
  requiredPlugins?: string[];
  createdAt: string;
  updatedAt: string;
}

export interface CreateProjectData {
  name: string;
  description?: string;
  nodes: Node[];
  edges: Edge[];
  nodeData: { [key: string]: NodeData };
  thumbnail?: string;
}

export class ProjectService {
  static async saveProject(projectData: CreateProjectData): Promise<{ success: boolean; error?: string; project?: CloudProject }> {
    try {
      // Process node data to convert blob URLs to data URLs for storage
      const processedNodeData = await this.convertBlobUrlsToDataUrls(projectData.nodeData);

      const now = new Date().toISOString();
      const requiredPlugins = [...new Set(
        projectData.nodes
          .map((n) => n.type)
          .filter((t): t is string => !!t && t.startsWith('plugin.'))
          .map((t) => t.replace(/^plugin\./, ''))
      )];
      const project: CloudProject = {
        id: newId(),
        name: projectData.name,
        description: projectData.description,
        projectData: {
          nodes: projectData.nodes,
          edges: projectData.edges,
          nodeData: processedNodeData
        },
        thumbnail: projectData.thumbnail,
        ...(requiredPlugins.length ? { requiredPlugins } : {}),
        createdAt: now,
        updatedAt: now
      };

      await putRecord(projectStore, project.id, project);

      return { success: true, project };
    } catch (error) {
      console.error('Error saving project:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to save project'
      };
    }
  }

  static async updateProject(projectId: string, projectData: Partial<CreateProjectData>): Promise<{ success: boolean; error?: string }> {
    try {
      const existing = await getRecord<CloudProject>(projectStore, projectId);
      if (!existing) {
        return { success: false, error: 'Project not found' };
      }

      const updated: CloudProject = { ...existing, updatedAt: new Date().toISOString() };

      if (projectData.name) updated.name = projectData.name;
      if (projectData.description !== undefined) updated.description = projectData.description;
      if (projectData.thumbnail !== undefined) updated.thumbnail = projectData.thumbnail;

      if (projectData.nodes || projectData.edges || projectData.nodeData) {
        const processedNodeData = projectData.nodeData ?
          await this.convertBlobUrlsToDataUrls(projectData.nodeData) : {};

        updated.projectData = {
          nodes: projectData.nodes || [],
          edges: projectData.edges || [],
          nodeData: processedNodeData
        };
      }

      await putRecord(projectStore, projectId, updated);

      return { success: true };
    } catch (error) {
      console.error('Error updating project:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to update project'
      };
    }
  }

  static async loadProject(projectId: string): Promise<{ success: boolean; error?: string; project?: CloudProject }> {
    try {
      const project = await getRecord<CloudProject>(projectStore, projectId);
      if (!project) {
        return { success: false, error: 'Project not found' };
      }
      return { success: true, project };
    } catch (error) {
      console.error('Error loading project:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to load project'
      };
    }
  }

  static async listProjects(limit: number = 20, offset: number = 0): Promise<{ success: boolean; error?: string; projects?: CloudProject[] }> {
    try {
      const all = await listRecords<CloudProject>(projectStore);
      const sorted = all.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
      const page = sorted.slice(offset, offset + limit);

      // Keep list view light: metadata only, full data is loaded on demand
      const projects = page.map(item => ({
        ...item,
        projectData: { nodes: [], edges: [], nodeData: {} }
      }));

      return { success: true, projects };
    } catch (error) {
      console.error('Error listing projects:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to list projects'
      };
    }
  }

  static async deleteProject(projectId: string): Promise<{ success: boolean; error?: string }> {
    try {
      await deleteRecord(projectStore, projectId);
      return { success: true };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to delete project'
      };
    }
  }

  // Helper method to convert blob URLs to data URLs for reliable storage
  static async convertBlobUrlsToDataUrls(nodeData: { [key: string]: NodeData }): Promise<{ [key: string]: NodeData }> {
    const processedData = { ...nodeData };

    // Compress images to reduce size
    const compressDataUrl = async (dataUrl: string): Promise<string> => {
      try {
        // For very large data URLs, create a smaller version
        if (dataUrl.length > 500000) { // 500KB threshold
          return new Promise((resolve) => {
            // Create a canvas to compress the image
            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d');
            const img = new Image();

            img.onload = () => {
              // Scale down if too large
              const maxDimension = 1024;
              let { width, height } = img;

              if (width > maxDimension || height > maxDimension) {
                if (width > height) {
                  height = (height * maxDimension) / width;
                  width = maxDimension;
                } else {
                  width = (width * maxDimension) / height;
                  height = maxDimension;
                }
              }

              canvas.width = width;
              canvas.height = height;
              ctx?.drawImage(img, 0, 0, width, height);

              // Compress to JPEG with 70% quality
              const compressedDataUrl = canvas.toDataURL('image/jpeg', 0.7);
              resolve(compressedDataUrl);
            };

            img.onerror = () => {
              console.warn('Failed to load image for compression');
              resolve(dataUrl); // Return original if compression fails
            };

            img.src = dataUrl;
          });
        }
        return dataUrl;
      } catch (error) {
        console.warn('Failed to compress image:', error);
        return dataUrl;
      }
    };

    for (const nodeId in processedData) {
      const data = processedData[nodeId];
      if (data) {
        // Convert any blob URLs to data URLs
        for (const key in data) {
          if (typeof data[key] === 'string' && data[key].startsWith('blob:')) {
            try {
              const response = await fetch(data[key]);
              const blob = await response.blob();
              let dataUrl = await this.blobToDataUrl(blob);

              // Compress if needed
              if (dataUrl.length > 500000) {
                dataUrl = await compressDataUrl(dataUrl);
              }

              data[key] = dataUrl;
              console.log(`Converted and compressed blob URL for ${nodeId}.${key}`);
            } catch (error) {
              console.warn(`Failed to convert blob URL for ${nodeId}.${key}:`, error);
              // Remove invalid blob URLs
              data[key] = undefined;
            }
          } else if (Array.isArray(data[key])) {
            // Handle arrays that might contain blob URLs
            const array = data[key] as any[];
            for (let i = 0; i < array.length; i++) {
              if (typeof array[i] === 'string' && array[i].startsWith('blob:')) {
                try {
                  const response = await fetch(array[i]);
                  const blob = await response.blob();
                  let dataUrl = await this.blobToDataUrl(blob);

                  // Compress if needed
                  if (dataUrl.length > 500000) {
                    dataUrl = await compressDataUrl(dataUrl);
                  }

                  array[i] = dataUrl;
                  console.log(`Converted and compressed blob URL for ${nodeId}.${key}[${i}]`);
                } catch (error) {
                  console.warn(`Failed to convert blob URL for ${nodeId}.${key}[${i}]:`, error);
                  array[i] = undefined;
                }
              }
            }
            // Filter out undefined values
            data[key] = array.filter(item => item !== undefined);
          }
        }
      }
    }

    return processedData;
  }

  // Helper method to convert blob to data URL
  static blobToDataUrl(blob: Blob): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  }

  static generateThumbnail(nodes: Node[]): string {
    // Create a simple text-based thumbnail representation
    const nodeCount = nodes.length;
    const nodeTypes = [...new Set(nodes.map(n => n.type))];

    return `Nodes: ${nodeCount} | Types: ${nodeTypes.join(', ')}`;
  }
}
