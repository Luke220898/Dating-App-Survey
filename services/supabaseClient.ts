import { createClient } from '@supabase/supabase-js';
import type { Database } from '../types/supabase';

// Centralized Supabase browser client.
// Usa variabili ambiente Vite: VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY
// In assenza (sviluppo locale non configurato) emette un warning e lancia errore bloccante.
const url = (import.meta as any).env?.VITE_SUPABASE_URL as string | undefined;
const anon = (import.meta as any).env?.VITE_SUPABASE_ANON_KEY as string | undefined;

if (!url || !anon) {
  // Manteniamo messaggio conciso per non esporre dettagli in produzione.
  console.warn('[supabaseClient] Variabili ambiente mancanti: VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY');
  throw new Error('Configurazione Supabase mancante. Definire le variabili ambiente.');
}

export const supabase = createClient<Database>(url, anon, {
  auth: {
    persistSession: false // nessuna sessione utente richiesta per semplice survey pubblico
  }
});
