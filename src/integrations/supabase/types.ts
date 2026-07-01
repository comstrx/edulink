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
      account_entitlements: {
        Row: {
          created_at: string | null
          enabled: boolean
          ends_at: string | null
          id: string
          metadata: Json | null
          module_key: string
          source_ref: string | null
          source_type: string
          starts_at: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          enabled?: boolean
          ends_at?: string | null
          id?: string
          metadata?: Json | null
          module_key: string
          source_ref?: string | null
          source_type?: string
          starts_at?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          enabled?: boolean
          ends_at?: string | null
          id?: string
          metadata?: Json | null
          module_key?: string
          source_ref?: string | null
          source_type?: string
          starts_at?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "account_entitlements_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      account_verifications: {
        Row: {
          account_id: string
          created_at: string
          expires_at: string | null
          id: string
          metadata: Json
          reviewed_by: string | null
          status: string
          updated_at: string
          verification_type: string
          verified_at: string | null
        }
        Insert: {
          account_id: string
          created_at?: string
          expires_at?: string | null
          id?: string
          metadata?: Json
          reviewed_by?: string | null
          status?: string
          updated_at?: string
          verification_type: string
          verified_at?: string | null
        }
        Update: {
          account_id?: string
          created_at?: string
          expires_at?: string | null
          id?: string
          metadata?: Json
          reviewed_by?: string | null
          status?: string
          updated_at?: string
          verification_type?: string
          verified_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "account_verifications_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      account_visibility_settings: {
        Row: {
          account_id: string
          activity_visibility: string
          contact_visibility: string
          created_at: string
          credentials_visibility: string
          photo_visibility: string
          profile_visibility: string
          updated_at: string
        }
        Insert: {
          account_id: string
          activity_visibility?: string
          contact_visibility?: string
          created_at?: string
          credentials_visibility?: string
          photo_visibility?: string
          profile_visibility?: string
          updated_at?: string
        }
        Update: {
          account_id?: string
          activity_visibility?: string
          contact_visibility?: string
          created_at?: string
          credentials_visibility?: string
          photo_visibility?: string
          profile_visibility?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "account_visibility_settings_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      applications: {
        Row: {
          created_at: string
          id: string
          job_id: string
          notes: string | null
          source: string | null
          status: string
          teacher_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          job_id: string
          notes?: string | null
          source?: string | null
          status?: string
          teacher_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          job_id?: string
          notes?: string | null
          source?: string | null
          status?: string
          teacher_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "applications_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "jobs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "applications_teacher_id_fkey"
            columns: ["teacher_id"]
            isOneToOne: false
            referencedRelation: "teacher_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      billing_policies: {
        Row: {
          created_at: string
          currency: string
          id: string
          is_active: boolean
          metadata: Json | null
          ownership_context: string
          policy_key: string
          pricing_mode: string
          product_type: string
          purchasable_online: boolean
          requires_manual_approval: boolean
          updated_at: string
        }
        Insert: {
          created_at?: string
          currency?: string
          id?: string
          is_active?: boolean
          metadata?: Json | null
          ownership_context?: string
          policy_key: string
          pricing_mode?: string
          product_type: string
          purchasable_online?: boolean
          requires_manual_approval?: boolean
          updated_at?: string
        }
        Update: {
          created_at?: string
          currency?: string
          id?: string
          is_active?: boolean
          metadata?: Json | null
          ownership_context?: string
          policy_key?: string
          pricing_mode?: string
          product_type?: string
          purchasable_online?: boolean
          requires_manual_approval?: boolean
          updated_at?: string
        }
        Relationships: []
      }
      career_paths: {
        Row: {
          created_at: string
          description: string | null
          id: string
          is_active: boolean
          name: string
          slug: string
          sort_order: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          name: string
          slug: string
          sort_order?: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          name?: string
          slug?: string
          sort_order?: number
          updated_at?: string
        }
        Relationships: []
      }
      career_stage_requirements: {
        Row: {
          created_at: string
          id: string
          is_mandatory: boolean
          metadata: Json
          min_count: number | null
          min_experience_years: number | null
          requirement_key: string
          requirement_label: string
          requirement_type: string
          stage_id: string
          term_ids: string[]
        }
        Insert: {
          created_at?: string
          id?: string
          is_mandatory?: boolean
          metadata?: Json
          min_count?: number | null
          min_experience_years?: number | null
          requirement_key: string
          requirement_label: string
          requirement_type: string
          stage_id: string
          term_ids?: string[]
        }
        Update: {
          created_at?: string
          id?: string
          is_mandatory?: boolean
          metadata?: Json
          min_count?: number | null
          min_experience_years?: number | null
          requirement_key?: string
          requirement_label?: string
          requirement_type?: string
          stage_id?: string
          term_ids?: string[]
        }
        Relationships: [
          {
            foreignKeyName: "career_stage_requirements_stage_id_fkey"
            columns: ["stage_id"]
            isOneToOne: false
            referencedRelation: "career_stages"
            referencedColumns: ["id"]
          },
        ]
      }
      career_stages: {
        Row: {
          created_at: string
          description: string | null
          id: string
          is_active: boolean
          name: string
          path_id: string
          slug: string
          stage_order: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          name: string
          path_id: string
          slug: string
          stage_order?: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          name?: string
          path_id?: string
          slug?: string
          stage_order?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "career_stages_path_id_fkey"
            columns: ["path_id"]
            isOneToOne: false
            referencedRelation: "career_paths"
            referencedColumns: ["id"]
          },
        ]
      }
      commission_rules: {
        Row: {
          created_at: string
          id: string
          is_active: boolean
          mentor_percentage: number
          platform_percentage: number
          product_type: Database["public"]["Enums"]["order_item_type"]
          provider_percentage: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_active?: boolean
          mentor_percentage?: number
          platform_percentage?: number
          product_type: Database["public"]["Enums"]["order_item_type"]
          provider_percentage?: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          is_active?: boolean
          mentor_percentage?: number
          platform_percentage?: number
          product_type?: Database["public"]["Enums"]["order_item_type"]
          provider_percentage?: number
          updated_at?: string
        }
        Relationships: []
      }
      compliance_requirements: {
        Row: {
          created_at: string
          due_date: string | null
          id: string
          is_mandatory: boolean
          school_id: string
          title: string
          training_item_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          due_date?: string | null
          id?: string
          is_mandatory?: boolean
          school_id: string
          title: string
          training_item_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          due_date?: string | null
          id?: string
          is_mandatory?: boolean
          school_id?: string
          title?: string
          training_item_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "compliance_requirements_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "school_organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "compliance_requirements_training_item_id_fkey"
            columns: ["training_item_id"]
            isOneToOne: false
            referencedRelation: "training_items"
            referencedColumns: ["id"]
          },
        ]
      }
      contact_reveal_audit: {
        Row: {
          id: string
          revealed_at: string
          school_user_id: string
          teacher_profile_id: string
        }
        Insert: {
          id?: string
          revealed_at?: string
          school_user_id: string
          teacher_profile_id: string
        }
        Update: {
          id?: string
          revealed_at?: string
          school_user_id?: string
          teacher_profile_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "contact_reveal_audit_teacher_profile_id_fkey"
            columns: ["teacher_profile_id"]
            isOneToOne: false
            referencedRelation: "teacher_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      contact_submissions: {
        Row: {
          created_at: string
          email: string
          id: string
          message: string
          name: string
          subject: string
        }
        Insert: {
          created_at?: string
          email: string
          id?: string
          message: string
          name: string
          subject: string
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          message?: string
          name?: string
          subject?: string
        }
        Relationships: []
      }
      course_progress: {
        Row: {
          assignment_id: string | null
          completed_at: string | null
          course_id: string
          created_at: string
          execution_id: string
          first_activity_at: string | null
          id: string
          last_activity_at: string | null
          progress_percent: number | null
          progress_status: Database["public"]["Enums"]["course_progress_status"]
          school_id: string | null
          started_at: string | null
          teacher_id: string
          updated_at: string
        }
        Insert: {
          assignment_id?: string | null
          completed_at?: string | null
          course_id: string
          created_at?: string
          execution_id: string
          first_activity_at?: string | null
          id?: string
          last_activity_at?: string | null
          progress_percent?: number | null
          progress_status?: Database["public"]["Enums"]["course_progress_status"]
          school_id?: string | null
          started_at?: string | null
          teacher_id: string
          updated_at?: string
        }
        Update: {
          assignment_id?: string | null
          completed_at?: string | null
          course_id?: string
          created_at?: string
          execution_id?: string
          first_activity_at?: string | null
          id?: string
          last_activity_at?: string | null
          progress_percent?: number | null
          progress_status?: Database["public"]["Enums"]["course_progress_status"]
          school_id?: string | null
          started_at?: string | null
          teacher_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "course_progress_assignment_id_fkey"
            columns: ["assignment_id"]
            isOneToOne: false
            referencedRelation: "training_assignments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "course_progress_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "training_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "course_progress_execution_id_fkey"
            columns: ["execution_id"]
            isOneToOne: true
            referencedRelation: "training_executions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "course_progress_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "school_organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "course_progress_teacher_id_fkey"
            columns: ["teacher_id"]
            isOneToOne: false
            referencedRelation: "teacher_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      department_capability_snapshots: {
        Row: {
          average_cri_score: number
          average_reputation_score: number
          computed_at: string
          created_at: string
          credential_coverage: number
          department_key: string
          department_label: string
          gap_score: number
          id: string
          school_id: string
          stage_distribution: Json
          teacher_count: number
          updated_at: string
          verified_count: number
        }
        Insert: {
          average_cri_score?: number
          average_reputation_score?: number
          computed_at?: string
          created_at?: string
          credential_coverage?: number
          department_key: string
          department_label: string
          gap_score?: number
          id?: string
          school_id: string
          stage_distribution?: Json
          teacher_count?: number
          updated_at?: string
          verified_count?: number
        }
        Update: {
          average_cri_score?: number
          average_reputation_score?: number
          computed_at?: string
          created_at?: string
          credential_coverage?: number
          department_key?: string
          department_label?: string
          gap_score?: number
          id?: string
          school_id?: string
          stage_distribution?: Json
          teacher_count?: number
          updated_at?: string
          verified_count?: number
        }
        Relationships: [
          {
            foreignKeyName: "department_capability_snapshots_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "school_organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      earned_credentials: {
        Row: {
          awarded_by_user_id: string | null
          created_at: string
          credential_kind: string
          expiry_date: string | null
          id: string
          issued_at: string
          issuer_name: string
          issuer_provider_id: string | null
          metadata: Json
          source_id: string
          source_type: string
          status: string
          teacher_id: string
          title: string
          updated_at: string
          verification_code: string
          verification_hash: string | null
        }
        Insert: {
          awarded_by_user_id?: string | null
          created_at?: string
          credential_kind: string
          expiry_date?: string | null
          id?: string
          issued_at?: string
          issuer_name?: string
          issuer_provider_id?: string | null
          metadata?: Json
          source_id: string
          source_type: string
          status?: string
          teacher_id: string
          title: string
          updated_at?: string
          verification_code: string
          verification_hash?: string | null
        }
        Update: {
          awarded_by_user_id?: string | null
          created_at?: string
          credential_kind?: string
          expiry_date?: string | null
          id?: string
          issued_at?: string
          issuer_name?: string
          issuer_provider_id?: string | null
          metadata?: Json
          source_id?: string
          source_type?: string
          status?: string
          teacher_id?: string
          title?: string
          updated_at?: string
          verification_code?: string
          verification_hash?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "earned_credentials_issuer_provider_id_fkey"
            columns: ["issuer_provider_id"]
            isOneToOne: false
            referencedRelation: "providers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "earned_credentials_teacher_id_fkey"
            columns: ["teacher_id"]
            isOneToOne: false
            referencedRelation: "teacher_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      growth_recommendations: {
        Row: {
          completion_metadata: Json | null
          completion_reason_key: string | null
          completion_source_id: string | null
          completion_source_type: string | null
          created_at: string
          id: string
          priority_score: number
          recommendation_reason: string
          recommendation_trace: Json
          recommended_action_type: string
          recommended_item_id: string | null
          recommended_item_type: string | null
          source_reference_id: string | null
          source_term_ids: string[]
          source_type: string
          status: string
          teacher_id: string
          updated_at: string
        }
        Insert: {
          completion_metadata?: Json | null
          completion_reason_key?: string | null
          completion_source_id?: string | null
          completion_source_type?: string | null
          created_at?: string
          id?: string
          priority_score?: number
          recommendation_reason?: string
          recommendation_trace?: Json
          recommended_action_type: string
          recommended_item_id?: string | null
          recommended_item_type?: string | null
          source_reference_id?: string | null
          source_term_ids?: string[]
          source_type?: string
          status?: string
          teacher_id: string
          updated_at?: string
        }
        Update: {
          completion_metadata?: Json | null
          completion_reason_key?: string | null
          completion_source_id?: string | null
          completion_source_type?: string | null
          created_at?: string
          id?: string
          priority_score?: number
          recommendation_reason?: string
          recommendation_trace?: Json
          recommended_action_type?: string
          recommended_item_id?: string | null
          recommended_item_type?: string | null
          source_reference_id?: string | null
          source_term_ids?: string[]
          source_type?: string
          status?: string
          teacher_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "growth_recommendations_teacher_id_fkey"
            columns: ["teacher_id"]
            isOneToOne: false
            referencedRelation: "teacher_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      hiring_signals: {
        Row: {
          actor_id: string | null
          actor_type: string
          application_id: string | null
          created_at: string
          id: string
          interview_id: string | null
          job_id: string | null
          metadata: Json | null
          school_id: string | null
          signal_type: string
          teacher_id: string | null
        }
        Insert: {
          actor_id?: string | null
          actor_type: string
          application_id?: string | null
          created_at?: string
          id?: string
          interview_id?: string | null
          job_id?: string | null
          metadata?: Json | null
          school_id?: string | null
          signal_type: string
          teacher_id?: string | null
        }
        Update: {
          actor_id?: string | null
          actor_type?: string
          application_id?: string | null
          created_at?: string
          id?: string
          interview_id?: string | null
          job_id?: string | null
          metadata?: Json | null
          school_id?: string | null
          signal_type?: string
          teacher_id?: string | null
        }
        Relationships: []
      }
      intelligence_cri_snapshots: {
        Row: {
          computed_at: string
          created_at: string
          dimensions: Json
          engine_version: string
          gap_term_ids: string[]
          id: string
          job_id: string
          score: number
          staleness: string
          teacher_id: string
          updated_at: string
        }
        Insert: {
          computed_at?: string
          created_at?: string
          dimensions?: Json
          engine_version?: string
          gap_term_ids?: string[]
          id?: string
          job_id: string
          score?: number
          staleness?: string
          teacher_id: string
          updated_at?: string
        }
        Update: {
          computed_at?: string
          created_at?: string
          dimensions?: Json
          engine_version?: string
          gap_term_ids?: string[]
          id?: string
          job_id?: string
          score?: number
          staleness?: string
          teacher_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "intelligence_cri_snapshots_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "jobs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "intelligence_cri_snapshots_teacher_id_fkey"
            columns: ["teacher_id"]
            isOneToOne: false
            referencedRelation: "teacher_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      intelligence_gap_snapshots: {
        Row: {
          computed_at: string
          created_at: string
          engine_version: string
          gaps: Json
          id: string
          job_id: string | null
          staleness: string
          teacher_id: string
          total_gaps: number
          updated_at: string
        }
        Insert: {
          computed_at?: string
          created_at?: string
          engine_version?: string
          gaps?: Json
          id?: string
          job_id?: string | null
          staleness?: string
          teacher_id: string
          total_gaps?: number
          updated_at?: string
        }
        Update: {
          computed_at?: string
          created_at?: string
          engine_version?: string
          gaps?: Json
          id?: string
          job_id?: string | null
          staleness?: string
          teacher_id?: string
          total_gaps?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "intelligence_gap_snapshots_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "jobs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "intelligence_gap_snapshots_teacher_id_fkey"
            columns: ["teacher_id"]
            isOneToOne: false
            referencedRelation: "teacher_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      intelligence_match_snapshots: {
        Row: {
          computed_at: string
          confidence: string
          created_at: string
          dimensions: Json
          engine_version: string
          id: string
          job_id: string
          matched_term_ids: string[]
          score: number
          staleness: string
          teacher_id: string
          unmatched_term_ids: string[]
          updated_at: string
        }
        Insert: {
          computed_at?: string
          confidence?: string
          created_at?: string
          dimensions?: Json
          engine_version?: string
          id?: string
          job_id: string
          matched_term_ids?: string[]
          score?: number
          staleness?: string
          teacher_id: string
          unmatched_term_ids?: string[]
          updated_at?: string
        }
        Update: {
          computed_at?: string
          confidence?: string
          created_at?: string
          dimensions?: Json
          engine_version?: string
          id?: string
          job_id?: string
          matched_term_ids?: string[]
          score?: number
          staleness?: string
          teacher_id?: string
          unmatched_term_ids?: string[]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "intelligence_match_snapshots_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "jobs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "intelligence_match_snapshots_teacher_id_fkey"
            columns: ["teacher_id"]
            isOneToOne: false
            referencedRelation: "teacher_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      intelligence_recommendation_snapshots: {
        Row: {
          computed_at: string
          created_at: string
          engine_version: string
          id: string
          recommendations: Json
          staleness: string
          teacher_id: string
          total_count: number
          updated_at: string
        }
        Insert: {
          computed_at?: string
          created_at?: string
          engine_version?: string
          id?: string
          recommendations?: Json
          staleness?: string
          teacher_id: string
          total_count?: number
          updated_at?: string
        }
        Update: {
          computed_at?: string
          created_at?: string
          engine_version?: string
          id?: string
          recommendations?: Json
          staleness?: string
          teacher_id?: string
          total_count?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "intelligence_recommendation_snapshots_teacher_id_fkey"
            columns: ["teacher_id"]
            isOneToOne: true
            referencedRelation: "teacher_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      intelligence_talent_profiles: {
        Row: {
          active_pathway_count: number
          best_match_job_id: string | null
          best_match_score: number | null
          created_at: string
          credential_count: number
          credential_strength: string
          credential_verified_count: number
          cri_dimensions: Json
          cri_job_id: string | null
          cri_score: number
          engine_version: string
          gap_categories: string[]
          growth_momentum: string
          hiring_advantage_signals: Json
          id: string
          intelligence_updated_at: string
          pathway_completion_count: number
          readiness_level: string
          teacher_id: string
          training_completion_count: number
          unresolved_gap_count: number
          updated_at: string
          verified_completion_count: number
          verified_signal_count: number
        }
        Insert: {
          active_pathway_count?: number
          best_match_job_id?: string | null
          best_match_score?: number | null
          created_at?: string
          credential_count?: number
          credential_strength?: string
          credential_verified_count?: number
          cri_dimensions?: Json
          cri_job_id?: string | null
          cri_score?: number
          engine_version?: string
          gap_categories?: string[]
          growth_momentum?: string
          hiring_advantage_signals?: Json
          id?: string
          intelligence_updated_at?: string
          pathway_completion_count?: number
          readiness_level?: string
          teacher_id: string
          training_completion_count?: number
          unresolved_gap_count?: number
          updated_at?: string
          verified_completion_count?: number
          verified_signal_count?: number
        }
        Update: {
          active_pathway_count?: number
          best_match_job_id?: string | null
          best_match_score?: number | null
          created_at?: string
          credential_count?: number
          credential_strength?: string
          credential_verified_count?: number
          cri_dimensions?: Json
          cri_job_id?: string | null
          cri_score?: number
          engine_version?: string
          gap_categories?: string[]
          growth_momentum?: string
          hiring_advantage_signals?: Json
          id?: string
          intelligence_updated_at?: string
          pathway_completion_count?: number
          readiness_level?: string
          teacher_id?: string
          training_completion_count?: number
          unresolved_gap_count?: number
          updated_at?: string
          verified_completion_count?: number
          verified_signal_count?: number
        }
        Relationships: [
          {
            foreignKeyName: "intelligence_talent_profiles_best_match_job_id_fkey"
            columns: ["best_match_job_id"]
            isOneToOne: false
            referencedRelation: "jobs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "intelligence_talent_profiles_cri_job_id_fkey"
            columns: ["cri_job_id"]
            isOneToOne: false
            referencedRelation: "jobs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "intelligence_talent_profiles_teacher_id_fkey"
            columns: ["teacher_id"]
            isOneToOne: true
            referencedRelation: "teacher_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      intelligence_verified_state_snapshots: {
        Row: {
          computed_at: string
          created_at: string
          credentials: Json
          engine_version: string
          id: string
          overall_status: string
          staleness: string
          teacher_id: string
          total_count: number
          updated_at: string
          verified_count: number
        }
        Insert: {
          computed_at?: string
          created_at?: string
          credentials?: Json
          engine_version?: string
          id?: string
          overall_status?: string
          staleness?: string
          teacher_id: string
          total_count?: number
          updated_at?: string
          verified_count?: number
        }
        Update: {
          computed_at?: string
          created_at?: string
          credentials?: Json
          engine_version?: string
          id?: string
          overall_status?: string
          staleness?: string
          teacher_id?: string
          total_count?: number
          updated_at?: string
          verified_count?: number
        }
        Relationships: [
          {
            foreignKeyName: "intelligence_verified_state_snapshots_teacher_id_fkey"
            columns: ["teacher_id"]
            isOneToOne: true
            referencedRelation: "teacher_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      interviews: {
        Row: {
          application_id: string
          created_at: string
          created_by: string
          id: string
          job_id: string
          meeting_link: string | null
          notes: string | null
          scheduled_at: string
          status: string
          teacher_id: string
          updated_at: string
        }
        Insert: {
          application_id: string
          created_at?: string
          created_by: string
          id?: string
          job_id: string
          meeting_link?: string | null
          notes?: string | null
          scheduled_at: string
          status?: string
          teacher_id: string
          updated_at?: string
        }
        Update: {
          application_id?: string
          created_at?: string
          created_by?: string
          id?: string
          job_id?: string
          meeting_link?: string | null
          notes?: string | null
          scheduled_at?: string
          status?: string
          teacher_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "interviews_application_id_fkey"
            columns: ["application_id"]
            isOneToOne: false
            referencedRelation: "applications"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "interviews_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "jobs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "interviews_teacher_id_fkey"
            columns: ["teacher_id"]
            isOneToOne: false
            referencedRelation: "teacher_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      job_language_requirements: {
        Row: {
          created_at: string
          id: string
          job_id: string
          language_term_id: string
          min_level_term_id: string | null
          required_or_preferred: string
        }
        Insert: {
          created_at?: string
          id?: string
          job_id: string
          language_term_id: string
          min_level_term_id?: string | null
          required_or_preferred?: string
        }
        Update: {
          created_at?: string
          id?: string
          job_id?: string
          language_term_id?: string
          min_level_term_id?: string | null
          required_or_preferred?: string
        }
        Relationships: [
          {
            foreignKeyName: "job_language_requirements_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "jobs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "job_language_requirements_language_term_id_fkey"
            columns: ["language_term_id"]
            isOneToOne: false
            referencedRelation: "taxonomy_terms"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "job_language_requirements_language_term_id_fkey"
            columns: ["language_term_id"]
            isOneToOne: false
            referencedRelation: "taxonomy_terms_active"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "job_language_requirements_min_level_term_id_fkey"
            columns: ["min_level_term_id"]
            isOneToOne: false
            referencedRelation: "taxonomy_terms"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "job_language_requirements_min_level_term_id_fkey"
            columns: ["min_level_term_id"]
            isOneToOne: false
            referencedRelation: "taxonomy_terms_active"
            referencedColumns: ["id"]
          },
        ]
      }
      job_skill_requirements: {
        Row: {
          created_at: string
          id: string
          job_id: string
          required_level: string | null
          required_or_preferred: string
          skill_term_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          job_id: string
          required_level?: string | null
          required_or_preferred?: string
          skill_term_id: string
        }
        Update: {
          created_at?: string
          id?: string
          job_id?: string
          required_level?: string | null
          required_or_preferred?: string
          skill_term_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "job_skill_requirements_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "jobs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "job_skill_requirements_skill_term_id_fkey"
            columns: ["skill_term_id"]
            isOneToOne: false
            referencedRelation: "taxonomy_terms"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "job_skill_requirements_skill_term_id_fkey"
            columns: ["skill_term_id"]
            isOneToOne: false
            referencedRelation: "taxonomy_terms_active"
            referencedColumns: ["id"]
          },
        ]
      }
      jobs: {
        Row: {
          benefits: string[] | null
          certification_term_ids: string[] | null
          city_term_id: string | null
          country_term_id: string | null
          created_at: string
          created_by: string
          curriculum_term_ids: string[] | null
          deadline: string | null
          description: string | null
          employment_type_term_ids: string[] | null
          experience_min: number | null
          grade_band_term_ids: string[] | null
          id: string
          is_featured: boolean | null
          is_verified: boolean | null
          language_level_term_id: string | null
          language_term_ids: string[] | null
          region_term_id: string | null
          relocation_support: boolean | null
          requirements_text: string[] | null
          responsibilities: string[] | null
          role_category_term_id: string | null
          role_type_term_id: string | null
          salary_currency: string | null
          salary_max: number | null
          salary_min: number | null
          salary_period: string | null
          salary_range: string | null
          school_id: string
          school_type_term_id: string | null
          seniority_level_term_id: string | null
          start_date: string | null
          status: string
          subject_term_ids: string[] | null
          title: string
          updated_at: string
          visa_sponsorship: boolean | null
          visa_status_term_ids: string[] | null
          work_arrangement_term_ids: string[] | null
        }
        Insert: {
          benefits?: string[] | null
          certification_term_ids?: string[] | null
          city_term_id?: string | null
          country_term_id?: string | null
          created_at?: string
          created_by: string
          curriculum_term_ids?: string[] | null
          deadline?: string | null
          description?: string | null
          employment_type_term_ids?: string[] | null
          experience_min?: number | null
          grade_band_term_ids?: string[] | null
          id?: string
          is_featured?: boolean | null
          is_verified?: boolean | null
          language_level_term_id?: string | null
          language_term_ids?: string[] | null
          region_term_id?: string | null
          relocation_support?: boolean | null
          requirements_text?: string[] | null
          responsibilities?: string[] | null
          role_category_term_id?: string | null
          role_type_term_id?: string | null
          salary_currency?: string | null
          salary_max?: number | null
          salary_min?: number | null
          salary_period?: string | null
          salary_range?: string | null
          school_id: string
          school_type_term_id?: string | null
          seniority_level_term_id?: string | null
          start_date?: string | null
          status?: string
          subject_term_ids?: string[] | null
          title: string
          updated_at?: string
          visa_sponsorship?: boolean | null
          visa_status_term_ids?: string[] | null
          work_arrangement_term_ids?: string[] | null
        }
        Update: {
          benefits?: string[] | null
          certification_term_ids?: string[] | null
          city_term_id?: string | null
          country_term_id?: string | null
          created_at?: string
          created_by?: string
          curriculum_term_ids?: string[] | null
          deadline?: string | null
          description?: string | null
          employment_type_term_ids?: string[] | null
          experience_min?: number | null
          grade_band_term_ids?: string[] | null
          id?: string
          is_featured?: boolean | null
          is_verified?: boolean | null
          language_level_term_id?: string | null
          language_term_ids?: string[] | null
          region_term_id?: string | null
          relocation_support?: boolean | null
          requirements_text?: string[] | null
          responsibilities?: string[] | null
          role_category_term_id?: string | null
          role_type_term_id?: string | null
          salary_currency?: string | null
          salary_max?: number | null
          salary_min?: number | null
          salary_period?: string | null
          salary_range?: string | null
          school_id?: string
          school_type_term_id?: string | null
          seniority_level_term_id?: string | null
          start_date?: string | null
          status?: string
          subject_term_ids?: string[] | null
          title?: string
          updated_at?: string
          visa_sponsorship?: boolean | null
          visa_status_term_ids?: string[] | null
          work_arrangement_term_ids?: string[] | null
        }
        Relationships: [
          {
            foreignKeyName: "jobs_city_term_id_fkey"
            columns: ["city_term_id"]
            isOneToOne: false
            referencedRelation: "taxonomy_terms"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "jobs_city_term_id_fkey"
            columns: ["city_term_id"]
            isOneToOne: false
            referencedRelation: "taxonomy_terms_active"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "jobs_country_term_id_fkey"
            columns: ["country_term_id"]
            isOneToOne: false
            referencedRelation: "taxonomy_terms"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "jobs_country_term_id_fkey"
            columns: ["country_term_id"]
            isOneToOne: false
            referencedRelation: "taxonomy_terms_active"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "jobs_language_level_term_id_fkey"
            columns: ["language_level_term_id"]
            isOneToOne: false
            referencedRelation: "taxonomy_terms"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "jobs_language_level_term_id_fkey"
            columns: ["language_level_term_id"]
            isOneToOne: false
            referencedRelation: "taxonomy_terms_active"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "jobs_region_term_id_fkey"
            columns: ["region_term_id"]
            isOneToOne: false
            referencedRelation: "taxonomy_terms"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "jobs_region_term_id_fkey"
            columns: ["region_term_id"]
            isOneToOne: false
            referencedRelation: "taxonomy_terms_active"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "jobs_role_category_term_id_fkey"
            columns: ["role_category_term_id"]
            isOneToOne: false
            referencedRelation: "taxonomy_terms"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "jobs_role_category_term_id_fkey"
            columns: ["role_category_term_id"]
            isOneToOne: false
            referencedRelation: "taxonomy_terms_active"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "jobs_role_type_term_id_fkey"
            columns: ["role_type_term_id"]
            isOneToOne: false
            referencedRelation: "taxonomy_terms"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "jobs_role_type_term_id_fkey"
            columns: ["role_type_term_id"]
            isOneToOne: false
            referencedRelation: "taxonomy_terms_active"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "jobs_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "school_organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "jobs_school_type_term_id_fkey"
            columns: ["school_type_term_id"]
            isOneToOne: false
            referencedRelation: "taxonomy_terms"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "jobs_school_type_term_id_fkey"
            columns: ["school_type_term_id"]
            isOneToOne: false
            referencedRelation: "taxonomy_terms_active"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "jobs_seniority_level_term_id_fkey"
            columns: ["seniority_level_term_id"]
            isOneToOne: false
            referencedRelation: "taxonomy_terms"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "jobs_seniority_level_term_id_fkey"
            columns: ["seniority_level_term_id"]
            isOneToOne: false
            referencedRelation: "taxonomy_terms_active"
            referencedColumns: ["id"]
          },
        ]
      }
      mentor_availability: {
        Row: {
          created_at: string
          day_of_week: number
          end_time: string
          id: string
          is_active: boolean
          mentor_id: string
          start_time: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          day_of_week: number
          end_time: string
          id?: string
          is_active?: boolean
          mentor_id: string
          start_time: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          day_of_week?: number
          end_time?: string
          id?: string
          is_active?: boolean
          mentor_id?: string
          start_time?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "mentor_availability_mentor_id_fkey"
            columns: ["mentor_id"]
            isOneToOne: false
            referencedRelation: "mentors"
            referencedColumns: ["id"]
          },
        ]
      }
      mentor_earnings: {
        Row: {
          amount: number
          created_at: string
          currency: string
          id: string
          ledger_id: string
          mentor_id: string
          status: Database["public"]["Enums"]["earnings_status"]
          updated_at: string
        }
        Insert: {
          amount: number
          created_at?: string
          currency?: string
          id?: string
          ledger_id: string
          mentor_id: string
          status?: Database["public"]["Enums"]["earnings_status"]
          updated_at?: string
        }
        Update: {
          amount?: number
          created_at?: string
          currency?: string
          id?: string
          ledger_id?: string
          mentor_id?: string
          status?: Database["public"]["Enums"]["earnings_status"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "mentor_earnings_ledger_id_fkey"
            columns: ["ledger_id"]
            isOneToOne: false
            referencedRelation: "revenue_ledger"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "mentor_earnings_mentor_id_fkey"
            columns: ["mentor_id"]
            isOneToOne: false
            referencedRelation: "mentors"
            referencedColumns: ["id"]
          },
        ]
      }
      mentor_payouts: {
        Row: {
          amount: number
          created_at: string
          currency: string
          external_reference: string | null
          id: string
          mentor_id: string
          notes: string | null
          payout_method: string | null
          processed_at: string | null
          status: Database["public"]["Enums"]["payout_status"]
          updated_at: string
        }
        Insert: {
          amount: number
          created_at?: string
          currency?: string
          external_reference?: string | null
          id?: string
          mentor_id: string
          notes?: string | null
          payout_method?: string | null
          processed_at?: string | null
          status?: Database["public"]["Enums"]["payout_status"]
          updated_at?: string
        }
        Update: {
          amount?: number
          created_at?: string
          currency?: string
          external_reference?: string | null
          id?: string
          mentor_id?: string
          notes?: string | null
          payout_method?: string | null
          processed_at?: string | null
          status?: Database["public"]["Enums"]["payout_status"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "mentor_payouts_mentor_id_fkey"
            columns: ["mentor_id"]
            isOneToOne: false
            referencedRelation: "mentors"
            referencedColumns: ["id"]
          },
        ]
      }
      mentor_reviews: {
        Row: {
          created_at: string
          evidence_id: string
          execution_id: string
          id: string
          mentor_id: string
          review_decision: Database["public"]["Enums"]["mentor_review_decision"]
          review_notes: string | null
          reviewed_at: string
          teacher_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          evidence_id: string
          execution_id: string
          id?: string
          mentor_id: string
          review_decision: Database["public"]["Enums"]["mentor_review_decision"]
          review_notes?: string | null
          reviewed_at?: string
          teacher_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          evidence_id?: string
          execution_id?: string
          id?: string
          mentor_id?: string
          review_decision?: Database["public"]["Enums"]["mentor_review_decision"]
          review_notes?: string | null
          reviewed_at?: string
          teacher_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "mentor_reviews_evidence_id_fkey"
            columns: ["evidence_id"]
            isOneToOne: false
            referencedRelation: "training_evidence"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "mentor_reviews_execution_id_fkey"
            columns: ["execution_id"]
            isOneToOne: false
            referencedRelation: "training_executions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "mentor_reviews_mentor_id_fkey"
            columns: ["mentor_id"]
            isOneToOne: false
            referencedRelation: "mentors"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "mentor_reviews_teacher_id_fkey"
            columns: ["teacher_id"]
            isOneToOne: false
            referencedRelation: "teacher_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      mentor_session_evidence: {
        Row: {
          created_at: string
          evidence_type: string
          evidence_url: string | null
          id: string
          reflection_text: string | null
          review_notes: string | null
          reviewed_at: string | null
          reviewed_by_mentor_id: string | null
          session_id: string
          status: string
          submitted_at: string
          teacher_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          evidence_type: string
          evidence_url?: string | null
          id?: string
          reflection_text?: string | null
          review_notes?: string | null
          reviewed_at?: string | null
          reviewed_by_mentor_id?: string | null
          session_id: string
          status?: string
          submitted_at?: string
          teacher_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          evidence_type?: string
          evidence_url?: string | null
          id?: string
          reflection_text?: string | null
          review_notes?: string | null
          reviewed_at?: string | null
          reviewed_by_mentor_id?: string | null
          session_id?: string
          status?: string
          submitted_at?: string
          teacher_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "mentor_session_evidence_reviewed_by_fkey"
            columns: ["reviewed_by_mentor_id"]
            isOneToOne: false
            referencedRelation: "mentors"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "mentor_session_evidence_reviewed_by_mentor_id_fkey"
            columns: ["reviewed_by_mentor_id"]
            isOneToOne: false
            referencedRelation: "mentors"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "mentor_session_evidence_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "mentor_sessions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "mentor_session_evidence_teacher_id_fkey"
            columns: ["teacher_id"]
            isOneToOne: false
            referencedRelation: "teacher_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      mentor_session_reviews: {
        Row: {
          comment: string | null
          created_at: string
          id: string
          mentor_id: string
          rating: number
          reviewer_user_id: string
          session_id: string
          status: string
          updated_at: string
        }
        Insert: {
          comment?: string | null
          created_at?: string
          id?: string
          mentor_id: string
          rating: number
          reviewer_user_id: string
          session_id: string
          status?: string
          updated_at?: string
        }
        Update: {
          comment?: string | null
          created_at?: string
          id?: string
          mentor_id?: string
          rating?: number
          reviewer_user_id?: string
          session_id?: string
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "mentor_session_reviews_mentor_id_fkey"
            columns: ["mentor_id"]
            isOneToOne: false
            referencedRelation: "mentors"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "mentor_session_reviews_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "mentor_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      mentor_sessions: {
        Row: {
          competency_term_ids: string[] | null
          created_at: string
          duration_minutes: number
          evidence_submitted: boolean | null
          id: string
          mentor_id: string
          mentor_summary: string | null
          notes: string | null
          order_id: string | null
          recommended_next_step: string | null
          scheduled_at: string
          session_outcome: string | null
          session_type: string
          status: string
          teacher_id: string
          teacher_reflection: string | null
          training_execution_id: string | null
          updated_at: string
        }
        Insert: {
          competency_term_ids?: string[] | null
          created_at?: string
          duration_minutes?: number
          evidence_submitted?: boolean | null
          id?: string
          mentor_id: string
          mentor_summary?: string | null
          notes?: string | null
          order_id?: string | null
          recommended_next_step?: string | null
          scheduled_at: string
          session_outcome?: string | null
          session_type?: string
          status?: string
          teacher_id: string
          teacher_reflection?: string | null
          training_execution_id?: string | null
          updated_at?: string
        }
        Update: {
          competency_term_ids?: string[] | null
          created_at?: string
          duration_minutes?: number
          evidence_submitted?: boolean | null
          id?: string
          mentor_id?: string
          mentor_summary?: string | null
          notes?: string | null
          order_id?: string | null
          recommended_next_step?: string | null
          scheduled_at?: string
          session_outcome?: string | null
          session_type?: string
          status?: string
          teacher_id?: string
          teacher_reflection?: string | null
          training_execution_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "mentor_sessions_mentor_id_fkey"
            columns: ["mentor_id"]
            isOneToOne: false
            referencedRelation: "mentors"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "mentor_sessions_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "mentor_sessions_teacher_id_fkey"
            columns: ["teacher_id"]
            isOneToOne: false
            referencedRelation: "teacher_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "mentor_sessions_training_execution_id_fkey"
            columns: ["training_execution_id"]
            isOneToOne: false
            referencedRelation: "training_executions"
            referencedColumns: ["id"]
          },
        ]
      }
      mentor_specializations: {
        Row: {
          created_at: string
          id: string
          mentor_id: string
          term_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          mentor_id: string
          term_id: string
        }
        Update: {
          created_at?: string
          id?: string
          mentor_id?: string
          term_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "mentor_specializations_mentor_id_fkey"
            columns: ["mentor_id"]
            isOneToOne: false
            referencedRelation: "mentors"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "mentor_specializations_term_id_fkey"
            columns: ["term_id"]
            isOneToOne: false
            referencedRelation: "taxonomy_terms"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "mentor_specializations_term_id_fkey"
            columns: ["term_id"]
            isOneToOne: false
            referencedRelation: "taxonomy_terms_active"
            referencedColumns: ["id"]
          },
        ]
      }
      mentors: {
        Row: {
          bio: string | null
          created_at: string
          headline: string | null
          id: string
          is_independent: boolean
          languages: string[]
          onboarding_completed_at: string | null
          onboarding_current_step: string | null
          onboarding_started_at: string | null
          pricing_type: string | null
          primary_provider_id: string | null
          session_price_amount: number | null
          session_price_currency: string | null
          status: Database["public"]["Enums"]["mentor_status"]
          updated_at: string
          user_id: string
          years_experience: number | null
        }
        Insert: {
          bio?: string | null
          created_at?: string
          headline?: string | null
          id?: string
          is_independent?: boolean
          languages?: string[]
          onboarding_completed_at?: string | null
          onboarding_current_step?: string | null
          onboarding_started_at?: string | null
          pricing_type?: string | null
          primary_provider_id?: string | null
          session_price_amount?: number | null
          session_price_currency?: string | null
          status?: Database["public"]["Enums"]["mentor_status"]
          updated_at?: string
          user_id: string
          years_experience?: number | null
        }
        Update: {
          bio?: string | null
          created_at?: string
          headline?: string | null
          id?: string
          is_independent?: boolean
          languages?: string[]
          onboarding_completed_at?: string | null
          onboarding_current_step?: string | null
          onboarding_started_at?: string | null
          pricing_type?: string | null
          primary_provider_id?: string | null
          session_price_amount?: number | null
          session_price_currency?: string | null
          status?: Database["public"]["Enums"]["mentor_status"]
          updated_at?: string
          user_id?: string
          years_experience?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "mentors_primary_provider_id_fkey"
            columns: ["primary_provider_id"]
            isOneToOne: false
            referencedRelation: "providers"
            referencedColumns: ["id"]
          },
        ]
      }
      mobility_requirements: {
        Row: {
          created_at: string
          id: string
          is_mandatory: boolean
          metadata: Json
          min_count: number | null
          min_experience_years: number | null
          min_reputation_score: number | null
          requirement_key: string
          requirement_label: string
          requirement_type: string
          target_id: string
          term_ids: string[]
        }
        Insert: {
          created_at?: string
          id?: string
          is_mandatory?: boolean
          metadata?: Json
          min_count?: number | null
          min_experience_years?: number | null
          min_reputation_score?: number | null
          requirement_key: string
          requirement_label: string
          requirement_type: string
          target_id: string
          term_ids?: string[]
        }
        Update: {
          created_at?: string
          id?: string
          is_mandatory?: boolean
          metadata?: Json
          min_count?: number | null
          min_experience_years?: number | null
          min_reputation_score?: number | null
          requirement_key?: string
          requirement_label?: string
          requirement_type?: string
          target_id?: string
          term_ids?: string[]
        }
        Relationships: [
          {
            foreignKeyName: "mobility_requirements_target_id_fkey"
            columns: ["target_id"]
            isOneToOne: false
            referencedRelation: "mobility_targets"
            referencedColumns: ["id"]
          },
        ]
      }
      mobility_targets: {
        Row: {
          created_at: string
          description: string | null
          id: string
          is_active: boolean
          name: string
          slug: string
          sort_order: number
          target_career_stage_id: string | null
          target_curriculum_term_ids: string[]
          target_role: string | null
          target_school_type_term_ids: string[]
          track_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          name: string
          slug: string
          sort_order?: number
          target_career_stage_id?: string | null
          target_curriculum_term_ids?: string[]
          target_role?: string | null
          target_school_type_term_ids?: string[]
          track_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          name?: string
          slug?: string
          sort_order?: number
          target_career_stage_id?: string | null
          target_curriculum_term_ids?: string[]
          target_role?: string | null
          target_school_type_term_ids?: string[]
          track_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "mobility_targets_target_career_stage_id_fkey"
            columns: ["target_career_stage_id"]
            isOneToOne: false
            referencedRelation: "career_stages"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "mobility_targets_track_id_fkey"
            columns: ["track_id"]
            isOneToOne: false
            referencedRelation: "mobility_tracks"
            referencedColumns: ["id"]
          },
        ]
      }
      mobility_tracks: {
        Row: {
          created_at: string
          description: string | null
          id: string
          is_active: boolean
          name: string
          slug: string
          sort_order: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          name: string
          slug: string
          sort_order?: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          name?: string
          slug?: string
          sort_order?: number
          updated_at?: string
        }
        Relationships: []
      }
      order_items: {
        Row: {
          created_at: string
          id: string
          item_id: string
          item_type: Database["public"]["Enums"]["order_item_type"]
          metadata: Json | null
          order_id: string
          quantity: number
          total_price: number
          unit_price: number
        }
        Insert: {
          created_at?: string
          id?: string
          item_id: string
          item_type: Database["public"]["Enums"]["order_item_type"]
          metadata?: Json | null
          order_id: string
          quantity?: number
          total_price: number
          unit_price: number
        }
        Update: {
          created_at?: string
          id?: string
          item_id?: string
          item_type?: Database["public"]["Enums"]["order_item_type"]
          metadata?: Json | null
          order_id?: string
          quantity?: number
          total_price?: number
          unit_price?: number
        }
        Relationships: [
          {
            foreignKeyName: "order_items_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      orders: {
        Row: {
          buyer_user_id: string
          created_at: string
          currency: string
          id: string
          metadata: Json | null
          status: Database["public"]["Enums"]["order_status"]
          total_amount: number
          updated_at: string
        }
        Insert: {
          buyer_user_id: string
          created_at?: string
          currency?: string
          id?: string
          metadata?: Json | null
          status?: Database["public"]["Enums"]["order_status"]
          total_amount?: number
          updated_at?: string
        }
        Update: {
          buyer_user_id?: string
          created_at?: string
          currency?: string
          id?: string
          metadata?: Json | null
          status?: Database["public"]["Enums"]["order_status"]
          total_amount?: number
          updated_at?: string
        }
        Relationships: []
      }
      organization_entitlements: {
        Row: {
          created_at: string | null
          enabled: boolean
          ends_at: string | null
          id: string
          metadata: Json | null
          module_key: string
          organization_id: string
          organization_type: string
          source_ref: string | null
          source_type: string
          starts_at: string | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          enabled?: boolean
          ends_at?: string | null
          id?: string
          metadata?: Json | null
          module_key: string
          organization_id: string
          organization_type: string
          source_ref?: string | null
          source_type?: string
          starts_at?: string | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          enabled?: boolean
          ends_at?: string | null
          id?: string
          metadata?: Json | null
          module_key?: string
          organization_id?: string
          organization_type?: string
          source_ref?: string | null
          source_type?: string
          starts_at?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      pathway_executions: {
        Row: {
          completed_at: string | null
          created_at: string
          enrollment_id: string
          id: string
          pathway_id: string
          progress_percent: number | null
          started_at: string | null
          status: string
          teacher_id: string
          updated_at: string
        }
        Insert: {
          completed_at?: string | null
          created_at?: string
          enrollment_id: string
          id?: string
          pathway_id: string
          progress_percent?: number | null
          started_at?: string | null
          status?: string
          teacher_id: string
          updated_at?: string
        }
        Update: {
          completed_at?: string | null
          created_at?: string
          enrollment_id?: string
          id?: string
          pathway_id?: string
          progress_percent?: number | null
          started_at?: string | null
          status?: string
          teacher_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "pathway_executions_enrollment_id_fkey"
            columns: ["enrollment_id"]
            isOneToOne: false
            referencedRelation: "training_enrollments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pathway_executions_pathway_id_fkey"
            columns: ["pathway_id"]
            isOneToOne: false
            referencedRelation: "training_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pathway_executions_teacher_id_fkey"
            columns: ["teacher_id"]
            isOneToOne: false
            referencedRelation: "teacher_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      pathway_milestone_progress: {
        Row: {
          completed_at: string | null
          created_at: string
          execution_id: string
          id: string
          linked_course_ids: string[]
          milestone_id: string
          milestone_order: number
          milestone_title: string
          status: Database["public"]["Enums"]["pathway_milestone_status"]
          updated_at: string
        }
        Insert: {
          completed_at?: string | null
          created_at?: string
          execution_id: string
          id?: string
          linked_course_ids?: string[]
          milestone_id: string
          milestone_order?: number
          milestone_title: string
          status?: Database["public"]["Enums"]["pathway_milestone_status"]
          updated_at?: string
        }
        Update: {
          completed_at?: string | null
          created_at?: string
          execution_id?: string
          id?: string
          linked_course_ids?: string[]
          milestone_id?: string
          milestone_order?: number
          milestone_title?: string
          status?: Database["public"]["Enums"]["pathway_milestone_status"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "pathway_milestone_progress_execution_id_fkey"
            columns: ["execution_id"]
            isOneToOne: false
            referencedRelation: "pathway_executions"
            referencedColumns: ["id"]
          },
        ]
      }
      pathway_reflections: {
        Row: {
          created_at: string
          execution_id: string
          id: string
          prompt_id: string
          prompt_text: string
          submitted_at: string
          teacher_id: string
          teacher_response: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          execution_id: string
          id?: string
          prompt_id: string
          prompt_text?: string
          submitted_at?: string
          teacher_id: string
          teacher_response: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          execution_id?: string
          id?: string
          prompt_id?: string
          prompt_text?: string
          submitted_at?: string
          teacher_id?: string
          teacher_response?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "pathway_reflections_execution_id_fkey"
            columns: ["execution_id"]
            isOneToOne: false
            referencedRelation: "pathway_executions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pathway_reflections_teacher_id_fkey"
            columns: ["teacher_id"]
            isOneToOne: false
            referencedRelation: "teacher_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          account_status: string
          avatar_url: string | null
          created_at: string
          display_name: string | null
          email: string | null
          id: string
          last_sign_in_at: string | null
          phone: string | null
          preferred_language: string | null
          timezone: string | null
          updated_at: string
        }
        Insert: {
          account_status?: string
          avatar_url?: string | null
          created_at?: string
          display_name?: string | null
          email?: string | null
          id: string
          last_sign_in_at?: string | null
          phone?: string | null
          preferred_language?: string | null
          timezone?: string | null
          updated_at?: string
        }
        Update: {
          account_status?: string
          avatar_url?: string | null
          created_at?: string
          display_name?: string | null
          email?: string | null
          id?: string
          last_sign_in_at?: string | null
          phone?: string | null
          preferred_language?: string | null
          timezone?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      promotion_readiness_entries: {
        Row: {
          blocking_gaps: Json
          computed_at: string
          created_at: string
          current_stage: string | null
          gap_count: number
          id: string
          next_stage: string | null
          readiness_percent: number
          school_id: string
          teacher_id: string
          updated_at: string
        }
        Insert: {
          blocking_gaps?: Json
          computed_at?: string
          created_at?: string
          current_stage?: string | null
          gap_count?: number
          id?: string
          next_stage?: string | null
          readiness_percent?: number
          school_id: string
          teacher_id: string
          updated_at?: string
        }
        Update: {
          blocking_gaps?: Json
          computed_at?: string
          created_at?: string
          current_stage?: string | null
          gap_count?: number
          id?: string
          next_stage?: string | null
          readiness_percent?: number
          school_id?: string
          teacher_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "promotion_readiness_entries_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "school_organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "promotion_readiness_entries_teacher_id_fkey"
            columns: ["teacher_id"]
            isOneToOne: false
            referencedRelation: "teacher_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      provider_earnings: {
        Row: {
          amount: number
          created_at: string
          currency: string
          id: string
          ledger_id: string
          provider_id: string
          status: Database["public"]["Enums"]["earnings_status"]
          updated_at: string
        }
        Insert: {
          amount: number
          created_at?: string
          currency?: string
          id?: string
          ledger_id: string
          provider_id: string
          status?: Database["public"]["Enums"]["earnings_status"]
          updated_at?: string
        }
        Update: {
          amount?: number
          created_at?: string
          currency?: string
          id?: string
          ledger_id?: string
          provider_id?: string
          status?: Database["public"]["Enums"]["earnings_status"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "provider_earnings_ledger_id_fkey"
            columns: ["ledger_id"]
            isOneToOne: false
            referencedRelation: "revenue_ledger"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "provider_earnings_provider_id_fkey"
            columns: ["provider_id"]
            isOneToOne: false
            referencedRelation: "providers"
            referencedColumns: ["id"]
          },
        ]
      }
      provider_members: {
        Row: {
          created_at: string
          id: string
          invited_by: string | null
          joined_at: string | null
          provider_id: string
          role: Database["public"]["Enums"]["provider_member_role"]
          status: Database["public"]["Enums"]["provider_member_status"]
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          invited_by?: string | null
          joined_at?: string | null
          provider_id: string
          role?: Database["public"]["Enums"]["provider_member_role"]
          status?: Database["public"]["Enums"]["provider_member_status"]
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          invited_by?: string | null
          joined_at?: string | null
          provider_id?: string
          role?: Database["public"]["Enums"]["provider_member_role"]
          status?: Database["public"]["Enums"]["provider_member_status"]
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "provider_members_provider_id_fkey"
            columns: ["provider_id"]
            isOneToOne: false
            referencedRelation: "providers"
            referencedColumns: ["id"]
          },
        ]
      }
      provider_payouts: {
        Row: {
          amount: number
          created_at: string
          currency: string
          external_reference: string | null
          id: string
          notes: string | null
          payout_method: string | null
          processed_at: string | null
          provider_id: string
          status: Database["public"]["Enums"]["payout_status"]
          updated_at: string
        }
        Insert: {
          amount: number
          created_at?: string
          currency?: string
          external_reference?: string | null
          id?: string
          notes?: string | null
          payout_method?: string | null
          processed_at?: string | null
          provider_id: string
          status?: Database["public"]["Enums"]["payout_status"]
          updated_at?: string
        }
        Update: {
          amount?: number
          created_at?: string
          currency?: string
          external_reference?: string | null
          id?: string
          notes?: string | null
          payout_method?: string | null
          processed_at?: string | null
          provider_id?: string
          status?: Database["public"]["Enums"]["payout_status"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "provider_payouts_provider_id_fkey"
            columns: ["provider_id"]
            isOneToOne: false
            referencedRelation: "providers"
            referencedColumns: ["id"]
          },
        ]
      }
      providers: {
        Row: {
          approved_at: string | null
          approved_by: string | null
          bio: string | null
          city_term_id: string | null
          contact_email: string | null
          country_term_id: string | null
          cover_url: string | null
          created_at: string
          created_by: string
          display_name: string
          id: string
          legal_name: string
          logo_url: string | null
          onboarding_completed_at: string | null
          onboarding_current_step: string | null
          onboarding_started_at: string | null
          rejection_reason: string | null
          slug: string
          status: Database["public"]["Enums"]["provider_status"]
          type: Database["public"]["Enums"]["provider_type"]
          updated_at: string
          verification_status: Database["public"]["Enums"]["provider_verification_status"]
          website_url: string | null
        }
        Insert: {
          approved_at?: string | null
          approved_by?: string | null
          bio?: string | null
          city_term_id?: string | null
          contact_email?: string | null
          country_term_id?: string | null
          cover_url?: string | null
          created_at?: string
          created_by: string
          display_name: string
          id?: string
          legal_name: string
          logo_url?: string | null
          onboarding_completed_at?: string | null
          onboarding_current_step?: string | null
          onboarding_started_at?: string | null
          rejection_reason?: string | null
          slug: string
          status?: Database["public"]["Enums"]["provider_status"]
          type?: Database["public"]["Enums"]["provider_type"]
          updated_at?: string
          verification_status?: Database["public"]["Enums"]["provider_verification_status"]
          website_url?: string | null
        }
        Update: {
          approved_at?: string | null
          approved_by?: string | null
          bio?: string | null
          city_term_id?: string | null
          contact_email?: string | null
          country_term_id?: string | null
          cover_url?: string | null
          created_at?: string
          created_by?: string
          display_name?: string
          id?: string
          legal_name?: string
          logo_url?: string | null
          onboarding_completed_at?: string | null
          onboarding_current_step?: string | null
          onboarding_started_at?: string | null
          rejection_reason?: string | null
          slug?: string
          status?: Database["public"]["Enums"]["provider_status"]
          type?: Database["public"]["Enums"]["provider_type"]
          updated_at?: string
          verification_status?: Database["public"]["Enums"]["provider_verification_status"]
          website_url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "providers_city_term_id_fkey"
            columns: ["city_term_id"]
            isOneToOne: false
            referencedRelation: "taxonomy_terms"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "providers_city_term_id_fkey"
            columns: ["city_term_id"]
            isOneToOne: false
            referencedRelation: "taxonomy_terms_active"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "providers_country_term_id_fkey"
            columns: ["country_term_id"]
            isOneToOne: false
            referencedRelation: "taxonomy_terms"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "providers_country_term_id_fkey"
            columns: ["country_term_id"]
            isOneToOne: false
            referencedRelation: "taxonomy_terms_active"
            referencedColumns: ["id"]
          },
        ]
      }
      recommendation_feedback_signals: {
        Row: {
          action_type: string
          created_at: string
          id: string
          metadata: Json | null
          priority: string | null
          recommendation_id: string
          signal_type: string
          target_resource_id: string | null
          teacher_id: string
        }
        Insert: {
          action_type: string
          created_at?: string
          id?: string
          metadata?: Json | null
          priority?: string | null
          recommendation_id: string
          signal_type: string
          target_resource_id?: string | null
          teacher_id: string
        }
        Update: {
          action_type?: string
          created_at?: string
          id?: string
          metadata?: Json | null
          priority?: string | null
          recommendation_id?: string
          signal_type?: string
          target_resource_id?: string | null
          teacher_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "recommendation_feedback_signals_teacher_id_fkey"
            columns: ["teacher_id"]
            isOneToOne: false
            referencedRelation: "teacher_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      reputation_events: {
        Row: {
          created_at: string
          description: string
          dimension: string
          event_type: string
          id: string
          reputation_delta: number
          source_domain: string
          source_reference_id: string | null
          teacher_id: string
        }
        Insert: {
          created_at?: string
          description?: string
          dimension: string
          event_type: string
          id?: string
          reputation_delta?: number
          source_domain: string
          source_reference_id?: string | null
          teacher_id: string
        }
        Update: {
          created_at?: string
          description?: string
          dimension?: string
          event_type?: string
          id?: string
          reputation_delta?: number
          source_domain?: string
          source_reference_id?: string | null
          teacher_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "reputation_events_teacher_id_fkey"
            columns: ["teacher_id"]
            isOneToOne: false
            referencedRelation: "teacher_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      reputation_profiles: {
        Row: {
          created_at: string
          credibility_tier: string
          dimension_scores: Json
          engine_version: string
          id: string
          reputation_score: number
          teacher_id: string
          total_reputation_events: number
          updated_at: string
          verified_signal_count: number
        }
        Insert: {
          created_at?: string
          credibility_tier?: string
          dimension_scores?: Json
          engine_version?: string
          id?: string
          reputation_score?: number
          teacher_id: string
          total_reputation_events?: number
          updated_at?: string
          verified_signal_count?: number
        }
        Update: {
          created_at?: string
          credibility_tier?: string
          dimension_scores?: Json
          engine_version?: string
          id?: string
          reputation_score?: number
          teacher_id?: string
          total_reputation_events?: number
          updated_at?: string
          verified_signal_count?: number
        }
        Relationships: [
          {
            foreignKeyName: "reputation_profiles_teacher_id_fkey"
            columns: ["teacher_id"]
            isOneToOne: true
            referencedRelation: "teacher_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      revenue_ledger: {
        Row: {
          created_at: string
          currency: string
          gross_amount: number
          id: string
          net_amount: number
          order_item_id: string
          platform_fee: number
          recipient_id: string | null
          recipient_type: Database["public"]["Enums"]["recipient_type"]
          transaction_id: string
        }
        Insert: {
          created_at?: string
          currency?: string
          gross_amount: number
          id?: string
          net_amount: number
          order_item_id: string
          platform_fee?: number
          recipient_id?: string | null
          recipient_type: Database["public"]["Enums"]["recipient_type"]
          transaction_id: string
        }
        Update: {
          created_at?: string
          currency?: string
          gross_amount?: number
          id?: string
          net_amount?: number
          order_item_id?: string
          platform_fee?: number
          recipient_id?: string | null
          recipient_type?: Database["public"]["Enums"]["recipient_type"]
          transaction_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "revenue_ledger_order_item_id_fkey"
            columns: ["order_item_id"]
            isOneToOne: false
            referencedRelation: "order_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "revenue_ledger_transaction_id_fkey"
            columns: ["transaction_id"]
            isOneToOne: false
            referencedRelation: "transactions"
            referencedColumns: ["id"]
          },
        ]
      }
      saved_candidates: {
        Row: {
          created_at: string
          id: string
          school_user_id: string
          teacher_profile_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          school_user_id: string
          teacher_profile_id: string
        }
        Update: {
          created_at?: string
          id?: string
          school_user_id?: string
          teacher_profile_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "saved_candidates_teacher_profile_id_fkey"
            columns: ["teacher_profile_id"]
            isOneToOne: false
            referencedRelation: "teacher_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      saved_jobs: {
        Row: {
          created_at: string | null
          id: string
          job_id: string
          teacher_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          job_id: string
          teacher_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          job_id?: string
          teacher_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "saved_jobs_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "jobs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "saved_jobs_teacher_id_fkey"
            columns: ["teacher_id"]
            isOneToOne: false
            referencedRelation: "teacher_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      saved_training_items: {
        Row: {
          created_at: string
          id: string
          training_item_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          training_item_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          training_item_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "saved_training_items_training_item_id_fkey"
            columns: ["training_item_id"]
            isOneToOne: false
            referencedRelation: "training_items"
            referencedColumns: ["id"]
          },
        ]
      }
      school_follows: {
        Row: {
          created_at: string
          id: string
          school_id: string
          teacher_user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          school_id: string
          teacher_user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          school_id?: string
          teacher_user_id?: string
        }
        Relationships: []
      }
      school_invitations: {
        Row: {
          accepted_at: string | null
          created_at: string
          email: string
          expires_at: string | null
          id: string
          invited_by: string
          role_key: string
          school_id: string
          status: string
          updated_at: string
        }
        Insert: {
          accepted_at?: string | null
          created_at?: string
          email: string
          expires_at?: string | null
          id?: string
          invited_by: string
          role_key: string
          school_id: string
          status?: string
          updated_at?: string
        }
        Update: {
          accepted_at?: string | null
          created_at?: string
          email?: string
          expires_at?: string | null
          id?: string
          invited_by?: string
          role_key?: string
          school_id?: string
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "school_invitations_invited_by_fkey"
            columns: ["invited_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "school_invitations_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "school_organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      school_members: {
        Row: {
          created_at: string
          id: string
          joined_at: string
          role_key: string
          school_id: string
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          joined_at?: string
          role_key: string
          school_id: string
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          joined_at?: string
          role_key?: string
          school_id?: string
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "school_members_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "school_organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "school_members_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      school_organizations: {
        Row: {
          country_term_id: string | null
          created_at: string
          curriculum_term_ids: string[]
          id: string
          legacy_school_profile_id: string | null
          logo_url: string | null
          name: string
          onboarding_completed: boolean
          plan: string
          school_type_term_id: string | null
          slug: string | null
          status: string
          updated_at: string
        }
        Insert: {
          country_term_id?: string | null
          created_at?: string
          curriculum_term_ids?: string[]
          id?: string
          legacy_school_profile_id?: string | null
          logo_url?: string | null
          name: string
          onboarding_completed?: boolean
          plan?: string
          school_type_term_id?: string | null
          slug?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          country_term_id?: string | null
          created_at?: string
          curriculum_term_ids?: string[]
          id?: string
          legacy_school_profile_id?: string | null
          logo_url?: string | null
          name?: string
          onboarding_completed?: boolean
          plan?: string
          school_type_term_id?: string | null
          slug?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: []
      }
      school_profiles: {
        Row: {
          country_term_id: string | null
          created_at: string
          curriculum_term_ids: string[]
          id: string
          name: string | null
          onboarding_completed: boolean
          plan: string
          preferred_start: string | null
          school_type_term_id: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          country_term_id?: string | null
          created_at?: string
          curriculum_term_ids?: string[]
          id?: string
          name?: string | null
          onboarding_completed?: boolean
          plan?: string
          preferred_start?: string | null
          school_type_term_id?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          country_term_id?: string | null
          created_at?: string
          curriculum_term_ids?: string[]
          id?: string
          name?: string | null
          onboarding_completed?: boolean
          plan?: string
          preferred_start?: string | null
          school_type_term_id?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "school_profiles_country_term_id_fkey"
            columns: ["country_term_id"]
            isOneToOne: false
            referencedRelation: "taxonomy_terms"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "school_profiles_country_term_id_fkey"
            columns: ["country_term_id"]
            isOneToOne: false
            referencedRelation: "taxonomy_terms_active"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "school_profiles_school_type_term_id_fkey"
            columns: ["school_type_term_id"]
            isOneToOne: false
            referencedRelation: "taxonomy_terms"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "school_profiles_school_type_term_id_fkey"
            columns: ["school_type_term_id"]
            isOneToOne: false
            referencedRelation: "taxonomy_terms_active"
            referencedColumns: ["id"]
          },
        ]
      }
      school_team_members: {
        Row: {
          added_at: string
          id: string
          school_id: string
          teacher_id: string
        }
        Insert: {
          added_at?: string
          id?: string
          school_id: string
          teacher_id: string
        }
        Update: {
          added_at?: string
          id?: string
          school_id?: string
          teacher_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "school_team_members_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "school_organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "school_team_members_teacher_id_fkey"
            columns: ["teacher_id"]
            isOneToOne: false
            referencedRelation: "teacher_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      school_workforce_profiles: {
        Row: {
          average_cri_score: number
          average_reputation_score: number
          career_stage_distribution: Json
          created_at: string
          credential_coverage: number
          engine_version: string
          id: string
          promotion_ready_count: number
          reputation_distribution: Json
          school_id: string
          teacher_count: number
          top_gaps: Json
          updated_at: string
          verified_teacher_count: number
          workforce_updated_at: string
        }
        Insert: {
          average_cri_score?: number
          average_reputation_score?: number
          career_stage_distribution?: Json
          created_at?: string
          credential_coverage?: number
          engine_version?: string
          id?: string
          promotion_ready_count?: number
          reputation_distribution?: Json
          school_id: string
          teacher_count?: number
          top_gaps?: Json
          updated_at?: string
          verified_teacher_count?: number
          workforce_updated_at?: string
        }
        Update: {
          average_cri_score?: number
          average_reputation_score?: number
          career_stage_distribution?: Json
          created_at?: string
          credential_coverage?: number
          engine_version?: string
          id?: string
          promotion_ready_count?: number
          reputation_distribution?: Json
          school_id?: string
          teacher_count?: number
          top_gaps?: Json
          updated_at?: string
          verified_teacher_count?: number
          workforce_updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "school_workforce_profiles_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: true
            referencedRelation: "school_organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      taxonomy_term_types: {
        Row: {
          created_at: string
          description: string | null
          id: string
          is_active: boolean
          is_system_domain: boolean
          key: string
          name: string
          name_ar: string | null
          name_en: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          is_system_domain?: boolean
          key: string
          name: string
          name_ar?: string | null
          name_en: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          is_system_domain?: boolean
          key?: string
          name?: string
          name_ar?: string | null
          name_en?: string
        }
        Relationships: []
      }
      taxonomy_terms: {
        Row: {
          code: string | null
          created_at: string
          id: string
          is_active: boolean
          meta: Json | null
          name: string
          name_ar: string | null
          name_en: string
          parent_id: string | null
          slug: string
          sort_order: number | null
          term_type_id: string
        }
        Insert: {
          code?: string | null
          created_at?: string
          id?: string
          is_active?: boolean
          meta?: Json | null
          name: string
          name_ar?: string | null
          name_en: string
          parent_id?: string | null
          slug: string
          sort_order?: number | null
          term_type_id: string
        }
        Update: {
          code?: string | null
          created_at?: string
          id?: string
          is_active?: boolean
          meta?: Json | null
          name?: string
          name_ar?: string | null
          name_en?: string
          parent_id?: string | null
          slug?: string
          sort_order?: number | null
          term_type_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "taxonomy_terms_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "taxonomy_terms"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "taxonomy_terms_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "taxonomy_terms_active"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "taxonomy_terms_term_type_id_fkey"
            columns: ["term_type_id"]
            isOneToOne: false
            referencedRelation: "taxonomy_term_types"
            referencedColumns: ["id"]
          },
        ]
      }
      teacher_career_goals: {
        Row: {
          created_at: string
          goal_status: string
          id: string
          target_path_id: string
          target_stage_id: string
          teacher_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          goal_status?: string
          id?: string
          target_path_id: string
          target_stage_id: string
          teacher_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          goal_status?: string
          id?: string
          target_path_id?: string
          target_stage_id?: string
          teacher_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "teacher_career_goals_target_path_id_fkey"
            columns: ["target_path_id"]
            isOneToOne: false
            referencedRelation: "career_paths"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "teacher_career_goals_target_stage_id_fkey"
            columns: ["target_stage_id"]
            isOneToOne: false
            referencedRelation: "career_stages"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "teacher_career_goals_teacher_id_fkey"
            columns: ["teacher_id"]
            isOneToOne: false
            referencedRelation: "teacher_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      teacher_career_states: {
        Row: {
          computed_at: string
          created_at: string
          current_path_id: string | null
          current_stage_id: string | null
          engine_version: string
          evaluation_trace: Json
          id: string
          next_stage_id: string | null
          readiness_percent: number
          satisfied_requirement_count: number
          teacher_id: string
          total_requirement_count: number
          unmet_requirement_count: number
          updated_at: string
        }
        Insert: {
          computed_at?: string
          created_at?: string
          current_path_id?: string | null
          current_stage_id?: string | null
          engine_version?: string
          evaluation_trace?: Json
          id?: string
          next_stage_id?: string | null
          readiness_percent?: number
          satisfied_requirement_count?: number
          teacher_id: string
          total_requirement_count?: number
          unmet_requirement_count?: number
          updated_at?: string
        }
        Update: {
          computed_at?: string
          created_at?: string
          current_path_id?: string | null
          current_stage_id?: string | null
          engine_version?: string
          evaluation_trace?: Json
          id?: string
          next_stage_id?: string | null
          readiness_percent?: number
          satisfied_requirement_count?: number
          teacher_id?: string
          total_requirement_count?: number
          unmet_requirement_count?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "teacher_career_states_current_path_id_fkey"
            columns: ["current_path_id"]
            isOneToOne: false
            referencedRelation: "career_paths"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "teacher_career_states_current_stage_id_fkey"
            columns: ["current_stage_id"]
            isOneToOne: false
            referencedRelation: "career_stages"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "teacher_career_states_next_stage_id_fkey"
            columns: ["next_stage_id"]
            isOneToOne: false
            referencedRelation: "career_stages"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "teacher_career_states_teacher_id_fkey"
            columns: ["teacher_id"]
            isOneToOne: true
            referencedRelation: "teacher_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      teacher_certifications: {
        Row: {
          certification_term_id: string
          created_at: string
          expiry_date: string | null
          id: string
          issue_date: string | null
          issued_by: string | null
          teacher_id: string
          updated_at: string
        }
        Insert: {
          certification_term_id: string
          created_at?: string
          expiry_date?: string | null
          id?: string
          issue_date?: string | null
          issued_by?: string | null
          teacher_id: string
          updated_at?: string
        }
        Update: {
          certification_term_id?: string
          created_at?: string
          expiry_date?: string | null
          id?: string
          issue_date?: string | null
          issued_by?: string | null
          teacher_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "teacher_certifications_certification_term_id_fkey"
            columns: ["certification_term_id"]
            isOneToOne: false
            referencedRelation: "taxonomy_terms"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "teacher_certifications_certification_term_id_fkey"
            columns: ["certification_term_id"]
            isOneToOne: false
            referencedRelation: "taxonomy_terms_active"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "teacher_certifications_teacher_id_fkey"
            columns: ["teacher_id"]
            isOneToOne: false
            referencedRelation: "teacher_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      teacher_compliance_status: {
        Row: {
          completed_at: string | null
          created_at: string
          id: string
          requirement_id: string
          school_id: string
          status: string
          teacher_id: string
          updated_at: string
        }
        Insert: {
          completed_at?: string | null
          created_at?: string
          id?: string
          requirement_id: string
          school_id: string
          status?: string
          teacher_id: string
          updated_at?: string
        }
        Update: {
          completed_at?: string | null
          created_at?: string
          id?: string
          requirement_id?: string
          school_id?: string
          status?: string
          teacher_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "teacher_compliance_status_requirement_id_fkey"
            columns: ["requirement_id"]
            isOneToOne: false
            referencedRelation: "compliance_requirements"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "teacher_compliance_status_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "school_organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "teacher_compliance_status_teacher_id_fkey"
            columns: ["teacher_id"]
            isOneToOne: false
            referencedRelation: "teacher_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      teacher_degrees: {
        Row: {
          created_at: string
          degree_term_id: string
          id: string
          institution: string | null
          teacher_id: string
          updated_at: string
          year_completed: number | null
        }
        Insert: {
          created_at?: string
          degree_term_id: string
          id?: string
          institution?: string | null
          teacher_id: string
          updated_at?: string
          year_completed?: number | null
        }
        Update: {
          created_at?: string
          degree_term_id?: string
          id?: string
          institution?: string | null
          teacher_id?: string
          updated_at?: string
          year_completed?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "teacher_degrees_degree_term_id_fkey"
            columns: ["degree_term_id"]
            isOneToOne: false
            referencedRelation: "taxonomy_terms"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "teacher_degrees_degree_term_id_fkey"
            columns: ["degree_term_id"]
            isOneToOne: false
            referencedRelation: "taxonomy_terms_active"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "teacher_degrees_teacher_id_fkey"
            columns: ["teacher_id"]
            isOneToOne: false
            referencedRelation: "teacher_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      teacher_languages: {
        Row: {
          created_at: string
          id: string
          language_level_term_id: string | null
          language_term_id: string
          teacher_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          language_level_term_id?: string | null
          language_term_id: string
          teacher_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          language_level_term_id?: string | null
          language_term_id?: string
          teacher_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "teacher_languages_language_level_term_id_fkey"
            columns: ["language_level_term_id"]
            isOneToOne: false
            referencedRelation: "taxonomy_terms"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "teacher_languages_language_level_term_id_fkey"
            columns: ["language_level_term_id"]
            isOneToOne: false
            referencedRelation: "taxonomy_terms_active"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "teacher_languages_language_term_id_fkey"
            columns: ["language_term_id"]
            isOneToOne: false
            referencedRelation: "taxonomy_terms"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "teacher_languages_language_term_id_fkey"
            columns: ["language_term_id"]
            isOneToOne: false
            referencedRelation: "taxonomy_terms_active"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "teacher_languages_teacher_id_fkey"
            columns: ["teacher_id"]
            isOneToOne: false
            referencedRelation: "teacher_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      teacher_licenses: {
        Row: {
          created_at: string
          expiry_date: string | null
          id: string
          issue_date: string | null
          issuing_authority: string | null
          license_term_id: string
          teacher_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          expiry_date?: string | null
          id?: string
          issue_date?: string | null
          issuing_authority?: string | null
          license_term_id: string
          teacher_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          expiry_date?: string | null
          id?: string
          issue_date?: string | null
          issuing_authority?: string | null
          license_term_id?: string
          teacher_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "teacher_licenses_license_term_id_fkey"
            columns: ["license_term_id"]
            isOneToOne: false
            referencedRelation: "taxonomy_terms"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "teacher_licenses_license_term_id_fkey"
            columns: ["license_term_id"]
            isOneToOne: false
            referencedRelation: "taxonomy_terms_active"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "teacher_licenses_teacher_id_fkey"
            columns: ["teacher_id"]
            isOneToOne: false
            referencedRelation: "teacher_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      teacher_mobility_states: {
        Row: {
          blocking_gaps: Json
          created_at: string
          engine_version: string
          evaluation_trace: Json
          gap_count: number
          id: string
          last_evaluated: string
          readiness_percent: number
          satisfied_count: number
          target_id: string
          teacher_id: string
          total_count: number
          updated_at: string
        }
        Insert: {
          blocking_gaps?: Json
          created_at?: string
          engine_version?: string
          evaluation_trace?: Json
          gap_count?: number
          id?: string
          last_evaluated?: string
          readiness_percent?: number
          satisfied_count?: number
          target_id: string
          teacher_id: string
          total_count?: number
          updated_at?: string
        }
        Update: {
          blocking_gaps?: Json
          created_at?: string
          engine_version?: string
          evaluation_trace?: Json
          gap_count?: number
          id?: string
          last_evaluated?: string
          readiness_percent?: number
          satisfied_count?: number
          target_id?: string
          teacher_id?: string
          total_count?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "teacher_mobility_states_target_id_fkey"
            columns: ["target_id"]
            isOneToOne: false
            referencedRelation: "mobility_targets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "teacher_mobility_states_teacher_id_fkey"
            columns: ["teacher_id"]
            isOneToOne: false
            referencedRelation: "teacher_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      teacher_profiles: {
        Row: {
          availability_status: string
          availability_status_term_id: string | null
          availability_status_term_ids: string[] | null
          avatar_url: string | null
          bio: string | null
          certification_ids: string[] | null
          city: string | null
          city_id: string | null
          completed_training: Json | null
          contact_email: string | null
          country: string | null
          country_id: string | null
          created_at: string
          curriculum_experience_ids: string[] | null
          curriculum_ids: string[] | null
          cv_url: string | null
          degree_ids: string[] | null
          district_id: string | null
          education: Json | null
          employment_type_term_ids: string[] | null
          experience: Json | null
          full_name: string
          grade_band_ids: string[] | null
          id: string
          is_contact_visible: boolean
          is_featured: boolean
          is_public_profile: boolean
          language_ids: string[] | null
          migration_meta: Json | null
          nationality_id: string | null
          opportunity_type_ids: string[] | null
          preferred_start: string | null
          profile_source: string
          region_id: string | null
          student_age_range: string | null
          subject_ids: string[] | null
          teaching_demo: Json | null
          teaching_license_ids: string[] | null
          updated_at: string
          user_id: string
          visa_status: string | null
          visa_status_term_id: string | null
          work_arrangement_term_ids: string[] | null
          years_of_experience: number | null
        }
        Insert: {
          availability_status?: string
          availability_status_term_id?: string | null
          availability_status_term_ids?: string[] | null
          avatar_url?: string | null
          bio?: string | null
          certification_ids?: string[] | null
          city?: string | null
          city_id?: string | null
          completed_training?: Json | null
          contact_email?: string | null
          country?: string | null
          country_id?: string | null
          created_at?: string
          curriculum_experience_ids?: string[] | null
          curriculum_ids?: string[] | null
          cv_url?: string | null
          degree_ids?: string[] | null
          district_id?: string | null
          education?: Json | null
          employment_type_term_ids?: string[] | null
          experience?: Json | null
          full_name?: string
          grade_band_ids?: string[] | null
          id?: string
          is_contact_visible?: boolean
          is_featured?: boolean
          is_public_profile?: boolean
          language_ids?: string[] | null
          migration_meta?: Json | null
          nationality_id?: string | null
          opportunity_type_ids?: string[] | null
          preferred_start?: string | null
          profile_source?: string
          region_id?: string | null
          student_age_range?: string | null
          subject_ids?: string[] | null
          teaching_demo?: Json | null
          teaching_license_ids?: string[] | null
          updated_at?: string
          user_id: string
          visa_status?: string | null
          visa_status_term_id?: string | null
          work_arrangement_term_ids?: string[] | null
          years_of_experience?: number | null
        }
        Update: {
          availability_status?: string
          availability_status_term_id?: string | null
          availability_status_term_ids?: string[] | null
          avatar_url?: string | null
          bio?: string | null
          certification_ids?: string[] | null
          city?: string | null
          city_id?: string | null
          completed_training?: Json | null
          contact_email?: string | null
          country?: string | null
          country_id?: string | null
          created_at?: string
          curriculum_experience_ids?: string[] | null
          curriculum_ids?: string[] | null
          cv_url?: string | null
          degree_ids?: string[] | null
          district_id?: string | null
          education?: Json | null
          employment_type_term_ids?: string[] | null
          experience?: Json | null
          full_name?: string
          grade_band_ids?: string[] | null
          id?: string
          is_contact_visible?: boolean
          is_featured?: boolean
          is_public_profile?: boolean
          language_ids?: string[] | null
          migration_meta?: Json | null
          nationality_id?: string | null
          opportunity_type_ids?: string[] | null
          preferred_start?: string | null
          profile_source?: string
          region_id?: string | null
          student_age_range?: string | null
          subject_ids?: string[] | null
          teaching_demo?: Json | null
          teaching_license_ids?: string[] | null
          updated_at?: string
          user_id?: string
          visa_status?: string | null
          visa_status_term_id?: string | null
          work_arrangement_term_ids?: string[] | null
          years_of_experience?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "teacher_profiles_availability_status_term_id_fkey"
            columns: ["availability_status_term_id"]
            isOneToOne: false
            referencedRelation: "taxonomy_terms"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "teacher_profiles_availability_status_term_id_fkey"
            columns: ["availability_status_term_id"]
            isOneToOne: false
            referencedRelation: "taxonomy_terms_active"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "teacher_profiles_city_id_fkey"
            columns: ["city_id"]
            isOneToOne: false
            referencedRelation: "taxonomy_terms"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "teacher_profiles_city_id_fkey"
            columns: ["city_id"]
            isOneToOne: false
            referencedRelation: "taxonomy_terms_active"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "teacher_profiles_country_id_fkey"
            columns: ["country_id"]
            isOneToOne: false
            referencedRelation: "taxonomy_terms"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "teacher_profiles_country_id_fkey"
            columns: ["country_id"]
            isOneToOne: false
            referencedRelation: "taxonomy_terms_active"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "teacher_profiles_district_id_fkey"
            columns: ["district_id"]
            isOneToOne: false
            referencedRelation: "taxonomy_terms"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "teacher_profiles_district_id_fkey"
            columns: ["district_id"]
            isOneToOne: false
            referencedRelation: "taxonomy_terms_active"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "teacher_profiles_nationality_id_fkey"
            columns: ["nationality_id"]
            isOneToOne: false
            referencedRelation: "taxonomy_terms"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "teacher_profiles_nationality_id_fkey"
            columns: ["nationality_id"]
            isOneToOne: false
            referencedRelation: "taxonomy_terms_active"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "teacher_profiles_region_id_fkey"
            columns: ["region_id"]
            isOneToOne: false
            referencedRelation: "taxonomy_terms"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "teacher_profiles_region_id_fkey"
            columns: ["region_id"]
            isOneToOne: false
            referencedRelation: "taxonomy_terms_active"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "teacher_profiles_visa_status_term_id_fkey"
            columns: ["visa_status_term_id"]
            isOneToOne: false
            referencedRelation: "taxonomy_terms"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "teacher_profiles_visa_status_term_id_fkey"
            columns: ["visa_status_term_id"]
            isOneToOne: false
            referencedRelation: "taxonomy_terms_active"
            referencedColumns: ["id"]
          },
        ]
      }
      teacher_skills: {
        Row: {
          created_at: string
          id: string
          proficiency_level: string | null
          skill_term_id: string
          teacher_id: string
          updated_at: string
          years_experience: number | null
        }
        Insert: {
          created_at?: string
          id?: string
          proficiency_level?: string | null
          skill_term_id: string
          teacher_id: string
          updated_at?: string
          years_experience?: number | null
        }
        Update: {
          created_at?: string
          id?: string
          proficiency_level?: string | null
          skill_term_id?: string
          teacher_id?: string
          updated_at?: string
          years_experience?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "teacher_skills_skill_term_id_fkey"
            columns: ["skill_term_id"]
            isOneToOne: false
            referencedRelation: "taxonomy_terms"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "teacher_skills_skill_term_id_fkey"
            columns: ["skill_term_id"]
            isOneToOne: false
            referencedRelation: "taxonomy_terms_active"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "teacher_skills_teacher_id_fkey"
            columns: ["teacher_id"]
            isOneToOne: false
            referencedRelation: "teacher_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      training_assignments: {
        Row: {
          assigned_at: string
          assigned_by_user_id: string
          assigned_item_id: string
          assigned_item_type: string
          assigned_to_teacher_id: string
          created_at: string
          due_date: string | null
          id: string
          notes: string | null
          school_id: string
          status: Database["public"]["Enums"]["training_assignment_status"]
          updated_at: string
        }
        Insert: {
          assigned_at?: string
          assigned_by_user_id: string
          assigned_item_id: string
          assigned_item_type: string
          assigned_to_teacher_id: string
          created_at?: string
          due_date?: string | null
          id?: string
          notes?: string | null
          school_id: string
          status?: Database["public"]["Enums"]["training_assignment_status"]
          updated_at?: string
        }
        Update: {
          assigned_at?: string
          assigned_by_user_id?: string
          assigned_item_id?: string
          assigned_item_type?: string
          assigned_to_teacher_id?: string
          created_at?: string
          due_date?: string | null
          id?: string
          notes?: string | null
          school_id?: string
          status?: Database["public"]["Enums"]["training_assignment_status"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "training_assignments_assigned_item_id_fkey"
            columns: ["assigned_item_id"]
            isOneToOne: false
            referencedRelation: "training_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "training_assignments_assigned_to_teacher_id_fkey"
            columns: ["assigned_to_teacher_id"]
            isOneToOne: false
            referencedRelation: "teacher_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "training_assignments_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "school_organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      training_completions: {
        Row: {
          completed_at: string
          completion_evidence: Json
          created_at: string
          id: string
          source_id: string
          source_type: string
          teacher_id: string
          updated_at: string
          verified_at: string | null
          verified_by_mentor_id: string | null
          verified_completion: boolean
        }
        Insert: {
          completed_at?: string
          completion_evidence?: Json
          created_at?: string
          id?: string
          source_id: string
          source_type: string
          teacher_id: string
          updated_at?: string
          verified_at?: string | null
          verified_by_mentor_id?: string | null
          verified_completion?: boolean
        }
        Update: {
          completed_at?: string
          completion_evidence?: Json
          created_at?: string
          id?: string
          source_id?: string
          source_type?: string
          teacher_id?: string
          updated_at?: string
          verified_at?: string | null
          verified_by_mentor_id?: string | null
          verified_completion?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "training_completions_teacher_id_fkey"
            columns: ["teacher_id"]
            isOneToOne: false
            referencedRelation: "teacher_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "training_completions_verified_by_mentor_id_fkey"
            columns: ["verified_by_mentor_id"]
            isOneToOne: false
            referencedRelation: "mentors"
            referencedColumns: ["id"]
          },
        ]
      }
      training_enrollments: {
        Row: {
          assignment_id: string | null
          completed_at: string | null
          created_at: string
          enrolled_at: string
          enrollment_source: Database["public"]["Enums"]["training_enrollment_source"]
          id: string
          item_id: string
          item_type: string
          pathway_enrollment_id: string | null
          started_at: string | null
          status: Database["public"]["Enums"]["training_enrollment_status"]
          teacher_id: string
          updated_at: string
        }
        Insert: {
          assignment_id?: string | null
          completed_at?: string | null
          created_at?: string
          enrolled_at?: string
          enrollment_source: Database["public"]["Enums"]["training_enrollment_source"]
          id?: string
          item_id: string
          item_type: string
          pathway_enrollment_id?: string | null
          started_at?: string | null
          status?: Database["public"]["Enums"]["training_enrollment_status"]
          teacher_id: string
          updated_at?: string
        }
        Update: {
          assignment_id?: string | null
          completed_at?: string | null
          created_at?: string
          enrolled_at?: string
          enrollment_source?: Database["public"]["Enums"]["training_enrollment_source"]
          id?: string
          item_id?: string
          item_type?: string
          pathway_enrollment_id?: string | null
          started_at?: string | null
          status?: Database["public"]["Enums"]["training_enrollment_status"]
          teacher_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "training_enrollments_assignment_id_fkey"
            columns: ["assignment_id"]
            isOneToOne: false
            referencedRelation: "training_assignments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "training_enrollments_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "training_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "training_enrollments_pathway_enrollment_id_fkey"
            columns: ["pathway_enrollment_id"]
            isOneToOne: false
            referencedRelation: "training_enrollments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "training_enrollments_teacher_id_fkey"
            columns: ["teacher_id"]
            isOneToOne: false
            referencedRelation: "teacher_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      training_evidence: {
        Row: {
          created_at: string
          evidence_type: Database["public"]["Enums"]["evidence_type"]
          execution_id: string
          feedback: string | null
          file_url: string | null
          id: string
          item_id: string
          item_type: string
          milestone_id: string | null
          review_status: Database["public"]["Enums"]["evidence_review_status"]
          reviewed_at: string | null
          reviewer_id: string | null
          submitted_at: string
          teacher_id: string
          text_content: string | null
          title: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          evidence_type: Database["public"]["Enums"]["evidence_type"]
          execution_id: string
          feedback?: string | null
          file_url?: string | null
          id?: string
          item_id: string
          item_type: string
          milestone_id?: string | null
          review_status?: Database["public"]["Enums"]["evidence_review_status"]
          reviewed_at?: string | null
          reviewer_id?: string | null
          submitted_at?: string
          teacher_id: string
          text_content?: string | null
          title?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          evidence_type?: Database["public"]["Enums"]["evidence_type"]
          execution_id?: string
          feedback?: string | null
          file_url?: string | null
          id?: string
          item_id?: string
          item_type?: string
          milestone_id?: string | null
          review_status?: Database["public"]["Enums"]["evidence_review_status"]
          reviewed_at?: string | null
          reviewer_id?: string | null
          submitted_at?: string
          teacher_id?: string
          text_content?: string | null
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "training_evidence_execution_id_fkey"
            columns: ["execution_id"]
            isOneToOne: false
            referencedRelation: "training_executions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "training_evidence_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "training_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "training_evidence_teacher_id_fkey"
            columns: ["teacher_id"]
            isOneToOne: false
            referencedRelation: "teacher_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      training_executions: {
        Row: {
          activated_at: string | null
          assignment_id: string | null
          completed_at: string | null
          created_at: string
          enrollment_id: string | null
          execution_status: Database["public"]["Enums"]["training_execution_status"]
          id: string
          last_activity_at: string | null
          school_id: string | null
          started_at: string | null
          teacher_id: string
          training_item_id: string
          training_item_type: string
          updated_at: string
        }
        Insert: {
          activated_at?: string | null
          assignment_id?: string | null
          completed_at?: string | null
          created_at?: string
          enrollment_id?: string | null
          execution_status?: Database["public"]["Enums"]["training_execution_status"]
          id?: string
          last_activity_at?: string | null
          school_id?: string | null
          started_at?: string | null
          teacher_id: string
          training_item_id: string
          training_item_type: string
          updated_at?: string
        }
        Update: {
          activated_at?: string | null
          assignment_id?: string | null
          completed_at?: string | null
          created_at?: string
          enrollment_id?: string | null
          execution_status?: Database["public"]["Enums"]["training_execution_status"]
          id?: string
          last_activity_at?: string | null
          school_id?: string | null
          started_at?: string | null
          teacher_id?: string
          training_item_id?: string
          training_item_type?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "training_executions_assignment_id_fkey"
            columns: ["assignment_id"]
            isOneToOne: true
            referencedRelation: "training_assignments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "training_executions_enrollment_id_fkey"
            columns: ["enrollment_id"]
            isOneToOne: false
            referencedRelation: "training_enrollments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "training_executions_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "school_organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "training_executions_teacher_id_fkey"
            columns: ["teacher_id"]
            isOneToOne: false
            referencedRelation: "teacher_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "training_executions_training_item_id_fkey"
            columns: ["training_item_id"]
            isOneToOne: false
            referencedRelation: "training_items"
            referencedColumns: ["id"]
          },
        ]
      }
      training_item_prerequisites: {
        Row: {
          created_at: string
          id: string
          is_required: boolean
          prerequisite_item_id: string
          training_item_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_required?: boolean
          prerequisite_item_id: string
          training_item_id: string
        }
        Update: {
          created_at?: string
          id?: string
          is_required?: boolean
          prerequisite_item_id?: string
          training_item_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "training_item_prerequisites_prerequisite_item_id_fkey"
            columns: ["prerequisite_item_id"]
            isOneToOne: false
            referencedRelation: "training_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "training_item_prerequisites_training_item_id_fkey"
            columns: ["training_item_id"]
            isOneToOne: false
            referencedRelation: "training_items"
            referencedColumns: ["id"]
          },
        ]
      }
      training_items: {
        Row: {
          approved_by_admin_at: string | null
          audience: string | null
          competency_domain_term_ids: string[] | null
          completion_policy: Json
          course_structure_json: Json | null
          created_at: string
          created_by: string
          credential_eligible: boolean
          credential_type_term_id: string | null
          cri_boost_value: number | null
          cri_target: number | null
          curriculum_term_ids: string[] | null
          description: string | null
          duration: string | null
          duration_hours: number | null
          grade_band_term_ids: string[] | null
          id: string
          is_active: boolean
          learning_format_term_id: string | null
          mentor_supported: boolean
          micro_assessment: boolean
          milestones_json: Json | null
          outcomes: string[] | null
          overview: string | null
          ownership_type: Database["public"]["Enums"]["catalog_ownership_type"]
          price_amount: number | null
          price_currency: string | null
          pricing_type: string | null
          provider_id: string | null
          published_by_provider_at: string | null
          reflection_prompts_json: Json | null
          required_course_ids: string[] | null
          review_notes: string | null
          review_status: Database["public"]["Enums"]["catalog_review_status"]
          reviewed_at: string | null
          reviewed_by: string | null
          short_description: string | null
          skill_term_ids: string[] | null
          slug: string
          status: string
          subject_term_ids: string[] | null
          syllabus: string[] | null
          target_segment_term_ids: string[] | null
          thumbnail_url: string | null
          title: string
          training_level_term_id: string | null
          type: string
          updated_at: string
        }
        Insert: {
          approved_by_admin_at?: string | null
          audience?: string | null
          competency_domain_term_ids?: string[] | null
          completion_policy?: Json
          course_structure_json?: Json | null
          created_at?: string
          created_by: string
          credential_eligible?: boolean
          credential_type_term_id?: string | null
          cri_boost_value?: number | null
          cri_target?: number | null
          curriculum_term_ids?: string[] | null
          description?: string | null
          duration?: string | null
          duration_hours?: number | null
          grade_band_term_ids?: string[] | null
          id?: string
          is_active?: boolean
          learning_format_term_id?: string | null
          mentor_supported?: boolean
          micro_assessment?: boolean
          milestones_json?: Json | null
          outcomes?: string[] | null
          overview?: string | null
          ownership_type?: Database["public"]["Enums"]["catalog_ownership_type"]
          price_amount?: number | null
          price_currency?: string | null
          pricing_type?: string | null
          provider_id?: string | null
          published_by_provider_at?: string | null
          reflection_prompts_json?: Json | null
          required_course_ids?: string[] | null
          review_notes?: string | null
          review_status?: Database["public"]["Enums"]["catalog_review_status"]
          reviewed_at?: string | null
          reviewed_by?: string | null
          short_description?: string | null
          skill_term_ids?: string[] | null
          slug: string
          status?: string
          subject_term_ids?: string[] | null
          syllabus?: string[] | null
          target_segment_term_ids?: string[] | null
          thumbnail_url?: string | null
          title: string
          training_level_term_id?: string | null
          type?: string
          updated_at?: string
        }
        Update: {
          approved_by_admin_at?: string | null
          audience?: string | null
          competency_domain_term_ids?: string[] | null
          completion_policy?: Json
          course_structure_json?: Json | null
          created_at?: string
          created_by?: string
          credential_eligible?: boolean
          credential_type_term_id?: string | null
          cri_boost_value?: number | null
          cri_target?: number | null
          curriculum_term_ids?: string[] | null
          description?: string | null
          duration?: string | null
          duration_hours?: number | null
          grade_band_term_ids?: string[] | null
          id?: string
          is_active?: boolean
          learning_format_term_id?: string | null
          mentor_supported?: boolean
          micro_assessment?: boolean
          milestones_json?: Json | null
          outcomes?: string[] | null
          overview?: string | null
          ownership_type?: Database["public"]["Enums"]["catalog_ownership_type"]
          price_amount?: number | null
          price_currency?: string | null
          pricing_type?: string | null
          provider_id?: string | null
          published_by_provider_at?: string | null
          reflection_prompts_json?: Json | null
          required_course_ids?: string[] | null
          review_notes?: string | null
          review_status?: Database["public"]["Enums"]["catalog_review_status"]
          reviewed_at?: string | null
          reviewed_by?: string | null
          short_description?: string | null
          skill_term_ids?: string[] | null
          slug?: string
          status?: string
          subject_term_ids?: string[] | null
          syllabus?: string[] | null
          target_segment_term_ids?: string[] | null
          thumbnail_url?: string | null
          title?: string
          training_level_term_id?: string | null
          type?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "training_items_credential_type_term_id_fkey"
            columns: ["credential_type_term_id"]
            isOneToOne: false
            referencedRelation: "taxonomy_terms"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "training_items_credential_type_term_id_fkey"
            columns: ["credential_type_term_id"]
            isOneToOne: false
            referencedRelation: "taxonomy_terms_active"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "training_items_learning_format_term_id_fkey"
            columns: ["learning_format_term_id"]
            isOneToOne: false
            referencedRelation: "taxonomy_terms"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "training_items_learning_format_term_id_fkey"
            columns: ["learning_format_term_id"]
            isOneToOne: false
            referencedRelation: "taxonomy_terms_active"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "training_items_provider_id_fkey"
            columns: ["provider_id"]
            isOneToOne: false
            referencedRelation: "providers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "training_items_training_level_term_id_fkey"
            columns: ["training_level_term_id"]
            isOneToOne: false
            referencedRelation: "taxonomy_terms"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "training_items_training_level_term_id_fkey"
            columns: ["training_level_term_id"]
            isOneToOne: false
            referencedRelation: "taxonomy_terms_active"
            referencedColumns: ["id"]
          },
        ]
      }
      training_package_items: {
        Row: {
          created_at: string
          id: string
          item_id: string
          package_id: string
          sort_order: number
        }
        Insert: {
          created_at?: string
          id?: string
          item_id: string
          package_id: string
          sort_order?: number
        }
        Update: {
          created_at?: string
          id?: string
          item_id?: string
          package_id?: string
          sort_order?: number
        }
        Relationships: [
          {
            foreignKeyName: "training_package_items_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "training_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "training_package_items_package_id_fkey"
            columns: ["package_id"]
            isOneToOne: false
            referencedRelation: "training_items"
            referencedColumns: ["id"]
          },
        ]
      }
      training_pathway_stages: {
        Row: {
          created_at: string
          id: string
          pathway_id: string
          sort_order: number
          stage_item_id: string
          stage_label: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          pathway_id: string
          sort_order?: number
          stage_item_id: string
          stage_label?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          pathway_id?: string
          sort_order?: number
          stage_item_id?: string
          stage_label?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "training_pathway_stages_pathway_id_fkey"
            columns: ["pathway_id"]
            isOneToOne: false
            referencedRelation: "training_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "training_pathway_stages_stage_item_id_fkey"
            columns: ["stage_item_id"]
            isOneToOne: false
            referencedRelation: "training_items"
            referencedColumns: ["id"]
          },
        ]
      }
      transactions: {
        Row: {
          amount: number
          created_at: string
          currency: string
          failure_reason: string | null
          id: string
          metadata: Json | null
          order_id: string
          payment_provider: string | null
          provider_transaction_id: string | null
          status: Database["public"]["Enums"]["transaction_status"]
          updated_at: string
        }
        Insert: {
          amount: number
          created_at?: string
          currency?: string
          failure_reason?: string | null
          id?: string
          metadata?: Json | null
          order_id: string
          payment_provider?: string | null
          provider_transaction_id?: string | null
          status?: Database["public"]["Enums"]["transaction_status"]
          updated_at?: string
        }
        Update: {
          amount?: number
          created_at?: string
          currency?: string
          failure_reason?: string | null
          id?: string
          metadata?: Json | null
          order_id?: string
          payment_provider?: string | null
          provider_transaction_id?: string | null
          status?: Database["public"]["Enums"]["transaction_status"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "transactions_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      workforce_gap_reports: {
        Row: {
          affected_department: string | null
          created_at: string
          description: string
          gap_type: string
          id: string
          metadata: Json
          recommended_intervention: string | null
          school_id: string
          severity: string
        }
        Insert: {
          affected_department?: string | null
          created_at?: string
          description: string
          gap_type: string
          id?: string
          metadata?: Json
          recommended_intervention?: string | null
          school_id: string
          severity?: string
        }
        Update: {
          affected_department?: string | null
          created_at?: string
          description?: string
          gap_type?: string
          id?: string
          metadata?: Json
          recommended_intervention?: string | null
          school_id?: string
          severity?: string
        }
        Relationships: [
          {
            foreignKeyName: "workforce_gap_reports_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "school_organizations"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      school_training_progress_view: {
        Row: {
          assigned_count: number | null
          cancelled_count: number | null
          certified_count: number | null
          completed_count: number | null
          item_id: string | null
          item_title: string | null
          item_type: string | null
          school_id: string | null
          started_count: number | null
        }
        Relationships: [
          {
            foreignKeyName: "training_assignments_assigned_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "training_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "training_assignments_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "school_organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      taxonomy_terms_active: {
        Row: {
          code: string | null
          created_at: string | null
          id: string | null
          is_active: boolean | null
          meta: Json | null
          name: string | null
          name_ar: string | null
          name_en: string | null
          parent_id: string | null
          slug: string | null
          sort_order: number | null
          term_type_id: string | null
        }
        Insert: {
          code?: string | null
          created_at?: string | null
          id?: string | null
          is_active?: boolean | null
          meta?: Json | null
          name?: string | null
          name_ar?: string | null
          name_en?: string | null
          parent_id?: string | null
          slug?: string | null
          sort_order?: number | null
          term_type_id?: string | null
        }
        Update: {
          code?: string | null
          created_at?: string | null
          id?: string | null
          is_active?: boolean | null
          meta?: Json | null
          name?: string | null
          name_ar?: string | null
          name_en?: string | null
          parent_id?: string | null
          slug?: string | null
          sort_order?: number | null
          term_type_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "taxonomy_terms_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "taxonomy_terms"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "taxonomy_terms_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "taxonomy_terms_active"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "taxonomy_terms_term_type_id_fkey"
            columns: ["term_type_id"]
            isOneToOne: false
            referencedRelation: "taxonomy_term_types"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Functions: {
      bootstrap_initial_role: { Args: { _role: string }; Returns: undefined }
      complete_mentor_session_with_outcome: {
        Args: {
          p_competency_term_ids?: string[]
          p_mentor_summary: string
          p_mentor_user_id: string
          p_recommended_next_step?: string
          p_session_id: string
          p_session_outcome: string
        }
        Returns: Json
      }
      get_user_provider_ids: { Args: { _user_id: string }; Returns: string[] }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_provider_member: {
        Args: { _provider_id: string; _user_id: string }
        Returns: boolean
      }
      is_school_admin_of: {
        Args: { _school_id: string; _user_id: string }
        Returns: boolean
      }
      is_school_member: {
        Args: { _school_id: string; _user_id: string }
        Returns: boolean
      }
      is_training_item_publicly_visible: {
        Args: { item_id: string }
        Returns: boolean
      }
      review_mentorship_evidence: {
        Args: {
          p_decision: string
          p_evidence_id: string
          p_mentor_user_id: string
          p_review_notes?: string
        }
        Returns: Json
      }
      show_limit: { Args: never; Returns: number }
      show_trgm: { Args: { "": string }; Returns: string[] }
    }
    Enums: {
      app_role:
        | "teacher"
        | "school_admin"
        | "school_recruiter"
        | "school_academic_lead"
        | "admin"
        | "school_training_manager"
        | "provider"
      catalog_ownership_type: "platform" | "provider"
      catalog_review_status:
        | "draft"
        | "pending_review"
        | "approved"
        | "rejected"
        | "changes_requested"
      course_progress_status: "not_started" | "in_progress" | "completed"
      earnings_status: "pending" | "available" | "paid"
      evidence_review_status:
        | "submitted"
        | "under_review"
        | "approved"
        | "rejected"
        | "needs_revision"
      evidence_type:
        | "lesson_plan"
        | "classroom_video"
        | "teaching_artifact"
        | "reflection"
        | "assessment_submission"
        | "other"
      mentor_review_decision: "approved" | "rejected" | "needs_revision"
      mentor_status:
        | "pending"
        | "active"
        | "inactive"
        | "suspended"
        | "draft"
        | "pending_review"
        | "paused"
        | "rejected"
      order_item_type:
        | "training_course"
        | "training_package"
        | "training_pathway"
        | "mentor_session"
      order_status:
        | "pending"
        | "payment_pending"
        | "paid"
        | "cancelled"
        | "refunded"
      pathway_milestone_status: "locked" | "available" | "completed"
      payout_status: "pending" | "processing" | "completed" | "failed"
      provider_member_role:
        | "owner"
        | "admin"
        | "editor"
        | "finance"
        | "mentor_manager"
      provider_member_status: "invited" | "active" | "inactive"
      provider_status:
        | "draft"
        | "pending_review"
        | "active"
        | "rejected"
        | "suspended"
        | "inactive"
      provider_type:
        | "training_provider"
        | "certification_body"
        | "mentor_org"
        | "publisher_partner"
      provider_verification_status:
        | "unverified"
        | "verified"
        | "trusted_partner"
      recipient_type: "platform" | "mentor" | "provider"
      reputation_dimension:
        | "teaching_practice"
        | "instructional_leadership"
        | "subject_expertise"
        | "professional_development"
        | "mentor_recognition"
        | "credential_authority"
        | "professional_consistency"
        | "hiring_success"
      reputation_tier:
        | "emerging"
        | "practitioner"
        | "verified_practitioner"
        | "advanced_practitioner"
        | "expert"
        | "mentor_level"
      training_assignment_status:
        | "assigned"
        | "in_progress"
        | "completed"
        | "certified"
        | "cancelled"
      training_enrollment_source: "self" | "school" | "pathway"
      training_enrollment_status:
        | "enrolled"
        | "active"
        | "completed"
        | "cancelled"
        | "dropped"
      training_execution_status:
        | "assigned"
        | "active"
        | "completed"
        | "cancelled"
      transaction_status:
        | "initiated"
        | "authorized"
        | "completed"
        | "failed"
        | "refunded"
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
      app_role: [
        "teacher",
        "school_admin",
        "school_recruiter",
        "school_academic_lead",
        "admin",
        "school_training_manager",
        "provider",
      ],
      catalog_ownership_type: ["platform", "provider"],
      catalog_review_status: [
        "draft",
        "pending_review",
        "approved",
        "rejected",
        "changes_requested",
      ],
      course_progress_status: ["not_started", "in_progress", "completed"],
      earnings_status: ["pending", "available", "paid"],
      evidence_review_status: [
        "submitted",
        "under_review",
        "approved",
        "rejected",
        "needs_revision",
      ],
      evidence_type: [
        "lesson_plan",
        "classroom_video",
        "teaching_artifact",
        "reflection",
        "assessment_submission",
        "other",
      ],
      mentor_review_decision: ["approved", "rejected", "needs_revision"],
      mentor_status: [
        "pending",
        "active",
        "inactive",
        "suspended",
        "draft",
        "pending_review",
        "paused",
        "rejected",
      ],
      order_item_type: [
        "training_course",
        "training_package",
        "training_pathway",
        "mentor_session",
      ],
      order_status: [
        "pending",
        "payment_pending",
        "paid",
        "cancelled",
        "refunded",
      ],
      pathway_milestone_status: ["locked", "available", "completed"],
      payout_status: ["pending", "processing", "completed", "failed"],
      provider_member_role: [
        "owner",
        "admin",
        "editor",
        "finance",
        "mentor_manager",
      ],
      provider_member_status: ["invited", "active", "inactive"],
      provider_status: [
        "draft",
        "pending_review",
        "active",
        "rejected",
        "suspended",
        "inactive",
      ],
      provider_type: [
        "training_provider",
        "certification_body",
        "mentor_org",
        "publisher_partner",
      ],
      provider_verification_status: [
        "unverified",
        "verified",
        "trusted_partner",
      ],
      recipient_type: ["platform", "mentor", "provider"],
      reputation_dimension: [
        "teaching_practice",
        "instructional_leadership",
        "subject_expertise",
        "professional_development",
        "mentor_recognition",
        "credential_authority",
        "professional_consistency",
        "hiring_success",
      ],
      reputation_tier: [
        "emerging",
        "practitioner",
        "verified_practitioner",
        "advanced_practitioner",
        "expert",
        "mentor_level",
      ],
      training_assignment_status: [
        "assigned",
        "in_progress",
        "completed",
        "certified",
        "cancelled",
      ],
      training_enrollment_source: ["self", "school", "pathway"],
      training_enrollment_status: [
        "enrolled",
        "active",
        "completed",
        "cancelled",
        "dropped",
      ],
      training_execution_status: [
        "assigned",
        "active",
        "completed",
        "cancelled",
      ],
      transaction_status: [
        "initiated",
        "authorized",
        "completed",
        "failed",
        "refunded",
      ],
    },
  },
} as const
