import { supabase } from "@/integrations/supabase/client";

// Anonymous users are no longer allowed to generate images
// All image generation now requires authentication
export class CreditService {

  // Get user credits info
  static async getUserCredits(userId: string): Promise<{ credits_used: number; credits_limit: number } | null> {
    try {
      const { data, error } = await supabase
        .from('user_credits')
        .select('credits_used, credits_limit')
        .eq('user_id', userId)
        .single();

      if (error || !data) {
        console.error('Error fetching user credits:', error);
        return null;
      }

      return { credits_used: data.credits_used, credits_limit: data.credits_limit };
    } catch (error) {
      console.error('Error in getUserCredits:', error);
      return null;
    }
  }

  // Authenticated user credit checking
  static async canUserGenerate(userId: string): Promise<{ canGenerate: boolean; reason?: string }> {
    try {
      // Check if user is admin first
      const { data: roleData } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', userId)
        .single();

      // Admin users have unlimited credits
      if (roleData?.role === 'admin') {
        return { canGenerate: true };
      }

      const { data, error } = await supabase
        .from('user_credits')
        .select('credits_used, credits_limit')
        .eq('user_id', userId)
        .single();

      if (error) {
        console.error('Error checking user credits:', error);
        return { canGenerate: false, reason: 'Error checking credits' };
      }

      if (!data) {
        return { canGenerate: false, reason: 'User credits not found' };
      }

      if (data.credits_used >= data.credits_limit) {
        return { canGenerate: false, reason: 'Credit limit reached' };
      }

      return { canGenerate: true };
    } catch (error) {
      console.error('Error in canUserGenerate:', error);
      return { canGenerate: false, reason: 'Unexpected error' };
    }
  }

  // Store anonymous session in database for tracking
  static async storeAnonymousSession(sessionId: string): Promise<void> {
    try {
      await supabase
        .from('anonymous_image_sessions')
        .upsert({
          id: sessionId,
          expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
        });
    } catch (error) {
      console.error('Error storing anonymous session:', error);
    }
  }

  // Track anonymous generation
  static async trackAnonymousGeneration(sessionId: string, imageUrl: string, prompt: string): Promise<void> {
    try {
      await supabase
        .from('anonymous_image_versions')
        .insert({
          session_id: sessionId,
          image_url: imageUrl,
          prompt: prompt,
          model_used: 'gemini-2.5-flash-image-preview'
        });
    } catch (error) {
      console.error('Error tracking anonymous generation:', error);
    }
  }
}