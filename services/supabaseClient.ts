import { createClient } from '@supabase/supabase-js';

// --- INSERISCI QUI LE TUE CHIAVI SUPABASE ---
// Sostituisci le stringhe qui sotto con i valori che trovi nella dashboard del tuo progetto Supabase
// Vai su Project Settings > API
const supabaseUrl = 'https://annyuowenmyfuvaavhmd.supabase.co'; // Esempio: 'https://xxxxxxxxxxxxxx.supabase.co'
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFubnl1b3dlbm15ZnV2YWF2aG1kIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTYwNTQ4ODIsImV4cCI6MjA3MTYzMDg4Mn0.BSmiyybr8VfutFv9oqFkd4NW2rEI30HVE8jZzgSddAY'; // Esempio: 'ey...'

// NOTA: In un ambiente di produzione reale (come Vercel), queste chiavi verrebbero
// caricate in modo sicuro dalle "Environment Variables" (`process.env`).
// Per questo ambiente di sviluppo, le inseriamo qui per far funzionare l'app.

if (!supabaseUrl || !supabaseAnonKey || supabaseUrl.startsWith('INSERISCI_QUI') || supabaseAnonKey.startsWith('INSERISCI_QUI')) {
  // Questo errore verrà mostrato nella console del browser se le variabili non sono impostate.
  console.error("Supabase URL and Anon Key are missing. Please set them in services/supabaseClient.ts");
  
  // Questo previene che l'app si blocchi con un errore e mostra un messaggio più utile direttamente nell'interfaccia.
  const rootElement = document.getElementById('root');
  if (rootElement) {
    rootElement.innerHTML = `
      <div style="font-family: sans-serif; padding: 2rem; text-align: center; background: #fff3f3; border: 1px solid #ffcccc; color: #cc0000; margin: 2rem; border-radius: 8px;">
        <h1 style="font-size: 1.5rem; margin-bottom: 1rem;">Configurazione di Supabase Mancante</h1>
        <p>Per favore, inserisci il tuo URL e la tua Chiave Anon nel file <strong>services/supabaseClient.ts</strong>.</p>
        <p style="font-size: 0.9rem; margin-top: 1rem;">Queste informazioni sono necessarie per collegare l'applicazione al tuo database.</p>
      </div>
    `;
  }
  
  throw new Error("Supabase URL and Anon Key must be provided in services/supabaseClient.ts");
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);