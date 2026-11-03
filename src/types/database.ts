export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type MemberRole = 'owner' | 'admin' | 'coach' | 'student'
export type MemberStatus = 'active' | 'invited' | 'pending' | 'suspended' | 'removed'
export type InvitationStatus = 'pending' | 'accepted' | 'expired' | 'revoked'
export type AccessRequestStatus = 'pending' | 'approved' | 'rejected' | 'cancelled'
export type StudentStatus = 'active' | 'archived' | 'pending'
export type TrainingLevel = 'beginner' | 'intermediate' | 'advanced'
export type AnamnesisStatus = 'draft' | 'submitted' | 'under_review' | 'reviewed'
export type ProgramStatus = 'draft' | 'published' | 'archived'
export type TrainingLogStatus = 'in_progress' | 'completed' | 'partial'
export type ChargeStatus = 'pending' | 'paid' | 'overdue' | 'cancelled'
export type PlanInterval = 'weekly' | 'monthly' | 'quarterly' | 'yearly' | 'custom'
export type MuscleGroup =
  | 'chest'
  | 'back'
  | 'shoulders'
  | 'biceps'
  | 'triceps'
  | 'quadriceps'
  | 'hamstrings'
  | 'glutes'
  | 'calves'
  | 'core'
  | 'cardio'
  | 'other'

export type PreferredTheme = 'light' | 'dark' | 'system'
export type StudentSex = 'female' | 'male' | 'other' | 'prefer_not'
export type DataRequestType = 'export' | 'deletion'

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string
          full_name: string | null
          phone: string | null
          avatar_path: string | null
          preferred_theme: PreferredTheme | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id: string
          full_name?: string | null
          phone?: string | null
          avatar_path?: string | null
          preferred_theme?: PreferredTheme | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          full_name?: string | null
          phone?: string | null
          avatar_path?: string | null
          preferred_theme?: PreferredTheme | null
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      organizations: {
        Row: {
          id: string
          name: string
          slug: string
          slogan: string | null
          logo_path: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          name: string
          slug: string
          slogan?: string | null
          logo_path?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          name?: string
          slug?: string
          slogan?: string | null
          logo_path?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      organization_members: {
        Row: {
          id: string
          organization_id: string
          user_id: string
          role: MemberRole
          status: MemberStatus
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          organization_id: string
          user_id: string
          role: MemberRole
          status?: MemberStatus
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          organization_id?: string
          user_id?: string
          role?: MemberRole
          status?: MemberStatus
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'organization_members_organization_id_fkey'
            columns: ['organization_id']
            isOneToOne: false
            referencedRelation: 'organizations'
            referencedColumns: ['id']
          },
        ]
      }
      student_invitations: {
        Row: {
          id: string
          organization_id: string
          email: string
          token: string
          invited_by: string | null
          status: InvitationStatus
          expires_at: string
          accepted_by: string | null
          accepted_at: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          organization_id: string
          email: string
          token?: string
          invited_by?: string | null
          status?: InvitationStatus
          expires_at?: string
          accepted_by?: string | null
          accepted_at?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          organization_id?: string
          email?: string
          token?: string
          invited_by?: string | null
          status?: InvitationStatus
          expires_at?: string
          accepted_by?: string | null
          accepted_at?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'student_invitations_organization_id_fkey'
            columns: ['organization_id']
            isOneToOne: false
            referencedRelation: 'organizations'
            referencedColumns: ['id']
          },
        ]
      }
      access_requests: {
        Row: {
          id: string
          organization_id: string
          user_id: string | null
          full_name: string
          email: string
          phone: string | null
          message: string | null
          status: AccessRequestStatus
          reviewed_by: string | null
          reviewed_at: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          organization_id: string
          user_id?: string | null
          full_name: string
          email: string
          phone?: string | null
          message?: string | null
          status?: AccessRequestStatus
          reviewed_by?: string | null
          reviewed_at?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          organization_id?: string
          user_id?: string | null
          full_name?: string
          email?: string
          phone?: string | null
          message?: string | null
          status?: AccessRequestStatus
          reviewed_by?: string | null
          reviewed_at?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'access_requests_organization_id_fkey'
            columns: ['organization_id']
            isOneToOne: false
            referencedRelation: 'organizations'
            referencedColumns: ['id']
          },
        ]
      }
      students: {
        Row: {
          id: string
          organization_id: string
          user_id: string | null
          login_username: string | null
          full_name: string
          email: string | null
          phone: string | null
          birth_date: string | null
          sex: StudentSex | null
          cpf: string | null
          address: string | null
          profession: string | null
          photo_path: string | null
          primary_goal: string | null
          secondary_goal: string | null
          level: TrainingLevel | null
          available_days: string[] | null
          weekly_frequency: number | null
          session_minutes: number | null
          training_location: string | null
          available_equipment: string[] | null
          status: StudentStatus
          notes: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          organization_id: string
          user_id?: string | null
          login_username?: string | null
          full_name: string
          email?: string | null
          phone?: string | null
          birth_date?: string | null
          sex?: StudentSex | null
          cpf?: string | null
          address?: string | null
          profession?: string | null
          photo_path?: string | null
          primary_goal?: string | null
          secondary_goal?: string | null
          level?: TrainingLevel | null
          available_days?: string[] | null
          weekly_frequency?: number | null
          session_minutes?: number | null
          training_location?: string | null
          available_equipment?: string[] | null
          status?: StudentStatus
          notes?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          organization_id?: string
          user_id?: string | null
          login_username?: string | null
          full_name?: string
          email?: string | null
          phone?: string | null
          birth_date?: string | null
          sex?: StudentSex | null
          cpf?: string | null
          address?: string | null
          profession?: string | null
          photo_path?: string | null
          primary_goal?: string | null
          secondary_goal?: string | null
          level?: TrainingLevel | null
          available_days?: string[] | null
          weekly_frequency?: number | null
          session_minutes?: number | null
          training_location?: string | null
          available_equipment?: string[] | null
          status?: StudentStatus
          notes?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'students_organization_id_fkey'
            columns: ['organization_id']
            isOneToOne: false
            referencedRelation: 'organizations'
            referencedColumns: ['id']
          },
        ]
      }
      consent_records: {
        Row: {
          id: string
          organization_id: string
          user_id: string
          student_id: string | null
          consent_type: string
          version: string
          accepted: boolean
          marketing_photos: boolean
          accepted_at: string
          metadata: Json
          created_at: string
        }
        Insert: {
          id?: string
          organization_id: string
          user_id: string
          student_id?: string | null
          consent_type: string
          version: string
          accepted?: boolean
          marketing_photos?: boolean
          accepted_at?: string
          metadata?: Json
          created_at?: string
        }
        Update: {
          id?: string
          organization_id?: string
          user_id?: string
          student_id?: string | null
          consent_type?: string
          version?: string
          accepted?: boolean
          marketing_photos?: boolean
          accepted_at?: string
          metadata?: Json
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'consent_records_organization_id_fkey'
            columns: ['organization_id']
            isOneToOne: false
            referencedRelation: 'organizations'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'consent_records_student_id_fkey'
            columns: ['student_id']
            isOneToOne: false
            referencedRelation: 'students'
            referencedColumns: ['id']
          },
        ]
      }
      anamnesis_records: {
        Row: {
          id: string
          organization_id: string
          student_id: string
          form_version: string
          status: AnamnesisStatus
          health_history: Json
          habits: Json
          sports_history: Json
          truthfulness_declared: boolean
          declared_at: string | null
          declared_by: string | null
          reviewed_by: string | null
          reviewed_at: string | null
          review_notes: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          organization_id: string
          student_id: string
          form_version?: string
          status?: AnamnesisStatus
          health_history?: Json
          habits?: Json
          sports_history?: Json
          truthfulness_declared?: boolean
          declared_at?: string | null
          declared_by?: string | null
          reviewed_by?: string | null
          reviewed_at?: string | null
          review_notes?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          organization_id?: string
          student_id?: string
          form_version?: string
          status?: AnamnesisStatus
          health_history?: Json
          habits?: Json
          sports_history?: Json
          truthfulness_declared?: boolean
          declared_at?: string | null
          declared_by?: string | null
          reviewed_by?: string | null
          reviewed_at?: string | null
          review_notes?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'anamnesis_records_organization_id_fkey'
            columns: ['organization_id']
            isOneToOne: false
            referencedRelation: 'organizations'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'anamnesis_records_student_id_fkey'
            columns: ['student_id']
            isOneToOne: false
            referencedRelation: 'students'
            referencedColumns: ['id']
          },
        ]
      }
      physical_assessments: {
        Row: {
          id: string
          organization_id: string
          student_id: string
          assessed_at: string
          assessed_by: string | null
          weight_kg: number | null
          height_cm: number | null
          body_fat_percent: number | null
          body_fat_method: string | null
          body_fat_source: string | null
          fat_mass_kg: number | null
          fat_free_mass_kg: number | null
          muscle_mass_kg: number | null
          muscle_mass_method: string | null
          perimetry: Json
          skinfolds_mm: Json
          protocol_code: string | null
          protocol_result: number | null
          protocol_notes: string | null
          notes: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          organization_id: string
          student_id: string
          assessed_at?: string
          assessed_by?: string | null
          weight_kg?: number | null
          height_cm?: number | null
          body_fat_percent?: number | null
          body_fat_method?: string | null
          body_fat_source?: string | null
          fat_mass_kg?: number | null
          fat_free_mass_kg?: number | null
          muscle_mass_kg?: number | null
          muscle_mass_method?: string | null
          perimetry?: Json
          skinfolds_mm?: Json
          protocol_code?: string | null
          protocol_result?: number | null
          protocol_notes?: string | null
          notes?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          organization_id?: string
          student_id?: string
          assessed_at?: string
          assessed_by?: string | null
          weight_kg?: number | null
          height_cm?: number | null
          body_fat_percent?: number | null
          body_fat_method?: string | null
          body_fat_source?: string | null
          fat_mass_kg?: number | null
          fat_free_mass_kg?: number | null
          muscle_mass_kg?: number | null
          muscle_mass_method?: string | null
          perimetry?: Json
          skinfolds_mm?: Json
          protocol_code?: string | null
          protocol_result?: number | null
          protocol_notes?: string | null
          notes?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'physical_assessments_organization_id_fkey'
            columns: ['organization_id']
            isOneToOne: false
            referencedRelation: 'organizations'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'physical_assessments_student_id_fkey'
            columns: ['student_id']
            isOneToOne: false
            referencedRelation: 'students'
            referencedColumns: ['id']
          },
        ]
      }
      exercises: {
        Row: {
          id: string
          organization_id: string
          name: string
          muscle_group: MuscleGroup
          equipment: string | null
          level: TrainingLevel | null
          instructions: string | null
          common_mistakes: string | null
          notes: string | null
          video_url: string | null
          video_storage_path: string | null
          image_path: string | null
          is_active: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          organization_id: string
          name: string
          muscle_group?: MuscleGroup
          equipment?: string | null
          level?: TrainingLevel | null
          instructions?: string | null
          common_mistakes?: string | null
          notes?: string | null
          video_url?: string | null
          video_storage_path?: string | null
          image_path?: string | null
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          organization_id?: string
          name?: string
          muscle_group?: MuscleGroup
          equipment?: string | null
          level?: TrainingLevel | null
          instructions?: string | null
          common_mistakes?: string | null
          notes?: string | null
          video_url?: string | null
          video_storage_path?: string | null
          image_path?: string | null
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'exercises_organization_id_fkey'
            columns: ['organization_id']
            isOneToOne: false
            referencedRelation: 'organizations'
            referencedColumns: ['id']
          },
        ]
      }
      workout_programs: {
        Row: {
          id: string
          organization_id: string
          student_id: string
          title: string
          objective: string | null
          frequency_per_week: number | null
          valid_from: string | null
          valid_until: string | null
          status: ProgramStatus
          version: number
          parent_program_id: string | null
          is_template: boolean
          published_at: string | null
          created_by: string | null
          notes: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          organization_id: string
          student_id: string
          title: string
          objective?: string | null
          frequency_per_week?: number | null
          valid_from?: string | null
          valid_until?: string | null
          status?: ProgramStatus
          version?: number
          parent_program_id?: string | null
          is_template?: boolean
          published_at?: string | null
          created_by?: string | null
          notes?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          organization_id?: string
          student_id?: string
          title?: string
          objective?: string | null
          frequency_per_week?: number | null
          valid_from?: string | null
          valid_until?: string | null
          status?: ProgramStatus
          version?: number
          parent_program_id?: string | null
          is_template?: boolean
          published_at?: string | null
          created_by?: string | null
          notes?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'workout_programs_organization_id_fkey'
            columns: ['organization_id']
            isOneToOne: false
            referencedRelation: 'organizations'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'workout_programs_student_id_fkey'
            columns: ['student_id']
            isOneToOne: false
            referencedRelation: 'students'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'workout_programs_parent_program_id_fkey'
            columns: ['parent_program_id']
            isOneToOne: false
            referencedRelation: 'workout_programs'
            referencedColumns: ['id']
          },
        ]
      }
      workout_sessions: {
        Row: {
          id: string
          organization_id: string
          program_id: string
          label: string
          sort_order: number
          estimated_minutes: number | null
          notes: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          organization_id: string
          program_id: string
          label: string
          sort_order?: number
          estimated_minutes?: number | null
          notes?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          organization_id?: string
          program_id?: string
          label?: string
          sort_order?: number
          estimated_minutes?: number | null
          notes?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'workout_sessions_organization_id_fkey'
            columns: ['organization_id']
            isOneToOne: false
            referencedRelation: 'organizations'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'workout_sessions_program_id_fkey'
            columns: ['program_id']
            isOneToOne: false
            referencedRelation: 'workout_programs'
            referencedColumns: ['id']
          },
        ]
      }
      workout_exercises: {
        Row: {
          id: string
          organization_id: string
          session_id: string
          exercise_id: string | null
          sort_order: number
          exercise_name: string
          exercise_instructions: string | null
          exercise_video_url: string | null
          exercise_image_path: string | null
          sets: number | null
          reps: string | null
          suggested_load: number | null
          load_unit: string | null
          rest_seconds: number | null
          duration_seconds: number | null
          distance_meters: number | null
          cadence: string | null
          rpe: number | null
          rir: number | null
          notes: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          organization_id: string
          session_id: string
          exercise_id?: string | null
          sort_order?: number
          exercise_name: string
          exercise_instructions?: string | null
          exercise_video_url?: string | null
          exercise_image_path?: string | null
          sets?: number | null
          reps?: string | null
          suggested_load?: number | null
          load_unit?: string | null
          rest_seconds?: number | null
          duration_seconds?: number | null
          distance_meters?: number | null
          cadence?: string | null
          rpe?: number | null
          rir?: number | null
          notes?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          organization_id?: string
          session_id?: string
          exercise_id?: string | null
          sort_order?: number
          exercise_name?: string
          exercise_instructions?: string | null
          exercise_video_url?: string | null
          exercise_image_path?: string | null
          sets?: number | null
          reps?: string | null
          suggested_load?: number | null
          load_unit?: string | null
          rest_seconds?: number | null
          duration_seconds?: number | null
          distance_meters?: number | null
          cadence?: string | null
          rpe?: number | null
          rir?: number | null
          notes?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'workout_exercises_organization_id_fkey'
            columns: ['organization_id']
            isOneToOne: false
            referencedRelation: 'organizations'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'workout_exercises_session_id_fkey'
            columns: ['session_id']
            isOneToOne: false
            referencedRelation: 'workout_sessions'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'workout_exercises_exercise_id_fkey'
            columns: ['exercise_id']
            isOneToOne: false
            referencedRelation: 'exercises'
            referencedColumns: ['id']
          },
        ]
      }
      training_logs: {
        Row: {
          id: string
          organization_id: string
          student_id: string
          program_id: string | null
          session_id: string | null
          client_request_id: string | null
          status: TrainingLogStatus
          started_at: string
          ended_at: string | null
          rest_ends_at: string | null
          prescription_snapshot: Json
          notes: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          organization_id: string
          student_id: string
          program_id?: string | null
          session_id?: string | null
          client_request_id?: string | null
          status?: TrainingLogStatus
          started_at?: string
          ended_at?: string | null
          rest_ends_at?: string | null
          prescription_snapshot?: Json
          notes?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          organization_id?: string
          student_id?: string
          program_id?: string | null
          session_id?: string | null
          client_request_id?: string | null
          status?: TrainingLogStatus
          started_at?: string
          ended_at?: string | null
          rest_ends_at?: string | null
          prescription_snapshot?: Json
          notes?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'training_logs_organization_id_fkey'
            columns: ['organization_id']
            isOneToOne: false
            referencedRelation: 'organizations'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'training_logs_student_id_fkey'
            columns: ['student_id']
            isOneToOne: false
            referencedRelation: 'students'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'training_logs_program_id_fkey'
            columns: ['program_id']
            isOneToOne: false
            referencedRelation: 'workout_programs'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'training_logs_session_id_fkey'
            columns: ['session_id']
            isOneToOne: false
            referencedRelation: 'workout_sessions'
            referencedColumns: ['id']
          },
        ]
      }
      training_set_logs: {
        Row: {
          id: string
          organization_id: string
          training_log_id: string
          workout_exercise_id: string | null
          exercise_name: string
          set_number: number
          client_request_id: string | null
          prescribed_reps: string | null
          prescribed_load: number | null
          prescribed_load_unit: string | null
          actual_reps: number | null
          actual_load: number | null
          load_unit: string | null
          rpe: number | null
          rir: number | null
          completed: boolean
          notes: string | null
          completed_at: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          organization_id: string
          training_log_id: string
          workout_exercise_id?: string | null
          exercise_name: string
          set_number: number
          client_request_id?: string | null
          prescribed_reps?: string | null
          prescribed_load?: number | null
          prescribed_load_unit?: string | null
          actual_reps?: number | null
          actual_load?: number | null
          load_unit?: string | null
          rpe?: number | null
          rir?: number | null
          completed?: boolean
          notes?: string | null
          completed_at?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          organization_id?: string
          training_log_id?: string
          workout_exercise_id?: string | null
          exercise_name?: string
          set_number?: number
          client_request_id?: string | null
          prescribed_reps?: string | null
          prescribed_load?: number | null
          prescribed_load_unit?: string | null
          actual_reps?: number | null
          actual_load?: number | null
          load_unit?: string | null
          rpe?: number | null
          rir?: number | null
          completed?: boolean
          notes?: string | null
          completed_at?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'training_set_logs_organization_id_fkey'
            columns: ['organization_id']
            isOneToOne: false
            referencedRelation: 'organizations'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'training_set_logs_training_log_id_fkey'
            columns: ['training_log_id']
            isOneToOne: false
            referencedRelation: 'training_logs'
            referencedColumns: ['id']
          },
        ]
      }
      billing_plans: {
        Row: {
          id: string
          organization_id: string
          name: string
          description: string | null
          amount_cents: number
          currency: string
          interval: PlanInterval
          is_active: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          organization_id: string
          name: string
          description?: string | null
          amount_cents: number
          currency?: string
          interval?: PlanInterval
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          organization_id?: string
          name?: string
          description?: string | null
          amount_cents?: number
          currency?: string
          interval?: PlanInterval
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'billing_plans_organization_id_fkey'
            columns: ['organization_id']
            isOneToOne: false
            referencedRelation: 'organizations'
            referencedColumns: ['id']
          },
        ]
      }
      student_plans: {
        Row: {
          id: string
          organization_id: string
          student_id: string
          plan_id: string | null
          plan_name: string
          amount_cents: number
          currency: string
          interval: PlanInterval
          starts_on: string
          ends_on: string | null
          is_active: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          organization_id: string
          student_id: string
          plan_id?: string | null
          plan_name: string
          amount_cents: number
          currency?: string
          interval?: PlanInterval
          starts_on?: string
          ends_on?: string | null
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          organization_id?: string
          student_id?: string
          plan_id?: string | null
          plan_name?: string
          amount_cents?: number
          currency?: string
          interval?: PlanInterval
          starts_on?: string
          ends_on?: string | null
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'student_plans_organization_id_fkey'
            columns: ['organization_id']
            isOneToOne: false
            referencedRelation: 'organizations'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'student_plans_student_id_fkey'
            columns: ['student_id']
            isOneToOne: false
            referencedRelation: 'students'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'student_plans_plan_id_fkey'
            columns: ['plan_id']
            isOneToOne: false
            referencedRelation: 'billing_plans'
            referencedColumns: ['id']
          },
        ]
      }
      charges: {
        Row: {
          id: string
          organization_id: string
          student_id: string
          student_plan_id: string | null
          description: string
          amount_cents: number
          currency: string
          due_date: string
          status: ChargeStatus
          paid_at: string | null
          cancelled_at: string | null
          external_provider: string | null
          external_id: string | null
          idempotency_key: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          organization_id: string
          student_id: string
          student_plan_id?: string | null
          description: string
          amount_cents: number
          currency?: string
          due_date: string
          status?: ChargeStatus
          paid_at?: string | null
          cancelled_at?: string | null
          external_provider?: string | null
          external_id?: string | null
          idempotency_key?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          organization_id?: string
          student_id?: string
          student_plan_id?: string | null
          description?: string
          amount_cents?: number
          currency?: string
          due_date?: string
          status?: ChargeStatus
          paid_at?: string | null
          cancelled_at?: string | null
          external_provider?: string | null
          external_id?: string | null
          idempotency_key?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'charges_organization_id_fkey'
            columns: ['organization_id']
            isOneToOne: false
            referencedRelation: 'organizations'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'charges_student_id_fkey'
            columns: ['student_id']
            isOneToOne: false
            referencedRelation: 'students'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'charges_student_plan_id_fkey'
            columns: ['student_plan_id']
            isOneToOne: false
            referencedRelation: 'student_plans'
            referencedColumns: ['id']
          },
        ]
      }
      payment_records: {
        Row: {
          id: string
          organization_id: string
          charge_id: string
          amount_cents: number
          currency: string
          paid_at: string
          method: string
          notes: string | null
          recorded_by: string | null
          external_provider: string | null
          external_id: string | null
          idempotency_key: string | null
          created_at: string
        }
        Insert: {
          id?: string
          organization_id: string
          charge_id: string
          amount_cents: number
          currency?: string
          paid_at?: string
          method?: string
          notes?: string | null
          recorded_by?: string | null
          external_provider?: string | null
          external_id?: string | null
          idempotency_key?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          organization_id?: string
          charge_id?: string
          amount_cents?: number
          currency?: string
          paid_at?: string
          method?: string
          notes?: string | null
          recorded_by?: string | null
          external_provider?: string | null
          external_id?: string | null
          idempotency_key?: string | null
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'payment_records_organization_id_fkey'
            columns: ['organization_id']
            isOneToOne: false
            referencedRelation: 'organizations'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'payment_records_charge_id_fkey'
            columns: ['charge_id']
            isOneToOne: false
            referencedRelation: 'charges'
            referencedColumns: ['id']
          },
        ]
      }
      audit_events: {
        Row: {
          id: string
          organization_id: string | null
          actor_id: string | null
          action: string
          entity_type: string | null
          entity_id: string | null
          metadata: Json
          created_at: string
        }
        Insert: {
          id?: string
          organization_id?: string | null
          actor_id?: string | null
          action: string
          entity_type?: string | null
          entity_id?: string | null
          metadata?: Json
          created_at?: string
        }
        Update: {
          id?: string
          organization_id?: string | null
          actor_id?: string | null
          action?: string
          entity_type?: string | null
          entity_id?: string | null
          metadata?: Json
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'audit_events_organization_id_fkey'
            columns: ['organization_id']
            isOneToOne: false
            referencedRelation: 'organizations'
            referencedColumns: ['id']
          },
        ]
      }
      data_requests: {
        Row: {
          id: string
          organization_id: string | null
          user_id: string
          request_type: DataRequestType
          status: string
          notes: string | null
          created_at: string
          processed_at: string | null
        }
        Insert: {
          id?: string
          organization_id?: string | null
          user_id: string
          request_type: DataRequestType
          status?: string
          notes?: string | null
          created_at?: string
          processed_at?: string | null
        }
        Update: {
          id?: string
          organization_id?: string | null
          user_id?: string
          request_type?: DataRequestType
          status?: string
          notes?: string | null
          created_at?: string
          processed_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: 'data_requests_organization_id_fkey'
            columns: ['organization_id']
            isOneToOne: false
            referencedRelation: 'organizations'
            referencedColumns: ['id']
          },
        ]
      }
    }
    Views: {
      public_organizations: {
        Row: {
          id: string
          name: string
          slug: string
          slogan: string | null
        }
        Relationships: []
      }
    }
    Functions: {
      is_org_member: { Args: { p_org_id: string }; Returns: boolean }
      is_org_staff: { Args: { p_org_id: string }; Returns: boolean }
      current_student_id: { Args: { p_org_id?: string }; Returns: string }
      accept_student_invitation: { Args: { p_token: string; p_full_name: string }; Returns: string }
      approve_access_request: { Args: { p_request_id: string }; Returns: string }
      create_student_login: {
        Args: { p_student_id: string; p_username: string; p_password: string }
        Returns: string
      }
      reset_student_password: { Args: { p_student_id: string; p_password: string }; Returns: undefined }
    }
    Enums: {
      member_role: MemberRole
      member_status: MemberStatus
      invitation_status: InvitationStatus
      access_request_status: AccessRequestStatus
      student_status: StudentStatus
      training_level: TrainingLevel
      anamnesis_status: AnamnesisStatus
      program_status: ProgramStatus
      training_log_status: TrainingLogStatus
      charge_status: ChargeStatus
      plan_interval: PlanInterval
      muscle_group: MuscleGroup
    }
    CompositeTypes: Record<string, never>
  }
}

export type Tables<T extends keyof Database['public']['Tables']> =
  Database['public']['Tables'][T]['Row']
export type TablesInsert<T extends keyof Database['public']['Tables']> =
  Database['public']['Tables'][T]['Insert']
export type TablesUpdate<T extends keyof Database['public']['Tables']> =
  Database['public']['Tables'][T]['Update']
