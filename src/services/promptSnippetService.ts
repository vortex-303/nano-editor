import { snippetStore, putRecord, getRecord, deleteRecord, listRecords, newId } from '@/lib/localDb';

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
    const all = await listRecords<PromptSnippet>(snippetStore);
    return all.sort((a, b) => b.updated_at.localeCompare(a.updated_at));
  },

  async saveSnippet(name: string, content: string): Promise<PromptSnippet> {
    const now = new Date().toISOString();
    const snippet: PromptSnippet = {
      id: newId(),
      user_id: 'local',
      name: name.trim(),
      content: content.trim(),
      created_at: now,
      updated_at: now,
    };
    await putRecord(snippetStore, snippet.id, snippet);
    return snippet;
  },

  async updateSnippet(snippetId: string, name: string, content: string): Promise<PromptSnippet> {
    const existing = await getRecord<PromptSnippet>(snippetStore, snippetId);
    if (!existing) throw new Error('Snippet not found');

    const updated: PromptSnippet = {
      ...existing,
      name: name.trim(),
      content: content.trim(),
      updated_at: new Date().toISOString(),
    };
    await putRecord(snippetStore, snippetId, updated);
    return updated;
  },

  async deleteSnippet(snippetId: string): Promise<void> {
    await deleteRecord(snippetStore, snippetId);
  },
};
