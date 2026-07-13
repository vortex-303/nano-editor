import { useState, useCallback } from 'react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { ImageSession, ImageVersion, EditingState } from '@/types/imageEditor';

export const useImageEditor = () => {
  const [state, setState] = useState<EditingState>({
    currentSession: null,
    currentVersionId: null,
    isGenerating: false,
    history: [],
  });

  const createSession = useCallback(async (): Promise<string> => {
    try {
      // Check if user is authenticated
      const { data: { user } } = await supabase.auth.getUser();
      
      if (user) {
        // Create authenticated session
        const { data, error } = await supabase
          .from('image_sessions')
          .insert({ user_id: user.id })
          .select()
          .single();

        if (error) throw error;

        setState(prev => ({
          ...prev,
          currentSession: { ...data, versions: [] },
        }));

        return data.id;
      } else {
        // Create anonymous session
        const { data, error } = await supabase
          .from('anonymous_image_sessions')
          .insert({})
          .select()
          .single();

        if (error) throw error;

        setState(prev => ({
          ...prev,
          currentSession: { ...data, versions: [], user_id: null },
        }));

        return data.id;
      }
    } catch (error) {
      console.error('Error creating session:', error);
      toast.error('Failed to create editing session');
      throw error;
    }
  }, []);

  const addVersion = useCallback(async (
    sessionId: string,
    imageUrl: string,
    prompt: string,
    parentId?: string,
    processingTime?: number
  ): Promise<ImageVersion> => {
    try {
      // Check if user is authenticated
      const { data: { user } } = await supabase.auth.getUser();
      
      if (user) {
        // Add to authenticated versions
        const { data, error } = await supabase
          .from('image_versions')
          .insert({
            session_id: sessionId,
            user_id: user.id,
            image_url: imageUrl,
            prompt,
            parent_id: parentId,
            processing_time_ms: processingTime,
          })
          .select()
          .single();

        if (error) throw error;

        const newVersion = data as ImageVersion;

        setState(prev => ({
          ...prev,
          history: [...prev.history, newVersion],
          currentVersionId: newVersion.id,
          currentSession: prev.currentSession ? {
            ...prev.currentSession,
            versions: [...prev.currentSession.versions, newVersion],
          } : null,
        }));

        return newVersion;
      } else {
        // Add to anonymous versions
        const { data, error } = await supabase
          .from('anonymous_image_versions')
          .insert({
            session_id: sessionId,
            image_url: imageUrl,
            prompt,
            parent_id: parentId,
            processing_time_ms: processingTime,
          })
          .select()
          .single();

        if (error) throw error;

        const newVersion = { ...data, user_id: null } as ImageVersion;

        setState(prev => ({
          ...prev,
          history: [...prev.history, newVersion],
          currentVersionId: newVersion.id,
          currentSession: prev.currentSession ? {
            ...prev.currentSession,
            versions: [...prev.currentSession.versions, newVersion],
          } : null,
        }));

        return newVersion;
      }
    } catch (error) {
      console.error('Error adding version:', error);
      toast.error('Failed to save image version');
      throw error;
    }
  }, []);

  const setGenerating = useCallback((isGenerating: boolean) => {
    setState(prev => ({ ...prev, isGenerating }));
  }, []);

  const jumpToVersion = useCallback((versionId: string) => {
    setState(prev => ({ ...prev, currentVersionId: versionId }));
  }, []);

  const getCurrentVersion = useCallback((): ImageVersion | null => {
    if (!state.currentVersionId) return null;
    return state.history.find(v => v.id === state.currentVersionId) || null;
  }, [state.currentVersionId, state.history]);

  return {
    state,
    createSession,
    addVersion,
    setGenerating,
    jumpToVersion,
    getCurrentVersion,
  };
};