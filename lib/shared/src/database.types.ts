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
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      assessments: {
        Row: {
          completed: boolean | null
          course_id: string
          created_at: string | null
          due_date: string
          id: string
          target_study_hours: number | null
          title: string
          type: string | null
          user_id: string
          venue: string | null
          weight_percentage: number | null
        }
        Insert: {
          completed?: boolean | null
          course_id: string
          created_at?: string | null
          due_date: string
          id?: string
          target_study_hours?: number | null
          title: string
          type?: string | null
          user_id: string
          venue?: string | null
          weight_percentage?: number | null
        }
        Update: {
          completed?: boolean | null
          course_id?: string
          created_at?: string | null
          due_date?: string
          id?: string
          target_study_hours?: number | null
          title?: string
          type?: string | null
          user_id?: string
          venue?: string | null
          weight_percentage?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "assessments_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "assessments_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      courses: {
        Row: {
          code: string
          color: string | null
          created_at: string | null
          id: string
          name: string
          target_hours_per_week: number | null
          user_id: string
        }
        Insert: {
          code: string
          color?: string | null
          created_at?: string | null
          id?: string
          name: string
          target_hours_per_week?: number | null
          user_id: string
        }
        Update: {
          code?: string
          color?: string | null
          created_at?: string | null
          id?: string
          name?: string
          target_hours_per_week?: number | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "courses_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      flashcard_decks: {
        Row: {
          course_id: string
          created_at: string | null
          description: string | null
          id: string
          is_public: boolean | null
          tags: string[] | null
          title: string
          user_id: string
        }
        Insert: {
          course_id: string
          created_at?: string | null
          description?: string | null
          id?: string
          is_public?: boolean | null
          tags?: string[] | null
          title: string
          user_id: string
        }
        Update: {
          course_id?: string
          created_at?: string | null
          description?: string | null
          id?: string
          is_public?: boolean | null
          tags?: string[] | null
          title?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "flashcard_decks_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "flashcard_decks_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      flashcards: {
        Row: {
          back_text: string
          card_type: string | null
          correct_answer: string | null
          created_at: string | null
          deck_id: string
          due_date: string | null
          ease_factor: number | null
          front_text: string
          id: string
          interval_days: number | null
          options: Json | null
          repetition_number: number | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          back_text: string
          card_type?: string | null
          correct_answer?: string | null
          created_at?: string | null
          deck_id: string
          due_date?: string | null
          ease_factor?: number | null
          front_text: string
          id?: string
          interval_days?: number | null
          options?: Json | null
          repetition_number?: number | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          back_text?: string
          card_type?: string | null
          correct_answer?: string | null
          created_at?: string | null
          deck_id?: string
          due_date?: string | null
          ease_factor?: number | null
          front_text?: string
          id?: string
          interval_days?: number | null
          options?: Json | null
          repetition_number?: number | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "flashcards_deck_id_fkey"
            columns: ["deck_id"]
            isOneToOne: false
            referencedRelation: "flashcard_decks"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "flashcards_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      follows: {
        Row: {
          created_at: string | null
          followee_id: string
          follower_id: string
          id: string
        }
        Insert: {
          created_at?: string | null
          followee_id: string
          follower_id: string
          id?: string
        }
        Update: {
          created_at?: string | null
          followee_id?: string
          follower_id?: string
          id?: string
        }
        Relationships: [
          {
            foreignKeyName: "follows_followee_id_fkey"
            columns: ["followee_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "follows_follower_id_fkey"
            columns: ["follower_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      friendships: {
        Row: {
          created_at: string | null
          friend_id: string
          id: string
          status: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          friend_id: string
          id?: string
          status?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          friend_id?: string
          id?: string
          status?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "friendships_friend_id_fkey"
            columns: ["friend_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "friendships_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          created_at: string | null
          id: string
          link: string | null
          message: string
          read: boolean | null
          title: string
          type: string
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          link?: string | null
          message: string
          read?: boolean | null
          title: string
          type: string
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          link?: string | null
          message?: string
          read?: boolean | null
          title?: string
          type?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "notifications_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string | null
          current_subject: string | null
          degree: string | null
          email: string
          full_name: string
          id: string
          is_studying_now: boolean | null
          last_study_date: string | null
          longest_streak_days: number | null
          session_ends_at: string | null
          streak_freezes_available: number | null
          study_streak_days: number | null
          university: string | null
          updated_at: string | null
          username: string | null
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string | null
          current_subject?: string | null
          degree?: string | null
          email: string
          full_name?: string
          id: string
          is_studying_now?: boolean | null
          last_study_date?: string | null
          longest_streak_days?: number | null
          session_ends_at?: string | null
          streak_freezes_available?: number | null
          study_streak_days?: number | null
          university?: string | null
          updated_at?: string | null
          username?: string | null
        }
        Update: {
          avatar_url?: string | null
          created_at?: string | null
          current_subject?: string | null
          degree?: string | null
          email?: string
          full_name?: string
          id?: string
          is_studying_now?: boolean | null
          last_study_date?: string | null
          longest_streak_days?: number | null
          session_ends_at?: string | null
          streak_freezes_available?: number | null
          study_streak_days?: number | null
          university?: string | null
          updated_at?: string | null
          username?: string | null
        }
        Relationships: []
      }
      sessions: {
        Row: {
          completed: boolean | null
          created_at: string | null
          date: string
          duration: number
          id: string
          label: string | null
          user_id: string | null
        }
        Insert: {
          completed?: boolean | null
          created_at?: string | null
          date: string
          duration: number
          id?: string
          label?: string | null
          user_id?: string | null
        }
        Update: {
          completed?: boolean | null
          created_at?: string | null
          date?: string
          duration?: number
          id?: string
          label?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      squad_members: {
        Row: {
          joined_at: string | null
          squad_id: string
          user_id: string
        }
        Insert: {
          joined_at?: string | null
          squad_id: string
          user_id: string
        }
        Update: {
          joined_at?: string | null
          squad_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "squad_members_squad_id_fkey"
            columns: ["squad_id"]
            isOneToOne: false
            referencedRelation: "squads"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "squad_members_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      squads: {
        Row: {
          code: string
          created_at: string | null
          created_by: string
          id: string
          name: string
        }
        Insert: {
          code: string
          created_at?: string | null
          created_by: string
          id?: string
          name: string
        }
        Update: {
          code?: string
          created_at?: string | null
          created_by?: string
          id?: string
          name?: string
        }
        Relationships: [
          {
            foreignKeyName: "squads_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      stats: {
        Row: {
          best_day: number | null
          config: Json | null
          focus_streak: number | null
          tasks_done: number | null
          total_focus_time: number | null
          total_sessions: number | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          best_day?: number | null
          config?: Json | null
          focus_streak?: number | null
          tasks_done?: number | null
          total_focus_time?: number | null
          total_sessions?: number | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          best_day?: number | null
          config?: Json | null
          focus_streak?: number | null
          tasks_done?: number | null
          total_focus_time?: number | null
          total_sessions?: number | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      streaks: {
        Row: {
          current_streak: number | null
          freezes_available: number | null
          freezes_used_total: number | null
          last_active_date: string | null
          longest_streak: number | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          current_streak?: number | null
          freezes_available?: number | null
          freezes_used_total?: number | null
          last_active_date?: string | null
          longest_streak?: number | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          current_streak?: number | null
          freezes_available?: number | null
          freezes_used_total?: number | null
          last_active_date?: string | null
          longest_streak?: number | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "streaks_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      study_room_members: {
        Row: {
          completed: boolean | null
          joined_at: string | null
          room_id: string
          user_id: string
        }
        Insert: {
          completed?: boolean | null
          joined_at?: string | null
          room_id: string
          user_id: string
        }
        Update: {
          completed?: boolean | null
          joined_at?: string | null
          room_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "study_room_members_room_id_fkey"
            columns: ["room_id"]
            isOneToOne: false
            referencedRelation: "study_rooms"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "study_room_members_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      study_rooms: {
        Row: {
          code: string
          course_id: string | null
          created_at: string | null
          duration_seconds: number | null
          elapsed_seconds_at_pause: number | null
          host_id: string
          id: string
          last_resumed_at: string | null
          name: string
          status: string | null
        }
        Insert: {
          code: string
          course_id?: string | null
          created_at?: string | null
          duration_seconds?: number | null
          elapsed_seconds_at_pause?: number | null
          host_id: string
          id?: string
          last_resumed_at?: string | null
          name: string
          status?: string | null
        }
        Update: {
          code?: string
          course_id?: string | null
          created_at?: string | null
          duration_seconds?: number | null
          elapsed_seconds_at_pause?: number | null
          host_id?: string
          id?: string
          last_resumed_at?: string | null
          name?: string
          status?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "study_rooms_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "study_rooms_host_id_fkey"
            columns: ["host_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      study_sessions: {
        Row: {
          assessment_id: string | null
          completed_at: string | null
          course_id: string | null
          duration_seconds: number
          id: string
          mode: string | null
          notes: string | null
          task_id: string | null
          user_id: string
        }
        Insert: {
          assessment_id?: string | null
          completed_at?: string | null
          course_id?: string | null
          duration_seconds: number
          id?: string
          mode?: string | null
          notes?: string | null
          task_id?: string | null
          user_id: string
        }
        Update: {
          assessment_id?: string | null
          completed_at?: string | null
          course_id?: string | null
          duration_seconds?: number
          id?: string
          mode?: string | null
          notes?: string | null
          task_id?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "study_sessions_assessment_id_fkey"
            columns: ["assessment_id"]
            isOneToOne: false
            referencedRelation: "assessments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "study_sessions_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "study_sessions_task_id_fkey"
            columns: ["task_id"]
            isOneToOne: false
            referencedRelation: "tasks"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "study_sessions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      tasks: {
        Row: {
          course_id: string | null
          created_at: string | null
          done: boolean | null
          due: string | null
          id: string
          notes: string | null
          prio: string | null
          text: string
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          course_id?: string | null
          created_at?: string | null
          done?: boolean | null
          due?: string | null
          id: string
          notes?: string | null
          prio?: string | null
          text: string
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          course_id?: string | null
          created_at?: string | null
          done?: boolean | null
          due?: string | null
          id?: string
          notes?: string | null
          prio?: string | null
          text?: string
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "tasks_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
        ]
      }
      timetable_classes: {
        Row: {
          class_type: string | null
          course_id: string
          created_at: string | null
          day_of_week: number | null
          end_time: string
          id: string
          start_time: string
          user_id: string
          venue: string | null
        }
        Insert: {
          class_type?: string | null
          course_id: string
          created_at?: string | null
          day_of_week?: number | null
          end_time: string
          id?: string
          start_time: string
          user_id: string
          venue?: string | null
        }
        Update: {
          class_type?: string | null
          course_id?: string
          created_at?: string | null
          day_of_week?: number | null
          end_time?: string
          id?: string
          start_time?: string
          user_id?: string
          venue?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "timetable_classes_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "timetable_classes_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      record_study_activity: {
        Args: { p_activity_type: string; p_user_id: string }
        Returns: Json
      }
    }
    Enums: {
      [_ in never]: never
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
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
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {},
  },
} as const;
