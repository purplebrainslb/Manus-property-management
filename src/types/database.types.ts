export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      properties: {
        Row: {
          id: string
          created_at: string
          updated_at: string
          name: string
          address: string
          city: string
          state: string
          zip: string
          total_units: number
          occupied_units: number
          wallet_balance: number
          property_manager_id: string
        }
        Insert: {
          id?: string
          created_at?: string
          updated_at?: string
          name: string
          address: string
          city: string
          state: string
          zip: string
          total_units: number
          occupied_units?: number
          wallet_balance?: number
          property_manager_id: string
        }
        Update: {
          id?: string
          created_at?: string
          updated_at?: string
          name?: string
          address?: string
          city?: string
          state?: string
          zip?: string
          total_units?: number
          occupied_units?: number
          wallet_balance?: number
          property_manager_id?: string
        }
      }
      residents: {
        Row: {
          id: string
          created_at: string
          updated_at: string
          user_id: string
          property_id: string
          unit_number: string
          is_active: boolean
          balance: number
        }
        Insert: {
          id?: string
          created_at?: string
          updated_at?: string
          user_id: string
          property_id: string
          unit_number: string
          is_active?: boolean
          balance?: number
        }
        Update: {
          id?: string
          created_at?: string
          updated_at?: string
          user_id?: string
          property_id?: string
          unit_number?: string
          is_active?: boolean
          balance?: number
        }
      }
      invoices: {
        Row: {
          id: string
          created_at: string
          updated_at: string
          property_id: string
          title: string
          description: string
          amount: number
          issue_date: string
          due_date: string
          is_paid: boolean
          is_recurring: boolean
          recurrence_frequency: string | null
          next_recurrence_date: string | null
          attachment_url: string | null
          created_by: string
        }
        Insert: {
          id?: string
          created_at?: string
          updated_at?: string
          property_id: string
          title: string
          description: string
          amount: number
          issue_date: string
          due_date: string
          is_paid?: boolean
          is_recurring?: boolean
          recurrence_frequency?: string | null
          next_recurrence_date?: string | null
          attachment_url?: string | null
          created_by: string
        }
        Update: {
          id?: string
          created_at?: string
          updated_at?: string
          property_id?: string
          title?: string
          description?: string
          amount?: number
          issue_date?: string
          due_date?: string
          is_paid?: boolean
          is_recurring?: boolean
          recurrence_frequency?: string | null
          next_recurrence_date?: string | null
          attachment_url?: string | null
          created_by?: string
        }
      }
      invoice_splits: {
        Row: {
          id: string
          created_at: string
          updated_at: string
          invoice_id: string
          resident_id: string
          amount: number
          is_paid: boolean
          payment_date: string | null
        }
        Insert: {
          id?: string
          created_at?: string
          updated_at?: string
          invoice_id: string
          resident_id: string
          amount: number
          is_paid?: boolean
          payment_date?: string | null
        }
        Update: {
          id?: string
          created_at?: string
          updated_at?: string
          invoice_id?: string
          resident_id?: string
          amount?: number
          is_paid?: boolean
          payment_date?: string | null
        }
      }
      meetings: {
        Row: {
          id: string
          created_at: string
          updated_at: string
          property_id: string
          title: string
          date: string
          start_time: string
          end_time: string | null
          location: string | null
          is_confirmed: boolean
          created_by: string
        }
        Insert: {
          id?: string
          created_at?: string
          updated_at?: string
          property_id: string
          title: string
          date: string
          start_time: string
          end_time?: string | null
          location?: string | null
          is_confirmed?: boolean
          created_by: string
        }
        Update: {
          id?: string
          created_at?: string
          updated_at?: string
          property_id?: string
          title?: string
          date?: string
          start_time?: string
          end_time?: string | null
          location?: string | null
          is_confirmed?: boolean
          created_by?: string
        }
      }
      meeting_attendees: {
        Row: {
          id: string
          created_at: string
          meeting_id: string
          resident_id: string
          attended: boolean
        }
        Insert: {
          id?: string
          created_at?: string
          meeting_id: string
          resident_id: string
          attended?: boolean
        }
        Update: {
          id?: string
          created_at?: string
          meeting_id?: string
          resident_id?: string
          attended?: boolean
        }
      }
      meeting_items: {
        Row: {
          id: string
          created_at: string
          updated_at: string
          meeting_id: string
          content: string
          type: 'complaint' | 'decision' | 'note'
          order: number
        }
        Insert: {
          id?: string
          created_at?: string
          updated_at?: string
          meeting_id: string
          content: string
          type: 'complaint' | 'decision' | 'note'
          order?: number
        }
        Update: {
          id?: string
          created_at?: string
          updated_at?: string
          meeting_id?: string
          content?: string
          type?: 'complaint' | 'decision' | 'note'
          order?: number
        }
      }
      announcements: {
        Row: {
          id: string
          created_at: string
          updated_at: string
          property_id: string
          title: string
          content: string
          attachment_url: string | null
          created_by: string
        }
        Insert: {
          id?: string
          created_at?: string
          updated_at?: string
          property_id: string
          title: string
          content: string
          attachment_url?: string | null
          created_by: string
        }
        Update: {
          id?: string
          created_at?: string
          updated_at?: string
          property_id?: string
          title?: string
          content?: string
          attachment_url?: string | null
          created_by?: string
        }
      }
      tickets: {
        Row: {
          id: string
          created_at: string
          updated_at: string
          property_id: string
          resident_id: string
          category: 'maintenance' | 'complaint'
          title: string
          description: string
          status: 'open' | 'in_progress' | 'resolved'
          resolved_at: string | null
          resolved_by: string | null
        }
        Insert: {
          id?: string
          created_at?: string
          updated_at?: string
          property_id: string
          resident_id: string
          category: 'maintenance' | 'complaint'
          title: string
          description: string
          status?: 'open' | 'in_progress' | 'resolved'
          resolved_at?: string | null
          resolved_by?: string | null
        }
        Update: {
          id?: string
          created_at?: string
          updated_at?: string
          property_id?: string
          resident_id?: string
          category?: 'maintenance' | 'complaint'
          title?: string
          description?: string
          status?: 'open' | 'in_progress' | 'resolved'
          resolved_at?: string | null
          resolved_by?: string | null
        }
      }
      ticket_media: {
        Row: {
          id: string
          created_at: string
          ticket_id: string
          media_url: string
          uploaded_by: string
        }
        Insert: {
          id?: string
          created_at?: string
          ticket_id: string
          media_url: string
          uploaded_by: string
        }
        Update: {
          id?: string
          created_at?: string
          ticket_id?: string
          media_url?: string
          uploaded_by?: string
        }
      }
      ticket_notes: {
        Row: {
          id: string
          created_at: string
          ticket_id: string
          content: string
          created_by: string
        }
        Insert: {
          id?: string
          created_at?: string
          ticket_id: string
          content: string
          created_by: string
        }
        Update: {
          id?: string
          created_at?: string
          ticket_id?: string
          content?: string
          created_by?: string
        }
      }
      documents: {
        Row: {
          id: string
          created_at: string
          updated_at: string
          property_id: string
          title: string
          description: string | null
          document_url: string
          document_type: string
          version: string | null
          uploaded_by: string
        }
        Insert: {
          id?: string
          created_at?: string
          updated_at?: string
          property_id: string
          title: string
          description?: string | null
          document_url: string
          document_type: string
          version?: string | null
          uploaded_by: string
        }
        Update: {
          id?: string
          created_at?: string
          updated_at?: string
          property_id?: string
          title?: string
          description?: string | null
          document_url?: string
          document_type?: string
          version?: string | null
          uploaded_by?: string
        }
      }
      user_profiles: {
        Row: {
          id: string
          created_at: string
          updated_at: string
          user_id: string
          first_name: string
          last_name: string
          email: string
          phone: string | null
          role: 'property_manager' | 'resident'
          avatar_url: string | null
        }
        Insert: {
          id?: string
          created_at?: string
          updated_at?: string
          user_id: string
          first_name: string
          last_name: string
          email: string
          phone?: string | null
          role: 'property_manager' | 'resident'
          avatar_url?: string | null
        }
        Update: {
          id?: string
          created_at?: string
          updated_at?: string
          user_id?: string
          first_name?: string
          last_name?: string
          email?: string
          phone?: string | null
          role?: 'property_manager' | 'resident'
          avatar_url?: string | null
        }
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
    }
  }
}
