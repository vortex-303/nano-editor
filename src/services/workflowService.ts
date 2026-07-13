import { Node, Edge } from '@xyflow/react';
import { workflowStore, putRecord, getRecord, deleteRecord, listRecords, newId } from '@/lib/localDb';

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
      const strippedNodes = this.stripImageData(nodes);
      const now = new Date().toISOString();

      const workflow: SavedWorkflow = {
        id: newId(),
        user_id: 'local',
        name,
        workflow_data: JSON.parse(JSON.stringify({
          nodes: strippedNodes,
          edges
        })),
        created_at: now,
        updated_at: now
      };

      await putRecord(workflowStore, workflow.id, workflow);

      return { success: true, workflow };
    } catch (err) {
      console.error('Workflow save error:', err);
      return { success: false, error: 'Failed to save workflow' };
    }
  }

  static async listWorkflows(): Promise<{ success: boolean; error?: string; workflows?: SavedWorkflow[] }> {
    try {
      const all = await listRecords<SavedWorkflow>(workflowStore);
      const workflows = all.sort((a, b) => b.updated_at.localeCompare(a.updated_at));
      return { success: true, workflows };
    } catch (err) {
      console.error('Workflow list error:', err);
      return { success: false, error: 'Failed to list workflows' };
    }
  }

  static async loadWorkflow(workflowId: string): Promise<{ success: boolean; error?: string; workflow?: SavedWorkflow }> {
    try {
      const workflow = await getRecord<SavedWorkflow>(workflowStore, workflowId);
      if (!workflow) {
        return { success: false, error: 'Workflow not found' };
      }
      return { success: true, workflow };
    } catch (err) {
      console.error('Workflow load error:', err);
      return { success: false, error: 'Failed to load workflow' };
    }
  }

  static async deleteWorkflow(workflowId: string): Promise<{ success: boolean; error?: string }> {
    try {
      await deleteRecord(workflowStore, workflowId);
      return { success: true };
    } catch (err) {
      console.error('Workflow delete error:', err);
      return { success: false, error: 'Failed to delete workflow' };
    }
  }
}
