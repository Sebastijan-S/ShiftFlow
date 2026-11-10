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
    PostgrestVersion: "14.18"
  }
  public: {
    Tables: {
      assignments: {
        Row: {
          employee_id: string | null
          ends_at: string
          id: string
          local_date: string
          locked: boolean
          position: number
          role_id: string
          shift_template_id: string
          slot_key: string
          starts_at: string
          week_id: string
          workspace_id: string
        }
        Insert: {
          employee_id?: string | null
          ends_at: string
          id?: string
          local_date: string
          locked?: boolean
          position: number
          role_id: string
          shift_template_id: string
          slot_key: string
          starts_at: string
          week_id: string
          workspace_id: string
        }
        Update: {
          employee_id?: string | null
          ends_at?: string
          id?: string
          local_date?: string
          locked?: boolean
          position?: number
          role_id?: string
          shift_template_id?: string
          slot_key?: string
          starts_at?: string
          week_id?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "assignments_employee_id_workspace_id_fkey"
            columns: ["employee_id", "workspace_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id", "workspace_id"]
          },
          {
            foreignKeyName: "assignments_role_id_workspace_id_fkey"
            columns: ["role_id", "workspace_id"]
            isOneToOne: false
            referencedRelation: "roles"
            referencedColumns: ["id", "workspace_id"]
          },
          {
            foreignKeyName: "assignments_shift_template_id_workspace_id_fkey"
            columns: ["shift_template_id", "workspace_id"]
            isOneToOne: false
            referencedRelation: "shift_templates"
            referencedColumns: ["id", "workspace_id"]
          },
          {
            foreignKeyName: "assignments_week_id_workspace_id_fkey"
            columns: ["week_id", "workspace_id"]
            isOneToOne: false
            referencedRelation: "schedule_weeks"
            referencedColumns: ["id", "workspace_id"]
          },
        ]
      }
      availability_exceptions: {
        Row: {
          employee_id: string
          end_time: string | null
          id: string
          local_date: string
          reason: string | null
          start_time: string | null
          workspace_id: string
        }
        Insert: {
          employee_id: string
          end_time?: string | null
          id?: string
          local_date: string
          reason?: string | null
          start_time?: string | null
          workspace_id: string
        }
        Update: {
          employee_id?: string
          end_time?: string | null
          id?: string
          local_date?: string
          reason?: string | null
          start_time?: string | null
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "availability_exceptions_employee_id_workspace_id_fkey"
            columns: ["employee_id", "workspace_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id", "workspace_id"]
          },
        ]
      }
      availability_windows: {
        Row: {
          employee_id: string
          end_time: string
          id: string
          start_time: string
          weekday: number
          workspace_id: string
        }
        Insert: {
          employee_id: string
          end_time: string
          id?: string
          start_time: string
          weekday: number
          workspace_id: string
        }
        Update: {
          employee_id?: string
          end_time?: string
          id?: string
          start_time?: string
          weekday?: number
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "availability_windows_employee_id_workspace_id_fkey"
            columns: ["employee_id", "workspace_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id", "workspace_id"]
          },
        ]
      }
      change_events: {
        Row: {
          actor_id: string
          created_at: string
          id: number
          operation: string
          revision: number
          week_id: string
          workspace_id: string
        }
        Insert: {
          actor_id: string
          created_at?: string
          id?: never
          operation: string
          revision: number
          week_id: string
          workspace_id: string
        }
        Update: {
          actor_id?: string
          created_at?: string
          id?: never
          operation?: string
          revision?: number
          week_id?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "change_events_week_id_workspace_id_fkey"
            columns: ["week_id", "workspace_id"]
            isOneToOne: false
            referencedRelation: "schedule_weeks"
            referencedColumns: ["id", "workspace_id"]
          },
          {
            foreignKeyName: "change_events_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      employee_roles: {
        Row: {
          employee_id: string
          role_id: string
          workspace_id: string
        }
        Insert: {
          employee_id: string
          role_id: string
          workspace_id: string
        }
        Update: {
          employee_id?: string
          role_id?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "employee_roles_employee_id_workspace_id_fkey"
            columns: ["employee_id", "workspace_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id", "workspace_id"]
          },
          {
            foreignKeyName: "employee_roles_role_id_workspace_id_fkey"
            columns: ["role_id", "workspace_id"]
            isOneToOne: false
            referencedRelation: "roles"
            referencedColumns: ["id", "workspace_id"]
          },
          {
            foreignKeyName: "employee_roles_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      employees: {
        Row: {
          active: boolean
          display_name: string
          id: string
          preference: string
          target_hours: number
          workspace_id: string
        }
        Insert: {
          active?: boolean
          display_name: string
          id?: string
          preference?: string
          target_hours?: number
          workspace_id: string
        }
        Update: {
          active?: boolean
          display_name?: string
          id?: string
          preference?: string
          target_hours?: number
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "employees_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      memberships: {
        Row: {
          role: string
          user_id: string
          workspace_id: string
        }
        Insert: {
          role?: string
          user_id: string
          workspace_id: string
        }
        Update: {
          role?: string
          user_id?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "memberships_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      operation_receipts: {
        Row: {
          operation_id: string
          revision: number
          week_id: string
          workspace_id: string
        }
        Insert: {
          operation_id: string
          revision: number
          week_id: string
          workspace_id: string
        }
        Update: {
          operation_id?: string
          revision?: number
          week_id?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "operation_receipts_week_id_workspace_id_fkey"
            columns: ["week_id", "workspace_id"]
            isOneToOne: false
            referencedRelation: "schedule_weeks"
            referencedColumns: ["id", "workspace_id"]
          },
          {
            foreignKeyName: "operation_receipts_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      published_revisions: {
        Row: {
          published_at: string
          revision: number
          snapshot: Json
          week_id: string
          workspace_id: string
        }
        Insert: {
          published_at?: string
          revision: number
          snapshot: Json
          week_id: string
          workspace_id: string
        }
        Update: {
          published_at?: string
          revision?: number
          snapshot?: Json
          week_id?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "published_revisions_week_id_workspace_id_fkey"
            columns: ["week_id", "workspace_id"]
            isOneToOne: false
            referencedRelation: "schedule_weeks"
            referencedColumns: ["id", "workspace_id"]
          },
        ]
      }
      roles: {
        Row: {
          id: string
          name: string
          workspace_id: string
        }
        Insert: {
          id?: string
          name: string
          workspace_id: string
        }
        Update: {
          id?: string
          name?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "roles_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      schedule_weeks: {
        Row: {
          id: string
          published_revision: number | null
          revision: number
          setup_revision: number
          week_start: string
          workspace_id: string
        }
        Insert: {
          id?: string
          published_revision?: number | null
          revision?: number
          setup_revision?: number
          week_start: string
          workspace_id: string
        }
        Update: {
          id?: string
          published_revision?: number | null
          revision?: number
          setup_revision?: number
          week_start?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "schedule_weeks_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      scheduling_rules: {
        Row: {
          max_daily_hours: number
          max_weekly_hours: number
          min_rest_hours: number
          workspace_id: string
        }
        Insert: {
          max_daily_hours?: number
          max_weekly_hours?: number
          min_rest_hours?: number
          workspace_id: string
        }
        Update: {
          max_daily_hours?: number
          max_weekly_hours?: number
          min_rest_hours?: number
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "scheduling_rules_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: true
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      shift_templates: {
        Row: {
          end_time: string
          id: string
          name: string
          start_time: string
          workspace_id: string
        }
        Insert: {
          end_time: string
          id?: string
          name: string
          start_time: string
          workspace_id: string
        }
        Update: {
          end_time?: string
          id?: string
          name?: string
          start_time?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "shift_templates_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      staffing_requirements: {
        Row: {
          id: string
          local_date: string | null
          required_count: number
          role_id: string
          shift_template_id: string
          weekday: number | null
          workspace_id: string
        }
        Insert: {
          id?: string
          local_date?: string | null
          required_count: number
          role_id: string
          shift_template_id: string
          weekday?: number | null
          workspace_id: string
        }
        Update: {
          id?: string
          local_date?: string | null
          required_count?: number
          role_id?: string
          shift_template_id?: string
          weekday?: number | null
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "staffing_requirements_role_id_workspace_id_fkey"
            columns: ["role_id", "workspace_id"]
            isOneToOne: false
            referencedRelation: "roles"
            referencedColumns: ["id", "workspace_id"]
          },
          {
            foreignKeyName: "staffing_requirements_shift_template_id_workspace_id_fkey"
            columns: ["shift_template_id", "workspace_id"]
            isOneToOne: false
            referencedRelation: "shift_templates"
            referencedColumns: ["id", "workspace_id"]
          },
        ]
      }
      team_links: {
        Row: {
          active: boolean
          created_at: string
          token_hash: string
          workspace_id: string
        }
        Insert: {
          active?: boolean
          created_at?: string
          token_hash: string
          workspace_id: string
        }
        Update: {
          active?: boolean
          created_at?: string
          token_hash?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "team_links_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: true
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      workspaces: {
        Row: {
          created_at: string
          id: string
          name: string
          owner_user_id: string
          setup_revision: number
          timezone: string
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
          owner_user_id: string
          setup_revision?: number
          timezone?: string
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
          owner_user_id?: string
          setup_revision?: number
          timezone?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      assert_schedule_valid: {
        Args: { p_week: string; p_workspace: string }
        Returns: undefined
      }
      create_team_link: {
        Args: { p_token: string; p_workspace: string }
        Returns: undefined
      }
      publish_schedule: {
        Args: {
          p_expected_revision: number
          p_week_start: string
          p_workspace: string
        }
        Returns: number
      }
      read_team_week: {
        Args: { p_token: string; p_week_start: string }
        Returns: Json
      }
      revoke_team_link: { Args: { p_workspace: string }; Returns: undefined }
      rotate_team_link: {
        Args: { p_token: string; p_workspace: string }
        Returns: undefined
      }
      save_schedule: {
        Args: {
          p_expected_revision: number
          p_expected_setup_revision: number
          p_operation: string
          p_operation_id: string
          p_slots: Json
          p_week_start: string
          p_workspace: string
        }
        Returns: number
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
} as const
