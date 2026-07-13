import { useState, useEffect } from 'react';
import { RoleService, AppRole } from '@/services/roleService';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';

export const useRole = () => {
  const [role, setRole] = useState<AppRole | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const { user } = useAuth();
  const { toast } = useToast();

  const loadRole = async () => {
    setIsLoading(true);
    try {
      // Clear role data immediately if no user
      if (!user) {
        console.log('useRole: No user, clearing role data');
        setRole(null);
        setIsAdmin(false);
        setIsLoading(false);
        return;
      }

      console.log('useRole: Loading role for user:', user.id);
      const result = await RoleService.getCurrentUserRole();
      if (result.success && result.role) {
        console.log('useRole: Role loaded:', result.role);
        setRole(result.role);
        setIsAdmin(result.role === 'admin');
      } else {
        console.log('useRole: No role found, defaulting to user');
        setRole('user'); // Default to user role
        setIsAdmin(false);
      }
    } catch (error) {
      console.error('Failed to load user role:', error);
      setRole(user ? 'user' : null); // Default to user role on error if logged in
      setIsAdmin(false);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    console.log('useRole: useEffect triggered, user:', !!user);
    loadRole();
  }, [user]); // Reload role when user changes

  const refreshRole = () => {
    loadRole();
  };

  return {
    role,
    isAdmin,
    isLoading,
    refreshRole
  };
};