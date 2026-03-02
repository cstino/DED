# 🎲 D&D Campaign Manager — Pianificazione Progetto

## Panoramica

App gestionale per campagne D&D in presenza. Pensata principalmente per il **Dungeon Master**, ma utilizzabile anche dai **giocatori** per la gestione delle schede personaggio.

> **Non è un simulatore di sessioni online** — è un compendio da usare durante le sessioni in presenza.

---

## ✅ Decisioni Prese

### Funzionalità Core

#### Lato Giocatore
- **Creazione scheda personaggio intelligente** — il sistema guida il giocatore passo-passo
- Scelta razza → tratti razziali applicati automaticamente
- Scelta classe → competenze e abilità Lv.1 auto-assegnate
- Scelta incantesimi → filtro per classe + livello, con scheda completa (scuola, gittata, componenti, durata, descrizione)
- **Level Up automatizzato** — l'app sa cosa sblocca ogni classe a ciascun livello e propone le scelte
- **Gestione dinamica** — aggiornamento HP, spell slot, inventario, livello, esperienza
- **Niente simulazione dadi** — l'app è un compendio per sessioni in presenza

#### Lato Master
- **Dashboard campagna** — visione d'insieme su PG, sessioni, quest
- **Accesso al materiale di campagna** — tutto il contenuto creato (es. Sharn, dungeon, PNG) consultabile dall'app
- **Gestione NPC e mostri**
- **Note di sessione e timeline campagna**
- **Condivisione selettiva** — il Master decide cosa è visibile ai giocatori

#### Database D&D Completo
- Incantesimi con tutti i dettagli (livello, scuola, casting time, range, componenti, durata, descrizione, scaling per slot)
- Classi con abilità per livello
- Razze con tratti razziali
- Background con skills, feature, equipaggiamento
- Talenti (Feats) con effetti meccanici
- Oggetti e equipaggiamento

### Stack Tecnologico
- **Frontend**: Next.js (web app)
- **Backend/DB**: Supabase (PostgreSQL + Auth + Realtime)
- **Auth**: Supabase Auth (ruoli Master / Giocatore)
- **Realtime**: Supabase Realtime per sincronizzazione live
- **RLS**: Row Level Security per controllo visibilità contenuti

### Lingua
- **Interfaccia app (UI)**: Italiano 🇮🇹
- **Contenuto D&D** (incantesimi, classi, razze, abilità): Inglese 🇬🇧 (dati originali dai manuali)
- **Materiale campagna** (note, PNG, location): Italiano 🇮🇹 (scritto dal Master)
- **Motivazione**: le traduzioni automatiche non corrispondono alla terminologia ufficiale italiana di Asmodee. Meglio mantenere l'originale inglese per accuratezza.

### Fonte Dati
- **File `.prism`** dall'app Prism — file JSON contenenti tutto il materiale dei manuali D&D
- File già disponibile: `prism/playersHandbook.prism` (~443KB)
- Struttura JSON perfettamente parsabile con: backgrounds, feats, spells, (razze, classi da verificare)
- **Altri file .prism** verranno aggiunti (Xanathar's, Tasha's, Monster Manual, ecc.)

---

## 💡 Idee da Sviluppare

### Generatore NPC Procedurale

**Problema**: Come Master, creare una scheda NPC completa al volo durante la sessione richiede troppo tempo. L'Intelligenza Artificiale generativa "pura" è soggetta ad allucinazioni matematiche e rallenta l'esperienza.

**Soluzione proposta**:
Un generatore **algoritmico/procedurale** integrato nell'app. 
- Il Master seleziona parametri base (Razza, Livello di Sfida, Ruolo).
- L'app applica template matematicamente corretti per statistiche, Punti Ferita e Classe Armatura.
- Tratti caratteriali, nomi e difetti vengono estratti casualmente da tabelle o file `.prism`.
- Risultato istantaneo, a costo zero e perfetto per il bilanciamento di D&D 5e.

### AI DM Assistant (Stile NotebookLM / RAG)

**Problema**: Durante la sessione, il Master ha bisogno di recuperare regole dal Player's Handbook, lore di Eberron o dettagli dalla propria campagna scritta in PDF/Markdown. Cercare a mano spezza il ritmo.

**Soluzione proposta**:
Integrare un assistente basato su **RAG (Retrieval-Augmented Generation)** all'interno della Dashboard.
1. **Indicizzazione**: Carichiamo i PDF dei manuali e i markdown della campagna. Il testo viene diviso in frammenti e convertito in *vettori* (Embeddings).
2. **Database Vettoriale**: Usiamo l'estensione `pgvector` di Supabase (disponibile gratuitamente) per salvare questi vettori.
3. **Chat Assistant**: Il Master fa una domanda (es. *"Qual è la regola sulla lotta?"* o *"Chi gestisce la gilda dei ladri a Sharn?"*).
4. **Recupero e Risposta**: L'app cerca nel database vettoriale i paragrafi rilevanti dai manuali/appunti e li passa a un LLM (come OpenAI GPT-4o-mini). L'LLM formula una risposta precisa **citando la fonte esatta**.
- *Nota sui costi*: Richiede una chiave API di OpenAI (o simili) fornita dal Master nel file `.env.local`. I costi per uso personale sono irrisori (centesimi al mese).
---

## ✅ Decisioni Funzionali

| Domanda | Decisione |
|---|---|
| **Edizione D&D** | 5e classica |
| **Multi-campagna** | Sì, un Master può avere più campagne attive |
| **Tracker iniziativa** | Sì, tracker di combattimento condiviso in tempo reale |
| **Mappe** | No — solo note testuali, niente mappe per non complicare |
| **Visibilità schede** | Ogni giocatore vede la propria scheda + quelle degli altri PG |
| **Accesso offline** | No — connessione internet richiesta |
| **Design responsivo** | Mobile-first per i giocatori, desktop-first per il Master |

### Hosting e Deploy — Tutto Gratuito 🆓
- **Frontend**: [Vercel](https://vercel.com) — free tier (perfetto per Next.js, deploy automatico da GitHub)
- **Backend/DB**: [Supabase](https://supabase.com) — free tier (500MB DB, 1GB storage, 50k MAU)
- **Costo totale**: €0 — entrambi i servizi offrono tier gratuiti più che sufficienti per un progetto non commerciale

---

## 🔲 Da Discutere / Decidere

### Tecnico
- [ ] **Struttura completa dei file .prism** — analizzare tutti i file quando disponibili per mappare le categorie (classi, razze, sottoclassi, ecc.)
- [ ] **Schema database** — definire le tabelle Supabase per personaggi, campagne, sessioni, NPC
- [ ] **Struttura JSON standard per NPC** — definire il formato esatto per il generatore AI

### Priorità / Fasi
- [ ] **Definire l'MVP** — quali feature nella prima versione?
- [ ] **Roadmap fasi successive** — cosa viene dopo l'MVP?

---

## 📁 Struttura Progetto Attuale

```
DED/
├── dnd-campaign/          # Materiale campagna esistente
│   ├── sharn/             # Contenuto su Sharn (location, dungeon, mostri)
│   └── materiale-sorgente/
├── prism/                 # File dati D&D da app Prism
│   └── playersHandbook.prism   # Player's Handbook completo (JSON)
└── PLANNING.md            # Questo documento
```

---

## 📝 Note

- Il progetto nasce dalla necessità di avere un tool pratico durante le sessioni in presenza
- La priorità è l'**utilità pratica** per il Master, non l'estetica fine a sé stessa
- I file .prism sono una risorsa fondamentale che semplifica enormemente lo sviluppo
- Il generatore NPC via AI è un differenziatore chiave rispetto ad app simili
