import { test, expect } from '@playwright/test'
import path from 'path'

test.describe('Debug White Flash', () => {
  test('should not show white flash on page turn', async ({ page }) => {
    // Log browser console
    page.on('console', msg => console.log(`BROWSER [${msg.type()}]: ${msg.text()}`))
    page.on('pageerror', err => console.log(`BROWSER ERROR: ${err.message}`))

    console.log('1. Navigating to library...')
    await page.goto('/')
    
    console.log('2. Uploading test book...')
    await page.setInputFiles('#lib-upload', path.join(process.cwd(), 'test.epub'))
    
    console.log('3. Waiting for book in library...')
    await page.waitForSelector('text=aggiunto', { timeout: 15000 })
    
    console.log('Looking for book card...')
    await expect(page.locator('.book-card').first()).toBeVisible({ timeout: 30000 })
    console.log('Book card found, clicking...')
    await page.getByRole('heading', { name: 'Test Book' }).first().click()
    await page.waitForTimeout(300)
    if (await page.locator('#viewer').count() === 0) {
      await page.locator('.book-card').last().click({ position: { x: 20, y: 20 } })
    }
    
    console.log('4. Waiting for viewer...')
    await page.locator('#viewer').waitFor({ timeout: 30000 })
    
    console.log('5. Switching to dark theme...')
    await page.getByTitle('Impostazioni').click()
    await expect(page.locator('.settings-panel')).toBeVisible()
    await page.getByTitle('Scuro').click()
    await page.locator('.settings-panel .settings-header button').click()
    await expect(page.locator('.settings-panel')).toBeHidden()
    
    await page.waitForTimeout(2000)
    await page.screenshot({ path: 'test_screenshots/01_dark_theme_ready.png' })
    
    console.log('6. Confirming reader is ready...')
    await expect(page.locator('#viewer')).toBeVisible()
    await page.screenshot({ path: 'test_screenshots/02_before_page_turn.png' })
    
    console.log('7. Turning page and capturing artifacts...')
    await page.keyboard.press('ArrowRight')
    
    // Capture more frames during transition
    for (let i = 0; i < 20; i++) {
      await page.waitForTimeout(16) // ~60fps
      await page.screenshot({ path: `test_screenshots/flash_detect_${i}.png` })
    }

    console.log('7. Final verification...')
    await page.waitForTimeout(1000)
    await page.screenshot({ path: 'test_screenshots/04_final_state.png' })
    
    // Inspect DOM for white boxes
    const whiteElements = await page.evaluate(() => {
      const all = document.querySelectorAll('*')
      const results = []
      all.forEach(el => {
        const style = window.getComputedStyle(el)
        if (style.backgroundColor === 'rgb(255, 255, 255)' || style.backgroundColor === 'white') {
          const rect = el.getBoundingClientRect()
          if (rect.width > 50 && rect.height > 50) {
            results.push({ tag: el.tagName, id: el.id, class: el.className })
          }
        }
      })
      return results
    })
    console.log('Main frame white elements:', whiteElements)
  })
})
