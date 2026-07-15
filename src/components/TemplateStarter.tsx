import { TEMPLATES, type WorkflowTemplate } from '@/lib/templates';

interface TemplateStarterProps {
  onSelect: (t: WorkflowTemplate) => void;
  onBrowseAll: () => void;
}

// A few featured templates shown on the empty canvas
const FEATURED = ['remove-background', 'cut-out-object', 'erase-object', 'upscale', 'parallax', 'text-to-image'];

export const TemplateStarter = ({ onSelect, onBrowseAll }: TemplateStarterProps) => {
  const featured = FEATURED.map((id) => TEMPLATES.find((t) => t.id === id)).filter(Boolean) as WorkflowTemplate[];

  return (
    <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
      <div className="pointer-events-auto max-w-2xl w-full mx-6 rounded-xl border bg-card/80 backdrop-blur-sm p-6 shadow-lg">
        <div className="text-center mb-4">
          <h2 className="text-lg font-semibold">Start from a template</h2>
          <p className="text-sm text-muted-foreground">Pick a workflow, add your image, and run — or drag nodes from the left to build your own.</p>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
          {featured.map((t) => (
            <button
              key={t.id}
              onClick={() => onSelect(t)}
              className="text-left rounded-lg border p-3 hover:bg-accent hover:border-primary/50 transition-colors"
            >
              <div className="flex items-center gap-2">
                <span className="text-lg leading-none">{t.icon}</span>
                <span className="text-sm font-medium">{t.name}</span>
              </div>
              <p className="text-[11px] text-muted-foreground mt-1 leading-tight">{t.description}</p>
            </button>
          ))}
        </div>
        <div className="text-center mt-4">
          <button onClick={onBrowseAll} className="text-sm text-primary hover:underline">
            Browse all templates →
          </button>
        </div>
      </div>
    </div>
  );
};
