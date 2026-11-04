import { createClient } from '@supabase/supabase-js';

// Provided Supabase configuration for frontend client
export const SUPABASE_URL = 
  import.meta.env.VITE_SUPABASE_URL || 'https://rkwnxsstnnqzjscpoxnd.supabase.co';

export const SUPABASE_ANON_KEY = 
  import.meta.env.VITE_SUPABASE_ANON_KEY || 'sb_publishable_qx6UIy__TOu9DOnyYPhJ9A_gnMRBern';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
  },
});

export interface UserProfile {
  id: string;
  email: string;
  role: 'user' | 'admin';
  full_name?: string;
  avatar_url?: string;
  created_at?: string;
}

export interface Conversation {
  id: string;
  title: string;
  language: 'bn' | 'en';
  created_at: string;
  updated_at: string;
}

export interface ChatMessage {
  id: string;
  conversation_id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  provider_used?: string;
  audio_duration?: number;
  created_at: string;
}
