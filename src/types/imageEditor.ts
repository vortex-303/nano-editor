export interface ImageVersion {
  id: string;
  session_id: string;
  user_id: string | null;
  image_url: string;
  prompt: string;
  parent_id?: string;
  processing_time_ms?: number;
  model_used: string;
  created_at: string;
}

export interface ImageSession {
  id: string;
  user_id: string | null;
  created_at: string;
  updated_at: string;
  versions: ImageVersion[];
}

export interface EditingState {
  currentSession: ImageSession | null;
  currentVersionId: string | null;
  isGenerating: boolean;
  history: ImageVersion[];
}