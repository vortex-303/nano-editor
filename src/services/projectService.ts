import { supabase } from "@/integrations/supabase/client";
import { Node, Edge } from '@xyflow/react';
import { NodeData } from '@/types/nodeEditor';

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
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        return { success: false, error: 'User not authenticated' };
      }

      // Process node data to convert blob URLs to data URLs for storage
      const processedNodeData = await this.convertBlobUrlsToDataUrls(projectData.nodeData);
      
      console.log('Saving project with processed data:', {
        originalNodeData: projectData.nodeData,
        processedNodeData,
        nodes: projectData.nodes.length,
        edges: projectData.edges.length
      });

      const projectPayload = {
        user_id: user.id,
        name: projectData.name,
        description: projectData.description,
        project_data: {
          nodes: projectData.nodes,
          edges: projectData.edges,
          nodeData: processedNodeData
        } as any,
        thumbnail: projectData.thumbnail
      };

      const { data, error } = await supabase
        .from('user_projects')
        .insert(projectPayload)
        .select()
        .single();

      if (error) {
        console.error('Supabase error saving project:', error);
        return { success: false, error: error.message };
      }

      return {
        success: true,
        project: {
          id: data.id,
          name: data.name,
          description: data.description,
          projectData: data.project_data as any,
          thumbnail: data.thumbnail,
          createdAt: data.created_at,
          updatedAt: data.updated_at
        }
      };
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
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        return { success: false, error: 'User not authenticated' };
      }

      const updatePayload: any = {};
      
      if (projectData.name) updatePayload.name = projectData.name;
      if (projectData.description !== undefined) updatePayload.description = projectData.description;
      if (projectData.thumbnail !== undefined) updatePayload.thumbnail = projectData.thumbnail;
      
      if (projectData.nodes || projectData.edges || projectData.nodeData) {
        // Process node data to convert blob URLs to data URLs for storage
        const processedNodeData = projectData.nodeData ? 
          await this.convertBlobUrlsToDataUrls(projectData.nodeData) : {};
          
        updatePayload.project_data = {
          nodes: projectData.nodes || [],
          edges: projectData.edges || [],
          nodeData: processedNodeData
        } as any;
      }

      const { error } = await supabase
        .from('user_projects')
        .update(updatePayload)
        .eq('id', projectId)
        .eq('user_id', user.id);

      if (error) {
        console.error('Supabase error updating project:', error);
        return { success: false, error: error.message };
      }

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
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        return { success: false, error: 'User not authenticated' };
      }

      console.log('Loading project with ID:', projectId);

      const { data, error } = await supabase
        .from('user_projects')
        .select('*')
        .eq('id', projectId)
        .eq('user_id', user.id)
        .maybeSingle();

      if (error) {
        console.error('Supabase error loading project:', error);
        return { success: false, error: error.message };
      }

      if (!data) {
        return { success: false, error: 'Project not found' };
      }

      console.log('Project loaded from database:', data);

      return {
        success: true,
        project: {
          id: data.id,
          name: data.name,
          description: data.description,
          projectData: data.project_data as any,
          thumbnail: data.thumbnail,
          createdAt: data.created_at,
          updatedAt: data.updated_at
        }
      };
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
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        return { success: false, error: 'User not authenticated' };
      }

      console.log('Listing projects for user:', user.id, 'limit:', limit, 'offset:', offset);

      // Only load essential fields for the list view (not the full project_data)
      const { data, error } = await supabase
        .from('user_projects')
        .select('id, name, description, thumbnail, created_at, updated_at')
        .eq('user_id', user.id)
        .order('updated_at', { ascending: false })
        .range(offset, offset + limit - 1);

      if (error) {
        console.error('Supabase error listing projects:', error);
        if (error.message.includes('timeout') || error.message.includes('statement timeout')) {
          return { success: false, error: 'Request timed out. Please try again with fewer projects or check your connection.' };
        }
        return { success: false, error: error.message };
      }

      console.log('Projects retrieved from database:', data?.length || 0);

      const projects = data?.map(item => ({
        id: item.id,
        name: item.name,
        description: item.description,
        // Set empty project data for list view - will be loaded separately when needed
        projectData: { nodes: [], edges: [], nodeData: {} },
        thumbnail: item.thumbnail,
        createdAt: item.created_at,
        updatedAt: item.updated_at
      })) || [];

      return { success: true, projects };
    } catch (error) {
      console.error('Error listing projects:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to list projects';
      
      if (errorMessage.includes('timeout') || errorMessage.includes('statement timeout')) {
        return { success: false, error: 'Request timed out. Please try reducing the number of projects loaded or check your internet connection.' };
      }
      
      return {
        success: false,
        error: errorMessage
      };
    }
  }

  static async deleteProject(projectId: string): Promise<{ success: boolean; error?: string }> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        return { success: false, error: 'User not authenticated' };
      }

      const { error } = await supabase
        .from('user_projects')
        .delete()
        .eq('id', projectId)
        .eq('user_id', user.id);

      if (error) {
        return { success: false, error: error.message };
      }

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
    
    // Compress images to reduce size and prevent timeouts
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