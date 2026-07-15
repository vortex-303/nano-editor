import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { LayoutTemplate } from 'lucide-react';
import { TEMPLATES, type WorkflowTemplate } from '@/lib/templates';

interface TemplatesModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSelect: (t: WorkflowTemplate) => void;
}

const Group = ({ title, note, items, onSelect }: {
  title: string; note: string; items: WorkflowTemplate[]; onSelect: (t: WorkflowTemplate) => void;
}) => (
  <div className="space-y-2">
    <div className="flex items-baseline gap-2">
      <h3 className="text-sm font-medium">{title}</h3>
      <span className="text-xs text-muted-foreground">{note}</span>
    </div>
    <div className="grid grid-cols-2 gap-2">
      {items.map((t) => (
        <button
          key={t.id}
          onClick={() => onSelect(t)}
          className="text-left rounded-lg border p-3 hover:bg-accent hover:border-primary/50 transition-colors"
        >
          <div className="flex items-center gap-2">
            <span className="text-lg leading-none">{t.icon}</span>
            <span className="text-sm font-medium">{t.name}</span>
          </div>
          <p className="text-xs text-muted-foreground mt-1 leading-tight">{t.description}</p>
        </button>
      ))}
    </div>
  </div>
);

export const TemplatesModal = ({ open, onOpenChange, onSelect }: TemplatesModalProps) => {
  const local = TEMPLATES.filter((t) => t.group === 'local');
  const key = TEMPLATES.filter((t) => t.group === 'key');
  const pick = (t: WorkflowTemplate) => { onSelect(t); onOpenChange(false); };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[720px] max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <LayoutTemplate className="h-5 w-5" /> Start from a template
          </DialogTitle>
          <DialogDescription>
            Pre-built workflows. Pick one, add your image, and run each node. Choosing a template replaces the current canvas (undo with ⌘Z).
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-5">
          <Group title="Free · runs locally" note="no key needed" items={local} onSelect={pick} />
          <div className="flex items-center gap-2 pt-1">
            <span className="text-sm font-medium">With your fal.ai key</span>
            <Badge variant="outline" className="text-[10px]">BYOK</Badge>
          </div>
          <div className="grid grid-cols-2 gap-2">
            {key.map((t) => (
              <button
                key={t.id}
                onClick={() => pick(t)}
                className="text-left rounded-lg border p-3 hover:bg-accent hover:border-primary/50 transition-colors"
              >
                <div className="flex items-center gap-2">
                  <span className="text-lg leading-none">{t.icon}</span>
                  <span className="text-sm font-medium">{t.name}</span>
                </div>
                <p className="text-xs text-muted-foreground mt-1 leading-tight">{t.description}</p>
              </button>
            ))}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
