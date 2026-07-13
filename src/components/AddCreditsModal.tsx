import { useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface AddCreditsModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  userId: string;
  userEmail: string;
  currentCreditsUsed: number;
  onSuccess: () => void;
}

export const AddCreditsModal = ({ 
  open, 
  onOpenChange, 
  userId, 
  userEmail,
  currentCreditsUsed,
  onSuccess 
}: AddCreditsModalProps) => {
  const [creditsToAdd, setCreditsToAdd] = useState('');
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const handleAddCredits = async () => {
    const amount = parseInt(creditsToAdd);
    
    if (isNaN(amount) || amount <= 0) {
      toast({
        title: "Invalid amount",
        description: "Please enter a valid positive number",
        variant: "destructive"
      });
      return;
    }

    setLoading(true);
    try {
      // Subtract the credits from credits_used (adding available credits)
      const newCreditsUsed = Math.max(0, currentCreditsUsed - amount);
      
      const { error } = await supabase
        .from('user_credits')
        .update({ 
          credits_used: newCreditsUsed,
          updated_at: new Date().toISOString()
        })
        .eq('user_id', userId);

      if (error) throw error;

      toast({
        title: "Success",
        description: `Added ${amount} credits to ${userEmail}`
      });
      
      setCreditsToAdd('');
      onOpenChange(false);
      onSuccess();
    } catch (error) {
      console.error('Error adding credits:', error);
      toast({
        title: "Error",
        description: "Failed to add credits",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add Credits</DialogTitle>
          <DialogDescription>
            Add custom amount of credits to {userEmail}
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="credits">Number of Credits</Label>
            <Input
              id="credits"
              type="number"
              min="1"
              placeholder="Enter amount of credits"
              value={creditsToAdd}
              onChange={(e) => setCreditsToAdd(e.target.value)}
              disabled={loading}
            />
          </div>
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={loading}
          >
            Cancel
          </Button>
          <Button
            onClick={handleAddCredits}
            disabled={loading}
          >
            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Add Credits
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
