# Piano di Fix - Lumina Reader CSS/UX

## 📊 Overview
Analisi bug critici nel sistema di design identificati nel file `index.css`. Priorità basata su impatto utente e accessibilità.

---

## 🚨 P0 - Critici (Fix Immediato)

### 1. Font OpenDyslexic Mancante
**Problema**: OpenDyslexic non esiste nei Google Fonts → font fallback errato per utenti dislessici  
**Impatto**: Accessibilità rotta per target utente primario  
**Soluzione**:
- Rimuovere `OpenDyslexic` dall'`@import` Google Fonts
- Aggiungere `@font-face` locale o CDN alternativo (cdn.jsdelivr.net)
- Implementare font-switcher che carichi dinamicamente solo se richiesto

### 2. Assenza Focus Indicators
**Problema**: Nessuno stile `:focus-visible` per bottoni e controlli  
**Impatto**: Navigazione tastiera impossibile (WCAG 2.1 violation)  
**Soluzione**:
```css
*:focus-visible {
  outline: 2px solid var(--accent-warm);
  outline-offset: 2px;
  border-radius: 2px;
}
```

### 3. Variabili CSS Incomplete nei Temi
**Problema**: `[data-theme="sepia"]` e `[data-theme="dark"]` mancano di:
- `--bg-paper`, `--bg-ivory`, `--bg-warm`
- `--accent-warm`
**Impatto**: Fallback su valori light → colori incoerenti  
**Soluzione**: Mappare tutte le variabili per ogni tema o usare `inherit` strategico

---

## ⚠️ P1 - Funzionali (Fix entro Sprint)

### 4. Contrasto Insufficiente Tema Sepia
**Problema**: `--text-soft: #a89f91` su `#f4ecd8` = 2.5:1 (WCAG richiede 4.5:1)  
**Impatto**: Testo secondario illeggibile  
**Soluzione**: Cambiare in `#7a6b5a` (contrasto ~5.2:1)

### 5. Scrollbar Non Cross-Browser
**Problema**: Solo `-webkit-scrollbar` supportato  
**Impatto**: Firefox mostra scrollbar nativa invasiva  
**Soluzione**:
```css
body {
  scrollbar-width: thin;
  scrollbar-color: var(--border-subtle) transparent;
}
```

### 6. Body Overflow Hidden Pericoloso
**Problema**: `overflow: hidden` globale senza container scroll interno  
**Impatto**: Possibile troncamento contenuto se React non gestisce scroll  
**Soluzione**: Verificare che esista `.app-container { overflow-y: auto; height: 100vh; }`

---

## 🔧 P2 - Ottimizzazione (Fix Tecnico)

### 7. Performance Backdrop-Filter
**Problema**: `blur(20px) saturate(180%)` pesante per GPU su hardware economico  
**Impatto**: Lag animazioni Framer Motion  
**Soluzione**:
- Ridurre a `blur(12px) saturate(140%)`
- Aggiungere `@media (prefers-reduced-motion)` fallback
- Considerare `will-change: backdrop-filter` solo durante animazioni

### 8. Texture SVG Calcolata Runtime
**Problema**: `feTurbulence` SVG consuma GPU continuamente  
**Impatto**: Battery drain su laptop  
**Soluzione**:
- Esportare texture come PNG base64 statico
- Oppure applicare solo a `.glass-panel` specifici, non a `body::before`

### 9. Font Size Non Scalabile
**Problema**: `font-size: 17px` fisso ignora preferenze OS  
**Impatto**: Violazione accessibilità utenti ipovedenti  
**Soluzione**: Convertire in `font-size: 106.25%` (17px base 16px)

---

## ✅ Checklist Implementazione

### Fase 1: Accessibilità (Oggi)
- [ ] Fixare import font OpenDyslexic
- [ ] Aggiungere stili focus-visible globali
- [ ] Correggere contrasto Sepia (`--text-soft`)
- [ ] Testare navigazione tastiera (Tab, Enter, Esc)

### Fase 2: Consistenza (Questa settimana)
- [ ] Completare variabili mancanti nei temi Sepia/Dark
- [ ] Aggiungere supporto scrollbar Firefox
- [ ] Verificare container scroll interno
- [ ] Testare temi su tutti e 3 i colori

### Fase 3: Performance (Prossimo Sprint)
- [ ] Ottimizzare blur glassmorphism
- [ ] Convertire texture SVG in PNG statico
- [ ] Implementare `prefers-reduced-motion`
- [ ] Test performance su Electron con DevTools

---

## 🧪 Testing Post-Fix

1. **Accessibilità**: Usare axe DevTools o Lighthouse
2. **Contrasto**: Verificare tutte le combinazioni con WebAIM Contrast Checker
3. **Performance**: Profilare GPU usage in Electron durante cambio tema
4. **Cross-browser**: Testare scrollbar su Firefox, Chrome, Safari (macOS)
5. **Font**: Verificare caricamento Atkinson Hyperlegible e OpenDyslexic in Network tab

---

## 📁 File da Modificare
- `src/index.css` (fix principali)
- `src/components/ThemeProvider.jsx` (se esiste, per variabili mancanti)
- `index.html` (per preload font OpenDyslexic alternativo)
