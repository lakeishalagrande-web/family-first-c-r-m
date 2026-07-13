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
      agent_writing_numbers: {
        Row: {
          agent_id: string
          carrier: string
          created_at: string
          id: string
          writing_number: string
        }
        Insert: {
          agent_id: string
          carrier: string
          created_at?: string
          id?: string
          writing_number: string
        }
        Update: {
          agent_id?: string
          carrier?: string
          created_at?: string
          id?: string
          writing_number?: string
        }
        Relationships: []
      }
      alerts: {
        Row: {
          agent_id: string
          alert_type: Database["public"]["Enums"]["alert_type"]
          created_at: string
          description: string | null
          due_date: string
          id: string
          is_dismissed: boolean | null
          related_household_id: string | null
          related_policy_id: string | null
          title: string
        }
        Insert: {
          agent_id: string
          alert_type: Database["public"]["Enums"]["alert_type"]
          created_at?: string
          description?: string | null
          due_date: string
          id?: string
          is_dismissed?: boolean | null
          related_household_id?: string | null
          related_policy_id?: string | null
          title: string
        }
        Update: {
          agent_id?: string
          alert_type?: Database["public"]["Enums"]["alert_type"]
          created_at?: string
          description?: string | null
          due_date?: string
          id?: string
          is_dismissed?: boolean | null
          related_household_id?: string | null
          related_policy_id?: string | null
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "alerts_related_household_id_fkey"
            columns: ["related_household_id"]
            isOneToOne: false
            referencedRelation: "households"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "alerts_related_policy_id_fkey"
            columns: ["related_policy_id"]
            isOneToOne: false
            referencedRelation: "policies"
            referencedColumns: ["id"]
          },
        ]
      }
      announcements: {
        Row: {
          author_id: string
          body: string
          created_at: string
          id: string
          title: string
        }
        Insert: {
          author_id: string
          body: string
          created_at?: string
          id?: string
          title: string
        }
        Update: {
          author_id?: string
          body?: string
          created_at?: string
          id?: string
          title?: string
        }
        Relationships: []
      }
      beneficiaries: {
        Row: {
          agent_id: string
          beneficiary_type: Database["public"]["Enums"]["beneficiary_type"]
          created_at: string
          date_of_birth: string | null
          full_name: string
          id: string
          mailing_address: string | null
          percentage: number | null
          phone: string | null
          policy_id: string
          relationship: string | null
        }
        Insert: {
          agent_id: string
          beneficiary_type?: Database["public"]["Enums"]["beneficiary_type"]
          created_at?: string
          date_of_birth?: string | null
          full_name: string
          id?: string
          mailing_address?: string | null
          percentage?: number | null
          phone?: string | null
          policy_id: string
          relationship?: string | null
        }
        Update: {
          agent_id?: string
          beneficiary_type?: Database["public"]["Enums"]["beneficiary_type"]
          created_at?: string
          date_of_birth?: string | null
          full_name?: string
          id?: string
          mailing_address?: string | null
          percentage?: number | null
          phone?: string | null
          policy_id?: string
          relationship?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "beneficiaries_policy_id_fkey"
            columns: ["policy_id"]
            isOneToOne: false
            referencedRelation: "policies"
            referencedColumns: ["id"]
          },
        ]
      }
      carriers: {
        Row: {
          created_at: string
          created_by: string | null
          id: string
          is_global: boolean | null
          name: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          id?: string
          is_global?: boolean | null
          name: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          id?: string
          is_global?: boolean | null
          name?: string
        }
        Relationships: []
      }
      family_members: {
        Row: {
          agent_id: string
          annual_income: number | null
          created_at: string
          date_of_birth: string | null
          disability_notes: string | null
          email: string | null
          first_name: string
          gender: string | null
          has_disability: boolean | null
          height_inches: number | null
          household_id: string
          id: string
          is_primary: boolean | null
          last_name: string
          medicare_encrypted: string | null
          medicare_last4: string | null
          middle_name: string | null
          occupation: string | null
          phone_home: string | null
          phone_mobile: string | null
          relationship: string | null
          smoker: boolean | null
          ssn_encrypted: string | null
          ssn_last4: string | null
          updated_at: string
          weight_lbs: number | null
        }
        Insert: {
          agent_id: string
          annual_income?: number | null
          created_at?: string
          date_of_birth?: string | null
          disability_notes?: string | null
          email?: string | null
          first_name: string
          gender?: string | null
          has_disability?: boolean | null
          height_inches?: number | null
          household_id: string
          id?: string
          is_primary?: boolean | null
          last_name: string
          medicare_encrypted?: string | null
          medicare_last4?: string | null
          middle_name?: string | null
          occupation?: string | null
          phone_home?: string | null
          phone_mobile?: string | null
          relationship?: string | null
          smoker?: boolean | null
          ssn_encrypted?: string | null
          ssn_last4?: string | null
          updated_at?: string
          weight_lbs?: number | null
        }
        Update: {
          agent_id?: string
          annual_income?: number | null
          created_at?: string
          date_of_birth?: string | null
          disability_notes?: string | null
          email?: string | null
          first_name?: string
          gender?: string | null
          has_disability?: boolean | null
          height_inches?: number | null
          household_id?: string
          id?: string
          is_primary?: boolean | null
          last_name?: string
          medicare_encrypted?: string | null
          medicare_last4?: string | null
          middle_name?: string | null
          occupation?: string | null
          phone_home?: string | null
          phone_mobile?: string | null
          relationship?: string | null
          smoker?: boolean | null
          ssn_encrypted?: string | null
          ssn_last4?: string | null
          updated_at?: string
          weight_lbs?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "family_members_household_id_fkey"
            columns: ["household_id"]
            isOneToOne: false
            referencedRelation: "households"
            referencedColumns: ["id"]
          },
        ]
      }
      follow_ups: {
        Row: {
          agent_id: string
          contact_date: string
          created_at: string
          household_id: string | null
          id: string
          method: Database["public"]["Enums"]["contact_method"] | null
          next_follow_up_date: string | null
          notes: string | null
          outcome: Database["public"]["Enums"]["contact_outcome"] | null
          policy_id: string | null
        }
        Insert: {
          agent_id: string
          contact_date?: string
          created_at?: string
          household_id?: string | null
          id?: string
          method?: Database["public"]["Enums"]["contact_method"] | null
          next_follow_up_date?: string | null
          notes?: string | null
          outcome?: Database["public"]["Enums"]["contact_outcome"] | null
          policy_id?: string | null
        }
        Update: {
          agent_id?: string
          contact_date?: string
          created_at?: string
          household_id?: string | null
          id?: string
          method?: Database["public"]["Enums"]["contact_method"] | null
          next_follow_up_date?: string | null
          notes?: string | null
          outcome?: Database["public"]["Enums"]["contact_outcome"] | null
          policy_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "follow_ups_household_id_fkey"
            columns: ["household_id"]
            isOneToOne: false
            referencedRelation: "households"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "follow_ups_policy_id_fkey"
            columns: ["policy_id"]
            isOneToOne: false
            referencedRelation: "policies"
            referencedColumns: ["id"]
          },
        ]
      }
      households: {
        Row: {
          agent_id: string
          agent_notes: string | null
          created_at: string
          household_income: number | null
          household_name: string
          id: string
          mailing_city: string | null
          mailing_state: string | null
          mailing_street: string | null
          mailing_zip: string | null
          primary_city: string | null
          primary_state: string | null
          primary_street: string | null
          primary_zip: string | null
          updated_at: string
        }
        Insert: {
          agent_id: string
          agent_notes?: string | null
          created_at?: string
          household_income?: number | null
          household_name: string
          id?: string
          mailing_city?: string | null
          mailing_state?: string | null
          mailing_street?: string | null
          mailing_zip?: string | null
          primary_city?: string | null
          primary_state?: string | null
          primary_street?: string | null
          primary_zip?: string | null
          updated_at?: string
        }
        Update: {
          agent_id?: string
          agent_notes?: string | null
          created_at?: string
          household_income?: number | null
          household_name?: string
          id?: string
          mailing_city?: string | null
          mailing_state?: string | null
          mailing_street?: string | null
          mailing_zip?: string | null
          primary_city?: string | null
          primary_state?: string | null
          primary_street?: string | null
          primary_zip?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      pii_access_log: {
        Row: {
          accessed_at: string
          accessor_id: string
          agent_id: string | null
          field_name: string
          id: string
          record_id: string
          record_type: string
        }
        Insert: {
          accessed_at?: string
          accessor_id: string
          agent_id?: string | null
          field_name: string
          id?: string
          record_id: string
          record_type: string
        }
        Update: {
          accessed_at?: string
          accessor_id?: string
          agent_id?: string | null
          field_name?: string
          id?: string
          record_id?: string
          record_type?: string
        }
        Relationships: []
      }
      policies: {
        Row: {
          agent_id: string
          application_date: string | null
          automated_premium_loan: boolean | null
          carrier: string | null
          cash_value: number | null
          cash_value_checked_on: string | null
          created_at: string
          existing_coverage: boolean | null
          face_amount: number | null
          has_policy_loan: boolean | null
          household_id: string
          id: string
          insured_member_id: string | null
          issue_date: string | null
          monthly_premium: number | null
          notes: string | null
          owner_name: string | null
          owner_type: Database["public"]["Enums"]["owner_type"] | null
          payment_structure:
            | Database["public"]["Enums"]["payment_structure"]
            | null
          policy_loan_amount: number | null
          policy_number: string | null
          product_type: Database["public"]["Enums"]["product_type"] | null
          rate_class: Database["public"]["Enums"]["rate_class"] | null
          reinstatement_deadline: string | null
          status: Database["public"]["Enums"]["policy_status"] | null
          updated_at: string
        }
        Insert: {
          agent_id: string
          application_date?: string | null
          automated_premium_loan?: boolean | null
          carrier?: string | null
          cash_value?: number | null
          cash_value_checked_on?: string | null
          created_at?: string
          existing_coverage?: boolean | null
          face_amount?: number | null
          has_policy_loan?: boolean | null
          household_id: string
          id?: string
          insured_member_id?: string | null
          issue_date?: string | null
          monthly_premium?: number | null
          notes?: string | null
          owner_name?: string | null
          owner_type?: Database["public"]["Enums"]["owner_type"] | null
          payment_structure?:
            | Database["public"]["Enums"]["payment_structure"]
            | null
          policy_loan_amount?: number | null
          policy_number?: string | null
          product_type?: Database["public"]["Enums"]["product_type"] | null
          rate_class?: Database["public"]["Enums"]["rate_class"] | null
          reinstatement_deadline?: string | null
          status?: Database["public"]["Enums"]["policy_status"] | null
          updated_at?: string
        }
        Update: {
          agent_id?: string
          application_date?: string | null
          automated_premium_loan?: boolean | null
          carrier?: string | null
          cash_value?: number | null
          cash_value_checked_on?: string | null
          created_at?: string
          existing_coverage?: boolean | null
          face_amount?: number | null
          has_policy_loan?: boolean | null
          household_id?: string
          id?: string
          insured_member_id?: string | null
          issue_date?: string | null
          monthly_premium?: number | null
          notes?: string | null
          owner_name?: string | null
          owner_type?: Database["public"]["Enums"]["owner_type"] | null
          payment_structure?:
            | Database["public"]["Enums"]["payment_structure"]
            | null
          policy_loan_amount?: number | null
          policy_number?: string | null
          product_type?: Database["public"]["Enums"]["product_type"] | null
          rate_class?: Database["public"]["Enums"]["rate_class"] | null
          reinstatement_deadline?: string | null
          status?: Database["public"]["Enums"]["policy_status"] | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "policies_household_id_fkey"
            columns: ["household_id"]
            isOneToOne: false
            referencedRelation: "households"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "policies_insured_member_id_fkey"
            columns: ["insured_member_id"]
            isOneToOne: false
            referencedRelation: "family_members"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          account_status: Database["public"]["Enums"]["account_status"]
          created_at: string
          email: string
          full_name: string | null
          id: string
          license_states: string[] | null
          npn: string | null
          phone: string | null
          subscription_tier: Database["public"]["Enums"]["subscription_tier"]
          updated_at: string
        }
        Insert: {
          account_status?: Database["public"]["Enums"]["account_status"]
          created_at?: string
          email: string
          full_name?: string | null
          id: string
          license_states?: string[] | null
          npn?: string | null
          phone?: string | null
          subscription_tier?: Database["public"]["Enums"]["subscription_tier"]
          updated_at?: string
        }
        Update: {
          account_status?: Database["public"]["Enums"]["account_status"]
          created_at?: string
          email?: string
          full_name?: string | null
          id?: string
          license_states?: string[] | null
          npn?: string | null
          phone?: string | null
          subscription_tier?: Database["public"]["Enums"]["subscription_tier"]
          updated_at?: string
        }
        Relationships: []
      }
      quote_scenarios: {
        Row: {
          agent_id: string
          carrier: string | null
          created_at: string
          face_amount: number | null
          household_id: string
          id: string
          label: string | null
          monthly_premium: number | null
          notes: string | null
          payment_structure:
            | Database["public"]["Enums"]["payment_structure"]
            | null
          product_type: Database["public"]["Enums"]["product_type"] | null
          rate_class: Database["public"]["Enums"]["rate_class"] | null
          slot: number
        }
        Insert: {
          agent_id: string
          carrier?: string | null
          created_at?: string
          face_amount?: number | null
          household_id: string
          id?: string
          label?: string | null
          monthly_premium?: number | null
          notes?: string | null
          payment_structure?:
            | Database["public"]["Enums"]["payment_structure"]
            | null
          product_type?: Database["public"]["Enums"]["product_type"] | null
          rate_class?: Database["public"]["Enums"]["rate_class"] | null
          slot: number
        }
        Update: {
          agent_id?: string
          carrier?: string | null
          created_at?: string
          face_amount?: number | null
          household_id?: string
          id?: string
          label?: string | null
          monthly_premium?: number | null
          notes?: string | null
          payment_structure?:
            | Database["public"]["Enums"]["payment_structure"]
            | null
          product_type?: Database["public"]["Enums"]["product_type"] | null
          rate_class?: Database["public"]["Enums"]["rate_class"] | null
          slot?: number
        }
        Relationships: [
          {
            foreignKeyName: "quote_scenarios_household_id_fkey"
            columns: ["household_id"]
            isOneToOne: false
            referencedRelation: "households"
            referencedColumns: ["id"]
          },
        ]
      }
      term_riders: {
        Row: {
          agent_id: string
          beneficiary: string | null
          child_name: string
          created_at: string
          date_of_birth: string | null
          height_inches: number | null
          id: string
          policy_id: string
          sex: string | null
          ssn_encrypted: string | null
          ssn_last4: string | null
          weight_lbs: number | null
        }
        Insert: {
          agent_id: string
          beneficiary?: string | null
          child_name: string
          created_at?: string
          date_of_birth?: string | null
          height_inches?: number | null
          id?: string
          policy_id: string
          sex?: string | null
          ssn_encrypted?: string | null
          ssn_last4?: string | null
          weight_lbs?: number | null
        }
        Update: {
          agent_id?: string
          beneficiary?: string | null
          child_name?: string
          created_at?: string
          date_of_birth?: string | null
          height_inches?: number | null
          id?: string
          policy_id?: string
          sex?: string | null
          ssn_encrypted?: string | null
          ssn_last4?: string | null
          weight_lbs?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "term_riders_policy_id_fkey"
            columns: ["policy_id"]
            isOneToOne: false
            referencedRelation: "policies"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_admin: { Args: { _user_id: string }; Returns: boolean }
    }
    Enums: {
      account_status: "active" | "suspended"
      alert_type:
        | "reinstatement"
        | "anniversary"
        | "client_birthday"
        | "beneficiary_birthday"
        | "follow_up"
      app_role: "admin" | "agent"
      beneficiary_type: "primary" | "contingent"
      contact_method: "phone" | "email" | "text" | "in_person" | "mail"
      contact_outcome:
        | "reached"
        | "left_voicemail"
        | "no_answer"
        | "email_sent"
        | "other"
      owner_type: "individual" | "corporation" | "partnership" | "trust"
      payment_structure:
        | "ten_pay"
        | "twenty_pay"
        | "pay_to_65"
        | "whole_life_lifetime"
        | "single_premium"
      policy_status:
        | "active"
        | "lapsed"
        | "extended_term"
        | "reinstatement_eligible"
        | "surrendered"
        | "paid_up"
        | "pending"
      product_type:
        | "term"
        | "whole_life"
        | "final_expense"
        | "medicare_supplement"
        | "medicare_advantage"
        | "annuity"
        | "disability"
        | "other"
      rate_class:
        | "preferred_plus"
        | "preferred"
        | "standard"
        | "graded_benefit"
        | "guaranteed_issue"
      subscription_tier: "starter" | "professional" | "agency"
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
      account_status: ["active", "suspended"],
      alert_type: [
        "reinstatement",
        "anniversary",
        "client_birthday",
        "beneficiary_birthday",
        "follow_up",
      ],
      app_role: ["admin", "agent"],
      beneficiary_type: ["primary", "contingent"],
      contact_method: ["phone", "email", "text", "in_person", "mail"],
      contact_outcome: [
        "reached",
        "left_voicemail",
        "no_answer",
        "email_sent",
        "other",
      ],
      owner_type: ["individual", "corporation", "partnership", "trust"],
      payment_structure: [
        "ten_pay",
        "twenty_pay",
        "pay_to_65",
        "whole_life_lifetime",
        "single_premium",
      ],
      policy_status: [
        "active",
        "lapsed",
        "extended_term",
        "reinstatement_eligible",
        "surrendered",
        "paid_up",
        "pending",
      ],
      product_type: [
        "term",
        "whole_life",
        "final_expense",
        "medicare_supplement",
        "medicare_advantage",
        "annuity",
        "disability",
        "other",
      ],
      rate_class: [
        "preferred_plus",
        "preferred",
        "standard",
        "graded_benefit",
        "guaranteed_issue",
      ],
      subscription_tier: ["starter", "professional", "agency"],
    },
  },
} as const
