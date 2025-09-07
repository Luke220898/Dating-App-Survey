// Generated manually: define the public schema types we actually use.
// Extend/update if you add columns.
export interface Database {
  public: {
    Tables: {
      submissions: {
        Row: {
          id: string;
          created_at?: string;
          timestamp?: string;
          answers: Record<string, any>;
          status: 'completed' | 'partial';
          metadata: Record<string, any> | null;
          duration_seconds: number | null;
        };
        Insert: {
          id?: string;
          answers?: Record<string, any>;
          status?: 'completed' | 'partial';
          metadata?: Record<string, any> | null;
          duration_seconds?: number | null;
        };
        Update: {
          id?: string;
          answers?: Record<string, any>;
          status?: 'completed' | 'partial';
          metadata?: Record<string, any> | null;
          duration_seconds?: number | null;
        };
        Relationships: [];
      };
    };
    Views: {};
    Functions: {};
    Enums: {};
    CompositeTypes: {};
  };
}
