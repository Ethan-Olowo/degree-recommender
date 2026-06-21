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
      academic_data: {
        Row: {
          academic_data_id: string
          gpa: number | null
          grade_system: string | null
          school_type: string | null
          user_id: string
        }
        Insert: {
          academic_data_id?: string
          gpa?: number | null
          grade_system?: string | null
          school_type?: string | null
          user_id: string
        }
        Update: {
          academic_data_id?: string
          gpa?: number | null
          grade_system?: string | null
          school_type?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "academic_data_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["user_id"]
          },
        ]
      }
      activity_logs: {
        Row: {
          created_at: string | null
          endpoint: string
          execution_time_ms: number
          http_method_id: string | null
          ip_address: string | null
          log_id: string
          log_level_id: string | null
          status_code: number
          user_agent: string | null
          user_id: string | null
        }
        Insert: {
          created_at?: string | null
          endpoint: string
          execution_time_ms: number
          http_method_id?: string | null
          ip_address?: string | null
          log_id: string
          log_level_id?: string | null
          status_code: number
          user_agent?: string | null
          user_id?: string | null
        }
        Update: {
          created_at?: string | null
          endpoint?: string
          execution_time_ms?: number
          http_method_id?: string | null
          ip_address?: string | null
          log_id?: string
          log_level_id?: string | null
          status_code?: number
          user_agent?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      category_confidence: {
        Row: {
          created_at: string
          predicted_category: string
          prediction_confidence: number
          prediction_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          predicted_category: string
          prediction_confidence: number
          prediction_id?: string
          user_id: string
        }
        Update: {
          created_at?: string
          predicted_category?: string
          prediction_confidence?: number
          prediction_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "category_confidence_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["user_id"]
          },
        ]
      }
      countries: {
        Row: {
          country_code: string
          country_name: string
        }
        Insert: {
          country_code: string
          country_name: string
        }
        Update: {
          country_code?: string
          country_name?: string
        }
        Relationships: []
      }
      degree_industries: {
        Row: {
          industry_id: string
          program_id: string
        }
        Insert: {
          industry_id: string
          program_id: string
        }
        Update: {
          industry_id?: string
          program_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "fk_degree_industries_industry"
            columns: ["industry_id"]
            isOneToOne: false
            referencedRelation: "industries"
            referencedColumns: ["industry_id"]
          },
          {
            foreignKeyName: "fk_degree_industries_program"
            columns: ["program_id"]
            isOneToOne: false
            referencedRelation: "degree_programs"
            referencedColumns: ["program_id"]
          },
        ]
      }
      degree_programs: {
        Row: {
          category: string | null
          description: string | null
          description_embedding: string | null
          minimum_gpa: number | null
          program_id: string
          program_name: string
          program_type: string | null
        }
        Insert: {
          category?: string | null
          description?: string | null
          description_embedding?: string | null
          minimum_gpa?: number | null
          program_id?: string
          program_name: string
          program_type?: string | null
        }
        Update: {
          category?: string | null
          description?: string | null
          description_embedding?: string | null
          minimum_gpa?: number | null
          program_id?: string
          program_name?: string
          program_type?: string | null
        }
        Relationships: []
      }
      indicator_types: {
        Row: {
          description: string | null
          indicator_name: string
          indicator_type_id: string
          unit: string | null
        }
        Insert: {
          description?: string | null
          indicator_name: string
          indicator_type_id?: string
          unit?: string | null
        }
        Update: {
          description?: string | null
          indicator_name?: string
          indicator_type_id?: string
          unit?: string | null
        }
        Relationships: []
      }
      industries: {
        Row: {
          embedding: string | null
          industry_id: string
          industry_name: string
        }
        Insert: {
          embedding?: string | null
          industry_id?: string
          industry_name: string
        }
        Update: {
          embedding?: string | null
          industry_id?: string
          industry_name?: string
        }
        Relationships: []
      }
      log_errors: {
        Row: {
          error_message: string | null
          id: string
          log_id: string | null
          stack_trace: string | null
        }
        Insert: {
          error_message?: string | null
          id: string
          log_id?: string | null
          stack_trace?: string | null
        }
        Update: {
          error_message?: string | null
          id?: string
          log_id?: string | null
          stack_trace?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "log_errors_log_id_fkey"
            columns: ["log_id"]
            isOneToOne: false
            referencedRelation: "activity_logs"
            referencedColumns: ["log_id"]
          },
        ]
      }
      market_indicator_values: {
        Row: {
          country_code: string | null
          indicator_type_id: string | null
          industry_id: string | null
          last_updated: string | null
          value: number | null
          value_id: string
        }
        Insert: {
          country_code?: string | null
          indicator_type_id?: string | null
          industry_id?: string | null
          last_updated?: string | null
          value?: number | null
          value_id?: string
        }
        Update: {
          country_code?: string | null
          indicator_type_id?: string | null
          industry_id?: string | null
          last_updated?: string | null
          value?: number | null
          value_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "fk_market_values_country"
            columns: ["country_code"]
            isOneToOne: false
            referencedRelation: "countries"
            referencedColumns: ["country_code"]
          },
          {
            foreignKeyName: "fk_market_values_indicator"
            columns: ["indicator_type_id"]
            isOneToOne: false
            referencedRelation: "indicator_types"
            referencedColumns: ["indicator_type_id"]
          },
          {
            foreignKeyName: "fk_market_values_industry"
            columns: ["industry_id"]
            isOneToOne: false
            referencedRelation: "industries"
            referencedColumns: ["industry_id"]
          },
        ]
      }
      personal_interests: {
        Row: {
          embedding: string | null
          interest: string
          user_id: string
        }
        Insert: {
          embedding?: string | null
          interest: string
          user_id: string
        }
        Update: {
          embedding?: string | null
          interest?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "personal_interests_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["user_id"]
          },
        ]
      }
      recommendation_weights: {
        Row: {
          algorithm_id: string
          category_rank_weight: number
          confidence_score_weight: number
          created_at: string | null
          current: boolean
          market_score_weight: number
          semantic_similarity_weight: number
          subject_similarity_weight: number
        }
        Insert: {
          algorithm_id?: string
          category_rank_weight?: number
          confidence_score_weight?: number
          created_at?: string | null
          current?: boolean
          market_score_weight?: number
          semantic_similarity_weight?: number
          subject_similarity_weight?: number
        }
        Update: {
          algorithm_id?: string
          category_rank_weight?: number
          confidence_score_weight?: number
          created_at?: string | null
          current?: boolean
          market_score_weight?: number
          semantic_similarity_weight?: number
          subject_similarity_weight?: number
        }
        Relationships: []
      }
      recommendations: {
        Row: {
          algorithm_source: string
          confidence_score: number | null
          created_at: string
          explanation: string | null
          liked: boolean
          market_score: number | null
          peer_score: number | null
          program_id: string | null
          recommendation_id: string
          semantic_score: number | null
          subject_score: number | null
          user_id: string
        }
        Insert: {
          algorithm_source?: string
          confidence_score?: number | null
          created_at?: string
          explanation?: string | null
          liked?: boolean
          market_score?: number | null
          peer_score?: number | null
          program_id?: string | null
          recommendation_id?: string
          semantic_score?: number | null
          subject_score?: number | null
          user_id: string
        }
        Update: {
          algorithm_source?: string
          confidence_score?: number | null
          created_at?: string
          explanation?: string | null
          liked?: boolean
          market_score?: number | null
          peer_score?: number | null
          program_id?: string | null
          recommendation_id?: string
          semantic_score?: number | null
          subject_score?: number | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "fk_recommendations_program"
            columns: ["program_id"]
            isOneToOne: false
            referencedRelation: "degree_programs"
            referencedColumns: ["program_id"]
          },
          {
            foreignKeyName: "recommendations_algorithm_source_fkey"
            columns: ["algorithm_source"]
            isOneToOne: false
            referencedRelation: "recommendation_weights"
            referencedColumns: ["algorithm_id"]
          },
          {
            foreignKeyName: "recommendations_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["user_id"]
          },
        ]
      }
      reports: {
        Row: {
          generated_at: string | null
          recommendation_stats: string | null
          report_id: string
        }
        Insert: {
          generated_at?: string | null
          recommendation_stats?: string | null
          report_id?: string
        }
        Update: {
          generated_at?: string | null
          recommendation_stats?: string | null
          report_id?: string
        }
        Relationships: []
      }
      socioeconomic_indicators: {
        Row: {
          country_code: string | null
          father_education: string | null
          funding_method: Database["public"]["Enums"]["funding_soucrces"] | null
          gender: string | null
          income_level: string | null
          mother_education: string | null
          school_type: string | null
          user_id: string
        }
        Insert: {
          country_code?: string | null
          father_education?: string | null
          funding_method?:
            | Database["public"]["Enums"]["funding_soucrces"]
            | null
          gender?: string | null
          income_level?: string | null
          mother_education?: string | null
          school_type?: string | null
          user_id: string
        }
        Update: {
          country_code?: string | null
          father_education?: string | null
          funding_method?:
            | Database["public"]["Enums"]["funding_soucrces"]
            | null
          gender?: string | null
          income_level?: string | null
          mother_education?: string | null
          school_type?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "fk_socioeconomic_country"
            columns: ["country_code"]
            isOneToOne: false
            referencedRelation: "countries"
            referencedColumns: ["country_code"]
          },
          {
            foreignKeyName: "socioeconomic_indicators_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "users"
            referencedColumns: ["user_id"]
          },
        ]
      }
      subject_grades: {
        Row: {
          academic_data_id: string
          grade: string | null
          subject_id: string
        }
        Insert: {
          academic_data_id: string
          grade?: string | null
          subject_id: string
        }
        Update: {
          academic_data_id?: string
          grade?: string | null
          subject_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "fk_subject_grades_academic"
            columns: ["academic_data_id"]
            isOneToOne: false
            referencedRelation: "academic_data"
            referencedColumns: ["academic_data_id"]
          },
          {
            foreignKeyName: "fk_subject_grades_subject"
            columns: ["subject_id"]
            isOneToOne: false
            referencedRelation: "subjects"
            referencedColumns: ["subject_id"]
          },
        ]
      }
      subject_requirements: {
        Row: {
          program_id: string
          requirement_detail: string | null
          subject_id: string
        }
        Insert: {
          program_id: string
          requirement_detail?: string | null
          subject_id: string
        }
        Update: {
          program_id?: string
          requirement_detail?: string | null
          subject_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "fk_subject_requirements_program"
            columns: ["program_id"]
            isOneToOne: false
            referencedRelation: "degree_programs"
            referencedColumns: ["program_id"]
          },
          {
            foreignKeyName: "fk_subject_requirements_subject"
            columns: ["subject_id"]
            isOneToOne: false
            referencedRelation: "subjects"
            referencedColumns: ["subject_id"]
          },
        ]
      }
      subjects: {
        Row: {
          embedding: string | null
          subject_id: string
          subject_name: string
        }
        Insert: {
          embedding?: string | null
          subject_id?: string
          subject_name: string
        }
        Update: {
          embedding?: string | null
          subject_id?: string
          subject_name?: string
        }
        Relationships: []
      }
      users: {
        Row: {
          created_at: string
          full_name: string | null
          is_admin: boolean
          user_id: string
        }
        Insert: {
          created_at?: string
          full_name?: string | null
          is_admin?: boolean
          user_id: string
        }
        Update: {
          created_at?: string
          full_name?: string | null
          is_admin?: boolean
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      get_admin_dashboard_stats: { Args: never; Returns: Json }
      get_dashboard_summary: { Args: never; Returns: Json }
      get_market_insights_reports: { Args: never; Returns: Json }
      get_student_dashboard_data: { Args: { p_user_id: string }; Returns: Json }
      get_student_profile: { Args: { p_user_id: string }; Returns: Json }
    }
    Enums: {
      funding_soucrces: "self" | "parents" | "credit"
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
      funding_soucrces: ["self", "parents", "credit"],
    },
  },
} as const
