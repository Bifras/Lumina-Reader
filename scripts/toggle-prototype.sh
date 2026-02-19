#!/bin/bash
# 🔬 HERO PROTOTYPE TOGGLER
# Script per attivare/disattivare il prototipo della Hero Section

FILE="src/App.tsx"

echo "╔══════════════════════════════════════════════════════════════╗"
echo "║         🔬 Lumina Reader - Hero Prototype Toggle              ║"
echo "╚══════════════════════════════════════════════════════════════╝"
echo ""

# Check current status
CURRENT=$(grep "SHOW_HERO_PROTOTYPE = " "$FILE" | head -1)

if [[ $CURRENT == *"true"* ]]; then
    echo "📊 STATUS ATTUALE: ✅ PROTOTIPO ATTIVO"
    echo ""
    echo "Vuoi disattivare il prototipo e tornare alla versione normale?"
    echo ""
    read -p "Premi 'n' per disattivare, INVIO per uscire: " choice

    if [[ $choice == "n" ]] || [[ $choice == "N" ]]; then
        # Disable prototype
        sed -i 's/const SHOW_HERO_PROTOTYPE = true/const SHOW_HERO_PROTOTYPE = false/' "$FILE"
        echo ""
        echo "✅ PROTOTIPO DISATTIVATO"
        echo "   Ricarica http://localhost:5173 per vedere la versione normale"
    fi
else
    echo "📊 STATUS ATTUALE: ❌ PROTOTIPO DISATTIVATO"
    echo ""
    echo "Vuoi attivare il prototipo della nuova Hero Section?"
    echo ""
    read -p "Premi 'y' per attivare, INVIO per uscire: " choice

    if [[ $choice == "y" ]] || [[ $choice == "Y" ]]; then
        # Enable prototype
        sed -i 's/const SHOW_HERO_PROTOTYPE = false/const SHOW_HERO_PROTOTYPE = true/' "$FILE"
        echo ""
        echo "✅ PROTOTIPO ATTIVATO"
        echo "   Ricarica http://localhost:5173 per vedere il nuovo design"
    fi
fi

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "💁 TIP: Puoi anche modificare manualmente src/App.tsx"
echo "   Cerca: const SHOW_HERO_PROTOTYPE = true/false"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
