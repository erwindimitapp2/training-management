export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type UserRole = 'trainer' | 'trainee'
export type ProgramLevel = 'kinder' | 'junior'
export type TermStatus =
  | 'in_self_training'
  | 'ready_for_check'
  | 'understanding_check'
  | 'need_review'
  | 'ready_for_trial'

export type ObservationResult = 'pass' | 'retry'

export interface Database {
  public: {
    Tables: {
      branches: {
        Row: {
          id: number
          name: string
        }
        Insert: {
          id?: number
          name: string
        }
        Update: {
          id?: number
          name?: string
        }
        Relationships: []
      }
      users: {
        Row: {
          id: string
          name: string
          username: string
          email: string
          role: UserRole
          branch_id: number | null
          level: ProgramLevel | null
          is_active: boolean
          created_at: string
        }
        Insert: {
          id: string
          name: string
          username: string
          email: string
          role: UserRole
          branch_id?: number | null
          level?: ProgramLevel | null
          is_active?: boolean
          created_at?: string
        }
        Update: {
          id?: string
          name?: string
          username?: string
          email?: string
          role?: UserRole
          branch_id?: number | null
          level?: ProgramLevel | null
          is_active?: boolean
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "users_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          }
        ]
      }
      terms: {
        Row: {
          id: number
          level: ProgramLevel
          name: string
          sort_order: number
        }
        Insert: {
          id?: number
          level: ProgramLevel
          name: string
          sort_order: number
        }
        Update: {
          id?: number
          level?: ProgramLevel
          name?: string
          sort_order?: number
        }
        Relationships: []
      }
      lessons: {
        Row: {
          id: number
          term_id: number
          lesson_number: number
          title: string | null
        }
        Insert: {
          id?: number
          term_id: number
          lesson_number: number
          title?: string | null
        }
        Update: {
          id?: number
          term_id?: number
          lesson_number?: number
          title?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "lessons_term_id_fkey"
            columns: ["term_id"]
            isOneToOne: false
            referencedRelation: "terms"
            referencedColumns: ["id"]
          }
        ]
      }
      trainee_lessons: {
        Row: {
          id: number
          trainee_id: string
          lesson_id: number
          studied: boolean
          studied_at: string | null
          evidence_url: string | null
        }
        Insert: {
          id?: number
          trainee_id: string
          lesson_id: number
          studied?: boolean
          studied_at?: string | null
          evidence_url?: string | null
        }
        Update: {
          id?: number
          trainee_id?: string
          lesson_id?: number
          studied?: boolean
          studied_at?: string | null
          evidence_url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "trainee_lessons_trainee_id_fkey"
            columns: ["trainee_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "trainee_lessons_lesson_id_fkey"
            columns: ["lesson_id"]
            isOneToOne: false
            referencedRelation: "lessons"
            referencedColumns: ["id"]
          }
        ]
      }
      trainee_terms: {
        Row: {
          id: number
          trainee_id: string
          term_id: number
          status: TermStatus
          cleared_to_teach: boolean
          completed_at: string | null
          updated_at: string
        }
        Insert: {
          id?: number
          trainee_id: string
          term_id: number
          status?: TermStatus
          cleared_to_teach?: boolean
          completed_at?: string | null
          updated_at?: string
        }
        Update: {
          id?: number
          trainee_id?: string
          term_id?: number
          status?: TermStatus
          cleared_to_teach?: boolean
          completed_at?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "trainee_terms_trainee_id_fkey"
            columns: ["trainee_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "trainee_terms_term_id_fkey"
            columns: ["term_id"]
            isOneToOne: false
            referencedRelation: "terms"
            referencedColumns: ["id"]
          }
        ]
      }
      status_history: {
        Row: {
          id: number
          trainee_term_id: number
          from_status: string | null
          to_status: string
          changed_by: string
          note: string | null
          changed_at: string
        }
        Insert: {
          id?: number
          trainee_term_id: number
          from_status?: string | null
          to_status: string
          changed_by: string
          note?: string | null
          changed_at?: string
        }
        Update: {
          id?: number
          trainee_term_id?: number
          from_status?: string | null
          to_status?: string
          changed_by?: string
          note?: string | null
          changed_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "status_history_trainee_term_id_fkey"
            columns: ["trainee_term_id"]
            isOneToOne: false
            referencedRelation: "trainee_terms"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "status_history_changed_by_fkey"
            columns: ["changed_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          }
        ]
      }
      observation_sessions: {
        Row: {
          id: number
          trainee_id: string
          trainer_id: string
          term_id: number
          session_date: string
          score_preparation: number
          score_delivery: number
          score_mastery: number
          score_visual: number
          score_engagement: number
          result: ObservationResult
          notes: string | null
        }
        Insert: {
          id?: number
          trainee_id: string
          trainer_id: string
          term_id: number
          session_date: string
          score_preparation: number
          score_delivery: number
          score_mastery: number
          score_visual: number
          score_engagement: number
          result: ObservationResult
          notes?: string | null
        }
        Update: {
          id?: number
          trainee_id?: string
          trainer_id?: string
          term_id?: number
          session_date?: string
          score_preparation?: number
          score_delivery?: number
          score_mastery?: number
          score_visual?: number
          score_engagement?: number
          result?: ObservationResult
          notes?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "observation_sessions_trainee_id_fkey"
            columns: ["trainee_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "observation_sessions_trainer_id_fkey"
            columns: ["trainer_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "observation_sessions_term_id_fkey"
            columns: ["term_id"]
            isOneToOne: false
            referencedRelation: "terms"
            referencedColumns: ["id"]
          }
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      auth_role: {
        Args: Record<PropertyKey, never>
        Returns: string
      }
      auth_branch: {
        Args: Record<PropertyKey, never>
        Returns: number
      }
      is_my_trainee: {
        Args: {
          p_trainee_id: string
        }
        Returns: boolean
      }
      assign_terms: {
        Args: {
          p_trainee_id: string
          p_term_ids: number[]
        }
        Returns: number
      }
      unassign_term: {
        Args: {
          p_trainee_term_id: number
        }
        Returns: void
      }
      change_term_status: {
        Args: {
          p_trainee_term_id: number
          p_action: string
          p_note?: string
        }
        Returns: void
      }
      record_observation: {
        Args: {
          p_trainee_id: string
          p_term_id: number
          p_session_date: string
          p_preparation: number
          p_delivery: number
          p_mastery: number
          p_visual: number
          p_engagement: number
          p_result: string
          p_notes?: string
        }
        Returns: void
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

export type Tables<T extends keyof Database['public']['Tables']> =
  Database['public']['Tables'][T]['Row']
export type Enums<T extends keyof Database['public']['Enums']> =
  Database['public']['Enums'][T]
