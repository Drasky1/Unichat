import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const isSupabaseConfigured = Boolean(supabaseUrl && supabaseAnonKey);

export const supabase = isSupabaseConfigured
  ? createClient(supabaseUrl, supabaseAnonKey)
  : null;

export const UNIVERSITY_EMAIL_DOMAINS = {
  'Rangsit University (RSU)': 'rsu.ac.th',
  'Bangkok University (BU)': 'bu.ac.th',
  'Chulalongkorn University (CU)': 'chula.ac.th',
  'Assumption University (ABAC)': 'au.edu',
  'Mahidol University (MU / MUIC)': 'mahidol.ac.th',
};

export function emailMatchesUniversity(email, university) {
  const domain = UNIVERSITY_EMAIL_DOMAINS[university];
  if (!domain || !email) return false;
  return email.trim().toLowerCase().endsWith(`@${domain}`);
}
