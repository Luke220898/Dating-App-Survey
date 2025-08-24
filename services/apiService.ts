import { Answers, Submission, SubmissionMetadata } from '../types';
import { supabase } from './supabaseClient';

/**
 * Ritorna il tipo di dispositivo basandosi sulla stringa User Agent.
 * Questo è più affidabile del controllo della larghezza dello schermo.
 * @returns 'Mobile' o 'Desktop'.
 */
const getDeviceType = (): 'Mobile' | 'Desktop' => {
  const ua = navigator.userAgent;
  if (/Mobi|Android|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(ua)) {
    return 'Mobile';
  }
  return 'Desktop';
};

/**
 * Ritorna il nome del browser basandosi sulla stringa User Agent.
 * L'ordine dei controlli è importante perché gli user agent possono contenere più nomi.
 * @returns Il nome del browser o 'Unknown'.
 */
const getBrowserName = (): string => {
    const ua = navigator.userAgent;
    // L'ordine è importante.
    if (ua.includes("Edg/") || ua.includes("Edge/")) return "Edge";
    if (ua.includes("SamsungBrowser")) return "Samsung Internet";
    if (ua.includes("Opera") || ua.includes("OPR")) return "Opera";
    if (ua.includes("Chrome") && !ua.includes("Edg")) return "Chrome";
    if (ua.includes("Firefox")) return "Firefox";
    if (ua.includes("Trident")) return "Internet Explorer";
    // Safari deve essere controllato dopo Chrome e Edge
    if (ua.includes("Safari") && !ua.includes("Chrome") && !ua.includes("Edg")) return "Safari";
    
    return "Unknown";
}

/**
 * Crea un nuovo record di submission con lo stato 'partial'.
 * Dovrebbe essere chiamata quando l'utente inizia il sondaggio.
 * @returns Una promessa che si risolve con l'oggetto della submission appena creato.
 */
export const createPartialSubmission = async (): Promise<Submission> => {
    const metadata: SubmissionMetadata = {
        browser: getBrowserName(),
        os: navigator.platform,
        device: getDeviceType(),
        source: document.referrer || 'Direct'
    };

    const { data, error } = await supabase
        .from('submissions')
        .insert([{
            answers: {},
            status: 'partial',
            metadata: metadata,
        }])
        .select()
        .single();

    if (error) {
        console.error("Errore durante la creazione della submission parziale:", error);
        throw new Error(`Errore di inserimento Supabase: ${error.message}`);
    }
    if (!data) {
        throw new Error("Impossibile creare la submission parziale, nessun dato restituito.");
    }

    return data as Submission;
};

/**
 * Aggiorna le risposte per una submission esistente.
 * Dovrebbe essere chiamata man mano che l'utente progredisce nel sondaggio.
 * @param id - L'ID della submission da aggiornare.
 * @param answers - L'oggetto delle risposte correnti.
 * @returns Una promessa che si risolve quando l'aggiornamento è completo.
 */
export const updateSurveyAnswers = async (id: string, answers: Answers): Promise<void> => {
    if (!id) return;
    const { error } = await supabase
        .from('submissions')
        .update({ answers: answers })
        .eq('id', id);

    if (error) {
        // Registriamo l'errore ma non lo lanciamo, per evitare di bloccare la progressione dell'interfaccia utente
        // per un salvataggio in background non critico. La navigazione successiva potrebbe avere successo.
        console.error("Errore durante l'aggiornamento delle risposte del sondaggio:", error);
    }
};

/**
 * Finalizza un sondaggio aggiornando il suo stato a 'completed' e salvando le risposte finali.
 * @param id - L'ID della submission da finalizzare.
 * @param answers - L'oggetto delle risposte finali.
 * @param duration - La durata totale del sondaggio in secondi.
 * @returns Una promessa che si risolve quando la finalizzazione è completa.
 */
export const finalizeSurvey = async (id: string, answers: Answers, duration: number | null): Promise<void> => {
    if (!id) {
        console.error("Impossibile finalizzare il sondaggio senza un ID di submission.");
        throw new Error("ID di submission mancante per la finalizzazione.");
    }
  
    const { error } = await supabase
        .from('submissions')
        .update({
            answers: answers,
            status: 'completed',
            duration_seconds: duration
        })
        .eq('id', id);

    if (error) {
        console.error("Errore durante la finalizzazione del sondaggio:", error);
        throw new Error(`Errore di aggiornamento Supabase: ${error.message}`);
    }
};


/**
 * Recupera tutti i dati dei sondaggi dal database Supabase.
 * @returns Una promessa che si risolve con un array di tutte le risposte.
 */
export const getSurveyData = async (): Promise<Submission[]> => {
  const { data, error } = await supabase
    .from('submissions')
    .select('*');

  if (error) {
    console.error("Errore durante il recupero da Supabase:", error);
    throw new Error(`Supabase select error: ${error.message}`);
  }

  // Il dato da Supabase è già nel formato corretto, ma lo tipizziamo per sicurezza.
  return data as Submission[];
};