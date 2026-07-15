import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Keyboard } from 'lucide-react';

interface ShortcutsModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const isMac = typeof navigator !== 'undefined' && /Mac|iP(hone|ad)/.test(navigator.platform);
const mod = isMac ? '⌘' : 'Ctrl';

const SHORTCUTS: { keys: string; label: string }[] = [
  { keys: `${mod} Z`, label: 'Undo' },
  { keys: `${mod} ⇧ Z`, label: 'Redo' },
  { keys: `${mod} S`, label: 'Save project' },
  { keys: `${mod} D`, label: 'Duplicate selected node' },
  { keys: 'Delete', label: 'Delete selected node / edge' },
  { keys: 'F', label: 'Fit workflow to view' },
  { keys: 'Esc', label: 'Deselect' },
  { keys: '?', label: 'Show this help' },
];

export const ShortcutsModal = ({ open, onOpenChange }: ShortcutsModalProps) => (
  <Dialog open={open} onOpenChange={onOpenChange}>
    <DialogContent className="sm:max-w-[420px]">
      <DialogHeader>
        <DialogTitle className="flex items-center gap-2">
          <Keyboard className="h-5 w-5" /> Keyboard shortcuts
        </DialogTitle>
      </DialogHeader>
      <div className="space-y-1.5">
        {SHORTCUTS.map((s) => (
          <div key={s.label} className="flex items-center justify-between py-1.5 border-b border-border/40 last:border-0">
            <span className="text-sm text-muted-foreground">{s.label}</span>
            <kbd className="px-2 py-1 text-xs font-mono rounded bg-muted border border-border">{s.keys}</kbd>
          </div>
        ))}
      </div>
    </DialogContent>
  </Dialog>
);
