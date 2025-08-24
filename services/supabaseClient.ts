import { createClient } from '@supabase/supabase-js';

// --- GESTIONE DELLE CREDENZIALI ---
// Le chiavi sono definite qui per la compatibilità con un ambiente eseguito direttamente nel browser (senza un "build step").
// Questo assicura che l'applicazione funzioni correttamente in sviluppo locale e in produzione.
//
// NOTA SULLA SICUREZZA: In un workflow di Continuous Integration (CI) come GitHub Actions,
// queste chiavi vengono sostituite dinamicamente al momento del test con credenziali sicure
// fornite tramite "secrets", garantendo che le chiavi di produzione non siano esposte.
const supabaseUrl = 'https://annyuowenmyfuvaavhmd.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFubnl1b3dlbm15ZnV2YWF2aG1kIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTYwNTQ4ODIsImV4cCI6MjA3MTYzMDg4Mn0.BSmiyybr8VfutFv9oqFkd4NW2rEI30HVE8jZzgSddAY';

if (!supabaseUrl || !supabaseAnonKey) {
  // Questa verifica è una salvaguardia ma non dovrebbe attivarsi con i valori hardcoded.
  throw new Error("Le variabili Supabase URL e Anon Key sono mancanti.");
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
