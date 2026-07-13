import { supabase } from "@/integrations/supabase/client";

export interface GenerationTrend {
  date: string;
  authenticated: number;
  anonymous: number;
  total: number;
}

export interface ModelUsageStat {
  model: string;
  count: number;
  percentage: number;
}

export interface UserEngagementStats {
  totalUsers: number;
  activeUsersToday: number;
  activeUsersWeek: number;
  activeUsersMonth: number;
  averageGenerationsPerUser: number;
  conversionRate: number;
}

export interface TopUser {
  user_id: string;
  email: string;
  total_generations: number;
  total_projects: number;
  total_workflows: number;
  last_activity: string;
  subscription_tier: string;
}

export interface UserGenerationHistory {
  id: string;
  prompt: string;
  image_url: string;
  model_used: string;
  processing_time_ms: number | null;
  created_at: string;
}

export interface ProcessingTimeStats {
  average: number;
  min: number;
  max: number;
  p50: number;
  p95: number;
}

export interface VideoGenerationStats {
  total: number;
  completed: number;
  failed: number;
  pending: number;
  avgCreditsUsed: number;
}

export class AdminAnalyticsService {
  static async getGenerationTrends(days: number = 30): Promise<{ success: boolean; data?: GenerationTrend[]; error?: string }> {
    try {
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - days);
      const startDateStr = startDate.toISOString();

      // Get authenticated generations
      const { data: authData, error: authError } = await supabase
        .from('image_versions')
        .select('created_at')
        .gte('created_at', startDateStr);

      if (authError) throw authError;

      // Get anonymous generations
      const { data: anonData, error: anonError } = await supabase
        .from('anonymous_image_versions')
        .select('created_at')
        .gte('created_at', startDateStr);

      if (anonError) throw anonError;

      // Group by date
      const dateMap = new Map<string, { authenticated: number; anonymous: number }>();
      
      // Initialize all dates in range
      for (let i = 0; i < days; i++) {
        const date = new Date();
        date.setDate(date.getDate() - i);
        const dateStr = date.toISOString().split('T')[0];
        dateMap.set(dateStr, { authenticated: 0, anonymous: 0 });
      }

      // Count authenticated
      authData?.forEach(item => {
        const dateStr = new Date(item.created_at).toISOString().split('T')[0];
        const existing = dateMap.get(dateStr);
        if (existing) {
          existing.authenticated++;
        }
      });

      // Count anonymous
      anonData?.forEach(item => {
        const dateStr = new Date(item.created_at).toISOString().split('T')[0];
        const existing = dateMap.get(dateStr);
        if (existing) {
          existing.anonymous++;
        }
      });

      // Convert to array and sort
      const trends: GenerationTrend[] = Array.from(dateMap.entries())
        .map(([date, counts]) => ({
          date,
          authenticated: counts.authenticated,
          anonymous: counts.anonymous,
          total: counts.authenticated + counts.anonymous
        }))
        .sort((a, b) => a.date.localeCompare(b.date));

      return { success: true, data: trends };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to get generation trends'
      };
    }
  }

  static async getModelUsageStats(): Promise<{ success: boolean; data?: ModelUsageStat[]; error?: string }> {
    try {
      const { data: authData, error: authError } = await supabase
        .from('image_versions')
        .select('model_used');

      if (authError) throw authError;

      const { data: anonData, error: anonError } = await supabase
        .from('anonymous_image_versions')
        .select('model_used');

      if (anonError) throw anonError;

      // Count models
      const modelCounts = new Map<string, number>();
      
      [...(authData || []), ...(anonData || [])].forEach(item => {
        const model = item.model_used || 'unknown';
        modelCounts.set(model, (modelCounts.get(model) || 0) + 1);
      });

      const total = Array.from(modelCounts.values()).reduce((a, b) => a + b, 0);

      const stats: ModelUsageStat[] = Array.from(modelCounts.entries())
        .map(([model, count]) => ({
          model,
          count,
          percentage: total > 0 ? Math.round((count / total) * 100) : 0
        }))
        .sort((a, b) => b.count - a.count);

      return { success: true, data: stats };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to get model usage stats'
      };
    }
  }

  static async getUserEngagementStats(): Promise<{ success: boolean; data?: UserEngagementStats; error?: string }> {
    try {
      const now = new Date();
      const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();
      const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString();
      const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString();

      // Get total users
      const { data: usersData } = await supabase
        .from('user_credits')
        .select('user_id');

      const totalUsers = usersData?.length || 0;

      // Get generations with user_id to find active users
      const { data: todayGens } = await supabase
        .from('image_versions')
        .select('user_id')
        .gte('created_at', todayStart);

      const { data: weekGens } = await supabase
        .from('image_versions')
        .select('user_id')
        .gte('created_at', weekAgo);

      const { data: monthGens } = await supabase
        .from('image_versions')
        .select('user_id')
        .gte('created_at', monthAgo);

      // Get total authenticated generations
      const { data: allAuthGens } = await supabase
        .from('image_versions')
        .select('id');

      // Get total anonymous sessions converted (have user_id)
      const { data: totalSessions } = await supabase
        .from('image_sessions')
        .select('id');

      const { data: anonSessions } = await supabase
        .from('anonymous_image_sessions')
        .select('id');

      const activeUsersToday = new Set(todayGens?.map(g => g.user_id).filter(Boolean)).size;
      const activeUsersWeek = new Set(weekGens?.map(g => g.user_id).filter(Boolean)).size;
      const activeUsersMonth = new Set(monthGens?.map(g => g.user_id).filter(Boolean)).size;

      const totalGenerations = allAuthGens?.length || 0;
      const averageGenerationsPerUser = totalUsers > 0 ? Math.round(totalGenerations / totalUsers) : 0;

      const authSessionCount = totalSessions?.length || 0;
      const anonSessionCount = anonSessions?.length || 0;
      const totalSessionCount = authSessionCount + anonSessionCount;
      const conversionRate = totalSessionCount > 0 ? Math.round((authSessionCount / totalSessionCount) * 100) : 0;

      return {
        success: true,
        data: {
          totalUsers,
          activeUsersToday,
          activeUsersWeek,
          activeUsersMonth,
          averageGenerationsPerUser,
          conversionRate
        }
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to get user engagement stats'
      };
    }
  }

  static async getTopUsers(limit: number = 10): Promise<{ success: boolean; data?: TopUser[]; error?: string }> {
    try {
      // Get all user credits for email lookup
      const { data: creditsData, error: creditsError } = await supabase
        .from('user_credits')
        .select('user_id, email');

      if (creditsError) throw creditsError;

      // Get subscription data
      const { data: subsData } = await supabase
        .from('user_subscriptions')
        .select('user_id, subscription_tier');

      // Get all generations grouped by user
      const { data: gensData } = await supabase
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

      // Build user stats
      const userStatsMap = new Map<string, {
        total_generations: number;
        total_projects: number;
        total_workflows: number;
        last_activity: string;
      }>();

      // Count generations
      gensData?.forEach(gen => {
        if (!gen.user_id) return;
        const existing = userStatsMap.get(gen.user_id) || {
          total_generations: 0,
          total_projects: 0,
          total_workflows: 0,
          last_activity: gen.created_at
        };
        existing.total_generations++;
        if (new Date(gen.created_at) > new Date(existing.last_activity)) {
          existing.last_activity = gen.created_at;
        }
        userStatsMap.set(gen.user_id, existing);
      });

      // Count projects
      projectsData?.forEach(proj => {
        const existing = userStatsMap.get(proj.user_id);
        if (existing) {
          existing.total_projects++;
        }
      });

      // Count workflows
      workflowsData?.forEach(wf => {
        const existing = userStatsMap.get(wf.user_id);
        if (existing) {
          existing.total_workflows++;
        }
      });

      // Build final array
      const topUsers: TopUser[] = Array.from(userStatsMap.entries())
        .map(([user_id, stats]) => {
          const credit = creditsData?.find(c => c.user_id === user_id);
          const sub = subsData?.find(s => s.user_id === user_id);
          return {
            user_id,
            email: credit?.email || 'Unknown',
            total_generations: stats.total_generations,
            total_projects: stats.total_projects,
            total_workflows: stats.total_workflows,
            last_activity: stats.last_activity,
            subscription_tier: sub?.subscription_tier || 'free'
          };
        })
        .sort((a, b) => b.total_generations - a.total_generations)
        .slice(0, limit);

      return { success: true, data: topUsers };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to get top users'
      };
    }
  }

  static async getUserGenerationHistory(userId: string, limit: number = 20): Promise<{ success: boolean; data?: UserGenerationHistory[]; error?: string }> {
    try {
      const { data, error } = await supabase
        .from('image_versions')
        .select('id, prompt, image_url, model_used, processing_time_ms, created_at')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(limit);

      if (error) throw error;

      return { success: true, data: data || [] };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to get user generation history'
      };
    }
  }

  static async getProcessingTimeStats(): Promise<{ success: boolean; data?: ProcessingTimeStats; error?: string }> {
    try {
      const { data, error } = await supabase
        .from('image_versions')
        .select('processing_time_ms')
        .not('processing_time_ms', 'is', null);

      if (error) throw error;

      const times = data?.map(d => d.processing_time_ms).filter((t): t is number => t !== null) || [];
      
      if (times.length === 0) {
        return {
          success: true,
          data: { average: 0, min: 0, max: 0, p50: 0, p95: 0 }
        };
      }

      times.sort((a, b) => a - b);
      
      const sum = times.reduce((a, b) => a + b, 0);
      const average = Math.round(sum / times.length);
      const min = times[0];
      const max = times[times.length - 1];
      const p50 = times[Math.floor(times.length * 0.5)];
      const p95 = times[Math.floor(times.length * 0.95)];

      return {
        success: true,
        data: { average, min, max, p50, p95 }
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to get processing time stats'
      };
    }
  }

  static async getVideoGenerationStats(): Promise<{ success: boolean; data?: VideoGenerationStats; error?: string }> {
    try {
      const { data, error } = await supabase
        .from('video_generation_jobs')
        .select('status, credits_used');

      if (error) throw error;

      const total = data?.length || 0;
      const completed = data?.filter(d => d.status === 'completed').length || 0;
      const failed = data?.filter(d => d.status === 'failed').length || 0;
      const pending = data?.filter(d => d.status === 'pending' || d.status === 'processing').length || 0;
      
      const creditsUsed = data?.filter(d => d.credits_used).map(d => d.credits_used!) || [];
      const avgCreditsUsed = creditsUsed.length > 0 
        ? Math.round(creditsUsed.reduce((a, b) => a + b, 0) / creditsUsed.length) 
        : 0;

      return {
        success: true,
        data: { total, completed, failed, pending, avgCreditsUsed }
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to get video generation stats'
      };
    }
  }

  static async getPromptStats(): Promise<{ success: boolean; data?: { totalPrompts: number; avgLength: number; uniquePrompts: number }; error?: string }> {
    try {
      const { data: authData } = await supabase
        .from('image_versions')
        .select('prompt');

      const { data: anonData } = await supabase
        .from('anonymous_image_versions')
        .select('prompt');

      const allPrompts = [...(authData || []), ...(anonData || [])].map(d => d.prompt);
      const totalPrompts = allPrompts.length;
      const avgLength = totalPrompts > 0 
        ? Math.round(allPrompts.reduce((sum, p) => sum + (p?.length || 0), 0) / totalPrompts) 
        : 0;
      const uniquePrompts = new Set(allPrompts).size;

      return {
        success: true,
        data: { totalPrompts, avgLength, uniquePrompts }
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to get prompt stats'
      };
    }
  }
}
