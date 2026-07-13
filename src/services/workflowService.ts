import { supabase } from '@/integrations/supabase/client';
import { Node, Edge } from '@xyflow/react';

export interface SavedWorkflow {
  id: string;
  user_id: string;
  name: string;
  workflow_data: {
    nodes: Node[];
    edges: Edge[];
  };
  created_at: string;
  updated_at: string;
}

export class WorkflowService {
  // Strip image data from nodes to keep workflows lightweight
  private static stripImageData(nodes: Node[]): Node[] {
    return nodes.map(node => ({
      ...node,
      data: {
        ...node.data,
        // Remove image-related data
        imageUrl: undefined,
        image: undefined,
        images: undefined,
        outputImage: undefined,
        resultImage: undefined,
        processedImages: undefined,
        batchResults: undefined,
      }
    }));
  }

  static async saveWorkflow(
    name: string,
    nodes: Node[],
    edges: Edge[]
  ): Promise<{ success: boolean; error?: string; workflow?: SavedWorkflow }> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        return { success: false, error: 'User not authenticated' };
      }

      const strippedNodes = this.stripImageData(nodes);

      const { data, error } = await supabase
        .from('user_workflows')
        .insert({
          user_id: user.id,
          name,
          workflow_data: JSON.parse(JSON.stringify({
            nodes: strippedNodes,
            edges
          }))
        })
        .select()
        .single();

      if (error) {
        console.error('Error saving workflow:', error);
        return { success: false, error: error.message };
      }

      return { success: true, workflow: data as unknown as SavedWorkflow };
    } catch (err) {
      console.error('Workflow save error:', err);
      return { success: false, error: 'Failed to save workflow' };
    }
  }

  static async listWorkflows(): Promise<{ success: boolean; error?: string; workflows?: SavedWorkflow[] }> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        return { success: false, error: 'User not authenticated' };
      }

      const { data, error } = await supabase
        .from('user_workflows')
        .select('*')
        .eq('user_id', user.id)
        .order('updated_at', { ascending: false });

      if (error) {
        console.error('Error listing workflows:', error);
        return { success: false, error: error.message };
      }

      return { success: true, workflows: data as unknown as SavedWorkflow[] };
    } catch (err) {
      console.error('Workflow list error:', err);
      return { success: false, error: 'Failed to list workflows' };
    }
  }

  static async loadWorkflow(workflowId: string): Promise<{ success: boolean; error?: string; workflow?: SavedWorkflow }> {
    try {
      const { data, error } = await supabase
        .from('user_workflows')
        .select('*')
        .eq('id', workflowId)
        .maybeSingle();

      if (error) {
        console.error('Error loading workflow:', error);
        return { success: false, error: error.message };
      }

      if (!data) {
        return { success: false, error: 'Workflow not found' };
      }

      return { success: true, workflow: data as unknown as SavedWorkflow };
    } catch (err) {
      console.error('Workflow load error:', err);
      return { success: false, error: 'Failed to load workflow' };
    }
  }

  static async deleteWorkflow(workflowId: string): Promise<{ success: boolean; error?: string }> {
    try {
      const { error } = await supabase
        .from('user_workflows')
        .delete()
        .eq('id', workflowId);

      if (error) {
        console.error('Error deleting workflow:', error);
        return { success: false, error: error.message };
      }

      return { success: true };
    } catch (err) {
      console.error('Workflow delete error:', err);
      return { success: false, error: 'Failed to delete workflow' };
    }
  }
}
