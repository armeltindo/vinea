import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
const supabaseServiceRoleKey = import.meta.env.VITE_SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error(
    'Les variables VITE_SUPABASE_URL et VITE_SUPABASE_ANON_KEY sont manquantes. ' +
    'Vérifiez votre fichier .env.local ou les variables d\'environnement Vercel.'
  );
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Client admin (service role) — utilisé uniquement pour créer des comptes sans confirmation email.
// Renseignez VITE_SUPABASE_SERVICE_ROLE_KEY dans .env.local (Settings → API → service_role).
export const supabaseAdmin = supabaseServiceRoleKey
  ? createClient(supabaseUrl, supabaseServiceRoleKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    })
  : null;
