<div align="center">
   <h1>📊 Dating App Survey</h1>
   <p>Applicazione web per creare, somministrare e analizzare un questionario di validazione per una futura app di dating.</p>
</div>

## ✨ Obiettivo
Raccogliere insight reali sugli utenti (abitudini, frustrazioni, disponibilità a pagare, modelli di business preferiti) prima di sviluppare l'app di dating. Il questionario è dinamico, multilingua (IT/EN) e persiste lo stato parziale per evitare perdite di dati.

## 🧱 Stack Tecnico
- **React 19 + TypeScript**
- **Vite** (dev & bundling)
- **Tailwind CSS v4** (config locale via PostCSS + `@tailwindcss/postcss`)
- **Supabase** (persistenza submissions)
- **React Router (HashRouter)** per navigazione client-side
- **i18n custom** con JSON caricati runtime

## 🗂 Struttura Principale
```
components/       Rendering UI delle domande (QuestionDisplay, ProgressBar, ecc.)
pages/            Flussi: SurveyPage (core), AdminDashboard (analisi), PrivacyPolicy
services/         Integrazione Supabase (crea/aggiorna/finalizza submissions)
contexts/         LanguageContext (caricamento traduzioni + funzione t)
data/             Dataset statici (es. città italiane)
locales/          File di traduzione it.json / en.json
```

## 🔄 Flusso di Compilazione
1. L'utente avvia il sondaggio (schermata Welcome) → creazione record `submissions` stato `partial`.
2. Ogni passaggio tra domande salva in background (`updateSurveyAnswers`).
3. Le domande condizionali (es. motivazione pagamento) appaiono solo se la condizione è soddisfatta.
4. All'ultima schermata (email) le risposte vengono normalizzate e finalizzate → stato `completed` + durata.
5. Persistenza: `submissionId` + `startTime` in `localStorage` per sopravvivere a refresh / HMR.

## ✅ Validazione Risposte (principi)
- Domande obbligatorie: non si avanza senza valore valido.
- Autocomplete città: solo valori presenti nel dataset.
- Opzione "Altro": placeholder interno `' '` convertito a stringa vuota prima del salvataggio finale.
- Ranking: ordine random iniziale se non già definito.

## 🌐 Internazionalizzazione
`LanguageContext` carica `/locales/{lang}.json`. Chiave mancante → warning console e fallback alla chiave stessa. Cambiare lingua non resetta le risposte.

## 🛠 Setup & Avvio
Prerequisiti: Node.js LTS.

```bash
npm install
npm run dev
```
Apri: http://localhost:5173/

## 🧪 Admin Dashboard
La pagina Admin (link nel top-left) recupera tutte le submissions e permette di visualizzare aggregazioni (es. distribuzione risposte). Estendere il parsing se aggiungi nuovi tipi di domanda.

## 🔐 Note di Sicurezza
La chiave anon Supabase è inclusa per prototipazione. Per produzione: spostare le chiavi in variabili d'ambiente e valutare API/backend intermedi per logiche sensibili (anti-spam, rate limiting, validazione server-side).

## 🧩 Aggiungere una Nuova Domanda
1. Aggiungi traduzioni in `locales/it.json` e `locales/en.json`.
2. Inserisci l'oggetto nella factory `getLocalizedQuestions` in `constants.ts` con `id` unico.
3. Se nuovo `QuestionType`, aggiorna enum in `types.ts`, rendering in `QuestionDisplay`, validazione in `SurveyPage`.
4. (Opzionale) Aggiungi condizione con `condition: (answers) => ...`.

## 🚀 Build Produzione (consigliato)
Puoi aggiungere lo script:
```json
"build": "vite build"
```
e poi eseguire:
```bash
npm run build
```
Output statico in `dist/` distribuibile su qualsiasi hosting statico.

## 📌 Convenzioni Importanti
- Non rimuovere il fallback di ricreazione submission in finalizzazione.
- Mantieni il placeholder `' '` per l'opzione Altro finché la normalizzazione lo gestisce.
- Evita fetch bloccanti per le traduzioni.

## 📄 Licenza
ISC (vedi `package.json`).

---
Per chiarimenti o modifiche, apri una issue o aggiorna questo README.
