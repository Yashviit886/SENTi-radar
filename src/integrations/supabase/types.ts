export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.4";
  };
  public: {
    Tables: {
      alerts: {
        Row: {
          alert_type: string;
          created_at: string;
          id: string;
          is_read: boolean | null;
          message: string;
          severity: Database["public"]["Enums"]["crisis_level_type"] | null;
          topic_id: string | null;
        };
        Insert: {
          alert_type: string;
          created_at?: string;
          id?: string;
          is_read?: boolean | null;
          message: string;
          severity?: Database["public"]["Enums"]["crisis_level_type"] | null;
          topic_id?: string | null;
        };
        Update: {
          alert_type?: string;
          created_at?: string;
          id?: string;
          is_read?: boolean | null;
          message?: string;
          severity?: Database["public"]["Enums"]["crisis_level_type"] | null;
          topic_id?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "alerts_topic_id_fkey";
            columns: ["topic_id"];
            isOneToOne: false;
            referencedRelation: "topics";
            referencedColumns: ["id"];
          },
        ];
      };
      posts: {
        Row: {
          author: string;
          content: string;
          emotion_scores: Json | null;
          external_id: string;
          fetched_at: string;
          id: string;
          platform: Database["public"]["Enums"]["platform_type"];
          posted_at: string | null;
          primary_emotion: Database["public"]["Enums"]["emotion_type"] | null;
          sentiment: Database["public"]["Enums"]["sentiment_type"] | null;
          topic_id: string;
        };
        Insert: {
          author: string;
          content: string;
          emotion_scores?: Json | null;
          external_id: string;
          fetched_at?: string;
          id?: string;
          platform: Database["public"]["Enums"]["platform_type"];
          posted_at?: string | null;
          primary_emotion?: Database["public"]["Enums"]["emotion_type"] | null;
          sentiment?: Database["public"]["Enums"]["sentiment_type"] | null;
          topic_id: string;
        };
        Update: {
          author?: string;
          content?: string;
          emotion_scores?: Json | null;
          external_id?: string;
          fetched_at?: string;
          id?: string;
          platform?: Database["public"]["Enums"]["platform_type"];
          posted_at?: string | null;
          primary_emotion?: Database["public"]["Enums"]["emotion_type"] | null;
          sentiment?: Database["public"]["Enums"]["sentiment_type"] | null;
          topic_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "posts_topic_id_fkey";
            columns: ["topic_id"];
            isOneToOne: false;
            referencedRelation: "topics";
            referencedColumns: ["id"];
          },
        ];
      };
      profiles: {
        Row: {
          avatar_url: string | null;
          created_at: string;
          display_name: string | null;
          id: string;
          updated_at: string;
        };
        Insert: {
          avatar_url?: string | null;
          created_at?: string;
          display_name?: string | null;
          id: string;
          updated_at?: string;
        };
        Update: {
          avatar_url?: string | null;
          created_at?: string;
          display_name?: string | null;
          id?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      saved_topics: {
        Row: {
          id: string;
          saved_at: string;
          topic_id: string;
          user_id: string;
        };
        Insert: {
          id?: string;
          saved_at?: string;
          topic_id: string;
          user_id: string;
        };
        Update: {
          id?: string;
          saved_at?: string;
          topic_id?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "saved_topics_topic_id_fkey";
            columns: ["topic_id"];
            isOneToOne: false;
            referencedRelation: "topics";
            referencedColumns: ["id"];
          },
        ];
      };
      search_history: {
        Row: {
          id: string;
          query: string;
          searched_at: string;
          user_id: string;
        };
        Insert: {
          id?: string;
          query: string;
          searched_at?: string;
          user_id: string;
        };
        Update: {
          id?: string;
          query?: string;
          searched_at?: string;
          user_id?: string;
        };
        Relationships: [];
      };
      sentiment_timeline: {
        Row: {
          id: string;
          negative_pct: number | null;
          neutral_pct: number | null;
          positive_pct: number | null;
          recorded_at: string;
          topic_id: string | null;
          volume: number | null;
        };
        Insert: {
          id?: string;
          negative_pct?: number | null;
          neutral_pct?: number | null;
          positive_pct?: number | null;
          recorded_at?: string;
          topic_id?: string | null;
          volume?: number | null;
        };
        Update: {
          id?: string;
          negative_pct?: number | null;
          neutral_pct?: number | null;
          positive_pct?: number | null;
          recorded_at?: string;
          topic_id?: string | null;
          volume?: number | null;
        };
        Relationships: [
          {
            foreignKeyName: "sentiment_timeline_topic_id_fkey";
            columns: ["topic_id"];
            isOneToOne: false;
            referencedRelation: "topics";
            referencedColumns: ["id"];
          },
        ];
      };
      topic_stats: {
        Row: {
          ai_summary: string | null;
          computed_at: string;
          crisis_level: Database["public"]["Enums"]["crisis_level_type"] | null;
          emotion_breakdown: Json | null;
          id: string;
          key_takeaways: Json | null;
          overall_sentiment:
            | Database["public"]["Enums"]["sentiment_type"]
            | null;
          top_phrases: Json | null;
          topic_id: string;
          total_volume: number | null;
          volatility: number | null;
          volume_change: number | null;
        };
        Insert: {
          ai_summary?: string | null;
          computed_at?: string;
          crisis_level?:
            | Database["public"]["Enums"]["crisis_level_type"]
            | null;
          emotion_breakdown?: Json | null;
          id?: string;
          key_takeaways?: Json | null;
          overall_sentiment?:
            | Database["public"]["Enums"]["sentiment_type"]
            | null;
          top_phrases?: Json | null;
          topic_id: string;
          total_volume?: number | null;
          volatility?: number | null;
          volume_change?: number | null;
        };
        Update: {
          ai_summary?: string | null;
          computed_at?: string;
          crisis_level?:
            | Database["public"]["Enums"]["crisis_level_type"]
            | null;
          emotion_breakdown?: Json | null;
          id?: string;
          key_takeaways?: Json | null;
          overall_sentiment?:
            | Database["public"]["Enums"]["sentiment_type"]
            | null;
          top_phrases?: Json | null;
          topic_id?: string;
          total_volume?: number | null;
          volatility?: number | null;
          volume_change?: number | null;
        };
        Relationships: [
          {
            foreignKeyName: "topic_stats_topic_id_fkey";
            columns: ["topic_id"];
            isOneToOne: false;
            referencedRelation: "topics";
            referencedColumns: ["id"];
          },
        ];
      };
      topics: {
        Row: {
          created_at: string;
          hashtag: string;
          id: string;
          is_active: boolean | null;
          is_trending: boolean | null;
          platform: Database["public"]["Enums"]["platform_type"] | null;
          query: string;
          title: string;
          updated_at: string;
        };
        Insert: {
          created_at?: string;
          hashtag: string;
          id?: string;
          is_active?: boolean | null;
          is_trending?: boolean | null;
          platform?: Database["public"]["Enums"]["platform_type"] | null;
          query: string;
          title: string;
          updated_at?: string;
        };
        Update: {
          created_at?: string;
          hashtag?: string;
          id?: string;
          is_active?: boolean | null;
          is_trending?: boolean | null;
          platform?: Database["public"]["Enums"]["platform_type"] | null;
          query?: string;
          title?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      user_alert_preferences: {
        Row: {
          created_at: string;
          crisis_threshold: string;
          email_notifications: boolean;
          emotion_alerts: Json;
          id: string;
          updated_at: string;
          user_id: string;
        };
        Insert: {
          created_at?: string;
          crisis_threshold?: string;
          email_notifications?: boolean;
          emotion_alerts?: Json;
          id?: string;
          updated_at?: string;
          user_id: string;
        };
        Update: {
          created_at?: string;
          crisis_threshold?: string;
          email_notifications?: boolean;
          emotion_alerts?: Json;
          id?: string;
          updated_at?: string;
          user_id?: string;
        };
        Relationships: [];
      };
      user_topic_preferences: {
        Row: {
          id: string;
          user_id: string;
          topic_id: string;
          is_pinned: boolean;
          is_archived: boolean;
          is_deleted: boolean;
          custom_title: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          topic_id: string;
          is_pinned?: boolean;
          is_archived?: boolean;
          is_deleted?: boolean;
          custom_title?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          topic_id?: string;
          is_pinned?: boolean;
          is_archived?: boolean;
          is_deleted?: boolean;
          custom_title?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "user_topic_preferences_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "users";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "user_topic_preferences_topic_id_fkey";
            columns: ["topic_id"];
            isOneToOne: false;
            referencedRelation: "topics";
            referencedColumns: ["id"];
          },
        ];
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      [_ in never]: never;
    };
    Enums: {
      crisis_level_type: "none" | "low" | "medium" | "high";
      emotion_type:
        | "joy"
        | "anger"
        | "sadness"
        | "fear"
        | "surprise"
        | "disgust";
      platform_type: "x" | "youtube";
      sentiment_type: "positive" | "negative" | "mixed" | "neutral";
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
};

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">;

type DefaultSchema = DatabaseWithoutInternals[Extract<
  keyof Database,
  "public"
>];

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R;
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R;
      }
      ? R
      : never
    : never;

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I;
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I;
      }
      ? I
      : never
    : never;

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U;
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U;
      }
      ? U
      : never
    : never;

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never;

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never;

export const Constants = {
  public: {
    Enums: {
      crisis_level_type: ["none", "low", "medium", "high"],
      emotion_type: ["joy", "anger", "sadness", "fear", "surprise", "disgust"],
      platform_type: ["x", "youtube"],
      sentiment_type: ["positive", "negative", "mixed", "neutral"],
    },
  },
} as const;
