export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema['CompositeTypes']
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions['schema']]['CompositeTypes']
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions['schema']]['CompositeTypes'][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema['CompositeTypes']
    ? DefaultSchema['CompositeTypes'][PublicCompositeTypeNameOrOptions]
    : never;

export interface Database {
  graphql_public: {
    CompositeTypes: Record<never, never>;
    Enums: Record<never, never>;
    Functions: {
      graphql: {
        Args: {
          extensions?: Json;
          operationName?: string;
          query?: string;
          variables?: Json;
        };
        Returns: Json;
      };
    };
    Tables: Record<never, never>;
    Views: Record<never, never>;
  };
  public: {
    CompositeTypes: Record<never, never>;
    Enums: {
      event_type: 'key_created' | 'language_added' | 'project_created' | 'translation_completed';
      item_status: 'completed' | 'failed' | 'pending' | 'skipped';
      job_status: 'cancelled' | 'completed' | 'failed' | 'pending' | 'running';
      translation_mode: 'all' | 'selected' | 'single';
      update_source_type: 'system' | 'user';
    };
    Functions: {
      citext: {
        Args: { '': boolean } | { '': string } | { '': unknown };
        Returns: string;
      };
      citext_hash: {
        Args: { '': string };
        Returns: number;
      };
      citextin: {
        Args: { '': unknown };
        Returns: string;
      };
      citextout: {
        Args: { '': string };
        Returns: unknown;
      };
      citextrecv: {
        Args: { '': unknown };
        Returns: string;
      };
      citextsend: {
        Args: { '': string };
        Returns: string;
      };
      create_key_with_value: {
        Args: {
          p_default_value: string;
          p_full_key: string;
          p_project_id: string;
        };
        Returns: {
          key_id: string;
        }[];
      };
      create_next_telemetry_partition: {
        Args: Record<PropertyKey, never>;
        Returns: undefined;
      };
      create_project_with_default_locale: {
        Args: {
          p_default_locale: unknown;
          p_default_locale_label: string;
          p_description?: string;
          p_name: string;
          p_prefix: string;
        };
        Returns: {
          created_at: string;
          default_locale: unknown;
          description: string;
          id: string;
          name: string;
          prefix: string;
          updated_at: string;
        }[];
      };
      gtrgm_compress: {
        Args: { '': unknown };
        Returns: unknown;
      };
      gtrgm_decompress: {
        Args: { '': unknown };
        Returns: unknown;
      };
      gtrgm_in: {
        Args: { '': unknown };
        Returns: unknown;
      };
      gtrgm_options: {
        Args: { '': unknown };
        Returns: undefined;
      };
      gtrgm_out: {
        Args: { '': unknown };
        Returns: unknown;
      };
      list_keys_default_view: {
        Args: {
          p_limit?: number;
          p_missing_only?: boolean;
          p_offset?: number;
          p_project_id: string;
          p_search?: string;
        };
        Returns: {
          created_at: string;
          full_key: string;
          id: string;
          missing_count: number;
          value: string;
        }[];
      };
      list_keys_per_language_view: {
        Args: {
          p_limit?: number;
          p_locale: unknown;
          p_missing_only?: boolean;
          p_offset?: number;
          p_project_id: string;
          p_search?: string;
        };
        Returns: {
          full_key: string;
          is_machine_translated: boolean;
          key_id: string;
          updated_at: string;
          updated_by_user_id: string;
          updated_source: Database['public']['Enums']['update_source_type'];
          value: string;
        }[];
      };
      list_project_locales_with_default: {
        Args: { p_project_id: string };
        Returns: {
          created_at: string;
          id: string;
          is_default: boolean;
          label: string;
          locale: unknown;
          project_id: string;
          updated_at: string;
        }[];
      };
      list_projects_with_counts: {
        Args: { p_limit?: number; p_offset?: number };
        Returns: {
          created_at: string;
          default_locale: unknown;
          description: string;
          id: string;
          key_count: number;
          locale_count: number;
          name: string;
          prefix: string;
          updated_at: string;
        }[];
      };
      set_limit: {
        Args: { '': number };
        Returns: number;
      };
      show_limit: {
        Args: Record<PropertyKey, never>;
        Returns: number;
      };
      show_trgm: {
        Args: { '': string };
        Returns: string[];
      };
    };
    Tables: {
      keys: {
        Insert: {
          created_at?: string;
          full_key: string;
          id?: string;
          project_id: string;
        };
        Relationships: [
          {
            columns: ['project_id'];
            foreignKeyName: 'keys_project_id_fkey';
            isOneToOne: false;
            referencedColumns: ['id'];
            referencedRelation: 'projects';
          },
        ];
        Row: {
          created_at: string;
          full_key: string;
          id: string;
          project_id: string;
        };
        Update: {
          created_at?: string;
          full_key?: string;
          id?: string;
          project_id?: string;
        };
      };
      project_locales: {
        Insert: {
          created_at?: string;
          id?: string;
          label: string;
          locale: string;
          project_id: string;
          updated_at?: string;
        };
        Relationships: [
          {
            columns: ['project_id'];
            foreignKeyName: 'project_locales_project_id_fkey';
            isOneToOne: false;
            referencedColumns: ['id'];
            referencedRelation: 'projects';
          },
        ];
        Row: {
          created_at: string;
          id: string;
          label: string;
          locale: string;
          project_id: string;
          updated_at: string;
        };
        Update: {
          created_at?: string;
          id?: string;
          label?: string;
          locale?: string;
          project_id?: string;
          updated_at?: string;
        };
      };
      projects: {
        Insert: {
          created_at?: string;
          default_locale: string;
          description?: null | string;
          id?: string;
          name: string;
          owner_user_id: string;
          prefix: string;
          updated_at?: string;
        };
        Relationships: [];
        Row: {
          created_at: string;
          default_locale: string;
          description: null | string;
          id: string;
          name: string;
          owner_user_id: string;
          prefix: string;
          updated_at: string;
        };
        Update: {
          created_at?: string;
          default_locale?: string;
          description?: null | string;
          id?: string;
          name?: string;
          owner_user_id?: string;
          prefix?: string;
          updated_at?: string;
        };
      };
      telemetry_events: {
        Insert: {
          created_at?: string;
          event_name: Database['public']['Enums']['event_type'];
          id?: string;
          project_id: string;
          properties?: Json | null;
        };
        Relationships: [
          {
            columns: ['project_id'];
            foreignKeyName: 'telemetry_events_project_id_fkey';
            isOneToOne: false;
            referencedColumns: ['id'];
            referencedRelation: 'projects';
          },
        ];
        Row: {
          created_at: string;
          event_name: Database['public']['Enums']['event_type'];
          id: string;
          project_id: string;
          properties: Json | null;
        };
        Update: {
          created_at?: string;
          event_name?: Database['public']['Enums']['event_type'];
          id?: string;
          project_id?: string;
          properties?: Json | null;
        };
      };
      telemetry_events_2025_01: {
        Insert: {
          created_at?: string;
          event_name: Database['public']['Enums']['event_type'];
          id?: string;
          project_id: string;
          properties?: Json | null;
        };
        Relationships: [];
        Row: {
          created_at: string;
          event_name: Database['public']['Enums']['event_type'];
          id: string;
          project_id: string;
          properties: Json | null;
        };
        Update: {
          created_at?: string;
          event_name?: Database['public']['Enums']['event_type'];
          id?: string;
          project_id?: string;
          properties?: Json | null;
        };
      };
      telemetry_events_2025_02: {
        Insert: {
          created_at?: string;
          event_name: Database['public']['Enums']['event_type'];
          id?: string;
          project_id: string;
          properties?: Json | null;
        };
        Relationships: [];
        Row: {
          created_at: string;
          event_name: Database['public']['Enums']['event_type'];
          id: string;
          project_id: string;
          properties: Json | null;
        };
        Update: {
          created_at?: string;
          event_name?: Database['public']['Enums']['event_type'];
          id?: string;
          project_id?: string;
          properties?: Json | null;
        };
      };
      telemetry_events_2025_03: {
        Insert: {
          created_at?: string;
          event_name: Database['public']['Enums']['event_type'];
          id?: string;
          project_id: string;
          properties?: Json | null;
        };
        Relationships: [];
        Row: {
          created_at: string;
          event_name: Database['public']['Enums']['event_type'];
          id: string;
          project_id: string;
          properties: Json | null;
        };
        Update: {
          created_at?: string;
          event_name?: Database['public']['Enums']['event_type'];
          id?: string;
          project_id?: string;
          properties?: Json | null;
        };
      };
      telemetry_events_2025_04: {
        Insert: {
          created_at?: string;
          event_name: Database['public']['Enums']['event_type'];
          id?: string;
          project_id: string;
          properties?: Json | null;
        };
        Relationships: [];
        Row: {
          created_at: string;
          event_name: Database['public']['Enums']['event_type'];
          id: string;
          project_id: string;
          properties: Json | null;
        };
        Update: {
          created_at?: string;
          event_name?: Database['public']['Enums']['event_type'];
          id?: string;
          project_id?: string;
          properties?: Json | null;
        };
      };
      telemetry_events_2025_05: {
        Insert: {
          created_at?: string;
          event_name: Database['public']['Enums']['event_type'];
          id?: string;
          project_id: string;
          properties?: Json | null;
        };
        Relationships: [];
        Row: {
          created_at: string;
          event_name: Database['public']['Enums']['event_type'];
          id: string;
          project_id: string;
          properties: Json | null;
        };
        Update: {
          created_at?: string;
          event_name?: Database['public']['Enums']['event_type'];
          id?: string;
          project_id?: string;
          properties?: Json | null;
        };
      };
      telemetry_events_2025_06: {
        Insert: {
          created_at?: string;
          event_name: Database['public']['Enums']['event_type'];
          id?: string;
          project_id: string;
          properties?: Json | null;
        };
        Relationships: [];
        Row: {
          created_at: string;
          event_name: Database['public']['Enums']['event_type'];
          id: string;
          project_id: string;
          properties: Json | null;
        };
        Update: {
          created_at?: string;
          event_name?: Database['public']['Enums']['event_type'];
          id?: string;
          project_id?: string;
          properties?: Json | null;
        };
      };
      telemetry_events_2025_07: {
        Insert: {
          created_at?: string;
          event_name: Database['public']['Enums']['event_type'];
          id?: string;
          project_id: string;
          properties?: Json | null;
        };
        Relationships: [];
        Row: {
          created_at: string;
          event_name: Database['public']['Enums']['event_type'];
          id: string;
          project_id: string;
          properties: Json | null;
        };
        Update: {
          created_at?: string;
          event_name?: Database['public']['Enums']['event_type'];
          id?: string;
          project_id?: string;
          properties?: Json | null;
        };
      };
      telemetry_events_2025_08: {
        Insert: {
          created_at?: string;
          event_name: Database['public']['Enums']['event_type'];
          id?: string;
          project_id: string;
          properties?: Json | null;
        };
        Relationships: [];
        Row: {
          created_at: string;
          event_name: Database['public']['Enums']['event_type'];
          id: string;
          project_id: string;
          properties: Json | null;
        };
        Update: {
          created_at?: string;
          event_name?: Database['public']['Enums']['event_type'];
          id?: string;
          project_id?: string;
          properties?: Json | null;
        };
      };
      telemetry_events_2025_09: {
        Insert: {
          created_at?: string;
          event_name: Database['public']['Enums']['event_type'];
          id?: string;
          project_id: string;
          properties?: Json | null;
        };
        Relationships: [];
        Row: {
          created_at: string;
          event_name: Database['public']['Enums']['event_type'];
          id: string;
          project_id: string;
          properties: Json | null;
        };
        Update: {
          created_at?: string;
          event_name?: Database['public']['Enums']['event_type'];
          id?: string;
          project_id?: string;
          properties?: Json | null;
        };
      };
      telemetry_events_2025_10: {
        Insert: {
          created_at?: string;
          event_name: Database['public']['Enums']['event_type'];
          id?: string;
          project_id: string;
          properties?: Json | null;
        };
        Relationships: [];
        Row: {
          created_at: string;
          event_name: Database['public']['Enums']['event_type'];
          id: string;
          project_id: string;
          properties: Json | null;
        };
        Update: {
          created_at?: string;
          event_name?: Database['public']['Enums']['event_type'];
          id?: string;
          project_id?: string;
          properties?: Json | null;
        };
      };
      telemetry_events_2025_11: {
        Insert: {
          created_at?: string;
          event_name: Database['public']['Enums']['event_type'];
          id?: string;
          project_id: string;
          properties?: Json | null;
        };
        Relationships: [];
        Row: {
          created_at: string;
          event_name: Database['public']['Enums']['event_type'];
          id: string;
          project_id: string;
          properties: Json | null;
        };
        Update: {
          created_at?: string;
          event_name?: Database['public']['Enums']['event_type'];
          id?: string;
          project_id?: string;
          properties?: Json | null;
        };
      };
      telemetry_events_2025_12: {
        Insert: {
          created_at?: string;
          event_name: Database['public']['Enums']['event_type'];
          id?: string;
          project_id: string;
          properties?: Json | null;
        };
        Relationships: [];
        Row: {
          created_at: string;
          event_name: Database['public']['Enums']['event_type'];
          id: string;
          project_id: string;
          properties: Json | null;
        };
        Update: {
          created_at?: string;
          event_name?: Database['public']['Enums']['event_type'];
          id?: string;
          project_id?: string;
          properties?: Json | null;
        };
      };
      translation_job_items: {
        Insert: {
          created_at?: string;
          error_code?: null | string;
          error_message?: null | string;
          id?: string;
          job_id: string;
          key_id: string;
          status?: Database['public']['Enums']['item_status'];
          updated_at?: string;
        };
        Relationships: [
          {
            columns: ['job_id'];
            foreignKeyName: 'translation_job_items_job_id_fkey';
            isOneToOne: false;
            referencedColumns: ['id'];
            referencedRelation: 'translation_jobs';
          },
          {
            columns: ['key_id'];
            foreignKeyName: 'translation_job_items_key_id_fkey';
            isOneToOne: false;
            referencedColumns: ['id'];
            referencedRelation: 'keys';
          },
        ];
        Row: {
          created_at: string;
          error_code: null | string;
          error_message: null | string;
          id: string;
          job_id: string;
          key_id: string;
          status: Database['public']['Enums']['item_status'];
          updated_at: string;
        };
        Update: {
          created_at?: string;
          error_code?: null | string;
          error_message?: null | string;
          id?: string;
          job_id?: string;
          key_id?: string;
          status?: Database['public']['Enums']['item_status'];
          updated_at?: string;
        };
      };
      translation_jobs: {
        Insert: {
          actual_cost_usd?: null | number;
          completed_keys?: null | number;
          created_at?: string;
          estimated_cost_usd?: null | number;
          failed_keys?: null | number;
          finished_at?: null | string;
          id?: string;
          mode: Database['public']['Enums']['translation_mode'];
          model?: null | string;
          params?: Json | null;
          project_id: string;
          provider?: null | string;
          source_locale: string;
          started_at?: null | string;
          status?: Database['public']['Enums']['job_status'];
          target_locale: string;
          total_keys?: null | number;
          updated_at?: string;
        };
        Relationships: [
          {
            columns: ['project_id'];
            foreignKeyName: 'translation_jobs_project_id_fkey';
            isOneToOne: false;
            referencedColumns: ['id'];
            referencedRelation: 'projects';
          },
        ];
        Row: {
          actual_cost_usd: null | number;
          completed_keys: null | number;
          created_at: string;
          estimated_cost_usd: null | number;
          failed_keys: null | number;
          finished_at: null | string;
          id: string;
          mode: Database['public']['Enums']['translation_mode'];
          model: null | string;
          params: Json | null;
          project_id: string;
          provider: null | string;
          source_locale: string;
          started_at: null | string;
          status: Database['public']['Enums']['job_status'];
          target_locale: string;
          total_keys: null | number;
          updated_at: string;
        };
        Update: {
          actual_cost_usd?: null | number;
          completed_keys?: null | number;
          created_at?: string;
          estimated_cost_usd?: null | number;
          failed_keys?: null | number;
          finished_at?: null | string;
          id?: string;
          mode?: Database['public']['Enums']['translation_mode'];
          model?: null | string;
          params?: Json | null;
          project_id?: string;
          provider?: null | string;
          source_locale?: string;
          started_at?: null | string;
          status?: Database['public']['Enums']['job_status'];
          target_locale?: string;
          total_keys?: null | number;
          updated_at?: string;
        };
      };
      translations: {
        Insert: {
          is_machine_translated?: boolean;
          key_id: string;
          locale: string;
          project_id: string;
          updated_at?: string;
          updated_by_user_id?: null | string;
          updated_source?: Database['public']['Enums']['update_source_type'];
          value?: null | string;
        };
        Relationships: [
          {
            columns: ['key_id'];
            foreignKeyName: 'translations_key_id_fkey';
            isOneToOne: false;
            referencedColumns: ['id'];
            referencedRelation: 'keys';
          },
          {
            columns: ['project_id'];
            foreignKeyName: 'translations_project_id_fkey';
            isOneToOne: false;
            referencedColumns: ['id'];
            referencedRelation: 'projects';
          },
          {
            columns: ['project_id', 'locale'];
            foreignKeyName: 'translations_project_id_locale_fkey';
            isOneToOne: false;
            referencedColumns: ['project_id', 'locale'];
            referencedRelation: 'project_locales';
          },
        ];
        Row: {
          is_machine_translated: boolean;
          key_id: string;
          locale: string;
          project_id: string;
          updated_at: string;
          updated_by_user_id: null | string;
          updated_source: Database['public']['Enums']['update_source_type'];
          value: null | string;
        };
        Update: {
          is_machine_translated?: boolean;
          key_id?: string;
          locale?: string;
          project_id?: string;
          updated_at?: string;
          updated_by_user_id?: null | string;
          updated_source?: Database['public']['Enums']['update_source_type'];
          value?: null | string;
        };
      };
    };
    Views: Record<never, never>;
  };
}

export type Enums<
  DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema['Enums'] | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions['schema']]['Enums']
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions['schema']]['Enums'][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema['Enums']
    ? DefaultSchema['Enums'][DefaultSchemaEnumNameOrOptions]
    : never;

export type Json = boolean | Json[] | null | number | string | { [key: string]: Json | undefined };

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema['Tables'] & DefaultSchema['Views'])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables'] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Views'])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables'] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Views'])[TableName] extends {
      Row: infer R;
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema['Tables'] & DefaultSchema['Views'])
    ? (DefaultSchema['Tables'] & DefaultSchema['Views'])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R;
      }
      ? R
      : never
    : never;

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends keyof DefaultSchema['Tables'] | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables']
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables'][TableName] extends {
      Insert: infer I;
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema['Tables']
    ? DefaultSchema['Tables'][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I;
      }
      ? I
      : never
    : never;

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends keyof DefaultSchema['Tables'] | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables']
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables'][TableName] extends {
      Update: infer U;
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema['Tables']
    ? DefaultSchema['Tables'][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U;
      }
      ? U
      : never
    : never;

type DatabaseWithoutInternals = Omit<Database, '__InternalSupabase'>;

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, 'public'>];

export const Constants = {
  graphql_public: {
    Enums: {},
  },
  public: {
    Enums: {
      event_type: ['project_created', 'language_added', 'key_created', 'translation_completed'],
      item_status: ['pending', 'completed', 'failed', 'skipped'],
      job_status: ['pending', 'running', 'completed', 'failed', 'cancelled'],
      translation_mode: ['all', 'selected', 'single'],
      update_source_type: ['user', 'system'],
    },
  },
} as const;
