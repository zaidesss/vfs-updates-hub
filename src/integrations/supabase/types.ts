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
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      acknowledgements: {
        Row: {
          acknowledged_at: string
          agent_email: string
          id: string
          update_id: string
        }
        Insert: {
          acknowledged_at?: string
          agent_email: string
          id?: string
          update_id: string
        }
        Update: {
          acknowledged_at?: string
          agent_email?: string
          id?: string
          update_id?: string
        }
        Relationships: []
      }
      agent_profiles: {
        Row: {
          birthday: string | null
          clients: string | null
          created_at: string | null
          email: string
          emergency_contact_name: string | null
          emergency_contact_phone: string | null
          full_name: string | null
          home_address: string | null
          hourly_rate: number | null
          id: string
          phone_number: string | null
          position: string | null
          rate_history: Json | null
          start_date: string | null
          team_lead: string | null
          updated_at: string | null
        }
        Insert: {
          birthday?: string | null
          clients?: string | null
          created_at?: string | null
          email: string
          emergency_contact_name?: string | null
          emergency_contact_phone?: string | null
          full_name?: string | null
          home_address?: string | null
          hourly_rate?: number | null
          id?: string
          phone_number?: string | null
          position?: string | null
          rate_history?: Json | null
          start_date?: string | null
          team_lead?: string | null
          updated_at?: string | null
        }
        Update: {
          birthday?: string | null
          clients?: string | null
          created_at?: string | null
          email?: string
          emergency_contact_name?: string | null
          emergency_contact_phone?: string | null
          full_name?: string | null
          home_address?: string | null
          hourly_rate?: number | null
          id?: string
          phone_number?: string | null
          position?: string | null
          rate_history?: Json | null
          start_date?: string | null
          team_lead?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      article_requests: {
        Row: {
          category: Database["public"]["Enums"]["update_category"] | null
          created_at: string
          description: string
          final_decision: string | null
          final_notes: string | null
          final_reviewed_at: string | null
          final_reviewed_by: string | null
          id: string
          priority: string | null
          reference_number: string | null
          request_type: Database["public"]["Enums"]["request_type"]
          sample_ticket: string | null
          status: Database["public"]["Enums"]["request_status"]
          submitted_at: string
          submitted_by: string
        }
        Insert: {
          category?: Database["public"]["Enums"]["update_category"] | null
          created_at?: string
          description: string
          final_decision?: string | null
          final_notes?: string | null
          final_reviewed_at?: string | null
          final_reviewed_by?: string | null
          id?: string
          priority?: string | null
          reference_number?: string | null
          request_type?: Database["public"]["Enums"]["request_type"]
          sample_ticket?: string | null
          status?: Database["public"]["Enums"]["request_status"]
          submitted_at?: string
          submitted_by: string
        }
        Update: {
          category?: Database["public"]["Enums"]["update_category"] | null
          created_at?: string
          description?: string
          final_decision?: string | null
          final_notes?: string | null
          final_reviewed_at?: string | null
          final_reviewed_by?: string | null
          id?: string
          priority?: string | null
          reference_number?: string | null
          request_type?: Database["public"]["Enums"]["request_type"]
          sample_ticket?: string | null
          status?: Database["public"]["Enums"]["request_status"]
          submitted_at?: string
          submitted_by?: string
        }
        Relationships: []
      }
      leave_request_history: {
        Row: {
          changed_at: string
          changed_by: string
          changes: Json
          id: string
          leave_request_id: string
        }
        Insert: {
          changed_at?: string
          changed_by: string
          changes: Json
          id?: string
          leave_request_id: string
        }
        Update: {
          changed_at?: string
          changed_by?: string
          changes?: Json
          id?: string
          leave_request_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "leave_request_history_leave_request_id_fkey"
            columns: ["leave_request_id"]
            isOneToOne: false
            referencedRelation: "leave_calendar_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "leave_request_history_leave_request_id_fkey"
            columns: ["leave_request_id"]
            isOneToOne: false
            referencedRelation: "leave_requests"
            referencedColumns: ["id"]
          },
        ]
      }
      leave_requests: {
        Row: {
          agent_email: string
          agent_name: string
          attachment_url: string | null
          client_name: string
          conflicting_agents: string | null
          created_at: string
          daily_hours: number | null
          end_date: string
          end_time: string
          id: string
          outage_duration_hours: number | null
          outage_reason: string
          override_reason: string | null
          reference_number: string | null
          remarks: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          role: string
          start_date: string
          start_time: string
          status: string
          team_lead_name: string
          total_days: number | null
          updated_at: string
        }
        Insert: {
          agent_email: string
          agent_name: string
          attachment_url?: string | null
          client_name: string
          conflicting_agents?: string | null
          created_at?: string
          daily_hours?: number | null
          end_date: string
          end_time: string
          id?: string
          outage_duration_hours?: number | null
          outage_reason: string
          override_reason?: string | null
          reference_number?: string | null
          remarks?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          role: string
          start_date: string
          start_time: string
          status?: string
          team_lead_name: string
          total_days?: number | null
          updated_at?: string
        }
        Update: {
          agent_email?: string
          agent_name?: string
          attachment_url?: string | null
          client_name?: string
          conflicting_agents?: string | null
          created_at?: string
          daily_hours?: number | null
          end_date?: string
          end_time?: string
          id?: string
          outage_duration_hours?: number | null
          outage_reason?: string
          override_reason?: string | null
          reference_number?: string | null
          remarks?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          role?: string
          start_date?: string
          start_time?: string
          status?: string
          team_lead_name?: string
          total_days?: number | null
          updated_at?: string
        }
        Relationships: []
      }
      reminder_logs: {
        Row: {
          id: string
          reminder_type: string
          sent_at: string
          update_id: string | null
          user_email: string
        }
        Insert: {
          id?: string
          reminder_type?: string
          sent_at?: string
          update_id?: string | null
          user_email: string
        }
        Update: {
          id?: string
          reminder_type?: string
          sent_at?: string
          update_id?: string | null
          user_email?: string
        }
        Relationships: [
          {
            foreignKeyName: "reminder_logs_update_id_fkey"
            columns: ["update_id"]
            isOneToOne: false
            referencedRelation: "updates"
            referencedColumns: ["id"]
          },
        ]
      }
      request_approvals: {
        Row: {
          active: boolean
          approved: boolean | null
          approved_at: string | null
          approver_email: string
          approver_name: string | null
          created_at: string
          id: string
          request_id: string
          stage: number
        }
        Insert: {
          active?: boolean
          approved?: boolean | null
          approved_at?: string | null
          approver_email: string
          approver_name?: string | null
          created_at?: string
          id?: string
          request_id: string
          stage?: number
        }
        Update: {
          active?: boolean
          approved?: boolean | null
          approved_at?: string | null
          approver_email?: string
          approver_name?: string | null
          created_at?: string
          id?: string
          request_id?: string
          stage?: number
        }
        Relationships: [
          {
            foreignKeyName: "request_approvals_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "article_requests"
            referencedColumns: ["id"]
          },
        ]
      }
      update_change_history: {
        Row: {
          changed_at: string
          changed_by: string
          changes: Json
          id: string
          update_id: string
        }
        Insert: {
          changed_at?: string
          changed_by: string
          changes: Json
          id?: string
          update_id: string
        }
        Update: {
          changed_at?: string
          changed_by?: string
          changes?: Json
          id?: string
          update_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "update_change_history_update_id_fkey"
            columns: ["update_id"]
            isOneToOne: false
            referencedRelation: "updates"
            referencedColumns: ["id"]
          },
        ]
      }
      update_questions: {
        Row: {
          created_at: string
          id: string
          question: string
          reference_number: string | null
          update_id: string
          user_email: string
        }
        Insert: {
          created_at?: string
          id?: string
          question: string
          reference_number?: string | null
          update_id: string
          user_email: string
        }
        Update: {
          created_at?: string
          id?: string
          question?: string
          reference_number?: string | null
          update_id?: string
          user_email?: string
        }
        Relationships: [
          {
            foreignKeyName: "update_questions_update_id_fkey"
            columns: ["update_id"]
            isOneToOne: false
            referencedRelation: "updates"
            referencedColumns: ["id"]
          },
        ]
      }
      updates: {
        Row: {
          body: string
          category: Database["public"]["Enums"]["update_category"] | null
          deadline_at: string | null
          help_center_url: string | null
          id: string
          posted_at: string
          posted_by: string
          reference_number: string | null
          status: Database["public"]["Enums"]["update_status"]
          summary: string
          title: string
        }
        Insert: {
          body: string
          category?: Database["public"]["Enums"]["update_category"] | null
          deadline_at?: string | null
          help_center_url?: string | null
          id?: string
          posted_at?: string
          posted_by: string
          reference_number?: string | null
          status?: Database["public"]["Enums"]["update_status"]
          summary: string
          title: string
        }
        Update: {
          body?: string
          category?: Database["public"]["Enums"]["update_category"] | null
          deadline_at?: string | null
          help_center_url?: string | null
          id?: string
          posted_at?: string
          posted_by?: string
          reference_number?: string | null
          status?: Database["public"]["Enums"]["update_status"]
          summary?: string
          title?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          created_at: string
          email: string
          id: string
          must_change_password: boolean | null
          name: string | null
          role: Database["public"]["Enums"]["app_role"]
        }
        Insert: {
          created_at?: string
          email: string
          id?: string
          must_change_password?: boolean | null
          name?: string | null
          role?: Database["public"]["Enums"]["app_role"]
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          must_change_password?: boolean | null
          name?: string | null
          role?: Database["public"]["Enums"]["app_role"]
        }
        Relationships: []
      }
    }
    Views: {
      leave_calendar_view: {
        Row: {
          agent_name: string | null
          client_name: string | null
          end_date: string | null
          id: string | null
          outage_reason: string | null
          start_date: string | null
          status: string | null
        }
        Insert: {
          agent_name?: string | null
          client_name?: string | null
          end_date?: string | null
          id?: string | null
          outage_reason?: string | null
          start_date?: string | null
          status?: string | null
        }
        Update: {
          agent_name?: string | null
          client_name?: string | null
          end_date?: string | null
          id?: string | null
          outage_reason?: string | null
          start_date?: string | null
          status?: string | null
        }
        Relationships: []
      }
    }
    Functions: {
      has_role: {
        Args: { _email: string; _role: Database["public"]["Enums"]["app_role"] }
        Returns: boolean
      }
      insert_reminder_log: {
        Args: {
          p_reminder_type?: string
          p_update_id?: string
          p_user_email: string
        }
        Returns: string
      }
      is_admin: { Args: { _email: string }; Returns: boolean }
    }
    Enums: {
      app_role: "admin" | "user" | "hr"
      request_status:
        | "pending"
        | "approved"
        | "rejected"
        | "pending_final_review"
      request_type: "new_article" | "update_existing" | "general"
      update_category:
        | "orders_transactions"
        | "payments_billing"
        | "shipping_tracking"
        | "delivery_issues"
        | "international_customs"
        | "product_issues"
        | "product_information"
        | "subscriptions"
        | "warehouse_fulfillment"
        | "internal_operations"
      update_status: "draft" | "published" | "obsolete"
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
      app_role: ["admin", "user", "hr"],
      request_status: [
        "pending",
        "approved",
        "rejected",
        "pending_final_review",
      ],
      request_type: ["new_article", "update_existing", "general"],
      update_category: [
        "orders_transactions",
        "payments_billing",
        "shipping_tracking",
        "delivery_issues",
        "international_customs",
        "product_issues",
        "product_information",
        "subscriptions",
        "warehouse_fulfillment",
        "internal_operations",
      ],
      update_status: ["draft", "published", "obsolete"],
    },
  },
} as const
