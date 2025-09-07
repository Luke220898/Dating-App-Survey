import { Answers, Submission, SubmissionMetadata } from '../types';
import type { Database } from '../types/supabase';
import { withRetry, log } from './log';
// Lazy supabase client accessor to defer SDK cost until first DB call
let _supabase: import('@supabase/supabase-js').SupabaseClient<Database> | null = null;
const getClient = async () => {
    if (_supabase) return _supabase;
    const mod = await import('./supabaseClient');
    _supabase = mod.supabase;
    return _supabase;
};

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
    return withRetry(async () => {
        const supabase = await getClient();
        const metadata: SubmissionMetadata = {
            browser: getBrowserName(),
            os: navigator.platform,
            device: getDeviceType(),
            source: document.referrer || 'Direct'
        };
        const { data, error } = await supabase
            .from('submissions')
            .insert([{ answers: {}, status: 'partial', metadata } as any])
            .select()
            .single();
        if (error) { log.error('createPartialSubmission', error); throw new Error(`Supabase insert error: ${error.message}`); }
        if (!data) { throw new Error('Supabase returned empty data for insert'); }
        log.debug('createPartialSubmission ok', data.id);
        return data as Submission;
    }, { retries: 2, label: 'createPartialSubmission' });
};

/**
 * Aggiorna le risposte per una submission esistente.
 * Dovrebbe essere chiamata man mano che l'utente progredisce nel sondaggio.
 * @param id - L'ID della submission da aggiornare.
 * @param answers - L'oggetto delle risposte correnti.
 * @returns Una promessa che si risolve quando l'aggiornamento è completo.
 */
export const updateSurveyAnswers = async (id: string, answers: Answers): Promise<void> => {
    if (!id) return; // nothing to do
    await withRetry(async () => {
        const supabase = await getClient();
        const { error } = await supabase.from('submissions').update({ answers } as any).eq('id', id);
        if (error) { log.warn('updateSurveyAnswers error', error); throw error; }
    }, { retries: 1, label: 'updateSurveyAnswers' });
};

/**
 * Finalizza un sondaggio aggiornando il suo stato a 'completed' e salvando le risposte finali.
 * @param id - L'ID della submission da finalizzare.
 * @param answers - L'oggetto delle risposte finali.
 * @param duration - La durata totale del sondaggio in secondi.
 * @returns Una promessa che si risolve quando la finalizzazione è completa.
 */
export const finalizeSurvey = async (id: string, answers: Answers, duration: number | null): Promise<void> => {
    if (!id) { log.error('finalizeSurvey senza id'); throw new Error('Missing submission id'); }
    await withRetry(async () => {
        const supabase = await getClient();
        const { error } = await supabase.from('submissions').update({ answers, status: 'completed', duration_seconds: duration } as any).eq('id', id);
        if (error) { log.error('finalizeSurvey error', error); throw error; }
    }, { retries: 2, label: 'finalizeSurvey' });
};


/**
 * Recupera tutti i dati dei sondaggi dal database Supabase.
 * @returns Una promessa che si risolve con un array di tutte le risposte.
 */
export const getSurveyData = async (): Promise<Submission[]> => {
    return withRetry(async () => {
        const supabase = await getClient();
        const { data, error } = await supabase.from('submissions').select('*');
        if (error) { log.error('getSurveyData error', error); throw error; }
        return data as Submission[];
    }, { retries: 2, label: 'getSurveyData' });
};