# 🏕️ Piano di Implementazione: Sezione Accampamento 3D

Questo documento delinea la strategia per implementare la nuova sezione **Accampamento**, dove i giocatori potranno visualizzare i propri personaggi come modelli 3D animati caricati tramite `meshy.ai`.

---

## 🎯 Obiettivo
Creare una sezione dedicata all'interno della campagna che permetta di visualizzare i modelli 3D dei personaggi in un ambiente minimale e fluido, con supporto allo swipe per navigare tra i membri del party.

---

## 🛠️ Stack Tecnologico
Sfrutteremo le librerie già presenti nel progetto:
- **Three.js**: Il motore 3D sottostante.
- **React Three Fiber (R3F)**: Il bridge per usare Three.js come componenti React.
- **React Three Drei**: Utility helper per caricamento modelli, luci e controlli camera.
- **Framer Motion**: Per le transizioni fluide dell'interfaccia.

---

## 📊 Stato Attuale e Checkpoint
- [x] **Setup Branch**: Creato branch dedicato `feature-3d-camp`.
- [x] **Pianificazione**: Documento di implementazione redatto e condiviso.
- [x] **Gestione Asset**: Caricati modelli `.glb` (Warforged) con set completo di animazioni in `public/model/warforged`.
- [ ] **Database**: Da eseguire comando SQL per colonna `model_3d_url`.
- [x] **Frontend**: Creato componente `ModelViewer` e pagina di test `/campaign/[id]/3d-test`.

---

## 🚀 Azioni Compiute
1. Creato branch `feature-3d-camp` per isolare lo sviluppo 3D.
2. Predisposta cartella `app/public/model/warforged` per ospitare gli asset.
3. Caricato set di 8 animazioni (Walking, Running, Boxing, Crouch, etc.) in formato `.glb`.
4. Implementato componente `ModelViewer.tsx` con supporto a `useAnimations`.
5. Creata pagina di test `3d-test/page.tsx` con selettore di animazioni UI.
6. Affinata la posizione del modello e bloccato lo zoom nel viewer per una visualizzazione più stabile.
7. Ridotta leggermente la scala del modello (da 2.0 a 1.75) per un miglior fit sugli schermi mobile.

---

## 📋 Roadmap di Lavoro

### Fase 1: Aggiornamento Database (Supabase)
Dobbiamo aggiungere un campo per salvare il link al modello 3D generato.
- **Azione**: Aggiungere la colonna `model_3d_url` (tipo `TEXT`) alla tabella `characters`.
- **Comando SQL**:
  ```sql
  ALTER TABLE characters ADD COLUMN model_3d_url TEXT;
  ```

### Fase 2: Gestione Asset (Meshy.ai)
I modelli dovranno essere esportati in formato **.GLB** (il formato standard per il web, che include mesh, texture e animazioni in un unico file).
- **Consiglio**: Usare modelli a bassa densità poligonale (Low Poly) o ottimizzati per mantenere l'app veloce.

### Fase 3: Architettura Frontend
1. **Componente `Camp3D`**: Un nuovo modulo che ospiterà il `Canvas` di Three.js.
2. **Componente `ModelViewer`**: Gestirà il caricamento del file `.glb` usando `useGLTF`.
3. **Navigazione**: Sistema di swipe (simile alla galleria portrait) per cambiare il personaggio visualizzato nel Canvas.

### Fase 4: Esperienza Utente (UX)
- **Sfondo**: Un gradiente scuro o un effetto "Nebbia" per dare profondità senza appesantire il rendering.
- **Illuminazione**: Una "Environment Light" per riflessi realistici e una "Spotlight" per dare risalto ai dettagli del personaggio.
- **Animazioni**: Se il modello di Meshy include animazioni (IDLE), le attiveremo automaticamente usando `useAnimations`.

---

## 🚦 Note Tecniche Importanti

### 1. Ottimizzazione delle Performance
Per evitare rallentamenti:
- **Suspense**: Useremo React Suspense per mostrare uno spinner mentre il modello 3D viene scaricato.
- **Draco Compression**: Se i file sono troppo grandi, implementeremo la compressione Draco (già supportata da R3F).

### 2. Mobile VS Desktop
- **Controlli**: Su Mobile lo swipe navigherà tra i personaggi, mentre il touch singolo ruoterà il modello.
- **Qualità**: Potremmo implementare un controllo per ridurre la qualità delle ombre sui dispositivi meno potenti.

---

## ⏭️ Prossimi Passi
1. **Eseguire il comando SQL** su Supabase per aggiungere la colonna `model_3d_url`.
2. **Setup Canvas**: Creare una pagina di test (`/campaign/[id]/3d-test`) per renderizzare il primo modello animato.
3. **Integrazione**: Implementare la navigazione tra i personaggi nella scena 3D.

---
> [!TIP]
> Per ottenere il massimo da Meshy.ai, assicurati di generare modelli con l'animazione "Idle" inclusa, così il personaggio non sembrerà una statua di plastica ma sarà "vivo" nell'accampamento.
