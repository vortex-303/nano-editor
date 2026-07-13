import { supabase } from "@/integrations/supabase/client";

export type AppRole = 'admin' | 'user';

export interface UserRole {
  id: string;
  user_id: string;
  role: AppRole;
  created_at: string;
  updated_at: string;
}

export interface UserWithRole {
  id: string;
  email: string;
  created_at: string;
  role: AppRole;
  credits_used?: number;
  credits_limit?: number;
  subscription_status?: string;
  subscription_tier?: string;
  // Extended metrics
  total_generations?: number;
  total_projects?: number;
  total_workflows?: number;
  last_activity?: string;
  video_generations?: number;
}

export class RoleService {
  static async getCurrentUserRole(): Promise<{ success: boolean; role?: AppRole; error?: string }> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        return { success: false, error: 'User not authenticated' };
      }

      const { data, error } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', user.id)
        .single();

      if (error) {
        return { success: false, error: error.message };
      }

      return { success: true, role: data.role as AppRole };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to get user role'
      };
    }
  }

  static async isAdmin(): Promise<boolean> {
    const result = await this.getCurrentUserRole();
    return result.success && result.role === 'admin';
  }

  static async getAllUsers(): Promise<{ success: boolean; users?: UserWithRole[]; error?: string }> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        return { success: false, error: 'User not authenticated' };
      }

      // Check if current user is admin
      const isAdminUser = await this.isAdmin();
      if (!isAdminUser) {
        return { success: false, error: 'Unauthorized: Admin access required' };
      }

      // Get all users from credits table (which has all registered users)
      const { data: creditsData, error: creditsError } = await supabase
        .from('user_credits')
        .select('user_id, email, credits_used, credits_limit, created_at');

      if (creditsError) {
        return { success: false, error: creditsError.message };
      }

      // Get all user roles
      const { data: rolesData, error: rolesError } = await supabase
        .from('user_roles')
        .select('user_id, role');

      // Get all subscriptions data
      const { data: subscriptionsData, error: subscriptionsError } = await supabase
        .from('user_subscriptions')
        .select('user_id, subscription_status, subscription_tier');

      // Get generation counts per user
      const { data: generationsData } = await supabase
        .from('image_versions')
        .select('user_id, created_at');

      // Get projects count per user
      const { data: projectsData } = await supabase
        .from('user_projects')
        .select('user_id');

      // Get workflows count per user
      const { data: workflowsData } = await supabase
        .from('user_workflows')
        .select('user_id');

      // Get video generation counts per user
      const { data: videoData } = await supabase
        .from('video_generation_jobs')
        .select('user_id');

      // Build metrics maps
      const generationsMap = new Map<string, { count: number; lastActivity: string }>();
      generationsData?.forEach(gen => {
        if (!gen.user_id) return;
        const existing = generationsMap.get(gen.user_id);
        if (existing) {
          existing.count++;
          if (new Date(gen.created_at) > new Date(existing.lastActivity)) {
            existing.lastActivity = gen.created_at;
          }
        } else {
          generationsMap.set(gen.user_id, { count: 1, lastActivity: gen.created_at });
        }
      });

      const projectsMap = new Map<string, number>();
      projectsData?.forEach(p => {
        projectsMap.set(p.user_id, (projectsMap.get(p.user_id) || 0) + 1);
      });

      const workflowsMap = new Map<string, number>();
      workflowsData?.forEach(w => {
        workflowsMap.set(w.user_id, (workflowsMap.get(w.user_id) || 0) + 1);
      });

      const videoMap = new Map<string, number>();
      videoData?.forEach(v => {
        if (v.user_id) {
          videoMap.set(v.user_id, (videoMap.get(v.user_id) || 0) + 1);
        }
      });

      // Combine the data - use credits as the main source since all users have credits
      const users: UserWithRole[] = creditsData?.map((creditItem: any) => {
        const role = rolesData?.find(r => r.user_id === creditItem.user_id);
        const subscription = subscriptionsData?.find(s => s.user_id === creditItem.user_id);
        const genData = generationsMap.get(creditItem.user_id);
        
        return {
          id: creditItem.user_id,
          email: creditItem.email,
          created_at: creditItem.created_at,
          role: (role?.role as AppRole) || 'user',
          credits_used: creditItem.credits_used,
          credits_limit: creditItem.credits_limit,
          subscription_status: subscription?.subscription_status || 'inactive',
          subscription_tier: subscription?.subscription_tier || 'free',
          total_generations: genData?.count || 0,
          total_projects: projectsMap.get(creditItem.user_id) || 0,
          total_workflows: workflowsMap.get(creditItem.user_id) || 0,
          last_activity: genData?.lastActivity || creditItem.created_at,
          video_generations: videoMap.get(creditItem.user_id) || 0
        };
      }) || [];

      // Sort by last activity (most recent first)
      users.sort((a, b) => {
        const dateA = new Date(a.last_activity || a.created_at);
        const dateB = new Date(b.last_activity || b.created_at);
        return dateB.getTime() - dateA.getTime();
      });

      return { success: true, users };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to get users'
      };
    }
  }

  static async updateUserRole(userId: string, role: AppRole): Promise<{ success: boolean; error?: string }> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        return { success: false, error: 'User not authenticated' };
      }

      // Check if current user is admin
      const isAdminUser = await this.isAdmin();
      if (!isAdminUser) {
        return { success: false, error: 'Unauthorized: Admin access required' };
      }

      const { error } = await supabase
        .from('user_roles')
        .upsert({ 
          user_id: userId, 
          role: role 
        }, { 
          onConflict: 'user_id,role' 
        });

      if (error) {
        return { success: false, error: error.message };
      }

      return { success: true };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to update user role'
      };
    }
  }
}