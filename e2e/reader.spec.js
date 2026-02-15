import { test, expect } from '@playwright/test'
import path from 'path'

const TEST_EPUB = path.join(process.cwd(), 'test.epub')

async function openReader(page) {
  await page.goto('/')
  await page.setInputFiles('#lib-upload', TEST_EPUB)
  await page.waitForSelector('text=aggiunto', { timeout: 15000 })
  await expect(page.locator('.book-card').first()).toBeVisible({ timeout: 30000 })
  await page.getByRole('heading', { name: 'Test Book' }).first().click()
  await page.waitForTimeout(300)

  if (await page.locator('#viewer').count() === 0) {
    await page.locator('.book-card').last().click({ position: { x: 20, y: 20 } })
  }

  await expect(page.locator('#viewer')).toBeVisible({ timeout: 30000 })
}

async function ensureToolbarVisible(page) {
  await page.mouse.move(80, 80)
  await page.waitForTimeout(120)
}

test.describe('Reader View', () => {
  test('should open reader and expose core controls', async ({ page }) => {
    await openReader(page)
    await ensureToolbarVisible(page)

    await expect(page.getByTitle('Torna alla Libreria')).toBeVisible()
    await expect(page.getByTitle('Indice')).toBeVisible()
    await expect(page.getByTitle('Segnalibri')).toBeVisible()
    await expect(page.getByTitle('Cerca')).toBeVisible()
    await expect(page.getByTitle('Impostazioni')).toBeVisible()

    await page.keyboard.press('ArrowRight')
    await page.waitForTimeout(250)
    await page.keyboard.press('ArrowLeft')
    await expect(page.locator('#viewer')).toBeVisible()
  })

  test('should adjust settings and toggle reader panels', async ({ page }) => {
    await openReader(page)
    await ensureToolbarVisible(page)

    await page.getByTitle('Impostazioni').click()
    await expect(page.locator('.settings-panel')).toBeVisible()
    await page.getByTitle('Scuro').click()
    await page.locator('.font-controls button').last().click()
    await page.locator('.font-controls button').first().click()
    await page.locator('.settings-panel .settings-header button').click()
    await expect(page.locator('.settings-panel')).toBeHidden()

    await ensureToolbarVisible(page)
    await page.getByTitle('Segnalibri').click()
    await expect(page.locator('.side-panel .settings-header h4')).toContainText('Segnalibri')
    await page.locator('.side-panel .settings-header button').click()

    await ensureToolbarVisible(page)
    await page.getByTitle('Cerca').click()
    await expect(page.locator('.search-input')).toBeVisible()
    await page.locator('.search-input').fill('il')
    await page.locator('.search-input').press('Enter')
    await expect(page.locator('.search-results')).toBeVisible()
    await page.locator('.side-panel .settings-header button').click()

    await ensureToolbarVisible(page)
    await page.getByTitle('Torna alla Libreria').click()
    await expect(page.getByRole('heading', { name: 'Libreria', level: 2 })).toBeVisible({ timeout: 30000 })
  })
})
