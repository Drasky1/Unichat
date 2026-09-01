import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const isSupabaseConfigured = Boolean(supabaseUrl && supabaseAnonKey);

export const supabase = isSupabaseConfigured
  ? createClient(supabaseUrl, supabaseAnonKey)
  : null;

// Must exactly match the `university` column values in the university_domains table
export const UNIVERSITY_EMAIL_DOMAINS = {
  'Rangsit University (RSU)':                   'rsu.ac.th',
  'Bangkok University (BU)':                    'bu.ac.th',
  'Chulalongkorn University (CU)':              'chula.ac.th',
  'Assumption University (ABAC)':               'au.edu',
  'Mahidol University (MU / MUIC)':             'mahidol.ac.th',
  'Thammasat University (TU)':                  'tu.ac.th',
  'Kasetsart University (KU)':                  'ku.ac.th',
  'KMITL':                                      'kmitl.ac.th',
  'Chiang Mai University (CMU)':                'cmu.ac.th',
  'Mae Fah Luang University (MFU)':             'mfu.ac.th',
  'UTCC':                                       'utcc.ac.th',
  'Stamford International University (STIU)':   'stamford.edu',
  'Webster University Thailand':                'webster.ac.th',
};

export function emailMatchesUniversity(email, university) {
  const domain = UNIVERSITY_EMAIL_DOMAINS[university];
  if (!domain || !email) return false;
  return email.trim().toLowerCase().endsWith(`@${domain}`);
}
