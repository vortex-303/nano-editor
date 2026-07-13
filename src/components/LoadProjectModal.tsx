import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Loader2, FolderOpen, Trash2, Search, Calendar } from "lucide-react";
import { ProjectService, CloudProject } from "@/services/projectService";
import { useToast } from "@/hooks/use-toast";
import { formatDistanceToNow } from "date-fns";

interface LoadProjectModalProps {
  open: boolean;
  onClose: () => void;
  onLoad: (project: CloudProject) => void;
}

export const LoadProjectModal = ({ open, onClose, onLoad }: LoadProjectModalProps) => {
  const [projects, setProjects] = useState<CloudProject[]>([]);
  const [filteredProjects, setFilteredProjects] = useState<CloudProject[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [loadingProject, setLoadingProject] = useState<string | null>(null);
  const [deleting, setDeleting] = useState<string | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    if (open) {
      loadProjects();
    }
  }, [open]);

  useEffect(() => {
    if (searchQuery.trim()) {
      setFilteredProjects(
        projects.filter(project =>
          project.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          project.description?.toLowerCase().includes(searchQuery.toLowerCase())
        )
      );
    } else {
      setFilteredProjects(projects);
    }
  }, [projects, searchQuery]);

  const loadProjects = async () => {
    setLoading(true);
    try {
      console.log('LoadProjectModal: Loading projects...');
      const result = await ProjectService.listProjects(50, 0); // Load up to 50 projects
      
      if (result.success && result.projects) {
        console.log('LoadProjectModal: Projects loaded successfully', result.projects.length);
        setProjects(result.projects);
      } else {
        console.error('LoadProjectModal: Failed to load projects', result.error);
        toast({
          title: "Failed to load projects",
          description: result.error || "Could not retrieve your projects.",
          variant: "destructive"
        });
      }
    } catch (error) {
      console.error('LoadProjectModal: Error loading projects:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      
      toast({
        title: "Error loading projects",
        description: errorMessage.includes('timeout') 
          ? "Request timed out. Please check your internet connection and try again."
          : "Failed to load projects. Please try again.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleLoadProject = async (project: CloudProject) => {
    setLoadingProject(project.id);
    try {
      toast({
        title: "Loading project...",
        description: "Retrieving project data from browser storage.",
      });
      
      console.log('LoadProjectModal: Loading specific project:', project.id);
      const result = await ProjectService.loadProject(project.id);
      
      if (result.success && result.project) {
        console.log('LoadProjectModal: Project loaded successfully');
        onLoad(result.project);
        onClose();
        toast({
          title: "Project loaded",
          description: `"${project.name}" has been loaded successfully.`
        });
      } else {
        console.error('LoadProjectModal: Failed to load project', result.error);
        toast({
          title: "Failed to load project",
          description: result.error || "Could not load the selected project.",
          variant: "destructive"
        });
      }
    } catch (error) {
      console.error('LoadProjectModal: Error loading project:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      
      toast({
        title: "Failed to load project",
        description: errorMessage.includes('timeout')
          ? "Request timed out. Please check your internet connection and try again."
          : "An unexpected error occurred while loading the project.",
        variant: "destructive"
      });
    } finally {
      setLoadingProject(null);
    }
  };

  const handleDeleteProject = async (project: CloudProject) => {
    if (!confirm(`Are you sure you want to delete "${project.name}"? This action cannot be undone.`)) {
      return;
    }

    setDeleting(project.id);
    try {
      const result = await ProjectService.deleteProject(project.id);
      if (result.success) {
        setProjects(prev => prev.filter(p => p.id !== project.id));
        toast({
          title: "Project deleted",
          description: `"${project.name}" has been deleted.`
        });
      } else {
        toast({
          title: "Failed to delete project",
          description: result.error || "Could not delete the project.",
          variant: "destructive"
        });
      }
    } catch (error) {
      toast({
        title: "Failed to delete project",
        description: "An unexpected error occurred.",
        variant: "destructive"
      });
    } finally {
      setDeleting(null);
    }
  };

  const handleClose = () => {
    // Don't allow closing while loading a project
    if (loadingProject) return;
    setSearchQuery("");
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-2xl">
        {loadingProject && (
          <div className="absolute inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center rounded-lg">
            <div className="flex flex-col items-center space-y-4">
              <Loader2 className="w-8 h-8 animate-spin" />
              <div className="text-center">
                <p className="font-medium">Loading Project</p>
                <p className="text-sm text-muted-foreground">This may take a few moments...</p>
              </div>
            </div>
          </div>
        )}
        
        <DialogHeader>
          <DialogTitle className="flex items-center space-x-2">
            <FolderOpen className="w-5 h-5" />
            <span>Load Project from Browser</span>
          </DialogTitle>
          <DialogDescription>
            Choose a project to load into the editor.
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search projects..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>

          <ScrollArea className="h-96">
            {loading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="w-6 h-6 animate-spin mr-2" />
                <span>Loading projects...</span>
              </div>
            ) : filteredProjects.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                {projects.length === 0 ? (
                  <div>
                    <FolderOpen className="w-12 h-12 mx-auto mb-4 opacity-50" />
                    <p>No projects saved yet.</p>
                    <p className="text-sm">Create your first project by saving your current workflow.</p>
                  </div>
                ) : (
                  <p>No projects match your search.</p>
                )}
              </div>
            ) : (
              <div className="space-y-2">
                {filteredProjects.map((project) => (
                  <div
                    key={project.id}
                    className="border rounded-lg p-4 hover:bg-accent/50 transition-colors"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1 min-w-0">
                        <h3 className="font-medium truncate">{project.name}</h3>
                        {project.description && (
                          <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                            {project.description}
                          </p>
                        )}
                        <div className="flex items-center space-x-4 mt-2">
                          <Badge variant="outline" className="text-xs">
                            {project.projectData.nodes.length} nodes
                          </Badge>
                          <div className="flex items-center text-xs text-muted-foreground">
                            <Calendar className="w-3 h-3 mr-1" />
                            {formatDistanceToNow(new Date(project.updatedAt), { addSuffix: true })}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center space-x-2 ml-4">
                        <Button
                          size="sm"
                          onClick={() => handleLoadProject(project)}
                          disabled={deleting === project.id || loadingProject !== null}
                        >
                          {loadingProject === project.id ? (
                            <Loader2 className="w-4 h-4 animate-spin mr-2" />
                          ) : null}
                          {loadingProject === project.id ? 'Loading...' : 'Load'}
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleDeleteProject(project)}
                          disabled={deleting === project.id || loadingProject !== null}
                        >
                          {deleting === project.id ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                          ) : (
                            <Trash2 className="w-4 h-4" />
                          )}
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </ScrollArea>
        </div>
      </DialogContent>
    </Dialog>
  );
};