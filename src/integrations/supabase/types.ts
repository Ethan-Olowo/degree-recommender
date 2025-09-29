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
            foreignKeyName: "degree_industries_industry_id_fkey"
            columns: ["industry_id"]
            isOneToOne: false
            referencedRelation: "industries"
            referencedColumns: ["industry_id"]
          },
          {
            foreignKeyName: "degree_industries_program_id_fkey"
            columns: ["program_id"]
            isOneToOne: false
            referencedRelation: "degree_programs"
            referencedColumns: ["program_id"]
          },
        ]
      }
      degree_programs: {
        Row: {
          description: string | null
          minimum_gpa: number | null
          program_id: string
          program_name: string
          program_type: string | null
        }
        Insert: {
          description?: string | null
          minimum_gpa?: number | null
          program_id?: string
          program_name: string
          program_type?: string | null
        }
        Update: {
          description?: string | null
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
          industry_id: string
          industry_name: string
        }
        Insert: {
          industry_id?: string
          industry_name: string
        }
        Update: {
          industry_id?: string
          industry_name?: string
        }
        Relationships: []
      }
      market_indicator_values: {
        Row: {
          country_code: string | null
          indicator_type_id: string
          industry_id: string | null
          last_updated: string | null
          value: number
          value_id: string
        }
        Insert: {
          country_code?: string | null
          indicator_type_id: string
          industry_id?: string | null
          last_updated?: string | null
          value: number
          value_id?: string
        }
        Update: {
          country_code?: string | null
          indicator_type_id?: string
          industry_id?: string | null
          last_updated?: string | null
          value?: number
          value_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "market_indicator_values_country_code_fkey"
            columns: ["country_code"]
            isOneToOne: false
            referencedRelation: "countries"
            referencedColumns: ["country_code"]
          },
          {
            foreignKeyName: "market_indicator_values_indicator_type_id_fkey"
            columns: ["indicator_type_id"]
            isOneToOne: false
            referencedRelation: "indicator_types"
            referencedColumns: ["indicator_type_id"]
          },
          {
            foreignKeyName: "market_indicator_values_industry_id_fkey"
            columns: ["industry_id"]
            isOneToOne: false
            referencedRelation: "industries"
            referencedColumns: ["industry_id"]
          },
        ]
      }
      personal_interests: {
        Row: {
          interest: string
          user_id: string
        }
        Insert: {
          interest: string
          user_id: string
        }
        Update: {
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
      recommendations: {
        Row: {
          algorithm_source: string | null
          confidence_score: number | null
          explanation: string | null
          market_score: number | null
          program_id: string
          recommendation_id: string
          user_id: string
        }
        Insert: {
          algorithm_source?: string | null
          confidence_score?: number | null
          explanation?: string | null
          market_score?: number | null
          program_id: string
          recommendation_id?: string
          user_id: string
        }
        Update: {
          algorithm_source?: string | null
          confidence_score?: number | null
          explanation?: string | null
          market_score?: number | null
          program_id?: string
          recommendation_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "recommendations_program_id_fkey"
            columns: ["program_id"]
            isOneToOne: false
            referencedRelation: "degree_programs"
            referencedColumns: ["program_id"]
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
          generated_at: string
          recommendation_stats: Json | null
          report_id: string
        }
        Insert: {
          generated_at?: string
          recommendation_stats?: Json | null
          report_id?: string
        }
        Update: {
          generated_at?: string
          recommendation_stats?: Json | null
          report_id?: string
        }
        Relationships: []
      }
      socioeconomic_indicators: {
        Row: {
          country_code: string | null
          gender: string | null
          income_level: string | null
          school_type: string | null
          user_id: string
        }
        Insert: {
          country_code?: string | null
          gender?: string | null
          income_level?: string | null
          school_type?: string | null
          user_id: string
        }
        Update: {
          country_code?: string | null
          gender?: string | null
          income_level?: string | null
          school_type?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "socioeconomic_indicators_country_code_fkey"
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
            foreignKeyName: "subject_grades_academic_data_id_fkey"
            columns: ["academic_data_id"]
            isOneToOne: false
            referencedRelation: "academic_data"
            referencedColumns: ["academic_data_id"]
          },
          {
            foreignKeyName: "subject_grades_subject_id_fkey"
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
            foreignKeyName: "subject_requirements_program_id_fkey"
            columns: ["program_id"]
            isOneToOne: false
            referencedRelation: "degree_programs"
            referencedColumns: ["program_id"]
          },
          {
            foreignKeyName: "subject_requirements_subject_id_fkey"
            columns: ["subject_id"]
            isOneToOne: false
            referencedRelation: "subjects"
            referencedColumns: ["subject_id"]
          },
        ]
      }
      subjects: {
        Row: {
          subject_id: string
          subject_name: string
        }
        Insert: {
          subject_id?: string
          subject_name: string
        }
        Update: {
          subject_id?: string
          subject_name?: string
        }
        Relationships: []
      }
      users: {
        Row: {
          full_name: string | null
          is_admin: boolean
          user_id: string
        }
        Insert: {
          full_name?: string | null
          is_admin?: boolean
          user_id: string
        }
        Update: {
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
      [_ in never]: never
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
    Enums: {},
  },
} as const