import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error(
    'Les variables VITE_SUPABASE_URL et VITE_SUPABASE_ANON_KEY sont manquantes. ' +
    'Vérifiez votre fichier .env.local ou les variables d\'environnement Vercel.'
  );
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
