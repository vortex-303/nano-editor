import React, { useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger
} from '@/components/ui/dropdown-menu';
import { MoreHorizontal, Maximize2, Minimize2, HardDrive, Trash2, GitBranch, FolderOpen } from 'lucide-react';
import { Node, Edge } from '@xyflow/react';
import { NodeData } from '@/types/nodeEditor';
import { useProjectExport } from '@/hooks/useProjectExport';
import { useProjectImport } from '@/hooks/useProjectImport';
import { SaveProjectModal } from '@/components/SaveProjectModal';
import { LoadProjectModal } from '@/components/LoadProjectModal';
import { SaveWorkflowModal } from '@/components/SaveWorkflowModal';
import { LoadWorkflowModal } from '@/components/LoadWorkflowModal';
import { CloudProject } from '@/services/projectService';
import { toast } from 'sonner';

interface WorkflowToolbarProps {
  onClear: () => void;
  nodes: Node[];
  edges: Edge[];
  nodeData: { [key: string]: NodeData };
  onImport: (nodes: Node[], edges: Edge[], nodeData: { [key: string]: NodeData }) => void;
  isFullscreen?: boolean;
  onToggleFullscreen?: () => void;
}

export const WorkflowToolbar: React.FC<WorkflowToolbarProps> = ({
  onClear,
  nodes,
  edges,
  nodeData,
  onImport,
  isFullscreen = false,
  onToggleFullscreen
}) => {
  const { exportProject } = useProjectExport();
  const { importProject } = useProjectImport();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [saveModalOpen, setSaveModalOpen] = useState(false);
  const [loadModalOpen, setLoadModalOpen] = useState(false);
  const [saveWorkflowModalOpen, setSaveWorkflowModalOpen] = useState(false);
  const [loadWorkflowModalOpen, setLoadWorkflowModalOpen] = useState(false);

  const handleLocalExport = async () => {
    const result = await exportProject(nodes, edges, nodeData, {
      projectName: 'My Workflow'
    });

    if (result.success) {
      toast.success('Project exported successfully!');
    } else {
      toast.error(result.error || 'Export failed');
    }
  };

  const handleLocalImportClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.name.endsWith('.zip')) {
      toast.error('Please select a valid ZIP file');
      return;
    }

    const result = await importProject(file);

    if (result.success && result.data) {
      onImport(result.data.nodes, result.data.edges, result.data.nodeData);
      toast.success(`Project "${result.data.manifest.projectName}" imported successfully!`);
    } else {
      toast.error(result.error || 'Import failed');
    }

    event.target.value = '';
  };

  const handleProjectLoad = async (project: CloudProject) => {
    const loadingToast = toast.loading('Processing project data...');

    try {
      const { nodes = [], edges = [], nodeData = {} } = project.projectData;
      await new Promise(resolve => setTimeout(resolve, 500));
      onImport(nodes, edges, nodeData);

      toast.dismiss(loadingToast);
      toast.success(`Project "${project.name}" loaded successfully!`);
    } catch (error) {
      toast.dismiss(loadingToast);
      toast.error('Failed to load project data');
      console.error('Error loading project:', error);
    }
  };

  const handleWorkflowLoad = (loadedNodes: Node[], loadedEdges: Edge[]) => {
    // Load workflow with empty nodeData (workflows don't contain image data)
    onImport(loadedNodes, loadedEdges, {});
  };

  return (
    <>
      <div className="flex items-center gap-2 p-3 border-b bg-card">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm">
              <MoreHorizontal size={16} className="mr-2" />
              Menu
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="w-56">
            <DropdownMenuSub>
              <DropdownMenuSubTrigger>
                <FolderOpen size={16} className="mr-2" />
                Projects
              </DropdownMenuSubTrigger>
              <DropdownMenuSubContent>
                <DropdownMenuItem onClick={() => setSaveModalOpen(true)}>
                  Save Project
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setLoadModalOpen(true)}>
                  Load Project
                </DropdownMenuItem>
              </DropdownMenuSubContent>
            </DropdownMenuSub>

            <DropdownMenuSub>
              <DropdownMenuSubTrigger>
                <GitBranch size={16} className="mr-2" />
                Workflows
              </DropdownMenuSubTrigger>
              <DropdownMenuSubContent>
                <DropdownMenuItem onClick={() => setSaveWorkflowModalOpen(true)}>
                  Save Workflow
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setLoadWorkflowModalOpen(true)}>
                  Load Workflow
                </DropdownMenuItem>
              </DropdownMenuSubContent>
            </DropdownMenuSub>

            <DropdownMenuSeparator />

            <DropdownMenuSub>
              <DropdownMenuSubTrigger>
                <HardDrive size={16} className="mr-2" />
                Local
              </DropdownMenuSubTrigger>
              <DropdownMenuSubContent>
                <DropdownMenuItem onClick={handleLocalExport}>
                  Export to ZIP
                </DropdownMenuItem>
                <DropdownMenuItem onClick={handleLocalImportClick}>
                  Import from ZIP
                </DropdownMenuItem>
              </DropdownMenuSubContent>
            </DropdownMenuSub>

            <DropdownMenuSeparator />

            <DropdownMenuItem onClick={onClear} className="text-destructive">
              <Trash2 size={16} className="mr-2" />
              Clear Workflow
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        <input
          ref={fileInputRef}
          type="file"
          accept=".zip"
          style={{ display: 'none' }}
          onChange={handleFileSelect}
        />

        <div className="ml-auto flex items-center gap-4">
          {onToggleFullscreen && (
            <Button variant="ghost" size="sm" onClick={onToggleFullscreen}>
              {isFullscreen ? <Minimize2 size={16} /> : <Maximize2 size={16} />}
              {isFullscreen ? 'Exit Fullscreen' : 'Fullscreen'}
            </Button>
          )}
        </div>
      </div>

      <SaveProjectModal
        open={saveModalOpen}
        onClose={() => setSaveModalOpen(false)}
        nodes={nodes}
        edges={edges}
        nodeData={nodeData}
      />

      <LoadProjectModal
        open={loadModalOpen}
        onClose={() => setLoadModalOpen(false)}
        onLoad={handleProjectLoad}
      />

      <SaveWorkflowModal
        open={saveWorkflowModalOpen}
        onClose={() => setSaveWorkflowModalOpen(false)}
        nodes={nodes}
        edges={edges}
      />

      <LoadWorkflowModal
        open={loadWorkflowModalOpen}
        onClose={() => setLoadWorkflowModalOpen(false)}
        onLoad={handleWorkflowLoad}
      />
    </>
  );
};
