export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "13.0.4"
  }
  public: {
    Tables: {
      anonymous_image_sessions: {
        Row: {
          created_at: string
          expires_at: string
          id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          expires_at?: string
          id?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          expires_at?: string
          id?: string
          updated_at?: string
        }
        Relationships: []
      }
      anonymous_image_versions: {
        Row: {
          created_at: string
          id: string
          image_url: string
          model_used: string | null
          parent_id: string | null
          processing_time_ms: number | null
          prompt: string
          session_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          image_url: string
          model_used?: string | null
          parent_id?: string | null
          processing_time_ms?: number | null
          prompt: string
          session_id: string
        }
        Update: {
          created_at?: string
          id?: string
          image_url?: string
          model_used?: string | null
          parent_id?: string | null
          processing_time_ms?: number | null
          prompt?: string
          session_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "anonymous_image_versions_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "anonymous_image_versions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "anonymous_image_versions_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "anonymous_image_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      available_models: {
        Row: {
          created_at: string
          enabled: boolean
          id: string
          is_default: boolean
          label: string
          model_id: string
          notes: string | null
          pricing_hint: string | null
          provider: Database["public"]["Enums"]["ai_provider"]
          sort_order: number
          task: Database["public"]["Enums"]["ai_task"]
          updated_at: string
        }
        Insert: {
          created_at?: string
          enabled?: boolean
          id?: string
          is_default?: boolean
          label: string
          model_id: string
          notes?: string | null
          pricing_hint?: string | null
          provider: Database["public"]["Enums"]["ai_provider"]
          sort_order?: number
          task: Database["public"]["Enums"]["ai_task"]
          updated_at?: string
        }
        Update: {
          created_at?: string
          enabled?: boolean
          id?: string
          is_default?: boolean
          label?: string
          model_id?: string
          notes?: string | null
          pricing_hint?: string | null
          provider?: Database["public"]["Enums"]["ai_provider"]
          sort_order?: number
          task?: Database["public"]["Enums"]["ai_task"]
          updated_at?: string
        }
        Relationships: []
      }
      image_sessions: {
        Row: {
          created_at: string
          id: string
          updated_at: string
          user_id: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          updated_at?: string
          user_id?: string | null
        }
        Relationships: []
      }
      image_versions: {
        Row: {
          created_at: string
          id: string
          image_url: string
          model_used: string | null
          parent_id: string | null
          processing_time_ms: number | null
          prompt: string
          session_id: string
          user_id: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          image_url: string
          model_used?: string | null
          parent_id?: string | null
          processing_time_ms?: number | null
          prompt: string
          session_id: string
          user_id?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          image_url?: string
          model_used?: string | null
          parent_id?: string | null
          processing_time_ms?: number | null
          prompt?: string
          session_id?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "image_versions_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "image_versions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "image_versions_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "image_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      user_activity_logs: {
        Row: {
          activity_type: string
          created_at: string
          id: string
          metadata: Json | null
          user_id: string
        }
        Insert: {
          activity_type: string
          created_at?: string
          id?: string
          metadata?: Json | null
          user_id: string
        }
        Update: {
          activity_type?: string
          created_at?: string
          id?: string
          metadata?: Json | null
          user_id?: string
        }
        Relationships: []
      }
      user_api_keys: {
        Row: {
          created_at: string
          encrypted_key: string
          id: string
          key_hint: string
          provider: Database["public"]["Enums"]["ai_provider"]
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          encrypted_key: string
          id?: string
          key_hint: string
          provider: Database["public"]["Enums"]["ai_provider"]
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          encrypted_key?: string
          id?: string
          key_hint?: string
          provider?: Database["public"]["Enums"]["ai_provider"]
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      user_credits: {
        Row: {
          created_at: string
          credits_limit: number
          credits_used: number
          email: string
          id: string
          reset_date: string
          updated_at: string
          user_id: string | null
        }
        Insert: {
          created_at?: string
          credits_limit?: number
          credits_used?: number
          email: string
          id?: string
          reset_date?: string
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          created_at?: string
          credits_limit?: number
          credits_used?: number
          email?: string
          id?: string
          reset_date?: string
          updated_at?: string
          user_id?: string | null
        }
        Relationships: []
      }
      user_model_preferences: {
        Row: {
          created_at: string
          id: string
          model_id: string
          provider: Database["public"]["Enums"]["ai_provider"]
          task: Database["public"]["Enums"]["ai_task"]
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          model_id: string
          provider: Database["public"]["Enums"]["ai_provider"]
          task: Database["public"]["Enums"]["ai_task"]
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          model_id?: string
          provider?: Database["public"]["Enums"]["ai_provider"]
          task?: Database["public"]["Enums"]["ai_task"]
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      user_projects: {
        Row: {
          created_at: string
          description: string | null
          id: string
          name: string
          project_data: Json
          thumbnail: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          name: string
          project_data: Json
          thumbnail?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          name?: string
          project_data?: Json
          thumbnail?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      user_prompt_snippets: {
        Row: {
          content: string
          created_at: string
          id: string
          name: string
          updated_at: string
          user_id: string
        }
        Insert: {
          content: string
          created_at?: string
          id?: string
          name: string
          updated_at?: string
          user_id: string
        }
        Update: {
          content?: string
          created_at?: string
          id?: string
          name?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      user_subscriptions: {
        Row: {
          created_at: string
          email: string
          id: string
          onboarding_completed_at: string | null
          stripe_customer_id: string | null
          stripe_subscription_id: string | null
          subscription_end: string | null
          subscription_start: string | null
          subscription_status: string
          subscription_tier: string
          trial_ends_at: string | null
          updated_at: string
          user_id: string | null
        }
        Insert: {
          created_at?: string
          email: string
          id?: string
          onboarding_completed_at?: string | null
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
          subscription_end?: string | null
          subscription_start?: string | null
          subscription_status?: string
          subscription_tier?: string
          trial_ends_at?: string | null
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          onboarding_completed_at?: string | null
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
          subscription_end?: string | null
          subscription_start?: string | null
          subscription_status?: string
          subscription_tier?: string
          trial_ends_at?: string | null
          updated_at?: string
          user_id?: string | null
        }
        Relationships: []
      }
      user_workflows: {
        Row: {
          created_at: string
          id: string
          name: string
          updated_at: string
          user_id: string
          workflow_data: Json
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
          updated_at?: string
          user_id: string
          workflow_data: Json
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
          updated_at?: string
          user_id?: string
          workflow_data?: Json
        }
        Relationships: []
      }
      video_generation_jobs: {
        Row: {
          aspect_ratio: string
          created_at: string
          credits_used: number | null
          duration: string
          error_message: string | null
          id: string
          model: string
          negative_prompt: string | null
          processing_time_ms: number | null
          prompt: string
          quality: string
          status: string
          updated_at: string
          user_id: string | null
          video_url: string | null
        }
        Insert: {
          aspect_ratio?: string
          created_at?: string
          credits_used?: number | null
          duration?: string
          error_message?: string | null
          id?: string
          model?: string
          negative_prompt?: string | null
          processing_time_ms?: number | null
          prompt: string
          quality?: string
          status?: string
          updated_at?: string
          user_id?: string | null
          video_url?: string | null
        }
        Update: {
          aspect_ratio?: string
          created_at?: string
          credits_used?: number | null
          duration?: string
          error_message?: string | null
          id?: string
          model?: string
          negative_prompt?: string | null
          processing_time_ms?: number | null
          prompt?: string
          quality?: string
          status?: string
          updated_at?: string
          user_id?: string | null
          video_url?: string | null
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      cleanup_expired_anonymous_sessions: { Args: never; Returns: undefined }
      get_current_user_role: {
        Args: never
        Returns: Database["public"]["Enums"]["app_role"]
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_admin: { Args: never; Returns: boolean }
      reset_monthly_credits: { Args: never; Returns: undefined }
    }
    Enums: {
      ai_provider:
        | "openrouter"
        | "gemini"
        | "openai"
        | "replicate"
        | "anthropic"
        | "lovable"
      ai_task:
        | "image_generate"
        | "image_edit"
        | "text"
        | "html"
        | "strategy"
        | "upscale"
        | "url_context"
      app_role: "admin" | "user"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      ai_provider: [
        "openrouter",
        "gemini",
        "openai",
        "replicate",
        "anthropic",
        "lovable",
      ],
      ai_task: [
        "image_generate",
        "image_edit",
        "text",
        "html",
        "strategy",
        "upscale",
        "url_context",
      ],
      app_role: ["admin", "user"],
    },
  },
} as const
