import { supabase } from '@/integrations/supabase/client';

export interface PromptSnippet {
  id: string;
  user_id: string;
  name: string;
  content: string;
  created_at: string;
  updated_at: string;
}

export const PromptSnippetService = {
  async listSnippets(): Promise<PromptSnippet[]> {
    const { data, error } = await supabase
      .from('user_prompt_snippets')
      .select('*')
      .order('updated_at', { ascending: false });

    if (error) throw error;
    return data || [];
  },

  async saveSnippet(name: string, content: string): Promise<PromptSnippet> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated');

    const { data, error } = await supabase
      .from('user_prompt_snippets')
      .insert({
        user_id: user.id,
        name: name.trim(),
        content: content.trim(),
      })
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  async updateSnippet(snippetId: string, name: string, content: string): Promise<PromptSnippet> {
    const { data, error } = await supabase
      .from('user_prompt_snippets')
      .update({
        name: name.trim(),
        content: content.trim(),
      })
      .eq('id', snippetId)
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  async deleteSnippet(snippetId: string): Promise<void> {
    const { error } = await supabase
      .from('user_prompt_snippets')
      .delete()
      .eq('id', snippetId);

    if (error) throw error;
  },
};
