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
    PostgrestVersion: "14.17"
  }
  public: {
    Tables: {
      academic_calendar_activities: {
        Row: {
          calendar_id: string
          created_at: string
          created_by: string | null
          event_date: string
          id: string
          note: string | null
          title: string
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          calendar_id: string
          created_at?: string
          created_by?: string | null
          event_date: string
          id?: string
          note?: string | null
          title: string
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          calendar_id?: string
          created_at?: string
          created_by?: string | null
          event_date?: string
          id?: string
          note?: string | null
          title?: string
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "academic_calendar_activities_calendar_id_fkey"
            columns: ["calendar_id"]
            isOneToOne: false
            referencedRelation: "academic_calendars"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "academic_calendar_activities_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "academic_calendar_activities_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      academic_calendar_day_overrides: {
        Row: {
          calendar_id: string
          category: string
          created_at: string
          created_by: string | null
          event_date: string
          id: string
          make_up_for: string | null
          note: string | null
          override_type: string
          title: string
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          calendar_id: string
          category: string
          created_at?: string
          created_by?: string | null
          event_date: string
          id?: string
          make_up_for?: string | null
          note?: string | null
          override_type: string
          title: string
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          calendar_id?: string
          category?: string
          created_at?: string
          created_by?: string | null
          event_date?: string
          id?: string
          make_up_for?: string | null
          note?: string | null
          override_type?: string
          title?: string
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "academic_calendar_day_overrides_calendar_id_fkey"
            columns: ["calendar_id"]
            isOneToOne: false
            referencedRelation: "academic_calendars"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "academic_calendar_day_overrides_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "academic_calendar_day_overrides_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      academic_calendar_settings: {
        Row: {
          editor_user_id: string | null
          id: number
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          editor_user_id?: string | null
          id?: number
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          editor_user_id?: string | null
          id?: number
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "academic_calendar_settings_editor_user_id_fkey"
            columns: ["editor_user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "academic_calendar_settings_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      academic_calendars: {
        Row: {
          academic_year: string
          created_at: string
          created_by: string | null
          display_months: string[]
          id: string
          published_at: string | null
          published_by: string | null
          semester: number
          start_date: string
          status: string
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          academic_year: string
          created_at?: string
          created_by?: string | null
          display_months?: string[]
          id?: string
          published_at?: string | null
          published_by?: string | null
          semester: number
          start_date: string
          status?: string
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          academic_year?: string
          created_at?: string
          created_by?: string | null
          display_months?: string[]
          id?: string
          published_at?: string | null
          published_by?: string | null
          semester?: number
          start_date?: string
          status?: string
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "academic_calendars_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "academic_calendars_published_by_fkey"
            columns: ["published_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "academic_calendars_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      academic_certificate_request_counters: {
        Row: {
          academic_year: string
          last_no: number
          updated_at: string
        }
        Insert: {
          academic_year: string
          last_no?: number
          updated_at?: string
        }
        Update: {
          academic_year?: string
          last_no?: number
          updated_at?: string
        }
        Relationships: []
      }
      academic_certificate_request_signatures: {
        Row: {
          approval_version: number
          automatic: boolean
          bucket: string | null
          created_at: string
          created_by: string
          id: string
          master_signature_id: string | null
          method: string
          request_id: string
          signer_name: string | null
          signer_position: string | null
          signer_slot: string
          signer_user_id: string | null
          storage_path: string | null
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          approval_version?: number
          automatic?: boolean
          bucket?: string | null
          created_at?: string
          created_by: string
          id?: string
          master_signature_id?: string | null
          method: string
          request_id: string
          signer_name?: string | null
          signer_position?: string | null
          signer_slot: string
          signer_user_id?: string | null
          storage_path?: string | null
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          approval_version?: number
          automatic?: boolean
          bucket?: string | null
          created_at?: string
          created_by?: string
          id?: string
          master_signature_id?: string | null
          method?: string
          request_id?: string
          signer_name?: string | null
          signer_position?: string | null
          signer_slot?: string
          signer_user_id?: string | null
          storage_path?: string | null
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "academic_certificate_request_signature_master_signature_id_fkey"
            columns: ["master_signature_id"]
            isOneToOne: false
            referencedRelation: "signatures"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "academic_certificate_request_signatures_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "academic_certificate_request_signatures_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "academic_certificate_requests"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "academic_certificate_request_signatures_signer_user_id_fkey"
            columns: ["signer_user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "academic_certificate_request_signatures_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      academic_certificate_requests: {
        Row: {
          academic_year: string
          applicant_name: string
          birth_date: string | null
          certificate_type: string
          citizen_id: string | null
          class_id: string | null
          class_label: string | null
          contact_phone: string | null
          created_at: string
          created_by: string
          director_decision: string
          director_reason: string | null
          evidence_birth_certificate: boolean
          evidence_house_registration: boolean
          evidence_other: boolean
          evidence_other_note: string | null
          evidence_parent_id: boolean
          evidence_phone: boolean
          evidence_photo: boolean
          father_name: string | null
          finalized_at: string | null
          finalized_by: string | null
          former_academic_year: string | null
          former_class_label: string | null
          former_gpa: number | null
          id: string
          mother_name: string | null
          official_document_assigned_at: string | null
          official_document_assigned_by: string | null
          official_document_number: string | null
          official_document_serial: number | null
          official_document_year: string | null
          preparer_decision: string
          preparer_reason: string | null
          purpose_other: string | null
          purpose_type: string
          registrar_decision: string
          registrar_reason: string | null
          request_code: string | null
          request_date: string
          semester: number
          status: string
          student_address: string | null
          student_code: string | null
          student_id: string
          student_name: string
          student_number: number | null
          submitted_at: string | null
          submitted_by: string | null
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          academic_year: string
          applicant_name: string
          birth_date?: string | null
          certificate_type?: string
          citizen_id?: string | null
          class_id?: string | null
          class_label?: string | null
          contact_phone?: string | null
          created_at?: string
          created_by: string
          director_decision?: string
          director_reason?: string | null
          evidence_birth_certificate?: boolean
          evidence_house_registration?: boolean
          evidence_other?: boolean
          evidence_other_note?: string | null
          evidence_parent_id?: boolean
          evidence_phone?: boolean
          evidence_photo?: boolean
          father_name?: string | null
          finalized_at?: string | null
          finalized_by?: string | null
          former_academic_year?: string | null
          former_class_label?: string | null
          former_gpa?: number | null
          id?: string
          mother_name?: string | null
          official_document_assigned_at?: string | null
          official_document_assigned_by?: string | null
          official_document_number?: string | null
          official_document_serial?: number | null
          official_document_year?: string | null
          preparer_decision?: string
          preparer_reason?: string | null
          purpose_other?: string | null
          purpose_type: string
          registrar_decision?: string
          registrar_reason?: string | null
          request_code?: string | null
          request_date: string
          semester: number
          status?: string
          student_address?: string | null
          student_code?: string | null
          student_id: string
          student_name: string
          student_number?: number | null
          submitted_at?: string | null
          submitted_by?: string | null
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          academic_year?: string
          applicant_name?: string
          birth_date?: string | null
          certificate_type?: string
          citizen_id?: string | null
          class_id?: string | null
          class_label?: string | null
          contact_phone?: string | null
          created_at?: string
          created_by?: string
          director_decision?: string
          director_reason?: string | null
          evidence_birth_certificate?: boolean
          evidence_house_registration?: boolean
          evidence_other?: boolean
          evidence_other_note?: string | null
          evidence_parent_id?: boolean
          evidence_phone?: boolean
          evidence_photo?: boolean
          father_name?: string | null
          finalized_at?: string | null
          finalized_by?: string | null
          former_academic_year?: string | null
          former_class_label?: string | null
          former_gpa?: number | null
          id?: string
          mother_name?: string | null
          official_document_assigned_at?: string | null
          official_document_assigned_by?: string | null
          official_document_number?: string | null
          official_document_serial?: number | null
          official_document_year?: string | null
          preparer_decision?: string
          preparer_reason?: string | null
          purpose_other?: string | null
          purpose_type?: string
          registrar_decision?: string
          registrar_reason?: string | null
          request_code?: string | null
          request_date?: string
          semester?: number
          status?: string
          student_address?: string | null
          student_code?: string | null
          student_id?: string
          student_name?: string
          student_number?: number | null
          submitted_at?: string | null
          submitted_by?: string | null
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "academic_certificate_requests_class_id_fkey"
            columns: ["class_id"]
            isOneToOne: false
            referencedRelation: "school_classes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "academic_certificate_requests_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "academic_certificate_requests_finalized_by_fkey"
            columns: ["finalized_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "academic_certificate_requests_official_document_assigned_b_fkey"
            columns: ["official_document_assigned_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "academic_certificate_requests_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "academic_certificate_requests_submitted_by_fkey"
            columns: ["submitted_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "academic_certificate_requests_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      academic_certificate_settings: {
        Row: {
          certificate_valid_days: number
          director_user_id: string | null
          document_number_next: number
          document_number_year: string
          id: number
          preparer_user_id: string | null
          registrar_user_id: string | null
          request_number_next: number
          request_number_year: string
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          certificate_valid_days?: number
          director_user_id?: string | null
          document_number_next?: number
          document_number_year?: string
          id?: number
          preparer_user_id?: string | null
          registrar_user_id?: string | null
          request_number_next?: number
          request_number_year?: string
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          certificate_valid_days?: number
          director_user_id?: string | null
          document_number_next?: number
          document_number_year?: string
          id?: number
          preparer_user_id?: string | null
          registrar_user_id?: string | null
          request_number_next?: number
          request_number_year?: string
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "academic_certificate_settings_director_user_id_fkey"
            columns: ["director_user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "academic_certificate_settings_preparer_user_id_fkey"
            columns: ["preparer_user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "academic_certificate_settings_registrar_user_id_fkey"
            columns: ["registrar_user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "academic_certificate_settings_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      academic_class_subject_offerings: {
        Row: {
          class_id: string
          created_at: string
          created_by: string | null
          is_active: boolean
          subject_id: string
          subject_name_override: string | null
          updated_at: string
        }
        Insert: {
          class_id: string
          created_at?: string
          created_by?: string | null
          is_active?: boolean
          subject_id: string
          subject_name_override?: string | null
          updated_at?: string
        }
        Update: {
          class_id?: string
          created_at?: string
          created_by?: string | null
          is_active?: boolean
          subject_id?: string
          subject_name_override?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "academic_class_subject_offerings_class_id_fkey"
            columns: ["class_id"]
            isOneToOne: false
            referencedRelation: "school_classes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "academic_class_subject_offerings_subject_id_fkey"
            columns: ["subject_id"]
            isOneToOne: false
            referencedRelation: "academic_subjects"
            referencedColumns: ["id"]
          },
        ]
      }
      academic_classroom_research_reports: {
        Row: {
          abstract_text: string | null
          academic_head_comment: string | null
          academic_head_decision: string
          academic_head_id: string | null
          academic_head_name: string | null
          academic_head_position: string | null
          academic_head_reviewed_at: string | null
          academic_year: string
          approval_version: number
          approved_at: string | null
          assignment_id: string
          class_id: string
          class_label: string
          created_at: string
          director_approval_automatic: boolean
          director_comment: string | null
          director_decision: string
          director_name: string | null
          director_position: string | null
          director_reviewed_at: string | null
          director_reviewer_id: string | null
          id: string
          keywords_text: string | null
          one_page_data: Json
          research_bucket: string | null
          research_end_date: string | null
          research_mime_type: string | null
          research_original_name: string | null
          research_size_bytes: number | null
          research_start_date: string | null
          research_storage_path: string | null
          research_type: string
          research_type_other: string | null
          revision_stage: string | null
          semester: number
          status: string
          subject_code: string | null
          subject_group_comment: string | null
          subject_group_decision: string
          subject_group_head_id: string | null
          subject_group_head_name: string | null
          subject_group_head_position: string | null
          subject_group_id: string | null
          subject_group_name: string | null
          subject_group_reviewed_at: string | null
          subject_id: string
          subject_name: string
          submission_mode: string
          submitted_at: string | null
          teacher_id: string
          teacher_name: string
          teacher_position: string | null
          title: string
          updated_at: string
        }
        Insert: {
          abstract_text?: string | null
          academic_head_comment?: string | null
          academic_head_decision?: string
          academic_head_id?: string | null
          academic_head_name?: string | null
          academic_head_position?: string | null
          academic_head_reviewed_at?: string | null
          academic_year: string
          approval_version?: number
          approved_at?: string | null
          assignment_id: string
          class_id: string
          class_label: string
          created_at?: string
          director_approval_automatic?: boolean
          director_comment?: string | null
          director_decision?: string
          director_name?: string | null
          director_position?: string | null
          director_reviewed_at?: string | null
          director_reviewer_id?: string | null
          id?: string
          keywords_text?: string | null
          one_page_data?: Json
          research_bucket?: string | null
          research_end_date?: string | null
          research_mime_type?: string | null
          research_original_name?: string | null
          research_size_bytes?: number | null
          research_start_date?: string | null
          research_storage_path?: string | null
          research_type?: string
          research_type_other?: string | null
          revision_stage?: string | null
          semester: number
          status?: string
          subject_code?: string | null
          subject_group_comment?: string | null
          subject_group_decision?: string
          subject_group_head_id?: string | null
          subject_group_head_name?: string | null
          subject_group_head_position?: string | null
          subject_group_id?: string | null
          subject_group_name?: string | null
          subject_group_reviewed_at?: string | null
          subject_id: string
          subject_name: string
          submission_mode?: string
          submitted_at?: string | null
          teacher_id: string
          teacher_name: string
          teacher_position?: string | null
          title: string
          updated_at?: string
        }
        Update: {
          abstract_text?: string | null
          academic_head_comment?: string | null
          academic_head_decision?: string
          academic_head_id?: string | null
          academic_head_name?: string | null
          academic_head_position?: string | null
          academic_head_reviewed_at?: string | null
          academic_year?: string
          approval_version?: number
          approved_at?: string | null
          assignment_id?: string
          class_id?: string
          class_label?: string
          created_at?: string
          director_approval_automatic?: boolean
          director_comment?: string | null
          director_decision?: string
          director_name?: string | null
          director_position?: string | null
          director_reviewed_at?: string | null
          director_reviewer_id?: string | null
          id?: string
          keywords_text?: string | null
          one_page_data?: Json
          research_bucket?: string | null
          research_end_date?: string | null
          research_mime_type?: string | null
          research_original_name?: string | null
          research_size_bytes?: number | null
          research_start_date?: string | null
          research_storage_path?: string | null
          research_type?: string
          research_type_other?: string | null
          revision_stage?: string | null
          semester?: number
          status?: string
          subject_code?: string | null
          subject_group_comment?: string | null
          subject_group_decision?: string
          subject_group_head_id?: string | null
          subject_group_head_name?: string | null
          subject_group_head_position?: string | null
          subject_group_id?: string | null
          subject_group_name?: string | null
          subject_group_reviewed_at?: string | null
          subject_id?: string
          subject_name?: string
          submission_mode?: string
          submitted_at?: string | null
          teacher_id?: string
          teacher_name?: string
          teacher_position?: string | null
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "academic_classroom_research_reports_academic_head_id_fkey"
            columns: ["academic_head_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "academic_classroom_research_reports_assignment_id_fkey"
            columns: ["assignment_id"]
            isOneToOne: false
            referencedRelation: "teaching_assignments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "academic_classroom_research_reports_class_id_fkey"
            columns: ["class_id"]
            isOneToOne: false
            referencedRelation: "school_classes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "academic_classroom_research_reports_director_reviewer_id_fkey"
            columns: ["director_reviewer_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "academic_classroom_research_reports_subject_group_head_id_fkey"
            columns: ["subject_group_head_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "academic_classroom_research_reports_subject_group_id_fkey"
            columns: ["subject_group_id"]
            isOneToOne: false
            referencedRelation: "subject_groups"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "academic_classroom_research_reports_subject_id_fkey"
            columns: ["subject_id"]
            isOneToOne: false
            referencedRelation: "academic_subjects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "academic_classroom_research_reports_teacher_id_fkey"
            columns: ["teacher_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      academic_classroom_research_signatures: {
        Row: {
          approval_version: number
          automatic: boolean
          bucket: string | null
          created_at: string
          id: string
          master_signature_id: string | null
          method: string
          report_id: string
          signer_name: string
          signer_position: string | null
          signer_slot: string
          signer_user_id: string
          storage_path: string | null
          updated_at: string
        }
        Insert: {
          approval_version?: number
          automatic?: boolean
          bucket?: string | null
          created_at?: string
          id?: string
          master_signature_id?: string | null
          method: string
          report_id: string
          signer_name: string
          signer_position?: string | null
          signer_slot: string
          signer_user_id: string
          storage_path?: string | null
          updated_at?: string
        }
        Update: {
          approval_version?: number
          automatic?: boolean
          bucket?: string | null
          created_at?: string
          id?: string
          master_signature_id?: string | null
          method?: string
          report_id?: string
          signer_name?: string
          signer_position?: string | null
          signer_slot?: string
          signer_user_id?: string
          storage_path?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "academic_classroom_research_signatures_master_signature_id_fkey"
            columns: ["master_signature_id"]
            isOneToOne: false
            referencedRelation: "signatures"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "academic_classroom_research_signatures_report_id_fkey"
            columns: ["report_id"]
            isOneToOne: false
            referencedRelation: "academic_classroom_research_reports"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "academic_classroom_research_signatures_signer_user_id_fkey"
            columns: ["signer_user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      academic_classroom_research_versions: {
        Row: {
          document_version: number
          id: string
          report_id: string
          research_bucket: string | null
          research_mime_type: string | null
          research_original_name: string | null
          research_size_bytes: number | null
          research_storage_path: string | null
          snapshot: Json
          submitted_at: string
          submitted_by: string | null
          teacher_signature_snapshot: Json | null
        }
        Insert: {
          document_version: number
          id?: string
          report_id: string
          research_bucket?: string | null
          research_mime_type?: string | null
          research_original_name?: string | null
          research_size_bytes?: number | null
          research_storage_path?: string | null
          snapshot: Json
          submitted_at?: string
          submitted_by?: string | null
          teacher_signature_snapshot?: Json | null
        }
        Update: {
          document_version?: number
          id?: string
          report_id?: string
          research_bucket?: string | null
          research_mime_type?: string | null
          research_original_name?: string | null
          research_size_bytes?: number | null
          research_storage_path?: string | null
          snapshot?: Json
          submitted_at?: string
          submitted_by?: string | null
          teacher_signature_snapshot?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "academic_classroom_research_versions_report_id_fkey"
            columns: ["report_id"]
            isOneToOne: false
            referencedRelation: "academic_classroom_research_reports"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "academic_classroom_research_versions_submitted_by_fkey"
            columns: ["submitted_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      academic_club_activity_members: {
        Row: {
          attendance: Json
          attendance_percent: number
          attended_count: number
          class_id: string | null
          class_label: string | null
          created_at: string
          final_result: string
          first_name: string | null
          gender: string | null
          id: string
          last_name: string | null
          objective_pass: boolean
          prefix: string | null
          report_id: string
          student_code: string | null
          student_id: string
          student_name: string
          student_number: number | null
          updated_at: string
        }
        Insert: {
          attendance?: Json
          attendance_percent?: number
          attended_count?: number
          class_id?: string | null
          class_label?: string | null
          created_at?: string
          final_result?: string
          first_name?: string | null
          gender?: string | null
          id?: string
          last_name?: string | null
          objective_pass?: boolean
          prefix?: string | null
          report_id: string
          student_code?: string | null
          student_id: string
          student_name: string
          student_number?: number | null
          updated_at?: string
        }
        Update: {
          attendance?: Json
          attendance_percent?: number
          attended_count?: number
          class_id?: string | null
          class_label?: string | null
          created_at?: string
          final_result?: string
          first_name?: string | null
          gender?: string | null
          id?: string
          last_name?: string | null
          objective_pass?: boolean
          prefix?: string | null
          report_id?: string
          student_code?: string | null
          student_id?: string
          student_name?: string
          student_number?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "academic_club_activity_members_class_id_fkey"
            columns: ["class_id"]
            isOneToOne: false
            referencedRelation: "school_classes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "academic_club_activity_members_report_id_fkey"
            columns: ["report_id"]
            isOneToOne: false
            referencedRelation: "academic_club_activity_reports"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "academic_club_activity_members_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
        ]
      }
      academic_club_activity_reports: {
        Row: {
          academic_head_comment: string | null
          academic_head_decision: string
          academic_head_id: string | null
          academic_head_name: string | null
          academic_head_position: string | null
          academic_head_reviewed_at: string | null
          academic_year: string
          appendix_notes: string | null
          approval_version: number
          approved_at: string | null
          attendance_threshold: number
          budget_amount: number
          club_name: string
          co_adviser_id: string | null
          co_adviser_name: string | null
          co_adviser_position: string | null
          created_at: string
          director_approval_automatic: boolean
          director_comment: string | null
          director_decision: string
          director_name: string | null
          director_position: string | null
          director_reviewed_at: string | null
          director_reviewer_id: string | null
          id: string
          objectives: Json
          operation_summary: string | null
          photos: Json
          revision_stage: string | null
          semester: number
          session_count: number
          shared_teacher_ids: string[]
          shared_teacher_names: string[]
          source_file_bucket: string | null
          source_file_mime: string | null
          source_file_name: string | null
          source_file_path: string | null
          source_file_size: number | null
          source_file_uploaded_at: string | null
          status: string
          submission_mode: string
          submitted_at: string | null
          success_targets: Json
          teacher_id: string
          teacher_name: string
          teacher_position: string | null
          tracking_unit: string
          updated_at: string
          work_plan: Json
        }
        Insert: {
          academic_head_comment?: string | null
          academic_head_decision?: string
          academic_head_id?: string | null
          academic_head_name?: string | null
          academic_head_position?: string | null
          academic_head_reviewed_at?: string | null
          academic_year: string
          appendix_notes?: string | null
          approval_version?: number
          approved_at?: string | null
          attendance_threshold?: number
          budget_amount?: number
          club_name: string
          co_adviser_id?: string | null
          co_adviser_name?: string | null
          co_adviser_position?: string | null
          created_at?: string
          director_approval_automatic?: boolean
          director_comment?: string | null
          director_decision?: string
          director_name?: string | null
          director_position?: string | null
          director_reviewed_at?: string | null
          director_reviewer_id?: string | null
          id?: string
          objectives?: Json
          operation_summary?: string | null
          photos?: Json
          revision_stage?: string | null
          semester: number
          session_count?: number
          shared_teacher_ids?: string[]
          shared_teacher_names?: string[]
          source_file_bucket?: string | null
          source_file_mime?: string | null
          source_file_name?: string | null
          source_file_path?: string | null
          source_file_size?: number | null
          source_file_uploaded_at?: string | null
          status?: string
          submission_mode?: string
          submitted_at?: string | null
          success_targets?: Json
          teacher_id: string
          teacher_name: string
          teacher_position?: string | null
          tracking_unit?: string
          updated_at?: string
          work_plan?: Json
        }
        Update: {
          academic_head_comment?: string | null
          academic_head_decision?: string
          academic_head_id?: string | null
          academic_head_name?: string | null
          academic_head_position?: string | null
          academic_head_reviewed_at?: string | null
          academic_year?: string
          appendix_notes?: string | null
          approval_version?: number
          approved_at?: string | null
          attendance_threshold?: number
          budget_amount?: number
          club_name?: string
          co_adviser_id?: string | null
          co_adviser_name?: string | null
          co_adviser_position?: string | null
          created_at?: string
          director_approval_automatic?: boolean
          director_comment?: string | null
          director_decision?: string
          director_name?: string | null
          director_position?: string | null
          director_reviewed_at?: string | null
          director_reviewer_id?: string | null
          id?: string
          objectives?: Json
          operation_summary?: string | null
          photos?: Json
          revision_stage?: string | null
          semester?: number
          session_count?: number
          shared_teacher_ids?: string[]
          shared_teacher_names?: string[]
          source_file_bucket?: string | null
          source_file_mime?: string | null
          source_file_name?: string | null
          source_file_path?: string | null
          source_file_size?: number | null
          source_file_uploaded_at?: string | null
          status?: string
          submission_mode?: string
          submitted_at?: string | null
          success_targets?: Json
          teacher_id?: string
          teacher_name?: string
          teacher_position?: string | null
          tracking_unit?: string
          updated_at?: string
          work_plan?: Json
        }
        Relationships: [
          {
            foreignKeyName: "academic_club_activity_reports_academic_head_id_fkey"
            columns: ["academic_head_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "academic_club_activity_reports_co_adviser_id_fkey"
            columns: ["co_adviser_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "academic_club_activity_reports_director_reviewer_id_fkey"
            columns: ["director_reviewer_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "academic_club_activity_reports_teacher_id_fkey"
            columns: ["teacher_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      academic_club_activity_signatures: {
        Row: {
          approval_version: number
          automatic: boolean
          bucket: string | null
          created_at: string
          id: string
          master_signature_id: string | null
          method: string
          report_id: string
          signer_name: string
          signer_position: string | null
          signer_slot: string
          signer_user_id: string
          storage_path: string | null
          updated_at: string
        }
        Insert: {
          approval_version?: number
          automatic?: boolean
          bucket?: string | null
          created_at?: string
          id?: string
          master_signature_id?: string | null
          method: string
          report_id: string
          signer_name: string
          signer_position?: string | null
          signer_slot: string
          signer_user_id: string
          storage_path?: string | null
          updated_at?: string
        }
        Update: {
          approval_version?: number
          automatic?: boolean
          bucket?: string | null
          created_at?: string
          id?: string
          master_signature_id?: string | null
          method?: string
          report_id?: string
          signer_name?: string
          signer_position?: string | null
          signer_slot?: string
          signer_user_id?: string
          storage_path?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "academic_club_activity_signatures_master_signature_id_fkey"
            columns: ["master_signature_id"]
            isOneToOne: false
            referencedRelation: "signatures"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "academic_club_activity_signatures_report_id_fkey"
            columns: ["report_id"]
            isOneToOne: false
            referencedRelation: "academic_club_activity_reports"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "academic_club_activity_signatures_signer_user_id_fkey"
            columns: ["signer_user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      academic_club_activity_versions: {
        Row: {
          adviser_signature_snapshots: Json
          document_version: number
          id: string
          members_snapshot: Json
          report_id: string
          report_snapshot: Json
          submitted_at: string
          submitted_by: string | null
        }
        Insert: {
          adviser_signature_snapshots?: Json
          document_version: number
          id?: string
          members_snapshot: Json
          report_id: string
          report_snapshot: Json
          submitted_at?: string
          submitted_by?: string | null
        }
        Update: {
          adviser_signature_snapshots?: Json
          document_version?: number
          id?: string
          members_snapshot?: Json
          report_id?: string
          report_snapshot?: Json
          submitted_at?: string
          submitted_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "academic_club_activity_versions_report_id_fkey"
            columns: ["report_id"]
            isOneToOne: false
            referencedRelation: "academic_club_activity_reports"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "academic_club_activity_versions_submitted_by_fkey"
            columns: ["submitted_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      academic_document_service_requests: {
        Row: {
          academic_year: string | null
          applicant_district: string | null
          applicant_email: string | null
          applicant_first_name: string | null
          applicant_house_no: string | null
          applicant_last_name: string | null
          applicant_phone: string | null
          applicant_prefix: string | null
          applicant_province: string | null
          applicant_subdistrict: string | null
          applicant_village_name: string | null
          applicant_village_no: string | null
          assessment_decision: string
          assessment_reason: string | null
          class_label: string | null
          created_at: string
          created_by: string
          director_decision: string
          director_reason: string | null
          doc_certificate: boolean
          doc_certificate_with_grade: boolean
          doc_other: boolean
          doc_other_note: string | null
          doc_transcript: boolean
          doc_transcript_lost: boolean
          evidence_father_id_count: number
          evidence_mother_id_count: number
          evidence_other: boolean
          evidence_other_note: string | null
          evidence_photo_count: number
          evidence_police_report: boolean
          evidence_student_id_count: number
          finalized_at: string | null
          finalized_by: string | null
          graduation_year: string | null
          id: string
          purpose_text: string | null
          registrar_decision: string
          registrar_reason: string | null
          request_code: string
          request_date: string
          request_serial: number
          request_year: string
          semester: number | null
          status: string
          student_code: string | null
          student_first_name: string
          student_id: string | null
          student_last_name: string | null
          student_name: string
          student_prefix: string | null
          submitted_at: string | null
          submitted_by: string | null
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          academic_year?: string | null
          applicant_district?: string | null
          applicant_email?: string | null
          applicant_first_name?: string | null
          applicant_house_no?: string | null
          applicant_last_name?: string | null
          applicant_phone?: string | null
          applicant_prefix?: string | null
          applicant_province?: string | null
          applicant_subdistrict?: string | null
          applicant_village_name?: string | null
          applicant_village_no?: string | null
          assessment_decision?: string
          assessment_reason?: string | null
          class_label?: string | null
          created_at?: string
          created_by: string
          director_decision?: string
          director_reason?: string | null
          doc_certificate?: boolean
          doc_certificate_with_grade?: boolean
          doc_other?: boolean
          doc_other_note?: string | null
          doc_transcript?: boolean
          doc_transcript_lost?: boolean
          evidence_father_id_count?: number
          evidence_mother_id_count?: number
          evidence_other?: boolean
          evidence_other_note?: string | null
          evidence_photo_count?: number
          evidence_police_report?: boolean
          evidence_student_id_count?: number
          finalized_at?: string | null
          finalized_by?: string | null
          graduation_year?: string | null
          id?: string
          purpose_text?: string | null
          registrar_decision?: string
          registrar_reason?: string | null
          request_code: string
          request_date?: string
          request_serial: number
          request_year: string
          semester?: number | null
          status?: string
          student_code?: string | null
          student_first_name: string
          student_id?: string | null
          student_last_name?: string | null
          student_name: string
          student_prefix?: string | null
          submitted_at?: string | null
          submitted_by?: string | null
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          academic_year?: string | null
          applicant_district?: string | null
          applicant_email?: string | null
          applicant_first_name?: string | null
          applicant_house_no?: string | null
          applicant_last_name?: string | null
          applicant_phone?: string | null
          applicant_prefix?: string | null
          applicant_province?: string | null
          applicant_subdistrict?: string | null
          applicant_village_name?: string | null
          applicant_village_no?: string | null
          assessment_decision?: string
          assessment_reason?: string | null
          class_label?: string | null
          created_at?: string
          created_by?: string
          director_decision?: string
          director_reason?: string | null
          doc_certificate?: boolean
          doc_certificate_with_grade?: boolean
          doc_other?: boolean
          doc_other_note?: string | null
          doc_transcript?: boolean
          doc_transcript_lost?: boolean
          evidence_father_id_count?: number
          evidence_mother_id_count?: number
          evidence_other?: boolean
          evidence_other_note?: string | null
          evidence_photo_count?: number
          evidence_police_report?: boolean
          evidence_student_id_count?: number
          finalized_at?: string | null
          finalized_by?: string | null
          graduation_year?: string | null
          id?: string
          purpose_text?: string | null
          registrar_decision?: string
          registrar_reason?: string | null
          request_code?: string
          request_date?: string
          request_serial?: number
          request_year?: string
          semester?: number | null
          status?: string
          student_code?: string | null
          student_first_name?: string
          student_id?: string | null
          student_last_name?: string | null
          student_name?: string
          student_prefix?: string | null
          submitted_at?: string | null
          submitted_by?: string | null
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "academic_document_service_requests_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
        ]
      }
      academic_document_service_settings: {
        Row: {
          assessment_user_id: string | null
          director_user_id: string | null
          id: number
          registrar_user_id: string | null
          request_number_next: number
          request_number_year: string
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          assessment_user_id?: string | null
          director_user_id?: string | null
          id?: number
          registrar_user_id?: string | null
          request_number_next?: number
          request_number_year?: string
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          assessment_user_id?: string | null
          director_user_id?: string | null
          id?: number
          registrar_user_id?: string | null
          request_number_next?: number
          request_number_year?: string
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "academic_document_service_settings_assessment_user_id_fkey"
            columns: ["assessment_user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "academic_document_service_settings_director_user_id_fkey"
            columns: ["director_user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "academic_document_service_settings_registrar_user_id_fkey"
            columns: ["registrar_user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      academic_document_service_signatures: {
        Row: {
          approval_version: number
          automatic: boolean
          bucket: string | null
          created_at: string
          created_by: string | null
          id: string
          master_signature_id: string | null
          method: string
          request_id: string
          signer_name: string | null
          signer_position: string | null
          signer_slot: string
          signer_user_id: string | null
          storage_path: string | null
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          approval_version?: number
          automatic?: boolean
          bucket?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          master_signature_id?: string | null
          method: string
          request_id: string
          signer_name?: string | null
          signer_position?: string | null
          signer_slot: string
          signer_user_id?: string | null
          storage_path?: string | null
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          approval_version?: number
          automatic?: boolean
          bucket?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          master_signature_id?: string | null
          method?: string
          request_id?: string
          signer_name?: string | null
          signer_position?: string | null
          signer_slot?: string
          signer_user_id?: string | null
          storage_path?: string | null
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "academic_document_service_signatures_master_signature_id_fkey"
            columns: ["master_signature_id"]
            isOneToOne: false
            referencedRelation: "signatures"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "academic_document_service_signatures_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "academic_document_service_requests"
            referencedColumns: ["id"]
          },
        ]
      }
      academic_exam_attempts: {
        Row: {
          attendance_status: string
          created_at: string
          created_by: string | null
          exam_set_id: string
          id: string
          objective_score: number
          student_code_snapshot: string | null
          student_id: string
          student_name_snapshot: string
          student_number_snapshot: number | null
          subjective_score: number
          total_score: number
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          attendance_status?: string
          created_at?: string
          created_by?: string | null
          exam_set_id: string
          id?: string
          objective_score?: number
          student_code_snapshot?: string | null
          student_id: string
          student_name_snapshot: string
          student_number_snapshot?: number | null
          subjective_score?: number
          total_score?: number
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          attendance_status?: string
          created_at?: string
          created_by?: string | null
          exam_set_id?: string
          id?: string
          objective_score?: number
          student_code_snapshot?: string | null
          student_id?: string
          student_name_snapshot?: string
          student_number_snapshot?: number | null
          subjective_score?: number
          total_score?: number
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "academic_exam_attempts_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "academic_exam_attempts_exam_set_id_fkey"
            columns: ["exam_set_id"]
            isOneToOne: false
            referencedRelation: "academic_exam_sets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "academic_exam_attempts_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "academic_exam_attempts_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      academic_exam_items: {
        Row: {
          choice_style: string | null
          created_at: string
          created_by: string | null
          exam_set_id: string
          id: string
          item_no: number
          item_type: string
          options: Json
          question_text: string
          score: number
          section_no: number
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          choice_style?: string | null
          created_at?: string
          created_by?: string | null
          exam_set_id: string
          id?: string
          item_no: number
          item_type: string
          options?: Json
          question_text: string
          score?: number
          section_no?: number
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          choice_style?: string | null
          created_at?: string
          created_by?: string | null
          exam_set_id?: string
          id?: string
          item_no?: number
          item_type?: string
          options?: Json
          question_text?: string
          score?: number
          section_no?: number
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "academic_exam_items_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "academic_exam_items_exam_set_id_fkey"
            columns: ["exam_set_id"]
            isOneToOne: false
            referencedRelation: "academic_exam_sets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "academic_exam_items_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      academic_exam_responses: {
        Row: {
          attempt_id: string
          awarded_score: number
          created_at: string
          created_by: string | null
          exam_item_id: string
          id: string
          is_correct: boolean | null
          selected_option_index: number | null
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          attempt_id: string
          awarded_score?: number
          created_at?: string
          created_by?: string | null
          exam_item_id: string
          id?: string
          is_correct?: boolean | null
          selected_option_index?: number | null
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          attempt_id?: string
          awarded_score?: number
          created_at?: string
          created_by?: string | null
          exam_item_id?: string
          id?: string
          is_correct?: boolean | null
          selected_option_index?: number | null
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "academic_exam_responses_attempt_id_fkey"
            columns: ["attempt_id"]
            isOneToOne: false
            referencedRelation: "academic_exam_attempts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "academic_exam_responses_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "academic_exam_responses_exam_item_id_fkey"
            columns: ["exam_item_id"]
            isOneToOne: false
            referencedRelation: "academic_exam_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "academic_exam_responses_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      academic_exam_sets: {
        Row: {
          academic_year: string
          archived_at: string | null
          archived_by: string | null
          class_id: string | null
          class_label_snapshot: string
          created_at: string
          created_by: string | null
          default_choice_count: number
          default_choice_style: string
          duration_minutes: number
          exam_name: string
          exam_period: string
          full_score: number
          general_instructions: string | null
          id: string
          instructions: string | null
          learning_outcomes: Json
          number_style: string
          objective_count: number
          sections: Json
          semester: number
          subject_code_snapshot: string | null
          subject_id: string | null
          subject_name_snapshot: string
          subjective_count: number
          teacher_id: string | null
          teacher_name_snapshot: string | null
          teaching_assignment_id: string | null
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          academic_year: string
          archived_at?: string | null
          archived_by?: string | null
          class_id?: string | null
          class_label_snapshot: string
          created_at?: string
          created_by?: string | null
          default_choice_count?: number
          default_choice_style?: string
          duration_minutes?: number
          exam_name: string
          exam_period?: string
          full_score?: number
          general_instructions?: string | null
          id?: string
          instructions?: string | null
          learning_outcomes?: Json
          number_style?: string
          objective_count?: number
          sections?: Json
          semester: number
          subject_code_snapshot?: string | null
          subject_id?: string | null
          subject_name_snapshot: string
          subjective_count?: number
          teacher_id?: string | null
          teacher_name_snapshot?: string | null
          teaching_assignment_id?: string | null
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          academic_year?: string
          archived_at?: string | null
          archived_by?: string | null
          class_id?: string | null
          class_label_snapshot?: string
          created_at?: string
          created_by?: string | null
          default_choice_count?: number
          default_choice_style?: string
          duration_minutes?: number
          exam_name?: string
          exam_period?: string
          full_score?: number
          general_instructions?: string | null
          id?: string
          instructions?: string | null
          learning_outcomes?: Json
          number_style?: string
          objective_count?: number
          sections?: Json
          semester?: number
          subject_code_snapshot?: string | null
          subject_id?: string | null
          subject_name_snapshot?: string
          subjective_count?: number
          teacher_id?: string | null
          teacher_name_snapshot?: string | null
          teaching_assignment_id?: string | null
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "academic_exam_sets_class_id_fkey"
            columns: ["class_id"]
            isOneToOne: false
            referencedRelation: "school_classes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "academic_exam_sets_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "academic_exam_sets_subject_id_fkey"
            columns: ["subject_id"]
            isOneToOne: false
            referencedRelation: "academic_subjects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "academic_exam_sets_teacher_id_fkey"
            columns: ["teacher_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "academic_exam_sets_teaching_assignment_id_fkey"
            columns: ["teaching_assignment_id"]
            isOneToOne: false
            referencedRelation: "teaching_assignments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "academic_exam_sets_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      academic_learner_activity_class_reviewers: {
        Row: {
          academic_year: string
          assigned_by: string | null
          class_id: string
          created_at: string
          id: string
          reviewer_user_id: string
          updated_at: string
        }
        Insert: {
          academic_year: string
          assigned_by?: string | null
          class_id: string
          created_at?: string
          id?: string
          reviewer_user_id: string
          updated_at?: string
        }
        Update: {
          academic_year?: string
          assigned_by?: string | null
          class_id?: string
          created_at?: string
          id?: string
          reviewer_user_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "academic_learner_activity_class_reviewers_assigned_by_fkey"
            columns: ["assigned_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "academic_learner_activity_class_reviewers_class_id_fkey"
            columns: ["class_id"]
            isOneToOne: false
            referencedRelation: "school_classes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "academic_learner_activity_class_reviewers_reviewer_user_id_fkey"
            columns: ["reviewer_user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      academic_learner_activity_reports: {
        Row: {
          academic_head_comment: string | null
          academic_head_decision: string
          academic_head_id: string | null
          academic_head_name: string | null
          academic_head_position: string | null
          academic_head_reviewed_at: string | null
          academic_year: string
          activities: Json
          approval_version: number
          approved_at: string | null
          assessment_head_comment: string | null
          assessment_head_decision: string
          assessment_head_id: string | null
          assessment_head_name: string | null
          assessment_head_position: string | null
          assessment_head_reviewed_at: string | null
          class_id: string
          class_label: string
          co_adviser_id: string | null
          co_adviser_name: string | null
          co_adviser_position: string | null
          created_at: string
          director_approval_automatic: boolean
          director_comment: string | null
          director_decision: string
          director_name: string | null
          director_position: string | null
          director_reviewed_at: string | null
          director_reviewer_id: string | null
          exited_female: number
          exited_male: number
          id: string
          joined_female: number
          joined_male: number
          level_reviewer_comment: string | null
          level_reviewer_decision: string
          level_reviewer_id: string | null
          level_reviewer_name: string | null
          level_reviewer_position: string | null
          level_reviewer_reviewed_at: string | null
          opening_female: number
          opening_male: number
          revision_stage: string | null
          semester: number
          shared_teacher_ids: string[]
          shared_teacher_names: string[]
          source_file_bucket: string | null
          source_file_mime: string | null
          source_file_name: string | null
          source_file_path: string | null
          source_file_size: number | null
          source_file_uploaded_at: string | null
          stage_code: string | null
          status: string
          submission_mode: string
          submitted_at: string | null
          teacher_id: string
          teacher_name: string
          teacher_position: string | null
          updated_at: string
        }
        Insert: {
          academic_head_comment?: string | null
          academic_head_decision?: string
          academic_head_id?: string | null
          academic_head_name?: string | null
          academic_head_position?: string | null
          academic_head_reviewed_at?: string | null
          academic_year: string
          activities?: Json
          approval_version?: number
          approved_at?: string | null
          assessment_head_comment?: string | null
          assessment_head_decision?: string
          assessment_head_id?: string | null
          assessment_head_name?: string | null
          assessment_head_position?: string | null
          assessment_head_reviewed_at?: string | null
          class_id: string
          class_label: string
          co_adviser_id?: string | null
          co_adviser_name?: string | null
          co_adviser_position?: string | null
          created_at?: string
          director_approval_automatic?: boolean
          director_comment?: string | null
          director_decision?: string
          director_name?: string | null
          director_position?: string | null
          director_reviewed_at?: string | null
          director_reviewer_id?: string | null
          exited_female?: number
          exited_male?: number
          id?: string
          joined_female?: number
          joined_male?: number
          level_reviewer_comment?: string | null
          level_reviewer_decision?: string
          level_reviewer_id?: string | null
          level_reviewer_name?: string | null
          level_reviewer_position?: string | null
          level_reviewer_reviewed_at?: string | null
          opening_female?: number
          opening_male?: number
          revision_stage?: string | null
          semester: number
          shared_teacher_ids?: string[]
          shared_teacher_names?: string[]
          source_file_bucket?: string | null
          source_file_mime?: string | null
          source_file_name?: string | null
          source_file_path?: string | null
          source_file_size?: number | null
          source_file_uploaded_at?: string | null
          stage_code?: string | null
          status?: string
          submission_mode?: string
          submitted_at?: string | null
          teacher_id: string
          teacher_name: string
          teacher_position?: string | null
          updated_at?: string
        }
        Update: {
          academic_head_comment?: string | null
          academic_head_decision?: string
          academic_head_id?: string | null
          academic_head_name?: string | null
          academic_head_position?: string | null
          academic_head_reviewed_at?: string | null
          academic_year?: string
          activities?: Json
          approval_version?: number
          approved_at?: string | null
          assessment_head_comment?: string | null
          assessment_head_decision?: string
          assessment_head_id?: string | null
          assessment_head_name?: string | null
          assessment_head_position?: string | null
          assessment_head_reviewed_at?: string | null
          class_id?: string
          class_label?: string
          co_adviser_id?: string | null
          co_adviser_name?: string | null
          co_adviser_position?: string | null
          created_at?: string
          director_approval_automatic?: boolean
          director_comment?: string | null
          director_decision?: string
          director_name?: string | null
          director_position?: string | null
          director_reviewed_at?: string | null
          director_reviewer_id?: string | null
          exited_female?: number
          exited_male?: number
          id?: string
          joined_female?: number
          joined_male?: number
          level_reviewer_comment?: string | null
          level_reviewer_decision?: string
          level_reviewer_id?: string | null
          level_reviewer_name?: string | null
          level_reviewer_position?: string | null
          level_reviewer_reviewed_at?: string | null
          opening_female?: number
          opening_male?: number
          revision_stage?: string | null
          semester?: number
          shared_teacher_ids?: string[]
          shared_teacher_names?: string[]
          source_file_bucket?: string | null
          source_file_mime?: string | null
          source_file_name?: string | null
          source_file_path?: string | null
          source_file_size?: number | null
          source_file_uploaded_at?: string | null
          stage_code?: string | null
          status?: string
          submission_mode?: string
          submitted_at?: string | null
          teacher_id?: string
          teacher_name?: string
          teacher_position?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "academic_learner_activity_reports_academic_head_id_fkey"
            columns: ["academic_head_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "academic_learner_activity_reports_assessment_head_id_fkey"
            columns: ["assessment_head_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "academic_learner_activity_reports_class_id_fkey"
            columns: ["class_id"]
            isOneToOne: false
            referencedRelation: "school_classes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "academic_learner_activity_reports_co_adviser_id_fkey"
            columns: ["co_adviser_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "academic_learner_activity_reports_director_reviewer_id_fkey"
            columns: ["director_reviewer_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "academic_learner_activity_reports_level_reviewer_id_fkey"
            columns: ["level_reviewer_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "academic_learner_activity_reports_teacher_id_fkey"
            columns: ["teacher_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      academic_learner_activity_settings: {
        Row: {
          academic_year: string
          assessment_head_user_id: string | null
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          academic_year: string
          assessment_head_user_id?: string | null
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          academic_year?: string
          assessment_head_user_id?: string | null
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "academic_learner_activity_settings_assessment_head_user_id_fkey"
            columns: ["assessment_head_user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "academic_learner_activity_settings_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      academic_learner_activity_signatures: {
        Row: {
          approval_version: number
          automatic: boolean
          bucket: string | null
          created_at: string
          id: string
          master_signature_id: string | null
          method: string
          report_id: string
          signer_name: string
          signer_position: string | null
          signer_slot: string
          signer_user_id: string
          storage_path: string | null
          updated_at: string
        }
        Insert: {
          approval_version?: number
          automatic?: boolean
          bucket?: string | null
          created_at?: string
          id?: string
          master_signature_id?: string | null
          method: string
          report_id: string
          signer_name: string
          signer_position?: string | null
          signer_slot: string
          signer_user_id: string
          storage_path?: string | null
          updated_at?: string
        }
        Update: {
          approval_version?: number
          automatic?: boolean
          bucket?: string | null
          created_at?: string
          id?: string
          master_signature_id?: string | null
          method?: string
          report_id?: string
          signer_name?: string
          signer_position?: string | null
          signer_slot?: string
          signer_user_id?: string
          storage_path?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "academic_learner_activity_signatures_master_signature_id_fkey"
            columns: ["master_signature_id"]
            isOneToOne: false
            referencedRelation: "signatures"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "academic_learner_activity_signatures_report_id_fkey"
            columns: ["report_id"]
            isOneToOne: false
            referencedRelation: "academic_learner_activity_reports"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "academic_learner_activity_signatures_signer_user_id_fkey"
            columns: ["signer_user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      academic_learner_activity_students: {
        Row: {
          activity_results: Json
          created_at: string
          enrollment_status: string | null
          first_name: string | null
          gender: string | null
          id: string
          last_name: string | null
          prefix: string | null
          promotion_status: string | null
          report_id: string
          student_code: string | null
          student_id: string
          student_name: string
          student_number: number | null
          updated_at: string
        }
        Insert: {
          activity_results?: Json
          created_at?: string
          enrollment_status?: string | null
          first_name?: string | null
          gender?: string | null
          id?: string
          last_name?: string | null
          prefix?: string | null
          promotion_status?: string | null
          report_id: string
          student_code?: string | null
          student_id: string
          student_name: string
          student_number?: number | null
          updated_at?: string
        }
        Update: {
          activity_results?: Json
          created_at?: string
          enrollment_status?: string | null
          first_name?: string | null
          gender?: string | null
          id?: string
          last_name?: string | null
          prefix?: string | null
          promotion_status?: string | null
          report_id?: string
          student_code?: string | null
          student_id?: string
          student_name?: string
          student_number?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "academic_learner_activity_students_report_id_fkey"
            columns: ["report_id"]
            isOneToOne: false
            referencedRelation: "academic_learner_activity_reports"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "academic_learner_activity_students_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
        ]
      }
      academic_learner_activity_versions: {
        Row: {
          adviser_signature_snapshots: Json
          document_version: number
          id: string
          report_id: string
          report_snapshot: Json
          students_snapshot: Json
          submitted_at: string
          submitted_by: string | null
        }
        Insert: {
          adviser_signature_snapshots?: Json
          document_version: number
          id?: string
          report_id: string
          report_snapshot: Json
          students_snapshot: Json
          submitted_at?: string
          submitted_by?: string | null
        }
        Update: {
          adviser_signature_snapshots?: Json
          document_version?: number
          id?: string
          report_id?: string
          report_snapshot?: Json
          students_snapshot?: Json
          submitted_at?: string
          submitted_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "academic_learner_activity_versions_report_id_fkey"
            columns: ["report_id"]
            isOneToOne: false
            referencedRelation: "academic_learner_activity_reports"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "academic_learner_activity_versions_submitted_by_fkey"
            columns: ["submitted_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      academic_learning_media_reports: {
        Row: {
          academic_head_comment: string | null
          academic_head_decision: string
          academic_head_id: string | null
          academic_head_name: string | null
          academic_head_position: string | null
          academic_head_reviewed_at: string | null
          academic_year: string
          approval_version: number
          approved_at: string | null
          assignment_id: string | null
          cert_content_appropriate: boolean
          cert_other_text: string | null
          cert_practical: boolean
          class_id: string
          class_label: string
          created_at: string
          director_approval_automatic: boolean
          director_comment: string | null
          director_decision: string
          director_reviewed_at: string | null
          director_reviewer_id: string | null
          id: string
          media_items: Json
          revision_stage: string | null
          semester: number
          status: string
          subject_code: string | null
          subject_group_comment: string | null
          subject_group_decision: string
          subject_group_head_id: string | null
          subject_group_head_name: string | null
          subject_group_head_position: string | null
          subject_group_id: string | null
          subject_group_name: string | null
          subject_group_reviewed_at: string | null
          subject_id: string
          subject_name: string
          submitted_at: string | null
          teacher_id: string
          teacher_name: string
          teacher_position: string | null
          updated_at: string
        }
        Insert: {
          academic_head_comment?: string | null
          academic_head_decision?: string
          academic_head_id?: string | null
          academic_head_name?: string | null
          academic_head_position?: string | null
          academic_head_reviewed_at?: string | null
          academic_year: string
          approval_version?: number
          approved_at?: string | null
          assignment_id?: string | null
          cert_content_appropriate?: boolean
          cert_other_text?: string | null
          cert_practical?: boolean
          class_id: string
          class_label: string
          created_at?: string
          director_approval_automatic?: boolean
          director_comment?: string | null
          director_decision?: string
          director_reviewed_at?: string | null
          director_reviewer_id?: string | null
          id?: string
          media_items?: Json
          revision_stage?: string | null
          semester: number
          status?: string
          subject_code?: string | null
          subject_group_comment?: string | null
          subject_group_decision?: string
          subject_group_head_id?: string | null
          subject_group_head_name?: string | null
          subject_group_head_position?: string | null
          subject_group_id?: string | null
          subject_group_name?: string | null
          subject_group_reviewed_at?: string | null
          subject_id: string
          subject_name: string
          submitted_at?: string | null
          teacher_id: string
          teacher_name: string
          teacher_position?: string | null
          updated_at?: string
        }
        Update: {
          academic_head_comment?: string | null
          academic_head_decision?: string
          academic_head_id?: string | null
          academic_head_name?: string | null
          academic_head_position?: string | null
          academic_head_reviewed_at?: string | null
          academic_year?: string
          approval_version?: number
          approved_at?: string | null
          assignment_id?: string | null
          cert_content_appropriate?: boolean
          cert_other_text?: string | null
          cert_practical?: boolean
          class_id?: string
          class_label?: string
          created_at?: string
          director_approval_automatic?: boolean
          director_comment?: string | null
          director_decision?: string
          director_reviewed_at?: string | null
          director_reviewer_id?: string | null
          id?: string
          media_items?: Json
          revision_stage?: string | null
          semester?: number
          status?: string
          subject_code?: string | null
          subject_group_comment?: string | null
          subject_group_decision?: string
          subject_group_head_id?: string | null
          subject_group_head_name?: string | null
          subject_group_head_position?: string | null
          subject_group_id?: string | null
          subject_group_name?: string | null
          subject_group_reviewed_at?: string | null
          subject_id?: string
          subject_name?: string
          submitted_at?: string | null
          teacher_id?: string
          teacher_name?: string
          teacher_position?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "academic_learning_media_reports_academic_head_id_fkey"
            columns: ["academic_head_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "academic_learning_media_reports_assignment_id_fkey"
            columns: ["assignment_id"]
            isOneToOne: false
            referencedRelation: "teaching_assignments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "academic_learning_media_reports_class_id_fkey"
            columns: ["class_id"]
            isOneToOne: false
            referencedRelation: "school_classes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "academic_learning_media_reports_director_reviewer_id_fkey"
            columns: ["director_reviewer_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "academic_learning_media_reports_subject_group_head_id_fkey"
            columns: ["subject_group_head_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "academic_learning_media_reports_subject_group_id_fkey"
            columns: ["subject_group_id"]
            isOneToOne: false
            referencedRelation: "subject_groups"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "academic_learning_media_reports_subject_id_fkey"
            columns: ["subject_id"]
            isOneToOne: false
            referencedRelation: "academic_subjects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "academic_learning_media_reports_teacher_id_fkey"
            columns: ["teacher_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      academic_learning_media_signatures: {
        Row: {
          approval_version: number
          automatic: boolean
          bucket: string | null
          created_at: string
          id: string
          master_signature_id: string | null
          method: string
          report_id: string
          signer_name: string
          signer_position: string | null
          signer_slot: string
          signer_user_id: string
          storage_path: string | null
          updated_at: string
        }
        Insert: {
          approval_version?: number
          automatic?: boolean
          bucket?: string | null
          created_at?: string
          id?: string
          master_signature_id?: string | null
          method: string
          report_id: string
          signer_name: string
          signer_position?: string | null
          signer_slot: string
          signer_user_id: string
          storage_path?: string | null
          updated_at?: string
        }
        Update: {
          approval_version?: number
          automatic?: boolean
          bucket?: string | null
          created_at?: string
          id?: string
          master_signature_id?: string | null
          method?: string
          report_id?: string
          signer_name?: string
          signer_position?: string | null
          signer_slot?: string
          signer_user_id?: string
          storage_path?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "academic_learning_media_signatures_master_signature_id_fkey"
            columns: ["master_signature_id"]
            isOneToOne: false
            referencedRelation: "signatures"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "academic_learning_media_signatures_report_id_fkey"
            columns: ["report_id"]
            isOneToOne: false
            referencedRelation: "academic_learning_media_reports"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "academic_learning_media_signatures_signer_user_id_fkey"
            columns: ["signer_user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      academic_lesson_plan_usage_document_settings: {
        Row: {
          academic_year: string
          memo_date: string | null
          memo_number: string | null
          semester: number
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          academic_year: string
          memo_date?: string | null
          memo_number?: string | null
          semester: number
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          academic_year?: string
          memo_date?: string | null
          memo_number?: string | null
          semester?: number
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "academic_lesson_plan_usage_document_settings_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      academic_lesson_plan_usage_reports: {
        Row: {
          academic_head_comment: string | null
          academic_head_decision: string
          academic_head_id: string | null
          academic_head_name: string | null
          academic_head_position: string | null
          academic_head_reviewed_at: string | null
          academic_year: string
          approval_version: number
          approved_at: string | null
          assignment_id: string | null
          class_id: string
          class_label: string
          created_at: string
          director_approval_automatic: boolean
          director_comment: string | null
          director_decision: string
          director_reviewed_at: string | null
          director_reviewer_id: string | null
          grade_counts: Json
          id: string
          improvements_text: string | null
          memo_date: string | null
          memo_number: string | null
          objectives_text: string | null
          plans_per_unit: number | null
          problems_suggestions_text: string | null
          revision_stage: string | null
          satisfaction_items: Json
          semester: number
          status: string
          strengths_text: string | null
          student_count: number
          subject_code: string | null
          subject_group_comment: string | null
          subject_group_decision: string
          subject_group_head_id: string | null
          subject_group_head_name: string | null
          subject_group_head_position: string | null
          subject_group_id: string | null
          subject_group_name: string | null
          subject_group_reviewed_at: string | null
          subject_id: string
          subject_name: string
          submitted_at: string | null
          summary_text: string | null
          supporting_documents_text: string | null
          teacher_id: string
          teacher_name: string
          teacher_position: string | null
          top_students: Json
          unit_progress: Json
          units_count: number | null
          updated_at: string
          weaknesses_text: string | null
        }
        Insert: {
          academic_head_comment?: string | null
          academic_head_decision?: string
          academic_head_id?: string | null
          academic_head_name?: string | null
          academic_head_position?: string | null
          academic_head_reviewed_at?: string | null
          academic_year: string
          approval_version?: number
          approved_at?: string | null
          assignment_id?: string | null
          class_id: string
          class_label: string
          created_at?: string
          director_approval_automatic?: boolean
          director_comment?: string | null
          director_decision?: string
          director_reviewed_at?: string | null
          director_reviewer_id?: string | null
          grade_counts?: Json
          id?: string
          improvements_text?: string | null
          memo_date?: string | null
          memo_number?: string | null
          objectives_text?: string | null
          plans_per_unit?: number | null
          problems_suggestions_text?: string | null
          revision_stage?: string | null
          satisfaction_items?: Json
          semester: number
          status?: string
          strengths_text?: string | null
          student_count?: number
          subject_code?: string | null
          subject_group_comment?: string | null
          subject_group_decision?: string
          subject_group_head_id?: string | null
          subject_group_head_name?: string | null
          subject_group_head_position?: string | null
          subject_group_id?: string | null
          subject_group_name?: string | null
          subject_group_reviewed_at?: string | null
          subject_id: string
          subject_name: string
          submitted_at?: string | null
          summary_text?: string | null
          supporting_documents_text?: string | null
          teacher_id: string
          teacher_name: string
          teacher_position?: string | null
          top_students?: Json
          unit_progress?: Json
          units_count?: number | null
          updated_at?: string
          weaknesses_text?: string | null
        }
        Update: {
          academic_head_comment?: string | null
          academic_head_decision?: string
          academic_head_id?: string | null
          academic_head_name?: string | null
          academic_head_position?: string | null
          academic_head_reviewed_at?: string | null
          academic_year?: string
          approval_version?: number
          approved_at?: string | null
          assignment_id?: string | null
          class_id?: string
          class_label?: string
          created_at?: string
          director_approval_automatic?: boolean
          director_comment?: string | null
          director_decision?: string
          director_reviewed_at?: string | null
          director_reviewer_id?: string | null
          grade_counts?: Json
          id?: string
          improvements_text?: string | null
          memo_date?: string | null
          memo_number?: string | null
          objectives_text?: string | null
          plans_per_unit?: number | null
          problems_suggestions_text?: string | null
          revision_stage?: string | null
          satisfaction_items?: Json
          semester?: number
          status?: string
          strengths_text?: string | null
          student_count?: number
          subject_code?: string | null
          subject_group_comment?: string | null
          subject_group_decision?: string
          subject_group_head_id?: string | null
          subject_group_head_name?: string | null
          subject_group_head_position?: string | null
          subject_group_id?: string | null
          subject_group_name?: string | null
          subject_group_reviewed_at?: string | null
          subject_id?: string
          subject_name?: string
          submitted_at?: string | null
          summary_text?: string | null
          supporting_documents_text?: string | null
          teacher_id?: string
          teacher_name?: string
          teacher_position?: string | null
          top_students?: Json
          unit_progress?: Json
          units_count?: number | null
          updated_at?: string
          weaknesses_text?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "academic_lesson_plan_usage_reports_academic_head_id_fkey"
            columns: ["academic_head_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "academic_lesson_plan_usage_reports_assignment_id_fkey"
            columns: ["assignment_id"]
            isOneToOne: false
            referencedRelation: "teaching_assignments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "academic_lesson_plan_usage_reports_class_id_fkey"
            columns: ["class_id"]
            isOneToOne: false
            referencedRelation: "school_classes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "academic_lesson_plan_usage_reports_director_reviewer_id_fkey"
            columns: ["director_reviewer_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "academic_lesson_plan_usage_reports_subject_group_head_id_fkey"
            columns: ["subject_group_head_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "academic_lesson_plan_usage_reports_subject_group_id_fkey"
            columns: ["subject_group_id"]
            isOneToOne: false
            referencedRelation: "subject_groups"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "academic_lesson_plan_usage_reports_subject_id_fkey"
            columns: ["subject_id"]
            isOneToOne: false
            referencedRelation: "academic_subjects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "academic_lesson_plan_usage_reports_teacher_id_fkey"
            columns: ["teacher_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      academic_lesson_plan_usage_signatures: {
        Row: {
          approval_version: number
          automatic: boolean
          bucket: string | null
          created_at: string
          id: string
          master_signature_id: string | null
          method: string
          report_id: string
          signer_name: string
          signer_position: string | null
          signer_slot: string
          signer_user_id: string
          storage_path: string | null
          updated_at: string
        }
        Insert: {
          approval_version?: number
          automatic?: boolean
          bucket?: string | null
          created_at?: string
          id?: string
          master_signature_id?: string | null
          method: string
          report_id: string
          signer_name: string
          signer_position?: string | null
          signer_slot: string
          signer_user_id: string
          storage_path?: string | null
          updated_at?: string
        }
        Update: {
          approval_version?: number
          automatic?: boolean
          bucket?: string | null
          created_at?: string
          id?: string
          master_signature_id?: string | null
          method?: string
          report_id?: string
          signer_name?: string
          signer_position?: string | null
          signer_slot?: string
          signer_user_id?: string
          storage_path?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "academic_lesson_plan_usage_signatures_master_signature_id_fkey"
            columns: ["master_signature_id"]
            isOneToOne: false
            referencedRelation: "signatures"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "academic_lesson_plan_usage_signatures_report_id_fkey"
            columns: ["report_id"]
            isOneToOne: false
            referencedRelation: "academic_lesson_plan_usage_reports"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "academic_lesson_plan_usage_signatures_signer_user_id_fkey"
            columns: ["signer_user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      academic_plc_plans: {
        Row: {
          academic_year: string
          created_at: string
          created_by: string | null
          end_date: string | null
          end_time: string | null
          id: string
          is_active: boolean
          note: string | null
          period_label: string | null
          period_no: number
          recurrence_type: string
          semester: number
          stage_code: string
          start_date: string | null
          start_time: string | null
          title: string
          updated_at: string
          updated_by: string | null
          weekday: number | null
        }
        Insert: {
          academic_year: string
          created_at?: string
          created_by?: string | null
          end_date?: string | null
          end_time?: string | null
          id?: string
          is_active?: boolean
          note?: string | null
          period_label?: string | null
          period_no: number
          recurrence_type: string
          semester: number
          stage_code: string
          start_date?: string | null
          start_time?: string | null
          title?: string
          updated_at?: string
          updated_by?: string | null
          weekday?: number | null
        }
        Update: {
          academic_year?: string
          created_at?: string
          created_by?: string | null
          end_date?: string | null
          end_time?: string | null
          id?: string
          is_active?: boolean
          note?: string | null
          period_label?: string | null
          period_no?: number
          recurrence_type?: string
          semester?: number
          stage_code?: string
          start_date?: string | null
          start_time?: string | null
          title?: string
          updated_at?: string
          updated_by?: string | null
          weekday?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "academic_plc_plans_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "academic_plc_plans_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      academic_plc_sessions: {
        Row: {
          created_at: string
          event_date: string
          id: string
          plan_id: string
        }
        Insert: {
          created_at?: string
          event_date: string
          id?: string
          plan_id: string
        }
        Update: {
          created_at?: string
          event_date?: string
          id?: string
          plan_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "academic_plc_sessions_plan_id_fkey"
            columns: ["plan_id"]
            isOneToOne: false
            referencedRelation: "academic_plc_plans"
            referencedColumns: ["id"]
          },
        ]
      }
      academic_post_lesson_behavior_scores: {
        Row: {
          assigned_work_score: number
          created_at: string
          expression_score: number
          group_improvement_score: number
          helpfulness_score: number
          id: string
          listening_score: number
          report_id: string
          student_id: string | null
          student_name: string
          student_number: number | null
          total_score: number | null
        }
        Insert: {
          assigned_work_score: number
          created_at?: string
          expression_score: number
          group_improvement_score: number
          helpfulness_score: number
          id?: string
          listening_score: number
          report_id: string
          student_id?: string | null
          student_name: string
          student_number?: number | null
          total_score?: number | null
        }
        Update: {
          assigned_work_score?: number
          created_at?: string
          expression_score?: number
          group_improvement_score?: number
          helpfulness_score?: number
          id?: string
          listening_score?: number
          report_id?: string
          student_id?: string | null
          student_name?: string
          student_number?: number | null
          total_score?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "academic_post_lesson_behavior_scores_report_id_fkey"
            columns: ["report_id"]
            isOneToOne: false
            referencedRelation: "academic_post_lesson_reports"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "academic_post_lesson_behavior_scores_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
        ]
      }
      academic_post_lesson_reports: {
        Row: {
          academic_decision: string
          academic_year: string
          approval_version: number
          approved_at: string | null
          assignment_id: string | null
          class_id: string | null
          class_label: string
          competency_text: string | null
          created_at: string
          desirable_attributes_text: string | null
          director_approval_automatic: boolean
          director_decision: string
          director_reviewed_at: string | null
          director_reviewer_id: string | null
          id: string
          include_behavior_assessment: boolean
          knowledge_text: string | null
          other_notes: string | null
          problems_text: string | null
          report_scope: string
          reviewed_at: string | null
          reviewer_comment: string | null
          reviewer_id: string | null
          reviewer_name: string | null
          reviewer_position: string | null
          reviewer_signature_id: string | null
          semester: number
          solutions_text: string | null
          status: string
          subject_code: string | null
          subject_id: string | null
          subject_name: string
          subject_specific_text: string | null
          subject_specific_title: string
          submitted_at: string | null
          teach_date: string | null
          teacher_id: string
          teacher_name: string
          teacher_position: string | null
          teacher_signature_id: string | null
          unit_number: number | null
          unit_title: string
          updated_at: string
        }
        Insert: {
          academic_decision?: string
          academic_year: string
          approval_version?: number
          approved_at?: string | null
          assignment_id?: string | null
          class_id?: string | null
          class_label: string
          competency_text?: string | null
          created_at?: string
          desirable_attributes_text?: string | null
          director_approval_automatic?: boolean
          director_decision?: string
          director_reviewed_at?: string | null
          director_reviewer_id?: string | null
          id?: string
          include_behavior_assessment?: boolean
          knowledge_text?: string | null
          other_notes?: string | null
          problems_text?: string | null
          report_scope?: string
          reviewed_at?: string | null
          reviewer_comment?: string | null
          reviewer_id?: string | null
          reviewer_name?: string | null
          reviewer_position?: string | null
          reviewer_signature_id?: string | null
          semester: number
          solutions_text?: string | null
          status?: string
          subject_code?: string | null
          subject_id?: string | null
          subject_name: string
          subject_specific_text?: string | null
          subject_specific_title?: string
          submitted_at?: string | null
          teach_date?: string | null
          teacher_id: string
          teacher_name: string
          teacher_position?: string | null
          teacher_signature_id?: string | null
          unit_number?: number | null
          unit_title: string
          updated_at?: string
        }
        Update: {
          academic_decision?: string
          academic_year?: string
          approval_version?: number
          approved_at?: string | null
          assignment_id?: string | null
          class_id?: string | null
          class_label?: string
          competency_text?: string | null
          created_at?: string
          desirable_attributes_text?: string | null
          director_approval_automatic?: boolean
          director_decision?: string
          director_reviewed_at?: string | null
          director_reviewer_id?: string | null
          id?: string
          include_behavior_assessment?: boolean
          knowledge_text?: string | null
          other_notes?: string | null
          problems_text?: string | null
          report_scope?: string
          reviewed_at?: string | null
          reviewer_comment?: string | null
          reviewer_id?: string | null
          reviewer_name?: string | null
          reviewer_position?: string | null
          reviewer_signature_id?: string | null
          semester?: number
          solutions_text?: string | null
          status?: string
          subject_code?: string | null
          subject_id?: string | null
          subject_name?: string
          subject_specific_text?: string | null
          subject_specific_title?: string
          submitted_at?: string | null
          teach_date?: string | null
          teacher_id?: string
          teacher_name?: string
          teacher_position?: string | null
          teacher_signature_id?: string | null
          unit_number?: number | null
          unit_title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "academic_post_lesson_reports_assignment_id_fkey"
            columns: ["assignment_id"]
            isOneToOne: false
            referencedRelation: "teaching_assignments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "academic_post_lesson_reports_class_id_fkey"
            columns: ["class_id"]
            isOneToOne: false
            referencedRelation: "school_classes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "academic_post_lesson_reports_director_reviewer_id_fkey"
            columns: ["director_reviewer_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "academic_post_lesson_reports_reviewer_id_fkey"
            columns: ["reviewer_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "academic_post_lesson_reports_reviewer_signature_id_fkey"
            columns: ["reviewer_signature_id"]
            isOneToOne: false
            referencedRelation: "signatures"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "academic_post_lesson_reports_subject_id_fkey"
            columns: ["subject_id"]
            isOneToOne: false
            referencedRelation: "academic_subjects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "academic_post_lesson_reports_teacher_id_fkey"
            columns: ["teacher_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "academic_post_lesson_reports_teacher_signature_id_fkey"
            columns: ["teacher_signature_id"]
            isOneToOne: false
            referencedRelation: "signatures"
            referencedColumns: ["id"]
          },
        ]
      }
      academic_post_lesson_settings: {
        Row: {
          deputy_director_user_id: string | null
          director_user_id: string | null
          id: number
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          deputy_director_user_id?: string | null
          director_user_id?: string | null
          id?: number
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          deputy_director_user_id?: string | null
          director_user_id?: string | null
          id?: number
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "academic_post_lesson_settings_deputy_director_user_id_fkey"
            columns: ["deputy_director_user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "academic_post_lesson_settings_director_user_id_fkey"
            columns: ["director_user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "academic_post_lesson_settings_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      academic_post_lesson_signatures: {
        Row: {
          approval_version: number
          automatic: boolean
          bucket: string | null
          created_at: string
          id: string
          master_signature_id: string | null
          method: string
          report_id: string
          signer_name: string
          signer_position: string | null
          signer_slot: string
          signer_user_id: string
          storage_path: string | null
          updated_at: string
        }
        Insert: {
          approval_version?: number
          automatic?: boolean
          bucket?: string | null
          created_at?: string
          id?: string
          master_signature_id?: string | null
          method: string
          report_id: string
          signer_name: string
          signer_position?: string | null
          signer_slot: string
          signer_user_id: string
          storage_path?: string | null
          updated_at?: string
        }
        Update: {
          approval_version?: number
          automatic?: boolean
          bucket?: string | null
          created_at?: string
          id?: string
          master_signature_id?: string | null
          method?: string
          report_id?: string
          signer_name?: string
          signer_position?: string | null
          signer_slot?: string
          signer_user_id?: string
          storage_path?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "academic_post_lesson_signatures_master_signature_id_fkey"
            columns: ["master_signature_id"]
            isOneToOne: false
            referencedRelation: "signatures"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "academic_post_lesson_signatures_report_id_fkey"
            columns: ["report_id"]
            isOneToOne: false
            referencedRelation: "academic_post_lesson_reports"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "academic_post_lesson_signatures_signer_user_id_fkey"
            columns: ["signer_user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      academic_registration_settings: {
        Row: {
          assessment_user_id: string | null
          certificate_preparer_user_id: string | null
          certificate_valid_days: number
          director_user_id: string | null
          finance_user_id: string | null
          id: number
          official_director_position_text: string
          official_phone_text: string
          official_registration_group_text: string
          official_school_address_text: string
          registrar_user_id: string | null
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          assessment_user_id?: string | null
          certificate_preparer_user_id?: string | null
          certificate_valid_days?: number
          director_user_id?: string | null
          finance_user_id?: string | null
          id?: number
          official_director_position_text?: string
          official_phone_text?: string
          official_registration_group_text?: string
          official_school_address_text?: string
          registrar_user_id?: string | null
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          assessment_user_id?: string | null
          certificate_preparer_user_id?: string | null
          certificate_valid_days?: number
          director_user_id?: string | null
          finance_user_id?: string | null
          id?: number
          official_director_position_text?: string
          official_phone_text?: string
          official_registration_group_text?: string
          official_school_address_text?: string
          registrar_user_id?: string | null
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "academic_registration_setting_certificate_preparer_user_id_fkey"
            columns: ["certificate_preparer_user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "academic_registration_settings_assessment_user_id_fkey"
            columns: ["assessment_user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "academic_registration_settings_director_user_id_fkey"
            columns: ["director_user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "academic_registration_settings_finance_user_id_fkey"
            columns: ["finance_user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "academic_registration_settings_registrar_user_id_fkey"
            columns: ["registrar_user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "academic_registration_settings_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      academic_shared_team_signatures: {
        Row: {
          automatic: boolean
          bucket: string | null
          created_at: string
          document_id: string
          document_version: number
          id: string
          master_signature_id: string | null
          method: string
          signer_name: string
          signer_order: number
          signer_position: string | null
          signer_role_label: string | null
          signer_user_id: string
          storage_path: string | null
          system_code: string
          updated_at: string
        }
        Insert: {
          automatic?: boolean
          bucket?: string | null
          created_at?: string
          document_id: string
          document_version?: number
          id?: string
          master_signature_id?: string | null
          method?: string
          signer_name: string
          signer_order?: number
          signer_position?: string | null
          signer_role_label?: string | null
          signer_user_id: string
          storage_path?: string | null
          system_code: string
          updated_at?: string
        }
        Update: {
          automatic?: boolean
          bucket?: string | null
          created_at?: string
          document_id?: string
          document_version?: number
          id?: string
          master_signature_id?: string | null
          method?: string
          signer_name?: string
          signer_order?: number
          signer_position?: string | null
          signer_role_label?: string | null
          signer_user_id?: string
          storage_path?: string | null
          system_code?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "academic_shared_team_signatures_master_signature_id_fkey"
            columns: ["master_signature_id"]
            isOneToOne: false
            referencedRelation: "signatures"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "academic_shared_team_signatures_signer_user_id_fkey"
            columns: ["signer_user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "academic_shared_team_signatures_system_code_fkey"
            columns: ["system_code"]
            isOneToOne: false
            referencedRelation: "approval_system_registry"
            referencedColumns: ["system_code"]
          },
        ]
      }
      academic_subject_group_heads: {
        Row: {
          academic_year: string
          assigned_by: string | null
          head_user_id: string
          id: string
          subject_group_id: string
          updated_at: string
        }
        Insert: {
          academic_year: string
          assigned_by?: string | null
          head_user_id: string
          id?: string
          subject_group_id: string
          updated_at?: string
        }
        Update: {
          academic_year?: string
          assigned_by?: string | null
          head_user_id?: string
          id?: string
          subject_group_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "academic_subject_group_heads_assigned_by_fkey"
            columns: ["assigned_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "academic_subject_group_heads_head_user_id_fkey"
            columns: ["head_user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "academic_subject_group_heads_subject_group_id_fkey"
            columns: ["subject_group_id"]
            isOneToOne: false
            referencedRelation: "subject_groups"
            referencedColumns: ["id"]
          },
        ]
      }
      academic_subjects: {
        Row: {
          created_at: string
          created_by: string | null
          id: string
          is_active: boolean
          subject_code: string | null
          subject_group_id: string | null
          subject_name: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          id?: string
          is_active?: boolean
          subject_code?: string | null
          subject_group_id?: string | null
          subject_name: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          id?: string
          is_active?: boolean
          subject_code?: string | null
          subject_group_id?: string | null
          subject_name?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "academic_subjects_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "academic_subjects_subject_group_id_fkey"
            columns: ["subject_group_id"]
            isOneToOne: false
            referencedRelation: "subject_groups"
            referencedColumns: ["id"]
          },
        ]
      }
      academic_submission_deadlines: {
        Row: {
          academic_year: string
          deadline_enabled: boolean
          due_at: string | null
          opens_at: string | null
          period_type: string
          semester: number
          system_code: string
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          academic_year: string
          deadline_enabled?: boolean
          due_at?: string | null
          opens_at?: string | null
          period_type?: string
          semester: number
          system_code: string
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          academic_year?: string
          deadline_enabled?: boolean
          due_at?: string | null
          opens_at?: string | null
          period_type?: string
          semester?: number
          system_code?: string
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "academic_submission_deadlines_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      academic_supervision_settings: {
        Row: {
          coordinator_user_id: string | null
          deputy_academic_user_id: string | null
          id: number
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          coordinator_user_id?: string | null
          deputy_academic_user_id?: string | null
          id?: number
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          coordinator_user_id?: string | null
          deputy_academic_user_id?: string | null
          id?: number
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "academic_supervision_settings_coordinator_user_id_fkey"
            columns: ["coordinator_user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "academic_supervision_settings_deputy_academic_user_id_fkey"
            columns: ["deputy_academic_user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "academic_supervision_settings_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      academic_supervision_slots: {
        Row: {
          class_id: string | null
          class_label: string
          created_at: string
          created_by: string | null
          end_time: string | null
          event_date: string
          id: string
          note: string | null
          period_label: string | null
          period_no: number
          start_time: string | null
          status: string
          subject_id: string | null
          subject_name: string
          supervisor_name: string | null
          supervisor_user_id: string | null
          teacher_id: string
          timetable_entry_id: string | null
          updated_at: string
          updated_by: string | null
          week_id: string
          weekday: number
        }
        Insert: {
          class_id?: string | null
          class_label: string
          created_at?: string
          created_by?: string | null
          end_time?: string | null
          event_date: string
          id?: string
          note?: string | null
          period_label?: string | null
          period_no: number
          start_time?: string | null
          status?: string
          subject_id?: string | null
          subject_name: string
          supervisor_name?: string | null
          supervisor_user_id?: string | null
          teacher_id: string
          timetable_entry_id?: string | null
          updated_at?: string
          updated_by?: string | null
          week_id: string
          weekday: number
        }
        Update: {
          class_id?: string | null
          class_label?: string
          created_at?: string
          created_by?: string | null
          end_time?: string | null
          event_date?: string
          id?: string
          note?: string | null
          period_label?: string | null
          period_no?: number
          start_time?: string | null
          status?: string
          subject_id?: string | null
          subject_name?: string
          supervisor_name?: string | null
          supervisor_user_id?: string | null
          teacher_id?: string
          timetable_entry_id?: string | null
          updated_at?: string
          updated_by?: string | null
          week_id?: string
          weekday?: number
        }
        Relationships: [
          {
            foreignKeyName: "academic_supervision_slots_class_id_fkey"
            columns: ["class_id"]
            isOneToOne: false
            referencedRelation: "school_classes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "academic_supervision_slots_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "academic_supervision_slots_subject_id_fkey"
            columns: ["subject_id"]
            isOneToOne: false
            referencedRelation: "academic_subjects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "academic_supervision_slots_supervisor_user_id_fkey"
            columns: ["supervisor_user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "academic_supervision_slots_teacher_id_fkey"
            columns: ["teacher_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "academic_supervision_slots_timetable_entry_id_fkey"
            columns: ["timetable_entry_id"]
            isOneToOne: false
            referencedRelation: "timetable_entries"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "academic_supervision_slots_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "academic_supervision_slots_week_id_fkey"
            columns: ["week_id"]
            isOneToOne: false
            referencedRelation: "academic_supervision_weeks"
            referencedColumns: ["id"]
          },
        ]
      }
      academic_supervision_weeks: {
        Row: {
          academic_year: string
          created_at: string
          created_by: string | null
          id: string
          note: string | null
          semester: number
          stage_code: string
          updated_at: string
          updated_by: string | null
          week_start: string
        }
        Insert: {
          academic_year: string
          created_at?: string
          created_by?: string | null
          id?: string
          note?: string | null
          semester: number
          stage_code: string
          updated_at?: string
          updated_by?: string | null
          week_start: string
        }
        Update: {
          academic_year?: string
          created_at?: string
          created_by?: string | null
          id?: string
          note?: string | null
          semester?: number
          stage_code?: string
          updated_at?: string
          updated_by?: string | null
          week_start?: string
        }
        Relationships: [
          {
            foreignKeyName: "academic_supervision_weeks_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "academic_supervision_weeks_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      academic_terms: {
        Row: {
          academic_year: string
          created_at: string
          end_date: string | null
          id: string
          is_current: boolean
          semester: number
          start_date: string | null
        }
        Insert: {
          academic_year: string
          created_at?: string
          end_date?: string | null
          id?: string
          is_current?: boolean
          semester: number
          start_date?: string | null
        }
        Update: {
          academic_year?: string
          created_at?: string
          end_date?: string | null
          id?: string
          is_current?: boolean
          semester?: number
          start_date?: string | null
        }
        Relationships: []
      }
      academic_transfer_request_counters: {
        Row: {
          academic_year: string
          last_number: number
          updated_at: string
        }
        Insert: {
          academic_year: string
          last_number?: number
          updated_at?: string
        }
        Update: {
          academic_year?: string
          last_number?: number
          updated_at?: string
        }
        Relationships: []
      }
      academic_transfer_request_files: {
        Row: {
          bucket: string
          created_at: string
          created_by: string
          file_name: string
          file_size: number | null
          id: string
          mime_type: string
          request_id: string
          sort_order: number
          storage_path: string
        }
        Insert: {
          bucket?: string
          created_at?: string
          created_by: string
          file_name: string
          file_size?: number | null
          id?: string
          mime_type?: string
          request_id: string
          sort_order?: number
          storage_path: string
        }
        Update: {
          bucket?: string
          created_at?: string
          created_by?: string
          file_name?: string
          file_size?: number | null
          id?: string
          mime_type?: string
          request_id?: string
          sort_order?: number
          storage_path?: string
        }
        Relationships: [
          {
            foreignKeyName: "academic_transfer_request_files_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "academic_transfer_request_files_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "academic_transfer_requests"
            referencedColumns: ["id"]
          },
        ]
      }
      academic_transfer_request_signatures: {
        Row: {
          approval_version: number
          automatic: boolean
          bucket: string | null
          created_at: string
          created_by: string
          id: string
          master_signature_id: string | null
          method: string
          request_id: string
          signer_name: string | null
          signer_position: string | null
          signer_slot: string
          signer_user_id: string | null
          storage_path: string | null
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          approval_version?: number
          automatic?: boolean
          bucket?: string | null
          created_at?: string
          created_by: string
          id?: string
          master_signature_id?: string | null
          method: string
          request_id: string
          signer_name?: string | null
          signer_position?: string | null
          signer_slot: string
          signer_user_id?: string | null
          storage_path?: string | null
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          approval_version?: number
          automatic?: boolean
          bucket?: string | null
          created_at?: string
          created_by?: string
          id?: string
          master_signature_id?: string | null
          method?: string
          request_id?: string
          signer_name?: string | null
          signer_position?: string | null
          signer_slot?: string
          signer_user_id?: string | null
          storage_path?: string | null
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "academic_transfer_request_signatures_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "academic_transfer_request_signatures_master_signature_id_fkey"
            columns: ["master_signature_id"]
            isOneToOne: false
            referencedRelation: "signatures"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "academic_transfer_request_signatures_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "academic_transfer_requests"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "academic_transfer_request_signatures_signer_user_id_fkey"
            columns: ["signer_user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "academic_transfer_request_signatures_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      academic_transfer_requests: {
        Row: {
          academic_year: string
          applicant_name: string
          applicant_role: string
          assessment_decision: string
          assessment_reason: string | null
          birth_date: string
          citizen_id: string
          class_id: string | null
          class_label: string
          contact_phone: string
          created_at: string
          created_by: string
          destination_district: string | null
          destination_province: string | null
          destination_residence: string | null
          destination_school: string | null
          director_decision: string
          director_reason: string | null
          evidence_birth_certificate: boolean
          evidence_house_registration: boolean
          evidence_other: boolean
          evidence_other_note: string | null
          evidence_parent_id: boolean
          evidence_phone: boolean
          evidence_photo: boolean
          father_name: string | null
          finalized_at: string | null
          finalized_by: string | null
          finance_amount_due: number | null
          finance_decision: string
          finance_reason: string | null
          finance_status: string
          guardian_address: string | null
          guardian_name: string
          id: string
          mother_name: string | null
          official_document_number: string | null
          official_document_number_updated_at: string | null
          official_document_number_updated_by: string | null
          official_document_number_updated_by_name: string | null
          official_note: string | null
          other_reason: string | null
          reason_type: string
          registrar_decision: string
          registrar_reason: string | null
          request_code: string | null
          request_date: string
          semester: number
          status: string
          student_code: string
          student_id: string
          student_name: string
          student_number: number | null
          submitted_at: string | null
          submitted_by: string | null
          transfer_date: string
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          academic_year: string
          applicant_name: string
          applicant_role?: string
          assessment_decision?: string
          assessment_reason?: string | null
          birth_date: string
          citizen_id: string
          class_id?: string | null
          class_label: string
          contact_phone: string
          created_at?: string
          created_by: string
          destination_district?: string | null
          destination_province?: string | null
          destination_residence?: string | null
          destination_school?: string | null
          director_decision?: string
          director_reason?: string | null
          evidence_birth_certificate?: boolean
          evidence_house_registration?: boolean
          evidence_other?: boolean
          evidence_other_note?: string | null
          evidence_parent_id?: boolean
          evidence_phone?: boolean
          evidence_photo?: boolean
          father_name?: string | null
          finalized_at?: string | null
          finalized_by?: string | null
          finance_amount_due?: number | null
          finance_decision?: string
          finance_reason?: string | null
          finance_status?: string
          guardian_address?: string | null
          guardian_name: string
          id?: string
          mother_name?: string | null
          official_document_number?: string | null
          official_document_number_updated_at?: string | null
          official_document_number_updated_by?: string | null
          official_document_number_updated_by_name?: string | null
          official_note?: string | null
          other_reason?: string | null
          reason_type: string
          registrar_decision?: string
          registrar_reason?: string | null
          request_code?: string | null
          request_date?: string
          semester: number
          status?: string
          student_code: string
          student_id: string
          student_name: string
          student_number?: number | null
          submitted_at?: string | null
          submitted_by?: string | null
          transfer_date: string
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          academic_year?: string
          applicant_name?: string
          applicant_role?: string
          assessment_decision?: string
          assessment_reason?: string | null
          birth_date?: string
          citizen_id?: string
          class_id?: string | null
          class_label?: string
          contact_phone?: string
          created_at?: string
          created_by?: string
          destination_district?: string | null
          destination_province?: string | null
          destination_residence?: string | null
          destination_school?: string | null
          director_decision?: string
          director_reason?: string | null
          evidence_birth_certificate?: boolean
          evidence_house_registration?: boolean
          evidence_other?: boolean
          evidence_other_note?: string | null
          evidence_parent_id?: boolean
          evidence_phone?: boolean
          evidence_photo?: boolean
          father_name?: string | null
          finalized_at?: string | null
          finalized_by?: string | null
          finance_amount_due?: number | null
          finance_decision?: string
          finance_reason?: string | null
          finance_status?: string
          guardian_address?: string | null
          guardian_name?: string
          id?: string
          mother_name?: string | null
          official_document_number?: string | null
          official_document_number_updated_at?: string | null
          official_document_number_updated_by?: string | null
          official_document_number_updated_by_name?: string | null
          official_note?: string | null
          other_reason?: string | null
          reason_type?: string
          registrar_decision?: string
          registrar_reason?: string | null
          request_code?: string | null
          request_date?: string
          semester?: number
          status?: string
          student_code?: string
          student_id?: string
          student_name?: string
          student_number?: number | null
          submitted_at?: string | null
          submitted_by?: string | null
          transfer_date?: string
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "academic_transfer_requests_class_id_fkey"
            columns: ["class_id"]
            isOneToOne: false
            referencedRelation: "school_classes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "academic_transfer_requests_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "academic_transfer_requests_finalized_by_fkey"
            columns: ["finalized_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "academic_transfer_requests_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "academic_transfer_requests_submitted_by_fkey"
            columns: ["submitted_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "academic_transfer_requests_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      approval_auto_policies: {
        Row: {
          authorization_note: string | null
          auto_approve: boolean
          auto_sign: boolean
          configured_by: string
          created_at: string
          enabled: boolean
          ends_at: string | null
          executive_user_id: string
          id: string
          signature_id: string | null
          starts_at: string | null
          system_code: string
          updated_at: string
        }
        Insert: {
          authorization_note?: string | null
          auto_approve?: boolean
          auto_sign?: boolean
          configured_by: string
          created_at?: string
          enabled?: boolean
          ends_at?: string | null
          executive_user_id: string
          id?: string
          signature_id?: string | null
          starts_at?: string | null
          system_code: string
          updated_at?: string
        }
        Update: {
          authorization_note?: string | null
          auto_approve?: boolean
          auto_sign?: boolean
          configured_by?: string
          created_at?: string
          enabled?: boolean
          ends_at?: string | null
          executive_user_id?: string
          id?: string
          signature_id?: string | null
          starts_at?: string | null
          system_code?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "approval_auto_policies_configured_by_fkey"
            columns: ["configured_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "approval_auto_policies_executive_user_id_fkey"
            columns: ["executive_user_id"]
            isOneToOne: false
            referencedRelation: "approval_executives"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "approval_auto_policies_signature_id_fkey"
            columns: ["signature_id"]
            isOneToOne: false
            referencedRelation: "signatures"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "approval_auto_policies_system_code_fkey"
            columns: ["system_code"]
            isOneToOne: false
            referencedRelation: "approval_system_registry"
            referencedColumns: ["system_code"]
          },
        ]
      }
      approval_control_audit: {
        Row: {
          action: string
          actor_user_id: string | null
          created_at: string
          details: Json
          document_id: string | null
          document_version: number | null
          id: number
          system_code: string | null
          target_user_id: string | null
        }
        Insert: {
          action: string
          actor_user_id?: string | null
          created_at?: string
          details?: Json
          document_id?: string | null
          document_version?: number | null
          id?: number
          system_code?: string | null
          target_user_id?: string | null
        }
        Update: {
          action?: string
          actor_user_id?: string | null
          created_at?: string
          details?: Json
          document_id?: string | null
          document_version?: number | null
          id?: number
          system_code?: string | null
          target_user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "approval_control_audit_actor_user_id_fkey"
            columns: ["actor_user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "approval_control_audit_target_user_id_fkey"
            columns: ["target_user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      approval_document_slots: {
        Row: {
          acted_at: string | null
          actor_name: string | null
          actor_position: string | null
          actor_user_id: string | null
          automatic: boolean
          comment: string | null
          created_at: string
          decision: string
          document_id: string
          document_version: number
          id: string
          policy_id: string | null
          signature_bucket: string | null
          signature_id: string | null
          signature_method: string | null
          signature_path: string | null
          slot_code: string
          slot_order: number
          system_code: string
          updated_at: string
        }
        Insert: {
          acted_at?: string | null
          actor_name?: string | null
          actor_position?: string | null
          actor_user_id?: string | null
          automatic?: boolean
          comment?: string | null
          created_at?: string
          decision?: string
          document_id: string
          document_version?: number
          id?: string
          policy_id?: string | null
          signature_bucket?: string | null
          signature_id?: string | null
          signature_method?: string | null
          signature_path?: string | null
          slot_code: string
          slot_order?: number
          system_code: string
          updated_at?: string
        }
        Update: {
          acted_at?: string | null
          actor_name?: string | null
          actor_position?: string | null
          actor_user_id?: string | null
          automatic?: boolean
          comment?: string | null
          created_at?: string
          decision?: string
          document_id?: string
          document_version?: number
          id?: string
          policy_id?: string | null
          signature_bucket?: string | null
          signature_id?: string | null
          signature_method?: string | null
          signature_path?: string | null
          slot_code?: string
          slot_order?: number
          system_code?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "approval_document_slots_actor_user_id_fkey"
            columns: ["actor_user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "approval_document_slots_policy_id_fkey"
            columns: ["policy_id"]
            isOneToOne: false
            referencedRelation: "approval_auto_policies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "approval_document_slots_signature_id_fkey"
            columns: ["signature_id"]
            isOneToOne: false
            referencedRelation: "signatures"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "approval_document_slots_system_code_fkey"
            columns: ["system_code"]
            isOneToOne: false
            referencedRelation: "approval_system_registry"
            referencedColumns: ["system_code"]
          },
        ]
      }
      approval_executives: {
        Row: {
          authorization_note: string | null
          configured_by: string | null
          created_at: string
          display_title: string
          executive_kind: string
          is_active: boolean
          updated_at: string
          user_id: string
        }
        Insert: {
          authorization_note?: string | null
          configured_by?: string | null
          created_at?: string
          display_title: string
          executive_kind: string
          is_active?: boolean
          updated_at?: string
          user_id: string
        }
        Update: {
          authorization_note?: string | null
          configured_by?: string | null
          created_at?: string
          display_title?: string
          executive_kind?: string
          is_active?: boolean
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "approval_executives_configured_by_fkey"
            columns: ["configured_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "approval_executives_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      approval_system_registry: {
        Row: {
          created_at: string
          executive_kinds: Json
          is_active: boolean
          module_code: string | null
          routing_locked: boolean
          routing_mode: string
          scope_mode: string
          slot_order: Json
          supports_auto_approve: boolean
          supports_auto_sign: boolean
          supports_dual_submission: boolean
          supports_shared_ownership: boolean
          system_code: string
          system_name_th: string
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          created_at?: string
          executive_kinds?: Json
          is_active?: boolean
          module_code?: string | null
          routing_locked?: boolean
          routing_mode?: string
          scope_mode?: string
          slot_order?: Json
          supports_auto_approve?: boolean
          supports_auto_sign?: boolean
          supports_dual_submission?: boolean
          supports_shared_ownership?: boolean
          system_code: string
          system_name_th: string
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          created_at?: string
          executive_kinds?: Json
          is_active?: boolean
          module_code?: string | null
          routing_locked?: boolean
          routing_mode?: string
          scope_mode?: string
          slot_order?: Json
          supports_auto_approve?: boolean
          supports_auto_sign?: boolean
          supports_dual_submission?: boolean
          supports_shared_ownership?: boolean
          system_code?: string
          system_name_th?: string
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "approval_system_registry_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      approved_lesson_plan_documents: {
        Row: {
          bucket_id: string
          created_at: string
          file_name: string
          file_size: number | null
          generated_by: string
          id: string
          lesson_plan_id: string
          mime_type: string
          storage_path: string
        }
        Insert: {
          bucket_id?: string
          created_at?: string
          file_name: string
          file_size?: number | null
          generated_by: string
          id?: string
          lesson_plan_id: string
          mime_type?: string
          storage_path: string
        }
        Update: {
          bucket_id?: string
          created_at?: string
          file_name?: string
          file_size?: number | null
          generated_by?: string
          id?: string
          lesson_plan_id?: string
          mime_type?: string
          storage_path?: string
        }
        Relationships: [
          {
            foreignKeyName: "approved_lesson_plan_documents_lesson_plan_id_fkey"
            columns: ["lesson_plan_id"]
            isOneToOne: true
            referencedRelation: "lesson_plans"
            referencedColumns: ["id"]
          },
        ]
      }
      audit_logs: {
        Row: {
          action: string
          actor_id: string | null
          created_at: string
          details: Json
          entity_id: string | null
          entity_type: string
          id: number
        }
        Insert: {
          action: string
          actor_id?: string | null
          created_at?: string
          details?: Json
          entity_id?: string | null
          entity_type: string
          id?: never
        }
        Update: {
          action?: string
          actor_id?: string | null
          created_at?: string
          details?: Json
          entity_id?: string | null
          entity_type?: string
          id?: never
        }
        Relationships: [
          {
            foreignKeyName: "audit_logs_actor_id_fkey"
            columns: ["actor_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      behavior_case_audit: {
        Row: {
          changed_at: string
          changed_by: string | null
          event_id: string
          id: string
          new_parent_status: string
          new_status: string
          note: string | null
          old_parent_status: string
          old_status: string
        }
        Insert: {
          changed_at?: string
          changed_by?: string | null
          event_id: string
          id?: string
          new_parent_status: string
          new_status: string
          note?: string | null
          old_parent_status: string
          old_status: string
        }
        Update: {
          changed_at?: string
          changed_by?: string | null
          event_id?: string
          id?: string
          new_parent_status?: string
          new_status?: string
          note?: string | null
          old_parent_status?: string
          old_status?: string
        }
        Relationships: [
          {
            foreignKeyName: "behavior_case_audit_changed_by_fkey"
            columns: ["changed_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "behavior_case_audit_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "behavior_events"
            referencedColumns: ["id"]
          },
        ]
      }
      behavior_events: {
        Row: {
          academic_year: string
          created_at: string
          created_by: string
          description: string
          event_status: string
          id: string
          kind: string
          location: string | null
          note: string | null
          occurred_on: string
          outcomes: string[]
          parent_status: string
          score_delta: number
          semester: number
          student_id: string
          updated_at: string
        }
        Insert: {
          academic_year: string
          created_at?: string
          created_by?: string
          description: string
          event_status?: string
          id?: string
          kind: string
          location?: string | null
          note?: string | null
          occurred_on?: string
          outcomes?: string[]
          parent_status?: string
          score_delta: number
          semester: number
          student_id: string
          updated_at?: string
        }
        Update: {
          academic_year?: string
          created_at?: string
          created_by?: string
          description?: string
          event_status?: string
          id?: string
          kind?: string
          location?: string | null
          note?: string | null
          occurred_on?: string
          outcomes?: string[]
          parent_status?: string
          score_delta?: number
          semester?: number
          student_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "behavior_events_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "behavior_events_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
        ]
      }
      behavior_evidence: {
        Row: {
          created_at: string
          event_id: string
          file_name: string
          id: string
          mime_type: string
          storage_path: string
          uploaded_by: string
        }
        Insert: {
          created_at?: string
          event_id: string
          file_name: string
          id?: string
          mime_type: string
          storage_path: string
          uploaded_by?: string
        }
        Update: {
          created_at?: string
          event_id?: string
          file_name?: string
          id?: string
          mime_type?: string
          storage_path?: string
          uploaded_by?: string
        }
        Relationships: [
          {
            foreignKeyName: "behavior_evidence_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "behavior_events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "behavior_evidence_uploaded_by_fkey"
            columns: ["uploaded_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      behavior_managers: {
        Row: {
          assigned_at: string
          assigned_by: string | null
          user_id: string
        }
        Insert: {
          assigned_at?: string
          assigned_by?: string | null
          user_id: string
        }
        Update: {
          assigned_at?: string
          assigned_by?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "behavior_managers_assigned_by_fkey"
            columns: ["assigned_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "behavior_managers_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      behavior_settings: {
        Row: {
          good_min: number
          id: number
          monitor_min: number
          starting_score: number
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          good_min?: number
          id?: number
          monitor_min?: number
          starting_score?: number
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          good_min?: number
          id?: number
          monitor_min?: number
          starting_score?: number
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "behavior_settings_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      behavior_signatures: {
        Row: {
          collected_by: string
          event_id: string
          id: string
          signature_png: string
          signed_at: string
          signer_name: string
          signer_role: string
        }
        Insert: {
          collected_by?: string
          event_id: string
          id?: string
          signature_png: string
          signed_at?: string
          signer_name: string
          signer_role: string
        }
        Update: {
          collected_by?: string
          event_id?: string
          id?: string
          signature_png?: string
          signed_at?: string
          signer_name?: string
          signer_role?: string
        }
        Relationships: [
          {
            foreignKeyName: "behavior_signatures_collected_by_fkey"
            columns: ["collected_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "behavior_signatures_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "behavior_events"
            referencedColumns: ["id"]
          },
        ]
      }
      bnk_action_signatures: {
        Row: {
          action_code: string
          actor_user_id: string
          bucket_id: string | null
          document_id: string
          method: string
          selected_at: string
          signature_id: string | null
          storage_path: string | null
          system_code: string
        }
        Insert: {
          action_code: string
          actor_user_id: string
          bucket_id?: string | null
          document_id: string
          method: string
          selected_at?: string
          signature_id?: string | null
          storage_path?: string | null
          system_code: string
        }
        Update: {
          action_code?: string
          actor_user_id?: string
          bucket_id?: string | null
          document_id?: string
          method?: string
          selected_at?: string
          signature_id?: string | null
          storage_path?: string | null
          system_code?: string
        }
        Relationships: [
          {
            foreignKeyName: "bnk_action_signatures_system_code_fkey"
            columns: ["system_code"]
            isOneToOne: false
            referencedRelation: "approval_system_registry"
            referencedColumns: ["system_code"]
          },
        ]
      }
      budget_control_settings: {
        Row: {
          control_year: number
          created_at: string
          department_code: string
          last_number: number
          start_number: number
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          control_year: number
          created_at?: string
          department_code: string
          last_number?: number
          start_number?: number
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          control_year?: number
          created_at?: string
          department_code?: string
          last_number?: number
          start_number?: number
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "budget_control_settings_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      budget_disbursement_signers: {
        Row: {
          approved_at: string | null
          assigned_at: string
          assigned_by: string | null
          bucket_id: string | null
          disbursement_id: string
          id: string
          method: string
          signature_id: string | null
          signed_at: string | null
          signer_department_code: string | null
          signer_department_name: string | null
          signer_name: string | null
          signer_position: string | null
          slot: string
          storage_path: string | null
          updated_at: string
          user_id: string | null
        }
        Insert: {
          approved_at?: string | null
          assigned_at?: string
          assigned_by?: string | null
          bucket_id?: string | null
          disbursement_id: string
          id?: string
          method?: string
          signature_id?: string | null
          signed_at?: string | null
          signer_department_code?: string | null
          signer_department_name?: string | null
          signer_name?: string | null
          signer_position?: string | null
          slot: string
          storage_path?: string | null
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          approved_at?: string | null
          assigned_at?: string
          assigned_by?: string | null
          bucket_id?: string | null
          disbursement_id?: string
          id?: string
          method?: string
          signature_id?: string | null
          signed_at?: string | null
          signer_department_code?: string | null
          signer_department_name?: string | null
          signer_name?: string | null
          signer_position?: string | null
          slot?: string
          storage_path?: string | null
          updated_at?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "budget_disbursement_signers_assigned_by_fkey"
            columns: ["assigned_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "budget_disbursement_signers_disbursement_id_fkey"
            columns: ["disbursement_id"]
            isOneToOne: false
            referencedRelation: "budget_disbursements"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "budget_disbursement_signers_signature_id_fkey"
            columns: ["signature_id"]
            isOneToOne: false
            referencedRelation: "signatures"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "budget_disbursement_signers_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      budget_disbursements: {
        Row: {
          academic_year: number
          activity_id: string | null
          amount: number
          control_number: string | null
          control_sequence: number | null
          control_year: number | null
          created_at: string
          department_code: string
          description: string
          id: string
          line_items: Json
          notes: string | null
          paid_at: string | null
          prepared_at: string | null
          printed_at: string | null
          project_id: string
          request_date: string
          request_round: number
          requester_id: string
          requester_name: string
          semester: number
          signers: Json
          status: string
          updated_at: string
        }
        Insert: {
          academic_year: number
          activity_id?: string | null
          amount: number
          control_number?: string | null
          control_sequence?: number | null
          control_year?: number | null
          created_at?: string
          department_code: string
          description: string
          id?: string
          line_items?: Json
          notes?: string | null
          paid_at?: string | null
          prepared_at?: string | null
          printed_at?: string | null
          project_id: string
          request_date?: string
          request_round: number
          requester_id: string
          requester_name: string
          semester: number
          signers?: Json
          status?: string
          updated_at?: string
        }
        Update: {
          academic_year?: number
          activity_id?: string | null
          amount?: number
          control_number?: string | null
          control_sequence?: number | null
          control_year?: number | null
          created_at?: string
          department_code?: string
          description?: string
          id?: string
          line_items?: Json
          notes?: string | null
          paid_at?: string | null
          prepared_at?: string | null
          printed_at?: string | null
          project_id?: string
          request_date?: string
          request_round?: number
          requester_id?: string
          requester_name?: string
          semester?: number
          signers?: Json
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "budget_disbursements_activity_id_fkey"
            columns: ["activity_id"]
            isOneToOne: false
            referencedRelation: "project_activities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "budget_disbursements_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "school_projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "budget_disbursements_requester_id_fkey"
            columns: ["requester_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      deletion_audit_log: {
        Row: {
          deleted_at: string
          deleted_by: string | null
          deleted_by_name: string | null
          deleted_by_role: string | null
          entity_id: string | null
          entity_type: string
          id: number
          old_data: Json
        }
        Insert: {
          deleted_at?: string
          deleted_by?: string | null
          deleted_by_name?: string | null
          deleted_by_role?: string | null
          entity_id?: string | null
          entity_type: string
          id?: never
          old_data?: Json
        }
        Update: {
          deleted_at?: string
          deleted_by?: string | null
          deleted_by_name?: string | null
          deleted_by_role?: string | null
          entity_id?: string | null
          entity_type?: string
          id?: never
          old_data?: Json
        }
        Relationships: [
          {
            foreignKeyName: "deletion_audit_log_deleted_by_fkey"
            columns: ["deleted_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      departments: {
        Row: {
          code: string
          created_at: string
          id: string
          is_active: boolean
          name_en: string
          name_th: string
          sort_order: number
        }
        Insert: {
          code: string
          created_at?: string
          id?: string
          is_active?: boolean
          name_en: string
          name_th: string
          sort_order?: number
        }
        Update: {
          code?: string
          created_at?: string
          id?: string
          is_active?: boolean
          name_en?: string
          name_th?: string
          sort_order?: number
        }
        Relationships: []
      }
      edufee_audit: {
        Row: {
          action: string
          action_at: string
          actor_id: string | null
          id: number
          note: string | null
          payment_id: string
        }
        Insert: {
          action: string
          action_at?: string
          actor_id?: string | null
          id?: never
          note?: string | null
          payment_id: string
        }
        Update: {
          action?: string
          action_at?: string
          actor_id?: string | null
          id?: never
          note?: string | null
          payment_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "edufee_audit_actor_id_fkey"
            columns: ["actor_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "edufee_audit_payment_id_fkey"
            columns: ["payment_id"]
            isOneToOne: false
            referencedRelation: "edufee_payments"
            referencedColumns: ["id"]
          },
        ]
      }
      edufee_cycles: {
        Row: {
          academic_year: string
          category: string
          cycle: string
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          academic_year: string
          category: string
          cycle: string
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          academic_year?: string
          category?: string
          cycle?: string
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "edufee_cycles_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      edufee_payments: {
        Row: {
          academic_year: string
          amount: number
          category: string
          class_id: string
          id: string
          note: string | null
          paid_on: string
          payer_name: string | null
          recorded_at: string
          recorded_by: string
          request_id: string
          semester: number
          sequence_no: number
          student_id: string
          void_reason: string | null
          voided_at: string | null
          voided_by: string | null
        }
        Insert: {
          academic_year: string
          amount: number
          category: string
          class_id: string
          id?: string
          note?: string | null
          paid_on: string
          payer_name?: string | null
          recorded_at?: string
          recorded_by: string
          request_id: string
          semester: number
          sequence_no?: never
          student_id: string
          void_reason?: string | null
          voided_at?: string | null
          voided_by?: string | null
        }
        Update: {
          academic_year?: string
          amount?: number
          category?: string
          class_id?: string
          id?: string
          note?: string | null
          paid_on?: string
          payer_name?: string | null
          recorded_at?: string
          recorded_by?: string
          request_id?: string
          semester?: number
          sequence_no?: never
          student_id?: string
          void_reason?: string | null
          voided_at?: string | null
          voided_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "edufee_payments_class_id_fkey"
            columns: ["class_id"]
            isOneToOne: false
            referencedRelation: "school_classes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "edufee_payments_recorded_by_fkey"
            columns: ["recorded_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "edufee_payments_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "edufee_payments_voided_by_fkey"
            columns: ["voided_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      edufee_rates: {
        Row: {
          academic_year: string
          amount: number
          category: string
          semester: number
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          academic_year: string
          amount?: number
          category: string
          semester: number
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          academic_year?: string
          amount?: number
          category?: string
          semester?: number
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "edufee_rates_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      edufee_staff: {
        Row: {
          class_id: string | null
          created_at: string
          granted_by: string | null
          id: string
          role: string
          user_id: string
        }
        Insert: {
          class_id?: string | null
          created_at?: string
          granted_by?: string | null
          id?: string
          role: string
          user_id: string
        }
        Update: {
          class_id?: string | null
          created_at?: string
          granted_by?: string | null
          id?: string
          role?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "edufee_staff_class_id_fkey"
            columns: ["class_id"]
            isOneToOne: false
            referencedRelation: "school_classes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "edufee_staff_granted_by_fkey"
            columns: ["granted_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "edufee_staff_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      edufee_windows: {
        Row: {
          academic_year: string
          category: string
          enabled: boolean
          semester: number
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          academic_year: string
          category: string
          enabled?: boolean
          semester: number
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          academic_year?: string
          category?: string
          enabled?: boolean
          semester?: number
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "edufee_windows_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      electricity_events: {
        Row: {
          actor_id: string | null
          created_at: string
          event_type: string
          id: number
          note: string
          reading_id: string
        }
        Insert: {
          actor_id?: string | null
          created_at?: string
          event_type: string
          id?: never
          note?: string
          reading_id: string
        }
        Update: {
          actor_id?: string | null
          created_at?: string
          event_type?: string
          id?: never
          note?: string
          reading_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "electricity_events_actor_id_fkey"
            columns: ["actor_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "electricity_events_reading_id_fkey"
            columns: ["reading_id"]
            isOneToOne: false
            referencedRelation: "electricity_readings"
            referencedColumns: ["id"]
          },
        ]
      }
      electricity_meters: {
        Row: {
          created_at: string
          created_by: string | null
          house_label: string
          id: string
          is_active: boolean
          meter_code: string
          occupant_name: string
          occupant_user_id: string | null
          opening_reading: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          house_label: string
          id?: string
          is_active?: boolean
          meter_code: string
          occupant_name?: string
          occupant_user_id?: string | null
          opening_reading?: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          house_label?: string
          id?: string
          is_active?: boolean
          meter_code?: string
          occupant_name?: string
          occupant_user_id?: string | null
          opening_reading?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "electricity_meters_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "electricity_meters_occupant_user_id_fkey"
            columns: ["occupant_user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      electricity_periods: {
        Row: {
          billing_month: string
          created_at: string
          created_by: string | null
          due_date: string | null
          id: string
          status: string
          unit_rate: number
        }
        Insert: {
          billing_month: string
          created_at?: string
          created_by?: string | null
          due_date?: string | null
          id?: string
          status?: string
          unit_rate: number
        }
        Update: {
          billing_month?: string
          created_at?: string
          created_by?: string | null
          due_date?: string | null
          id?: string
          status?: string
          unit_rate?: number
        }
        Relationships: [
          {
            foreignKeyName: "electricity_periods_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      electricity_readings: {
        Row: {
          amount_due: number
          created_at: string
          created_by: string | null
          current_reading: number
          house_label_snapshot: string
          id: string
          meter_code_snapshot: string
          meter_id: string
          meter_photo_path: string
          paid_at: string | null
          payer_name_snapshot: string
          payer_user_id: string | null
          payment_reviewed_at: string | null
          payment_reviewed_by: string | null
          payment_slip_path: string | null
          period_id: string
          previous_reading: number
          reading_reviewed_at: string | null
          reading_reviewed_by: string | null
          receipt_issued_at: string | null
          receipt_no: string | null
          review_note: string
          status: string
          unit_rate: number
          updated_at: string
          used_units: number
        }
        Insert: {
          amount_due: number
          created_at?: string
          created_by?: string | null
          current_reading: number
          house_label_snapshot: string
          id?: string
          meter_code_snapshot: string
          meter_id: string
          meter_photo_path: string
          paid_at?: string | null
          payer_name_snapshot: string
          payer_user_id?: string | null
          payment_reviewed_at?: string | null
          payment_reviewed_by?: string | null
          payment_slip_path?: string | null
          period_id: string
          previous_reading: number
          reading_reviewed_at?: string | null
          reading_reviewed_by?: string | null
          receipt_issued_at?: string | null
          receipt_no?: string | null
          review_note?: string
          status?: string
          unit_rate: number
          updated_at?: string
          used_units: number
        }
        Update: {
          amount_due?: number
          created_at?: string
          created_by?: string | null
          current_reading?: number
          house_label_snapshot?: string
          id?: string
          meter_code_snapshot?: string
          meter_id?: string
          meter_photo_path?: string
          paid_at?: string | null
          payer_name_snapshot?: string
          payer_user_id?: string | null
          payment_reviewed_at?: string | null
          payment_reviewed_by?: string | null
          payment_slip_path?: string | null
          period_id?: string
          previous_reading?: number
          reading_reviewed_at?: string | null
          reading_reviewed_by?: string | null
          receipt_issued_at?: string | null
          receipt_no?: string | null
          review_note?: string
          status?: string
          unit_rate?: number
          updated_at?: string
          used_units?: number
        }
        Relationships: [
          {
            foreignKeyName: "electricity_readings_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "electricity_readings_meter_id_fkey"
            columns: ["meter_id"]
            isOneToOne: false
            referencedRelation: "electricity_meters"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "electricity_readings_payer_user_id_fkey"
            columns: ["payer_user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "electricity_readings_payment_reviewed_by_fkey"
            columns: ["payment_reviewed_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "electricity_readings_period_id_fkey"
            columns: ["period_id"]
            isOneToOne: false
            referencedRelation: "electricity_periods"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "electricity_readings_reading_reviewed_by_fkey"
            columns: ["reading_reviewed_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      electricity_receipt_counters: {
        Row: {
          last_no: number
          receipt_year: number
        }
        Insert: {
          last_no?: number
          receipt_year: number
        }
        Update: {
          last_no?: number
          receipt_year?: number
        }
        Relationships: []
      }
      electricity_settings: {
        Row: {
          bank_account_name: string
          bank_account_no: string
          bank_name: string
          default_rate: number
          id: number
          manager_user_id: string | null
          payment_instructions: string
          receipt_signatory: string
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          bank_account_name?: string
          bank_account_no?: string
          bank_name?: string
          default_rate?: number
          id?: number
          manager_user_id?: string | null
          payment_instructions?: string
          receipt_signatory?: string
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          bank_account_name?: string
          bank_account_no?: string
          bank_name?: string
          default_rate?: number
          id?: number
          manager_user_id?: string | null
          payment_instructions?: string
          receipt_signatory?: string
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "electricity_settings_manager_user_id_fkey"
            columns: ["manager_user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "electricity_settings_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      home_visit_household_members: {
        Row: {
          age: number | null
          citizen_id: string | null
          created_at: string
          education_level: string | null
          full_name: string
          has_chronic_disease: boolean
          has_disability: boolean
          id: string
          income_agriculture: number
          income_business: number
          income_other: number
          income_wage: number
          income_welfare: number
          member_no: number
          record_id: string
          relationship: string | null
          total_income: number | null
          updated_at: string
        }
        Insert: {
          age?: number | null
          citizen_id?: string | null
          created_at?: string
          education_level?: string | null
          full_name: string
          has_chronic_disease?: boolean
          has_disability?: boolean
          id?: string
          income_agriculture?: number
          income_business?: number
          income_other?: number
          income_wage?: number
          income_welfare?: number
          member_no: number
          record_id: string
          relationship?: string | null
          total_income?: number | null
          updated_at?: string
        }
        Update: {
          age?: number | null
          citizen_id?: string | null
          created_at?: string
          education_level?: string | null
          full_name?: string
          has_chronic_disease?: boolean
          has_disability?: boolean
          id?: string
          income_agriculture?: number
          income_business?: number
          income_other?: number
          income_wage?: number
          income_welfare?: number
          member_no?: number
          record_id?: string
          relationship?: string | null
          total_income?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "home_visit_household_members_record_id_fkey"
            columns: ["record_id"]
            isOneToOne: false
            referencedRelation: "home_visit_records"
            referencedColumns: ["id"]
          },
        ]
      }
      home_visit_photos: {
        Row: {
          bucket_id: string
          caption: string | null
          created_at: string
          id: string
          kind: string
          record_id: string
          storage_path: string
          uploaded_by: string
        }
        Insert: {
          bucket_id?: string
          caption?: string | null
          created_at?: string
          id?: string
          kind: string
          record_id: string
          storage_path: string
          uploaded_by: string
        }
        Update: {
          bucket_id?: string
          caption?: string | null
          created_at?: string
          id?: string
          kind?: string
          record_id?: string
          storage_path?: string
          uploaded_by?: string
        }
        Relationships: [
          {
            foreignKeyName: "home_visit_photos_record_id_fkey"
            columns: ["record_id"]
            isOneToOne: false
            referencedRelation: "home_visit_records"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "home_visit_photos_uploaded_by_fkey"
            columns: ["uploaded_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      home_visit_records: {
        Row: {
          academic_year: string
          class_id: string
          class_label: string
          completed_at: string | null
          created_at: string
          form_data: Json
          homeroom_teacher_id: string | null
          homeroom_teacher_name: string | null
          id: string
          recorder_id: string
          recorder_name: string
          semester: number
          status: string
          student_citizen_or_g: string | null
          student_first_name: string
          student_id: string | null
          student_last_name: string
          updated_at: string
        }
        Insert: {
          academic_year: string
          class_id: string
          class_label: string
          completed_at?: string | null
          created_at?: string
          form_data?: Json
          homeroom_teacher_id?: string | null
          homeroom_teacher_name?: string | null
          id?: string
          recorder_id: string
          recorder_name: string
          semester: number
          status?: string
          student_citizen_or_g?: string | null
          student_first_name: string
          student_id?: string | null
          student_last_name: string
          updated_at?: string
        }
        Update: {
          academic_year?: string
          class_id?: string
          class_label?: string
          completed_at?: string | null
          created_at?: string
          form_data?: Json
          homeroom_teacher_id?: string | null
          homeroom_teacher_name?: string | null
          id?: string
          recorder_id?: string
          recorder_name?: string
          semester?: number
          status?: string
          student_citizen_or_g?: string | null
          student_first_name?: string
          student_id?: string | null
          student_last_name?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "home_visit_records_class_id_fkey"
            columns: ["class_id"]
            isOneToOne: false
            referencedRelation: "school_classes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "home_visit_records_homeroom_teacher_id_fkey"
            columns: ["homeroom_teacher_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "home_visit_records_recorder_id_fkey"
            columns: ["recorder_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "home_visit_records_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
        ]
      }
      home_visit_settings: {
        Row: {
          academic_year: string
          after_message: string
          before_message: string
          closed_message: string
          end_date: string | null
          is_open: boolean
          semester: number
          start_date: string | null
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          academic_year: string
          after_message?: string
          before_message?: string
          closed_message?: string
          end_date?: string | null
          is_open?: boolean
          semester: number
          start_date?: string | null
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          academic_year?: string
          after_message?: string
          before_message?: string
          closed_message?: string
          end_date?: string | null
          is_open?: boolean
          semester?: number
          start_date?: string | null
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "home_visit_settings_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      home_visit_signatures: {
        Row: {
          bucket_id: string | null
          id: string
          metadata: Json
          method: string
          method_selected_at: string
          method_selected_by: string | null
          record_id: string
          signature_id: string | null
          signed_at: string | null
          signed_by_user_id: string | null
          signer_name: string | null
          signer_position: string | null
          signer_type: string
          storage_path: string | null
        }
        Insert: {
          bucket_id?: string | null
          id?: string
          metadata?: Json
          method: string
          method_selected_at?: string
          method_selected_by?: string | null
          record_id: string
          signature_id?: string | null
          signed_at?: string | null
          signed_by_user_id?: string | null
          signer_name?: string | null
          signer_position?: string | null
          signer_type: string
          storage_path?: string | null
        }
        Update: {
          bucket_id?: string | null
          id?: string
          metadata?: Json
          method?: string
          method_selected_at?: string
          method_selected_by?: string | null
          record_id?: string
          signature_id?: string | null
          signed_at?: string | null
          signed_by_user_id?: string | null
          signer_name?: string | null
          signer_position?: string | null
          signer_type?: string
          storage_path?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "home_visit_signatures_method_selected_by_fkey"
            columns: ["method_selected_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "home_visit_signatures_record_id_fkey"
            columns: ["record_id"]
            isOneToOne: false
            referencedRelation: "home_visit_records"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "home_visit_signatures_signature_id_fkey"
            columns: ["signature_id"]
            isOneToOne: false
            referencedRelation: "signatures"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "home_visit_signatures_signed_by_user_id_fkey"
            columns: ["signed_by_user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      homeroom_teachers: {
        Row: {
          assigned_by: string | null
          class_id: string
          created_at: string
          id: string
          teacher_id: string
        }
        Insert: {
          assigned_by?: string | null
          class_id: string
          created_at?: string
          id?: string
          teacher_id: string
        }
        Update: {
          assigned_by?: string | null
          class_id?: string
          created_at?: string
          id?: string
          teacher_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "homeroom_teachers_assigned_by_fkey"
            columns: ["assigned_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "homeroom_teachers_class_id_fkey"
            columns: ["class_id"]
            isOneToOne: false
            referencedRelation: "school_classes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "homeroom_teachers_teacher_id_fkey"
            columns: ["teacher_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      learning_source_photos: {
        Row: {
          bucket_id: string
          caption: string | null
          created_at: string
          created_by: string
          file_name: string | null
          file_size: number | null
          id: string
          is_cover: boolean
          mime_type: string | null
          sort_order: number
          source_id: string
          storage_path: string
        }
        Insert: {
          bucket_id?: string
          caption?: string | null
          created_at?: string
          created_by?: string
          file_name?: string | null
          file_size?: number | null
          id?: string
          is_cover?: boolean
          mime_type?: string | null
          sort_order?: number
          source_id: string
          storage_path: string
        }
        Update: {
          bucket_id?: string
          caption?: string | null
          created_at?: string
          created_by?: string
          file_name?: string | null
          file_size?: number | null
          id?: string
          is_cover?: boolean
          mime_type?: string | null
          sort_order?: number
          source_id?: string
          storage_path?: string
        }
        Relationships: [
          {
            foreignKeyName: "learning_source_photos_source_id_fkey"
            columns: ["source_id"]
            isOneToOne: false
            referencedRelation: "learning_sources"
            referencedColumns: ["id"]
          },
        ]
      }
      learning_sources: {
        Row: {
          address_text: string | null
          approved_at: string | null
          approved_by: string | null
          capacity: number | null
          category: string
          contact_name: string | null
          contact_phone: string | null
          created_at: string
          created_by: string
          description: string
          facilities: string | null
          grade_levels: string[]
          id: string
          latitude: number | null
          learning_value: string
          location_text: string | null
          longitude: number | null
          name: string
          notes: string | null
          opening_hours: string | null
          organization_name: string | null
          source_scope: string
          status: string
          subject_areas: string[]
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          address_text?: string | null
          approved_at?: string | null
          approved_by?: string | null
          capacity?: number | null
          category: string
          contact_name?: string | null
          contact_phone?: string | null
          created_at?: string
          created_by?: string
          description?: string
          facilities?: string | null
          grade_levels?: string[]
          id?: string
          latitude?: number | null
          learning_value?: string
          location_text?: string | null
          longitude?: number | null
          name: string
          notes?: string | null
          opening_hours?: string | null
          organization_name?: string | null
          source_scope: string
          status?: string
          subject_areas?: string[]
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          address_text?: string | null
          approved_at?: string | null
          approved_by?: string | null
          capacity?: number | null
          category?: string
          contact_name?: string | null
          contact_phone?: string | null
          created_at?: string
          created_by?: string
          description?: string
          facilities?: string | null
          grade_levels?: string[]
          id?: string
          latitude?: number | null
          learning_value?: string
          location_text?: string | null
          longitude?: number | null
          name?: string
          notes?: string | null
          opening_hours?: string | null
          organization_name?: string | null
          source_scope?: string
          status?: string
          subject_areas?: string[]
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: []
      }
      leave_actions: {
        Row: {
          action: string
          actor_id: string
          actor_name: string
          actor_role: string
          comment: string | null
          created_at: string
          from_status: string | null
          id: string
          leave_request_id: string
          to_status: string
        }
        Insert: {
          action: string
          actor_id: string
          actor_name: string
          actor_role: string
          comment?: string | null
          created_at?: string
          from_status?: string | null
          id?: string
          leave_request_id: string
          to_status: string
        }
        Update: {
          action?: string
          actor_id?: string
          actor_name?: string
          actor_role?: string
          comment?: string | null
          created_at?: string
          from_status?: string | null
          id?: string
          leave_request_id?: string
          to_status?: string
        }
        Relationships: [
          {
            foreignKeyName: "leave_actions_actor_id_fkey"
            columns: ["actor_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "leave_actions_leave_request_id_fkey"
            columns: ["leave_request_id"]
            isOneToOne: false
            referencedRelation: "leave_requests"
            referencedColumns: ["id"]
          },
        ]
      }
      leave_requests: {
        Row: {
          academic_year: number
          affects_teaching_schedule: boolean
          approval_version: number
          approved_at: string | null
          contact_during_leave: string | null
          contact_phone: string | null
          created_at: string
          director_approval_automatic: boolean
          director_comment: string | null
          director_reviewed_at: string | null
          director_reviewer_id: string | null
          director_reviewer_name: string | null
          director_signature_id: string | null
          end_date: string
          id: string
          leave_days: number
          leave_type_code: string
          leave_year: number
          other_leave_text: string | null
          personnel_comment: string | null
          personnel_reviewed_at: string | null
          personnel_reviewer_id: string | null
          personnel_reviewer_name: string | null
          reason: string
          request_no: number
          requester_id: string
          requester_name: string
          requester_position: string | null
          requester_role: string
          semester: number
          start_date: string
          status: string
          submitted_at: string | null
          updated_at: string
        }
        Insert: {
          academic_year: number
          affects_teaching_schedule?: boolean
          approval_version?: number
          approved_at?: string | null
          contact_during_leave?: string | null
          contact_phone?: string | null
          created_at?: string
          director_approval_automatic?: boolean
          director_comment?: string | null
          director_reviewed_at?: string | null
          director_reviewer_id?: string | null
          director_reviewer_name?: string | null
          director_signature_id?: string | null
          end_date: string
          id?: string
          leave_days?: number
          leave_type_code: string
          leave_year: number
          other_leave_text?: string | null
          personnel_comment?: string | null
          personnel_reviewed_at?: string | null
          personnel_reviewer_id?: string | null
          personnel_reviewer_name?: string | null
          reason: string
          request_no?: never
          requester_id: string
          requester_name: string
          requester_position?: string | null
          requester_role: string
          semester: number
          start_date: string
          status?: string
          submitted_at?: string | null
          updated_at?: string
        }
        Update: {
          academic_year?: number
          affects_teaching_schedule?: boolean
          approval_version?: number
          approved_at?: string | null
          contact_during_leave?: string | null
          contact_phone?: string | null
          created_at?: string
          director_approval_automatic?: boolean
          director_comment?: string | null
          director_reviewed_at?: string | null
          director_reviewer_id?: string | null
          director_reviewer_name?: string | null
          director_signature_id?: string | null
          end_date?: string
          id?: string
          leave_days?: number
          leave_type_code?: string
          leave_year?: number
          other_leave_text?: string | null
          personnel_comment?: string | null
          personnel_reviewed_at?: string | null
          personnel_reviewer_id?: string | null
          personnel_reviewer_name?: string | null
          reason?: string
          request_no?: never
          requester_id?: string
          requester_name?: string
          requester_position?: string | null
          requester_role?: string
          semester?: number
          start_date?: string
          status?: string
          submitted_at?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "leave_requests_director_reviewer_id_fkey"
            columns: ["director_reviewer_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "leave_requests_director_signature_id_fkey"
            columns: ["director_signature_id"]
            isOneToOne: false
            referencedRelation: "signatures"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "leave_requests_leave_type_code_fkey"
            columns: ["leave_type_code"]
            isOneToOne: false
            referencedRelation: "leave_types"
            referencedColumns: ["code"]
          },
          {
            foreignKeyName: "leave_requests_personnel_reviewer_id_fkey"
            columns: ["personnel_reviewer_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "leave_requests_requester_id_fkey"
            columns: ["requester_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      leave_types: {
        Row: {
          code: string
          counts_against_quota: boolean
          created_at: string
          description_th: string | null
          is_active: boolean
          name_th: string
          sort_order: number
        }
        Insert: {
          code: string
          counts_against_quota?: boolean
          created_at?: string
          description_th?: string | null
          is_active?: boolean
          name_th: string
          sort_order?: number
        }
        Update: {
          code?: string
          counts_against_quota?: boolean
          created_at?: string
          description_th?: string | null
          is_active?: boolean
          name_th?: string
          sort_order?: number
        }
        Relationships: []
      }
      lesson_plan_files: {
        Row: {
          attachment_type: string
          bucket_id: string | null
          created_at: string
          external_url: string | null
          file_name: string
          file_size: number | null
          id: string
          lesson_plan_id: string
          mime_type: string | null
          storage_path: string | null
          uploaded_by: string
        }
        Insert: {
          attachment_type?: string
          bucket_id?: string | null
          created_at?: string
          external_url?: string | null
          file_name: string
          file_size?: number | null
          id?: string
          lesson_plan_id: string
          mime_type?: string | null
          storage_path?: string | null
          uploaded_by: string
        }
        Update: {
          attachment_type?: string
          bucket_id?: string | null
          created_at?: string
          external_url?: string | null
          file_name?: string
          file_size?: number | null
          id?: string
          lesson_plan_id?: string
          mime_type?: string | null
          storage_path?: string | null
          uploaded_by?: string
        }
        Relationships: [
          {
            foreignKeyName: "lesson_plan_files_lesson_plan_id_fkey"
            columns: ["lesson_plan_id"]
            isOneToOne: false
            referencedRelation: "lesson_plans"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lesson_plan_files_uploaded_by_fkey"
            columns: ["uploaded_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      lesson_plans: {
        Row: {
          academic_year: string
          activities: string | null
          approval_version: number
          approved_at: string | null
          assessment: string | null
          class_level: string | null
          content_summary: string | null
          created_at: string
          department_id: string
          director_approval_automatic: boolean
          director_decision: string
          director_reviewed_at: string | null
          director_reviewer_id: string | null
          head_decision: string
          head_reviewed_at: string | null
          head_reviewer_id: string | null
          id: string
          learning_objectives: string | null
          learning_unit: string | null
          plan_type: string
          revision_note: string | null
          semester: number
          status: string
          subject_code: string | null
          subject_name: string
          submitted_at: string | null
          teach_date: string | null
          teacher_id: string
          teacher_name: string | null
          term_id: string | null
          topic: string | null
          updated_at: string
          week_number: number | null
        }
        Insert: {
          academic_year: string
          activities?: string | null
          approval_version?: number
          approved_at?: string | null
          assessment?: string | null
          class_level?: string | null
          content_summary?: string | null
          created_at?: string
          department_id: string
          director_approval_automatic?: boolean
          director_decision?: string
          director_reviewed_at?: string | null
          director_reviewer_id?: string | null
          head_decision?: string
          head_reviewed_at?: string | null
          head_reviewer_id?: string | null
          id?: string
          learning_objectives?: string | null
          learning_unit?: string | null
          plan_type?: string
          revision_note?: string | null
          semester: number
          status?: string
          subject_code?: string | null
          subject_name: string
          submitted_at?: string | null
          teach_date?: string | null
          teacher_id: string
          teacher_name?: string | null
          term_id?: string | null
          topic?: string | null
          updated_at?: string
          week_number?: number | null
        }
        Update: {
          academic_year?: string
          activities?: string | null
          approval_version?: number
          approved_at?: string | null
          assessment?: string | null
          class_level?: string | null
          content_summary?: string | null
          created_at?: string
          department_id?: string
          director_approval_automatic?: boolean
          director_decision?: string
          director_reviewed_at?: string | null
          director_reviewer_id?: string | null
          head_decision?: string
          head_reviewed_at?: string | null
          head_reviewer_id?: string | null
          id?: string
          learning_objectives?: string | null
          learning_unit?: string | null
          plan_type?: string
          revision_note?: string | null
          semester?: number
          status?: string
          subject_code?: string | null
          subject_name?: string
          submitted_at?: string | null
          teach_date?: string | null
          teacher_id?: string
          teacher_name?: string | null
          term_id?: string | null
          topic?: string | null
          updated_at?: string
          week_number?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "lesson_plans_department_id_fkey"
            columns: ["department_id"]
            isOneToOne: false
            referencedRelation: "departments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lesson_plans_director_reviewer_id_fkey"
            columns: ["director_reviewer_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lesson_plans_head_reviewer_id_fkey"
            columns: ["head_reviewer_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lesson_plans_teacher_id_fkey"
            columns: ["teacher_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lesson_plans_term_id_fkey"
            columns: ["term_id"]
            isOneToOne: false
            referencedRelation: "academic_terms"
            referencedColumns: ["id"]
          },
        ]
      }
      modules: {
        Row: {
          code: string
          created_at: string
          department_id: string
          id: string
          is_active: boolean
          name_en: string
          name_th: string
          route: string
          sort_order: number
        }
        Insert: {
          code: string
          created_at?: string
          department_id: string
          id?: string
          is_active?: boolean
          name_en: string
          name_th: string
          route: string
          sort_order?: number
        }
        Update: {
          code?: string
          created_at?: string
          department_id?: string
          id?: string
          is_active?: boolean
          name_en?: string
          name_th?: string
          route?: string
          sort_order?: number
        }
        Relationships: [
          {
            foreignKeyName: "modules_department_id_fkey"
            columns: ["department_id"]
            isOneToOne: false
            referencedRelation: "departments"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          action_url: string | null
          created_at: string
          dismissed_at: string | null
          entity_id: string | null
          entity_type: string | null
          id: string
          message: string
          notification_kind: string
          read_at: string | null
          recipient_id: string
          resolved_at: string | null
          title: string
          type: string
          workflow_key: string | null
        }
        Insert: {
          action_url?: string | null
          created_at?: string
          dismissed_at?: string | null
          entity_id?: string | null
          entity_type?: string | null
          id?: string
          message: string
          notification_kind?: string
          read_at?: string | null
          recipient_id: string
          resolved_at?: string | null
          title: string
          type: string
          workflow_key?: string | null
        }
        Update: {
          action_url?: string | null
          created_at?: string
          dismissed_at?: string | null
          entity_id?: string | null
          entity_type?: string | null
          id?: string
          message?: string
          notification_kind?: string
          read_at?: string | null
          recipient_id?: string
          resolved_at?: string | null
          title?: string
          type?: string
          workflow_key?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "notifications_recipient_id_fkey"
            columns: ["recipient_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      official_attendance_day_settings: {
        Row: {
          attendance_date: string
          attendance_mode: string | null
          checkin_close_time: string | null
          checkin_open_time: string | null
          is_open: boolean
          note: string | null
          ontime_until: string | null
          updated_at: string
          updated_by: string | null
          work_end_time: string | null
        }
        Insert: {
          attendance_date: string
          attendance_mode?: string | null
          checkin_close_time?: string | null
          checkin_open_time?: string | null
          is_open?: boolean
          note?: string | null
          ontime_until?: string | null
          updated_at?: string
          updated_by?: string | null
          work_end_time?: string | null
        }
        Update: {
          attendance_date?: string
          attendance_mode?: string | null
          checkin_close_time?: string | null
          checkin_open_time?: string | null
          is_open?: boolean
          note?: string | null
          ontime_until?: string | null
          updated_at?: string
          updated_by?: string | null
          work_end_time?: string | null
        }
        Relationships: []
      }
      official_attendance_duty_records: {
        Row: {
          created_at: string
          created_by: string
          duty_date: string
          duty_location: string | null
          duty_type: string
          id: string
          note: string | null
          updated_at: string
          updated_by: string | null
          user_id: string
        }
        Insert: {
          created_at?: string
          created_by: string
          duty_date: string
          duty_location?: string | null
          duty_type?: string
          id?: string
          note?: string | null
          updated_at?: string
          updated_by?: string | null
          user_id: string
        }
        Update: {
          created_at?: string
          created_by?: string
          duty_date?: string
          duty_location?: string | null
          duty_type?: string
          id?: string
          note?: string | null
          updated_at?: string
          updated_by?: string | null
          user_id?: string
        }
        Relationships: []
      }
      official_attendance_records: {
        Row: {
          accuracy_m: number | null
          attendance_date: string
          checkin_at: string
          checkin_method: string
          created_at: string
          distance_m: number
          face_liveness_score: number | null
          face_match_distance: number | null
          id: string
          latitude: number
          longitude: number
          ontime_until_snapshot: string
          person_name: string
          person_role: string
          position_title: string | null
          qr_generation: number | null
          signature_bucket: string | null
          signature_id: string | null
          signature_label: string | null
          signature_path: string | null
          status: string
          user_id: string
          work_end_time_snapshot: string
        }
        Insert: {
          accuracy_m?: number | null
          attendance_date: string
          checkin_at?: string
          checkin_method?: string
          created_at?: string
          distance_m: number
          face_liveness_score?: number | null
          face_match_distance?: number | null
          id?: string
          latitude: number
          longitude: number
          ontime_until_snapshot: string
          person_name: string
          person_role: string
          position_title?: string | null
          qr_generation?: number | null
          signature_bucket?: string | null
          signature_id?: string | null
          signature_label?: string | null
          signature_path?: string | null
          status: string
          user_id: string
          work_end_time_snapshot: string
        }
        Update: {
          accuracy_m?: number | null
          attendance_date?: string
          checkin_at?: string
          checkin_method?: string
          created_at?: string
          distance_m?: number
          face_liveness_score?: number | null
          face_match_distance?: number | null
          id?: string
          latitude?: number
          longitude?: number
          ontime_until_snapshot?: string
          person_name?: string
          person_role?: string
          position_title?: string | null
          qr_generation?: number | null
          signature_bucket?: string | null
          signature_id?: string | null
          signature_label?: string | null
          signature_path?: string | null
          status?: string
          user_id?: string
          work_end_time_snapshot?: string
        }
        Relationships: [
          {
            foreignKeyName: "official_attendance_records_signature_id_fkey"
            columns: ["signature_id"]
            isOneToOne: false
            referencedRelation: "signatures"
            referencedColumns: ["id"]
          },
        ]
      }
      official_attendance_settings: {
        Row: {
          active_from: string | null
          active_to: string | null
          allowed_radius_m: number
          attendance_mode: string
          checkin_close_time: string
          checkin_open_time: string
          enabled: boolean
          face_match_threshold: number
          friday: boolean
          id: number
          max_accuracy_m: number
          monday: boolean
          ontime_until: string
          saturday: boolean
          school_latitude: number | null
          school_longitude: number | null
          sunday: boolean
          test_center_enabled: boolean
          thursday: boolean
          tuesday: boolean
          updated_at: string
          updated_by: string | null
          wednesday: boolean
          work_end_time: string
        }
        Insert: {
          active_from?: string | null
          active_to?: string | null
          allowed_radius_m?: number
          attendance_mode?: string
          checkin_close_time?: string
          checkin_open_time?: string
          enabled?: boolean
          face_match_threshold?: number
          friday?: boolean
          id?: number
          max_accuracy_m?: number
          monday?: boolean
          ontime_until?: string
          saturday?: boolean
          school_latitude?: number | null
          school_longitude?: number | null
          sunday?: boolean
          test_center_enabled?: boolean
          thursday?: boolean
          tuesday?: boolean
          updated_at?: string
          updated_by?: string | null
          wednesday?: boolean
          work_end_time?: string
        }
        Update: {
          active_from?: string | null
          active_to?: string | null
          allowed_radius_m?: number
          attendance_mode?: string
          checkin_close_time?: string
          checkin_open_time?: string
          enabled?: boolean
          face_match_threshold?: number
          friday?: boolean
          id?: number
          max_accuracy_m?: number
          monday?: boolean
          ontime_until?: string
          saturday?: boolean
          school_latitude?: number | null
          school_longitude?: number | null
          sunday?: boolean
          test_center_enabled?: boolean
          thursday?: boolean
          tuesday?: boolean
          updated_at?: string
          updated_by?: string | null
          wednesday?: boolean
          work_end_time?: string
        }
        Relationships: []
      }
      personnel_pa_assessment_audit: {
        Row: {
          action: string
          actor_role: string | null
          actor_user_id: string | null
          assessment_id: string
          assessment_snapshot: Json
          committee_member_id: string
          created_at: string
          evaluatee_user_id: string
          id: string
          period_id: string
          reason: string | null
        }
        Insert: {
          action: string
          actor_role?: string | null
          actor_user_id?: string | null
          assessment_id: string
          assessment_snapshot: Json
          committee_member_id: string
          created_at?: string
          evaluatee_user_id: string
          id?: string
          period_id: string
          reason?: string | null
        }
        Update: {
          action?: string
          actor_role?: string | null
          actor_user_id?: string | null
          assessment_id?: string
          assessment_snapshot?: Json
          committee_member_id?: string
          created_at?: string
          evaluatee_user_id?: string
          id?: string
          period_id?: string
          reason?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "personnel_pa_assessment_audit_actor_user_id_fkey"
            columns: ["actor_user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      personnel_pa_assessments: {
        Row: {
          committee_member_id: string
          committee_role_snapshot: string | null
          committee_slot_snapshot: number | null
          created_at: string
          created_by: string | null
          entered_by: string | null
          entry_mode: string
          evaluatee_user_id: string
          evaluator_comment: string | null
          evaluator_name_snapshot: string | null
          evaluator_organization_snapshot: string | null
          evaluator_position_snapshot: string | null
          evaluator_signature_bucket_snapshot: string | null
          evaluator_signature_method_snapshot: string | null
          evaluator_signature_mime_snapshot: string | null
          evaluator_signature_path_snapshot: string | null
          id: string
          pa_report_id: string
          passed: boolean
          period_id: string
          section1_levels: Json
          section1_total: number
          section2_levels: Json
          section2_total: number
          status: string
          submitted_at: string | null
          total_score: number
          updated_at: string
          updated_by: string | null
          workload_compliant: boolean | null
        }
        Insert: {
          committee_member_id: string
          committee_role_snapshot?: string | null
          committee_slot_snapshot?: number | null
          created_at?: string
          created_by?: string | null
          entered_by?: string | null
          entry_mode?: string
          evaluatee_user_id: string
          evaluator_comment?: string | null
          evaluator_name_snapshot?: string | null
          evaluator_organization_snapshot?: string | null
          evaluator_position_snapshot?: string | null
          evaluator_signature_bucket_snapshot?: string | null
          evaluator_signature_method_snapshot?: string | null
          evaluator_signature_mime_snapshot?: string | null
          evaluator_signature_path_snapshot?: string | null
          id?: string
          pa_report_id: string
          passed?: boolean
          period_id: string
          section1_levels?: Json
          section1_total?: number
          section2_levels?: Json
          section2_total?: number
          status?: string
          submitted_at?: string | null
          total_score?: number
          updated_at?: string
          updated_by?: string | null
          workload_compliant?: boolean | null
        }
        Update: {
          committee_member_id?: string
          committee_role_snapshot?: string | null
          committee_slot_snapshot?: number | null
          created_at?: string
          created_by?: string | null
          entered_by?: string | null
          entry_mode?: string
          evaluatee_user_id?: string
          evaluator_comment?: string | null
          evaluator_name_snapshot?: string | null
          evaluator_organization_snapshot?: string | null
          evaluator_position_snapshot?: string | null
          evaluator_signature_bucket_snapshot?: string | null
          evaluator_signature_method_snapshot?: string | null
          evaluator_signature_mime_snapshot?: string | null
          evaluator_signature_path_snapshot?: string | null
          id?: string
          pa_report_id?: string
          passed?: boolean
          period_id?: string
          section1_levels?: Json
          section1_total?: number
          section2_levels?: Json
          section2_total?: number
          status?: string
          submitted_at?: string | null
          total_score?: number
          updated_at?: string
          updated_by?: string | null
          workload_compliant?: boolean | null
        }
        Relationships: [
          {
            foreignKeyName: "personnel_pa_assessments_committee_member_id_fkey"
            columns: ["committee_member_id"]
            isOneToOne: false
            referencedRelation: "personnel_pa_period_committee_members"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "personnel_pa_assessments_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "personnel_pa_assessments_entered_by_fkey"
            columns: ["entered_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "personnel_pa_assessments_evaluatee_user_id_fkey"
            columns: ["evaluatee_user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "personnel_pa_assessments_pa_report_id_fkey"
            columns: ["pa_report_id"]
            isOneToOne: false
            referencedRelation: "personnel_pa_reports"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "personnel_pa_assessments_period_id_fkey"
            columns: ["period_id"]
            isOneToOne: false
            referencedRelation: "personnel_pa_periods"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "personnel_pa_assessments_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      personnel_pa_committee_members: {
        Row: {
          created_at: string
          created_by: string | null
          evaluatee_user_id: string
          evaluator_name: string
          evaluator_organization: string | null
          evaluator_position: string | null
          evaluator_user_id: string | null
          id: string
          member_role: string
          period_id: string
          slot_no: number
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          evaluatee_user_id: string
          evaluator_name: string
          evaluator_organization?: string | null
          evaluator_position?: string | null
          evaluator_user_id?: string | null
          id?: string
          member_role: string
          period_id: string
          slot_no: number
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          created_at?: string
          created_by?: string | null
          evaluatee_user_id?: string
          evaluator_name?: string
          evaluator_organization?: string | null
          evaluator_position?: string | null
          evaluator_user_id?: string | null
          id?: string
          member_role?: string
          period_id?: string
          slot_no?: number
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "personnel_pa_committee_members_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "personnel_pa_committee_members_evaluatee_user_id_fkey"
            columns: ["evaluatee_user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "personnel_pa_committee_members_evaluator_user_id_fkey"
            columns: ["evaluator_user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "personnel_pa_committee_members_period_id_fkey"
            columns: ["period_id"]
            isOneToOne: false
            referencedRelation: "personnel_pa_periods"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "personnel_pa_committee_members_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      personnel_pa_evaluator_accounts: {
        Row: {
          account_initialized_at: string | null
          auth_user_id: string | null
          created_at: string
          full_name: string | null
          login_email: string
          organization: string | null
          position_title: string | null
          profile_completed_at: string | null
          profile_reset_at: string | null
          profile_reset_by: string | null
          signature_bucket: string | null
          signature_method: string
          signature_method_selected_at: string | null
          signature_mime_type: string | null
          signature_path: string | null
          slot_no: number
          updated_at: string
        }
        Insert: {
          account_initialized_at?: string | null
          auth_user_id?: string | null
          created_at?: string
          full_name?: string | null
          login_email: string
          organization?: string | null
          position_title?: string | null
          profile_completed_at?: string | null
          profile_reset_at?: string | null
          profile_reset_by?: string | null
          signature_bucket?: string | null
          signature_method?: string
          signature_method_selected_at?: string | null
          signature_mime_type?: string | null
          signature_path?: string | null
          slot_no: number
          updated_at?: string
        }
        Update: {
          account_initialized_at?: string | null
          auth_user_id?: string | null
          created_at?: string
          full_name?: string | null
          login_email?: string
          organization?: string | null
          position_title?: string | null
          profile_completed_at?: string | null
          profile_reset_at?: string | null
          profile_reset_by?: string | null
          signature_bucket?: string | null
          signature_method?: string
          signature_method_selected_at?: string | null
          signature_mime_type?: string | null
          signature_path?: string | null
          slot_no?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "personnel_pa_evaluator_accounts_profile_reset_by_fkey"
            columns: ["profile_reset_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      personnel_pa_evaluator_profile_audit: {
        Row: {
          action: string
          actor_user_id: string | null
          auth_user_id: string | null
          created_at: string
          id: string
          profile_snapshot: Json
          reason: string | null
          slot_no: number
        }
        Insert: {
          action: string
          actor_user_id?: string | null
          auth_user_id?: string | null
          created_at?: string
          id?: string
          profile_snapshot?: Json
          reason?: string | null
          slot_no: number
        }
        Update: {
          action?: string
          actor_user_id?: string | null
          auth_user_id?: string | null
          created_at?: string
          id?: string
          profile_snapshot?: Json
          reason?: string | null
          slot_no?: number
        }
        Relationships: [
          {
            foreignKeyName: "personnel_pa_evaluator_profile_audit_actor_user_id_fkey"
            columns: ["actor_user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      personnel_pa_period_committee_members: {
        Row: {
          confirmed_at: string
          confirmed_by: string | null
          created_at: string
          evaluator_account_slot: number
          evaluator_name_snapshot: string | null
          evaluator_organization_snapshot: string | null
          evaluator_position_snapshot: string | null
          evaluator_signature_bucket_snapshot: string | null
          evaluator_signature_mime_snapshot: string | null
          evaluator_signature_path_snapshot: string | null
          evaluator_user_id: string
          id: string
          member_role: string
          period_id: string
          slot_no: number
          updated_at: string
        }
        Insert: {
          confirmed_at?: string
          confirmed_by?: string | null
          created_at?: string
          evaluator_account_slot: number
          evaluator_name_snapshot?: string | null
          evaluator_organization_snapshot?: string | null
          evaluator_position_snapshot?: string | null
          evaluator_signature_bucket_snapshot?: string | null
          evaluator_signature_mime_snapshot?: string | null
          evaluator_signature_path_snapshot?: string | null
          evaluator_user_id: string
          id?: string
          member_role: string
          period_id: string
          slot_no: number
          updated_at?: string
        }
        Update: {
          confirmed_at?: string
          confirmed_by?: string | null
          created_at?: string
          evaluator_account_slot?: number
          evaluator_name_snapshot?: string | null
          evaluator_organization_snapshot?: string | null
          evaluator_position_snapshot?: string | null
          evaluator_signature_bucket_snapshot?: string | null
          evaluator_signature_mime_snapshot?: string | null
          evaluator_signature_path_snapshot?: string | null
          evaluator_user_id?: string
          id?: string
          member_role?: string
          period_id?: string
          slot_no?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "personnel_pa_period_committee_membe_evaluator_account_slot_fkey"
            columns: ["evaluator_account_slot"]
            isOneToOne: false
            referencedRelation: "personnel_pa_evaluator_accounts"
            referencedColumns: ["slot_no"]
          },
          {
            foreignKeyName: "personnel_pa_period_committee_members_confirmed_by_fkey"
            columns: ["confirmed_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "personnel_pa_period_committee_members_evaluator_user_id_fkey"
            columns: ["evaluator_user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "personnel_pa_period_committee_members_period_id_fkey"
            columns: ["period_id"]
            isOneToOne: false
            referencedRelation: "personnel_pa_periods"
            referencedColumns: ["id"]
          },
        ]
      }
      personnel_pa_periods: {
        Row: {
          agreement_end_date: string
          agreement_start_date: string
          assessment_close_date: string | null
          assessment_open_date: string | null
          created_at: string
          created_by: string | null
          fiscal_year: number
          id: string
          is_active: boolean
          note: string | null
          report_close_date: string | null
          report_open_date: string | null
          submission_close_date: string | null
          submission_open_date: string | null
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          agreement_end_date: string
          agreement_start_date: string
          assessment_close_date?: string | null
          assessment_open_date?: string | null
          created_at?: string
          created_by?: string | null
          fiscal_year: number
          id?: string
          is_active?: boolean
          note?: string | null
          report_close_date?: string | null
          report_open_date?: string | null
          submission_close_date?: string | null
          submission_open_date?: string | null
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          agreement_end_date?: string
          agreement_start_date?: string
          assessment_close_date?: string | null
          assessment_open_date?: string | null
          created_at?: string
          created_by?: string | null
          fiscal_year?: number
          id?: string
          is_active?: boolean
          note?: string | null
          report_close_date?: string | null
          report_open_date?: string | null
          submission_close_date?: string | null
          submission_open_date?: string | null
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "personnel_pa_periods_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "personnel_pa_periods_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      personnel_pa_reports: {
        Row: {
          academic_rank_snapshot: string | null
          challenge_context_snapshot: string | null
          challenge_title_snapshot: string | null
          created_at: string
          created_by: string | null
          development_methods_snapshot: string | null
          development_result: string | null
          evidence_files: Json
          evidence_plan_snapshot: string | null
          evidence_summary: string | null
          id: string
          indicators_result: string | null
          next_development: string | null
          pa_submission_id: string
          pa_title_snapshot: string | null
          period_id: string
          person_name_snapshot: string | null
          position_title_snapshot: string | null
          problems_obstacles: string | null
          qualitative_result: string | null
          qualitative_target_snapshot: string | null
          quantitative_result: string | null
          quantitative_target_snapshot: string | null
          result_summary: string | null
          salary_amount_snapshot: number | null
          salary_effective_date_snapshot: string | null
          salary_grade_snapshot: string | null
          source_mode_snapshot: string | null
          status: string
          submitted_at: string | null
          success_indicators_snapshot: string | null
          teacher_signature_bucket_snapshot: string | null
          teacher_signature_id_snapshot: string | null
          teacher_signature_path_snapshot: string | null
          teacher_signature_source_snapshot: string | null
          teacher_signed_at: string | null
          updated_at: string
          updated_by: string | null
          user_id: string
        }
        Insert: {
          academic_rank_snapshot?: string | null
          challenge_context_snapshot?: string | null
          challenge_title_snapshot?: string | null
          created_at?: string
          created_by?: string | null
          development_methods_snapshot?: string | null
          development_result?: string | null
          evidence_files?: Json
          evidence_plan_snapshot?: string | null
          evidence_summary?: string | null
          id?: string
          indicators_result?: string | null
          next_development?: string | null
          pa_submission_id: string
          pa_title_snapshot?: string | null
          period_id: string
          person_name_snapshot?: string | null
          position_title_snapshot?: string | null
          problems_obstacles?: string | null
          qualitative_result?: string | null
          qualitative_target_snapshot?: string | null
          quantitative_result?: string | null
          quantitative_target_snapshot?: string | null
          result_summary?: string | null
          salary_amount_snapshot?: number | null
          salary_effective_date_snapshot?: string | null
          salary_grade_snapshot?: string | null
          source_mode_snapshot?: string | null
          status?: string
          submitted_at?: string | null
          success_indicators_snapshot?: string | null
          teacher_signature_bucket_snapshot?: string | null
          teacher_signature_id_snapshot?: string | null
          teacher_signature_path_snapshot?: string | null
          teacher_signature_source_snapshot?: string | null
          teacher_signed_at?: string | null
          updated_at?: string
          updated_by?: string | null
          user_id: string
        }
        Update: {
          academic_rank_snapshot?: string | null
          challenge_context_snapshot?: string | null
          challenge_title_snapshot?: string | null
          created_at?: string
          created_by?: string | null
          development_methods_snapshot?: string | null
          development_result?: string | null
          evidence_files?: Json
          evidence_plan_snapshot?: string | null
          evidence_summary?: string | null
          id?: string
          indicators_result?: string | null
          next_development?: string | null
          pa_submission_id?: string
          pa_title_snapshot?: string | null
          period_id?: string
          person_name_snapshot?: string | null
          position_title_snapshot?: string | null
          problems_obstacles?: string | null
          qualitative_result?: string | null
          qualitative_target_snapshot?: string | null
          quantitative_result?: string | null
          quantitative_target_snapshot?: string | null
          result_summary?: string | null
          salary_amount_snapshot?: number | null
          salary_effective_date_snapshot?: string | null
          salary_grade_snapshot?: string | null
          source_mode_snapshot?: string | null
          status?: string
          submitted_at?: string | null
          success_indicators_snapshot?: string | null
          teacher_signature_bucket_snapshot?: string | null
          teacher_signature_id_snapshot?: string | null
          teacher_signature_path_snapshot?: string | null
          teacher_signature_source_snapshot?: string | null
          teacher_signed_at?: string | null
          updated_at?: string
          updated_by?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "personnel_pa_reports_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "personnel_pa_reports_pa_submission_id_fkey"
            columns: ["pa_submission_id"]
            isOneToOne: true
            referencedRelation: "personnel_pa_submissions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "personnel_pa_reports_period_id_fkey"
            columns: ["period_id"]
            isOneToOne: false
            referencedRelation: "personnel_pa_periods"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "personnel_pa_reports_teacher_signature_id_snapshot_fkey"
            columns: ["teacher_signature_id_snapshot"]
            isOneToOne: false
            referencedRelation: "signatures"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "personnel_pa_reports_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "personnel_pa_reports_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      personnel_pa_submissions: {
        Row: {
          academic_rank_snapshot: string | null
          challenge_context: string | null
          challenge_title: string | null
          created_at: string
          created_by: string | null
          development_methods: string | null
          evidence_plan: string | null
          full_file_bucket: string | null
          full_file_mime_type: string | null
          full_file_name: string | null
          full_file_path: string | null
          full_file_size: number | null
          id: string
          pa_title: string | null
          period_id: string
          person_name_snapshot: string | null
          position_title_snapshot: string | null
          qualitative_target: string | null
          quantitative_target: string | null
          status: string
          submission_mode: string
          submitted_at: string | null
          success_indicators: string | null
          teacher_signature_bucket_snapshot: string | null
          teacher_signature_id_snapshot: string | null
          teacher_signature_path_snapshot: string | null
          teacher_signature_source_snapshot: string | null
          teacher_signed_at: string | null
          updated_at: string
          updated_by: string | null
          user_id: string
          workload_summary: string | null
        }
        Insert: {
          academic_rank_snapshot?: string | null
          challenge_context?: string | null
          challenge_title?: string | null
          created_at?: string
          created_by?: string | null
          development_methods?: string | null
          evidence_plan?: string | null
          full_file_bucket?: string | null
          full_file_mime_type?: string | null
          full_file_name?: string | null
          full_file_path?: string | null
          full_file_size?: number | null
          id?: string
          pa_title?: string | null
          period_id: string
          person_name_snapshot?: string | null
          position_title_snapshot?: string | null
          qualitative_target?: string | null
          quantitative_target?: string | null
          status?: string
          submission_mode: string
          submitted_at?: string | null
          success_indicators?: string | null
          teacher_signature_bucket_snapshot?: string | null
          teacher_signature_id_snapshot?: string | null
          teacher_signature_path_snapshot?: string | null
          teacher_signature_source_snapshot?: string | null
          teacher_signed_at?: string | null
          updated_at?: string
          updated_by?: string | null
          user_id: string
          workload_summary?: string | null
        }
        Update: {
          academic_rank_snapshot?: string | null
          challenge_context?: string | null
          challenge_title?: string | null
          created_at?: string
          created_by?: string | null
          development_methods?: string | null
          evidence_plan?: string | null
          full_file_bucket?: string | null
          full_file_mime_type?: string | null
          full_file_name?: string | null
          full_file_path?: string | null
          full_file_size?: number | null
          id?: string
          pa_title?: string | null
          period_id?: string
          person_name_snapshot?: string | null
          position_title_snapshot?: string | null
          qualitative_target?: string | null
          quantitative_target?: string | null
          status?: string
          submission_mode?: string
          submitted_at?: string | null
          success_indicators?: string | null
          teacher_signature_bucket_snapshot?: string | null
          teacher_signature_id_snapshot?: string | null
          teacher_signature_path_snapshot?: string | null
          teacher_signature_source_snapshot?: string | null
          teacher_signed_at?: string | null
          updated_at?: string
          updated_by?: string | null
          user_id?: string
          workload_summary?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "personnel_pa_submissions_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "personnel_pa_submissions_period_id_fkey"
            columns: ["period_id"]
            isOneToOne: false
            referencedRelation: "personnel_pa_periods"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "personnel_pa_submissions_teacher_signature_id_snapshot_fkey"
            columns: ["teacher_signature_id_snapshot"]
            isOneToOne: false
            referencedRelation: "signatures"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "personnel_pa_submissions_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "personnel_pa_submissions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      personnel_pa_user_period_profiles: {
        Row: {
          created_at: string
          created_by: string | null
          id: string
          pa_auto_sign_enabled: boolean
          period_id: string
          salary_amount: number | null
          salary_effective_date: string | null
          salary_grade: string | null
          updated_at: string
          updated_by: string | null
          user_id: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          id?: string
          pa_auto_sign_enabled?: boolean
          period_id: string
          salary_amount?: number | null
          salary_effective_date?: string | null
          salary_grade?: string | null
          updated_at?: string
          updated_by?: string | null
          user_id: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          id?: string
          pa_auto_sign_enabled?: boolean
          period_id?: string
          salary_amount?: number | null
          salary_effective_date?: string | null
          salary_grade?: string | null
          updated_at?: string
          updated_by?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "personnel_pa_user_period_profiles_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "personnel_pa_user_period_profiles_period_id_fkey"
            columns: ["period_id"]
            isOneToOne: false
            referencedRelation: "personnel_pa_periods"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "personnel_pa_user_period_profiles_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "personnel_pa_user_period_profiles_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      personnel_public_directory: {
        Row: {
          academic_rank: string | null
          birth_date: string | null
          department_code: string | null
          department_id: string | null
          full_name: string
          phone: string | null
          photo_bucket: string | null
          photo_path: string | null
          position_title: string | null
          role: string
          updated_at: string
          user_id: string
        }
        Insert: {
          academic_rank?: string | null
          birth_date?: string | null
          department_code?: string | null
          department_id?: string | null
          full_name: string
          phone?: string | null
          photo_bucket?: string | null
          photo_path?: string | null
          position_title?: string | null
          role: string
          updated_at?: string
          user_id: string
        }
        Update: {
          academic_rank?: string | null
          birth_date?: string | null
          department_code?: string | null
          department_id?: string | null
          full_name?: string
          phone?: string | null
          photo_bucket?: string | null
          photo_path?: string | null
          position_title?: string | null
          role?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "personnel_public_directory_department_id_fkey"
            columns: ["department_id"]
            isOneToOne: false
            referencedRelation: "departments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "personnel_public_directory_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      personnel_records: {
        Row: {
          academic_rank: string | null
          academic_rank_effective_date: string | null
          address: string | null
          birth_date: string | null
          citizen_id: string | null
          created_at: string
          current_school_start_date: string | null
          email: string | null
          employment_type: string
          first_appointment_date: string | null
          first_name: string | null
          graduation_year: string | null
          highest_degree: string | null
          id: string
          institution: string | null
          last_name: string | null
          major: string | null
          notes: string | null
          person_category: string
          phone: string | null
          photo_bucket: string | null
          photo_path: string | null
          position_number: string | null
          position_title: string | null
          prefix: string | null
          profile_completed_at: string | null
          teacher_license_expiry: string | null
          teacher_license_no: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          academic_rank?: string | null
          academic_rank_effective_date?: string | null
          address?: string | null
          birth_date?: string | null
          citizen_id?: string | null
          created_at?: string
          current_school_start_date?: string | null
          email?: string | null
          employment_type: string
          first_appointment_date?: string | null
          first_name?: string | null
          graduation_year?: string | null
          highest_degree?: string | null
          id?: string
          institution?: string | null
          last_name?: string | null
          major?: string | null
          notes?: string | null
          person_category: string
          phone?: string | null
          photo_bucket?: string | null
          photo_path?: string | null
          position_number?: string | null
          position_title?: string | null
          prefix?: string | null
          profile_completed_at?: string | null
          teacher_license_expiry?: string | null
          teacher_license_no?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          academic_rank?: string | null
          academic_rank_effective_date?: string | null
          address?: string | null
          birth_date?: string | null
          citizen_id?: string | null
          created_at?: string
          current_school_start_date?: string | null
          email?: string | null
          employment_type?: string
          first_appointment_date?: string | null
          first_name?: string | null
          graduation_year?: string | null
          highest_degree?: string | null
          id?: string
          institution?: string | null
          last_name?: string | null
          major?: string | null
          notes?: string | null
          person_category?: string
          phone?: string | null
          photo_bucket?: string | null
          photo_path?: string | null
          position_number?: string | null
          position_title?: string | null
          prefix?: string | null
          profile_completed_at?: string | null
          teacher_license_expiry?: string | null
          teacher_license_no?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "personnel_records_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      preschool_group_cover_members: {
        Row: {
          acknowledged_at: string | null
          cover_id: string
          created_at: string
          id: string
          is_available: boolean
          is_current_staff: boolean
          teacher_id: string
          teacher_name: string
          updated_at: string
        }
        Insert: {
          acknowledged_at?: string | null
          cover_id: string
          created_at?: string
          id?: string
          is_available?: boolean
          is_current_staff?: boolean
          teacher_id: string
          teacher_name: string
          updated_at?: string
        }
        Update: {
          acknowledged_at?: string | null
          cover_id?: string
          created_at?: string
          id?: string
          is_available?: boolean
          is_current_staff?: boolean
          teacher_id?: string
          teacher_name?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "preschool_group_cover_members_cover_id_fkey"
            columns: ["cover_id"]
            isOneToOne: false
            referencedRelation: "preschool_group_covers"
            referencedColumns: ["id"]
          },
        ]
      }
      preschool_group_covers: {
        Row: {
          absent_teacher_id: string
          absent_teacher_name: string
          academic_year: number
          class_id: string
          class_label: string
          created_at: string
          id: string
          leave_date: string
          leave_request_id: string
          semester: number
          status: string
          updated_at: string
        }
        Insert: {
          absent_teacher_id: string
          absent_teacher_name: string
          academic_year: number
          class_id: string
          class_label: string
          created_at?: string
          id?: string
          leave_date: string
          leave_request_id: string
          semester: number
          status?: string
          updated_at?: string
        }
        Update: {
          absent_teacher_id?: string
          absent_teacher_name?: string
          academic_year?: number
          class_id?: string
          class_label?: string
          created_at?: string
          id?: string
          leave_date?: string
          leave_request_id?: string
          semester?: number
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "preschool_group_covers_class_id_fkey"
            columns: ["class_id"]
            isOneToOne: false
            referencedRelation: "school_classes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "preschool_group_covers_leave_request_id_fkey"
            columns: ["leave_request_id"]
            isOneToOne: false
            referencedRelation: "leave_requests"
            referencedColumns: ["id"]
          },
        ]
      }
      preschool_shared_weekly_units: {
        Row: {
          academic_year: number
          created_at: string
          created_by: string | null
          id: string
          learning_focus: string | null
          semester: number
          unit_title: string
          updated_at: string
          week_no: number
          week_start: string
        }
        Insert: {
          academic_year: number
          created_at?: string
          created_by?: string | null
          id?: string
          learning_focus?: string | null
          semester: number
          unit_title: string
          updated_at?: string
          week_no: number
          week_start: string
        }
        Update: {
          academic_year?: number
          created_at?: string
          created_by?: string | null
          id?: string
          learning_focus?: string | null
          semester?: number
          unit_title?: string
          updated_at?: string
          week_no?: number
          week_start?: string
        }
        Relationships: []
      }
      preschool_staff_roster: {
        Row: {
          academic_year: number
          added_by: string | null
          created_at: string
          id: string
          semester: number
          teacher_id: string
        }
        Insert: {
          academic_year: number
          added_by?: string | null
          created_at?: string
          id?: string
          semester: number
          teacher_id: string
        }
        Update: {
          academic_year?: number
          added_by?: string | null
          created_at?: string
          id?: string
          semester?: number
          teacher_id?: string
        }
        Relationships: []
      }
      preschool_weekly_units: {
        Row: {
          class_id: string
          created_at: string
          created_by: string | null
          id: string
          learning_focus: string | null
          unit_title: string
          updated_at: string
          week_no: number
          week_start: string
        }
        Insert: {
          class_id: string
          created_at?: string
          created_by?: string | null
          id?: string
          learning_focus?: string | null
          unit_title: string
          updated_at?: string
          week_no: number
          week_start: string
        }
        Update: {
          class_id?: string
          created_at?: string
          created_by?: string | null
          id?: string
          learning_focus?: string | null
          unit_title?: string
          updated_at?: string
          week_no?: number
          week_start?: string
        }
        Relationships: [
          {
            foreignKeyName: "preschool_weekly_units_class_id_fkey"
            columns: ["class_id"]
            isOneToOne: false
            referencedRelation: "school_classes"
            referencedColumns: ["id"]
          },
        ]
      }
      procurement_control_numbers: {
        Row: {
          cancelled_at: string | null
          cancelled_by: string | null
          control_year: number
          created_at: string
          created_by: string
          id: string
          notes: string | null
          parent_control_id: string | null
          primary_number: string
          primary_sequence: number
          procurement_kind: string | null
          released_at: string | null
          released_by: string | null
          released_from_case_code: string | null
          released_from_case_id: string | null
          released_from_case_title: string | null
          secondary_number: string | null
          secondary_sequence: number | null
          series: string
          status: string
          subject: string
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          cancelled_at?: string | null
          cancelled_by?: string | null
          control_year: number
          created_at?: string
          created_by: string
          id?: string
          notes?: string | null
          parent_control_id?: string | null
          primary_number: string
          primary_sequence: number
          procurement_kind?: string | null
          released_at?: string | null
          released_by?: string | null
          released_from_case_code?: string | null
          released_from_case_id?: string | null
          released_from_case_title?: string | null
          secondary_number?: string | null
          secondary_sequence?: number | null
          series: string
          status?: string
          subject: string
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          cancelled_at?: string | null
          cancelled_by?: string | null
          control_year?: number
          created_at?: string
          created_by?: string
          id?: string
          notes?: string | null
          parent_control_id?: string | null
          primary_number?: string
          primary_sequence?: number
          procurement_kind?: string | null
          released_at?: string | null
          released_by?: string | null
          released_from_case_code?: string | null
          released_from_case_id?: string | null
          released_from_case_title?: string | null
          secondary_number?: string | null
          secondary_sequence?: number | null
          series?: string
          status?: string
          subject?: string
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "procurement_control_numbers_parent_control_id_fkey"
            columns: ["parent_control_id"]
            isOneToOne: false
            referencedRelation: "procurement_control_numbers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "procurement_control_numbers_released_by_fkey"
            columns: ["released_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "procurement_control_numbers_released_from_case_id_fkey"
            columns: ["released_from_case_id"]
            isOneToOne: false
            referencedRelation: "procurement_document_cases"
            referencedColumns: ["id"]
          },
        ]
      }
      procurement_control_series_settings: {
        Row: {
          control_year: number
          last_number: number
          series: string
          start_number: number
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          control_year: number
          last_number?: number
          series: string
          start_number?: number
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          control_year?: number
          last_number?: number
          series?: string
          start_number?: number
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: []
      }
      procurement_document_case_counters: {
        Row: {
          academic_year: string
          last_number: number
          updated_at: string
        }
        Insert: {
          academic_year: string
          last_number?: number
          updated_at?: string
        }
        Update: {
          academic_year?: string
          last_number?: number
          updated_at?: string
        }
        Relationships: []
      }
      procurement_document_cases: {
        Row: {
          academic_year: string
          activity_id: string | null
          case_code: string
          control_disbursement_id: string | null
          control_inventory_issue_id: string | null
          control_order_id: string | null
          control_purchase_order_id: string | null
          control_request_approval_id: string | null
          created_at: string
          created_by: string
          deleted_at: string | null
          deleted_by: string | null
          form_data: Json
          id: string
          items: Json
          master_snapshot: Json
          procurement_kind: string
          project_id: string | null
          signer_snapshot: Json
          status: string
          title: string
          total_amount: number
          updated_at: string
          updated_by: string | null
          vendor_id: string | null
        }
        Insert: {
          academic_year: string
          activity_id?: string | null
          case_code: string
          control_disbursement_id?: string | null
          control_inventory_issue_id?: string | null
          control_order_id?: string | null
          control_purchase_order_id?: string | null
          control_request_approval_id?: string | null
          created_at?: string
          created_by: string
          deleted_at?: string | null
          deleted_by?: string | null
          form_data?: Json
          id?: string
          items?: Json
          master_snapshot?: Json
          procurement_kind?: string
          project_id?: string | null
          signer_snapshot?: Json
          status?: string
          title?: string
          total_amount?: number
          updated_at?: string
          updated_by?: string | null
          vendor_id?: string | null
        }
        Update: {
          academic_year?: string
          activity_id?: string | null
          case_code?: string
          control_disbursement_id?: string | null
          control_inventory_issue_id?: string | null
          control_order_id?: string | null
          control_purchase_order_id?: string | null
          control_request_approval_id?: string | null
          created_at?: string
          created_by?: string
          deleted_at?: string | null
          deleted_by?: string | null
          form_data?: Json
          id?: string
          items?: Json
          master_snapshot?: Json
          procurement_kind?: string
          project_id?: string | null
          signer_snapshot?: Json
          status?: string
          title?: string
          total_amount?: number
          updated_at?: string
          updated_by?: string | null
          vendor_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "procurement_document_cases_activity_id_fkey"
            columns: ["activity_id"]
            isOneToOne: false
            referencedRelation: "project_activities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "procurement_document_cases_control_disbursement_id_fkey"
            columns: ["control_disbursement_id"]
            isOneToOne: false
            referencedRelation: "procurement_control_numbers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "procurement_document_cases_control_inventory_issue_id_fkey"
            columns: ["control_inventory_issue_id"]
            isOneToOne: false
            referencedRelation: "procurement_control_numbers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "procurement_document_cases_control_order_id_fkey"
            columns: ["control_order_id"]
            isOneToOne: false
            referencedRelation: "procurement_control_numbers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "procurement_document_cases_control_purchase_order_id_fkey"
            columns: ["control_purchase_order_id"]
            isOneToOne: false
            referencedRelation: "procurement_control_numbers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "procurement_document_cases_control_request_approval_id_fkey"
            columns: ["control_request_approval_id"]
            isOneToOne: false
            referencedRelation: "procurement_control_numbers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "procurement_document_cases_deleted_by_fkey"
            columns: ["deleted_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "procurement_document_cases_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "school_projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "procurement_document_cases_vendor_id_fkey"
            columns: ["vendor_id"]
            isOneToOne: false
            referencedRelation: "procurement_vendors"
            referencedColumns: ["id"]
          },
        ]
      }
      procurement_item_catalog: {
        Row: {
          created_at: string
          created_by: string | null
          description: string | null
          id: string
          is_active: boolean
          item_code: string | null
          item_name: string
          item_type: string
          reference_price: number
          source: string
          source_row: number | null
          unit: string | null
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          is_active?: boolean
          item_code?: string | null
          item_name: string
          item_type?: string
          reference_price?: number
          source?: string
          source_row?: number | null
          unit?: string | null
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          is_active?: boolean
          item_code?: string | null
          item_name?: string
          item_type?: string
          reference_price?: number
          source?: string
          source_row?: number | null
          unit?: string | null
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: []
      }
      procurement_module_permissions: {
        Row: {
          can_access_control: boolean
          can_access_documents: boolean
          can_access_school_lunch: boolean
          created_at: string
          updated_at: string
          updated_by: string | null
          user_id: string
        }
        Insert: {
          can_access_control?: boolean
          can_access_documents?: boolean
          can_access_school_lunch?: boolean
          created_at?: string
          updated_at?: string
          updated_by?: string | null
          user_id: string
        }
        Update: {
          can_access_control?: boolean
          can_access_documents?: boolean
          can_access_school_lunch?: boolean
          created_at?: string
          updated_at?: string
          updated_by?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "procurement_module_permissions_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "procurement_module_permissions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      procurement_system_settings: {
        Row: {
          address_no: string | null
          deputy_user_id: string | null
          director_user_id: string | null
          district: string | null
          finance_head_user_id: string | null
          finance_user_id: string | null
          head_officer_user_id: string | null
          moo: string | null
          officer_user_id: string | null
          phone: string | null
          postal_code: string | null
          province: string | null
          road: string | null
          setting_key: string
          subdistrict: string | null
          supervising_office: string | null
          tax_id: string | null
          unit_name: string | null
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          address_no?: string | null
          deputy_user_id?: string | null
          director_user_id?: string | null
          district?: string | null
          finance_head_user_id?: string | null
          finance_user_id?: string | null
          head_officer_user_id?: string | null
          moo?: string | null
          officer_user_id?: string | null
          phone?: string | null
          postal_code?: string | null
          province?: string | null
          road?: string | null
          setting_key?: string
          subdistrict?: string | null
          supervising_office?: string | null
          tax_id?: string | null
          unit_name?: string | null
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          address_no?: string | null
          deputy_user_id?: string | null
          director_user_id?: string | null
          district?: string | null
          finance_head_user_id?: string | null
          finance_user_id?: string | null
          head_officer_user_id?: string | null
          moo?: string | null
          officer_user_id?: string | null
          phone?: string | null
          postal_code?: string | null
          province?: string | null
          road?: string | null
          setting_key?: string
          subdistrict?: string | null
          supervising_office?: string | null
          tax_id?: string | null
          unit_name?: string | null
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: []
      }
      procurement_vendors: {
        Row: {
          account_name: string | null
          address: string | null
          bank_account: string | null
          bank_branch: string | null
          bank_name: string | null
          contact_name: string | null
          contact_position: string | null
          created_at: string
          created_by: string | null
          district: string | null
          house_no: string | null
          id: string
          is_active: boolean
          moo: string | null
          phone: string | null
          postal_code: string | null
          province: string | null
          road: string | null
          source: string
          source_row: number | null
          subdistrict: string | null
          tax_id: string | null
          updated_at: string
          updated_by: string | null
          vendor_code: string | null
          vendor_name: string
          vendor_type: string | null
        }
        Insert: {
          account_name?: string | null
          address?: string | null
          bank_account?: string | null
          bank_branch?: string | null
          bank_name?: string | null
          contact_name?: string | null
          contact_position?: string | null
          created_at?: string
          created_by?: string | null
          district?: string | null
          house_no?: string | null
          id?: string
          is_active?: boolean
          moo?: string | null
          phone?: string | null
          postal_code?: string | null
          province?: string | null
          road?: string | null
          source?: string
          source_row?: number | null
          subdistrict?: string | null
          tax_id?: string | null
          updated_at?: string
          updated_by?: string | null
          vendor_code?: string | null
          vendor_name: string
          vendor_type?: string | null
        }
        Update: {
          account_name?: string | null
          address?: string | null
          bank_account?: string | null
          bank_branch?: string | null
          bank_name?: string | null
          contact_name?: string | null
          contact_position?: string | null
          created_at?: string
          created_by?: string | null
          district?: string | null
          house_no?: string | null
          id?: string
          is_active?: boolean
          moo?: string | null
          phone?: string | null
          postal_code?: string | null
          province?: string | null
          road?: string | null
          source?: string
          source_row?: number | null
          subdistrict?: string | null
          tax_id?: string | null
          updated_at?: string
          updated_by?: string | null
          vendor_code?: string | null
          vendor_name?: string
          vendor_type?: string | null
        }
        Relationships: []
      }
      profiles: {
        Row: {
          account_status: string
          approved_at: string | null
          approved_by: string | null
          created_at: string
          deleted_at: string | null
          deleted_by: string | null
          department_id: string | null
          email: string | null
          employee_code: string | null
          full_name: string | null
          id: string
          phone: string | null
          requested_department_id: string | null
          role: string
          subject_group_id: string | null
          updated_at: string
        }
        Insert: {
          account_status?: string
          approved_at?: string | null
          approved_by?: string | null
          created_at?: string
          deleted_at?: string | null
          deleted_by?: string | null
          department_id?: string | null
          email?: string | null
          employee_code?: string | null
          full_name?: string | null
          id: string
          phone?: string | null
          requested_department_id?: string | null
          role?: string
          subject_group_id?: string | null
          updated_at?: string
        }
        Update: {
          account_status?: string
          approved_at?: string | null
          approved_by?: string | null
          created_at?: string
          deleted_at?: string | null
          deleted_by?: string | null
          department_id?: string | null
          email?: string | null
          employee_code?: string | null
          full_name?: string | null
          id?: string
          phone?: string | null
          requested_department_id?: string | null
          role?: string
          subject_group_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "profiles_department_id_fkey"
            columns: ["department_id"]
            isOneToOne: false
            referencedRelation: "departments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "profiles_requested_department_id_fkey"
            columns: ["requested_department_id"]
            isOneToOne: false
            referencedRelation: "departments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "profiles_subject_group_id_fkey"
            columns: ["subject_group_id"]
            isOneToOne: false
            referencedRelation: "subject_groups"
            referencedColumns: ["id"]
          },
        ]
      }
      project_activities: {
        Row: {
          activity_name: string
          activity_no: string
          budget_amount: number
          created_at: string
          id: string
          notes: string | null
          owner_id: string
          owner_name: string
          project_id: string
          status: string
          updated_at: string
        }
        Insert: {
          activity_name: string
          activity_no: string
          budget_amount?: number
          created_at?: string
          id?: string
          notes?: string | null
          owner_id: string
          owner_name: string
          project_id: string
          status?: string
          updated_at?: string
        }
        Update: {
          activity_name?: string
          activity_no?: string
          budget_amount?: number
          created_at?: string
          id?: string
          notes?: string | null
          owner_id?: string
          owner_name?: string
          project_id?: string
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "project_activities_owner_id_fkey"
            columns: ["owner_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "project_activities_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "school_projects"
            referencedColumns: ["id"]
          },
        ]
      }
      school_classes: {
        Row: {
          academic_year: string
          created_at: string
          created_by: string | null
          id: string
          is_active: boolean
          level_name: string
          room_name: string
          semester: number
          sort_order: number
          stage_code: string
          updated_at: string
        }
        Insert: {
          academic_year: string
          created_at?: string
          created_by?: string | null
          id?: string
          is_active?: boolean
          level_name: string
          room_name?: string
          semester: number
          sort_order?: number
          stage_code: string
          updated_at?: string
        }
        Update: {
          academic_year?: string
          created_at?: string
          created_by?: string | null
          id?: string
          is_active?: boolean
          level_name?: string
          room_name?: string
          semester?: number
          sort_order?: number
          stage_code?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "school_classes_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      school_document_signatures: {
        Row: {
          accepted_at: string | null
          automatic: boolean
          created_at: string
          document_date: string
          document_id: string
          document_kind: string
          id: string
          method: string
          signature_id: string | null
          signed_at: string | null
          signer_user_id: string
          slot_code: string
          updated_at: string
        }
        Insert: {
          accepted_at?: string | null
          automatic?: boolean
          created_at?: string
          document_date?: string
          document_id: string
          document_kind: string
          id?: string
          method: string
          signature_id?: string | null
          signed_at?: string | null
          signer_user_id: string
          slot_code: string
          updated_at?: string
        }
        Update: {
          accepted_at?: string | null
          automatic?: boolean
          created_at?: string
          document_date?: string
          document_id?: string
          document_kind?: string
          id?: string
          method?: string
          signature_id?: string | null
          signed_at?: string | null
          signer_user_id?: string
          slot_code?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "school_document_signatures_signature_id_fkey"
            columns: ["signature_id"]
            isOneToOne: false
            referencedRelation: "signatures"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "school_document_signatures_signer_user_id_fkey"
            columns: ["signer_user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      school_lunch_round_days: {
        Row: {
          created_at: string
          created_by: string
          day_amount: number | null
          day_order: number
          id: string
          menu_items: Json
          note: string | null
          rate_per_student: number
          result_status: string
          round_id: string
          service_date: string
          student_count: number
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          created_at?: string
          created_by: string
          day_amount?: number | null
          day_order?: number
          id?: string
          menu_items?: Json
          note?: string | null
          rate_per_student: number
          result_status?: string
          round_id: string
          service_date: string
          student_count: number
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          created_at?: string
          created_by?: string
          day_amount?: number | null
          day_order?: number
          id?: string
          menu_items?: Json
          note?: string | null
          rate_per_student?: number
          result_status?: string
          round_id?: string
          service_date?: string
          student_count?: number
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "school_lunch_round_days_round_id_fkey"
            columns: ["round_id"]
            isOneToOne: false
            referencedRelation: "school_lunch_rounds"
            referencedColumns: ["id"]
          },
        ]
      }
      school_lunch_rounds: {
        Row: {
          academic_year: number
          appointment_control_no: string | null
          cancelled_at: string | null
          cancelled_by: string | null
          created_at: string
          created_by: string
          delivery_date: string | null
          delivery_days: number
          delivery_due_date: string | null
          disbursement_control_no: string | null
          document_date: string | null
          end_date: string
          fine_amount: number
          fiscal_year: number
          form_data: Json
          funding_source: string
          id: string
          inspection_appointment_date: string | null
          inspection_date: string | null
          job_control_no: string | null
          municipality_name: string | null
          order_date: string | null
          owner_user_id: string | null
          payment_request_date: string | null
          penalty_rate: number
          plan_name: string
          procurement_order_control_id: string | null
          procurement_purchase_order_control_id: string | null
          procurement_request_control_id: string | null
          project_name: string
          purchase_order_control_no: string | null
          quote_date: string | null
          quote_valid_days: number
          rate_per_student: number
          reason: string
          role_snapshots: Json
          round_label: string | null
          round_no: number | null
          service_days: number
          start_date: string
          status: string
          student_count: number
          title: string
          total_amount: number
          updated_at: string
          updated_by: string | null
          vat_amount: number
          vendor_id: string | null
          withholding_tax_amount: number
        }
        Insert: {
          academic_year: number
          appointment_control_no?: string | null
          cancelled_at?: string | null
          cancelled_by?: string | null
          created_at?: string
          created_by: string
          delivery_date?: string | null
          delivery_days?: number
          delivery_due_date?: string | null
          disbursement_control_no?: string | null
          document_date?: string | null
          end_date: string
          fine_amount?: number
          fiscal_year: number
          form_data?: Json
          funding_source?: string
          id?: string
          inspection_appointment_date?: string | null
          inspection_date?: string | null
          job_control_no?: string | null
          municipality_name?: string | null
          order_date?: string | null
          owner_user_id?: string | null
          payment_request_date?: string | null
          penalty_rate?: number
          plan_name?: string
          procurement_order_control_id?: string | null
          procurement_purchase_order_control_id?: string | null
          procurement_request_control_id?: string | null
          project_name?: string
          purchase_order_control_no?: string | null
          quote_date?: string | null
          quote_valid_days?: number
          rate_per_student: number
          reason?: string
          role_snapshots?: Json
          round_label?: string | null
          round_no?: number | null
          service_days?: number
          start_date: string
          status?: string
          student_count: number
          title?: string
          total_amount?: number
          updated_at?: string
          updated_by?: string | null
          vat_amount?: number
          vendor_id?: string | null
          withholding_tax_amount?: number
        }
        Update: {
          academic_year?: number
          appointment_control_no?: string | null
          cancelled_at?: string | null
          cancelled_by?: string | null
          created_at?: string
          created_by?: string
          delivery_date?: string | null
          delivery_days?: number
          delivery_due_date?: string | null
          disbursement_control_no?: string | null
          document_date?: string | null
          end_date?: string
          fine_amount?: number
          fiscal_year?: number
          form_data?: Json
          funding_source?: string
          id?: string
          inspection_appointment_date?: string | null
          inspection_date?: string | null
          job_control_no?: string | null
          municipality_name?: string | null
          order_date?: string | null
          owner_user_id?: string | null
          payment_request_date?: string | null
          penalty_rate?: number
          plan_name?: string
          procurement_order_control_id?: string | null
          procurement_purchase_order_control_id?: string | null
          procurement_request_control_id?: string | null
          project_name?: string
          purchase_order_control_no?: string | null
          quote_date?: string | null
          quote_valid_days?: number
          rate_per_student?: number
          reason?: string
          role_snapshots?: Json
          round_label?: string | null
          round_no?: number | null
          service_days?: number
          start_date?: string
          status?: string
          student_count?: number
          title?: string
          total_amount?: number
          updated_at?: string
          updated_by?: string | null
          vat_amount?: number
          vendor_id?: string | null
          withholding_tax_amount?: number
        }
        Relationships: [
          {
            foreignKeyName: "school_lunch_rounds_owner_user_id_fkey"
            columns: ["owner_user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "school_lunch_rounds_procurement_order_control_id_fkey"
            columns: ["procurement_order_control_id"]
            isOneToOne: false
            referencedRelation: "procurement_control_numbers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "school_lunch_rounds_procurement_purchase_order_control_id_fkey"
            columns: ["procurement_purchase_order_control_id"]
            isOneToOne: false
            referencedRelation: "procurement_control_numbers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "school_lunch_rounds_procurement_request_control_id_fkey"
            columns: ["procurement_request_control_id"]
            isOneToOne: false
            referencedRelation: "procurement_control_numbers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "school_lunch_rounds_vendor_id_fkey"
            columns: ["vendor_id"]
            isOneToOne: false
            referencedRelation: "school_lunch_vendors"
            referencedColumns: ["id"]
          },
        ]
      }
      school_lunch_settings: {
        Row: {
          default_penalty_rate: number
          default_rate_per_student: number
          default_vendor_id: string | null
          fiscal_year: number
          funding_source: string
          municipality_name: string | null
          plan_name: string
          project_name: string
          roles: Json
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          default_penalty_rate?: number
          default_rate_per_student?: number
          default_vendor_id?: string | null
          fiscal_year: number
          funding_source?: string
          municipality_name?: string | null
          plan_name?: string
          project_name?: string
          roles?: Json
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          default_penalty_rate?: number
          default_rate_per_student?: number
          default_vendor_id?: string | null
          fiscal_year?: number
          funding_source?: string
          municipality_name?: string | null
          plan_name?: string
          project_name?: string
          roles?: Json
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "school_lunch_settings_default_vendor_id_fkey"
            columns: ["default_vendor_id"]
            isOneToOne: false
            referencedRelation: "school_lunch_vendors"
            referencedColumns: ["id"]
          },
        ]
      }
      school_lunch_vendors: {
        Row: {
          address_line1: string | null
          address_line2: string | null
          bank_account_name: string | null
          bank_account_no: string | null
          bank_branch: string | null
          bank_name: string | null
          created_at: string
          created_by: string
          id: string
          is_active: boolean
          notes: string | null
          phone: string | null
          tax_id: string | null
          updated_at: string
          updated_by: string | null
          vendor_name: string
          vendor_type: string
        }
        Insert: {
          address_line1?: string | null
          address_line2?: string | null
          bank_account_name?: string | null
          bank_account_no?: string | null
          bank_branch?: string | null
          bank_name?: string | null
          created_at?: string
          created_by: string
          id?: string
          is_active?: boolean
          notes?: string | null
          phone?: string | null
          tax_id?: string | null
          updated_at?: string
          updated_by?: string | null
          vendor_name: string
          vendor_type?: string
        }
        Update: {
          address_line1?: string | null
          address_line2?: string | null
          bank_account_name?: string | null
          bank_account_no?: string | null
          bank_branch?: string | null
          bank_name?: string | null
          created_at?: string
          created_by?: string
          id?: string
          is_active?: boolean
          notes?: string | null
          phone?: string | null
          tax_id?: string | null
          updated_at?: string
          updated_by?: string | null
          vendor_name?: string
          vendor_type?: string
        }
        Relationships: []
      }
      school_projects: {
        Row: {
          academic_year: number
          budget_amount: number
          created_at: string
          department_code: string
          department_custom: string | null
          id: string
          notes: string | null
          owner_id: string
          owner_name: string
          project_name: string
          project_no: string
          semester: number | null
          status: string
          updated_at: string
        }
        Insert: {
          academic_year: number
          budget_amount?: number
          created_at?: string
          department_code: string
          department_custom?: string | null
          id?: string
          notes?: string | null
          owner_id: string
          owner_name: string
          project_name: string
          project_no: string
          semester?: number | null
          status?: string
          updated_at?: string
        }
        Update: {
          academic_year?: number
          budget_amount?: number
          created_at?: string
          department_code?: string
          department_custom?: string | null
          id?: string
          notes?: string | null
          owner_id?: string
          owner_name?: string
          project_name?: string
          project_no?: string
          semester?: number | null
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "school_projects_owner_id_fkey"
            columns: ["owner_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      signature_compliance_audit: {
        Row: {
          id: number
          new_checks: Json
          previous_checks: Json
          recorded_at: string
          reviewer_id: string
          system_code: string
          verification_notes: string
        }
        Insert: {
          id?: never
          new_checks: Json
          previous_checks: Json
          recorded_at?: string
          reviewer_id: string
          system_code: string
          verification_notes: string
        }
        Update: {
          id?: never
          new_checks?: Json
          previous_checks?: Json
          recorded_at?: string
          reviewer_id?: string
          system_code?: string
          verification_notes?: string
        }
        Relationships: [
          {
            foreignKeyName: "signature_compliance_audit_system_code_fkey"
            columns: ["system_code"]
            isOneToOne: false
            referencedRelation: "approval_system_registry"
            referencedColumns: ["system_code"]
          },
        ]
      }
      signature_compliance_registry: {
        Row: {
          before_action_verified: boolean
          created_at: string
          four_methods_verified: boolean
          identity_timestamp_verified: boolean
          pdf_verified: boolean
          system_code: string
          updated_at: string
          verification_notes: string
          verified_at: string | null
          verified_by: string | null
        }
        Insert: {
          before_action_verified?: boolean
          created_at?: string
          four_methods_verified?: boolean
          identity_timestamp_verified?: boolean
          pdf_verified?: boolean
          system_code: string
          updated_at?: string
          verification_notes?: string
          verified_at?: string | null
          verified_by?: string | null
        }
        Update: {
          before_action_verified?: boolean
          created_at?: string
          four_methods_verified?: boolean
          identity_timestamp_verified?: boolean
          pdf_verified?: boolean
          system_code?: string
          updated_at?: string
          verification_notes?: string
          verified_at?: string | null
          verified_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "signature_compliance_registry_system_code_fkey"
            columns: ["system_code"]
            isOneToOne: true
            referencedRelation: "approval_system_registry"
            referencedColumns: ["system_code"]
          },
        ]
      }
      signatures: {
        Row: {
          bucket_id: string
          created_at: string
          id: string
          is_default: boolean
          label: string | null
          source: string
          storage_path: string
          user_id: string
        }
        Insert: {
          bucket_id?: string
          created_at?: string
          id?: string
          is_default?: boolean
          label?: string | null
          source?: string
          storage_path: string
          user_id: string
        }
        Update: {
          bucket_id?: string
          created_at?: string
          id?: string
          is_default?: boolean
          label?: string | null
          source?: string
          storage_path?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "signatures_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      stage_heads: {
        Row: {
          academic_year: string
          assigned_by: string | null
          created_at: string
          id: string
          stage_code: string
          teacher_id: string
        }
        Insert: {
          academic_year: string
          assigned_by?: string | null
          created_at?: string
          id?: string
          stage_code: string
          teacher_id: string
        }
        Update: {
          academic_year?: string
          assigned_by?: string | null
          created_at?: string
          id?: string
          stage_code?: string
          teacher_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "stage_heads_assigned_by_fkey"
            columns: ["assigned_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "stage_heads_teacher_id_fkey"
            columns: ["teacher_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      student_card_certifier_settings: {
        Row: {
          certifier_name: string
          certifier_position: string
          id: number
          is_enabled: boolean
          signature_bucket: string
          signature_path: string | null
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          certifier_name?: string
          certifier_position?: string
          id?: number
          is_enabled?: boolean
          signature_bucket?: string
          signature_path?: string | null
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          certifier_name?: string
          certifier_position?: string
          id?: number
          is_enabled?: boolean
          signature_bucket?: string
          signature_path?: string | null
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: []
      }
      student_cards: {
        Row: {
          card_number: string
          certifier_name: string | null
          certifier_position: string | null
          certifier_signature_bucket: string | null
          certifier_signature_path: string | null
          certifier_snapshot_at: string | null
          created_at: string
          expires_at: string
          id: string
          issued_at: string
          issued_by: string | null
          revoke_reason: string | null
          revoked_at: string | null
          revoked_by: string | null
          status: string
          student_id: string
          updated_at: string
        }
        Insert: {
          card_number: string
          certifier_name?: string | null
          certifier_position?: string | null
          certifier_signature_bucket?: string | null
          certifier_signature_path?: string | null
          certifier_snapshot_at?: string | null
          created_at?: string
          expires_at: string
          id?: string
          issued_at?: string
          issued_by?: string | null
          revoke_reason?: string | null
          revoked_at?: string | null
          revoked_by?: string | null
          status?: string
          student_id: string
          updated_at?: string
        }
        Update: {
          card_number?: string
          certifier_name?: string | null
          certifier_position?: string | null
          certifier_signature_bucket?: string | null
          certifier_signature_path?: string | null
          certifier_snapshot_at?: string | null
          created_at?: string
          expires_at?: string
          id?: string
          issued_at?: string
          issued_by?: string | null
          revoke_reason?: string | null
          revoked_at?: string | null
          revoked_by?: string | null
          status?: string
          student_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "student_cards_issued_by_fkey"
            columns: ["issued_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "student_cards_revoked_by_fkey"
            columns: ["revoked_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "student_cards_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
        ]
      }
      student_enrollments: {
        Row: {
          academic_year: string
          class_id: string
          created_at: string
          created_by: string | null
          ended_at: string | null
          ended_by: string | null
          enrollment_status: string
          exit_note: string | null
          exit_reason: string | null
          id: string
          promoted_at: string | null
          promoted_by: string | null
          promoted_to_class_id: string | null
          promotion_status: string
          semester: number
          student_id: string
          student_number: number
          updated_at: string
        }
        Insert: {
          academic_year: string
          class_id: string
          created_at?: string
          created_by?: string | null
          ended_at?: string | null
          ended_by?: string | null
          enrollment_status?: string
          exit_note?: string | null
          exit_reason?: string | null
          id?: string
          promoted_at?: string | null
          promoted_by?: string | null
          promoted_to_class_id?: string | null
          promotion_status?: string
          semester: number
          student_id: string
          student_number: number
          updated_at?: string
        }
        Update: {
          academic_year?: string
          class_id?: string
          created_at?: string
          created_by?: string | null
          ended_at?: string | null
          ended_by?: string | null
          enrollment_status?: string
          exit_note?: string | null
          exit_reason?: string | null
          id?: string
          promoted_at?: string | null
          promoted_by?: string | null
          promoted_to_class_id?: string | null
          promotion_status?: string
          semester?: number
          student_id?: string
          student_number?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "student_enrollments_class_id_fkey"
            columns: ["class_id"]
            isOneToOne: false
            referencedRelation: "school_classes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "student_enrollments_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "student_enrollments_ended_by_fkey"
            columns: ["ended_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "student_enrollments_promoted_by_fkey"
            columns: ["promoted_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "student_enrollments_promoted_to_class_id_fkey"
            columns: ["promoted_to_class_id"]
            isOneToOne: false
            referencedRelation: "school_classes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "student_enrollments_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
        ]
      }
      student_followup_batch_counters: {
        Row: {
          academic_year: string
          last_number: number
          updated_at: string
        }
        Insert: {
          academic_year: string
          last_number?: number
          updated_at?: string
        }
        Update: {
          academic_year?: string
          last_number?: number
          updated_at?: string
        }
        Relationships: []
      }
      student_followup_batches: {
        Row: {
          absence_month: string
          academic_year: string
          batch_code: string
          completed_at: string | null
          created_at: string
          created_by: string
          director_name_snapshot: string | null
          director_position_snapshot: string | null
          director_signature_bucket: string | null
          director_signature_id: string | null
          director_signature_path: string | null
          director_user_id_snapshot: string | null
          id: string
          issued_at: string | null
          issued_by: string | null
          letter_date: string
          official_document_number: string | null
          official_document_number_updated_at: string | null
          official_document_number_updated_by: string | null
          official_document_number_updated_by_name: string | null
          semester: number
          status: string
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          absence_month: string
          academic_year: string
          batch_code: string
          completed_at?: string | null
          created_at?: string
          created_by?: string
          director_name_snapshot?: string | null
          director_position_snapshot?: string | null
          director_signature_bucket?: string | null
          director_signature_id?: string | null
          director_signature_path?: string | null
          director_user_id_snapshot?: string | null
          id?: string
          issued_at?: string | null
          issued_by?: string | null
          letter_date: string
          official_document_number?: string | null
          official_document_number_updated_at?: string | null
          official_document_number_updated_by?: string | null
          official_document_number_updated_by_name?: string | null
          semester: number
          status?: string
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          absence_month?: string
          academic_year?: string
          batch_code?: string
          completed_at?: string | null
          created_at?: string
          created_by?: string
          director_name_snapshot?: string | null
          director_position_snapshot?: string | null
          director_signature_bucket?: string | null
          director_signature_id?: string | null
          director_signature_path?: string | null
          director_user_id_snapshot?: string | null
          id?: string
          issued_at?: string | null
          issued_by?: string | null
          letter_date?: string
          official_document_number?: string | null
          official_document_number_updated_at?: string | null
          official_document_number_updated_by?: string | null
          official_document_number_updated_by_name?: string | null
          semester?: number
          status?: string
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "student_followup_batches_director_signature_id_fkey"
            columns: ["director_signature_id"]
            isOneToOne: false
            referencedRelation: "signatures"
            referencedColumns: ["id"]
          },
        ]
      }
      student_followup_cases: {
        Row: {
          absence_note: string | null
          absence_total_days: number
          batch_id: string
          class_id: string | null
          class_label: string
          created_at: string
          created_by: string
          enrollment_id: string | null
          followed_at: string | null
          followed_by: string | null
          followup_note: string | null
          followup_status: string
          guardian_name: string | null
          id: string
          over_five_consecutive: boolean
          over_seven_in_month: boolean
          student_code: string
          student_id: string
          student_name: string
          student_number: number | null
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          absence_note?: string | null
          absence_total_days: number
          batch_id: string
          class_id?: string | null
          class_label: string
          created_at?: string
          created_by?: string
          enrollment_id?: string | null
          followed_at?: string | null
          followed_by?: string | null
          followup_note?: string | null
          followup_status?: string
          guardian_name?: string | null
          id?: string
          over_five_consecutive?: boolean
          over_seven_in_month?: boolean
          student_code: string
          student_id: string
          student_name: string
          student_number?: number | null
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          absence_note?: string | null
          absence_total_days?: number
          batch_id?: string
          class_id?: string | null
          class_label?: string
          created_at?: string
          created_by?: string
          enrollment_id?: string | null
          followed_at?: string | null
          followed_by?: string | null
          followup_note?: string | null
          followup_status?: string
          guardian_name?: string | null
          id?: string
          over_five_consecutive?: boolean
          over_seven_in_month?: boolean
          student_code?: string
          student_id?: string
          student_name?: string
          student_number?: number | null
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "student_followup_cases_batch_id_fkey"
            columns: ["batch_id"]
            isOneToOne: false
            referencedRelation: "student_followup_batches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "student_followup_cases_class_id_fkey"
            columns: ["class_id"]
            isOneToOne: false
            referencedRelation: "school_classes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "student_followup_cases_enrollment_id_fkey"
            columns: ["enrollment_id"]
            isOneToOne: false
            referencedRelation: "student_enrollments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "student_followup_cases_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
        ]
      }
      student_followup_settings: {
        Row: {
          director_name_text: string | null
          director_position_text: string
          id: number
          motto_line_1: string
          motto_line_2: string
          motto_line_3: string
          official_email_text: string
          official_phone_text: string
          official_school_address_text: string
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          director_name_text?: string | null
          director_position_text?: string
          id?: number
          motto_line_1?: string
          motto_line_2?: string
          motto_line_3?: string
          official_email_text?: string
          official_phone_text?: string
          official_school_address_text?: string
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          director_name_text?: string | null
          director_position_text?: string
          id?: number
          motto_line_1?: string
          motto_line_2?: string
          motto_line_3?: string
          official_email_text?: string
          official_phone_text?: string
          official_school_address_text?: string
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: []
      }
      student_import_batches: {
        Row: {
          academic_year: string
          completed_at: string | null
          created_at: string
          error_count: number
          id: string
          inserted_count: number
          notes: Json
          semester: number
          source_filename: string
          status: string
          total_rows: number
          updated_count: number
          uploaded_by: string
        }
        Insert: {
          academic_year: string
          completed_at?: string | null
          created_at?: string
          error_count?: number
          id?: string
          inserted_count?: number
          notes?: Json
          semester: number
          source_filename: string
          status?: string
          total_rows?: number
          updated_count?: number
          uploaded_by: string
        }
        Update: {
          academic_year?: string
          completed_at?: string | null
          created_at?: string
          error_count?: number
          id?: string
          inserted_count?: number
          notes?: Json
          semester?: number
          source_filename?: string
          status?: string
          total_rows?: number
          updated_count?: number
          uploaded_by?: string
        }
        Relationships: [
          {
            foreignKeyName: "student_import_batches_uploaded_by_fkey"
            columns: ["uploaded_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      student_import_reconciliation_items: {
        Row: {
          created_at: string
          enrollment_id: string | null
          from_class_label: string | null
          id: string
          issue_type: string
          resolution_code: string | null
          resolution_note: string | null
          resolved_at: string | null
          resolved_by: string | null
          resolved_by_name: string | null
          session_id: string
          student_code: string | null
          student_id: string | null
          student_name: string
          to_class_label: string | null
        }
        Insert: {
          created_at?: string
          enrollment_id?: string | null
          from_class_label?: string | null
          id?: string
          issue_type: string
          resolution_code?: string | null
          resolution_note?: string | null
          resolved_at?: string | null
          resolved_by?: string | null
          resolved_by_name?: string | null
          session_id: string
          student_code?: string | null
          student_id?: string | null
          student_name: string
          to_class_label?: string | null
        }
        Update: {
          created_at?: string
          enrollment_id?: string | null
          from_class_label?: string | null
          id?: string
          issue_type?: string
          resolution_code?: string | null
          resolution_note?: string | null
          resolved_at?: string | null
          resolved_by?: string | null
          resolved_by_name?: string | null
          session_id?: string
          student_code?: string | null
          student_id?: string | null
          student_name?: string
          to_class_label?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "student_import_reconciliation_items_enrollment_id_fkey"
            columns: ["enrollment_id"]
            isOneToOne: false
            referencedRelation: "student_enrollments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "student_import_reconciliation_items_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "student_import_reconciliation_sessions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "student_import_reconciliation_items_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
        ]
      }
      student_import_reconciliation_sessions: {
        Row: {
          academic_year: string
          completed_at: string | null
          created_at: string
          created_by: string
          existing_total: number
          file_total: number
          id: string
          import_error: string | null
          imported_rows: number
          inserted_count: number
          missing_count: number
          new_count: number
          room_change_count: number
          semester: number
          source_filename: string
          status: string
          updated_at: string
          updated_count: number
        }
        Insert: {
          academic_year: string
          completed_at?: string | null
          created_at?: string
          created_by?: string
          existing_total?: number
          file_total?: number
          id?: string
          import_error?: string | null
          imported_rows?: number
          inserted_count?: number
          missing_count?: number
          new_count?: number
          room_change_count?: number
          semester: number
          source_filename: string
          status?: string
          updated_at?: string
          updated_count?: number
        }
        Update: {
          academic_year?: string
          completed_at?: string | null
          created_at?: string
          created_by?: string
          existing_total?: number
          file_total?: number
          id?: string
          import_error?: string | null
          imported_rows?: number
          inserted_count?: number
          missing_count?: number
          new_count?: number
          room_change_count?: number
          semester?: number
          source_filename?: string
          status?: string
          updated_at?: string
          updated_count?: number
        }
        Relationships: []
      }
      student_promotion_batches: {
        Row: {
          applied_at: string | null
          applied_by: string | null
          created_at: string
          created_by: string
          id: string
          source_class_id: string
          status: string
          target_academic_year: string
          target_semester: number
        }
        Insert: {
          applied_at?: string | null
          applied_by?: string | null
          created_at?: string
          created_by: string
          id?: string
          source_class_id: string
          status?: string
          target_academic_year: string
          target_semester?: number
        }
        Update: {
          applied_at?: string | null
          applied_by?: string | null
          created_at?: string
          created_by?: string
          id?: string
          source_class_id?: string
          status?: string
          target_academic_year?: string
          target_semester?: number
        }
        Relationships: [
          {
            foreignKeyName: "student_promotion_batches_applied_by_fkey"
            columns: ["applied_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "student_promotion_batches_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "student_promotion_batches_source_class_id_fkey"
            columns: ["source_class_id"]
            isOneToOne: false
            referencedRelation: "school_classes"
            referencedColumns: ["id"]
          },
        ]
      }
      student_promotion_items: {
        Row: {
          batch_id: string
          created_at: string
          decision: string
          id: string
          note: string | null
          source_enrollment_id: string
          student_id: string
          target_class_id: string | null
          updated_at: string
        }
        Insert: {
          batch_id: string
          created_at?: string
          decision?: string
          id?: string
          note?: string | null
          source_enrollment_id: string
          student_id: string
          target_class_id?: string | null
          updated_at?: string
        }
        Update: {
          batch_id?: string
          created_at?: string
          decision?: string
          id?: string
          note?: string | null
          source_enrollment_id?: string
          student_id?: string
          target_class_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "student_promotion_items_batch_id_fkey"
            columns: ["batch_id"]
            isOneToOne: false
            referencedRelation: "student_promotion_batches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "student_promotion_items_source_enrollment_id_fkey"
            columns: ["source_enrollment_id"]
            isOneToOne: false
            referencedRelation: "student_enrollments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "student_promotion_items_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "student_promotion_items_target_class_id_fkey"
            columns: ["target_class_id"]
            isOneToOne: false
            referencedRelation: "school_classes"
            referencedColumns: ["id"]
          },
        ]
      }
      students: {
        Row: {
          birth_date: string
          blood_group: string | null
          citizen_id: string
          created_at: string
          created_by: string | null
          disadvantaged_status: string | null
          district: string | null
          ethnicity: string | null
          father_first_name: string | null
          father_last_name: string | null
          father_occupation: string | null
          father_prefix: string | null
          first_name: string
          gender: string | null
          guardian_first_name: string | null
          guardian_last_name: string | null
          guardian_occupation: string | null
          guardian_prefix: string | null
          guardian_relationship: string | null
          height_cm: number | null
          house_no: string | null
          id: string
          last_name: string
          mother_first_name: string | null
          mother_last_name: string | null
          mother_occupation: string | null
          mother_prefix: string | null
          nationality: string | null
          pending_disposal_status: string | null
          photo_bucket: string
          photo_path: string | null
          prefix: string
          province: string | null
          religion: string | null
          road_soi: string | null
          status: string
          student_code: string
          subdistrict: string | null
          updated_at: string
          updated_by: string | null
          village_no: string | null
          weight_kg: number | null
        }
        Insert: {
          birth_date: string
          blood_group?: string | null
          citizen_id: string
          created_at?: string
          created_by?: string | null
          disadvantaged_status?: string | null
          district?: string | null
          ethnicity?: string | null
          father_first_name?: string | null
          father_last_name?: string | null
          father_occupation?: string | null
          father_prefix?: string | null
          first_name: string
          gender?: string | null
          guardian_first_name?: string | null
          guardian_last_name?: string | null
          guardian_occupation?: string | null
          guardian_prefix?: string | null
          guardian_relationship?: string | null
          height_cm?: number | null
          house_no?: string | null
          id?: string
          last_name: string
          mother_first_name?: string | null
          mother_last_name?: string | null
          mother_occupation?: string | null
          mother_prefix?: string | null
          nationality?: string | null
          pending_disposal_status?: string | null
          photo_bucket?: string
          photo_path?: string | null
          prefix: string
          province?: string | null
          religion?: string | null
          road_soi?: string | null
          status?: string
          student_code: string
          subdistrict?: string | null
          updated_at?: string
          updated_by?: string | null
          village_no?: string | null
          weight_kg?: number | null
        }
        Update: {
          birth_date?: string
          blood_group?: string | null
          citizen_id?: string
          created_at?: string
          created_by?: string | null
          disadvantaged_status?: string | null
          district?: string | null
          ethnicity?: string | null
          father_first_name?: string | null
          father_last_name?: string | null
          father_occupation?: string | null
          father_prefix?: string | null
          first_name?: string
          gender?: string | null
          guardian_first_name?: string | null
          guardian_last_name?: string | null
          guardian_occupation?: string | null
          guardian_prefix?: string | null
          guardian_relationship?: string | null
          height_cm?: number | null
          house_no?: string | null
          id?: string
          last_name?: string
          mother_first_name?: string | null
          mother_last_name?: string | null
          mother_occupation?: string | null
          mother_prefix?: string | null
          nationality?: string | null
          pending_disposal_status?: string | null
          photo_bucket?: string
          photo_path?: string | null
          prefix?: string
          province?: string | null
          religion?: string | null
          road_soi?: string | null
          status?: string
          student_code?: string
          subdistrict?: string | null
          updated_at?: string
          updated_by?: string | null
          village_no?: string | null
          weight_kg?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "students_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "students_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      subject_groups: {
        Row: {
          code: string
          created_at: string
          id: string
          is_active: boolean
          name_en: string | null
          name_th: string
          sort_order: number
        }
        Insert: {
          code: string
          created_at?: string
          id?: string
          is_active?: boolean
          name_en?: string | null
          name_th: string
          sort_order?: number
        }
        Update: {
          code?: string
          created_at?: string
          id?: string
          is_active?: boolean
          name_en?: string | null
          name_th?: string
          sort_order?: number
        }
        Relationships: []
      }
      substitute_actions: {
        Row: {
          action: string
          actor_id: string
          actor_name: string
          comment: string | null
          created_at: string
          from_status: string | null
          id: string
          substitute_lesson_id: string
          to_status: string
        }
        Insert: {
          action: string
          actor_id: string
          actor_name: string
          comment?: string | null
          created_at?: string
          from_status?: string | null
          id?: string
          substitute_lesson_id: string
          to_status: string
        }
        Update: {
          action?: string
          actor_id?: string
          actor_name?: string
          comment?: string | null
          created_at?: string
          from_status?: string | null
          id?: string
          substitute_lesson_id?: string
          to_status?: string
        }
        Relationships: [
          {
            foreignKeyName: "substitute_actions_actor_id_fkey"
            columns: ["actor_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "substitute_actions_substitute_lesson_id_fkey"
            columns: ["substitute_lesson_id"]
            isOneToOne: false
            referencedRelation: "substitute_lessons"
            referencedColumns: ["id"]
          },
        ]
      }
      substitute_day_assignments: {
        Row: {
          absent_teacher_id: string
          academic_year: number
          accepted_at: string | null
          accepted_by: string | null
          assigned_at: string
          assigned_by: string
          assigned_by_name: string
          id: string
          leave_date: string
          leave_request_id: string
          note: string | null
          semester: number
          signature_id: string | null
          signature_method: string | null
          signed_at: string | null
          status: string
          substitute_teacher_id: string
          substitute_teacher_name: string
          updated_at: string
        }
        Insert: {
          absent_teacher_id: string
          academic_year: number
          accepted_at?: string | null
          accepted_by?: string | null
          assigned_at?: string
          assigned_by: string
          assigned_by_name: string
          id?: string
          leave_date: string
          leave_request_id: string
          note?: string | null
          semester: number
          signature_id?: string | null
          signature_method?: string | null
          signed_at?: string | null
          status?: string
          substitute_teacher_id: string
          substitute_teacher_name: string
          updated_at?: string
        }
        Update: {
          absent_teacher_id?: string
          academic_year?: number
          accepted_at?: string | null
          accepted_by?: string | null
          assigned_at?: string
          assigned_by?: string
          assigned_by_name?: string
          id?: string
          leave_date?: string
          leave_request_id?: string
          note?: string | null
          semester?: number
          signature_id?: string | null
          signature_method?: string | null
          signed_at?: string | null
          status?: string
          substitute_teacher_id?: string
          substitute_teacher_name?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "substitute_day_assignments_absent_teacher_id_fkey"
            columns: ["absent_teacher_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "substitute_day_assignments_accepted_by_fkey"
            columns: ["accepted_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "substitute_day_assignments_assigned_by_fkey"
            columns: ["assigned_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "substitute_day_assignments_leave_request_id_fkey"
            columns: ["leave_request_id"]
            isOneToOne: false
            referencedRelation: "leave_requests"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "substitute_day_assignments_signature_id_fkey"
            columns: ["signature_id"]
            isOneToOne: false
            referencedRelation: "signatures"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "substitute_day_assignments_substitute_teacher_id_fkey"
            columns: ["substitute_teacher_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      substitute_day_audit: {
        Row: {
          action: string
          actor_id: string
          day_assignment_id: string
          happened_at: string
          id: number
          new_teacher_id: string | null
          note: string | null
          previous_teacher_id: string | null
        }
        Insert: {
          action: string
          actor_id: string
          day_assignment_id: string
          happened_at?: string
          id?: never
          new_teacher_id?: string | null
          note?: string | null
          previous_teacher_id?: string | null
        }
        Update: {
          action?: string
          actor_id?: string
          day_assignment_id?: string
          happened_at?: string
          id?: never
          new_teacher_id?: string | null
          note?: string | null
          previous_teacher_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "substitute_day_audit_actor_id_fkey"
            columns: ["actor_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "substitute_day_audit_day_assignment_id_fkey"
            columns: ["day_assignment_id"]
            isOneToOne: false
            referencedRelation: "substitute_day_assignments"
            referencedColumns: ["id"]
          },
        ]
      }
      substitute_day_periods: {
        Row: {
          class_label: string | null
          day_assignment_id: string
          end_time: string
          period_no: number
          start_time: string
          status: string
          subject_name: string | null
        }
        Insert: {
          class_label?: string | null
          day_assignment_id: string
          end_time: string
          period_no: number
          start_time: string
          status: string
          subject_name?: string | null
        }
        Update: {
          class_label?: string | null
          day_assignment_id?: string
          end_time?: string
          period_no?: number
          start_time?: string
          status?: string
          subject_name?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "substitute_day_periods_day_assignment_id_fkey"
            columns: ["day_assignment_id"]
            isOneToOne: false
            referencedRelation: "substitute_day_assignments"
            referencedColumns: ["id"]
          },
        ]
      }
      substitute_lessons: {
        Row: {
          absent_teacher_id: string
          absent_teacher_name: string
          academic_year: number
          assigned_at: string | null
          assigned_by: string | null
          assigned_by_name: string | null
          class_id: string | null
          class_label: string
          created_at: string
          end_time: string
          id: string
          leave_date: string
          leave_request_id: string
          leave_request_no: number
          note: string | null
          period_no: number
          semester: number
          stage_code: string
          start_time: string
          status: string
          subject_id: string | null
          subject_name: string
          substitute_teacher_id: string | null
          substitute_teacher_name: string | null
          timetable_entry_id: string
          updated_at: string
        }
        Insert: {
          absent_teacher_id: string
          absent_teacher_name: string
          academic_year: number
          assigned_at?: string | null
          assigned_by?: string | null
          assigned_by_name?: string | null
          class_id?: string | null
          class_label: string
          created_at?: string
          end_time: string
          id?: string
          leave_date: string
          leave_request_id: string
          leave_request_no: number
          note?: string | null
          period_no: number
          semester: number
          stage_code: string
          start_time: string
          status?: string
          subject_id?: string | null
          subject_name: string
          substitute_teacher_id?: string | null
          substitute_teacher_name?: string | null
          timetable_entry_id: string
          updated_at?: string
        }
        Update: {
          absent_teacher_id?: string
          absent_teacher_name?: string
          academic_year?: number
          assigned_at?: string | null
          assigned_by?: string | null
          assigned_by_name?: string | null
          class_id?: string | null
          class_label?: string
          created_at?: string
          end_time?: string
          id?: string
          leave_date?: string
          leave_request_id?: string
          leave_request_no?: number
          note?: string | null
          period_no?: number
          semester?: number
          stage_code?: string
          start_time?: string
          status?: string
          subject_id?: string | null
          subject_name?: string
          substitute_teacher_id?: string | null
          substitute_teacher_name?: string | null
          timetable_entry_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "substitute_lessons_absent_teacher_id_fkey"
            columns: ["absent_teacher_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "substitute_lessons_assigned_by_fkey"
            columns: ["assigned_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "substitute_lessons_class_id_fkey"
            columns: ["class_id"]
            isOneToOne: false
            referencedRelation: "school_classes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "substitute_lessons_leave_request_id_fkey"
            columns: ["leave_request_id"]
            isOneToOne: false
            referencedRelation: "leave_requests"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "substitute_lessons_subject_id_fkey"
            columns: ["subject_id"]
            isOneToOne: false
            referencedRelation: "academic_subjects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "substitute_lessons_substitute_teacher_id_fkey"
            columns: ["substitute_teacher_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      system_settings: {
        Row: {
          assistant_teacher_years: number
          bootstrap_complete: boolean
          brand_short: string
          education_office_th: string
          id: number
          leave_quota_days: number
          leave_quota_term1_days: number
          leave_quota_term1_times: number
          leave_quota_term2_days: number
          leave_quota_term2_times: number
          leave_quota_times: number
          qualification_special_years: number
          qualification_standard_years: number
          school_address_th: string
          school_name_th: string
          special_area_school: boolean
          system_name: string
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          assistant_teacher_years?: number
          bootstrap_complete?: boolean
          brand_short?: string
          education_office_th?: string
          id?: number
          leave_quota_days?: number
          leave_quota_term1_days?: number
          leave_quota_term1_times?: number
          leave_quota_term2_days?: number
          leave_quota_term2_times?: number
          leave_quota_times?: number
          qualification_special_years?: number
          qualification_standard_years?: number
          school_address_th?: string
          school_name_th?: string
          special_area_school?: boolean
          system_name?: string
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          assistant_teacher_years?: number
          bootstrap_complete?: boolean
          brand_short?: string
          education_office_th?: string
          id?: number
          leave_quota_days?: number
          leave_quota_term1_days?: number
          leave_quota_term1_times?: number
          leave_quota_term2_days?: number
          leave_quota_term2_times?: number
          leave_quota_times?: number
          qualification_special_years?: number
          qualification_standard_years?: number
          school_address_th?: string
          school_name_th?: string
          special_area_school?: boolean
          system_name?: string
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: []
      }
      teaching_assignments: {
        Row: {
          class_id: string
          created_at: string
          created_by: string | null
          id: string
          is_active: boolean
          note: string | null
          periods_per_week: number
          subject_id: string
          teacher_id: string
          teacher_name: string | null
          updated_at: string
        }
        Insert: {
          class_id: string
          created_at?: string
          created_by?: string | null
          id?: string
          is_active?: boolean
          note?: string | null
          periods_per_week?: number
          subject_id: string
          teacher_id: string
          teacher_name?: string | null
          updated_at?: string
        }
        Update: {
          class_id?: string
          created_at?: string
          created_by?: string | null
          id?: string
          is_active?: boolean
          note?: string | null
          periods_per_week?: number
          subject_id?: string
          teacher_id?: string
          teacher_name?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "teaching_assignments_class_id_fkey"
            columns: ["class_id"]
            isOneToOne: false
            referencedRelation: "school_classes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "teaching_assignments_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "teaching_assignments_subject_id_fkey"
            columns: ["subject_id"]
            isOneToOne: false
            referencedRelation: "academic_subjects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "teaching_assignments_teacher_id_fkey"
            columns: ["teacher_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      timetable_demo_assignments: {
        Row: {
          class_id: string
          created_at: string
          id: string
          periods_per_week: number
          subject_id: string
          teacher_id: string
        }
        Insert: {
          class_id: string
          created_at?: string
          id?: string
          periods_per_week: number
          subject_id: string
          teacher_id: string
        }
        Update: {
          class_id?: string
          created_at?: string
          id?: string
          periods_per_week?: number
          subject_id?: string
          teacher_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "timetable_demo_assignments_class_id_fkey"
            columns: ["class_id"]
            isOneToOne: false
            referencedRelation: "school_classes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "timetable_demo_assignments_subject_id_fkey"
            columns: ["subject_id"]
            isOneToOne: false
            referencedRelation: "academic_subjects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "timetable_demo_assignments_teacher_id_fkey"
            columns: ["teacher_id"]
            isOneToOne: false
            referencedRelation: "timetable_demo_teachers"
            referencedColumns: ["id"]
          },
        ]
      }
      timetable_demo_entries: {
        Row: {
          assignment_id: string
          class_id: string
          created_at: string
          id: string
          is_locked: boolean
          period_no: number
          weekday: number
        }
        Insert: {
          assignment_id: string
          class_id: string
          created_at?: string
          id?: string
          is_locked?: boolean
          period_no: number
          weekday: number
        }
        Update: {
          assignment_id?: string
          class_id?: string
          created_at?: string
          id?: string
          is_locked?: boolean
          period_no?: number
          weekday?: number
        }
        Relationships: [
          {
            foreignKeyName: "timetable_demo_entries_assignment_id_fkey"
            columns: ["assignment_id"]
            isOneToOne: false
            referencedRelation: "timetable_demo_assignments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "timetable_demo_entries_class_id_fkey"
            columns: ["class_id"]
            isOneToOne: false
            referencedRelation: "school_classes"
            referencedColumns: ["id"]
          },
        ]
      }
      timetable_demo_managers: {
        Row: {
          class_id: string
          created_at: string
          teacher_id: string
        }
        Insert: {
          class_id: string
          created_at?: string
          teacher_id: string
        }
        Update: {
          class_id?: string
          created_at?: string
          teacher_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "timetable_demo_managers_class_id_fkey"
            columns: ["class_id"]
            isOneToOne: true
            referencedRelation: "school_classes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "timetable_demo_managers_teacher_id_fkey"
            columns: ["teacher_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      timetable_demo_teachers: {
        Row: {
          class_id: string
          created_at: string
          demo_number: number
          display_name: string
          id: string
        }
        Insert: {
          class_id: string
          created_at?: string
          demo_number: number
          display_name: string
          id?: string
        }
        Update: {
          class_id?: string
          created_at?: string
          demo_number?: number
          display_name?: string
          id?: string
        }
        Relationships: [
          {
            foreignKeyName: "timetable_demo_teachers_class_id_fkey"
            columns: ["class_id"]
            isOneToOne: false
            referencedRelation: "school_classes"
            referencedColumns: ["id"]
          },
        ]
      }
      timetable_demo_unavailability: {
        Row: {
          class_id: string
          created_at: string
          id: string
          period_no: number
          teacher_id: string
          weekday: number
        }
        Insert: {
          class_id: string
          created_at?: string
          id?: string
          period_no: number
          teacher_id: string
          weekday: number
        }
        Update: {
          class_id?: string
          created_at?: string
          id?: string
          period_no?: number
          teacher_id?: string
          weekday?: number
        }
        Relationships: [
          {
            foreignKeyName: "timetable_demo_unavailability_class_id_fkey"
            columns: ["class_id"]
            isOneToOne: false
            referencedRelation: "school_classes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "timetable_demo_unavailability_teacher_id_fkey"
            columns: ["teacher_id"]
            isOneToOne: false
            referencedRelation: "timetable_demo_teachers"
            referencedColumns: ["id"]
          },
        ]
      }
      timetable_entries: {
        Row: {
          assignment_id: string
          created_at: string
          created_by: string | null
          id: string
          joint_activity_id: string | null
          period_id: string
          timetable_id: string
          updated_at: string
          weekday: number
        }
        Insert: {
          assignment_id: string
          created_at?: string
          created_by?: string | null
          id?: string
          joint_activity_id?: string | null
          period_id: string
          timetable_id: string
          updated_at?: string
          weekday: number
        }
        Update: {
          assignment_id?: string
          created_at?: string
          created_by?: string | null
          id?: string
          joint_activity_id?: string | null
          period_id?: string
          timetable_id?: string
          updated_at?: string
          weekday?: number
        }
        Relationships: [
          {
            foreignKeyName: "timetable_entries_assignment_id_fkey"
            columns: ["assignment_id"]
            isOneToOne: false
            referencedRelation: "teaching_assignments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "timetable_entries_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "timetable_entries_joint_activity_id_fkey"
            columns: ["joint_activity_id"]
            isOneToOne: false
            referencedRelation: "timetable_joint_activities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "timetable_entries_period_id_fkey"
            columns: ["period_id"]
            isOneToOne: false
            referencedRelation: "timetable_periods"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "timetable_entries_timetable_id_fkey"
            columns: ["timetable_id"]
            isOneToOne: false
            referencedRelation: "timetable_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      timetable_fixed_slots: {
        Row: {
          assignment_id: string
          class_id: string
          created_at: string
          created_by: string | null
          id: string
          period_no: number
          weekday: number
        }
        Insert: {
          assignment_id: string
          class_id: string
          created_at?: string
          created_by?: string | null
          id?: string
          period_no: number
          weekday: number
        }
        Update: {
          assignment_id?: string
          class_id?: string
          created_at?: string
          created_by?: string | null
          id?: string
          period_no?: number
          weekday?: number
        }
        Relationships: [
          {
            foreignKeyName: "timetable_fixed_slots_assignment_id_fkey"
            columns: ["assignment_id"]
            isOneToOne: false
            referencedRelation: "teaching_assignments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "timetable_fixed_slots_class_id_fkey"
            columns: ["class_id"]
            isOneToOne: false
            referencedRelation: "school_classes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "timetable_fixed_slots_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      timetable_joint_activities: {
        Row: {
          academic_year: string
          created_at: string
          created_by: string | null
          end_time: string
          id: string
          kind: string
          owner_timetable_id: string
          semester: number
          start_time: string
          title: string
          weekday: number
        }
        Insert: {
          academic_year: string
          created_at?: string
          created_by?: string | null
          end_time: string
          id?: string
          kind: string
          owner_timetable_id: string
          semester: number
          start_time: string
          title: string
          weekday: number
        }
        Update: {
          academic_year?: string
          created_at?: string
          created_by?: string | null
          end_time?: string
          id?: string
          kind?: string
          owner_timetable_id?: string
          semester?: number
          start_time?: string
          title?: string
          weekday?: number
        }
        Relationships: [
          {
            foreignKeyName: "timetable_joint_activities_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "timetable_joint_activities_owner_timetable_id_fkey"
            columns: ["owner_timetable_id"]
            isOneToOne: false
            referencedRelation: "timetable_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      timetable_joint_activity_teachers: {
        Row: {
          activity_id: string
          added_at: string
          teacher_id: string
        }
        Insert: {
          activity_id: string
          added_at?: string
          teacher_id: string
        }
        Update: {
          activity_id?: string
          added_at?: string
          teacher_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "timetable_joint_activity_teachers_activity_id_fkey"
            columns: ["activity_id"]
            isOneToOne: false
            referencedRelation: "timetable_joint_activities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "timetable_joint_activity_teachers_teacher_id_fkey"
            columns: ["teacher_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      timetable_period_template_items: {
        Row: {
          created_at: string
          end_time: string
          id: string
          is_break: boolean
          label: string | null
          period_no: number
          sort_order: number
          start_time: string
          template_id: string
        }
        Insert: {
          created_at?: string
          end_time: string
          id?: string
          is_break?: boolean
          label?: string | null
          period_no: number
          sort_order: number
          start_time: string
          template_id: string
        }
        Update: {
          created_at?: string
          end_time?: string
          id?: string
          is_break?: boolean
          label?: string | null
          period_no?: number
          sort_order?: number
          start_time?: string
          template_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "timetable_period_template_items_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "timetable_period_templates"
            referencedColumns: ["id"]
          },
        ]
      }
      timetable_period_templates: {
        Row: {
          academic_year: string
          created_at: string
          created_by: string | null
          id: string
          name: string
          semester: number
          updated_at: string
          weekdays: number[]
        }
        Insert: {
          academic_year: string
          created_at?: string
          created_by?: string | null
          id?: string
          name?: string
          semester: number
          updated_at?: string
          weekdays?: number[]
        }
        Update: {
          academic_year?: string
          created_at?: string
          created_by?: string | null
          id?: string
          name?: string
          semester?: number
          updated_at?: string
          weekdays?: number[]
        }
        Relationships: [
          {
            foreignKeyName: "timetable_period_templates_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      timetable_periods: {
        Row: {
          created_at: string
          end_time: string
          id: string
          is_break: boolean
          label: string | null
          period_no: number
          sort_order: number
          start_time: string
          timetable_id: string
        }
        Insert: {
          created_at?: string
          end_time: string
          id?: string
          is_break?: boolean
          label?: string | null
          period_no: number
          sort_order: number
          start_time: string
          timetable_id: string
        }
        Update: {
          created_at?: string
          end_time?: string
          id?: string
          is_break?: boolean
          label?: string | null
          period_no?: number
          sort_order?: number
          start_time?: string
          timetable_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "timetable_periods_timetable_id_fkey"
            columns: ["timetable_id"]
            isOneToOne: false
            referencedRelation: "timetable_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      timetable_profiles: {
        Row: {
          academic_head_name: string | null
          class_id: string
          created_at: string
          created_by: string | null
          director_name: string | null
          id: string
          period_mode: string
          period_template_id: string | null
          published_at: string | null
          published_by: string | null
          status: string
          updated_at: string
          weekdays: number[]
        }
        Insert: {
          academic_head_name?: string | null
          class_id: string
          created_at?: string
          created_by?: string | null
          director_name?: string | null
          id?: string
          period_mode?: string
          period_template_id?: string | null
          published_at?: string | null
          published_by?: string | null
          status?: string
          updated_at?: string
          weekdays?: number[]
        }
        Update: {
          academic_head_name?: string | null
          class_id?: string
          created_at?: string
          created_by?: string | null
          director_name?: string | null
          id?: string
          period_mode?: string
          period_template_id?: string | null
          published_at?: string | null
          published_by?: string | null
          status?: string
          updated_at?: string
          weekdays?: number[]
        }
        Relationships: [
          {
            foreignKeyName: "timetable_profiles_class_id_fkey"
            columns: ["class_id"]
            isOneToOne: true
            referencedRelation: "school_classes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "timetable_profiles_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "timetable_profiles_period_template_id_fkey"
            columns: ["period_template_id"]
            isOneToOne: false
            referencedRelation: "timetable_period_templates"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "timetable_profiles_published_by_fkey"
            columns: ["published_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      timetable_teacher_unavailability: {
        Row: {
          academic_year: string
          created_at: string
          created_by: string | null
          id: string
          period_no: number
          reason: string | null
          semester: number
          teacher_id: string
          weekday: number
        }
        Insert: {
          academic_year: string
          created_at?: string
          created_by?: string | null
          id?: string
          period_no: number
          reason?: string | null
          semester: number
          teacher_id: string
          weekday: number
        }
        Update: {
          academic_year?: string
          created_at?: string
          created_by?: string | null
          id?: string
          period_no?: number
          reason?: string | null
          semester?: number
          teacher_id?: string
          weekday?: number
        }
        Relationships: [
          {
            foreignKeyName: "timetable_teacher_unavailability_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "timetable_teacher_unavailability_teacher_id_fkey"
            columns: ["teacher_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      user_signature_preferences: {
        Row: {
          auto_approve_confirmed_at: string | null
          auto_approve_enabled: boolean
          auto_sign_confirmed_at: string | null
          auto_sign_enabled: boolean
          created_at: string
          default_signature_id: string | null
          preferred_method: string
          updated_at: string
          user_id: string
        }
        Insert: {
          auto_approve_confirmed_at?: string | null
          auto_approve_enabled?: boolean
          auto_sign_confirmed_at?: string | null
          auto_sign_enabled?: boolean
          created_at?: string
          default_signature_id?: string | null
          preferred_method?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          auto_approve_confirmed_at?: string | null
          auto_approve_enabled?: boolean
          auto_sign_confirmed_at?: string | null
          auto_sign_enabled?: boolean
          created_at?: string
          default_signature_id?: string | null
          preferred_method?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_signature_preferences_default_signature_id_fkey"
            columns: ["default_signature_id"]
            isOneToOne: false
            referencedRelation: "signatures"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_signature_preferences_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      workflow_actions: {
        Row: {
          action: string
          actor_id: string
          actor_name: string | null
          actor_role: string
          comment: string | null
          created_at: string
          from_status: string | null
          id: string
          lesson_plan_id: string
          signature_id: string | null
          to_status: string | null
        }
        Insert: {
          action: string
          actor_id: string
          actor_name?: string | null
          actor_role: string
          comment?: string | null
          created_at?: string
          from_status?: string | null
          id?: string
          lesson_plan_id: string
          signature_id?: string | null
          to_status?: string | null
        }
        Update: {
          action?: string
          actor_id?: string
          actor_name?: string | null
          actor_role?: string
          comment?: string | null
          created_at?: string
          from_status?: string | null
          id?: string
          lesson_plan_id?: string
          signature_id?: string | null
          to_status?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "workflow_actions_actor_id_fkey"
            columns: ["actor_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "workflow_actions_lesson_plan_id_fkey"
            columns: ["lesson_plan_id"]
            isOneToOne: false
            referencedRelation: "lesson_plans"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "workflow_actions_signature_id_fkey"
            columns: ["signature_id"]
            isOneToOne: false
            referencedRelation: "signatures"
            referencedColumns: ["id"]
          },
        ]
      }
      workflow_document_signature_audit: {
        Row: {
          actor_user_id: string
          created_at: string
          document_id: string
          id: number
          new_method: string
          new_signature_id: string | null
          old_method: string | null
          old_signature_id: string | null
          scope_key: string
          slot_code: string
          system_code: string
        }
        Insert: {
          actor_user_id: string
          created_at?: string
          document_id: string
          id?: never
          new_method: string
          new_signature_id?: string | null
          old_method?: string | null
          old_signature_id?: string | null
          scope_key: string
          slot_code: string
          system_code: string
        }
        Update: {
          actor_user_id?: string
          created_at?: string
          document_id?: string
          id?: never
          new_method?: string
          new_signature_id?: string | null
          old_method?: string | null
          old_signature_id?: string | null
          scope_key?: string
          slot_code?: string
          system_code?: string
        }
        Relationships: []
      }
      workflow_document_signatures: {
        Row: {
          bucket_id: string | null
          created_at: string
          document_id: string
          id: string
          method: string
          scope_key: string
          signature_id: string | null
          signed_at: string | null
          signer_user_id: string
          slot_code: string
          storage_path: string | null
          system_code: string
          updated_at: string
        }
        Insert: {
          bucket_id?: string | null
          created_at?: string
          document_id: string
          id?: string
          method?: string
          scope_key?: string
          signature_id?: string | null
          signed_at?: string | null
          signer_user_id: string
          slot_code: string
          storage_path?: string | null
          system_code: string
          updated_at?: string
        }
        Update: {
          bucket_id?: string | null
          created_at?: string
          document_id?: string
          id?: string
          method?: string
          scope_key?: string
          signature_id?: string | null
          signed_at?: string | null
          signer_user_id?: string
          slot_code?: string
          storage_path?: string | null
          system_code?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "workflow_document_signatures_signature_id_fkey"
            columns: ["signature_id"]
            isOneToOne: false
            referencedRelation: "signatures"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "workflow_document_signatures_signer_user_id_fkey"
            columns: ["signer_user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      acknowledge_preschool_group_cover: {
        Args: { p_acknowledge?: boolean; p_cover_id: string }
        Returns: Json
      }
      add_student_followup_cases: {
        Args: { p_batch_id: string; p_items: Json }
        Returns: {
          absence_note: string | null
          absence_total_days: number
          batch_id: string
          class_id: string | null
          class_label: string
          created_at: string
          created_by: string
          enrollment_id: string | null
          followed_at: string | null
          followed_by: string | null
          followup_note: string | null
          followup_status: string
          guardian_name: string | null
          id: string
          over_five_consecutive: boolean
          over_seven_in_month: boolean
          student_code: string
          student_id: string
          student_name: string
          student_number: number | null
          updated_at: string
          updated_by: string | null
        }[]
        SetofOptions: {
          from: "*"
          to: "student_followup_cases"
          isOneToOne: false
          isSetofReturn: true
        }
      }
      admin_create_executive_signature: {
        Args: {
          p_authorization_note?: string
          p_executive_user_id: string
          p_label: string
          p_source?: string
          p_storage_path: string
        }
        Returns: {
          bucket_id: string
          created_at: string
          id: string
          is_default: boolean
          label: string | null
          source: string
          storage_path: string
          user_id: string
        }
        SetofOptions: {
          from: "*"
          to: "signatures"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      admin_data_center_execute_reset: {
        Args: {
          p_backup_confirmed: boolean
          p_backup_reference: string
          p_confirmation: string
          p_preview_id: string
        }
        Returns: Json
      }
      admin_data_center_overview: { Args: never; Returns: Json }
      admin_data_center_reset_history: { Args: never; Returns: Json }
      admin_data_center_reset_preview: {
        Args: { p_academic_year: number; p_scope: string; p_semester: number }
        Returns: Json
      }
      admin_reset_official_attendance_face: {
        Args: { p_user_id: string }
        Returns: boolean
      }
      admin_review_user: {
        Args: {
          p_decision: string
          p_department_id?: string
          p_role?: string
          p_user_id: string
        }
        Returns: {
          account_status: string
          approved_at: string | null
          approved_by: string | null
          created_at: string
          deleted_at: string | null
          deleted_by: string | null
          department_id: string | null
          email: string | null
          employee_code: string | null
          full_name: string | null
          id: string
          phone: string | null
          requested_department_id: string | null
          role: string
          subject_group_id: string | null
          updated_at: string
        }
        SetofOptions: {
          from: "*"
          to: "profiles"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      apply_my_saved_signature_to_academic_submission: {
        Args: { p_document_id: string; p_slot: string; p_system_code: string }
        Returns: Json
      }
      apply_student_promotion_batch: {
        Args: { p_batch_id: string }
        Returns: number
      }
      apply_timetable_period_template_to_scope: {
        Args: {
          p_academic_year: string
          p_semester: number
          p_stage_code?: string
        }
        Returns: Json
      }
      approve_all_academic_certificate_request: {
        Args: { p_request_id: string }
        Returns: {
          academic_year: string
          applicant_name: string
          birth_date: string | null
          certificate_type: string
          citizen_id: string | null
          class_id: string | null
          class_label: string | null
          contact_phone: string | null
          created_at: string
          created_by: string
          director_decision: string
          director_reason: string | null
          evidence_birth_certificate: boolean
          evidence_house_registration: boolean
          evidence_other: boolean
          evidence_other_note: string | null
          evidence_parent_id: boolean
          evidence_phone: boolean
          evidence_photo: boolean
          father_name: string | null
          finalized_at: string | null
          finalized_by: string | null
          former_academic_year: string | null
          former_class_label: string | null
          former_gpa: number | null
          id: string
          mother_name: string | null
          official_document_assigned_at: string | null
          official_document_assigned_by: string | null
          official_document_number: string | null
          official_document_serial: number | null
          official_document_year: string | null
          preparer_decision: string
          preparer_reason: string | null
          purpose_other: string | null
          purpose_type: string
          registrar_decision: string
          registrar_reason: string | null
          request_code: string | null
          request_date: string
          semester: number
          status: string
          student_address: string | null
          student_code: string | null
          student_id: string
          student_name: string
          student_number: number | null
          submitted_at: string | null
          submitted_by: string | null
          updated_at: string
          updated_by: string | null
        }
        SetofOptions: {
          from: "*"
          to: "academic_certificate_requests"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      approve_all_academic_transfer_request: {
        Args: { p_request_id: string }
        Returns: {
          academic_year: string
          applicant_name: string
          applicant_role: string
          assessment_decision: string
          assessment_reason: string | null
          birth_date: string
          citizen_id: string
          class_id: string | null
          class_label: string
          contact_phone: string
          created_at: string
          created_by: string
          destination_district: string | null
          destination_province: string | null
          destination_residence: string | null
          destination_school: string | null
          director_decision: string
          director_reason: string | null
          evidence_birth_certificate: boolean
          evidence_house_registration: boolean
          evidence_other: boolean
          evidence_other_note: string | null
          evidence_parent_id: boolean
          evidence_phone: boolean
          evidence_photo: boolean
          father_name: string | null
          finalized_at: string | null
          finalized_by: string | null
          finance_amount_due: number | null
          finance_decision: string
          finance_reason: string | null
          finance_status: string
          guardian_address: string | null
          guardian_name: string
          id: string
          mother_name: string | null
          official_document_number: string | null
          official_document_number_updated_at: string | null
          official_document_number_updated_by: string | null
          official_document_number_updated_by_name: string | null
          official_note: string | null
          other_reason: string | null
          reason_type: string
          registrar_decision: string
          registrar_reason: string | null
          request_code: string | null
          request_date: string
          semester: number
          status: string
          student_code: string
          student_id: string
          student_name: string
          student_number: number | null
          submitted_at: string | null
          submitted_by: string | null
          transfer_date: string
          updated_at: string
          updated_by: string | null
        }
        SetofOptions: {
          from: "*"
          to: "academic_transfer_requests"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      assign_bnk_substitute_signed: {
        Args: {
          p_method: string
          p_note: string
          p_signature_id?: string
          p_substitute_lesson_id: string
          p_teacher_id: string
        }
        Returns: undefined
      }
      assign_substitute_day_signed: {
        Args: {
          p_leave_date: string
          p_leave_request_id: string
          p_method: string
          p_note?: string
          p_signature_id?: string
          p_teacher_id: string
        }
        Returns: {
          absent_teacher_id: string
          academic_year: number
          accepted_at: string | null
          accepted_by: string | null
          assigned_at: string
          assigned_by: string
          assigned_by_name: string
          id: string
          leave_date: string
          leave_request_id: string
          note: string | null
          semester: number
          signature_id: string | null
          signature_method: string | null
          signed_at: string | null
          status: string
          substitute_teacher_id: string
          substitute_teacher_name: string
          updated_at: string
        }
        SetofOptions: {
          from: "*"
          to: "substitute_day_assignments"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      assign_substitute_teacher: {
        Args: {
          p_note?: string
          p_substitute_lesson_id: string
          p_teacher_id: string
        }
        Returns: {
          absent_teacher_id: string
          absent_teacher_name: string
          academic_year: number
          assigned_at: string | null
          assigned_by: string | null
          assigned_by_name: string | null
          class_id: string | null
          class_label: string
          created_at: string
          end_time: string
          id: string
          leave_date: string
          leave_request_id: string
          leave_request_no: number
          note: string | null
          period_no: number
          semester: number
          stage_code: string
          start_time: string
          status: string
          subject_id: string | null
          subject_name: string
          substitute_teacher_id: string | null
          substitute_teacher_name: string | null
          timetable_entry_id: string
          updated_at: string
        }
        SetofOptions: {
          from: "*"
          to: "substitute_lessons"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      behavior_can_read: {
        Args: { p_semester: number; p_student: string; p_year: string }
        Returns: boolean
      }
      behavior_hard_delete_event: {
        Args: { p_event_id: string }
        Returns: boolean
      }
      behavior_is_editor: { Args: never; Returns: boolean }
      behavior_is_leader: { Args: never; Returns: boolean }
      behavior_is_super_admin: { Args: never; Returns: boolean }
      behavior_roster: {
        Args: { p_semester: number; p_year: string }
        Returns: {
          class_id: string
          class_name: string
          full_name: string
          guardian_name: string
          student_code: string
          student_id: string
          student_number: number
        }[]
      }
      bootstrap_super_admin: {
        Args: never
        Returns: {
          account_status: string
          approved_at: string | null
          approved_by: string | null
          created_at: string
          deleted_at: string | null
          deleted_by: string | null
          department_id: string | null
          email: string | null
          employee_code: string | null
          full_name: string | null
          id: string
          phone: string | null
          requested_department_id: string | null
          role: string
          subject_group_id: string | null
          updated_at: string
        }
        SetofOptions: {
          from: "*"
          to: "profiles"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      cancel_official_attendance_record: {
        Args: { p_reason: string; p_record_id: string }
        Returns: {
          attendance_date: string
          cancel_reason: string
          cancellation_id: string
          cancelled_at: string
          cancelled_by: string
          cancelled_by_name: string
          checkin_at: string
          checkin_method: string
          original_record_id: string
          person_name: string
          status: string
          user_id: string
        }[]
      }
      cancel_procurement_control_number: {
        Args: { p_control_id: string }
        Returns: {
          cancelled_at: string | null
          cancelled_by: string | null
          control_year: number
          created_at: string
          created_by: string
          id: string
          notes: string | null
          parent_control_id: string | null
          primary_number: string
          primary_sequence: number
          procurement_kind: string | null
          released_at: string | null
          released_by: string | null
          released_from_case_code: string | null
          released_from_case_id: string | null
          released_from_case_title: string | null
          secondary_number: string | null
          secondary_sequence: number | null
          series: string
          status: string
          subject: string
          updated_at: string
          updated_by: string | null
        }
        SetofOptions: {
          from: "*"
          to: "procurement_control_numbers"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      cancel_procurement_document_case: {
        Args: { p_case_id: string }
        Returns: Json
      }
      cancel_substitute_day: {
        Args: { p_day_assignment_id: string; p_note?: string }
        Returns: {
          absent_teacher_id: string
          academic_year: number
          accepted_at: string | null
          accepted_by: string | null
          assigned_at: string
          assigned_by: string
          assigned_by_name: string
          id: string
          leave_date: string
          leave_request_id: string
          note: string | null
          semester: number
          signature_id: string | null
          signature_method: string | null
          signed_at: string | null
          status: string
          substitute_teacher_id: string
          substitute_teacher_name: string
          updated_at: string
        }
        SetofOptions: {
          from: "*"
          to: "substitute_day_assignments"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      configure_procurement_control_series: {
        Args: {
          p_control_year: number
          p_series: string
          p_start_number: number
        }
        Returns: {
          control_year: number
          last_number: number
          series: string
          start_number: number
          updated_at: string
          updated_by: string | null
        }
        SetofOptions: {
          from: "*"
          to: "procurement_control_series_settings"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      confirm_budget_signer: {
        Args: {
          p_disbursement_id: string
          p_inspection_confirmed?: boolean
          p_slot: string
        }
        Returns: undefined
      }
      confirm_substitute_day_signed: {
        Args: {
          p_day_assignment_id: string
          p_method: string
          p_signature?: string
        }
        Returns: {
          absent_teacher_id: string
          academic_year: number
          accepted_at: string | null
          accepted_by: string | null
          assigned_at: string
          assigned_by: string
          assigned_by_name: string
          id: string
          leave_date: string
          leave_request_id: string
          note: string | null
          semester: number
          signature_id: string | null
          signature_method: string | null
          signed_at: string | null
          status: string
          substitute_teacher_id: string
          substitute_teacher_name: string
          updated_at: string
        }
        SetofOptions: {
          from: "*"
          to: "substitute_day_assignments"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      confirm_substitute_teacher_signed: {
        Args: {
          p_method: string
          p_signature?: string
          p_substitute_lesson_id: string
        }
        Returns: {
          accepted_at: string | null
          automatic: boolean
          created_at: string
          document_date: string
          document_id: string
          document_kind: string
          id: string
          method: string
          signature_id: string | null
          signed_at: string | null
          signer_user_id: string
          slot_code: string
          updated_at: string
        }
        SetofOptions: {
          from: "*"
          to: "school_document_signatures"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      copy_student_registry_semester: {
        Args: {
          p_academic_year: string
          p_from_semester: number
          p_to_semester: number
        }
        Returns: Json
      }
      create_procurement_control_number:
        | {
            Args: {
              p_control_year: number
              p_notes?: string
              p_parent_control_id?: string
              p_primary_number: string
              p_procurement_kind?: string
              p_secondary_number?: string
              p_series: string
              p_subject?: string
            }
            Returns: {
              cancelled_at: string | null
              cancelled_by: string | null
              control_year: number
              created_at: string
              created_by: string
              id: string
              notes: string | null
              parent_control_id: string | null
              primary_number: string
              primary_sequence: number
              procurement_kind: string | null
              released_at: string | null
              released_by: string | null
              released_from_case_code: string | null
              released_from_case_id: string | null
              released_from_case_title: string | null
              secondary_number: string | null
              secondary_sequence: number | null
              series: string
              status: string
              subject: string
              updated_at: string
              updated_by: string | null
            }
            SetofOptions: {
              from: "*"
              to: "procurement_control_numbers"
              isOneToOne: true
              isSetofReturn: false
            }
          }
        | {
            Args: {
              p_control_year: number
              p_notes?: string
              p_parent_control_id?: string
              p_procurement_kind?: string
              p_series: string
              p_subject?: string
            }
            Returns: {
              cancelled_at: string | null
              cancelled_by: string | null
              control_year: number
              created_at: string
              created_by: string
              id: string
              notes: string | null
              parent_control_id: string | null
              primary_number: string
              primary_sequence: number
              procurement_kind: string | null
              released_at: string | null
              released_by: string | null
              released_from_case_code: string | null
              released_from_case_id: string | null
              released_from_case_title: string | null
              secondary_number: string | null
              secondary_sequence: number | null
              series: string
              status: string
              subject: string
              updated_at: string
              updated_by: string | null
            }
            SetofOptions: {
              from: "*"
              to: "procurement_control_numbers"
              isOneToOne: true
              isSetofReturn: false
            }
          }
      create_student_import_reconciliation: {
        Args: {
          p_academic_year: string
          p_file_total: number
          p_missing: Json
          p_new: Json
          p_room_changes: Json
          p_semester: number
          p_source_filename: string
        }
        Returns: string
      }
      create_timetable_joint_activity: {
        Args: {
          p_extra_teacher_ids?: string[]
          p_kind?: string
          p_other_assignment_ids?: string[]
          p_source_entry_id: string
          p_title?: string
        }
        Returns: string
      }
      delete_classroom_research_report: {
        Args: { p_report_id: string }
        Returns: boolean
      }
      delete_club_activity_report: {
        Args: { p_report_id: string }
        Returns: boolean
      }
      delete_learner_activity_report: {
        Args: { p_report_id: string }
        Returns: boolean
      }
      delete_learning_media_report: {
        Args: { p_report_id: string }
        Returns: boolean
      }
      delete_lesson_plan_usage_report: {
        Args: { p_report_id: string }
        Returns: boolean
      }
      delete_my_official_attendance_face: { Args: never; Returns: boolean }
      delete_post_lesson_report: {
        Args: { p_report_id: string }
        Returns: boolean
      }
      delete_procurement_control_number: {
        Args: { p_control_id: string }
        Returns: Json
      }
      delete_procurement_document_case: {
        Args: { p_case_id: string }
        Returns: Json
      }
      delete_school_project_safely: {
        Args: { p_project_id: string }
        Returns: Json
      }
      director_review_leave_request: {
        Args: {
          p_comment?: string
          p_decision: string
          p_leave_request_id: string
        }
        Returns: {
          academic_year: number
          affects_teaching_schedule: boolean
          approval_version: number
          approved_at: string | null
          contact_during_leave: string | null
          contact_phone: string | null
          created_at: string
          director_approval_automatic: boolean
          director_comment: string | null
          director_reviewed_at: string | null
          director_reviewer_id: string | null
          director_reviewer_name: string | null
          director_signature_id: string | null
          end_date: string
          id: string
          leave_days: number
          leave_type_code: string
          leave_year: number
          other_leave_text: string | null
          personnel_comment: string | null
          personnel_reviewed_at: string | null
          personnel_reviewer_id: string | null
          personnel_reviewer_name: string | null
          reason: string
          request_no: number
          requester_id: string
          requester_name: string
          requester_position: string | null
          requester_role: string
          semester: number
          start_date: string
          status: string
          submitted_at: string | null
          updated_at: string
        }
        SetofOptions: {
          from: "*"
          to: "leave_requests"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      director_review_leave_request_signed: {
        Args: {
          p_comment: string
          p_decision: string
          p_leave_request_id: string
          p_method: string
          p_signature?: string
        }
        Returns: {
          academic_year: number
          affects_teaching_schedule: boolean
          approval_version: number
          approved_at: string | null
          contact_during_leave: string | null
          contact_phone: string | null
          created_at: string
          director_approval_automatic: boolean
          director_comment: string | null
          director_reviewed_at: string | null
          director_reviewer_id: string | null
          director_reviewer_name: string | null
          director_signature_id: string | null
          end_date: string
          id: string
          leave_days: number
          leave_type_code: string
          leave_year: number
          other_leave_text: string | null
          personnel_comment: string | null
          personnel_reviewed_at: string | null
          personnel_reviewer_id: string | null
          personnel_reviewer_name: string | null
          reason: string
          request_no: number
          requester_id: string
          requester_name: string
          requester_position: string | null
          requester_role: string
          semester: number
          start_date: string
          status: string
          submitted_at: string | null
          updated_at: string
        }
        SetofOptions: {
          from: "*"
          to: "leave_requests"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      director_review_lesson_plan: {
        Args: {
          p_comment?: string
          p_decision: string
          p_lesson_plan_id: string
          p_signature_id?: string
        }
        Returns: {
          academic_year: string
          activities: string | null
          approval_version: number
          approved_at: string | null
          assessment: string | null
          class_level: string | null
          content_summary: string | null
          created_at: string
          department_id: string
          director_approval_automatic: boolean
          director_decision: string
          director_reviewed_at: string | null
          director_reviewer_id: string | null
          head_decision: string
          head_reviewed_at: string | null
          head_reviewer_id: string | null
          id: string
          learning_objectives: string | null
          learning_unit: string | null
          plan_type: string
          revision_note: string | null
          semester: number
          status: string
          subject_code: string | null
          subject_name: string
          submitted_at: string | null
          teach_date: string | null
          teacher_id: string
          teacher_name: string | null
          term_id: string | null
          topic: string | null
          updated_at: string
          week_number: number | null
        }
        SetofOptions: {
          from: "*"
          to: "lesson_plans"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      director_review_lesson_plan_signed: {
        Args: {
          p_comment?: string
          p_decision: string
          p_lesson_plan_id: string
          p_method?: string
          p_signature_id?: string
        }
        Returns: {
          academic_year: string
          activities: string | null
          approval_version: number
          approved_at: string | null
          assessment: string | null
          class_level: string | null
          content_summary: string | null
          created_at: string
          department_id: string
          director_approval_automatic: boolean
          director_decision: string
          director_reviewed_at: string | null
          director_reviewer_id: string | null
          head_decision: string
          head_reviewed_at: string | null
          head_reviewer_id: string | null
          id: string
          learning_objectives: string | null
          learning_unit: string | null
          plan_type: string
          revision_note: string | null
          semester: number
          status: string
          subject_code: string | null
          subject_name: string
          submitted_at: string | null
          teach_date: string | null
          teacher_id: string
          teacher_name: string | null
          term_id: string | null
          topic: string | null
          updated_at: string
          week_number: number | null
        }
        SetofOptions: {
          from: "*"
          to: "lesson_plans"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      edufee_can_collect: { Args: { p_class: string }; Returns: boolean }
      edufee_can_read_class: { Args: { p_class: string }; Returns: boolean }
      edufee_is_leader: { Args: never; Returns: boolean }
      edufee_is_manager: { Args: never; Returns: boolean }
      edufee_is_superadmin: { Args: never; Returns: boolean }
      edufee_my_collectible_classes: {
        Args: { p_semester: number; p_year: string }
        Returns: {
          class_id: string
        }[]
      }
      edufee_record_payment: {
        Args: {
          p_amount: number
          p_category: string
          p_class: string
          p_note: string
          p_paid_on: string
          p_payer: string
          p_request: string
          p_semester: number
          p_student: string
          p_year: string
        }
        Returns: {
          academic_year: string
          amount: number
          category: string
          class_id: string
          id: string
          note: string | null
          paid_on: string
          payer_name: string | null
          recorded_at: string
          recorded_by: string
          request_id: string
          semester: number
          sequence_no: number
          student_id: string
          void_reason: string | null
          voided_at: string | null
          voided_by: string | null
        }
        SetofOptions: {
          from: "*"
          to: "edufee_payments"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      edufee_roster: {
        Args: { p_semester: number; p_year: string }
        Returns: {
          class_id: string
          class_name: string
          full_name: string
          guardian_name: string
          student_code: string
          student_id: string
          student_number: number
        }[]
      }
      edufee_save_fee_plan: {
        Args: {
          p_annual_amount: number
          p_category: string
          p_cycle: string
          p_term1_amount: number
          p_term2_amount: number
          p_year: string
        }
        Returns: undefined
      }
      edufee_void_payment: {
        Args: { p_id: string; p_reason: string }
        Returns: {
          academic_year: string
          amount: number
          category: string
          class_id: string
          id: string
          note: string | null
          paid_on: string
          payer_name: string | null
          recorded_at: string
          recorded_by: string
          request_id: string
          semester: number
          sequence_no: number
          student_id: string
          void_reason: string | null
          voided_at: string | null
          voided_by: string | null
        }
        SetofOptions: {
          from: "*"
          to: "edufee_payments"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      electricity_open_period: {
        Args: { p_billing_month: string; p_due_date: string; p_rate: number }
        Returns: string
      }
      electricity_review_payment: {
        Args: { p_approve: boolean; p_note?: string; p_reading_id: string }
        Returns: undefined
      }
      electricity_review_reading: {
        Args: { p_approve: boolean; p_note?: string; p_reading_id: string }
        Returns: undefined
      }
      electricity_save_meter: {
        Args: {
          p_house_label: string
          p_id: string
          p_is_active?: boolean
          p_meter_code: string
          p_occupant_name: string
          p_occupant_user_id: string
          p_opening_reading: number
        }
        Returns: string
      }
      electricity_save_settings: {
        Args: {
          p_bank_account_name: string
          p_bank_account_no: string
          p_bank_name: string
          p_default_rate: number
          p_manager_user_id: string
          p_payment_instructions: string
          p_receipt_signatory: string
        }
        Returns: undefined
      }
      electricity_submit_payment: {
        Args: { p_reading_id: string; p_slip_path: string }
        Returns: undefined
      }
      electricity_submit_reading: {
        Args: {
          p_current: number
          p_meter_id: string
          p_period_id: string
          p_photo_path: string
        }
        Returns: string
      }
      ensure_academic_certificate_document_number: {
        Args: { p_request_id: string }
        Returns: {
          academic_year: string
          applicant_name: string
          birth_date: string | null
          certificate_type: string
          citizen_id: string | null
          class_id: string | null
          class_label: string | null
          contact_phone: string | null
          created_at: string
          created_by: string
          director_decision: string
          director_reason: string | null
          evidence_birth_certificate: boolean
          evidence_house_registration: boolean
          evidence_other: boolean
          evidence_other_note: string | null
          evidence_parent_id: boolean
          evidence_phone: boolean
          evidence_photo: boolean
          father_name: string | null
          finalized_at: string | null
          finalized_by: string | null
          former_academic_year: string | null
          former_class_label: string | null
          former_gpa: number | null
          id: string
          mother_name: string | null
          official_document_assigned_at: string | null
          official_document_assigned_by: string | null
          official_document_number: string | null
          official_document_serial: number | null
          official_document_year: string | null
          preparer_decision: string
          preparer_reason: string | null
          purpose_other: string | null
          purpose_type: string
          registrar_decision: string
          registrar_reason: string | null
          request_code: string | null
          request_date: string
          semester: number
          status: string
          student_address: string | null
          student_code: string | null
          student_id: string
          student_name: string
          student_number: number | null
          submitted_at: string | null
          submitted_by: string | null
          updated_at: string
          updated_by: string | null
        }
        SetofOptions: {
          from: "*"
          to: "academic_certificate_requests"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      fail_student_import_reconciliation: {
        Args: { p_error: string; p_session_id: string }
        Returns: undefined
      }
      finalize_student_import_reconciliation: {
        Args: {
          p_imported_rows: number
          p_inserted_count: number
          p_session_id: string
          p_updated_count: number
        }
        Returns: {
          academic_year: string
          completed_at: string | null
          created_at: string
          created_by: string
          existing_total: number
          file_total: number
          id: string
          import_error: string | null
          imported_rows: number
          inserted_count: number
          missing_count: number
          new_count: number
          room_change_count: number
          semester: number
          source_filename: string
          status: string
          updated_at: string
          updated_count: number
        }
        SetofOptions: {
          from: "*"
          to: "student_import_reconciliation_sessions"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      get_academic_certificate_role_candidates: {
        Args: never
        Returns: {
          full_name: string
          role: string
          user_id: string
        }[]
      }
      get_academic_certificate_signers: {
        Args: never
        Returns: {
          full_name: string
          position_title: string
          signer_slot: string
          user_id: string
        }[]
      }
      get_academic_certificate_student_photo: {
        Args: { p_request_id: string }
        Returns: {
          photo_bucket: string
          photo_path: string
        }[]
      }
      get_academic_document_service_role_candidates: {
        Args: never
        Returns: {
          full_name: string
          id: string
          role: string
        }[]
      }
      get_academic_document_service_signers: {
        Args: never
        Returns: {
          full_name: string
          position_title: string
          signer_slot: string
          user_id: string
        }[]
      }
      get_academic_document_service_student_options: {
        Args: { p_academic_year: string; p_semester: number }
        Returns: {
          class_id: string
          class_label: string
          district: string
          enrollment_academic_year: string
          enrollment_semester: number
          first_name: string
          guardian_first_name: string
          guardian_last_name: string
          guardian_prefix: string
          house_no: string
          last_name: string
          prefix: string
          province: string
          student_code: string
          student_id: string
          student_number: number
          subdistrict: string
          village_no: string
        }[]
      }
      get_academic_period_options: {
        Args: {
          p_academic_year: string
          p_semester: number
          p_stage_code: string
        }
        Returns: {
          end_time: string
          period_label: string
          period_no: number
          start_time: string
        }[]
      }
      get_academic_registration_role_candidates: {
        Args: never
        Returns: {
          full_name: string
          role: string
          user_id: string
        }[]
      }
      get_academic_registration_signers: {
        Args: never
        Returns: {
          full_name: string
          position_title: string
          signer_slot: string
          user_id: string
        }[]
      }
      get_academic_stage_teachers: {
        Args: {
          p_academic_year: string
          p_semester: number
          p_stage_code: string
        }
        Returns: {
          full_name: string
          teacher_id: string
        }[]
      }
      get_academic_submission_deadline: {
        Args: {
          p_academic_year: string
          p_semester: number
          p_system_code: string
        }
        Returns: {
          academic_year: string
          deadline_enabled: boolean
          due_at: string | null
          opens_at: string | null
          period_type: string
          semester: number
          system_code: string
          updated_at: string
          updated_by: string | null
        }
        SetofOptions: {
          from: "*"
          to: "academic_submission_deadlines"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      get_academic_submission_monitoring: {
        Args: { p_academic_year: string; p_semester: number }
        Returns: {
          classroom_research_count: number
          classroom_research_state: string
          club_activity_count: number
          club_activity_state: string
          completed_count: number
          homeroom_class_id: string
          homeroom_class_label: string
          learner_activities_count: number
          learner_activities_state: string
          learning_media_count: number
          learning_media_state: string
          lesson_plan_usage_count: number
          lesson_plan_usage_state: string
          overall_state: string
          position_title: string
          post_lesson_count: number
          post_lesson_state: string
          required_count: number
          role: string
          teacher_id: string
          teacher_name: string
          teaching_assignment_count: number
        }[]
      }
      get_academic_submission_period_context: {
        Args: { p_academic_year: string; p_semester: number }
        Returns: {
          academic_year: string
          academic_year_end_date: string
          academic_year_start_date: string
          semester: number
          semester_end_date: string
          semester_start_date: string
        }[]
      }
      get_academic_supervisor_candidates: {
        Args: never
        Returns: {
          full_name: string
          role: string
          user_id: string
        }[]
      }
      get_academic_transfer_official_number_history: {
        Args: { p_request_id: string }
        Returns: {
          changed_at: string
          changed_by_name: string
          id: string
          new_number: string
          previous_number: string
        }[]
      }
      get_approval_control_center: { Args: never; Returns: Json }
      get_auto_signature_for_export: {
        Args: {
          p_document_id?: string
          p_executive_kind?: string
          p_system_code: string
        }
        Returns: Json
      }
      get_certificate_request_student_options: {
        Args: { p_academic_year: string; p_semester: number }
        Returns: {
          birth_date: string
          citizen_id: string
          class_id: string
          class_label: string
          enrollment_academic_year: string
          enrollment_semester: number
          father_name: string
          first_name: string
          gender: string
          last_name: string
          mother_name: string
          photo_bucket: string
          photo_path: string
          prefix: string
          student_address: string
          student_code: string
          student_id: string
          student_number: number
        }[]
      }
      get_classroom_research_assignment_options: {
        Args: { p_academic_year: string; p_semester: number }
        Returns: {
          assignment_id: string
          class_id: string
          class_label: string
          student_count: number
          subject_code: string
          subject_group_code: string
          subject_group_id: string
          subject_group_name: string
          subject_id: string
          subject_name: string
        }[]
      }
      get_classroom_research_workflow_settings: {
        Args: never
        Returns: {
          academic_head_name: string
          academic_head_position: string
          academic_head_user_id: string
          director_name: string
          director_position: string
          director_user_id: string
        }[]
      }
      get_club_activity_adviser_candidates: {
        Args: never
        Returns: {
          full_name: string
          position_title: string
          role: string
          user_id: string
        }[]
      }
      get_club_activity_student_candidates: {
        Args: { p_academic_year: string; p_semester: number }
        Returns: {
          class_id: string
          class_label: string
          gender: string
          is_my_homeroom: boolean
          student_code: string
          student_id: string
          student_name: string
          student_number: number
        }[]
      }
      get_club_activity_workflow_settings: {
        Args: never
        Returns: {
          academic_head_name: string
          academic_head_position: string
          academic_head_user_id: string
          director_name: string
          director_position: string
          director_user_id: string
        }[]
      }
      get_dashboard_overview: { Args: never; Returns: Json }
      get_learner_activity_class_options: {
        Args: { p_academic_year: string; p_semester: number }
        Returns: {
          assessment_head_name: string
          assessment_head_position: string
          assessment_head_user_id: string
          class_id: string
          class_label: string
          co_adviser_name: string
          co_adviser_position: string
          co_adviser_user_id: string
          homeroom_teacher_ids: string[]
          homeroom_teacher_names: string[]
          reviewer_name: string
          reviewer_position: string
          reviewer_user_id: string
          stage_code: string
          student_count: number
        }[]
      }
      get_learner_activity_configurable_classes: {
        Args: { p_academic_year: string; p_semester: number }
        Returns: {
          class_id: string
          class_label: string
          reviewer_user_id: string
          stage_code: string
        }[]
      }
      get_learner_activity_role_candidates: {
        Args: never
        Returns: {
          full_name: string
          position_title: string
          role: string
          user_id: string
        }[]
      }
      get_learner_activity_workflow_settings: {
        Args: { p_academic_year: string; p_class_id?: string }
        Returns: {
          academic_head_name: string
          academic_head_position: string
          academic_head_user_id: string
          assessment_head_name: string
          assessment_head_position: string
          assessment_head_user_id: string
          director_name: string
          director_position: string
          director_user_id: string
          reviewer_name: string
          reviewer_position: string
          reviewer_user_id: string
        }[]
      }
      get_learning_media_assignment_options: {
        Args: { p_academic_year: string; p_semester: number }
        Returns: {
          assignment_id: string
          class_id: string
          class_label: string
          student_count: number
          subject_code: string
          subject_group_code: string
          subject_group_id: string
          subject_group_name: string
          subject_id: string
          subject_name: string
        }[]
      }
      get_learning_media_workflow_settings: {
        Args: never
        Returns: {
          academic_head_name: string
          academic_head_position: string
          academic_head_user_id: string
          director_name: string
          director_position: string
          director_user_id: string
        }[]
      }
      get_lesson_plan_usage_assignment_options: {
        Args: { p_academic_year: string; p_semester: number }
        Returns: {
          assignment_id: string
          class_id: string
          class_label: string
          student_count: number
          subject_code: string
          subject_group_code: string
          subject_group_id: string
          subject_group_name: string
          subject_id: string
          subject_name: string
        }[]
      }
      get_lesson_plan_usage_document_settings: {
        Args: { p_academic_year: string; p_semester: number }
        Returns: {
          academic_year: string
          memo_date: string | null
          memo_number: string | null
          semester: number
          updated_at: string
          updated_by: string | null
        }
        SetofOptions: {
          from: "*"
          to: "academic_lesson_plan_usage_document_settings"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      get_lesson_plan_usage_role_candidates: {
        Args: never
        Returns: {
          department_code: string
          full_name: string
          position_title: string
          role: string
          user_id: string
        }[]
      }
      get_lesson_plan_usage_subject_group_heads: {
        Args: { p_academic_year: string }
        Returns: {
          head_name: string
          head_position: string
          head_user_id: string
          subject_group_code: string
          subject_group_id: string
          subject_group_name: string
        }[]
      }
      get_lesson_plan_usage_workflow_settings: {
        Args: never
        Returns: {
          academic_head_name: string
          academic_head_position: string
          academic_head_user_id: string
          director_name: string
          director_position: string
          director_user_id: string
        }[]
      }
      get_my_academic_stages: {
        Args: { p_academic_year: string; p_semester: number }
        Returns: {
          stage_code: string
        }[]
      }
      get_my_homeroom_context: {
        Args: { p_academic_year: string; p_semester: number }
        Returns: {
          class_id: string
          class_label: string
          homeroom_teacher_ids: string[]
          homeroom_teacher_names: string[]
          stage_code: string
          student_count: number
        }[]
      }
      get_my_official_attendance_face_status: {
        Args: never
        Returns: {
          model_version: string
          registered: boolean
          registered_at: string
          updated_at: string
        }[]
      }
      get_my_personnel_pa_assessment_summary: {
        Args: { p_period_id: string }
        Returns: {
          all_complete: boolean
          assessments: Json
          average_score: number
          committee_count: number
          pa2_passed: boolean
          submitted_count: number
        }[]
      }
      get_my_personnel_pa_assessment_tasks: {
        Args: { p_period_id: string }
        Returns: {
          academic_rank: string
          assessment_id: string
          assessment_status: string
          challenge_title: string
          committee_member_id: string
          evaluatee_name: string
          evaluatee_user_id: string
          member_role: string
          passed: boolean
          position_title: string
          report_id: string
          section1_total: number
          section2_total: number
          slot_no: number
          total_score: number
        }[]
      }
      get_my_school_duties: {
        Args: { p_academic_year: string; p_semester: number }
        Returns: {
          department_code: string
          has_homeroom_duty: boolean
          has_stage_duty: boolean
          has_teaching_duty: boolean
          homeroom_class_count: number
          is_teacher_capable: boolean
          primary_role: string
          stage_head_count: number
          teaching_assignment_count: number
          user_id: string
        }[]
      }
      get_my_signature_preferences: {
        Args: never
        Returns: {
          auto_approve_confirmed_at: string
          auto_approve_enabled: boolean
          auto_sign_confirmed_at: string
          auto_sign_enabled: boolean
          can_enable_auto_approve: boolean
          default_signature_id: string
          has_default_signature: boolean
          preferred_method: string
          signature_count: number
        }[]
      }
      get_my_teacher_context: {
        Args: { p_academic_year: string; p_semester: number }
        Returns: {
          department_code: string
          duty_complete: boolean
          has_homeroom_duty: boolean
          has_teaching_duty: boolean
          homeroom_class_id: string
          homeroom_class_label: string
          is_teacher_capable: boolean
          primary_role: string
          teaching_assignment_count: number
          user_id: string
        }[]
      }
      get_official_attendance_cancellations: {
        Args: { p_end_date?: string; p_start_date?: string }
        Returns: {
          attendance_date: string
          cancel_reason: string
          cancelled_at: string
          cancelled_by: string
          cancelled_by_name: string
          checkin_at: string
          checkin_method: string
          id: string
          original_record_id: string
          person_name: string
          status: string
          user_id: string
        }[]
      }
      get_official_attendance_face_registration_statuses: {
        Args: never
        Returns: {
          model_version: string
          registered: boolean
          registered_at: string
          user_id: string
        }[]
      }
      get_official_attendance_today_qr: {
        Args: never
        Returns: {
          attendance_date: string
          created_at: string
          generation: number
          is_active: boolean
          rotated_at: string
          token: string
        }[]
      }
      get_personnel_pa_assessment_dashboard: {
        Args: { p_period_id: string }
        Returns: {
          academic_rank: string
          all_complete: boolean
          average_score: number
          challenge_title: string
          committee_count: number
          committee_members: Json
          department_name: string
          full_name: string
          pa2_passed: boolean
          position_title: string
          report_id: string
          report_status: string
          role: string
          submitted_assessment_count: number
          user_id: string
        }[]
      }
      get_personnel_pa_dashboard: {
        Args: { p_period_id: string }
        Returns: {
          academic_rank: string
          challenge_title: string
          department_name: string
          full_name: string
          position_title: string
          role: string
          submission_id: string
          submission_mode: string
          submission_status: string
          submitted_at: string
          updated_at: string
          user_id: string
        }[]
      }
      get_personnel_pa_report_dashboard: {
        Args: { p_period_id: string }
        Returns: {
          academic_rank: string
          challenge_title: string
          department_name: string
          full_name: string
          position_title: string
          report_id: string
          report_status: string
          report_submitted_at: string
          report_updated_at: string
          role: string
          start_submission_id: string
          start_submission_mode: string
          start_submission_status: string
          user_id: string
        }[]
      }
      get_post_lesson_assignment_options: {
        Args: { p_academic_year: string; p_semester: number }
        Returns: {
          assignment_id: string
          class_id: string
          class_label: string
          stage_code: string
          subject_code: string
          subject_group_code: string
          subject_group_name: string
          subject_id: string
          subject_name: string
        }[]
      }
      get_post_lesson_role_candidates: {
        Args: never
        Returns: {
          department_code: string
          full_name: string
          position_title: string
          role: string
          user_id: string
        }[]
      }
      get_post_lesson_workflow_settings: {
        Args: never
        Returns: {
          academic_head_name: string
          academic_head_position: string
          academic_head_user_id: string
          deputy_director_name: string
          deputy_director_position: string
          deputy_director_user_id: string
          director_name: string
          director_position: string
          director_user_id: string
        }[]
      }
      get_procurement_control_case_links: {
        Args: never
        Returns: {
          case_code: string
          control_disbursement_id: string
          control_inventory_issue_id: string
          control_order_id: string
          control_purchase_order_id: string
          control_request_approval_id: string
          form_data: Json
          id: string
          title: string
        }[]
      }
      get_school_lunch_procurement_controls: {
        Args: { p_control_year: number }
        Returns: {
          control_year: number
          id: string
          parent_control_id: string
          primary_number: string
          secondary_number: string
          series: string
          subject: string
          used_by_lunch_round_id: string
          used_by_lunch_round_label: string
        }[]
      }
      get_signature_compliance_overview: { Args: never; Returns: Json }
      get_staff_teacher_duty_audit: {
        Args: { p_academic_year: string; p_semester: number }
        Returns: {
          department_code: string
          duty_complete: boolean
          full_name: string
          homeroom_class_id: string
          homeroom_class_label: string
          primary_role: string
          teaching_assignment_count: number
          user_id: string
        }[]
      }
      get_staff_teacher_duty_audit_v2: {
        Args: { p_academic_year: string; p_semester: number }
        Returns: {
          department_code: string
          duty_complete: boolean
          full_name: string
          homeroom_class_id: string
          homeroom_class_label: string
          homeroom_stage_code: string
          preschool_weekly_unit_count: number
          primary_role: string
          teaching_assignment_count: number
          user_id: string
        }[]
      }
      get_student_class_roster: {
        Args: { p_class_id: string }
        Returns: {
          academic_year: string
          class_id: string
          first_name: string
          gender: string
          homeroom_teacher_names: string[]
          last_name: string
          level_name: string
          prefix: string
          room_name: string
          semester: number
          stage_code: string
          student_code: string
          student_id: string
        }[]
      }
      get_student_followup_official_number_history: {
        Args: { p_batch_id: string }
        Returns: {
          changed_at: string
          changed_by_name: string
          id: string
          new_number: string
          previous_number: string
        }[]
      }
      get_student_followup_student_options: {
        Args: { p_academic_year: string; p_semester: number }
        Returns: {
          class_id: string
          class_label: string
          enrollment_id: string
          guardian_name: string
          student_code: string
          student_id: string
          student_name: string
          student_number: number
        }[]
      }
      get_substitute_candidates: {
        Args: { p_substitute_lesson_id: string }
        Returns: {
          available: boolean
          busy_periods: string
          conflict_reason: string
          free_periods: string
          teacher_id: string
          teacher_name: string
          workload: number
        }[]
      }
      get_substitute_day_candidates: {
        Args: { p_leave_date: string; p_leave_request_id: string }
        Returns: {
          available: boolean
          conflict_reason: string
          teacher_id: string
          teacher_name: string
          workload: number
        }[]
      }
      get_substitute_document_signers: {
        Args: { p_leave_request_id: string }
        Returns: {
          academic_head_name: string
          director_name: string
          stage_head_name: string
          stage_head_title: string
        }[]
      }
      get_supervision_teacher_slots: {
        Args: { p_teacher_id: string; p_week_id: string }
        Returns: {
          class_id: string
          class_label: string
          end_time: string
          event_date: string
          period_label: string
          period_no: number
          start_time: string
          subject_id: string
          subject_name: string
          timetable_entry_id: string
          weekday: number
        }[]
      }
      get_system_scope_policies: {
        Args: never
        Returns: {
          module_code: string
          scope_mode: string
          supports_dual_submission: boolean
          supports_shared_ownership: boolean
          system_code: string
          system_name_th: string
        }[]
      }
      get_transfer_request_student_options: {
        Args: { p_academic_year: string; p_semester: number }
        Returns: {
          academic_year: string
          birth_date: string
          citizen_id: string
          class_id: string
          class_label: string
          father_name: string
          first_name: string
          gender: string
          guardian_name: string
          last_name: string
          mother_name: string
          prefix: string
          semester: number
          student_address: string
          student_code: string
          student_id: string
          student_number: number
        }[]
      }
      get_workflow_signature_options: {
        Args: {
          p_document_id: string
          p_scope_date?: string
          p_system_code: string
        }
        Returns: {
          label: string
          method: string
          slot_code: string
        }[]
      }
      head_review_lesson_plan: {
        Args: {
          p_comment?: string
          p_decision: string
          p_lesson_plan_id: string
          p_signature_id?: string
        }
        Returns: {
          academic_year: string
          activities: string | null
          approval_version: number
          approved_at: string | null
          assessment: string | null
          class_level: string | null
          content_summary: string | null
          created_at: string
          department_id: string
          director_approval_automatic: boolean
          director_decision: string
          director_reviewed_at: string | null
          director_reviewer_id: string | null
          head_decision: string
          head_reviewed_at: string | null
          head_reviewer_id: string | null
          id: string
          learning_objectives: string | null
          learning_unit: string | null
          plan_type: string
          revision_note: string | null
          semester: number
          status: string
          subject_code: string | null
          subject_name: string
          submitted_at: string | null
          teach_date: string | null
          teacher_id: string
          teacher_name: string | null
          term_id: string | null
          topic: string | null
          updated_at: string
          week_number: number | null
        }
        SetofOptions: {
          from: "*"
          to: "lesson_plans"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      head_review_lesson_plan_signed: {
        Args: {
          p_comment?: string
          p_decision: string
          p_lesson_plan_id: string
          p_method?: string
          p_signature_id?: string
        }
        Returns: {
          academic_year: string
          activities: string | null
          approval_version: number
          approved_at: string | null
          assessment: string | null
          class_level: string | null
          content_summary: string | null
          created_at: string
          department_id: string
          director_approval_automatic: boolean
          director_decision: string
          director_reviewed_at: string | null
          director_reviewer_id: string | null
          head_decision: string
          head_reviewed_at: string | null
          head_reviewer_id: string | null
          id: string
          learning_objectives: string | null
          learning_unit: string | null
          plan_type: string
          revision_note: string | null
          semester: number
          status: string
          subject_code: string | null
          subject_name: string
          submitted_at: string | null
          teach_date: string | null
          teacher_id: string
          teacher_name: string | null
          term_id: string | null
          topic: string | null
          updated_at: string
          week_number: number | null
        }
        SetofOptions: {
          from: "*"
          to: "lesson_plans"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      import_student_registry: {
        Args: {
          p_academic_year: string
          p_rows: Json
          p_semester: number
          p_source_filename?: string
        }
        Returns: Json
      }
      initialize_academic_exam_attempts: {
        Args: { p_exam_set_id: string }
        Returns: number
      }
      issue_student_followup_batch: {
        Args: { p_batch_id: string }
        Returns: {
          absence_month: string
          academic_year: string
          batch_code: string
          completed_at: string | null
          created_at: string
          created_by: string
          director_name_snapshot: string | null
          director_position_snapshot: string | null
          director_signature_bucket: string | null
          director_signature_id: string | null
          director_signature_path: string | null
          director_user_id_snapshot: string | null
          id: string
          issued_at: string | null
          issued_by: string | null
          letter_date: string
          official_document_number: string | null
          official_document_number_updated_at: string | null
          official_document_number_updated_by: string | null
          official_document_number_updated_by_name: string | null
          semester: number
          status: string
          updated_at: string
          updated_by: string | null
        }
        SetofOptions: {
          from: "*"
          to: "student_followup_batches"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      keep_alive: { Args: never; Returns: Json }
      mark_student_followup_case_followed: {
        Args: { p_case_id: string; p_note: string }
        Returns: {
          absence_note: string | null
          absence_total_days: number
          batch_id: string
          class_id: string | null
          class_label: string
          created_at: string
          created_by: string
          enrollment_id: string | null
          followed_at: string | null
          followed_by: string | null
          followup_note: string | null
          followup_status: string
          guardian_name: string | null
          id: string
          over_five_consecutive: boolean
          over_seven_in_month: boolean
          student_code: string
          student_id: string
          student_name: string
          student_number: number | null
          updated_at: string
          updated_by: string | null
        }
        SetofOptions: {
          from: "*"
          to: "student_followup_cases"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      my_school_document_signing_slots: {
        Args: { p_day?: string; p_doc: string; p_kind: string }
        Returns: {
          slot_code: string
          slot_label: string
        }[]
      }
      official_attendance_check_in: {
        Args: { p_accuracy_m?: number; p_latitude: number; p_longitude: number }
        Returns: {
          accuracy_m: number | null
          attendance_date: string
          checkin_at: string
          checkin_method: string
          created_at: string
          distance_m: number
          face_liveness_score: number | null
          face_match_distance: number | null
          id: string
          latitude: number
          longitude: number
          ontime_until_snapshot: string
          person_name: string
          person_role: string
          position_title: string | null
          qr_generation: number | null
          signature_bucket: string | null
          signature_id: string | null
          signature_label: string | null
          signature_path: string | null
          status: string
          user_id: string
          work_end_time_snapshot: string
        }
        SetofOptions: {
          from: "*"
          to: "official_attendance_records"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      official_attendance_check_in_face: {
        Args: {
          p_accuracy_m: number
          p_descriptor: Json
          p_latitude: number
          p_liveness_score: number
          p_longitude: number
          p_model_version: string
        }
        Returns: {
          accuracy_m: number | null
          attendance_date: string
          checkin_at: string
          checkin_method: string
          created_at: string
          distance_m: number
          face_liveness_score: number | null
          face_match_distance: number | null
          id: string
          latitude: number
          longitude: number
          ontime_until_snapshot: string
          person_name: string
          person_role: string
          position_title: string | null
          qr_generation: number | null
          signature_bucket: string | null
          signature_id: string | null
          signature_label: string | null
          signature_path: string | null
          status: string
          user_id: string
          work_end_time_snapshot: string
        }
        SetofOptions: {
          from: "*"
          to: "official_attendance_records"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      official_attendance_check_in_qr: {
        Args: {
          p_accuracy_m: number
          p_latitude: number
          p_longitude: number
          p_qr_token: string
        }
        Returns: {
          accuracy_m: number | null
          attendance_date: string
          checkin_at: string
          checkin_method: string
          created_at: string
          distance_m: number
          face_liveness_score: number | null
          face_match_distance: number | null
          id: string
          latitude: number
          longitude: number
          ontime_until_snapshot: string
          person_name: string
          person_role: string
          position_title: string | null
          qr_generation: number | null
          signature_bucket: string | null
          signature_id: string | null
          signature_label: string | null
          signature_path: string | null
          status: string
          user_id: string
          work_end_time_snapshot: string
        }
        SetofOptions: {
          from: "*"
          to: "official_attendance_records"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      personnel_review_leave_request: {
        Args: {
          p_comment?: string
          p_decision: string
          p_leave_request_id: string
        }
        Returns: {
          academic_year: number
          affects_teaching_schedule: boolean
          approval_version: number
          approved_at: string | null
          contact_during_leave: string | null
          contact_phone: string | null
          created_at: string
          director_approval_automatic: boolean
          director_comment: string | null
          director_reviewed_at: string | null
          director_reviewer_id: string | null
          director_reviewer_name: string | null
          director_signature_id: string | null
          end_date: string
          id: string
          leave_days: number
          leave_type_code: string
          leave_year: number
          other_leave_text: string | null
          personnel_comment: string | null
          personnel_reviewed_at: string | null
          personnel_reviewer_id: string | null
          personnel_reviewer_name: string | null
          reason: string
          request_no: number
          requester_id: string
          requester_name: string
          requester_position: string | null
          requester_role: string
          semester: number
          start_date: string
          status: string
          submitted_at: string | null
          updated_at: string
        }
        SetofOptions: {
          from: "*"
          to: "leave_requests"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      personnel_review_leave_request_signed: {
        Args: {
          p_comment: string
          p_decision: string
          p_leave_request_id: string
          p_method: string
          p_signature?: string
        }
        Returns: {
          academic_year: number
          affects_teaching_schedule: boolean
          approval_version: number
          approved_at: string | null
          contact_during_leave: string | null
          contact_phone: string | null
          created_at: string
          director_approval_automatic: boolean
          director_comment: string | null
          director_reviewed_at: string | null
          director_reviewer_id: string | null
          director_reviewer_name: string | null
          director_signature_id: string | null
          end_date: string
          id: string
          leave_days: number
          leave_type_code: string
          leave_year: number
          other_leave_text: string | null
          personnel_comment: string | null
          personnel_reviewed_at: string | null
          personnel_reviewer_id: string | null
          personnel_reviewer_name: string | null
          reason: string
          request_no: number
          requester_id: string
          requester_name: string
          requester_position: string | null
          requester_role: string
          semester: number
          start_date: string
          status: string
          submitted_at: string | null
          updated_at: string
        }
        SetofOptions: {
          from: "*"
          to: "leave_requests"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      preview_substitute_day: {
        Args: { p_leave_date: string; p_leave_request_id: string }
        Returns: {
          class_label: string
          end_time: string
          period_no: number
          start_time: string
          subject_name: string
        }[]
      }
      record_bnk_action_signature: {
        Args: {
          p_action_code: string
          p_document_id: string
          p_method: string
          p_signature_id?: string
          p_system_code: string
        }
        Returns: undefined
      }
      refresh_my_approval_notifications: { Args: never; Returns: number }
      refresh_school_document_auto_signatures: {
        Args: { p_day?: string; p_doc: string; p_kind: string }
        Returns: number
      }
      register_my_official_attendance_face: {
        Args: {
          p_consent?: boolean
          p_descriptor: Json
          p_model_version: string
          p_sample_count?: number
        }
        Returns: {
          registered: boolean
          registered_at: string
        }[]
      }
      replace_school_lunch_round_days: {
        Args: { p_days: Json; p_round_id: string }
        Returns: Json
      }
      reset_personnel_pa_assessment: {
        Args: { p_assessment_id: string; p_reason?: string }
        Returns: boolean
      }
      reset_personnel_pa_evaluator_profile: {
        Args: { p_reason?: string; p_slot_no: number }
        Returns: {
          account_initialized_at: string | null
          auth_user_id: string | null
          created_at: string
          full_name: string | null
          login_email: string
          organization: string | null
          position_title: string | null
          profile_completed_at: string | null
          profile_reset_at: string | null
          profile_reset_by: string | null
          signature_bucket: string | null
          signature_method: string
          signature_method_selected_at: string | null
          signature_mime_type: string | null
          signature_path: string | null
          slot_no: number
          updated_at: string
        }
        SetofOptions: {
          from: "*"
          to: "personnel_pa_evaluator_accounts"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      resolve_student_import_reconciliation: {
        Args: { p_resolutions: Json; p_session_id: string }
        Returns: Json
      }
      review_academic_registration_signed: {
        Args: {
          p_decision: string
          p_finance_amount_due?: number
          p_finance_status?: string
          p_method: string
          p_reason: string
          p_request_id: string
          p_signature_id?: string
          p_slot: string
          p_storage_path?: string
          p_system_code: string
        }
        Returns: undefined
      }
      review_classroom_research_report: {
        Args: {
          p_comment?: string
          p_decision: string
          p_report_id: string
          p_slot: string
        }
        Returns: {
          abstract_text: string | null
          academic_head_comment: string | null
          academic_head_decision: string
          academic_head_id: string | null
          academic_head_name: string | null
          academic_head_position: string | null
          academic_head_reviewed_at: string | null
          academic_year: string
          approval_version: number
          approved_at: string | null
          assignment_id: string
          class_id: string
          class_label: string
          created_at: string
          director_approval_automatic: boolean
          director_comment: string | null
          director_decision: string
          director_name: string | null
          director_position: string | null
          director_reviewed_at: string | null
          director_reviewer_id: string | null
          id: string
          keywords_text: string | null
          one_page_data: Json
          research_bucket: string | null
          research_end_date: string | null
          research_mime_type: string | null
          research_original_name: string | null
          research_size_bytes: number | null
          research_start_date: string | null
          research_storage_path: string | null
          research_type: string
          research_type_other: string | null
          revision_stage: string | null
          semester: number
          status: string
          subject_code: string | null
          subject_group_comment: string | null
          subject_group_decision: string
          subject_group_head_id: string | null
          subject_group_head_name: string | null
          subject_group_head_position: string | null
          subject_group_id: string | null
          subject_group_name: string | null
          subject_group_reviewed_at: string | null
          subject_id: string
          subject_name: string
          submission_mode: string
          submitted_at: string | null
          teacher_id: string
          teacher_name: string
          teacher_position: string | null
          title: string
          updated_at: string
        }
        SetofOptions: {
          from: "*"
          to: "academic_classroom_research_reports"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      review_club_activity_report: {
        Args: {
          p_comment: string
          p_decision: string
          p_report_id: string
          p_slot: string
        }
        Returns: {
          academic_head_comment: string | null
          academic_head_decision: string
          academic_head_id: string | null
          academic_head_name: string | null
          academic_head_position: string | null
          academic_head_reviewed_at: string | null
          academic_year: string
          appendix_notes: string | null
          approval_version: number
          approved_at: string | null
          attendance_threshold: number
          budget_amount: number
          club_name: string
          co_adviser_id: string | null
          co_adviser_name: string | null
          co_adviser_position: string | null
          created_at: string
          director_approval_automatic: boolean
          director_comment: string | null
          director_decision: string
          director_name: string | null
          director_position: string | null
          director_reviewed_at: string | null
          director_reviewer_id: string | null
          id: string
          objectives: Json
          operation_summary: string | null
          photos: Json
          revision_stage: string | null
          semester: number
          session_count: number
          shared_teacher_ids: string[]
          shared_teacher_names: string[]
          source_file_bucket: string | null
          source_file_mime: string | null
          source_file_name: string | null
          source_file_path: string | null
          source_file_size: number | null
          source_file_uploaded_at: string | null
          status: string
          submission_mode: string
          submitted_at: string | null
          success_targets: Json
          teacher_id: string
          teacher_name: string
          teacher_position: string | null
          tracking_unit: string
          updated_at: string
          work_plan: Json
        }
        SetofOptions: {
          from: "*"
          to: "academic_club_activity_reports"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      review_learner_activity_report: {
        Args: {
          p_comment?: string
          p_decision: string
          p_report_id: string
          p_slot: string
        }
        Returns: {
          academic_head_comment: string | null
          academic_head_decision: string
          academic_head_id: string | null
          academic_head_name: string | null
          academic_head_position: string | null
          academic_head_reviewed_at: string | null
          academic_year: string
          activities: Json
          approval_version: number
          approved_at: string | null
          assessment_head_comment: string | null
          assessment_head_decision: string
          assessment_head_id: string | null
          assessment_head_name: string | null
          assessment_head_position: string | null
          assessment_head_reviewed_at: string | null
          class_id: string
          class_label: string
          co_adviser_id: string | null
          co_adviser_name: string | null
          co_adviser_position: string | null
          created_at: string
          director_approval_automatic: boolean
          director_comment: string | null
          director_decision: string
          director_name: string | null
          director_position: string | null
          director_reviewed_at: string | null
          director_reviewer_id: string | null
          exited_female: number
          exited_male: number
          id: string
          joined_female: number
          joined_male: number
          level_reviewer_comment: string | null
          level_reviewer_decision: string
          level_reviewer_id: string | null
          level_reviewer_name: string | null
          level_reviewer_position: string | null
          level_reviewer_reviewed_at: string | null
          opening_female: number
          opening_male: number
          revision_stage: string | null
          semester: number
          shared_teacher_ids: string[]
          shared_teacher_names: string[]
          source_file_bucket: string | null
          source_file_mime: string | null
          source_file_name: string | null
          source_file_path: string | null
          source_file_size: number | null
          source_file_uploaded_at: string | null
          stage_code: string | null
          status: string
          submission_mode: string
          submitted_at: string | null
          teacher_id: string
          teacher_name: string
          teacher_position: string | null
          updated_at: string
        }
        SetofOptions: {
          from: "*"
          to: "academic_learner_activity_reports"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      review_learning_media_report: {
        Args: {
          p_comment?: string
          p_decision: string
          p_report_id: string
          p_slot: string
        }
        Returns: {
          academic_head_comment: string | null
          academic_head_decision: string
          academic_head_id: string | null
          academic_head_name: string | null
          academic_head_position: string | null
          academic_head_reviewed_at: string | null
          academic_year: string
          approval_version: number
          approved_at: string | null
          assignment_id: string | null
          cert_content_appropriate: boolean
          cert_other_text: string | null
          cert_practical: boolean
          class_id: string
          class_label: string
          created_at: string
          director_approval_automatic: boolean
          director_comment: string | null
          director_decision: string
          director_reviewed_at: string | null
          director_reviewer_id: string | null
          id: string
          media_items: Json
          revision_stage: string | null
          semester: number
          status: string
          subject_code: string | null
          subject_group_comment: string | null
          subject_group_decision: string
          subject_group_head_id: string | null
          subject_group_head_name: string | null
          subject_group_head_position: string | null
          subject_group_id: string | null
          subject_group_name: string | null
          subject_group_reviewed_at: string | null
          subject_id: string
          subject_name: string
          submitted_at: string | null
          teacher_id: string
          teacher_name: string
          teacher_position: string | null
          updated_at: string
        }
        SetofOptions: {
          from: "*"
          to: "academic_learning_media_reports"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      review_lesson_plan_usage_report: {
        Args: {
          p_comment?: string
          p_decision: string
          p_report_id: string
          p_slot: string
        }
        Returns: {
          academic_head_comment: string | null
          academic_head_decision: string
          academic_head_id: string | null
          academic_head_name: string | null
          academic_head_position: string | null
          academic_head_reviewed_at: string | null
          academic_year: string
          approval_version: number
          approved_at: string | null
          assignment_id: string | null
          class_id: string
          class_label: string
          created_at: string
          director_approval_automatic: boolean
          director_comment: string | null
          director_decision: string
          director_reviewed_at: string | null
          director_reviewer_id: string | null
          grade_counts: Json
          id: string
          improvements_text: string | null
          memo_date: string | null
          memo_number: string | null
          objectives_text: string | null
          plans_per_unit: number | null
          problems_suggestions_text: string | null
          revision_stage: string | null
          satisfaction_items: Json
          semester: number
          status: string
          strengths_text: string | null
          student_count: number
          subject_code: string | null
          subject_group_comment: string | null
          subject_group_decision: string
          subject_group_head_id: string | null
          subject_group_head_name: string | null
          subject_group_head_position: string | null
          subject_group_id: string | null
          subject_group_name: string | null
          subject_group_reviewed_at: string | null
          subject_id: string
          subject_name: string
          submitted_at: string | null
          summary_text: string | null
          supporting_documents_text: string | null
          teacher_id: string
          teacher_name: string
          teacher_position: string | null
          top_students: Json
          unit_progress: Json
          units_count: number | null
          updated_at: string
          weaknesses_text: string | null
        }
        SetofOptions: {
          from: "*"
          to: "academic_lesson_plan_usage_reports"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      review_post_lesson_report: {
        Args: {
          p_comment?: string
          p_decision: string
          p_report_id: string
          p_signature_id?: string
        }
        Returns: {
          academic_decision: string
          academic_year: string
          approval_version: number
          approved_at: string | null
          assignment_id: string | null
          class_id: string | null
          class_label: string
          competency_text: string | null
          created_at: string
          desirable_attributes_text: string | null
          director_approval_automatic: boolean
          director_decision: string
          director_reviewed_at: string | null
          director_reviewer_id: string | null
          id: string
          include_behavior_assessment: boolean
          knowledge_text: string | null
          other_notes: string | null
          problems_text: string | null
          report_scope: string
          reviewed_at: string | null
          reviewer_comment: string | null
          reviewer_id: string | null
          reviewer_name: string | null
          reviewer_position: string | null
          reviewer_signature_id: string | null
          semester: number
          solutions_text: string | null
          status: string
          subject_code: string | null
          subject_id: string | null
          subject_name: string
          subject_specific_text: string | null
          subject_specific_title: string
          submitted_at: string | null
          teach_date: string | null
          teacher_id: string
          teacher_name: string
          teacher_position: string | null
          teacher_signature_id: string | null
          unit_number: number | null
          unit_title: string
          updated_at: string
        }
        SetofOptions: {
          from: "*"
          to: "academic_post_lesson_reports"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      review_signature_compliance: {
        Args: {
          p_before_action: boolean
          p_four_methods: boolean
          p_identity_timestamp: boolean
          p_notes: string
          p_pdf: boolean
          p_system_code: string
        }
        Returns: undefined
      }
      rotate_official_attendance_today_qr: {
        Args: never
        Returns: {
          attendance_date: string
          created_at: string
          generation: number
          is_active: boolean
          rotated_at: string
          token: string
        }[]
      }
      run_my_academic_auto_actions: { Args: never; Returns: Json }
      save_academic_certificate_request: {
        Args: { p_payload: Json; p_request_id: string }
        Returns: {
          academic_year: string
          applicant_name: string
          birth_date: string | null
          certificate_type: string
          citizen_id: string | null
          class_id: string | null
          class_label: string | null
          contact_phone: string | null
          created_at: string
          created_by: string
          director_decision: string
          director_reason: string | null
          evidence_birth_certificate: boolean
          evidence_house_registration: boolean
          evidence_other: boolean
          evidence_other_note: string | null
          evidence_parent_id: boolean
          evidence_phone: boolean
          evidence_photo: boolean
          father_name: string | null
          finalized_at: string | null
          finalized_by: string | null
          former_academic_year: string | null
          former_class_label: string | null
          former_gpa: number | null
          id: string
          mother_name: string | null
          official_document_assigned_at: string | null
          official_document_assigned_by: string | null
          official_document_number: string | null
          official_document_serial: number | null
          official_document_year: string | null
          preparer_decision: string
          preparer_reason: string | null
          purpose_other: string | null
          purpose_type: string
          registrar_decision: string
          registrar_reason: string | null
          request_code: string | null
          request_date: string
          semester: number
          status: string
          student_address: string | null
          student_code: string | null
          student_id: string
          student_name: string
          student_number: number | null
          submitted_at: string | null
          submitted_by: string | null
          updated_at: string
          updated_by: string | null
        }
        SetofOptions: {
          from: "*"
          to: "academic_certificate_requests"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      save_academic_document_service_request: {
        Args: { p_payload: Json; p_request_id: string }
        Returns: {
          academic_year: string | null
          applicant_district: string | null
          applicant_email: string | null
          applicant_first_name: string | null
          applicant_house_no: string | null
          applicant_last_name: string | null
          applicant_phone: string | null
          applicant_prefix: string | null
          applicant_province: string | null
          applicant_subdistrict: string | null
          applicant_village_name: string | null
          applicant_village_no: string | null
          assessment_decision: string
          assessment_reason: string | null
          class_label: string | null
          created_at: string
          created_by: string
          director_decision: string
          director_reason: string | null
          doc_certificate: boolean
          doc_certificate_with_grade: boolean
          doc_other: boolean
          doc_other_note: string | null
          doc_transcript: boolean
          doc_transcript_lost: boolean
          evidence_father_id_count: number
          evidence_mother_id_count: number
          evidence_other: boolean
          evidence_other_note: string | null
          evidence_photo_count: number
          evidence_police_report: boolean
          evidence_student_id_count: number
          finalized_at: string | null
          finalized_by: string | null
          graduation_year: string | null
          id: string
          purpose_text: string | null
          registrar_decision: string
          registrar_reason: string | null
          request_code: string
          request_date: string
          request_serial: number
          request_year: string
          semester: number | null
          status: string
          student_code: string | null
          student_first_name: string
          student_id: string | null
          student_last_name: string | null
          student_name: string
          student_prefix: string | null
          submitted_at: string | null
          submitted_by: string | null
          updated_at: string
          updated_by: string | null
        }
        SetofOptions: {
          from: "*"
          to: "academic_document_service_requests"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      save_academic_plc_plan: {
        Args: {
          p_academic_year: string
          p_end_date: string
          p_event_dates: string[]
          p_note: string
          p_period_no: number
          p_plan_id: string
          p_recurrence_type: string
          p_semester: number
          p_stage_code: string
          p_start_date: string
          p_title: string
          p_weekday: number
        }
        Returns: string
      }
      save_academic_supervision_slot: {
        Args: {
          p_note?: string
          p_supervisor_user_id: string
          p_teacher_id: string
          p_timetable_entry_id: string
          p_week_id: string
        }
        Returns: string
      }
      save_academic_transfer_official_fields: {
        Args: {
          p_destination_residence: string
          p_guardian_address: string
          p_official_note?: string
          p_request_id: string
        }
        Returns: {
          academic_year: string
          applicant_name: string
          applicant_role: string
          assessment_decision: string
          assessment_reason: string | null
          birth_date: string
          citizen_id: string
          class_id: string | null
          class_label: string
          contact_phone: string
          created_at: string
          created_by: string
          destination_district: string | null
          destination_province: string | null
          destination_residence: string | null
          destination_school: string | null
          director_decision: string
          director_reason: string | null
          evidence_birth_certificate: boolean
          evidence_house_registration: boolean
          evidence_other: boolean
          evidence_other_note: string | null
          evidence_parent_id: boolean
          evidence_phone: boolean
          evidence_photo: boolean
          father_name: string | null
          finalized_at: string | null
          finalized_by: string | null
          finance_amount_due: number | null
          finance_decision: string
          finance_reason: string | null
          finance_status: string
          guardian_address: string | null
          guardian_name: string
          id: string
          mother_name: string | null
          official_document_number: string | null
          official_document_number_updated_at: string | null
          official_document_number_updated_by: string | null
          official_document_number_updated_by_name: string | null
          official_note: string | null
          other_reason: string | null
          reason_type: string
          registrar_decision: string
          registrar_reason: string | null
          request_code: string | null
          request_date: string
          semester: number
          status: string
          student_code: string
          student_id: string
          student_name: string
          student_number: number | null
          submitted_at: string | null
          submitted_by: string | null
          transfer_date: string
          updated_at: string
          updated_by: string | null
        }
        SetofOptions: {
          from: "*"
          to: "academic_transfer_requests"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      save_academic_transfer_request: {
        Args: { p_payload: Json; p_request_id: string }
        Returns: {
          academic_year: string
          applicant_name: string
          applicant_role: string
          assessment_decision: string
          assessment_reason: string | null
          birth_date: string
          citizen_id: string
          class_id: string | null
          class_label: string
          contact_phone: string
          created_at: string
          created_by: string
          destination_district: string | null
          destination_province: string | null
          destination_residence: string | null
          destination_school: string | null
          director_decision: string
          director_reason: string | null
          evidence_birth_certificate: boolean
          evidence_house_registration: boolean
          evidence_other: boolean
          evidence_other_note: string | null
          evidence_parent_id: boolean
          evidence_phone: boolean
          evidence_photo: boolean
          father_name: string | null
          finalized_at: string | null
          finalized_by: string | null
          finance_amount_due: number | null
          finance_decision: string
          finance_reason: string | null
          finance_status: string
          guardian_address: string | null
          guardian_name: string
          id: string
          mother_name: string | null
          official_document_number: string | null
          official_document_number_updated_at: string | null
          official_document_number_updated_by: string | null
          official_document_number_updated_by_name: string | null
          official_note: string | null
          other_reason: string | null
          reason_type: string
          registrar_decision: string
          registrar_reason: string | null
          request_code: string | null
          request_date: string
          semester: number
          status: string
          student_code: string
          student_id: string
          student_name: string
          student_number: number | null
          submitted_at: string | null
          submitted_by: string | null
          transfer_date: string
          updated_at: string
          updated_by: string | null
        }
        SetofOptions: {
          from: "*"
          to: "academic_transfer_requests"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      save_classroom_research_report: {
        Args: { p_payload: Json; p_report_id: string }
        Returns: {
          abstract_text: string | null
          academic_head_comment: string | null
          academic_head_decision: string
          academic_head_id: string | null
          academic_head_name: string | null
          academic_head_position: string | null
          academic_head_reviewed_at: string | null
          academic_year: string
          approval_version: number
          approved_at: string | null
          assignment_id: string
          class_id: string
          class_label: string
          created_at: string
          director_approval_automatic: boolean
          director_comment: string | null
          director_decision: string
          director_name: string | null
          director_position: string | null
          director_reviewed_at: string | null
          director_reviewer_id: string | null
          id: string
          keywords_text: string | null
          one_page_data: Json
          research_bucket: string | null
          research_end_date: string | null
          research_mime_type: string | null
          research_original_name: string | null
          research_size_bytes: number | null
          research_start_date: string | null
          research_storage_path: string | null
          research_type: string
          research_type_other: string | null
          revision_stage: string | null
          semester: number
          status: string
          subject_code: string | null
          subject_group_comment: string | null
          subject_group_decision: string
          subject_group_head_id: string | null
          subject_group_head_name: string | null
          subject_group_head_position: string | null
          subject_group_id: string | null
          subject_group_name: string | null
          subject_group_reviewed_at: string | null
          subject_id: string
          subject_name: string
          submission_mode: string
          submitted_at: string | null
          teacher_id: string
          teacher_name: string
          teacher_position: string | null
          title: string
          updated_at: string
        }
        SetofOptions: {
          from: "*"
          to: "academic_classroom_research_reports"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      save_club_activity_members: {
        Args: { p_members: Json; p_report_id: string }
        Returns: number
      }
      save_club_activity_report: {
        Args: { p_payload: Json; p_report_id: string }
        Returns: {
          academic_head_comment: string | null
          academic_head_decision: string
          academic_head_id: string | null
          academic_head_name: string | null
          academic_head_position: string | null
          academic_head_reviewed_at: string | null
          academic_year: string
          appendix_notes: string | null
          approval_version: number
          approved_at: string | null
          attendance_threshold: number
          budget_amount: number
          club_name: string
          co_adviser_id: string | null
          co_adviser_name: string | null
          co_adviser_position: string | null
          created_at: string
          director_approval_automatic: boolean
          director_comment: string | null
          director_decision: string
          director_name: string | null
          director_position: string | null
          director_reviewed_at: string | null
          director_reviewer_id: string | null
          id: string
          objectives: Json
          operation_summary: string | null
          photos: Json
          revision_stage: string | null
          semester: number
          session_count: number
          shared_teacher_ids: string[]
          shared_teacher_names: string[]
          source_file_bucket: string | null
          source_file_mime: string | null
          source_file_name: string | null
          source_file_path: string | null
          source_file_size: number | null
          source_file_uploaded_at: string | null
          status: string
          submission_mode: string
          submitted_at: string | null
          success_targets: Json
          teacher_id: string
          teacher_name: string
          teacher_position: string | null
          tracking_unit: string
          updated_at: string
          work_plan: Json
        }
        SetofOptions: {
          from: "*"
          to: "academic_club_activity_reports"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      save_learner_activity_report: {
        Args: { p_payload: Json; p_report_id: string }
        Returns: {
          academic_head_comment: string | null
          academic_head_decision: string
          academic_head_id: string | null
          academic_head_name: string | null
          academic_head_position: string | null
          academic_head_reviewed_at: string | null
          academic_year: string
          activities: Json
          approval_version: number
          approved_at: string | null
          assessment_head_comment: string | null
          assessment_head_decision: string
          assessment_head_id: string | null
          assessment_head_name: string | null
          assessment_head_position: string | null
          assessment_head_reviewed_at: string | null
          class_id: string
          class_label: string
          co_adviser_id: string | null
          co_adviser_name: string | null
          co_adviser_position: string | null
          created_at: string
          director_approval_automatic: boolean
          director_comment: string | null
          director_decision: string
          director_name: string | null
          director_position: string | null
          director_reviewed_at: string | null
          director_reviewer_id: string | null
          exited_female: number
          exited_male: number
          id: string
          joined_female: number
          joined_male: number
          level_reviewer_comment: string | null
          level_reviewer_decision: string
          level_reviewer_id: string | null
          level_reviewer_name: string | null
          level_reviewer_position: string | null
          level_reviewer_reviewed_at: string | null
          opening_female: number
          opening_male: number
          revision_stage: string | null
          semester: number
          shared_teacher_ids: string[]
          shared_teacher_names: string[]
          source_file_bucket: string | null
          source_file_mime: string | null
          source_file_name: string | null
          source_file_path: string | null
          source_file_size: number | null
          source_file_uploaded_at: string | null
          stage_code: string | null
          status: string
          submission_mode: string
          submitted_at: string | null
          teacher_id: string
          teacher_name: string
          teacher_position: string | null
          updated_at: string
        }
        SetofOptions: {
          from: "*"
          to: "academic_learner_activity_reports"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      save_learner_activity_student_results: {
        Args: { p_report_id: string; p_results: Json }
        Returns: number
      }
      save_learning_media_report: {
        Args: { p_payload: Json; p_report_id: string }
        Returns: {
          academic_head_comment: string | null
          academic_head_decision: string
          academic_head_id: string | null
          academic_head_name: string | null
          academic_head_position: string | null
          academic_head_reviewed_at: string | null
          academic_year: string
          approval_version: number
          approved_at: string | null
          assignment_id: string | null
          cert_content_appropriate: boolean
          cert_other_text: string | null
          cert_practical: boolean
          class_id: string
          class_label: string
          created_at: string
          director_approval_automatic: boolean
          director_comment: string | null
          director_decision: string
          director_reviewed_at: string | null
          director_reviewer_id: string | null
          id: string
          media_items: Json
          revision_stage: string | null
          semester: number
          status: string
          subject_code: string | null
          subject_group_comment: string | null
          subject_group_decision: string
          subject_group_head_id: string | null
          subject_group_head_name: string | null
          subject_group_head_position: string | null
          subject_group_id: string | null
          subject_group_name: string | null
          subject_group_reviewed_at: string | null
          subject_id: string
          subject_name: string
          submitted_at: string | null
          teacher_id: string
          teacher_name: string
          teacher_position: string | null
          updated_at: string
        }
        SetofOptions: {
          from: "*"
          to: "academic_learning_media_reports"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      save_lesson_plan_usage_report: {
        Args: { p_payload: Json; p_report_id: string }
        Returns: {
          academic_head_comment: string | null
          academic_head_decision: string
          academic_head_id: string | null
          academic_head_name: string | null
          academic_head_position: string | null
          academic_head_reviewed_at: string | null
          academic_year: string
          approval_version: number
          approved_at: string | null
          assignment_id: string | null
          class_id: string
          class_label: string
          created_at: string
          director_approval_automatic: boolean
          director_comment: string | null
          director_decision: string
          director_reviewed_at: string | null
          director_reviewer_id: string | null
          grade_counts: Json
          id: string
          improvements_text: string | null
          memo_date: string | null
          memo_number: string | null
          objectives_text: string | null
          plans_per_unit: number | null
          problems_suggestions_text: string | null
          revision_stage: string | null
          satisfaction_items: Json
          semester: number
          status: string
          strengths_text: string | null
          student_count: number
          subject_code: string | null
          subject_group_comment: string | null
          subject_group_decision: string
          subject_group_head_id: string | null
          subject_group_head_name: string | null
          subject_group_head_position: string | null
          subject_group_id: string | null
          subject_group_name: string | null
          subject_group_reviewed_at: string | null
          subject_id: string
          subject_name: string
          submitted_at: string | null
          summary_text: string | null
          supporting_documents_text: string | null
          teacher_id: string
          teacher_name: string
          teacher_position: string | null
          top_students: Json
          unit_progress: Json
          units_count: number | null
          updated_at: string
          weaknesses_text: string | null
        }
        SetofOptions: {
          from: "*"
          to: "academic_lesson_plan_usage_reports"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      save_my_personnel_pa_document_profile: {
        Args: {
          p_pa_auto_sign_enabled?: boolean
          p_period_id: string
          p_salary_amount: number
          p_salary_effective_date?: string
          p_salary_grade: string
        }
        Returns: {
          created_at: string
          created_by: string | null
          id: string
          pa_auto_sign_enabled: boolean
          period_id: string
          salary_amount: number | null
          salary_effective_date: string | null
          salary_grade: string | null
          updated_at: string
          updated_by: string | null
          user_id: string
        }
        SetofOptions: {
          from: "*"
          to: "personnel_pa_user_period_profiles"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      save_my_personnel_pa_evaluator_profile: {
        Args: {
          p_full_name: string
          p_organization: string
          p_position_title: string
          p_signature_bucket: string
          p_signature_mime_type: string
          p_signature_path: string
        }
        Returns: {
          account_initialized_at: string | null
          auth_user_id: string | null
          created_at: string
          full_name: string | null
          login_email: string
          organization: string | null
          position_title: string | null
          profile_completed_at: string | null
          profile_reset_at: string | null
          profile_reset_by: string | null
          signature_bucket: string | null
          signature_method: string
          signature_method_selected_at: string | null
          signature_mime_type: string | null
          signature_path: string | null
          slot_no: number
          updated_at: string
        }
        SetofOptions: {
          from: "*"
          to: "personnel_pa_evaluator_accounts"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      save_my_personnel_pa_evaluator_profile_signed: {
        Args: {
          p_full_name: string
          p_method: string
          p_organization: string
          p_position_title: string
          p_signature_id?: string
          p_signature_path?: string
        }
        Returns: {
          account_initialized_at: string | null
          auth_user_id: string | null
          created_at: string
          full_name: string | null
          login_email: string
          organization: string | null
          position_title: string | null
          profile_completed_at: string | null
          profile_reset_at: string | null
          profile_reset_by: string | null
          signature_bucket: string | null
          signature_method: string
          signature_method_selected_at: string | null
          signature_mime_type: string | null
          signature_path: string | null
          slot_no: number
          updated_at: string
        }
        SetofOptions: {
          from: "*"
          to: "personnel_pa_evaluator_accounts"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      save_personnel_pa_committee: {
        Args: {
          p_evaluatee_user_id: string
          p_members: Json
          p_period_id: string
        }
        Returns: {
          created_at: string
          created_by: string | null
          evaluatee_user_id: string
          evaluator_name: string
          evaluator_organization: string | null
          evaluator_position: string | null
          evaluator_user_id: string | null
          id: string
          member_role: string
          period_id: string
          slot_no: number
          updated_at: string
          updated_by: string | null
        }[]
        SetofOptions: {
          from: "*"
          to: "personnel_pa_committee_members"
          isOneToOne: false
          isSetofReturn: true
        }
      }
      save_personnel_pa_period: {
        Args: {
          p_fiscal_year: number
          p_note?: string
          p_submission_close_date: string
          p_submission_open_date: string
        }
        Returns: {
          agreement_end_date: string
          agreement_start_date: string
          assessment_close_date: string | null
          assessment_open_date: string | null
          created_at: string
          created_by: string | null
          fiscal_year: number
          id: string
          is_active: boolean
          note: string | null
          report_close_date: string | null
          report_open_date: string | null
          submission_close_date: string | null
          submission_open_date: string | null
          updated_at: string
          updated_by: string | null
        }
        SetofOptions: {
          from: "*"
          to: "personnel_pa_periods"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      save_personnel_pa_period_committee: {
        Args: { p_members: Json; p_period_id: string }
        Returns: {
          confirmed_at: string
          confirmed_by: string | null
          created_at: string
          evaluator_account_slot: number
          evaluator_name_snapshot: string | null
          evaluator_organization_snapshot: string | null
          evaluator_position_snapshot: string | null
          evaluator_signature_bucket_snapshot: string | null
          evaluator_signature_mime_snapshot: string | null
          evaluator_signature_path_snapshot: string | null
          evaluator_user_id: string
          id: string
          member_role: string
          period_id: string
          slot_no: number
          updated_at: string
        }[]
        SetofOptions: {
          from: "*"
          to: "personnel_pa_period_committee_members"
          isOneToOne: false
          isSetofReturn: true
        }
      }
      save_personnel_pa_period_v2: {
        Args: {
          p_fiscal_year: number
          p_note?: string
          p_report_close_date: string
          p_report_open_date: string
          p_submission_close_date: string
          p_submission_open_date: string
        }
        Returns: {
          agreement_end_date: string
          agreement_start_date: string
          assessment_close_date: string | null
          assessment_open_date: string | null
          created_at: string
          created_by: string | null
          fiscal_year: number
          id: string
          is_active: boolean
          note: string | null
          report_close_date: string | null
          report_open_date: string | null
          submission_close_date: string | null
          submission_open_date: string | null
          updated_at: string
          updated_by: string | null
        }
        SetofOptions: {
          from: "*"
          to: "personnel_pa_periods"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      save_personnel_pa_period_v3: {
        Args: {
          p_assessment_close_date: string
          p_assessment_open_date: string
          p_fiscal_year: number
          p_note?: string
          p_report_close_date: string
          p_report_open_date: string
          p_submission_close_date: string
          p_submission_open_date: string
        }
        Returns: {
          agreement_end_date: string
          agreement_start_date: string
          assessment_close_date: string | null
          assessment_open_date: string | null
          created_at: string
          created_by: string | null
          fiscal_year: number
          id: string
          is_active: boolean
          note: string | null
          report_close_date: string | null
          report_open_date: string | null
          submission_close_date: string | null
          submission_open_date: string | null
          updated_at: string
          updated_by: string | null
        }
        SetofOptions: {
          from: "*"
          to: "personnel_pa_periods"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      save_post_lesson_report: {
        Args: { p_payload: Json; p_report_id: string }
        Returns: {
          academic_decision: string
          academic_year: string
          approval_version: number
          approved_at: string | null
          assignment_id: string | null
          class_id: string | null
          class_label: string
          competency_text: string | null
          created_at: string
          desirable_attributes_text: string | null
          director_approval_automatic: boolean
          director_decision: string
          director_reviewed_at: string | null
          director_reviewer_id: string | null
          id: string
          include_behavior_assessment: boolean
          knowledge_text: string | null
          other_notes: string | null
          problems_text: string | null
          report_scope: string
          reviewed_at: string | null
          reviewer_comment: string | null
          reviewer_id: string | null
          reviewer_name: string | null
          reviewer_position: string | null
          reviewer_signature_id: string | null
          semester: number
          solutions_text: string | null
          status: string
          subject_code: string | null
          subject_id: string | null
          subject_name: string
          subject_specific_text: string | null
          subject_specific_title: string
          submitted_at: string | null
          teach_date: string | null
          teacher_id: string
          teacher_name: string
          teacher_position: string | null
          teacher_signature_id: string | null
          unit_number: number | null
          unit_title: string
          updated_at: string
        }
        SetofOptions: {
          from: "*"
          to: "academic_post_lesson_reports"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      save_preschool_staff_roster: {
        Args: {
          p_academic_year: number
          p_semester: number
          p_teacher_ids: string[]
        }
        Returns: number
      }
      save_timetable_period_template: {
        Args: {
          p_academic_year: string
          p_items: Json
          p_semester: number
          p_weekdays: number[]
        }
        Returns: string
      }
      school_project_delete_impact: {
        Args: { p_project_id: string }
        Returns: Json
      }
      set_academic_certificate_number_settings: {
        Args: { p_document_year: string; p_next_number: number }
        Returns: {
          certificate_valid_days: number
          director_user_id: string | null
          document_number_next: number
          document_number_year: string
          id: number
          preparer_user_id: string | null
          registrar_user_id: string | null
          request_number_next: number
          request_number_year: string
          updated_at: string
          updated_by: string | null
        }
        SetofOptions: {
          from: "*"
          to: "academic_certificate_settings"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      set_academic_certificate_preparer: {
        Args: { p_user_id: string; p_valid_days?: number }
        Returns: {
          certificate_valid_days: number
          director_user_id: string | null
          document_number_next: number
          document_number_year: string
          id: number
          preparer_user_id: string | null
          registrar_user_id: string | null
          request_number_next: number
          request_number_year: string
          updated_at: string
          updated_by: string | null
        }
        SetofOptions: {
          from: "*"
          to: "academic_certificate_settings"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      set_academic_certificate_request_number_settings: {
        Args: { p_document_year: string; p_next_number: number }
        Returns: {
          certificate_valid_days: number
          director_user_id: string | null
          document_number_next: number
          document_number_year: string
          id: number
          preparer_user_id: string | null
          registrar_user_id: string | null
          request_number_next: number
          request_number_year: string
          updated_at: string
          updated_by: string | null
        }
        SetofOptions: {
          from: "*"
          to: "academic_certificate_settings"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      set_academic_certificate_review: {
        Args: {
          p_decision: string
          p_reason?: string
          p_request_id: string
          p_slot: string
        }
        Returns: {
          academic_year: string
          applicant_name: string
          birth_date: string | null
          certificate_type: string
          citizen_id: string | null
          class_id: string | null
          class_label: string | null
          contact_phone: string | null
          created_at: string
          created_by: string
          director_decision: string
          director_reason: string | null
          evidence_birth_certificate: boolean
          evidence_house_registration: boolean
          evidence_other: boolean
          evidence_other_note: string | null
          evidence_parent_id: boolean
          evidence_phone: boolean
          evidence_photo: boolean
          father_name: string | null
          finalized_at: string | null
          finalized_by: string | null
          former_academic_year: string | null
          former_class_label: string | null
          former_gpa: number | null
          id: string
          mother_name: string | null
          official_document_assigned_at: string | null
          official_document_assigned_by: string | null
          official_document_number: string | null
          official_document_serial: number | null
          official_document_year: string | null
          preparer_decision: string
          preparer_reason: string | null
          purpose_other: string | null
          purpose_type: string
          registrar_decision: string
          registrar_reason: string | null
          request_code: string | null
          request_date: string
          semester: number
          status: string
          student_address: string | null
          student_code: string | null
          student_id: string
          student_name: string
          student_number: number | null
          submitted_at: string | null
          submitted_by: string | null
          updated_at: string
          updated_by: string | null
        }
        SetofOptions: {
          from: "*"
          to: "academic_certificate_requests"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      set_academic_certificate_roles: {
        Args: {
          p_director_user_id: string
          p_preparer_user_id: string
          p_registrar_user_id: string
          p_valid_days?: number
        }
        Returns: {
          certificate_valid_days: number
          director_user_id: string | null
          document_number_next: number
          document_number_year: string
          id: number
          preparer_user_id: string | null
          registrar_user_id: string | null
          request_number_next: number
          request_number_year: string
          updated_at: string
          updated_by: string | null
        }
        SetofOptions: {
          from: "*"
          to: "academic_certificate_settings"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      set_academic_certificate_signature: {
        Args: {
          p_method: string
          p_request_id: string
          p_slot: string
          p_storage_path?: string
        }
        Returns: {
          approval_version: number
          automatic: boolean
          bucket: string | null
          created_at: string
          created_by: string
          id: string
          master_signature_id: string | null
          method: string
          request_id: string
          signer_name: string | null
          signer_position: string | null
          signer_slot: string
          signer_user_id: string | null
          storage_path: string | null
          updated_at: string
          updated_by: string | null
        }
        SetofOptions: {
          from: "*"
          to: "academic_certificate_request_signatures"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      set_academic_document_service_review: {
        Args: {
          p_decision: string
          p_reason: string
          p_request_id: string
          p_slot: string
        }
        Returns: {
          academic_year: string | null
          applicant_district: string | null
          applicant_email: string | null
          applicant_first_name: string | null
          applicant_house_no: string | null
          applicant_last_name: string | null
          applicant_phone: string | null
          applicant_prefix: string | null
          applicant_province: string | null
          applicant_subdistrict: string | null
          applicant_village_name: string | null
          applicant_village_no: string | null
          assessment_decision: string
          assessment_reason: string | null
          class_label: string | null
          created_at: string
          created_by: string
          director_decision: string
          director_reason: string | null
          doc_certificate: boolean
          doc_certificate_with_grade: boolean
          doc_other: boolean
          doc_other_note: string | null
          doc_transcript: boolean
          doc_transcript_lost: boolean
          evidence_father_id_count: number
          evidence_mother_id_count: number
          evidence_other: boolean
          evidence_other_note: string | null
          evidence_photo_count: number
          evidence_police_report: boolean
          evidence_student_id_count: number
          finalized_at: string | null
          finalized_by: string | null
          graduation_year: string | null
          id: string
          purpose_text: string | null
          registrar_decision: string
          registrar_reason: string | null
          request_code: string
          request_date: string
          request_serial: number
          request_year: string
          semester: number | null
          status: string
          student_code: string | null
          student_first_name: string
          student_id: string | null
          student_last_name: string | null
          student_name: string
          student_prefix: string | null
          submitted_at: string | null
          submitted_by: string | null
          updated_at: string
          updated_by: string | null
        }
        SetofOptions: {
          from: "*"
          to: "academic_document_service_requests"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      set_academic_document_service_settings: {
        Args: {
          p_assessment_user_id: string
          p_director_user_id: string
          p_document_year: string
          p_next_number: number
          p_registrar_user_id: string
        }
        Returns: {
          assessment_user_id: string | null
          director_user_id: string | null
          id: number
          registrar_user_id: string | null
          request_number_next: number
          request_number_year: string
          updated_at: string
          updated_by: string | null
        }
        SetofOptions: {
          from: "*"
          to: "academic_document_service_settings"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      set_academic_document_service_signature: {
        Args: {
          p_method: string
          p_request_id: string
          p_slot: string
          p_storage_path: string
        }
        Returns: {
          approval_version: number
          automatic: boolean
          bucket: string | null
          created_at: string
          created_by: string | null
          id: string
          master_signature_id: string | null
          method: string
          request_id: string
          signer_name: string | null
          signer_position: string | null
          signer_slot: string
          signer_user_id: string | null
          storage_path: string | null
          updated_at: string
          updated_by: string | null
        }
        SetofOptions: {
          from: "*"
          to: "academic_document_service_signatures"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      set_academic_registration_document_settings: {
        Args: {
          p_official_director_position_text: string
          p_official_phone_text: string
          p_official_registration_group_text: string
          p_official_school_address_text: string
        }
        Returns: {
          assessment_user_id: string | null
          certificate_preparer_user_id: string | null
          certificate_valid_days: number
          director_user_id: string | null
          finance_user_id: string | null
          id: number
          official_director_position_text: string
          official_phone_text: string
          official_registration_group_text: string
          official_school_address_text: string
          registrar_user_id: string | null
          updated_at: string
          updated_by: string | null
        }
        SetofOptions: {
          from: "*"
          to: "academic_registration_settings"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      set_academic_registration_roles: {
        Args: {
          p_assessment_user_id: string
          p_director_user_id: string
          p_finance_user_id: string
          p_registrar_user_id: string
        }
        Returns: {
          assessment_user_id: string | null
          certificate_preparer_user_id: string | null
          certificate_valid_days: number
          director_user_id: string | null
          finance_user_id: string | null
          id: number
          official_director_position_text: string
          official_phone_text: string
          official_registration_group_text: string
          official_school_address_text: string
          registrar_user_id: string | null
          updated_at: string
          updated_by: string | null
        }
        SetofOptions: {
          from: "*"
          to: "academic_registration_settings"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      set_academic_report_saved_signature: {
        Args: {
          p_cert_content_appropriate?: boolean
          p_cert_other?: string
          p_cert_practical?: boolean
          p_comment?: string
          p_report_id: string
          p_signature_id: string
          p_slot: string
          p_system_code: string
        }
        Returns: Json
      }
      set_academic_submission_deadline:
        | {
            Args: {
              p_academic_year: string
              p_due_at: string
              p_enabled: boolean
              p_opens_at: string
              p_semester: number
              p_system_code: string
            }
            Returns: {
              academic_year: string
              deadline_enabled: boolean
              due_at: string | null
              opens_at: string | null
              period_type: string
              semester: number
              system_code: string
              updated_at: string
              updated_by: string | null
            }
            SetofOptions: {
              from: "*"
              to: "academic_submission_deadlines"
              isOneToOne: true
              isSetofReturn: false
            }
          }
        | {
            Args: {
              p_academic_year: string
              p_due_at: string
              p_enabled: boolean
              p_opens_at: string
              p_period_type: string
              p_semester: number
              p_system_code: string
            }
            Returns: {
              academic_year: string
              deadline_enabled: boolean
              due_at: string | null
              opens_at: string | null
              period_type: string
              semester: number
              system_code: string
              updated_at: string
              updated_by: string | null
            }
            SetofOptions: {
              from: "*"
              to: "academic_submission_deadlines"
              isOneToOne: true
              isSetofReturn: false
            }
          }
      set_academic_transfer_official_number: {
        Args: { p_document_number: string; p_request_id: string }
        Returns: {
          academic_year: string
          applicant_name: string
          applicant_role: string
          assessment_decision: string
          assessment_reason: string | null
          birth_date: string
          citizen_id: string
          class_id: string | null
          class_label: string
          contact_phone: string
          created_at: string
          created_by: string
          destination_district: string | null
          destination_province: string | null
          destination_residence: string | null
          destination_school: string | null
          director_decision: string
          director_reason: string | null
          evidence_birth_certificate: boolean
          evidence_house_registration: boolean
          evidence_other: boolean
          evidence_other_note: string | null
          evidence_parent_id: boolean
          evidence_phone: boolean
          evidence_photo: boolean
          father_name: string | null
          finalized_at: string | null
          finalized_by: string | null
          finance_amount_due: number | null
          finance_decision: string
          finance_reason: string | null
          finance_status: string
          guardian_address: string | null
          guardian_name: string
          id: string
          mother_name: string | null
          official_document_number: string | null
          official_document_number_updated_at: string | null
          official_document_number_updated_by: string | null
          official_document_number_updated_by_name: string | null
          official_note: string | null
          other_reason: string | null
          reason_type: string
          registrar_decision: string
          registrar_reason: string | null
          request_code: string | null
          request_date: string
          semester: number
          status: string
          student_code: string
          student_id: string
          student_name: string
          student_number: number | null
          submitted_at: string | null
          submitted_by: string | null
          transfer_date: string
          updated_at: string
          updated_by: string | null
        }
        SetofOptions: {
          from: "*"
          to: "academic_transfer_requests"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      set_academic_transfer_review: {
        Args: {
          p_decision: string
          p_finance_amount_due?: number
          p_finance_status?: string
          p_reason?: string
          p_request_id: string
          p_slot: string
        }
        Returns: {
          academic_year: string
          applicant_name: string
          applicant_role: string
          assessment_decision: string
          assessment_reason: string | null
          birth_date: string
          citizen_id: string
          class_id: string | null
          class_label: string
          contact_phone: string
          created_at: string
          created_by: string
          destination_district: string | null
          destination_province: string | null
          destination_residence: string | null
          destination_school: string | null
          director_decision: string
          director_reason: string | null
          evidence_birth_certificate: boolean
          evidence_house_registration: boolean
          evidence_other: boolean
          evidence_other_note: string | null
          evidence_parent_id: boolean
          evidence_phone: boolean
          evidence_photo: boolean
          father_name: string | null
          finalized_at: string | null
          finalized_by: string | null
          finance_amount_due: number | null
          finance_decision: string
          finance_reason: string | null
          finance_status: string
          guardian_address: string | null
          guardian_name: string
          id: string
          mother_name: string | null
          official_document_number: string | null
          official_document_number_updated_at: string | null
          official_document_number_updated_by: string | null
          official_document_number_updated_by_name: string | null
          official_note: string | null
          other_reason: string | null
          reason_type: string
          registrar_decision: string
          registrar_reason: string | null
          request_code: string | null
          request_date: string
          semester: number
          status: string
          student_code: string
          student_id: string
          student_name: string
          student_number: number | null
          submitted_at: string | null
          submitted_by: string | null
          transfer_date: string
          updated_at: string
          updated_by: string | null
        }
        SetofOptions: {
          from: "*"
          to: "academic_transfer_requests"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      set_academic_transfer_signature: {
        Args: {
          p_method: string
          p_request_id: string
          p_slot: string
          p_storage_path?: string
        }
        Returns: {
          approval_version: number
          automatic: boolean
          bucket: string | null
          created_at: string
          created_by: string
          id: string
          master_signature_id: string | null
          method: string
          request_id: string
          signer_name: string | null
          signer_position: string | null
          signer_slot: string
          signer_user_id: string | null
          storage_path: string | null
          updated_at: string
          updated_by: string | null
        }
        SetofOptions: {
          from: "*"
          to: "academic_transfer_request_signatures"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      set_approval_executive: {
        Args: {
          p_active: boolean
          p_authorization_note?: string
          p_executive_kind: string
          p_user_id: string
        }
        Returns: {
          authorization_note: string | null
          configured_by: string | null
          created_at: string
          display_title: string
          executive_kind: string
          is_active: boolean
          updated_at: string
          user_id: string
        }
        SetofOptions: {
          from: "*"
          to: "approval_executives"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      set_approval_routing_mode: {
        Args: { p_routing_mode: string; p_system_code: string }
        Returns: {
          created_at: string
          executive_kinds: Json
          is_active: boolean
          module_code: string | null
          routing_locked: boolean
          routing_mode: string
          scope_mode: string
          slot_order: Json
          supports_auto_approve: boolean
          supports_auto_sign: boolean
          supports_dual_submission: boolean
          supports_shared_ownership: boolean
          system_code: string
          system_name_th: string
          updated_at: string
          updated_by: string | null
        }
        SetofOptions: {
          from: "*"
          to: "approval_system_registry"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      set_budget_signature: {
        Args: {
          p_disbursement_id: string
          p_method: string
          p_signature_id?: string
          p_slot: string
          p_storage_path?: string
        }
        Returns: undefined
      }
      set_budget_signer_assignments: {
        Args: { p_assignments: Json; p_disbursement_id: string }
        Returns: undefined
      }
      set_classroom_research_signature: {
        Args: {
          p_comment?: string
          p_method: string
          p_report_id: string
          p_slot: string
          p_storage_path: string
        }
        Returns: {
          approval_version: number
          automatic: boolean
          bucket: string | null
          created_at: string
          id: string
          master_signature_id: string | null
          method: string
          report_id: string
          signer_name: string
          signer_position: string | null
          signer_slot: string
          signer_user_id: string
          storage_path: string | null
          updated_at: string
        }
        SetofOptions: {
          from: "*"
          to: "academic_classroom_research_signatures"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      set_club_activity_signature: {
        Args: {
          p_comment?: string
          p_method: string
          p_report_id: string
          p_slot: string
          p_storage_path: string
        }
        Returns: {
          approval_version: number
          automatic: boolean
          bucket: string | null
          created_at: string
          id: string
          master_signature_id: string | null
          method: string
          report_id: string
          signer_name: string
          signer_position: string | null
          signer_slot: string
          signer_user_id: string
          storage_path: string | null
          updated_at: string
        }
        SetofOptions: {
          from: "*"
          to: "academic_club_activity_signatures"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      set_club_activity_source_file: {
        Args: {
          p_mime: string
          p_original_name: string
          p_report_id: string
          p_size: number
          p_storage_path: string
        }
        Returns: {
          academic_head_comment: string | null
          academic_head_decision: string
          academic_head_id: string | null
          academic_head_name: string | null
          academic_head_position: string | null
          academic_head_reviewed_at: string | null
          academic_year: string
          appendix_notes: string | null
          approval_version: number
          approved_at: string | null
          attendance_threshold: number
          budget_amount: number
          club_name: string
          co_adviser_id: string | null
          co_adviser_name: string | null
          co_adviser_position: string | null
          created_at: string
          director_approval_automatic: boolean
          director_comment: string | null
          director_decision: string
          director_name: string | null
          director_position: string | null
          director_reviewed_at: string | null
          director_reviewer_id: string | null
          id: string
          objectives: Json
          operation_summary: string | null
          photos: Json
          revision_stage: string | null
          semester: number
          session_count: number
          shared_teacher_ids: string[]
          shared_teacher_names: string[]
          source_file_bucket: string | null
          source_file_mime: string | null
          source_file_name: string | null
          source_file_path: string | null
          source_file_size: number | null
          source_file_uploaded_at: string | null
          status: string
          submission_mode: string
          submitted_at: string | null
          success_targets: Json
          teacher_id: string
          teacher_name: string
          teacher_position: string | null
          tracking_unit: string
          updated_at: string
          work_plan: Json
        }
        SetofOptions: {
          from: "*"
          to: "academic_club_activity_reports"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      set_current_academic_term: {
        Args: { p_academic_year: string; p_semester: number }
        Returns: undefined
      }
      set_executive_auto_policy: {
        Args: {
          p_authorization_note?: string
          p_auto_approve: boolean
          p_auto_sign: boolean
          p_enabled: boolean
          p_ends_at?: string
          p_executive_user_id: string
          p_signature_id?: string
          p_starts_at?: string
          p_system_code: string
        }
        Returns: {
          authorization_note: string | null
          auto_approve: boolean
          auto_sign: boolean
          configured_by: string
          created_at: string
          enabled: boolean
          ends_at: string | null
          executive_user_id: string
          id: string
          signature_id: string | null
          starts_at: string | null
          system_code: string
          updated_at: string
        }
        SetofOptions: {
          from: "*"
          to: "approval_auto_policies"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      set_learner_activity_assessment_head: {
        Args: { p_academic_year: string; p_assessment_head_user_id: string }
        Returns: boolean
      }
      set_learner_activity_signature: {
        Args: {
          p_comment?: string
          p_method: string
          p_report_id: string
          p_slot: string
          p_storage_path: string
        }
        Returns: {
          approval_version: number
          automatic: boolean
          bucket: string | null
          created_at: string
          id: string
          master_signature_id: string | null
          method: string
          report_id: string
          signer_name: string
          signer_position: string | null
          signer_slot: string
          signer_user_id: string
          storage_path: string | null
          updated_at: string
        }
        SetofOptions: {
          from: "*"
          to: "academic_learner_activity_signatures"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      set_learner_activity_source_file: {
        Args: {
          p_mime: string
          p_original_name: string
          p_report_id: string
          p_size: number
          p_storage_path: string
        }
        Returns: {
          academic_head_comment: string | null
          academic_head_decision: string
          academic_head_id: string | null
          academic_head_name: string | null
          academic_head_position: string | null
          academic_head_reviewed_at: string | null
          academic_year: string
          activities: Json
          approval_version: number
          approved_at: string | null
          assessment_head_comment: string | null
          assessment_head_decision: string
          assessment_head_id: string | null
          assessment_head_name: string | null
          assessment_head_position: string | null
          assessment_head_reviewed_at: string | null
          class_id: string
          class_label: string
          co_adviser_id: string | null
          co_adviser_name: string | null
          co_adviser_position: string | null
          created_at: string
          director_approval_automatic: boolean
          director_comment: string | null
          director_decision: string
          director_name: string | null
          director_position: string | null
          director_reviewed_at: string | null
          director_reviewer_id: string | null
          exited_female: number
          exited_male: number
          id: string
          joined_female: number
          joined_male: number
          level_reviewer_comment: string | null
          level_reviewer_decision: string
          level_reviewer_id: string | null
          level_reviewer_name: string | null
          level_reviewer_position: string | null
          level_reviewer_reviewed_at: string | null
          opening_female: number
          opening_male: number
          revision_stage: string | null
          semester: number
          shared_teacher_ids: string[]
          shared_teacher_names: string[]
          source_file_bucket: string | null
          source_file_mime: string | null
          source_file_name: string | null
          source_file_path: string | null
          source_file_size: number | null
          source_file_uploaded_at: string | null
          stage_code: string | null
          status: string
          submission_mode: string
          submitted_at: string | null
          teacher_id: string
          teacher_name: string
          teacher_position: string | null
          updated_at: string
        }
        SetofOptions: {
          from: "*"
          to: "academic_learner_activity_reports"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      set_learner_activity_workflow_settings: {
        Args: {
          p_academic_year: string
          p_assessment_head_user_id: string
          p_class_id: string
          p_reviewer_user_id: string
        }
        Returns: boolean
      }
      set_learning_media_signature: {
        Args: {
          p_cert_content_appropriate?: boolean
          p_cert_other?: string
          p_cert_practical?: boolean
          p_comment?: string
          p_method: string
          p_report_id: string
          p_slot: string
          p_storage_path: string
        }
        Returns: {
          approval_version: number
          automatic: boolean
          bucket: string | null
          created_at: string
          id: string
          master_signature_id: string | null
          method: string
          report_id: string
          signer_name: string
          signer_position: string | null
          signer_slot: string
          signer_user_id: string
          storage_path: string | null
          updated_at: string
        }
        SetofOptions: {
          from: "*"
          to: "academic_learning_media_signatures"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      set_lesson_plan_usage_document_settings: {
        Args: {
          p_academic_year: string
          p_memo_date: string
          p_memo_number: string
          p_semester: number
        }
        Returns: {
          academic_year: string
          memo_date: string | null
          memo_number: string | null
          semester: number
          updated_at: string
          updated_by: string | null
        }
        SetofOptions: {
          from: "*"
          to: "academic_lesson_plan_usage_document_settings"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      set_lesson_plan_usage_signature: {
        Args: {
          p_comment?: string
          p_method: string
          p_report_id: string
          p_slot: string
          p_storage_path: string
        }
        Returns: {
          approval_version: number
          automatic: boolean
          bucket: string | null
          created_at: string
          id: string
          master_signature_id: string | null
          method: string
          report_id: string
          signer_name: string
          signer_position: string | null
          signer_slot: string
          signer_user_id: string
          storage_path: string | null
          updated_at: string
        }
        SetofOptions: {
          from: "*"
          to: "academic_lesson_plan_usage_signatures"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      set_lesson_plan_usage_subject_group_head: {
        Args: {
          p_academic_year: string
          p_head_user_id: string
          p_subject_group_id: string
        }
        Returns: boolean
      }
      set_my_signature_preferences: {
        Args: {
          p_auto_approve_enabled: boolean
          p_auto_sign_enabled: boolean
          p_default_signature_id: string
          p_preferred_method: string
        }
        Returns: {
          auto_approve_confirmed_at: string | null
          auto_approve_enabled: boolean
          auto_sign_confirmed_at: string | null
          auto_sign_enabled: boolean
          created_at: string
          default_signature_id: string | null
          preferred_method: string
          updated_at: string
          user_id: string
        }
        SetofOptions: {
          from: "*"
          to: "user_signature_preferences"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      set_post_lesson_signature: {
        Args: {
          p_method: string
          p_report_id: string
          p_slot: string
          p_storage_path: string
        }
        Returns: {
          approval_version: number
          automatic: boolean
          bucket: string | null
          created_at: string
          id: string
          master_signature_id: string | null
          method: string
          report_id: string
          signer_name: string
          signer_position: string | null
          signer_slot: string
          signer_user_id: string
          storage_path: string | null
          updated_at: string
        }
        SetofOptions: {
          from: "*"
          to: "academic_post_lesson_signatures"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      set_post_lesson_workflow_settings: {
        Args: { p_deputy_director_user_id: string; p_director_user_id: string }
        Returns: {
          deputy_director_user_id: string | null
          director_user_id: string | null
          id: number
          updated_at: string
          updated_by: string | null
        }
        SetofOptions: {
          from: "*"
          to: "academic_post_lesson_settings"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      set_school_document_signature: {
        Args: {
          p_day: string
          p_doc: string
          p_kind: string
          p_method: string
          p_signature?: string
          p_slot: string
        }
        Returns: undefined
      }
      set_staff_subject_group_heads: {
        Args: {
          p_academic_year: string
          p_subject_group_ids: string[]
          p_user_id: string
        }
        Returns: Json
      }
      set_staff_teacher_duties: {
        Args: {
          p_academic_year: string
          p_homeroom_class_id: string
          p_semester: number
          p_stage_code?: string
          p_user_id: string
        }
        Returns: Json
      }
      set_staff_teacher_duty_bundle: {
        Args: {
          p_academic_year: string
          p_homeroom_class_id: string
          p_semester: number
          p_stage_code: string
          p_subject_group_ids: string[]
          p_user_id: string
        }
        Returns: Json
      }
      set_student_followup_official_number: {
        Args: { p_batch_id: string; p_document_number: string }
        Returns: {
          absence_month: string
          academic_year: string
          batch_code: string
          completed_at: string | null
          created_at: string
          created_by: string
          director_name_snapshot: string | null
          director_position_snapshot: string | null
          director_signature_bucket: string | null
          director_signature_id: string | null
          director_signature_path: string | null
          director_user_id_snapshot: string | null
          id: string
          issued_at: string | null
          issued_by: string | null
          letter_date: string
          official_document_number: string | null
          official_document_number_updated_at: string | null
          official_document_number_updated_by: string | null
          official_document_number_updated_by_name: string | null
          semester: number
          status: string
          updated_at: string
          updated_by: string | null
        }
        SetofOptions: {
          from: "*"
          to: "student_followup_batches"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      set_student_photo: {
        Args: { p_photo_path: string; p_student_id: string }
        Returns: undefined
      }
      set_timetable_class_period_mode: {
        Args: { p_class_id: string; p_mode: string; p_template_id?: string }
        Returns: string
      }
      set_timetable_period_mode: {
        Args: { p_mode: string; p_template_id?: string; p_timetable_id: string }
        Returns: undefined
      }
      set_workflow_document_signature: {
        Args: {
          p_document_id: string
          p_method: string
          p_scope_date: string
          p_signature_id?: string
          p_slot: string
          p_system_code: string
        }
        Returns: undefined
      }
      submit_academic_certificate_request: {
        Args: { p_request_id: string }
        Returns: {
          academic_year: string
          applicant_name: string
          birth_date: string | null
          certificate_type: string
          citizen_id: string | null
          class_id: string | null
          class_label: string | null
          contact_phone: string | null
          created_at: string
          created_by: string
          director_decision: string
          director_reason: string | null
          evidence_birth_certificate: boolean
          evidence_house_registration: boolean
          evidence_other: boolean
          evidence_other_note: string | null
          evidence_parent_id: boolean
          evidence_phone: boolean
          evidence_photo: boolean
          father_name: string | null
          finalized_at: string | null
          finalized_by: string | null
          former_academic_year: string | null
          former_class_label: string | null
          former_gpa: number | null
          id: string
          mother_name: string | null
          official_document_assigned_at: string | null
          official_document_assigned_by: string | null
          official_document_number: string | null
          official_document_serial: number | null
          official_document_year: string | null
          preparer_decision: string
          preparer_reason: string | null
          purpose_other: string | null
          purpose_type: string
          registrar_decision: string
          registrar_reason: string | null
          request_code: string | null
          request_date: string
          semester: number
          status: string
          student_address: string | null
          student_code: string | null
          student_id: string
          student_name: string
          student_number: number | null
          submitted_at: string | null
          submitted_by: string | null
          updated_at: string
          updated_by: string | null
        }
        SetofOptions: {
          from: "*"
          to: "academic_certificate_requests"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      submit_academic_document_service_request: {
        Args: { p_request_id: string }
        Returns: {
          academic_year: string | null
          applicant_district: string | null
          applicant_email: string | null
          applicant_first_name: string | null
          applicant_house_no: string | null
          applicant_last_name: string | null
          applicant_phone: string | null
          applicant_prefix: string | null
          applicant_province: string | null
          applicant_subdistrict: string | null
          applicant_village_name: string | null
          applicant_village_no: string | null
          assessment_decision: string
          assessment_reason: string | null
          class_label: string | null
          created_at: string
          created_by: string
          director_decision: string
          director_reason: string | null
          doc_certificate: boolean
          doc_certificate_with_grade: boolean
          doc_other: boolean
          doc_other_note: string | null
          doc_transcript: boolean
          doc_transcript_lost: boolean
          evidence_father_id_count: number
          evidence_mother_id_count: number
          evidence_other: boolean
          evidence_other_note: string | null
          evidence_photo_count: number
          evidence_police_report: boolean
          evidence_student_id_count: number
          finalized_at: string | null
          finalized_by: string | null
          graduation_year: string | null
          id: string
          purpose_text: string | null
          registrar_decision: string
          registrar_reason: string | null
          request_code: string
          request_date: string
          request_serial: number
          request_year: string
          semester: number | null
          status: string
          student_code: string | null
          student_first_name: string
          student_id: string | null
          student_last_name: string | null
          student_name: string
          student_prefix: string | null
          submitted_at: string | null
          submitted_by: string | null
          updated_at: string
          updated_by: string | null
        }
        SetofOptions: {
          from: "*"
          to: "academic_document_service_requests"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      submit_academic_transfer_request: {
        Args: { p_request_id: string }
        Returns: {
          academic_year: string
          applicant_name: string
          applicant_role: string
          assessment_decision: string
          assessment_reason: string | null
          birth_date: string
          citizen_id: string
          class_id: string | null
          class_label: string
          contact_phone: string
          created_at: string
          created_by: string
          destination_district: string | null
          destination_province: string | null
          destination_residence: string | null
          destination_school: string | null
          director_decision: string
          director_reason: string | null
          evidence_birth_certificate: boolean
          evidence_house_registration: boolean
          evidence_other: boolean
          evidence_other_note: string | null
          evidence_parent_id: boolean
          evidence_phone: boolean
          evidence_photo: boolean
          father_name: string | null
          finalized_at: string | null
          finalized_by: string | null
          finance_amount_due: number | null
          finance_decision: string
          finance_reason: string | null
          finance_status: string
          guardian_address: string | null
          guardian_name: string
          id: string
          mother_name: string | null
          official_document_number: string | null
          official_document_number_updated_at: string | null
          official_document_number_updated_by: string | null
          official_document_number_updated_by_name: string | null
          official_note: string | null
          other_reason: string | null
          reason_type: string
          registrar_decision: string
          registrar_reason: string | null
          request_code: string | null
          request_date: string
          semester: number
          status: string
          student_code: string
          student_id: string
          student_name: string
          student_number: number | null
          submitted_at: string | null
          submitted_by: string | null
          transfer_date: string
          updated_at: string
          updated_by: string | null
        }
        SetofOptions: {
          from: "*"
          to: "academic_transfer_requests"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      submit_bnk_document_signed: {
        Args: {
          p_document_id: string
          p_method: string
          p_signature_id?: string
          p_system_code: string
        }
        Returns: undefined
      }
      submit_classroom_research_report: {
        Args: { p_report_id: string }
        Returns: {
          abstract_text: string | null
          academic_head_comment: string | null
          academic_head_decision: string
          academic_head_id: string | null
          academic_head_name: string | null
          academic_head_position: string | null
          academic_head_reviewed_at: string | null
          academic_year: string
          approval_version: number
          approved_at: string | null
          assignment_id: string
          class_id: string
          class_label: string
          created_at: string
          director_approval_automatic: boolean
          director_comment: string | null
          director_decision: string
          director_name: string | null
          director_position: string | null
          director_reviewed_at: string | null
          director_reviewer_id: string | null
          id: string
          keywords_text: string | null
          one_page_data: Json
          research_bucket: string | null
          research_end_date: string | null
          research_mime_type: string | null
          research_original_name: string | null
          research_size_bytes: number | null
          research_start_date: string | null
          research_storage_path: string | null
          research_type: string
          research_type_other: string | null
          revision_stage: string | null
          semester: number
          status: string
          subject_code: string | null
          subject_group_comment: string | null
          subject_group_decision: string
          subject_group_head_id: string | null
          subject_group_head_name: string | null
          subject_group_head_position: string | null
          subject_group_id: string | null
          subject_group_name: string | null
          subject_group_reviewed_at: string | null
          subject_id: string
          subject_name: string
          submission_mode: string
          submitted_at: string | null
          teacher_id: string
          teacher_name: string
          teacher_position: string | null
          title: string
          updated_at: string
        }
        SetofOptions: {
          from: "*"
          to: "academic_classroom_research_reports"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      submit_club_activity_report: {
        Args: { p_report_id: string }
        Returns: {
          academic_head_comment: string | null
          academic_head_decision: string
          academic_head_id: string | null
          academic_head_name: string | null
          academic_head_position: string | null
          academic_head_reviewed_at: string | null
          academic_year: string
          appendix_notes: string | null
          approval_version: number
          approved_at: string | null
          attendance_threshold: number
          budget_amount: number
          club_name: string
          co_adviser_id: string | null
          co_adviser_name: string | null
          co_adviser_position: string | null
          created_at: string
          director_approval_automatic: boolean
          director_comment: string | null
          director_decision: string
          director_name: string | null
          director_position: string | null
          director_reviewed_at: string | null
          director_reviewer_id: string | null
          id: string
          objectives: Json
          operation_summary: string | null
          photos: Json
          revision_stage: string | null
          semester: number
          session_count: number
          shared_teacher_ids: string[]
          shared_teacher_names: string[]
          source_file_bucket: string | null
          source_file_mime: string | null
          source_file_name: string | null
          source_file_path: string | null
          source_file_size: number | null
          source_file_uploaded_at: string | null
          status: string
          submission_mode: string
          submitted_at: string | null
          success_targets: Json
          teacher_id: string
          teacher_name: string
          teacher_position: string | null
          tracking_unit: string
          updated_at: string
          work_plan: Json
        }
        SetofOptions: {
          from: "*"
          to: "academic_club_activity_reports"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      submit_learner_activity_report: {
        Args: { p_report_id: string }
        Returns: {
          academic_head_comment: string | null
          academic_head_decision: string
          academic_head_id: string | null
          academic_head_name: string | null
          academic_head_position: string | null
          academic_head_reviewed_at: string | null
          academic_year: string
          activities: Json
          approval_version: number
          approved_at: string | null
          assessment_head_comment: string | null
          assessment_head_decision: string
          assessment_head_id: string | null
          assessment_head_name: string | null
          assessment_head_position: string | null
          assessment_head_reviewed_at: string | null
          class_id: string
          class_label: string
          co_adviser_id: string | null
          co_adviser_name: string | null
          co_adviser_position: string | null
          created_at: string
          director_approval_automatic: boolean
          director_comment: string | null
          director_decision: string
          director_name: string | null
          director_position: string | null
          director_reviewed_at: string | null
          director_reviewer_id: string | null
          exited_female: number
          exited_male: number
          id: string
          joined_female: number
          joined_male: number
          level_reviewer_comment: string | null
          level_reviewer_decision: string
          level_reviewer_id: string | null
          level_reviewer_name: string | null
          level_reviewer_position: string | null
          level_reviewer_reviewed_at: string | null
          opening_female: number
          opening_male: number
          revision_stage: string | null
          semester: number
          shared_teacher_ids: string[]
          shared_teacher_names: string[]
          source_file_bucket: string | null
          source_file_mime: string | null
          source_file_name: string | null
          source_file_path: string | null
          source_file_size: number | null
          source_file_uploaded_at: string | null
          stage_code: string | null
          status: string
          submission_mode: string
          submitted_at: string | null
          teacher_id: string
          teacher_name: string
          teacher_position: string | null
          updated_at: string
        }
        SetofOptions: {
          from: "*"
          to: "academic_learner_activity_reports"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      submit_learning_media_report: {
        Args: { p_report_id: string }
        Returns: {
          academic_head_comment: string | null
          academic_head_decision: string
          academic_head_id: string | null
          academic_head_name: string | null
          academic_head_position: string | null
          academic_head_reviewed_at: string | null
          academic_year: string
          approval_version: number
          approved_at: string | null
          assignment_id: string | null
          cert_content_appropriate: boolean
          cert_other_text: string | null
          cert_practical: boolean
          class_id: string
          class_label: string
          created_at: string
          director_approval_automatic: boolean
          director_comment: string | null
          director_decision: string
          director_reviewed_at: string | null
          director_reviewer_id: string | null
          id: string
          media_items: Json
          revision_stage: string | null
          semester: number
          status: string
          subject_code: string | null
          subject_group_comment: string | null
          subject_group_decision: string
          subject_group_head_id: string | null
          subject_group_head_name: string | null
          subject_group_head_position: string | null
          subject_group_id: string | null
          subject_group_name: string | null
          subject_group_reviewed_at: string | null
          subject_id: string
          subject_name: string
          submitted_at: string | null
          teacher_id: string
          teacher_name: string
          teacher_position: string | null
          updated_at: string
        }
        SetofOptions: {
          from: "*"
          to: "academic_learning_media_reports"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      submit_leave_request: {
        Args: { p_leave_request_id: string }
        Returns: {
          academic_year: number
          affects_teaching_schedule: boolean
          approval_version: number
          approved_at: string | null
          contact_during_leave: string | null
          contact_phone: string | null
          created_at: string
          director_approval_automatic: boolean
          director_comment: string | null
          director_reviewed_at: string | null
          director_reviewer_id: string | null
          director_reviewer_name: string | null
          director_signature_id: string | null
          end_date: string
          id: string
          leave_days: number
          leave_type_code: string
          leave_year: number
          other_leave_text: string | null
          personnel_comment: string | null
          personnel_reviewed_at: string | null
          personnel_reviewer_id: string | null
          personnel_reviewer_name: string | null
          reason: string
          request_no: number
          requester_id: string
          requester_name: string
          requester_position: string | null
          requester_role: string
          semester: number
          start_date: string
          status: string
          submitted_at: string | null
          updated_at: string
        }
        SetofOptions: {
          from: "*"
          to: "leave_requests"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      submit_leave_request_signed: {
        Args: {
          p_leave_request_id: string
          p_method: string
          p_signature?: string
        }
        Returns: {
          academic_year: number
          affects_teaching_schedule: boolean
          approval_version: number
          approved_at: string | null
          contact_during_leave: string | null
          contact_phone: string | null
          created_at: string
          director_approval_automatic: boolean
          director_comment: string | null
          director_reviewed_at: string | null
          director_reviewer_id: string | null
          director_reviewer_name: string | null
          director_signature_id: string | null
          end_date: string
          id: string
          leave_days: number
          leave_type_code: string
          leave_year: number
          other_leave_text: string | null
          personnel_comment: string | null
          personnel_reviewed_at: string | null
          personnel_reviewer_id: string | null
          personnel_reviewer_name: string | null
          reason: string
          request_no: number
          requester_id: string
          requester_name: string
          requester_position: string | null
          requester_role: string
          semester: number
          start_date: string
          status: string
          submitted_at: string | null
          updated_at: string
        }
        SetofOptions: {
          from: "*"
          to: "leave_requests"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      submit_lesson_plan: {
        Args: { p_lesson_plan_id: string }
        Returns: {
          academic_year: string
          activities: string | null
          approval_version: number
          approved_at: string | null
          assessment: string | null
          class_level: string | null
          content_summary: string | null
          created_at: string
          department_id: string
          director_approval_automatic: boolean
          director_decision: string
          director_reviewed_at: string | null
          director_reviewer_id: string | null
          head_decision: string
          head_reviewed_at: string | null
          head_reviewer_id: string | null
          id: string
          learning_objectives: string | null
          learning_unit: string | null
          plan_type: string
          revision_note: string | null
          semester: number
          status: string
          subject_code: string | null
          subject_name: string
          submitted_at: string | null
          teach_date: string | null
          teacher_id: string
          teacher_name: string | null
          term_id: string | null
          topic: string | null
          updated_at: string
          week_number: number | null
        }
        SetofOptions: {
          from: "*"
          to: "lesson_plans"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      submit_lesson_plan_usage_report: {
        Args: { p_report_id: string }
        Returns: {
          academic_head_comment: string | null
          academic_head_decision: string
          academic_head_id: string | null
          academic_head_name: string | null
          academic_head_position: string | null
          academic_head_reviewed_at: string | null
          academic_year: string
          approval_version: number
          approved_at: string | null
          assignment_id: string | null
          class_id: string
          class_label: string
          created_at: string
          director_approval_automatic: boolean
          director_comment: string | null
          director_decision: string
          director_reviewed_at: string | null
          director_reviewer_id: string | null
          grade_counts: Json
          id: string
          improvements_text: string | null
          memo_date: string | null
          memo_number: string | null
          objectives_text: string | null
          plans_per_unit: number | null
          problems_suggestions_text: string | null
          revision_stage: string | null
          satisfaction_items: Json
          semester: number
          status: string
          strengths_text: string | null
          student_count: number
          subject_code: string | null
          subject_group_comment: string | null
          subject_group_decision: string
          subject_group_head_id: string | null
          subject_group_head_name: string | null
          subject_group_head_position: string | null
          subject_group_id: string | null
          subject_group_name: string | null
          subject_group_reviewed_at: string | null
          subject_id: string
          subject_name: string
          submitted_at: string | null
          summary_text: string | null
          supporting_documents_text: string | null
          teacher_id: string
          teacher_name: string
          teacher_position: string | null
          top_students: Json
          unit_progress: Json
          units_count: number | null
          updated_at: string
          weaknesses_text: string | null
        }
        SetofOptions: {
          from: "*"
          to: "academic_lesson_plan_usage_reports"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      submit_post_lesson_report: {
        Args: { p_report_id: string; p_signature_id?: string }
        Returns: {
          academic_decision: string
          academic_year: string
          approval_version: number
          approved_at: string | null
          assignment_id: string | null
          class_id: string | null
          class_label: string
          competency_text: string | null
          created_at: string
          desirable_attributes_text: string | null
          director_approval_automatic: boolean
          director_decision: string
          director_reviewed_at: string | null
          director_reviewer_id: string | null
          id: string
          include_behavior_assessment: boolean
          knowledge_text: string | null
          other_notes: string | null
          problems_text: string | null
          report_scope: string
          reviewed_at: string | null
          reviewer_comment: string | null
          reviewer_id: string | null
          reviewer_name: string | null
          reviewer_position: string | null
          reviewer_signature_id: string | null
          semester: number
          solutions_text: string | null
          status: string
          subject_code: string | null
          subject_id: string | null
          subject_name: string
          subject_specific_text: string | null
          subject_specific_title: string
          submitted_at: string | null
          teach_date: string | null
          teacher_id: string
          teacher_name: string
          teacher_position: string | null
          teacher_signature_id: string | null
          unit_number: number | null
          unit_title: string
          updated_at: string
        }
        SetofOptions: {
          from: "*"
          to: "academic_post_lesson_reports"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      sync_preschool_group_covers: {
        Args: { p_academic_year: number; p_semester: number }
        Returns: number
      }
      sync_substitute_teaching: {
        Args: { p_academic_year: number; p_semester: number }
        Returns: number
      }
      timetable_apply_generated: {
        Args: { p_placements: Json }
        Returns: number
      }
      timetable_assign_p33_staff: {
        Args: { p_teacher_ids: string[] }
        Returns: Json
      }
      timetable_commit_generated: {
        Args: { p_class_ids: string[]; p_placements: Json; p_publish?: boolean }
        Returns: Json
      }
      timetable_demo_save_generated: {
        Args: { p_class: string; p_slots: Json }
        Returns: number
      }
      timetable_lock_subject: {
        Args: {
          p_assignment: string
          p_class: string
          p_length: number
          p_start_period: number
          p_weekday: number
        }
        Returns: number
      }
      timetable_lock_subject_batch: { Args: { p_items: Json }; Returns: number }
      timetable_unlock_subject: {
        Args: { p_lock_id: string }
        Returns: undefined
      }
      unassign_substitute_teacher: {
        Args: { p_comment?: string; p_substitute_lesson_id: string }
        Returns: {
          absent_teacher_id: string
          absent_teacher_name: string
          academic_year: number
          assigned_at: string | null
          assigned_by: string | null
          assigned_by_name: string | null
          class_id: string | null
          class_label: string
          created_at: string
          end_time: string
          id: string
          leave_date: string
          leave_request_id: string
          leave_request_no: number
          note: string | null
          period_no: number
          semester: number
          stage_code: string
          start_time: string
          status: string
          subject_id: string | null
          subject_name: string
          substitute_teacher_id: string | null
          substitute_teacher_name: string | null
          timetable_entry_id: string
          updated_at: string
        }
        SetofOptions: {
          from: "*"
          to: "substitute_lessons"
          isOneToOne: true
          isSetofReturn: false
        }
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
