import React, { useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { RoleService, UserWithRole, AppRole } from '@/services/roleService';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Settings, RotateCcw, Plus } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { AddCreditsModal } from './AddCreditsModal';

interface UserManagementRowProps {
  user: UserWithRole;
  onUserUpdate: () => void;
}

export const UserManagementRow: React.FC<UserManagementRowProps> = ({ user, onUserUpdate }) => {
  const [updating, setUpdating] = useState(false);
  const [updatingSubscription, setUpdatingSubscription] = useState(false);
  const [resettingCredits, setResettingCredits] = useState(false);
  const [showAddCreditsModal, setShowAddCreditsModal] = useState(false);
  const { toast } = useToast();

  const handleRoleChange = async (newRole: AppRole) => {
    if (newRole === user.role) return;

    setUpdating(true);
    try {
      const result = await RoleService.updateUserRole(user.id, newRole);
      if (result.success) {
        toast({
          title: "Role updated successfully",
          description: `User role changed to ${newRole}`,
        });
        onUserUpdate();
      } else {
        toast({
          title: "Failed to update role",
          description: result.error || "Could not update user role.",
          variant: "destructive"
        });
      }
    } catch (error) {
      toast({
        title: "Failed to update role",
        description: "An unexpected error occurred.",
        variant: "destructive"
      });
    } finally {
      setUpdating(false);
    }
  };

  const handleSubscriptionChange = async (newTier: string) => {
    setUpdatingSubscription(true);
    try {
      const { error } = await supabase
        .from('user_subscriptions')
        .update({ 
          subscription_tier: newTier,
          subscription_status: newTier === 'free' ? 'inactive' : 'active',
          updated_at: new Date().toISOString()
        })
        .eq('user_id', user.id);

      if (error) throw error;

      // Update credits limit based on tier
      const newCreditsLimit = newTier === 'pro' ? 100 : newTier === 'enterprise' ? 1000 : 20;
      await supabase
        .from('user_credits')
        .update({ 
          credits_limit: newCreditsLimit,
          updated_at: new Date().toISOString()
        })
        .eq('user_id', user.id);

      toast({
        title: "Success",
        description: `User subscription updated to ${newTier}`,
      });
      onUserUpdate();
    } catch (error) {
      console.error('Error updating subscription:', error);
      toast({
        title: "Error",
        description: "Failed to update subscription",
        variant: "destructive",
      });
    } finally {
      setUpdatingSubscription(false);
    }
  };

  const handleResetCredits = async () => {
    setResettingCredits(true);
    try {
      const { error } = await supabase
        .from('user_credits')
        .update({ 
          credits_used: 0,
          updated_at: new Date().toISOString()
        })
        .eq('user_id', user.id);

      if (error) throw error;

      toast({
        title: "Success",
        description: "User credits reset to 0",
      });
      onUserUpdate();
    } catch (error) {
      console.error('Error resetting credits:', error);
      toast({
        title: "Error",
        description: "Failed to reset credits",
        variant: "destructive",
      });
    } finally {
      setResettingCredits(false);
    }
  };

  return (
    <div className="flex items-center justify-between p-4 border rounded-lg">
      <div className="flex-1">
        <div className="flex items-center gap-3">
          <div>
            <p className="font-medium">{user.email}</p>
            <p className="text-sm text-muted-foreground">
              Created: {new Date(user.created_at).toLocaleDateString()}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 mt-2">
          <Badge variant={user.role === 'admin' ? 'default' : 'secondary'}>
            {user.role}
          </Badge>
          <Badge variant="outline">
            {user.subscription_tier || 'free'}
          </Badge>
          <span className="text-sm text-muted-foreground">
            Credits: {user.credits_used || 0}/{user.role === 'admin' ? '∞' : user.credits_limit || 20}
          </span>
        </div>
      </div>

      <div className="flex items-center gap-2 flex-col">
        <Select 
          value={user.role} 
          onValueChange={handleRoleChange}
          disabled={updating}
        >
          <SelectTrigger className="w-24">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="user">User</SelectItem>
            <SelectItem value="admin">Admin</SelectItem>
          </SelectContent>
        </Select>
        
        <Select 
          value={user.subscription_tier || 'free'} 
          onValueChange={handleSubscriptionChange}
          disabled={updatingSubscription}
        >
          <SelectTrigger className="w-24">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="free">Free</SelectItem>
            <SelectItem value="pro">Pro</SelectItem>
            <SelectItem value="enterprise">Enterprise</SelectItem>
          </SelectContent>
        </Select>
        
        <Button
          variant="outline"
          size="sm"
          onClick={() => setShowAddCreditsModal(true)}
          className="h-8"
        >
          <Plus className="w-3 h-3" />
        </Button>
        
        <Button
          variant="outline"
          size="sm"
          onClick={handleResetCredits}
          disabled={resettingCredits}
          className="h-8"
        >
          {resettingCredits ? (
            <Loader2 className="w-3 h-3 animate-spin" />
          ) : (
            <RotateCcw className="w-3 h-3" />
          )}
        </Button>
        
        {(updating || updatingSubscription) && <Loader2 className="w-4 h-4 animate-spin" />}
      </div>
      
      <AddCreditsModal
        open={showAddCreditsModal}
        onOpenChange={setShowAddCreditsModal}
        userId={user.id}
        userEmail={user.email}
        currentCreditsUsed={user.credits_used || 0}
        onSuccess={onUserUpdate}
      />
    </div>
  );
};