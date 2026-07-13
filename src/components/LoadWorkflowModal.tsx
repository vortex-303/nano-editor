import React, { useEffect, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Node, Edge } from '@xyflow/react';
import { WorkflowService, SavedWorkflow } from '@/services/workflowService';
import { toast } from 'sonner';
import { Trash2, Upload, Loader2 } from 'lucide-react';
import { format } from 'date-fns';

interface LoadWorkflowModalProps {
  open: boolean;
  onClose: () => void;
  onLoad: (nodes: Node[], edges: Edge[]) => void;
}

export const LoadWorkflowModal: React.FC<LoadWorkflowModalProps> = ({
  open,
  onClose,
  onLoad
}) => {
  const [workflows, setWorkflows] = useState<SavedWorkflow[]>([]);
  const [loading, setLoading] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      loadWorkflows();
    }
  }, [open]);

  const loadWorkflows = async () => {
    setLoading(true);
    const result = await WorkflowService.listWorkflows();
    setLoading(false);

    if (result.success && result.workflows) {
      setWorkflows(result.workflows);
    } else {
      toast.error(result.error || 'Failed to load workflows');
    }
  };

  const handleLoad = async (workflow: SavedWorkflow) => {
    const { nodes, edges } = workflow.workflow_data;
    onLoad(nodes, edges);
    toast.success(`Workflow "${workflow.name}" loaded!`);
    onClose();
  };

  const handleDelete = async (workflowId: string, name: string) => {
    setDeletingId(workflowId);
    const result = await WorkflowService.deleteWorkflow(workflowId);
    setDeletingId(null);

    if (result.success) {
      setWorkflows(workflows.filter(w => w.id !== workflowId));
      toast.success(`Workflow "${name}" deleted`);
    } else {
      toast.error(result.error || 'Failed to delete workflow');
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Load Workflow</DialogTitle>
        </DialogHeader>
        <ScrollArea className="max-h-[400px]">
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : workflows.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No saved workflows yet
            </div>
          ) : (
            <div className="space-y-2">
              {workflows.map((workflow) => (
                <div
                  key={workflow.id}
                  className="flex items-center justify-between p-3 rounded-lg border bg-card hover:bg-accent/50 transition-colors"
                >
                  <div className="flex-1 min-w-0">
                    <p className="font-medium truncate">{workflow.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {format(new Date(workflow.updated_at), 'MMM d, yyyy h:mm a')}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 ml-4">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleLoad(workflow)}
                    >
                      <Upload size={16} className="mr-1" />
                      Load
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDelete(workflow.id, workflow.name)}
                      disabled={deletingId === workflow.id}
                    >
                      {deletingId === workflow.id ? (
                        <Loader2 size={16} className="animate-spin" />
                      ) : (
                        <Trash2 size={16} className="text-destructive" />
                      )}
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
};
