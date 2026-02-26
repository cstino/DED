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

### Generatore NPC via AI

**Problema**: Come Master, creare una scheda NPC completa al volo durante la sessione richiede troppo tempo.

**Soluzione proposta**:
1. Preparare un **template JSON standard** che definisca la struttura esatta di un NPC (statistiche, abilità, equipaggiamento, personalità, ecc.)
2. Questo template funziona come un **prompt strutturato** da dare a un LLM (ChatGPT, Claude, ecc.)
3. Il Master fornisce solo alcuni dettagli chiave (es. "guardia goblin di livello 3, abile con l'arco, codarda")
4. L'AI restituisce un **file JSON completo** con la scheda NPC pronfill
5. Il file JSON viene **importato nell'app** e il personaggio viene generato automaticamente
6. Il formato JSON di output è **sempre identico** — garantendo compatibilità con l'app
7. **Ripetibile** per qualsiasi tipo di NPC durante tutta la campagna

Questo sistema permette al Master di generare NPC credibili e meccanicamente corretti in pochi secondi.

---

## 🔲 Da Discutere / Decidere

### Tecnico
- [ ] **Struttura completa dei file .prism** — analizzare tutti i file quando disponibili per mappare le categorie (classi, razze, sottoclassi, ecc.)
- [ ] **Schema database** — definire le tabelle Supabase per personaggi, campagne, sessioni, NPC
- [ ] **Struttura JSON standard per NPC** — definire il formato esatto per il generatore AI
- [ ] **Hosting e deploy** — dove ospitare l'app (Vercel, altro?)

### Funzionale
- [ ] **Edizione D&D** — 5e classica o 5e 2024 revised? (impatta la struttura delle classi)
- [ ] **Gestione multi-campagna** — un Master può avere più campagne attive?
- [ ] **Tracker iniziativa** — serve un tracker di combattimento condiviso in tempo reale?
- [ ] **Mappe** — integrazione mappe/luoghi navigabili o solo note testuali?
- [ ] **Chi vede cosa** — definire le regole di visibilità (es. il giocatore può vedere le schede degli altri PG?)
- [ ] **Accesso offline** — necessario o è sufficiente la connessione internet?
- [ ] **Mobile-first o desktop-first?** — priorità di design per l'interfaccia

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
