import { test, expect } from '@playwright/test'
import path from 'path'

test.describe('Deep Inspection - White Box Analysis', () => {
  test('deep inspect DOM and styles during page transition', async ({ page }) => {
    // Log browser console
    page.on('console', msg => console.log(`BROWSER [${msg.type()}]: ${msg.text()}`))
    page.on('pageerror', err => console.log(`BROWSER ERROR: ${err.message}`))

    console.log('1. Navigating to library...')
    await page.goto('/')

    console.log('2. Uploading test book...')
    await page.setInputFiles('#lib-upload', path.join(process.cwd(), 'test.epub'))

    console.log('3. Waiting for book in library...')
    await page.waitForSelector('text=aggiunto', { timeout: 15000 })

    console.log('4. Opening book...')
    await expect(page.locator('.book-card').first()).toBeVisible({ timeout: 30000 })
    await page.getByRole('heading', { name: 'Test Book' }).first().click()
    await page.waitForTimeout(300)
    if (await page.locator('#viewer').count() === 0) {
      await page.locator('.book-card').last().click({ position: { x: 20, y: 20 } })
    }

    console.log('5. Waiting for viewer...')
    await page.locator('#viewer').waitFor({ timeout: 30000 })

    console.log('6. Switching to dark theme for better visibility...')
    await page.getByTitle('Impostazioni').click()
    await page.getByTitle('Scuro').click()
    await page.keyboard.press('Escape')
    await page.waitForTimeout(2000)

    // === INSPECTION 1: Before page turn ===
    console.log('\n=== BEFORE PAGE TURN ===')
    const beforeState = await page.evaluate(() => {
      const viewer = document.getElementById('viewer')
      const iframe = viewer?.querySelector('iframe')

      const result = {
        viewer: {
          exists: !!viewer,
          styles: viewer ? window.getComputedStyle(viewer) : null
        },
        iframe: {
          exists: !!iframe,
          id: iframe?.id,
          styles: iframe ? window.getComputedStyle(iframe) : null
        },
        overlays: []
      }

      // Find all overlays
      document.querySelectorAll('*').forEach(el => {
        const style = window.getComputedStyle(el)
        if (style.position === 'absolute' || style.position === 'fixed') {
          if (parseFloat(style.zIndex) > 0 || style.opacity !== '1') {
            result.overlays.push({
              tag: el.tagName,
              id: el.id,
              class: el.className,
              position: style.position,
              zIndex: style.zIndex,
              opacity: style.opacity,
              backgroundColor: style.backgroundColor,
              width: style.width,
              height: style.height
            })
          }
        }
      })

      return result
    })

    console.log('Before state:', JSON.stringify(beforeState, null, 2))

    // === INSPECTION 2: Iframe content before ===
    const iframeContentBefore = await page.evaluate(() => {
      const iframe = document.querySelector('#viewer iframe')
      if (!iframe) return { error: 'No iframe found' }

      try {
        const doc = iframe.contentDocument || iframe.contentWindow.document
        if (!doc) return { error: 'Cannot access iframe document' }

        const body = doc.body
        const html = doc.documentElement

        return {
          bodyBg: body ? window.getComputedStyle(body).backgroundColor : null,
          htmlBg: html ? window.getComputedStyle(html).backgroundColor : null,
          bodyInlineBg: body?.style?.backgroundColor,
          htmlInlineBg: html?.style?.backgroundColor,
          hasInjectedStyles: !!doc.getElementById('lumina-critical-styles'),
          hasFontOverride: !!doc.getElementById('lumina-font-override')
        }
      } catch (e) {
        return { error: e.message }
      }
    })

    console.log('Iframe content before:', JSON.stringify(iframeContentBefore, null, 2))

    // === INSPECTION 3: Find elements with white backgrounds ===
    const whiteElementsBefore = await page.evaluate(() => {
      const iframe = document.querySelector('#viewer iframe')
      if (!iframe) return { error: 'No iframe found' }

      try {
        const doc = iframe.contentDocument || iframe.contentWindow.document
        const results = []

        doc.querySelectorAll('*').forEach(el => {
          const style = iframe.contentWindow.getComputedStyle(el)
          if (style.backgroundColor === 'rgb(255, 255, 255)' || style.backgroundColor === 'white') {
            const rect = el.getBoundingClientRect()
            results.push({
              tag: el.tagName,
              id: el.id,
              class: el.className,
              backgroundColor: style.backgroundColor,
              position: style.position,
              zIndex: style.zIndex,
              rect: { width: rect.width, height: rect.height, top: rect.top, left: rect.left },
              textPreview: el.textContent?.substring(0, 30)
            })
          }
        })

        return { count: results.length, elements: results.slice(0, 10) }
      } catch (e) {
        return { error: e.message }
      }
    })

    console.log('White elements before turn:', JSON.stringify(whiteElementsBefore, null, 2))

    // === TAKE SCREENSHOT ===
    await page.screenshot({ path: 'test_screenshots/deep_before.png', fullPage: false })

    // === SETUP LISTENERS FOR TRANSITION ===
    await page.evaluate(() => {
      window.transitionEvents = []

      // Listen for all custom events
      const eventTypes = ['rendering', 'rendered', 'relocated', 'displayed', 'loaded']
      eventTypes.forEach(type => {
        document.addEventListener(type, (e) => {
          window.transitionEvents.push({ type, timestamp: Date.now() })
        })
      })
    })

    // === TURN PAGE ===
    console.log('\n=== TURNING PAGE ===')
    await page.keyboard.press('ArrowRight')

    // Capture immediately after click (during transition)
    await page.waitForTimeout(50)
    await page.screenshot({ path: 'test_screenshots/deep_during_50ms.png', fullPage: false })

    const duringState = await page.evaluate(() => {
      const viewer = document.getElementById('viewer')
      const iframe = viewer?.querySelector('iframe')

      return {
        iframeOpacity: iframe ? window.getComputedStyle(iframe).opacity : null,
        iframeBg: iframe ? window.getComputedStyle(iframe).backgroundColor : null,
        overlays: Array.from(document.querySelectorAll('*')).filter(el => {
          const style = window.getComputedStyle(el)
          return style.position === 'absolute' && parseFloat(style.opacity) > 0.5
        }).map(el => ({
          tag: el.tagName,
          id: el.id,
          class: el.className,
          opacity: window.getComputedStyle(el).opacity,
          backgroundColor: window.getComputedStyle(el).backgroundColor
        }))
      }
    })

    console.log('During transition (50ms):', JSON.stringify(duringState, null, 2))

    // Wait more and capture again
    await page.waitForTimeout(100)
    await page.screenshot({ path: 'test_screenshots/deep_during_150ms.png', fullPage: false })

    // Wait for transition to complete
    await page.waitForTimeout(500)
    await page.screenshot({ path: 'test_screenshots/deep_after.png', fullPage: false })

    // === INSPECTION 4: After page turn ===
    console.log('\n=== AFTER PAGE TURN ===')
    const transitionEvents = await page.evaluate(() => window.transitionEvents || [])
    console.log('Transition events:', transitionEvents)

    const afterState = await page.evaluate(() => {
      const viewer = document.getElementById('viewer')
      const iframe = viewer?.querySelector('iframe')

      return {
        iframeBg: iframe ? window.getComputedStyle(iframe).backgroundColor : null,
        iframeOpacity: iframe ? window.getComputedStyle(iframe).opacity : null
      }
    })

    console.log('After state:', JSON.stringify(afterState, null, 2))

    // === CHECK FOR WHITE BOXES IN IFRAME ===
    const whiteElementsAfter = await page.evaluate(() => {
      const iframe = document.querySelector('#viewer iframe')
      if (!iframe) return { error: 'No iframe found' }

      try {
        const doc = iframe.contentDocument || iframe.contentWindow.document
        const results = []

        doc.querySelectorAll('*').forEach(el => {
          const style = iframe.contentWindow.getComputedStyle(el)
          if (style.backgroundColor === 'rgb(255, 255, 255)' || style.backgroundColor === 'white') {
            const rect = el.getBoundingClientRect()
            results.push({
              tag: el.tagName,
              id: el.id,
              class: el.className,
              backgroundColor: style.backgroundColor,
              zIndex: style.zIndex,
              rect: { width: rect.width, height: rect.height },
              textPreview: el.textContent?.substring(0, 30)
            })
          }
        })

        return { count: results.length, elements: results.slice(0, 10) }
      } catch (e) {
        return { error: e.message }
      }
    })

    console.log('White elements after turn:', JSON.stringify(whiteElementsAfter, null, 2))

    // === CHECK CSS VARIABLES ===
    const cssVars = await page.evaluate(() => {
      const root = document.documentElement
      return {
        bgCream: getComputedStyle(root).getPropertyValue('--bg-cream'),
        bgPaper: getComputedStyle(root).getPropertyValue('--bg-paper'),
        theme: root.getAttribute('data-theme')
      }
    })

    console.log('CSS Variables:', cssVars)
  })
})
