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
      agent_directory: {
        Row: {
          agent_name: string | null
          agent_tag: string | null
          break_schedule: string | null
          created_at: string
          day_off: string[] | null
          email: string
          fri_ot_schedule: string | null
          fri_schedule: string | null
          id: string
          mon_ot_schedule: string | null
          mon_schedule: string | null
          ot_total_hours: number | null
          overall_total_hours: number | null
          quota: number | null
          sat_ot_schedule: string | null
          sat_schedule: string | null
          sun_ot_schedule: string | null
          sun_schedule: string | null
          support_account: string | null
          support_type: string | null
          thu_ot_schedule: string | null
          thu_schedule: string | null
          ticket_assignment_view_id: string | null
          tue_ot_schedule: string | null
          tue_schedule: string | null
          unpaid_break_hours: number | null
          updated_at: string
          upwork_contract_id: string | null
          views: string[] | null
          wd_ticket_assign: string | null
          we_ticket_assign: string | null
          wed_ot_schedule: string | null
          wed_schedule: string | null
          weekday_ot_schedule: string | null
          weekday_schedule: string | null
          weekday_total_hours: number | null
          weekend_ot_schedule: string | null
          weekend_schedule: string | null
          weekend_total_hours: number | null
          zendesk_instance: string | null
        }
        Insert: {
          agent_name?: string | null
          agent_tag?: string | null
          break_schedule?: string | null
          created_at?: string
          day_off?: string[] | null
          email: string
          fri_ot_schedule?: string | null
          fri_schedule?: string | null
          id?: string
          mon_ot_schedule?: string | null
          mon_schedule?: string | null
          ot_total_hours?: number | null
          overall_total_hours?: number | null
          quota?: number | null
          sat_ot_schedule?: string | null
          sat_schedule?: string | null
          sun_ot_schedule?: string | null
          sun_schedule?: string | null
          support_account?: string | null
          support_type?: string | null
          thu_ot_schedule?: string | null
          thu_schedule?: string | null
          ticket_assignment_view_id?: string | null
          tue_ot_schedule?: string | null
          tue_schedule?: string | null
          unpaid_break_hours?: number | null
          updated_at?: string
          upwork_contract_id?: string | null
          views?: string[] | null
          wd_ticket_assign?: string | null
          we_ticket_assign?: string | null
          wed_ot_schedule?: string | null
          wed_schedule?: string | null
          weekday_ot_schedule?: string | null
          weekday_schedule?: string | null
          weekday_total_hours?: number | null
          weekend_ot_schedule?: string | null
          weekend_schedule?: string | null
          weekend_total_hours?: number | null
          zendesk_instance?: string | null
        }
        Update: {
          agent_name?: string | null
          agent_tag?: string | null
          break_schedule?: string | null
          created_at?: string
          day_off?: string[] | null
          email?: string
          fri_ot_schedule?: string | null
          fri_schedule?: string | null
          id?: string
          mon_ot_schedule?: string | null
          mon_schedule?: string | null
          ot_total_hours?: number | null
          overall_total_hours?: number | null
          quota?: number | null
          sat_ot_schedule?: string | null
          sat_schedule?: string | null
          sun_ot_schedule?: string | null
          sun_schedule?: string | null
          support_account?: string | null
          support_type?: string | null
          thu_ot_schedule?: string | null
          thu_schedule?: string | null
          ticket_assignment_view_id?: string | null
          tue_ot_schedule?: string | null
          tue_schedule?: string | null
          unpaid_break_hours?: number | null
          updated_at?: string
          upwork_contract_id?: string | null
          views?: string[] | null
          wd_ticket_assign?: string | null
          we_ticket_assign?: string | null
          wed_ot_schedule?: string | null
          wed_schedule?: string | null
          weekday_ot_schedule?: string | null
          weekday_schedule?: string | null
          weekday_total_hours?: number | null
          weekend_ot_schedule?: string | null
          weekend_schedule?: string | null
          weekend_total_hours?: number | null
          zendesk_instance?: string | null
        }
        Relationships: []
      }
      agent_directory_history: {
        Row: {
          changed_at: string
          changed_by: string
          changes: Json
          directory_entry_id: string
          id: string
        }
        Insert: {
          changed_at?: string
          changed_by: string
          changes: Json
          directory_entry_id: string
          id?: string
        }
        Update: {
          changed_at?: string
          changed_by?: string
          changes?: Json
          directory_entry_id?: string
          id?: string
        }
        Relationships: [
          {
            foreignKeyName: "agent_directory_history_directory_entry_id_fkey"
            columns: ["directory_entry_id"]
            isOneToOne: false
            referencedRelation: "agent_directory"
            referencedColumns: ["id"]
          },
        ]
      }
      agent_profiles: {
        Row: {
          agent_name: string | null
          agent_tag: string | null
          backup_internet_provider: string | null
          backup_internet_speed: string | null
          backup_internet_type: string | null
          bank_account_holder: string | null
          bank_account_number: string | null
          bank_name: string | null
          birthday: string | null
          break_schedule: string | null
          clients: string | null
          created_at: string | null
          day_off: string[] | null
          email: string
          emergency_contact_name: string | null
          emergency_contact_phone: string | null
          employment_status: string | null
          fri_ot_schedule: string | null
          fri_schedule: string | null
          full_name: string | null
          headset_model: string | null
          home_address: string | null
          hourly_rate: number | null
          id: string
          mon_ot_schedule: string | null
          mon_schedule: string | null
          ot_enabled: boolean | null
          payment_frequency: string | null
          phone_number: string | null
          position: string | null
          primary_internet_provider: string | null
          primary_internet_speed: string | null
          quota_chat: number | null
          quota_email: number | null
          quota_ot_email: number | null
          quota_phone: number | null
          rate_history: Json | null
          sat_ot_schedule: string | null
          sat_schedule: string | null
          start_date: string | null
          sun_ot_schedule: string | null
          sun_schedule: string | null
          support_account: string | null
          support_type: string[] | null
          team_lead: string | null
          thu_ot_schedule: string | null
          thu_schedule: string | null
          ticket_assignment_enabled: boolean | null
          ticket_assignment_view_id: string | null
          tue_ot_schedule: string | null
          tue_schedule: string | null
          updated_at: string | null
          upwork_contract_id: string | null
          upwork_profile_url: string | null
          upwork_username: string | null
          views: string[] | null
          wed_ot_schedule: string | null
          wed_schedule: string | null
          weekday_ot_schedule: string | null
          weekend_ot_schedule: string | null
          work_schedule: string | null
          zendesk_instance: string | null
          zendesk_user_id: string | null
        }
        Insert: {
          agent_name?: string | null
          agent_tag?: string | null
          backup_internet_provider?: string | null
          backup_internet_speed?: string | null
          backup_internet_type?: string | null
          bank_account_holder?: string | null
          bank_account_number?: string | null
          bank_name?: string | null
          birthday?: string | null
          break_schedule?: string | null
          clients?: string | null
          created_at?: string | null
          day_off?: string[] | null
          email: string
          emergency_contact_name?: string | null
          emergency_contact_phone?: string | null
          employment_status?: string | null
          fri_ot_schedule?: string | null
          fri_schedule?: string | null
          full_name?: string | null
          headset_model?: string | null
          home_address?: string | null
          hourly_rate?: number | null
          id?: string
          mon_ot_schedule?: string | null
          mon_schedule?: string | null
          ot_enabled?: boolean | null
          payment_frequency?: string | null
          phone_number?: string | null
          position?: string | null
          primary_internet_provider?: string | null
          primary_internet_speed?: string | null
          quota_chat?: number | null
          quota_email?: number | null
          quota_ot_email?: number | null
          quota_phone?: number | null
          rate_history?: Json | null
          sat_ot_schedule?: string | null
          sat_schedule?: string | null
          start_date?: string | null
          sun_ot_schedule?: string | null
          sun_schedule?: string | null
          support_account?: string | null
          support_type?: string[] | null
          team_lead?: string | null
          thu_ot_schedule?: string | null
          thu_schedule?: string | null
          ticket_assignment_enabled?: boolean | null
          ticket_assignment_view_id?: string | null
          tue_ot_schedule?: string | null
          tue_schedule?: string | null
          updated_at?: string | null
          upwork_contract_id?: string | null
          upwork_profile_url?: string | null
          upwork_username?: string | null
          views?: string[] | null
          wed_ot_schedule?: string | null
          wed_schedule?: string | null
          weekday_ot_schedule?: string | null
          weekend_ot_schedule?: string | null
          work_schedule?: string | null
          zendesk_instance?: string | null
          zendesk_user_id?: string | null
        }
        Update: {
          agent_name?: string | null
          agent_tag?: string | null
          backup_internet_provider?: string | null
          backup_internet_speed?: string | null
          backup_internet_type?: string | null
          bank_account_holder?: string | null
          bank_account_number?: string | null
          bank_name?: string | null
          birthday?: string | null
          break_schedule?: string | null
          clients?: string | null
          created_at?: string | null
          day_off?: string[] | null
          email?: string
          emergency_contact_name?: string | null
          emergency_contact_phone?: string | null
          employment_status?: string | null
          fri_ot_schedule?: string | null
          fri_schedule?: string | null
          full_name?: string | null
          headset_model?: string | null
          home_address?: string | null
          hourly_rate?: number | null
          id?: string
          mon_ot_schedule?: string | null
          mon_schedule?: string | null
          ot_enabled?: boolean | null
          payment_frequency?: string | null
          phone_number?: string | null
          position?: string | null
          primary_internet_provider?: string | null
          primary_internet_speed?: string | null
          quota_chat?: number | null
          quota_email?: number | null
          quota_ot_email?: number | null
          quota_phone?: number | null
          rate_history?: Json | null
          sat_ot_schedule?: string | null
          sat_schedule?: string | null
          start_date?: string | null
          sun_ot_schedule?: string | null
          sun_schedule?: string | null
          support_account?: string | null
          support_type?: string[] | null
          team_lead?: string | null
          thu_ot_schedule?: string | null
          thu_schedule?: string | null
          ticket_assignment_enabled?: boolean | null
          ticket_assignment_view_id?: string | null
          tue_ot_schedule?: string | null
          tue_schedule?: string | null
          updated_at?: string | null
          upwork_contract_id?: string | null
          upwork_profile_url?: string | null
          upwork_username?: string | null
          views?: string[] | null
          wed_ot_schedule?: string | null
          wed_schedule?: string | null
          weekday_ot_schedule?: string | null
          weekend_ot_schedule?: string | null
          work_schedule?: string | null
          zendesk_instance?: string | null
          zendesk_user_id?: string | null
        }
        Relationships: []
      }
      agent_reports: {
        Row: {
          agent_email: string
          agent_name: string
          created_at: string | null
          details: Json | null
          frequency_count: number | null
          id: string
          incident_date: string
          incident_type: string
          notes: string | null
          profile_id: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          severity: string | null
          status: string | null
          updated_at: string | null
        }
        Insert: {
          agent_email: string
          agent_name: string
          created_at?: string | null
          details?: Json | null
          frequency_count?: number | null
          id?: string
          incident_date: string
          incident_type: string
          notes?: string | null
          profile_id?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          severity?: string | null
          status?: string | null
          updated_at?: string | null
        }
        Update: {
          agent_email?: string
          agent_name?: string
          created_at?: string | null
          details?: Json | null
          frequency_count?: number | null
          id?: string
          incident_date?: string
          incident_type?: string
          notes?: string | null
          profile_id?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          severity?: string | null
          status?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "agent_reports_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "agent_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "agent_reports_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "agent_profiles_team_status"
            referencedColumns: ["id"]
          },
        ]
      }
      agent_schedule_assignments: {
        Row: {
          agent_id: string
          break_schedule: string | null
          created_at: string
          created_by: string | null
          day_off: string[] | null
          effective_week_start: string
          fri_ot_schedule: string | null
          fri_schedule: string | null
          id: string
          mon_ot_schedule: string | null
          mon_schedule: string | null
          notes: string | null
          ot_enabled: boolean | null
          quota_chat: number | null
          quota_email: number | null
          quota_ot_email: number | null
          quota_phone: number | null
          sat_ot_schedule: string | null
          sat_schedule: string | null
          source: string
          sun_ot_schedule: string | null
          sun_schedule: string | null
          thu_ot_schedule: string | null
          thu_schedule: string | null
          tue_ot_schedule: string | null
          tue_schedule: string | null
          wed_ot_schedule: string | null
          wed_schedule: string | null
        }
        Insert: {
          agent_id: string
          break_schedule?: string | null
          created_at?: string
          created_by?: string | null
          day_off?: string[] | null
          effective_week_start: string
          fri_ot_schedule?: string | null
          fri_schedule?: string | null
          id?: string
          mon_ot_schedule?: string | null
          mon_schedule?: string | null
          notes?: string | null
          ot_enabled?: boolean | null
          quota_chat?: number | null
          quota_email?: number | null
          quota_ot_email?: number | null
          quota_phone?: number | null
          sat_ot_schedule?: string | null
          sat_schedule?: string | null
          source?: string
          sun_ot_schedule?: string | null
          sun_schedule?: string | null
          thu_ot_schedule?: string | null
          thu_schedule?: string | null
          tue_ot_schedule?: string | null
          tue_schedule?: string | null
          wed_ot_schedule?: string | null
          wed_schedule?: string | null
        }
        Update: {
          agent_id?: string
          break_schedule?: string | null
          created_at?: string
          created_by?: string | null
          day_off?: string[] | null
          effective_week_start?: string
          fri_ot_schedule?: string | null
          fri_schedule?: string | null
          id?: string
          mon_ot_schedule?: string | null
          mon_schedule?: string | null
          notes?: string | null
          ot_enabled?: boolean | null
          quota_chat?: number | null
          quota_email?: number | null
          quota_ot_email?: number | null
          quota_phone?: number | null
          sat_ot_schedule?: string | null
          sat_schedule?: string | null
          source?: string
          sun_ot_schedule?: string | null
          sun_schedule?: string | null
          thu_ot_schedule?: string | null
          thu_schedule?: string | null
          tue_ot_schedule?: string | null
          tue_schedule?: string | null
          wed_ot_schedule?: string | null
          wed_schedule?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "agent_schedule_assignments_agent_id_fkey"
            columns: ["agent_id"]
            isOneToOne: false
            referencedRelation: "agent_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "agent_schedule_assignments_agent_id_fkey"
            columns: ["agent_id"]
            isOneToOne: false
            referencedRelation: "agent_profiles_team_status"
            referencedColumns: ["id"]
          },
        ]
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
      attendance_snapshots: {
        Row: {
          allowed_break_formatted: string | null
          allowed_break_minutes: number | null
          break_duration_formatted: string | null
          break_duration_minutes: number | null
          break_overage_minutes: number | null
          created_at: string
          date: string
          hours_worked_formatted: string | null
          hours_worked_minutes: number | null
          id: string
          is_early_out: boolean | null
          is_overbreak: boolean | null
          leave_type: string | null
          login_time: string | null
          logout_time: string | null
          no_logout: boolean | null
          ot_hours_worked_minutes: number | null
          ot_login_time: string | null
          ot_logout_time: string | null
          ot_schedule: string | null
          ot_status: string | null
          profile_id: string
          schedule_end: string | null
          schedule_start: string | null
          status: string
        }
        Insert: {
          allowed_break_formatted?: string | null
          allowed_break_minutes?: number | null
          break_duration_formatted?: string | null
          break_duration_minutes?: number | null
          break_overage_minutes?: number | null
          created_at?: string
          date: string
          hours_worked_formatted?: string | null
          hours_worked_minutes?: number | null
          id?: string
          is_early_out?: boolean | null
          is_overbreak?: boolean | null
          leave_type?: string | null
          login_time?: string | null
          logout_time?: string | null
          no_logout?: boolean | null
          ot_hours_worked_minutes?: number | null
          ot_login_time?: string | null
          ot_logout_time?: string | null
          ot_schedule?: string | null
          ot_status?: string | null
          profile_id: string
          schedule_end?: string | null
          schedule_start?: string | null
          status: string
        }
        Update: {
          allowed_break_formatted?: string | null
          allowed_break_minutes?: number | null
          break_duration_formatted?: string | null
          break_duration_minutes?: number | null
          break_overage_minutes?: number | null
          created_at?: string
          date?: string
          hours_worked_formatted?: string | null
          hours_worked_minutes?: number | null
          id?: string
          is_early_out?: boolean | null
          is_overbreak?: boolean | null
          leave_type?: string | null
          login_time?: string | null
          logout_time?: string | null
          no_logout?: boolean | null
          ot_hours_worked_minutes?: number | null
          ot_login_time?: string | null
          ot_logout_time?: string | null
          ot_schedule?: string | null
          ot_status?: string | null
          profile_id?: string
          schedule_end?: string | null
          schedule_start?: string | null
          status?: string
        }
        Relationships: []
      }
      coverage_override_logs: {
        Row: {
          agent_id: string
          agent_name: string
          break_schedule: string | null
          changed_by: string
          created_at: string
          date: string
          id: string
          new_value: string | null
          override_type: string
          previous_value: string | null
        }
        Insert: {
          agent_id: string
          agent_name: string
          break_schedule?: string | null
          changed_by: string
          created_at?: string
          date: string
          id?: string
          new_value?: string | null
          override_type: string
          previous_value?: string | null
        }
        Update: {
          agent_id?: string
          agent_name?: string
          break_schedule?: string | null
          changed_by?: string
          created_at?: string
          date?: string
          id?: string
          new_value?: string | null
          override_type?: string
          previous_value?: string | null
        }
        Relationships: []
      }
      coverage_overrides: {
        Row: {
          agent_id: string
          break_schedule: string | null
          created_at: string
          created_by: string | null
          date: string
          id: string
          override_end: string
          override_start: string
          override_type: string
          previous_value: string | null
          reason: string
        }
        Insert: {
          agent_id: string
          break_schedule?: string | null
          created_at?: string
          created_by?: string | null
          date: string
          id?: string
          override_end: string
          override_start: string
          override_type?: string
          previous_value?: string | null
          reason?: string
        }
        Update: {
          agent_id?: string
          break_schedule?: string | null
          created_at?: string
          created_by?: string | null
          date?: string
          id?: string
          override_end?: string
          override_start?: string
          override_type?: string
          previous_value?: string | null
          reason?: string
        }
        Relationships: [
          {
            foreignKeyName: "coverage_overrides_agent_id_fkey"
            columns: ["agent_id"]
            isOneToOne: false
            referencedRelation: "agent_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "coverage_overrides_agent_id_fkey"
            columns: ["agent_id"]
            isOneToOne: false
            referencedRelation: "agent_profiles_team_status"
            referencedColumns: ["id"]
          },
        ]
      }
      deleted_users: {
        Row: {
          deleted_at: string
          deleted_by: string
          email: string
          id: string
          name: string | null
          original_role: string
          restored_at: string | null
        }
        Insert: {
          deleted_at?: string
          deleted_by: string
          email: string
          id?: string
          name?: string | null
          original_role: string
          restored_at?: string | null
        }
        Update: {
          deleted_at?: string
          deleted_by?: string
          email?: string
          id?: string
          name?: string | null
          original_role?: string
          restored_at?: string | null
        }
        Relationships: []
      }
      demo_guide_views: {
        Row: {
          guide_version: number
          id: string
          seen_at: string
          user_email: string
        }
        Insert: {
          guide_version?: number
          id?: string
          seen_at?: string
          user_email: string
        }
        Update: {
          guide_version?: number
          id?: string
          seen_at?: string
          user_email?: string
        }
        Relationships: []
      }
      directory_dropdown_options: {
        Row: {
          category: string
          created_at: string
          display_order: number
          id: string
          is_active: boolean
          value: string
        }
        Insert: {
          category: string
          created_at?: string
          display_order?: number
          id?: string
          is_active?: boolean
          value: string
        }
        Update: {
          category?: string
          created_at?: string
          display_order?: number
          id?: string
          is_active?: boolean
          value?: string
        }
        Relationships: []
      }
      event_snapshots: {
        Row: {
          count: number
          created_at: string
          event_type: string
          id: string
          profile_id: string
          week_start: string
        }
        Insert: {
          count?: number
          created_at?: string
          event_type: string
          id?: string
          profile_id: string
          week_start: string
        }
        Update: {
          count?: number
          created_at?: string
          event_type?: string
          id?: string
          profile_id?: string
          week_start?: string
        }
        Relationships: []
      }
      failed_emails: {
        Row: {
          created_at: string
          error_message: string | null
          function_name: string
          id: string
          last_retry_at: string | null
          payload: Json | null
          recipient_email: string
          resolved_at: string | null
          retry_count: number | null
          subject: string | null
        }
        Insert: {
          created_at?: string
          error_message?: string | null
          function_name: string
          id?: string
          last_retry_at?: string | null
          payload?: Json | null
          recipient_email: string
          resolved_at?: string | null
          retry_count?: number | null
          subject?: string | null
        }
        Update: {
          created_at?: string
          error_message?: string | null
          function_name?: string
          id?: string
          last_retry_at?: string | null
          payload?: Json | null
          recipient_email?: string
          resolved_at?: string | null
          retry_count?: number | null
          subject?: string | null
        }
        Relationships: []
      }
      improvements: {
        Row: {
          assignee_email: string | null
          assignee_name: string | null
          category: string
          completed_at: string | null
          created_at: string
          description: string | null
          due_date: string | null
          id: string
          notes: string | null
          priority: Database["public"]["Enums"]["improvement_priority"]
          remarks: string | null
          requested_by_email: string
          requested_by_name: string | null
          sort_order: number
          status: Database["public"]["Enums"]["improvement_status"]
          task: string
          updated_at: string
        }
        Insert: {
          assignee_email?: string | null
          assignee_name?: string | null
          category: string
          completed_at?: string | null
          created_at?: string
          description?: string | null
          due_date?: string | null
          id?: string
          notes?: string | null
          priority?: Database["public"]["Enums"]["improvement_priority"]
          remarks?: string | null
          requested_by_email: string
          requested_by_name?: string | null
          sort_order?: number
          status?: Database["public"]["Enums"]["improvement_status"]
          task: string
          updated_at?: string
        }
        Update: {
          assignee_email?: string | null
          assignee_name?: string | null
          category?: string
          completed_at?: string | null
          created_at?: string
          description?: string | null
          due_date?: string | null
          id?: string
          notes?: string | null
          priority?: Database["public"]["Enums"]["improvement_priority"]
          remarks?: string | null
          requested_by_email?: string
          requested_by_name?: string | null
          sort_order?: number
          status?: Database["public"]["Enums"]["improvement_status"]
          task?: string
          updated_at?: string
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
          is_auto_generated: boolean | null
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
          is_auto_generated?: boolean | null
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
          is_auto_generated?: boolean | null
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
      notification_settings: {
        Row: {
          created_at: string
          email_notifications: boolean | null
          id: string
          in_app_notifications: boolean | null
          leave_notifications: boolean | null
          question_notifications: boolean | null
          request_notifications: boolean | null
          updated_at: string
          updates_notifications: boolean | null
          user_email: string
        }
        Insert: {
          created_at?: string
          email_notifications?: boolean | null
          id?: string
          in_app_notifications?: boolean | null
          leave_notifications?: boolean | null
          question_notifications?: boolean | null
          request_notifications?: boolean | null
          updated_at?: string
          updates_notifications?: boolean | null
          user_email: string
        }
        Update: {
          created_at?: string
          email_notifications?: boolean | null
          id?: string
          in_app_notifications?: boolean | null
          leave_notifications?: boolean | null
          question_notifications?: boolean | null
          request_notifications?: boolean | null
          updated_at?: string
          updates_notifications?: boolean | null
          user_email?: string
        }
        Relationships: []
      }
      notifications: {
        Row: {
          created_at: string
          id: string
          message: string
          read_at: string | null
          reference_id: string | null
          reference_type: string | null
          title: string
          type: string
          user_email: string
        }
        Insert: {
          created_at?: string
          id?: string
          message: string
          read_at?: string | null
          reference_id?: string | null
          reference_type?: string | null
          title: string
          type?: string
          user_email: string
        }
        Update: {
          created_at?: string
          id?: string
          message?: string
          read_at?: string | null
          reference_id?: string | null
          reference_type?: string | null
          title?: string
          type?: string
          user_email?: string
        }
        Relationships: []
      }
      portal_changelog: {
        Row: {
          category: string
          created_at: string
          created_by: string
          description: string
          feature_link: string | null
          id: string
          reference_number: string | null
          title: string
          updated_at: string
          visible_to_roles: string[]
        }
        Insert: {
          category: string
          created_at?: string
          created_by: string
          description: string
          feature_link?: string | null
          id?: string
          reference_number?: string | null
          title: string
          updated_at?: string
          visible_to_roles?: string[]
        }
        Update: {
          category?: string
          created_at?: string
          created_by?: string
          description?: string
          feature_link?: string | null
          id?: string
          reference_number?: string | null
          title?: string
          updated_at?: string
          visible_to_roles?: string[]
        }
        Relationships: []
      }
      profile_change_requests: {
        Row: {
          created_at: string
          current_value: string | null
          field_name: string
          id: string
          reason: string | null
          reference_number: string | null
          requested_by_email: string
          requested_by_name: string | null
          requested_value: string
          reviewed_at: string | null
          reviewed_by: string | null
          status: string
          target_email: string
        }
        Insert: {
          created_at?: string
          current_value?: string | null
          field_name: string
          id?: string
          reason?: string | null
          reference_number?: string | null
          requested_by_email: string
          requested_by_name?: string | null
          requested_value: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          target_email: string
        }
        Update: {
          created_at?: string
          current_value?: string | null
          field_name?: string
          id?: string
          reason?: string | null
          reference_number?: string | null
          requested_by_email?: string
          requested_by_name?: string | null
          requested_value?: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          target_email?: string
        }
        Relationships: []
      }
      profile_events: {
        Row: {
          created_at: string
          event_type: string
          id: string
          new_status: string
          prev_status: string
          profile_id: string
          triggered_by: string
        }
        Insert: {
          created_at?: string
          event_type: string
          id?: string
          new_status: string
          prev_status: string
          profile_id: string
          triggered_by: string
        }
        Update: {
          created_at?: string
          event_type?: string
          id?: string
          new_status?: string
          prev_status?: string
          profile_id?: string
          triggered_by?: string
        }
        Relationships: [
          {
            foreignKeyName: "profile_events_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "agent_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "profile_events_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "agent_profiles_team_status"
            referencedColumns: ["id"]
          },
        ]
      }
      profile_status: {
        Row: {
          bio_allowance_seconds: number | null
          bio_time_remaining_seconds: number | null
          current_status: string
          id: string
          profile_id: string
          status_since: string
        }
        Insert: {
          bio_allowance_seconds?: number | null
          bio_time_remaining_seconds?: number | null
          current_status?: string
          id?: string
          profile_id: string
          status_since?: string
        }
        Update: {
          bio_allowance_seconds?: number | null
          bio_time_remaining_seconds?: number | null
          current_status?: string
          id?: string
          profile_id?: string
          status_since?: string
        }
        Relationships: [
          {
            foreignKeyName: "profile_status_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: true
            referencedRelation: "agent_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "profile_status_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: true
            referencedRelation: "agent_profiles_team_status"
            referencedColumns: ["id"]
          },
        ]
      }
      qa_action_needed: {
        Row: {
          action_plan_id: string | null
          created_at: string
          custom_action: string | null
          evaluation_id: string
          id: string
          is_resolved: boolean
          resolved_at: string | null
        }
        Insert: {
          action_plan_id?: string | null
          created_at?: string
          custom_action?: string | null
          evaluation_id: string
          id?: string
          is_resolved?: boolean
          resolved_at?: string | null
        }
        Update: {
          action_plan_id?: string | null
          created_at?: string
          custom_action?: string | null
          evaluation_id?: string
          id?: string
          is_resolved?: boolean
          resolved_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "qa_action_needed_action_plan_id_fkey"
            columns: ["action_plan_id"]
            isOneToOne: false
            referencedRelation: "qa_action_plans"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "qa_action_needed_evaluation_id_fkey"
            columns: ["evaluation_id"]
            isOneToOne: false
            referencedRelation: "qa_evaluations"
            referencedColumns: ["id"]
          },
        ]
      }
      qa_action_plan_occurrences: {
        Row: {
          action_plan_id: string | null
          agent_email: string
          created_at: string
          evaluation_id: string
          id: string
          occurred_at: string
          subcategory: string | null
        }
        Insert: {
          action_plan_id?: string | null
          agent_email: string
          created_at?: string
          evaluation_id: string
          id?: string
          occurred_at?: string
          subcategory?: string | null
        }
        Update: {
          action_plan_id?: string | null
          agent_email?: string
          created_at?: string
          evaluation_id?: string
          id?: string
          occurred_at?: string
          subcategory?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "qa_action_plan_occurrences_action_plan_id_fkey"
            columns: ["action_plan_id"]
            isOneToOne: false
            referencedRelation: "qa_action_plans"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "qa_action_plan_occurrences_evaluation_id_fkey"
            columns: ["evaluation_id"]
            isOneToOne: false
            referencedRelation: "qa_evaluations"
            referencedColumns: ["id"]
          },
        ]
      }
      qa_action_plans: {
        Row: {
          action_text: string
          category: string | null
          created_at: string
          display_order: number
          id: string
          is_active: boolean
        }
        Insert: {
          action_text: string
          category?: string | null
          created_at?: string
          display_order?: number
          id?: string
          is_active?: boolean
        }
        Update: {
          action_text?: string
          category?: string | null
          created_at?: string
          display_order?: number
          id?: string
          is_active?: boolean
        }
        Relationships: []
      }
      qa_evaluation_events: {
        Row: {
          actor_email: string
          actor_name: string | null
          created_at: string
          evaluation_id: string
          event_description: string | null
          event_type: string
          id: string
          metadata: Json | null
        }
        Insert: {
          actor_email: string
          actor_name?: string | null
          created_at?: string
          evaluation_id: string
          event_description?: string | null
          event_type: string
          id?: string
          metadata?: Json | null
        }
        Update: {
          actor_email?: string
          actor_name?: string | null
          created_at?: string
          evaluation_id?: string
          event_description?: string | null
          event_type?: string
          id?: string
          metadata?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "qa_evaluation_events_evaluation_id_fkey"
            columns: ["evaluation_id"]
            isOneToOne: false
            referencedRelation: "qa_evaluations"
            referencedColumns: ["id"]
          },
        ]
      }
      qa_evaluation_scores: {
        Row: {
          ai_accepted: boolean | null
          ai_justification: string | null
          ai_suggested_score: number | null
          behavior_identifier: string | null
          category: string
          created_at: string
          critical_error_detected: boolean | null
          evaluation_id: string
          id: string
          is_critical: boolean
          max_points: number
          score_earned: number | null
          subcategory: string
        }
        Insert: {
          ai_accepted?: boolean | null
          ai_justification?: string | null
          ai_suggested_score?: number | null
          behavior_identifier?: string | null
          category: string
          created_at?: string
          critical_error_detected?: boolean | null
          evaluation_id: string
          id?: string
          is_critical?: boolean
          max_points?: number
          score_earned?: number | null
          subcategory: string
        }
        Update: {
          ai_accepted?: boolean | null
          ai_justification?: string | null
          ai_suggested_score?: number | null
          behavior_identifier?: string | null
          category?: string
          created_at?: string
          critical_error_detected?: boolean | null
          evaluation_id?: string
          id?: string
          is_critical?: boolean
          max_points?: number
          score_earned?: number | null
          subcategory?: string
        }
        Relationships: [
          {
            foreignKeyName: "qa_evaluation_scores_evaluation_id_fkey"
            columns: ["evaluation_id"]
            isOneToOne: false
            referencedRelation: "qa_evaluations"
            referencedColumns: ["id"]
          },
        ]
      }
      qa_evaluations: {
        Row: {
          accuracy_feedback: string | null
          accuracy_kudos: string | null
          acknowledged_at: string | null
          agent_acknowledged: boolean
          agent_email: string
          agent_name: string
          agent_remarks: string | null
          agent_reviewed: boolean
          agent_reviewed_at: string | null
          audit_date: string
          coaching_date: string | null
          coaching_time: string | null
          compliance_feedback: string | null
          compliance_kudos: string | null
          created_at: string
          customer_exp_feedback: string | null
          customer_exp_kudos: string | null
          evaluator_email: string
          evaluator_name: string | null
          has_critical_fail: boolean
          id: string
          interaction_type: string
          notification_sent: boolean
          percentage: number
          rating: string | null
          reference_number: string | null
          status: string
          ticket_content: string | null
          ticket_id: string
          ticket_url: string | null
          total_max: number
          total_score: number
          updated_at: string
          work_week_end: string | null
          work_week_start: string | null
          zd_instance: string
        }
        Insert: {
          accuracy_feedback?: string | null
          accuracy_kudos?: string | null
          acknowledged_at?: string | null
          agent_acknowledged?: boolean
          agent_email: string
          agent_name: string
          agent_remarks?: string | null
          agent_reviewed?: boolean
          agent_reviewed_at?: string | null
          audit_date?: string
          coaching_date?: string | null
          coaching_time?: string | null
          compliance_feedback?: string | null
          compliance_kudos?: string | null
          created_at?: string
          customer_exp_feedback?: string | null
          customer_exp_kudos?: string | null
          evaluator_email: string
          evaluator_name?: string | null
          has_critical_fail?: boolean
          id?: string
          interaction_type: string
          notification_sent?: boolean
          percentage?: number
          rating?: string | null
          reference_number?: string | null
          status?: string
          ticket_content?: string | null
          ticket_id: string
          ticket_url?: string | null
          total_max?: number
          total_score?: number
          updated_at?: string
          work_week_end?: string | null
          work_week_start?: string | null
          zd_instance: string
        }
        Update: {
          accuracy_feedback?: string | null
          accuracy_kudos?: string | null
          acknowledged_at?: string | null
          agent_acknowledged?: boolean
          agent_email?: string
          agent_name?: string
          agent_remarks?: string | null
          agent_reviewed?: boolean
          agent_reviewed_at?: string | null
          audit_date?: string
          coaching_date?: string | null
          coaching_time?: string | null
          compliance_feedback?: string | null
          compliance_kudos?: string | null
          created_at?: string
          customer_exp_feedback?: string | null
          customer_exp_kudos?: string | null
          evaluator_email?: string
          evaluator_name?: string | null
          has_critical_fail?: boolean
          id?: string
          interaction_type?: string
          notification_sent?: boolean
          percentage?: number
          rating?: string | null
          reference_number?: string | null
          status?: string
          ticket_content?: string | null
          ticket_id?: string
          ticket_url?: string | null
          total_max?: number
          total_score?: number
          updated_at?: string
          work_week_end?: string | null
          work_week_start?: string | null
          zd_instance?: string
        }
        Relationships: []
      }
      question_replies: {
        Row: {
          created_at: string | null
          id: string
          message: string
          question_id: string
          user_email: string
          user_name: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          message: string
          question_id: string
          user_email: string
          user_name?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          message?: string
          question_id?: string
          user_email?: string
          user_name?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "question_replies_question_id_fkey"
            columns: ["question_id"]
            isOneToOne: false
            referencedRelation: "update_questions"
            referencedColumns: ["id"]
          },
        ]
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
      revalida_answers: {
        Row: {
          answer_value: string | null
          attempt_id: string
          created_at: string
          feedback: string | null
          graded_at: string | null
          id: string
          is_correct: boolean | null
          points_awarded: number | null
          question_id: string
        }
        Insert: {
          answer_value?: string | null
          attempt_id: string
          created_at?: string
          feedback?: string | null
          graded_at?: string | null
          id?: string
          is_correct?: boolean | null
          points_awarded?: number | null
          question_id: string
        }
        Update: {
          answer_value?: string | null
          attempt_id?: string
          created_at?: string
          feedback?: string | null
          graded_at?: string | null
          id?: string
          is_correct?: boolean | null
          points_awarded?: number | null
          question_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "revalida_answers_attempt_id_fkey"
            columns: ["attempt_id"]
            isOneToOne: false
            referencedRelation: "revalida_attempts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "revalida_answers_question_id_fkey"
            columns: ["question_id"]
            isOneToOne: false
            referencedRelation: "revalida_questions"
            referencedColumns: ["id"]
          },
        ]
      }
      revalida_attempts: {
        Row: {
          agent_email: string
          agent_id: string
          auto_score_points: number
          auto_total_points: number
          batch_id: string
          created_at: string
          final_percent: number | null
          graded_at: string | null
          graded_by: string | null
          id: string
          manual_score_points: number
          manual_total_points: number
          question_order: Json
          started_at: string
          status: string
          submitted_at: string | null
        }
        Insert: {
          agent_email: string
          agent_id: string
          auto_score_points?: number
          auto_total_points?: number
          batch_id: string
          created_at?: string
          final_percent?: number | null
          graded_at?: string | null
          graded_by?: string | null
          id?: string
          manual_score_points?: number
          manual_total_points?: number
          question_order?: Json
          started_at?: string
          status?: string
          submitted_at?: string | null
        }
        Update: {
          agent_email?: string
          agent_id?: string
          auto_score_points?: number
          auto_total_points?: number
          batch_id?: string
          created_at?: string
          final_percent?: number | null
          graded_at?: string | null
          graded_by?: string | null
          id?: string
          manual_score_points?: number
          manual_total_points?: number
          question_order?: Json
          started_at?: string
          status?: string
          submitted_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "revalida_attempts_agent_id_fkey"
            columns: ["agent_id"]
            isOneToOne: false
            referencedRelation: "agent_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "revalida_attempts_agent_id_fkey"
            columns: ["agent_id"]
            isOneToOne: false
            referencedRelation: "agent_profiles_team_status"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "revalida_attempts_batch_id_fkey"
            columns: ["batch_id"]
            isOneToOne: false
            referencedRelation: "revalida_batches"
            referencedColumns: ["id"]
          },
        ]
      }
      revalida_batches: {
        Row: {
          created_at: string
          created_by: string
          end_at: string | null
          id: string
          is_active: boolean
          question_count: number
          start_at: string | null
          title: string
          total_points: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by: string
          end_at?: string | null
          id?: string
          is_active?: boolean
          question_count?: number
          start_at?: string | null
          title: string
          total_points?: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string
          end_at?: string | null
          id?: string
          is_active?: boolean
          question_count?: number
          start_at?: string | null
          title?: string
          total_points?: number
          updated_at?: string
        }
        Relationships: []
      }
      revalida_exports: {
        Row: {
          exported_at: string
          exported_by: string
          file_path: string
          id: string
          range_end: string
          range_start: string
          rows_exported: number
        }
        Insert: {
          exported_at?: string
          exported_by?: string
          file_path: string
          id?: string
          range_end: string
          range_start: string
          rows_exported?: number
        }
        Update: {
          exported_at?: string
          exported_by?: string
          file_path?: string
          id?: string
          range_end?: string
          range_start?: string
          rows_exported?: number
        }
        Relationships: []
      }
      revalida_questions: {
        Row: {
          batch_id: string
          choice_a: string | null
          choice_b: string | null
          choice_c: string | null
          choice_d: string | null
          correct_answer: string | null
          created_at: string
          id: string
          is_required: boolean
          order_index: number
          points: number
          prompt: string
          type: string
        }
        Insert: {
          batch_id: string
          choice_a?: string | null
          choice_b?: string | null
          choice_c?: string | null
          choice_d?: string | null
          correct_answer?: string | null
          created_at?: string
          id?: string
          is_required?: boolean
          order_index?: number
          points?: number
          prompt: string
          type: string
        }
        Update: {
          batch_id?: string
          choice_a?: string | null
          choice_b?: string | null
          choice_c?: string | null
          choice_d?: string | null
          correct_answer?: string | null
          created_at?: string
          id?: string
          is_required?: boolean
          order_index?: number
          points?: number
          prompt?: string
          type?: string
        }
        Relationships: [
          {
            foreignKeyName: "revalida_questions_batch_id_fkey"
            columns: ["batch_id"]
            isOneToOne: false
            referencedRelation: "revalida_batches"
            referencedColumns: ["id"]
          },
        ]
      }
      revalida_v2_answers: {
        Row: {
          admin_override_reason: string | null
          admin_override_score: number | null
          agent_answer: string | null
          ai_score_justification: string | null
          ai_status: string | null
          ai_suggested_score: number | null
          attempt_id: string | null
          created_at: string | null
          id: string
          is_correct: boolean | null
          points_earned: number | null
          question_id: string | null
          updated_at: string | null
        }
        Insert: {
          admin_override_reason?: string | null
          admin_override_score?: number | null
          agent_answer?: string | null
          ai_score_justification?: string | null
          ai_status?: string | null
          ai_suggested_score?: number | null
          attempt_id?: string | null
          created_at?: string | null
          id?: string
          is_correct?: boolean | null
          points_earned?: number | null
          question_id?: string | null
          updated_at?: string | null
        }
        Update: {
          admin_override_reason?: string | null
          admin_override_score?: number | null
          agent_answer?: string | null
          ai_score_justification?: string | null
          ai_status?: string | null
          ai_suggested_score?: number | null
          attempt_id?: string | null
          created_at?: string | null
          id?: string
          is_correct?: boolean | null
          points_earned?: number | null
          question_id?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "revalida_v2_answers_attempt_id_fkey"
            columns: ["attempt_id"]
            isOneToOne: false
            referencedRelation: "revalida_v2_attempts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "revalida_v2_answers_question_id_fkey"
            columns: ["question_id"]
            isOneToOne: false
            referencedRelation: "revalida_v2_questions"
            referencedColumns: ["id"]
          },
        ]
      }
      revalida_v2_attempts: {
        Row: {
          agent_email: string
          batch_id: string | null
          created_at: string | null
          graded_at: string | null
          id: string
          percentage: number | null
          question_order: string[] | null
          score: number | null
          started_at: string | null
          status: string | null
          submitted_at: string | null
          updated_at: string | null
        }
        Insert: {
          agent_email: string
          batch_id?: string | null
          created_at?: string | null
          graded_at?: string | null
          id?: string
          percentage?: number | null
          question_order?: string[] | null
          score?: number | null
          started_at?: string | null
          status?: string | null
          submitted_at?: string | null
          updated_at?: string | null
        }
        Update: {
          agent_email?: string
          batch_id?: string | null
          created_at?: string | null
          graded_at?: string | null
          id?: string
          percentage?: number | null
          question_order?: string[] | null
          score?: number | null
          started_at?: string | null
          status?: string | null
          submitted_at?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "revalida_v2_attempts_batch_id_fkey"
            columns: ["batch_id"]
            isOneToOne: false
            referencedRelation: "revalida_v2_batches"
            referencedColumns: ["id"]
          },
        ]
      }
      revalida_v2_batches: {
        Row: {
          created_at: string | null
          created_by: string
          end_at: string
          generation_error: string | null
          generation_status: string | null
          id: string
          is_active: boolean | null
          mcq_count: number
          situational_count: number
          source_week_start: string | null
          start_at: string
          tf_count: number
          title: string
          total_points: number | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          created_by: string
          end_at: string
          generation_error?: string | null
          generation_status?: string | null
          id?: string
          is_active?: boolean | null
          mcq_count?: number
          situational_count?: number
          source_week_start?: string | null
          start_at: string
          tf_count?: number
          title: string
          total_points?: number | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          created_by?: string
          end_at?: string
          generation_error?: string | null
          generation_status?: string | null
          id?: string
          is_active?: boolean | null
          mcq_count?: number
          situational_count?: number
          source_week_start?: string | null
          start_at?: string
          tf_count?: number
          title?: string
          total_points?: number | null
          updated_at?: string | null
        }
        Relationships: []
      }
      revalida_v2_contracts: {
        Row: {
          file_path: string | null
          id: string
          is_active: boolean | null
          name: string
          parsed_content: string
          support_type: string | null
          uploaded_at: string | null
          uploaded_by: string
        }
        Insert: {
          file_path?: string | null
          id?: string
          is_active?: boolean | null
          name: string
          parsed_content: string
          support_type?: string | null
          uploaded_at?: string | null
          uploaded_by: string
        }
        Update: {
          file_path?: string | null
          id?: string
          is_active?: boolean | null
          name?: string
          parsed_content?: string
          support_type?: string | null
          uploaded_at?: string | null
          uploaded_by?: string
        }
        Relationships: []
      }
      revalida_v2_questions: {
        Row: {
          batch_id: string | null
          choice_a: string | null
          choice_b: string | null
          choice_c: string | null
          choice_d: string | null
          correct_answer: string | null
          created_at: string | null
          evaluation_rubric: string | null
          id: string
          order_index: number
          points: number
          prompt: string
          source_excerpt: string | null
          source_reference: string | null
          source_type: string
          type: string
        }
        Insert: {
          batch_id?: string | null
          choice_a?: string | null
          choice_b?: string | null
          choice_c?: string | null
          choice_d?: string | null
          correct_answer?: string | null
          created_at?: string | null
          evaluation_rubric?: string | null
          id?: string
          order_index?: number
          points?: number
          prompt: string
          source_excerpt?: string | null
          source_reference?: string | null
          source_type: string
          type: string
        }
        Update: {
          batch_id?: string | null
          choice_a?: string | null
          choice_b?: string | null
          choice_c?: string | null
          choice_d?: string | null
          correct_answer?: string | null
          created_at?: string | null
          evaluation_rubric?: string | null
          id?: string
          order_index?: number
          points?: number
          prompt?: string
          source_excerpt?: string | null
          source_reference?: string | null
          source_type?: string
          type?: string
        }
        Relationships: [
          {
            foreignKeyName: "revalida_v2_questions_batch_id_fkey"
            columns: ["batch_id"]
            isOneToOne: false
            referencedRelation: "revalida_v2_batches"
            referencedColumns: ["id"]
          },
        ]
      }
      saved_scorecards: {
        Row: {
          agent_email: string
          agent_name: string | null
          approved_leave_days: number | null
          call_aht_seconds: number | null
          chat_aht_seconds: number | null
          chat_frt_seconds: number | null
          created_at: string
          days_present: number | null
          final_score: number | null
          id: string
          is_on_leave: boolean | null
          order_escalation: number | null
          ot_productivity: number | null
          productivity: number | null
          productivity_count: number | null
          qa: number | null
          reliability: number | null
          revalida: number | null
          saved_at: string
          saved_by: string
          scheduled_days: number | null
          support_type: string
          unplanned_outage_days: number | null
          week_end: string
          week_start: string
        }
        Insert: {
          agent_email: string
          agent_name?: string | null
          approved_leave_days?: number | null
          call_aht_seconds?: number | null
          chat_aht_seconds?: number | null
          chat_frt_seconds?: number | null
          created_at?: string
          days_present?: number | null
          final_score?: number | null
          id?: string
          is_on_leave?: boolean | null
          order_escalation?: number | null
          ot_productivity?: number | null
          productivity?: number | null
          productivity_count?: number | null
          qa?: number | null
          reliability?: number | null
          revalida?: number | null
          saved_at?: string
          saved_by: string
          scheduled_days?: number | null
          support_type: string
          unplanned_outage_days?: number | null
          week_end: string
          week_start: string
        }
        Update: {
          agent_email?: string
          agent_name?: string | null
          approved_leave_days?: number | null
          call_aht_seconds?: number | null
          chat_aht_seconds?: number | null
          chat_frt_seconds?: number | null
          created_at?: string
          days_present?: number | null
          final_score?: number | null
          id?: string
          is_on_leave?: boolean | null
          order_escalation?: number | null
          ot_productivity?: number | null
          productivity?: number | null
          productivity_count?: number | null
          qa?: number | null
          reliability?: number | null
          revalida?: number | null
          saved_at?: string
          saved_by?: string
          scheduled_days?: number | null
          support_type?: string
          unplanned_outage_days?: number | null
          week_end?: string
          week_start?: string
        }
        Relationships: []
      }
      scorecard_config: {
        Row: {
          created_at: string
          display_order: number
          goal: number
          id: string
          is_enabled: boolean
          metric_key: string
          support_type: string
          updated_at: string
          weight: number
        }
        Insert: {
          created_at?: string
          display_order?: number
          goal?: number
          id?: string
          is_enabled?: boolean
          metric_key: string
          support_type: string
          updated_at?: string
          weight?: number
        }
        Update: {
          created_at?: string
          display_order?: number
          goal?: number
          id?: string
          is_enabled?: boolean
          metric_key?: string
          support_type?: string
          updated_at?: string
          weight?: number
        }
        Relationships: []
      }
      slack_threads: {
        Row: {
          agent_email: string
          channel: string
          created_at: string
          date: string
          id: string
          thread_ts: string
        }
        Insert: {
          agent_email: string
          channel: string
          created_at?: string
          date: string
          id?: string
          thread_ts: string
        }
        Update: {
          agent_email?: string
          channel?: string
          created_at?: string
          date?: string
          id?: string
          thread_ts?: string
        }
        Relationships: []
      }
      ticket_assignment_locks: {
        Row: {
          expires_at: string
          locked_at: string
          locked_by: string
          view_id: string
        }
        Insert: {
          expires_at?: string
          locked_at?: string
          locked_by: string
          view_id: string
        }
        Update: {
          expires_at?: string
          locked_at?: string
          locked_by?: string
          view_id?: string
        }
        Relationships: []
      }
      ticket_assignment_logs: {
        Row: {
          agent_email: string
          agent_name: string | null
          created_at: string
          error_message: string | null
          id: string
          status: string
          ticket_ids: string[] | null
          tickets_assigned: number
          tickets_requested: number
          view_id: string | null
          view_name: string | null
          zendesk_instance: string | null
        }
        Insert: {
          agent_email: string
          agent_name?: string | null
          created_at?: string
          error_message?: string | null
          id?: string
          status?: string
          ticket_ids?: string[] | null
          tickets_assigned?: number
          tickets_requested?: number
          view_id?: string | null
          view_name?: string | null
          zendesk_instance?: string | null
        }
        Update: {
          agent_email?: string
          agent_name?: string | null
          created_at?: string
          error_message?: string | null
          id?: string
          status?: string
          ticket_ids?: string[] | null
          tickets_assigned?: number
          tickets_requested?: number
          view_id?: string | null
          view_name?: string | null
          zendesk_instance?: string | null
        }
        Relationships: []
      }
      ticket_assignment_view_config: {
        Row: {
          created_at: string
          id: string
          is_enabled: boolean
          support_type_pattern: string
          updated_at: string
          view_id: string | null
          view_name: string
          zendesk_instance: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_enabled?: boolean
          support_type_pattern: string
          updated_at?: string
          view_id?: string | null
          view_name: string
          zendesk_instance: string
        }
        Update: {
          created_at?: string
          id?: string
          is_enabled?: boolean
          support_type_pattern?: string
          updated_at?: string
          view_id?: string | null
          view_name?: string
          zendesk_instance?: string
        }
        Relationships: []
      }
      ticket_gap_daily: {
        Row: {
          agent_email: string | null
          agent_name: string
          avg_gap_seconds: number | null
          created_at: string | null
          date: string
          id: string
          max_gap_seconds: number | null
          min_gap_seconds: number | null
          ticket_count: number
          total_gap_seconds: number | null
        }
        Insert: {
          agent_email?: string | null
          agent_name: string
          avg_gap_seconds?: number | null
          created_at?: string | null
          date: string
          id?: string
          max_gap_seconds?: number | null
          min_gap_seconds?: number | null
          ticket_count?: number
          total_gap_seconds?: number | null
        }
        Update: {
          agent_email?: string | null
          agent_name?: string
          avg_gap_seconds?: number | null
          created_at?: string | null
          date?: string
          id?: string
          max_gap_seconds?: number | null
          min_gap_seconds?: number | null
          ticket_count?: number
          total_gap_seconds?: number | null
        }
        Relationships: []
      }
      ticket_logs: {
        Row: {
          agent_email: string | null
          agent_name: string
          created_at: string | null
          id: string
          is_ot: boolean | null
          status: string
          ticket_id: string
          ticket_type: string
          timestamp: string
          zd_instance: string
        }
        Insert: {
          agent_email?: string | null
          agent_name: string
          created_at?: string | null
          id?: string
          is_ot?: boolean | null
          status: string
          ticket_id: string
          ticket_type: string
          timestamp: string
          zd_instance: string
        }
        Update: {
          agent_email?: string | null
          agent_name?: string
          created_at?: string | null
          id?: string
          is_ot?: boolean | null
          status?: string
          ticket_id?: string
          ticket_type?: string
          timestamp?: string
          zd_instance?: string
        }
        Relationships: []
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
          replied_at: string | null
          replied_by: string | null
          reply: string | null
          status: string
          update_id: string
          user_email: string
        }
        Insert: {
          created_at?: string
          id?: string
          question: string
          reference_number?: string | null
          replied_at?: string | null
          replied_by?: string | null
          reply?: string | null
          status?: string
          update_id: string
          user_email: string
        }
        Update: {
          created_at?: string
          id?: string
          question?: string
          reference_number?: string | null
          replied_at?: string | null
          replied_by?: string | null
          reply?: string | null
          status?: string
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
      upwork_daily_logs: {
        Row: {
          agent_email: string
          contract_id: string
          created_at: string | null
          date: string
          fetched_at: string | null
          first_cell_index: number | null
          first_cell_time: string | null
          id: string
          last_cell_index: number | null
          last_cell_time: string | null
          total_cells: number | null
          total_hours: number | null
        }
        Insert: {
          agent_email: string
          contract_id: string
          created_at?: string | null
          date: string
          fetched_at?: string | null
          first_cell_index?: number | null
          first_cell_time?: string | null
          id?: string
          last_cell_index?: number | null
          last_cell_time?: string | null
          total_cells?: number | null
          total_hours?: number | null
        }
        Update: {
          agent_email?: string
          contract_id?: string
          created_at?: string | null
          date?: string
          fetched_at?: string | null
          first_cell_index?: number | null
          first_cell_time?: string | null
          id?: string
          last_cell_index?: number | null
          last_cell_time?: string | null
          total_cells?: number | null
          total_hours?: number | null
        }
        Relationships: []
      }
      upwork_tokens: {
        Row: {
          access_token: string
          created_at: string | null
          expires_at: string
          id: string
          organization_id: string | null
          organization_name: string | null
          refresh_lock_until: string | null
          refresh_token: string
          updated_at: string | null
        }
        Insert: {
          access_token: string
          created_at?: string | null
          expires_at: string
          id?: string
          organization_id?: string | null
          organization_name?: string | null
          refresh_lock_until?: string | null
          refresh_token: string
          updated_at?: string | null
        }
        Update: {
          access_token?: string
          created_at?: string | null
          expires_at?: string
          id?: string
          organization_id?: string | null
          organization_name?: string | null
          refresh_lock_until?: string | null
          refresh_token?: string
          updated_at?: string | null
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
      weekly_agent_metrics: {
        Row: {
          agent_email: string
          agent_id: string
          attendance_json: Json | null
          avg_gap_seconds: number | null
          call_count: number | null
          chat_count: number | null
          computed_at: string
          created_at: string
          email_count: number | null
          id: string
          is_final: boolean
          total_break_minutes: number | null
          total_hours_worked: number | null
          total_tickets: number | null
          updated_at: string
          version: number
          week_start: string
        }
        Insert: {
          agent_email: string
          agent_id: string
          attendance_json?: Json | null
          avg_gap_seconds?: number | null
          call_count?: number | null
          chat_count?: number | null
          computed_at?: string
          created_at?: string
          email_count?: number | null
          id?: string
          is_final?: boolean
          total_break_minutes?: number | null
          total_hours_worked?: number | null
          total_tickets?: number | null
          updated_at?: string
          version?: number
          week_start: string
        }
        Update: {
          agent_email?: string
          agent_id?: string
          attendance_json?: Json | null
          avg_gap_seconds?: number | null
          call_count?: number | null
          chat_count?: number | null
          computed_at?: string
          created_at?: string
          email_count?: number | null
          id?: string
          is_final?: boolean
          total_break_minutes?: number | null
          total_hours_worked?: number | null
          total_tickets?: number | null
          updated_at?: string
          version?: number
          week_start?: string
        }
        Relationships: []
      }
      weekly_incident_snapshots: {
        Row: {
          agent_email: string
          agent_id: string
          by_type: Json | null
          computed_at: string
          created_at: string
          id: string
          incident_count: number | null
          incidents_json: Json | null
          is_final: boolean
          updated_at: string
          version: number
          week_start: string
        }
        Insert: {
          agent_email: string
          agent_id: string
          by_type?: Json | null
          computed_at?: string
          created_at?: string
          id?: string
          incident_count?: number | null
          incidents_json?: Json | null
          is_final?: boolean
          updated_at?: string
          version?: number
          week_start: string
        }
        Update: {
          agent_email?: string
          agent_id?: string
          by_type?: Json | null
          computed_at?: string
          created_at?: string
          id?: string
          incident_count?: number | null
          incidents_json?: Json | null
          is_final?: boolean
          updated_at?: string
          version?: number
          week_start?: string
        }
        Relationships: []
      }
      weekly_scorecard_snapshots: {
        Row: {
          agent_email: string
          agent_id: string
          agent_name: string | null
          approved_leave_days: number | null
          call_aht_seconds: number | null
          chat_aht_seconds: number | null
          chat_frt_seconds: number | null
          computed_at: string
          created_at: string
          days_present: number | null
          expected_hours: number | null
          final_score: number | null
          id: string
          is_final: boolean
          is_on_leave: boolean | null
          order_escalation: number | null
          ot_productivity: number | null
          planned_leave_days: number | null
          productivity: number | null
          productivity_count: number | null
          qa: number | null
          reliability: number | null
          revalida: number | null
          schedule_json: Json | null
          schedule_source: string | null
          scheduled_days: number | null
          support_type: string | null
          unplanned_outage_days: number | null
          updated_at: string
          version: number
          week_end: string
          week_start: string
        }
        Insert: {
          agent_email: string
          agent_id: string
          agent_name?: string | null
          approved_leave_days?: number | null
          call_aht_seconds?: number | null
          chat_aht_seconds?: number | null
          chat_frt_seconds?: number | null
          computed_at?: string
          created_at?: string
          days_present?: number | null
          expected_hours?: number | null
          final_score?: number | null
          id?: string
          is_final?: boolean
          is_on_leave?: boolean | null
          order_escalation?: number | null
          ot_productivity?: number | null
          planned_leave_days?: number | null
          productivity?: number | null
          productivity_count?: number | null
          qa?: number | null
          reliability?: number | null
          revalida?: number | null
          schedule_json?: Json | null
          schedule_source?: string | null
          scheduled_days?: number | null
          support_type?: string | null
          unplanned_outage_days?: number | null
          updated_at?: string
          version?: number
          week_end: string
          week_start: string
        }
        Update: {
          agent_email?: string
          agent_id?: string
          agent_name?: string | null
          approved_leave_days?: number | null
          call_aht_seconds?: number | null
          chat_aht_seconds?: number | null
          chat_frt_seconds?: number | null
          computed_at?: string
          created_at?: string
          days_present?: number | null
          expected_hours?: number | null
          final_score?: number | null
          id?: string
          is_final?: boolean
          is_on_leave?: boolean | null
          order_escalation?: number | null
          ot_productivity?: number | null
          planned_leave_days?: number | null
          productivity?: number | null
          productivity_count?: number | null
          qa?: number | null
          reliability?: number | null
          revalida?: number | null
          schedule_json?: Json | null
          schedule_source?: string | null
          scheduled_days?: number | null
          support_type?: string | null
          unplanned_outage_days?: number | null
          updated_at?: string
          version?: number
          week_end?: string
          week_start?: string
        }
        Relationships: []
      }
      weekly_snapshot_state: {
        Row: {
          archive_file_path: string | null
          created_at: string
          error_message: string | null
          finalized_at: string | null
          id: string
          last_computed_at: string | null
          lock_key: string | null
          raw_data_deleted_at: string | null
          status: string
          updated_at: string
          week_start: string
        }
        Insert: {
          archive_file_path?: string | null
          created_at?: string
          error_message?: string | null
          finalized_at?: string | null
          id?: string
          last_computed_at?: string | null
          lock_key?: string | null
          raw_data_deleted_at?: string | null
          status?: string
          updated_at?: string
          week_start: string
        }
        Update: {
          archive_file_path?: string | null
          created_at?: string
          error_message?: string | null
          finalized_at?: string | null
          id?: string
          last_computed_at?: string | null
          lock_key?: string | null
          raw_data_deleted_at?: string | null
          status?: string
          updated_at?: string
          week_start?: string
        }
        Relationships: []
      }
      weekly_ticket_summary: {
        Row: {
          agent_email: string
          archive_file_path: string | null
          computed_at: string
          created_at: string
          daily_breakdown: Json | null
          id: string
          is_final: boolean
          total_tickets: number | null
          updated_at: string
          version: number
          week_start: string
          zd_instance: string | null
        }
        Insert: {
          agent_email: string
          archive_file_path?: string | null
          computed_at?: string
          created_at?: string
          daily_breakdown?: Json | null
          id?: string
          is_final?: boolean
          total_tickets?: number | null
          updated_at?: string
          version?: number
          week_start: string
          zd_instance?: string | null
        }
        Update: {
          agent_email?: string
          archive_file_path?: string | null
          computed_at?: string
          created_at?: string
          daily_breakdown?: Json | null
          id?: string
          is_final?: boolean
          total_tickets?: number | null
          updated_at?: string
          version?: number
          week_start?: string
          zd_instance?: string | null
        }
        Relationships: []
      }
      zendesk_agent_metrics: {
        Row: {
          agent_email: string
          call_aht_seconds: number | null
          chat_aht_seconds: number | null
          chat_frt_seconds: number | null
          created_at: string
          fetched_at: string
          id: string
          order_escalation: number | null
          total_calls: number | null
          total_chats: number | null
          week_end: string
          week_start: string
        }
        Insert: {
          agent_email: string
          call_aht_seconds?: number | null
          chat_aht_seconds?: number | null
          chat_frt_seconds?: number | null
          created_at?: string
          fetched_at?: string
          id?: string
          order_escalation?: number | null
          total_calls?: number | null
          total_chats?: number | null
          week_end: string
          week_start: string
        }
        Update: {
          agent_email?: string
          call_aht_seconds?: number | null
          chat_aht_seconds?: number | null
          chat_frt_seconds?: number | null
          created_at?: string
          fetched_at?: string
          id?: string
          order_escalation?: number | null
          total_calls?: number | null
          total_chats?: number | null
          week_end?: string
          week_start?: string
        }
        Relationships: []
      }
    }
    Views: {
      agent_profiles_team_status: {
        Row: {
          break_schedule: string | null
          day_off: string[] | null
          email: string | null
          employment_status: string | null
          fri_ot_schedule: string | null
          fri_schedule: string | null
          full_name: string | null
          id: string | null
          mon_ot_schedule: string | null
          mon_schedule: string | null
          position: string | null
          sat_ot_schedule: string | null
          sat_schedule: string | null
          sun_ot_schedule: string | null
          sun_schedule: string | null
          thu_ot_schedule: string | null
          thu_schedule: string | null
          tue_ot_schedule: string | null
          tue_schedule: string | null
          wed_ot_schedule: string | null
          wed_schedule: string | null
        }
        Insert: {
          break_schedule?: string | null
          day_off?: string[] | null
          email?: string | null
          employment_status?: string | null
          fri_ot_schedule?: string | null
          fri_schedule?: string | null
          full_name?: string | null
          id?: string | null
          mon_ot_schedule?: string | null
          mon_schedule?: string | null
          position?: string | null
          sat_ot_schedule?: string | null
          sat_schedule?: string | null
          sun_ot_schedule?: string | null
          sun_schedule?: string | null
          thu_ot_schedule?: string | null
          thu_schedule?: string | null
          tue_ot_schedule?: string | null
          tue_schedule?: string | null
          wed_ot_schedule?: string | null
          wed_schedule?: string | null
        }
        Update: {
          break_schedule?: string | null
          day_off?: string[] | null
          email?: string | null
          employment_status?: string | null
          fri_ot_schedule?: string | null
          fri_schedule?: string | null
          full_name?: string | null
          id?: string | null
          mon_ot_schedule?: string | null
          mon_schedule?: string | null
          position?: string | null
          sat_ot_schedule?: string | null
          sat_schedule?: string | null
          sun_ot_schedule?: string | null
          sun_schedule?: string | null
          thu_ot_schedule?: string | null
          thu_schedule?: string | null
          tue_ot_schedule?: string | null
          tue_schedule?: string | null
          wed_ot_schedule?: string | null
          wed_schedule?: string | null
        }
        Relationships: []
      }
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
      get_agent_dashboard_data:
        | {
            Args: { p_profile_id: string }
            Returns: {
              agent_name: string
              agent_position: string
              avg_response_gap_seconds: number
              current_status: string
              current_status_counter: number
              day_off: string[]
              email: string
              fri_schedule: string
              full_name: string
              latest_login_time: string
              mon_schedule: string
              ot_enabled: boolean
              profile_id: string
              quota_chat: number
              quota_email: number
              quota_phone: number
              sat_schedule: string
              status_since: string
              sun_schedule: string
              support_type: string
              thu_schedule: string
              ticket_assignment_view_id: string
              total_tickets_today: number
              total_tickets_week: number
              tue_schedule: string
              wed_schedule: string
              week_end_date: string
              week_start_date: string
              zendesk_instance: string
            }[]
          }
        | {
            Args: { p_profile_id: string; p_reference_date?: string }
            Returns: {
              agent_name: string
              agent_position: string
              avg_response_gap_seconds: number
              current_status: string
              current_status_counter: number
              day_off: string[]
              email: string
              fri_schedule: string
              full_name: string
              latest_login_time: string
              mon_schedule: string
              ot_enabled: boolean
              profile_id: string
              quota_chat: number
              quota_email: number
              quota_ot_email: number
              quota_phone: number
              sat_schedule: string
              status_since: string
              sun_schedule: string
              support_type: string
              thu_schedule: string
              ticket_assignment_view_id: string
              total_tickets_today: number
              total_tickets_week: number
              tue_schedule: string
              wed_schedule: string
              week_end_date: string
              week_start_date: string
              zendesk_instance: string
            }[]
          }
      get_effective_schedule: {
        Args: { p_agent_id: string; p_target_date: string }
        Returns: {
          effective_break_schedule: string
          effective_ot_schedule: string
          effective_quota_chat: number
          effective_quota_email: number
          effective_quota_ot_email: number
          effective_quota_phone: number
          effective_schedule: string
          is_day_off: boolean
          is_override: boolean
          override_reason: string
        }[]
      }
      get_effective_schedules_for_week: {
        Args: { p_agent_id: string; p_week_start: string }
        Returns: {
          day_date: string
          day_name: string
          effective_break_schedule: string
          effective_ot_schedule: string
          effective_quota_chat: number
          effective_quota_email: number
          effective_quota_ot_email: number
          effective_quota_phone: number
          effective_schedule: string
          is_day_off: boolean
          is_override: boolean
          override_reason: string
        }[]
      }
      get_super_admin_count: { Args: never; Returns: number }
      get_ticket_dashboard_data: {
        Args: {
          p_end_date: string
          p_start_date: string
          p_zd_instance: string
        }
        Returns: {
          agent_email: string
          agent_name: string
          avg_gap_seconds: number
          call_count: number
          chat_count: number
          email_count: number
          is_logged_in: boolean
          log_date: string
        }[]
      }
      get_weekly_scorecard_data: {
        Args: {
          p_support_type?: string
          p_week_end: string
          p_week_start: string
        }
        Returns: {
          agent_email: string
          agent_name: string
          agent_position: string
          approved_leave_days: number
          call_aht_seconds: number
          call_count: number
          chat_aht_seconds: number
          chat_count: number
          chat_frt_seconds: number
          day_off: string[]
          days_with_login: number
          email_count: number
          fri_schedule: string
          is_saved: boolean
          mon_schedule: string
          order_escalation: number
          ot_email_count: number
          planned_leave_days: number
          profile_id: string
          qa_average: number
          quota_chat: number
          quota_email: number
          quota_ot_email: number
          quota_phone: number
          revalida_score: number
          sat_schedule: string
          sun_schedule: string
          thu_schedule: string
          tue_schedule: string
          unplanned_outage_days: number
          wed_schedule: string
        }[]
      }
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
      is_revalida_admin: { Args: { _email: string }; Returns: boolean }
      is_super_admin: { Args: { _email: string }; Returns: boolean }
    }
    Enums: {
      app_role: "admin" | "user" | "hr" | "super_admin"
      improvement_priority: "low" | "medium" | "high"
      improvement_status:
        | "not_started"
        | "in_progress"
        | "on_hold"
        | "completed"
        | "for_checking"
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
      app_role: ["admin", "user", "hr", "super_admin"],
      improvement_priority: ["low", "medium", "high"],
      improvement_status: [
        "not_started",
        "in_progress",
        "on_hold",
        "completed",
        "for_checking",
      ],
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
