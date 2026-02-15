import { test, expect } from '@playwright/test'
import path from 'path'

test.describe('Overlay Debug - Root Cause Analysis', () => {
  test('analyze overlay and iframe interaction during page turn', async ({ page }) => {
    console.log('1. Navigate and load book...')
    await page.goto('/')

    await page.setInputFiles('#lib-upload', path.join(process.cwd(), 'test.epub'))
    await page.waitForSelector('text=aggiunto', { timeout: 15000 })

    await expect(page.locator('.book-card').first()).toBeVisible({ timeout: 30000 })
    await page.getByRole('heading', { name: 'Test Book' }).first().click()
    await page.waitForTimeout(300)
    if (await page.locator('#viewer').count() === 0) {
      await page.locator('.book-card').last().click({ position: { x: 20, y: 20 } })
    }
    await page.locator('#viewer').waitFor({ timeout: 30000 })

    // Use dark theme for better visibility
    await page.getByTitle('Impostazioni').click()
    await page.getByTitle('Scuro').click()
    await page.keyboard.press('Escape')
    await page.waitForTimeout(2000)

    console.log('\n=== ANALYZING OVERLAY MECHANISM ===')

    // 1. Check for the overlay div before page turn
    const overlayBefore = await page.evaluate(() => {
      const viewerWrapper = document.querySelector('#viewer')?.parentElement
      if (!viewerWrapper) return null

      const children = Array.from(viewerWrapper.children)
      return children.map(child => ({
        tag: child.tagName,
        id: child.id,
        class: child.className,
        style: child.getAttribute('style'),
        computed: {
          position: window.getComputedStyle(child).position,
          zIndex: window.getComputedStyle(child).zIndex,
          opacity: window.getComputedStyle(child).opacity,
          backgroundColor: window.getComputedStyle(child).backgroundColor,
          pointerEvents: window.getComputedStyle(child).pointerEvents
        }
      }))
    })

    console.log('Viewer wrapper children BEFORE:', JSON.stringify(overlayBefore, null, 2))

    // 2. Check the isPageTransitioning state
    const transitioningBefore = await page.evaluate(() => {
      // Look for the overlay based on its inline style pattern
      const overlays = Array.from(document.querySelectorAll('div')).filter(div => {
        const style = div.getAttribute('style')
        return style && style.includes('position: absolute') && style.includes('opacity:')
      })

      return overlays.map(o => ({
        id: o.id,
        class: o.className,
        style: o.getAttribute('style'),
        opacity: window.getComputedStyle(o).opacity
      }))
    })

    console.log('Transition overlays BEFORE:', JSON.stringify(transitioningBefore, null, 2))

    // 3. Check iframe state before
    const iframeBefore = await page.evaluate(() => {
      const iframe = document.querySelector('#viewer iframe')
      if (!iframe) return null

      return {
        id: iframe.id,
        src: iframe.src,
        computedStyle: {
          backgroundColor: window.getComputedStyle(iframe).backgroundColor,
          opacity: window.getComputedStyle(iframe).opacity,
          display: window.getComputedStyle(iframe).display
        }
      }
    })

    console.log('Iframe BEFORE:', JSON.stringify(iframeBefore, null, 2))

    // 4. Now check what's INSIDE the iframe
    const iframeContentBefore = await page.evaluate(() => {
      const iframe = document.querySelector('#viewer iframe')
      if (!iframe) return null

      try {
        const doc = iframe.contentDocument || iframe.contentWindow.document
        const body = doc.body

        // Check for white background on body
        const bodyStyle = window.getComputedStyle(body)

        // Check all elements for white backgrounds
        const whiteElements = []
        const all = doc.querySelectorAll('*')
        for (const el of all) {
          const style = iframe.contentWindow.getComputedStyle(el)
          if (style.backgroundColor === 'rgb(255, 255, 255)' || style.backgroundColor === '#ffffff' || style.backgroundColor === 'white') {
            const rect = el.getBoundingClientRect()
            if (rect.width > 20 && rect.height > 20) {
              whiteElements.push({
                tag: el.tagName,
                class: el.className,
                id: el.id,
                backgroundColor: style.backgroundColor,
                position: style.position,
                zIndex: style.zIndex,
                size: { width: rect.width, height: rect.height }
              })
            }
          }
        }

        return {
          bodyBackgroundColor: bodyStyle.backgroundColor,
          whiteElementCount: whiteElements.length,
          whiteElements: whiteElements.slice(0, 5)
        }
      } catch (e) {
        return { error: e.message }
      }
    })

    console.log('Iframe content BEFORE:', JSON.stringify(iframeContentBefore, null, 2))

    // Screenshot before
    await page.screenshot({ path: 'test_screenshots/overlay_before.png' })

    console.log('\n=== TRIGGERING PAGE TURN ===')

    // Turn page
    await page.keyboard.press('ArrowRight')

    // IMMEDIATELY check state during transition
    console.log('\n=== DURING TRANSITION (immediate) ===')

    const duringImmediate = await page.evaluate(() => {
      const viewerWrapper = document.querySelector('#viewer')?.parentElement

      // Find all absolute positioned elements
      const absoluteElements = []
      document.querySelectorAll('*').forEach(el => {
        const style = window.getComputedStyle(el)
        if (style.position === 'absolute') {
          absoluteElements.push({
            tag: el.tagName,
            id: el.id,
            class: el.className,
            opacity: style.opacity,
            backgroundColor: style.backgroundColor,
            zIndex: style.zIndex
          })
        }
      })

      return {
        absoluteCount: absoluteElements.length,
        absoluteElements: absoluteElements.slice(0, 10)
      }
    })

    console.log('During transition IMMEDIATE:', JSON.stringify(duringImmediate, null, 2))

    await page.waitForTimeout(100)

    const during100ms = await page.evaluate(() => {
      const overlays = Array.from(document.querySelectorAll('div')).filter(div => {
        const style = window.getComputedStyle(div)
        return style.position === 'absolute' && parseFloat(style.opacity) > 0
      })

      return overlays.map(o => ({
        id: o.id,
        class: o.className,
        opacity: window.getComputedStyle(o).opacity,
        backgroundColor: window.getComputedStyle(o).backgroundColor,
        zIndex: window.getComputedStyle(o).zIndex
      }))
    })

    console.log('During transition 100ms:', JSON.stringify(during100ms, null, 2))

    await page.screenshot({ path: 'test_screenshots/overlay_during.png' })

    // Wait for completion
    await page.waitForTimeout(500)

    console.log('\n=== AFTER TRANSITION ===')

    const afterState = await page.evaluate(() => {
      const iframe = document.querySelector('#viewer iframe')

      return {
        iframe: iframe ? {
          backgroundColor: window.getComputedStyle(iframe).backgroundColor
        } : null
      }
    })

    console.log('After state:', JSON.stringify(afterState, null, 2))

    await page.screenshot({ path: 'test_screenshots/overlay_after.png' })
  })
})
