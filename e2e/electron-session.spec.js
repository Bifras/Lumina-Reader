import { test, expect, _electron as electron } from '@playwright/test'
import path from 'path'
import fs from 'fs'

test.describe('Electron Session (Complete UI Walkthrough)', () => {
  test.setTimeout(180000)

  test('should complete the core library and reader flow', async () => {
    const epubPath = path.join(process.cwd(), 'test.epub')
    expect(fs.existsSync(epubPath)).toBeTruthy()

    const nodeEnv = process.env.LUMINA_E2E_MODE === 'dev' ? 'development' : 'production'
    const electronEnv = { ...process.env, NODE_ENV: nodeEnv }
    delete electronEnv.ELECTRON_RUN_AS_NODE

    const electronApp = await electron.launch({
      args: ['.'],
      env: electronEnv
    })

    try {
      const waitForAppWindow = async () => {
        const startedAt = Date.now()
        while (Date.now() - startedAt < 30000) {
          const appWindow = electronApp.windows().find(w => !w.url().startsWith('devtools://'))
          if (appWindow) return appWindow
          await new Promise((resolve) => setTimeout(resolve, 250))
        }
        throw new Error('Could not find non-devtools Electron window')
      }

      const page = await waitForAppWindow()

      const ensureToolbarVisible = async () => {
        await page.mouse.move(80, 80)
        await page.waitForTimeout(120)
      }

      page.on('console', (msg) => {
        console.log(`[ELECTRON:${msg.type()}] ${msg.text()}`)
      })
      page.on('pageerror', (error) => {
        console.log(`[ELECTRON:pageerror] ${error.message}`)
      })

      await page.bringToFront()
      await page.waitForLoadState('domcontentloaded')
      if (await page.locator('#viewer').count() > 0) {
        await ensureToolbarVisible()
        await page.getByTitle('Torna alla Libreria').click()
      }
      await expect(page.locator('#lib-upload')).toBeAttached({ timeout: 60000 })
      await page.getByText('Libreria').first().waitFor({ timeout: 60000 })

      await page.setInputFiles('#lib-upload', epubPath)
      await expect(page.locator('.book-card').first()).toBeVisible({ timeout: 30000 })

      await page.getByRole('heading', { name: 'Test Book' }).first().click()
      if (await page.locator('#viewer').count() === 0) {
        await page.locator('.book-card').last().click({ position: { x: 20, y: 20 } })
      }
      await expect(page.locator('#viewer')).toBeVisible({ timeout: 30000 })

      await page.keyboard.press('ArrowRight')
      await page.waitForTimeout(300)
      await page.keyboard.press('ArrowLeft')

      await ensureToolbarVisible()
      await page.getByTitle('Indice').click()
      await expect(page.locator('.side-panel')).toBeVisible()
      await expect(page.locator('.side-panel .settings-header h4')).toContainText('Indice')
      await page.locator('.side-panel .settings-header button').click()
      await expect(page.locator('.side-panel')).toBeHidden()

      await ensureToolbarVisible()
      await page.getByTitle('Segnalibri').click()
      await expect(page.locator('.side-panel')).toBeVisible()
      await expect(page.locator('.bookmark-add-btn')).toBeVisible()
      await page.locator('.bookmark-add-btn').click()
      await page.waitForTimeout(300)
      await page.locator('.side-panel .settings-header button').click()
      await expect(page.locator('.side-panel')).toBeHidden()

      await ensureToolbarVisible()
      await page.getByTitle('Cerca').click()
      await expect(page.locator('.search-input')).toBeVisible()
      await page.locator('.search-input').fill('il')
      await page.locator('.search-input').press('Enter')
      await expect(page.locator('.search-results')).toBeVisible()
      await page.locator('.side-panel .settings-header button').click()
      await expect(page.locator('.side-panel')).toBeHidden()

      await ensureToolbarVisible()
      await page.getByTitle('Impostazioni').click()
      await expect(page.locator('.settings-panel')).toBeVisible()
      await page.getByTitle('Scuro').click()
      await page.locator('.font-controls button').last().click()
      await page.locator('.font-controls button').first().click()
      await page.locator('.font-selector-trigger').click()
      await page.locator('.font-option-pill').first().click()
      await page.locator('.settings-panel .settings-header button').click()
      await expect(page.locator('.settings-panel')).toBeHidden()

      await ensureToolbarVisible()
      const quoteButton = page.getByTitle('Crea citazione')
      await quoteButton.click()
      await expect(quoteButton).toHaveAttribute('aria-pressed', 'true')
      await quoteButton.click()
      await expect(quoteButton).toHaveAttribute('aria-pressed', 'false')

      await ensureToolbarVisible()
      await page.getByTitle('Leggi ad alta voce').click()
      await expect(page.locator('#viewer')).toBeVisible()

      await ensureToolbarVisible()
      await page.getByTitle('Modalità Zen').click()
      await expect(page.locator('.zen-exit-btn')).toBeVisible()
      await page.keyboard.press('Escape')
      await expect(page.locator('.zen-exit-btn')).toBeHidden()

      await ensureToolbarVisible()
      await page.getByTitle('Torna alla Libreria').click()
      await expect(page.getByRole('heading', { name: 'Libreria', level: 2 })).toBeVisible({ timeout: 30000 })
    } finally {
      await electronApp.close()
    }
  })
})
