import { test, expect } from '@playwright/test'
import path from 'path'

test.describe('Iframe Content Theme Debug', () => {
  test('check iframe body background color during theme changes', async ({ page }) => {
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
    await page.waitForTimeout(2000)

    console.log('\n=== LIGHT THEME (default) ===')
    const lightTheme = await page.evaluate(() => {
      const iframe = document.querySelector('#viewer iframe')
      if (!iframe) return null

      const doc = iframe.contentDocument || iframe.contentWindow.document
      const body = doc.body

      return {
        dataTheme: document.body.getAttribute('data-theme'),
        outerBg: window.getComputedStyle(document.body).backgroundColor,
        iframeBg: window.getComputedStyle(iframe).backgroundColor,
        iframeBodyBg: window.getComputedStyle(body).backgroundColor,
        iframeHtmlBg: window.getComputedStyle(doc.documentElement).backgroundColor,
        injectedStyles: Array.from(doc.querySelectorAll('style[id]')).map(s => s.id)
      }
    })
    console.log(JSON.stringify(lightTheme, null, 2))

    console.log('\n=== SWITCHING TO DARK THEME ===')
    await page.getByTitle('Impostazioni').click()
    await page.getByTitle('Scuro').click()
    await page.keyboard.press('Escape')
    await page.waitForTimeout(1000)

    const darkTheme = await page.evaluate(() => {
      const iframe = document.querySelector('#viewer iframe')
      if (!iframe) return null

      const doc = iframe.contentDocument || iframe.contentWindow.document
      const body = doc.body

      return {
        dataTheme: document.body.getAttribute('data-theme'),
        outerBg: window.getComputedStyle(document.body).backgroundColor,
        iframeBg: window.getComputedStyle(iframe).backgroundColor,
        iframeBodyBg: window.getComputedStyle(body).backgroundColor,
        iframeHtmlBg: window.getComputedStyle(doc.documentElement).backgroundColor,
        injectedStyles: Array.from(doc.querySelectorAll('style[id]')).map(s => s.id)
      }
    })
    console.log(JSON.stringify(darkTheme, null, 2))

    // Take screenshot to visually confirm
    await page.screenshot({ path: 'test_screenshots/iframe_theme_mismatch.png' })

    console.log('\n=== TURNING PAGE (triggers re-render) ===')
    await page.keyboard.press('ArrowRight')
    await page.waitForTimeout(500)

    const afterPageTurn = await page.evaluate(() => {
      const iframe = document.querySelector('#viewer iframe')
      if (!iframe) return null

      const doc = iframe.contentDocument || iframe.contentWindow.document
      const body = doc.body

      return {
        dataTheme: document.body.getAttribute('data-theme'),
        outerBg: window.getComputedStyle(document.body).backgroundColor,
        iframeBg: window.getComputedStyle(iframe).backgroundColor,
        iframeBodyBg: window.getComputedStyle(body).backgroundColor,
        iframeHtmlBg: window.getComputedStyle(doc.documentElement).backgroundColor
      }
    })
    console.log(JSON.stringify(afterPageTurn, null, 2))

    // Check for any white background elements in iframe
    const whiteElements = await page.evaluate(() => {
      const iframe = document.querySelector('#viewer iframe')
      if (!iframe) return null

      const doc = iframe.contentDocument || iframe.contentWindow.document
      const results = []

      // Check specific elements that might have white backgrounds
      const selectors = ['h1', 'h2', 'h3', 'h4', 'h5', 'h6', '[class*="title"]', '[class*="chapter"]']
      selectors.forEach(sel => {
        doc.querySelectorAll(sel).forEach(el => {
          const style = iframe.contentWindow.getComputedStyle(el)
          if (style.backgroundColor === 'rgb(255, 255, 255)') {
            results.push({
              selector: sel,
              tag: el.tagName,
              class: el.className,
              backgroundColor: style.backgroundColor
            })
          }
        })
      })

      return results
    })
    console.log('White elements after page turn:', JSON.stringify(whiteElements, null, 2))
  })
})
