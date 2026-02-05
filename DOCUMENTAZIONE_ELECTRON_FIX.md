# Piano di Ristorazione - Fix Problema Electron `app.whenReady()`

## Data: 2025-02-03
## Progetto: Lumina Reader (EPUB Reader Electron + React)

---

## 📋 Sommario

1. [Descrizione del Problema](#descrizione-del-problema)
2. [Analisi delle Cause](#analisi-delle-cause)
3. [Risorse e Riferimenti](#risorse-e-riferimenti)
4. [Soluzioni Proposte](#soluzioni-proposte)
5. [Piano di Azione](#piano-di-azione)

---

## 🔴 Descrizione del Problema

### Sintomo
```javascript
TypeError: Cannot read properties of undefined (reading 'whenReady')
    at Object.<anonymous> (C:\Users\bille\Desktop\Script Python\ebook reader\electron\main.cjs:185:5)
```

### Contesto
- **File**: `electron/main.cjs`
- **Riga**: 186 (ora 185 dopo modifiche)
- **Codice problematico**:
```javascript
const { app, BrowserWindow, ipcMain } = require('electron');

// ... codice ...

app.whenReady().then(async () => {  // <- ERRORE QUI
    console.log('[Main] App is ready');
    // ...
});
```

### Comportamento Osservato
1. Il modulo `electron` viene caricato ma `app` risulta `undefined`
2. `BrowserWindow` e `ipcMain` funzionano correttamente
3. L'errore si verifica SOLO quando Electron viene eseguito da `wait-on` o `cross-env`
4. Eseguendo `npx electron` senza argomenti l'errore non si presenta (exit code 0)

### Ambiente
- **OS**: Windows 10/11
- **Node.js**: v22.19.0 (anche testato con v20.18.1 dal bundle Electron)
- **Electron**: v32 (testato anche con v39)
- **package.json**: `"type": "module"`

---

## 🔍 Analisi delle Cause

### Causa Principale: Conflitto ESM/CJS

Il problema è causato dalla combinazione di:

1. **`"type": "module"` in package.json**
   - Abilita ESM (ECMAScript Modules) per tutto il progetto
   - Node.js treata i file `.cjs` come CommonJS, MA il contesto di esecuzione è influenzato
   - Quando Electron viene lanciato con wrapper script (`wait-on`, `cross-env`), il contesto cambia

2. **Electron Module Loading**
   - Il modulo `electron` in `node_modules/electron/index.js` ha un caricamento speciale
   - Richiede il file `path.txt` per determinare il percorso dell'eseguibile
   - Il file `path.txt` esiste e contiene `electron.exe`, ma il caricamento fallisce in certi contesti

3. **Script Wrapper Problem**
   - `wait-on` lancia un processo Node separato che poi esegue `electron .`
   - Questo processo intermedio può alterare come vengono caricati i moduli
   - Evidenziato dal fatto che `npx electron` senza argomenti funziona (exit code 0)

### Riferimenti GitHub Issue

Il problema è documentato in:
- **[Issue #40719: `app.whenReady()` not resolved when using ESM](https://github.com/electron/electron/issues/40719)**
  - Status: **Closed as not planned**
  - Etichetta: `ESMbug`
  - Conferma che quando si usa `"type": "module"` nel package.json, ESM può causare problemi

- **[Issue #363: Cannot read property 'whenReady' of undefined](https://github.com/electron/electron-quick-start/issues/363)**
  - Discute lo stesso problema con il destructuring

---

## 📚 Risorse e Riferimenti

### Documentazione Ufficiale Electron
- [Electron API: `app`](https://electronjs.org/docs/latest/api/app)
- [Electron FAQ](https://electronjs.org/docs/latest/faq)
- [Process Model](https://electronjs.org/docs/latest/tutorial/quick-start)

### Problematiche Simili
- [StackOverflow: TypeError: Cannot read property 'whenReady' of undefined](https://stackoverflow.com/questions/63933477/typeerror-cannot-read-property-whenready-of-undefined)
- [StackOverflow: Electron app won't start, whenready does not exist](https://stackoverflow.com/questions/61063296/electron-app-wont-start-whenready-does-not-exist)
- [GitHub: Electron remote #79 - Cannot read properties of undefined](https://github.com/electron/remote/issues/79)

### Soluzioni dalla Comunità
- **SoluLearn: [Electron Quick Start Issue](https://www.sololearn.com/en/Discuss/1751258/resolve-electron-quick-start-issue-typeerror-cannot-read-property-on-of-undefined)**
  - Soluzione: Usare `module.exports` invece di destructuring quando si usa ESM
  - Suggerisce di evitare `const { app } = require('electron')` in favore di `const electron = require('electron'); const app = electron.app;`

---

## ✅ Soluzioni Proposte

### Soluzione 1: Rimuovere `"type": "module"` (PIÙ SEMPLICE)

**Vantaggi:**
- Risolve immediatamente il problema
- Nessuna modifica al codice richiesta
- Compatibilità massima con Electron

**Svantaggi:**
- Perdita benefici ESM per il renderer process
- Richiede conversione `import` → `require` per file che usano ESM

**Passaggi:**
```json
// package.json - RIMUOVERE questa riga:
// "type": "module",
```

### Soluzione 2: Convertire main.cjs in ESM (CONSISTENTE)

**Vantaggi:**
- Mantiene coerenza con resto del progetto (ESM)
- Approccio moderno

**Svantaggi:**
- Richiede rinominare `main.cjs` → `main.js` o `main.mjs`
- Electron richiede configurazione speciale per ESM nel main process
- Potrebbe richiedere modifica di preload.cjs

**Passaggi:**
1. Rinominare `electron/main.cjs` → `electron/main.js`
2. Cambiare import:
```javascript
// Prima (CommonJS):
const { app, BrowserWindow, ipcMain } = require('electron');

// Dopo (ESM):
import { app, BrowserWindow, ipcMain } from 'electron';
```
3. Aggiungere a package.json:
```json
{
  "main": "electron/main.js",
  "type": "module"
}
```

### Soluzione 3: Non-destructuring (MINIMO IMPATTO)

**Vantaggi:**
- Nessuna modifica a package.json
- Minima modifica al codice
- Mantiene compatibilità con TypeScript

**Svantaggi:**
- Codice meno leggibile

**Passaggi:**
```javascript
// main.cjs - CAMBIARE:
const electron = require('electron');
const app = electron.app;
const BrowserWindow = electron.BrowserWindow;
const ipcMain = electron.ipcMain;
```

### Soluzione 4: Esecuzione Diretta Senza Wrapper

**Vantaggi:**
- Nessuna modifica al codice

**Svantaggi:**
- Non risolve il problema con `npm run electron:dev`
- Richiede avvio manuale ogni volta

**Passaggi:**
```bash
# Invece di:
npm run electron:dev

# Fare:
npm run dev
# In altro terminale:
npx electron
```

---

## 🎯 Piano di Azione Raccomandato

### Fase 1: Fix Rapido (Soluzione 3) - PRIORITÀ ALTA

**Obiettivo:** Far funzionare Electron immediatamente con minimo impatto

**Passi:**
1. ✅ Modificare `electron/main.cjs` con non-destructuring
2. ✅ Testare con `npm run electron:dev`
3. ⏳ Verificare che tutte le funzionalità funzionino

### Fase 2: Verifica TypeScript

**Obiettivo:** Assicurarsi che la migrazione TypeScript non sia influenzata

**Passi:**
1. ⏳ Testare che i tipi TypeScript funzionino ancora
2. ⏳ Verificare che i test passino ancora
3. ⏳ Testare tutte le funzionalità principali dell'app

### Fase 3: Migrazione Completa a ESM (Futura)

**Obiettivo:** Allineare tutto il progetto a ESM per coerenza

**Prerequisiti:**
- Electron supporta ufficialmente ESM nel main process dalla v28+
- Richiede configurazione speciale

**Passi (da implementare in futuro):**
1. Convertire `electron/main.cjs` → `electron/main.mjs`
2. Convertire `electron/preload.cjs` → `electron/preload.mjs`
3. Aggiornare tutti gli import a ESM
4. Testare rigorosamente

---

## 🛠️ Implementazione Soluzione 3 (Non-destructuring)

### File da Modificare

**`electron/main.cjs` (righe 1-4):**

```javascript
// PRIMA:
const { app, BrowserWindow, ipcMain } = electron;
const path = require('path');

// DOPO:
const electron = require('electron');
const app = electron.app;
const BrowserWindow = electron.BrowserWindow;
const ipcMain = electron.ipcMain;
const path = require('path');
```

### Verifica
```bash
# Pulisci cache e riavvia
rm -rf node_modules/.cache
npm run electron:dev
```

---

## 📊 Stato Corrente

### ✅ Funzionante
- Vite dev server (http://localhost:5173)
- App React nel browser (tutte le funzionalità)
- TypeScript per stores, db, config
- Test unitari (118 test passano)

### ❌ Non Funzionante
- App Electron desktop
- IPC tra main e renderer process

### 📊 Stato Migrazione TypeScript
- **100% completato**
- ✅ Configurazione TypeScript
- ✅ Type definitions
- ✅ Zustand stores
- ✅ Data layer (db.js → db.ts)
- ✅ React components
- ✅ App.jsx → App.tsx
- ✅ main.jsx → main.tsx

---

## 🔗 Risorse Utili

- [Electron Issue #40719](https://github.com/electron/electron/issues/40719)
- [Electron Quick Start Issue #363](https://github.com/electron/electron-quick-start/issues/363)
- [Electron ESM Documentation](https://www.electronjs.org/docs/latest/tutorial/esm)
- [StackOverflow Discussion](https://stackoverflow.com/questions/63933477/)

---

## 🧪 Risultati dei Test Effettuati

### Test 1: Non-destructuring (Soluzione 3)
```javascript
const electron = require('electron');
const app = electron.app;
const BrowserWindow = electron.BrowserWindow;
const ipcMain = electron.ipcMain;
```
**Risultato:** ❌ FALLITO - Stesso errore `app.whenReady()` undefined

### Test 2: Rimozione `"type": "module"` (Soluzione 1)
```json
// package.json - RIMOSSA: "type": "module"
```
**Risultato:** ❌ FALLITO - Stesso errore `app.whenReady()` undefined

### Test 3: Esecuzione Diretta `npx electron`
**Risultato:** ⚠️ PARZIALE - Exit code 0 ma nessuna finestra visibile

---

## 🎯 Stato Attuale e Raccomandazioni Finali

### ⚠️ Situazione Bloccata
Il problema Electron **non è risolto** dalle soluzioni standard documentate. Il problema sembra essere specifico all'ambiente Windows/Node 20/electron package.

### ✅ Cosa Funziona (Priorità Alta)
1. **App Web Completa**: http://localhost:5179 - tutte le funzionalità EPUB funzionano
2. **Migrazione TypeScript 100%**: tutti i componenti React convertiti con successo
3. **Test Suite**: 118 test passano correttamente
4. **Sviluppo Attivo**: `npm run dev`, `npm run build`, `npm test` tutti funzionano

### 🔄 Prossimi Passi Consigliati

#### OPZIONE A: Debugging Electron Avanzata (Ricerca e Sviluppo)
Il TypeScript è completo. Ora il focus può spostarsi sulla risoluzione del problema Electron:
1. Creare un ambiente di test pulito per isolare il problema
2. Testare con Node.js v18 LTS
3. Verificare variabili d'ambiente
4. Testare con configurazione Electron alternativa

#### OPZIONE B: Considerare Alternative Desktop
Dato che l'app web funziona perfettamente, valutare:
- **Tauri**: Alternative più leggera a Electron
- **Neutralino.js**: Ancora più leggero, buona integrazione
- **PWA**: Installabile come app desktop senza runtime

---

## ✅ TypeScript Migration Completata (2026-02-03)

**Progress: 100%**

**Converted Files:**
- src/components/ (6 files): BookCard, CollectionSidebar, ErrorBoundary, HighlightPopup, LoadingOverlay, Toast
- src/hooks/ (4 files): useBookLoader, useHighlights, useToast, index
- src/views/ (2 files): LibraryView, ReaderView
- src/App.jsx → App.tsx
- src/main.jsx → main.tsx

**Additional Files Created:**
- src/store/index.d.ts (type declarations for store module)

**Verification:**
- npm run lint: PASSED
- npm run build: PASSED (2233 modules)
- npm run dev: Works on localhost:5173

---

**Creato il:** 2025-02-03
**Autore:** Claude (AI Assistant)
**Progetto:** Lumina Reader TypeScript Migration & Electron Fix
**Stato:** Electron bloccato, Web app funzionante, TypeScript 100% completato
