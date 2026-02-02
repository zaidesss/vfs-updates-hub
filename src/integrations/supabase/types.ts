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
          fri_schedule: string | null
          id: string
          mon_schedule: string | null
          ot_total_hours: number | null
          overall_total_hours: number | null
          quota: number | null
          sat_schedule: string | null
          sun_schedule: string | null
          support_account: string | null
          support_type: string | null
          thu_schedule: string | null
          ticket_assignment_view_id: string | null
          tue_schedule: string | null
          unpaid_break_hours: number | null
          updated_at: string
          upwork_contract_id: string | null
          views: string[] | null
          wd_ticket_assign: string | null
          we_ticket_assign: string | null
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
          fri_schedule?: string | null
          id?: string
          mon_schedule?: string | null
          ot_total_hours?: number | null
          overall_total_hours?: number | null
          quota?: number | null
          sat_schedule?: string | null
          sun_schedule?: string | null
          support_account?: string | null
          support_type?: string | null
          thu_schedule?: string | null
          ticket_assignment_view_id?: string | null
          tue_schedule?: string | null
          unpaid_break_hours?: number | null
          updated_at?: string
          upwork_contract_id?: string | null
          views?: string[] | null
          wd_ticket_assign?: string | null
          we_ticket_assign?: string | null
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
          fri_schedule?: string | null
          id?: string
          mon_schedule?: string | null
          ot_total_hours?: number | null
          overall_total_hours?: number | null
          quota?: number | null
          sat_schedule?: string | null
          sun_schedule?: string | null
          support_account?: string | null
          support_type?: string | null
          thu_schedule?: string | null
          ticket_assignment_view_id?: string | null
          tue_schedule?: string | null
          unpaid_break_hours?: number | null
          updated_at?: string
          upwork_contract_id?: string | null
          views?: string[] | null
          wd_ticket_assign?: string | null
          we_ticket_assign?: string | null
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
          fri_schedule: string | null
          full_name: string | null
          headset_model: string | null
          home_address: string | null
          hourly_rate: number | null
          id: string
          mon_schedule: string | null
          payment_frequency: string | null
          phone_number: string | null
          position: string | null
          primary_internet_provider: string | null
          primary_internet_speed: string | null
          quota_chat: number | null
          quota_email: number | null
          quota_phone: number | null
          rate_history: Json | null
          sat_schedule: string | null
          start_date: string | null
          sun_schedule: string | null
          support_account: string | null
          support_type: string[] | null
          team_lead: string | null
          thu_schedule: string | null
          ticket_assignment_enabled: boolean | null
          ticket_assignment_view_id: string | null
          tue_schedule: string | null
          updated_at: string | null
          upwork_contract_id: string | null
          upwork_profile_url: string | null
          upwork_username: string | null
          views: string[] | null
          wed_schedule: string | null
          weekday_ot_schedule: string | null
          weekend_ot_schedule: string | null
          work_schedule: string | null
          zendesk_instance: string | null
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
          fri_schedule?: string | null
          full_name?: string | null
          headset_model?: string | null
          home_address?: string | null
          hourly_rate?: number | null
          id?: string
          mon_schedule?: string | null
          payment_frequency?: string | null
          phone_number?: string | null
          position?: string | null
          primary_internet_provider?: string | null
          primary_internet_speed?: string | null
          quota_chat?: number | null
          quota_email?: number | null
          quota_phone?: number | null
          rate_history?: Json | null
          sat_schedule?: string | null
          start_date?: string | null
          sun_schedule?: string | null
          support_account?: string | null
          support_type?: string[] | null
          team_lead?: string | null
          thu_schedule?: string | null
          ticket_assignment_enabled?: boolean | null
          ticket_assignment_view_id?: string | null
          tue_schedule?: string | null
          updated_at?: string | null
          upwork_contract_id?: string | null
          upwork_profile_url?: string | null
          upwork_username?: string | null
          views?: string[] | null
          wed_schedule?: string | null
          weekday_ot_schedule?: string | null
          weekend_ot_schedule?: string | null
          work_schedule?: string | null
          zendesk_instance?: string | null
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
          fri_schedule?: string | null
          full_name?: string | null
          headset_model?: string | null
          home_address?: string | null
          hourly_rate?: number | null
          id?: string
          mon_schedule?: string | null
          payment_frequency?: string | null
          phone_number?: string | null
          position?: string | null
          primary_internet_provider?: string | null
          primary_internet_speed?: string | null
          quota_chat?: number | null
          quota_email?: number | null
          quota_phone?: number | null
          rate_history?: Json | null
          sat_schedule?: string | null
          start_date?: string | null
          sun_schedule?: string | null
          support_account?: string | null
          support_type?: string[] | null
          team_lead?: string | null
          thu_schedule?: string | null
          ticket_assignment_enabled?: boolean | null
          ticket_assignment_view_id?: string | null
          tue_schedule?: string | null
          updated_at?: string | null
          upwork_contract_id?: string | null
          upwork_profile_url?: string | null
          upwork_username?: string | null
          views?: string[] | null
          wed_schedule?: string | null
          weekday_ot_schedule?: string | null
          weekend_ot_schedule?: string | null
          work_schedule?: string | null
          zendesk_instance?: string | null
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
    }
    Views: {
      agent_profiles_team_status: {
        Row: {
          email: string | null
          full_name: string | null
          id: string | null
          position: string | null
        }
        Insert: {
          email?: string | null
          full_name?: string | null
          id?: string | null
          position?: string | null
        }
        Update: {
          email?: string | null
          full_name?: string | null
          id?: string | null
          position?: string | null
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
