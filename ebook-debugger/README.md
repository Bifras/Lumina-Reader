# Electron App Debugger - OpenCode Skill

Skill completa per debuggare applicazioni Electron + React, specifica per Lumina Reader (ebook reader).

## Installazione

Copia il file skill nella cartella delle skills di OpenCode:

```bash
# Copia il file .skill nella tua cartella skills
# Tipica posizione: ~/.opencode/skill/ o .opencode/skill/
cp electron-app-debug.skill ~/.opencode/skill/
```

Oppure usa l'interfaccia di OpenCode per importare la skill.

## Contenuto della Skill

### 1. SKILL.md
Guida completa per debugging di app Electron + React, incluse:
- Console log capture
- IPC communication debugging
- State inspection
- LocalForage debugging
- epubjs debugging

### 2. References

**COMMON_ISSUES.md** - Problemi comuni in Electron + React:
- Memory leaks
- Race conditions
- IPC communication failures
- LocalForage/IndexedDB issues
- React rendering issues
- Electron protocol issues
- epubjs specific issues

**LUMINA_BUGS.md** - Bug documentati di Lumina Reader:
- Bug #1: Reset button destroys database (✅ FIXED)
- Bug #2: activeBook undefined (✅ FIXED)
- Bug #3: Memory leaks - event listeners (✅ FIXED)
- Bug #4: searchQuery undefined (✅ FIXED)
- Bug #5: Stale event listener references (✅ FIXED)
- Bug #6: Missing input validation (✅ FIXED)

### 3. Script di Test

**test_reset_bug.py** - Test automatico per Bug #1 (Reset):
- Verifica che il reset pulisce solo i libri
- Verifica che il database rimane intatto
- Verifica che puoi aggiungere libri dopo il reset
- Verifica che puoi leggere libri dopo il reset

**test_epub_loading.py** - Test automatico per Bug #2 e #3:
- Testa caricamento libri dalla libreria
- Verifica che activeBook è definito
- Testa che non ci sono memory leak
- Testa la stabilità con cambi rapidi tra libri

## Come Usare

### 1. Debugging Manuale

1. Apri l'app Electron (Lumina Reader)
2. Apri DevTools (F12)
3. Segui le guide in SKILL.md per il tipo di problema

### 2. Test Automatici

Esegui gli script di test per verificare i bug:

```bash
# Testa il bug del reset (Bug #1)
python skill/scripts/test_reset_bug.py

# Testa il caricamento EPUB (Bug #2 e #3)
python skill/scripts/test_epub_loading.py <path-to-epub>
```

### 3. Verifica Bug Specifici

Consulta LUMINA_BUGS.md per vedere:
- Quali bug sono stati trovati
- Qual è la causa radice
- Qual è la soluzione applicata
- Quali file sono stati modificati

## Bug Corretti

Tutti e 6 i bug documentati in questa skill sono stati corretti:

| Bug | Descrizione | Severità | Stato |
|------|-------------|------------|--------|
| #1 | Reset distrugge database | Critica | ✅ Fissato |
| #2 | activeBook undefined | Alta | ✅ Fissato |
| #3 | Memory leak - listener | Media | ✅ Fissato |
| #4 | searchQuery undefined | Media | ✅ Fissato |
| #5 | Stale references | Media | ✅ Fissato |
| #6 | Validazione input | Bassa | ✅ Fissato |

## Stato Build

**Versione:** Lumina Reader 1.0.9
**Build:** Completo (2026-01-18)
**Esito:** Tutti i bug corretti e testati

## Nota Importante

Tutti i bug sono stati corretti nel codice sorgente e il build di produzione è stato aggiornato. L'eseguibile `release/Lumina Reader 1.0.9.exe` contiene tutte le correzioni.

Per testare l'app con i bug fix, usa semplicemente l'eseguibile nella cartella `release/`.
