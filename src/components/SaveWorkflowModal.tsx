import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Node, Edge } from '@xyflow/react';
import { WorkflowService } from '@/services/workflowService';
import { toast } from 'sonner';

interface SaveWorkflowModalProps {
  open: boolean;
  onClose: () => void;
  nodes: Node[];
  edges: Edge[];
}

export const SaveWorkflowModal: React.FC<SaveWorkflowModalProps> = ({
  open,
  onClose,
  nodes,
  edges
}) => {
  const [name, setName] = useState('');
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    if (!name.trim()) {
      toast.error('Please enter a workflow name');
      return;
    }

    setSaving(true);
    const result = await WorkflowService.saveWorkflow(name.trim(), nodes, edges);
    setSaving(false);

    if (result.success) {
      toast.success(`Workflow "${name}" saved!`);
      setName('');
      onClose();
    } else {
      toast.error(result.error || 'Failed to save workflow');
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Save Workflow</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="workflow-name">Workflow Name</Label>
            <Input
              id="workflow-name"
              placeholder="My awesome workflow"
              value={name}
              onChange={(e) => setName(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSave()}
            />
          </div>
          <p className="text-sm text-muted-foreground">
            Workflows save node positions and connections only, not image data.
          </p>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={handleSave} disabled={saving || !name.trim()}>
            {saving ? 'Saving...' : 'Save Workflow'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
