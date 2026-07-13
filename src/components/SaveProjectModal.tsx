import { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Progress } from "@/components/ui/progress";
import { Loader2, Save } from "lucide-react";
import { ProjectService } from "@/services/projectService";
import { Node, Edge } from '@xyflow/react';
import { NodeData } from '@/types/nodeEditor';
import { useToast } from "@/hooks/use-toast";

interface SaveProjectModalProps {
  open: boolean;
  onClose: () => void;
  nodes: Node[];
  edges: Edge[];
  nodeData: { [key: string]: NodeData };
}

export const SaveProjectModal = ({ open, onClose, nodes, edges, nodeData }: SaveProjectModalProps) => {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [saving, setSaving] = useState(false);
  const [progress, setProgress] = useState(0);
  const [progressText, setProgressText] = useState("");
  const { toast } = useToast();

  const handleSave = async () => {
    if (!name.trim()) {
      toast({
        title: "Project name required",
        description: "Please enter a name for your project.",
        variant: "destructive"
      });
      return;
    }

    setSaving(true);
    setProgress(0);
    setProgressText("Preparing project...");

    try {
      setProgress(10);
      setProgressText("Generating thumbnail...");
      const thumbnail = ProjectService.generateThumbnail(nodes);
      
      console.log('Saving project to browser storage:');
      console.log('- Name:', name.trim());
      console.log('- Nodes:', nodes.length, nodes);
      console.log('- Edges:', edges.length, edges);
      console.log('- Node Data:', Object.keys(nodeData).length, nodeData);
      
      setProgress(20);
      setProgressText("Processing images...");
      
      // Count blob URLs for progress tracking
      let totalBlobUrls = 0;
      let processedBlobUrls = 0;
      
      for (const nodeId in nodeData) {
        const data = nodeData[nodeId];
        if (data) {
          for (const key in data) {
            if (typeof data[key] === 'string' && data[key].startsWith('blob:')) {
              totalBlobUrls++;
            } else if (Array.isArray(data[key])) {
              const array = data[key] as any[];
              for (const item of array) {
                if (typeof item === 'string' && item.startsWith('blob:')) {
                  totalBlobUrls++;
                }
              }
            }
          }
        }
      }

      // Process node data with progress tracking
      const processedNodeData = { ...nodeData };
      
      for (const nodeId in processedNodeData) {
        const data = processedNodeData[nodeId];
        if (data) {
          for (const key in data) {
            if (typeof data[key] === 'string' && data[key].startsWith('blob:')) {
              try {
                const response = await fetch(data[key]);
                const blob = await response.blob();
                const dataUrl = await ProjectService.blobToDataUrl(blob);
                data[key] = dataUrl;
                processedBlobUrls++;
                const imageProgress = totalBlobUrls > 0 ? Math.floor((processedBlobUrls / totalBlobUrls) * 50) : 50;
                setProgress(20 + imageProgress);
                setProgressText(`Processing images... (${processedBlobUrls}/${totalBlobUrls})`);
              } catch (error) {
                console.warn(`Failed to convert blob URL for ${nodeId}.${key}:`, error);
                data[key] = undefined;
                processedBlobUrls++;
              }
            } else if (Array.isArray(data[key])) {
              const array = data[key] as any[];
              for (let i = 0; i < array.length; i++) {
                if (typeof array[i] === 'string' && array[i].startsWith('blob:')) {
                  try {
                    const response = await fetch(array[i]);
                    const blob = await response.blob();
                    const dataUrl = await ProjectService.blobToDataUrl(blob);
                    array[i] = dataUrl;
                    processedBlobUrls++;
                    const imageProgress = totalBlobUrls > 0 ? Math.floor((processedBlobUrls / totalBlobUrls) * 50) : 50;
                    setProgress(20 + imageProgress);
                    setProgressText(`Processing images... (${processedBlobUrls}/${totalBlobUrls})`);
                  } catch (error) {
                    console.warn(`Failed to convert blob URL for ${nodeId}.${key}[${i}]:`, error);
                    array[i] = undefined;
                    processedBlobUrls++;
                  }
                }
              }
              data[key] = array.filter(item => item !== undefined);
            }
          }
        }
      }
      
      setProgress(75);
      setProgressText("Saving to browser storage...");
      
      const result = await ProjectService.saveProject({
        name: name.trim(),
        description: description.trim() || undefined,
        nodes,
        edges,
        nodeData: processedNodeData,
        thumbnail
      });

      setProgress(100);
      setProgressText("Complete!");

      if (result.success) {
        toast({
          title: "Project saved",
          description: `"${name}" has been saved in this browser.`
        });
        
        // Reset form
        setName("");
        setDescription("");
        setProgress(0);
        setProgressText("");
        onClose();
      } else {
        toast({
          title: "Save failed",
          description: result.error || "Failed to save project.",
          variant: "destructive"
        });
      }
    } catch (error) {
      console.error("Save project error:", error);
      toast({
        title: "Save failed",
        description: error instanceof Error ? error.message : "An unexpected error occurred.",
        variant: "destructive"
      });
    } finally {
      setSaving(false);
      if (!saving) {
        setProgress(0);
        setProgressText("");
      }
    }
  };

  const handleClose = () => {
    if (!saving) {
      setName("");
      setDescription("");
      setProgress(0);
      setProgressText("");
      onClose();
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center space-x-2">
            <Save className="w-5 h-5" />
            <span>Save Project to Browser</span>
          </DialogTitle>
          <DialogDescription>
            Save your current workflow in this browser (IndexedDB). Use ZIP export for portable backups.
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4">
          <div>
            <Label htmlFor="project-name">Project Name *</Label>
            <Input
              id="project-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Enter project name..."
              disabled={saving}
              className="mt-1"
            />
          </div>
          
          <div>
            <Label htmlFor="project-description">Description</Label>
            <Textarea
              id="project-description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Optional description..."
              disabled={saving}
              className="mt-1"
              rows={3}
            />
          </div>
          
          <div className="text-sm text-muted-foreground">
            Project contains: {nodes.length} nodes, {edges.length} connections
          </div>
          
          {saving && (
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span>{progressText}</span>
                <span>{progress}%</span>
              </div>
              <Progress value={progress} className="w-full" />
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleClose} disabled={saving}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={saving || !name.trim()}>
            {saving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
            Save Project
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};