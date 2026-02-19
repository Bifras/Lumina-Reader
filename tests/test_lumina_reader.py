# -*- coding: utf-8 -*-
"""
Test Playwright per Lumina Reader
Verifica funzionalità base dell'applicazione
"""

from playwright.sync_api import sync_playwright
import time
import sys

# Force UTF-8 encoding for Windows
if sys.platform == "win32":
    import io
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')

def test_lumina_reader():
    """Test della UI di Lumina Reader"""
    with sync_playwright() as p:
        # Launch browser in headed mode to see the test
        browser = p.chromium.launch(headless=False)
        page = browser.new_page()

        try:
            print("[START] Avvio test di Lumina Reader...")

            # Navigate to app
            print("[NAV] Navigando verso http://localhost:5173")
            page.goto('http://localhost:5173')

            # Wait for JS to execute - CRITICAL for dynamic apps
            print("[WAIT] Attendo caricamento pagina...")
            page.wait_for_load_state('networkidle')

            # Take initial screenshot
            print("[SHOT] Screenshot iniziale...")
            page.screenshot(path='test_screenshots/01_initial_load.png', full_page=True)

            # Check page title
            title = page.title()
            print(f"[INFO] Titolo pagina: {title}")
            assert "Lumina Reader" in title, f"Titolo non corretto: {title}"

            # Check for main elements
            print("[CHECK] Verifico elementi principali...")

            # Look for drag & drop area or book library
            try:
                # Check for any text indicating library or drag & drop
                page.wait_for_selector('body', timeout=5000)

                # Get page content
                content = page.content()

                # Look for key elements
                content_lower = content.lower()
                has_drag_drop = "trascina" in content_lower or "drag" in content_lower or "drop" in content_lower
                has_library = "libreria" in content_lower or "library" in content_lower or "book" in content_lower

                print(f"  [+] Drag & Drop area: {'Si' if has_drag_drop else 'Non trovato'}")
                print(f"  [+] Libreria: {'Si' if has_library else 'Non trovato'}")

                # Find all buttons
                buttons = page.locator('button').all()
                print(f"  [+] Bottoni trovati: {len(buttons)}")

                # Find all interactive elements
                clickable = page.locator('a, button, [role="button"]').all()
                print(f"  [+] Elementi cliccabili: {len(clickable)}")

                # List button texts
                if buttons:
                    print("\n  [LIST] Testi bottoni:")
                    for i, btn in enumerate(buttons[:10]):  # First 10 buttons
                        try:
                            text = btn.inner_text()
                            if text.strip():
                                print(f"    {i+1}. {text[:50]}")
                        except:
                            pass

                # Screenshot after inspection
                page.screenshot(path='test_screenshots/02_after_inspection.png')

            except Exception as e:
                print(f"[WARN] Errore durante ispezione DOM: {e}")

            # Test drag & drop interaction if present
            try:
                # Look for file input or drop zone
                file_input = page.locator('input[type="file"]').first
                if file_input.count() > 0:
                    print("[INFO] Input file trovato")

                    # Try to interact with it (we won't actually upload a file)
                    file_input.hover()
                    page.screenshot(path='test_screenshots/03_file_input_hover.png')

            except Exception as e:
                print(f"[INFO] Nessun input file trovato: {e}")

            # Get page text for analysis
            page_text = page.inner_text('body')
            print(f"\n[TEXT] Anteprima testo pagina (primi 500 caratteri):")
            print("=" * 60)
            print(page_text[:500])
            print("=" * 60)

            # Final screenshot
            print("\n[SHOT] Screenshot finale...")
            page.screenshot(path='test_screenshots/04_final_state.png', full_page=True)

            print("\n[SUCCESS] Test completato con successo!")
            print(f"[PATH] Screenshot salvati in: test_screenshots/")

        except Exception as e:
            print(f"\n[ERROR] Errore durante il test: {e}")
            # Screenshot on error
            page.screenshot(path='test_screenshots/error.png')
            raise

        finally:
            print("[CLOSE] Chiusura browser...")
            time.sleep(2)  # Keep browser open for 2 seconds to see result
            browser.close()

if __name__ == "__main__":
    import os
    os.makedirs("test_screenshots", exist_ok=True)
    test_lumina_reader()
