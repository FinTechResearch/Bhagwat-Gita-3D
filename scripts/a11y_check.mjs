import { chromium } from 'playwright'
import { createRequire } from 'node:module'
import { startPreview, settlePage } from './browser-helpers.mjs'

const require = createRequire(import.meta.url)
const axePath = require.resolve('axe-core/axe.min.js')

async function audit(page, name) {
  await page.addScriptTag({ path: axePath })
  const result = await page.evaluate(async () => window.axe.run(document, {
    runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21aa'] },
  }))
  if (result.violations.length > 0) {
    console.error(`\n${name}: ${result.violations.length} accessibility violation(s)`)
    for (const violation of result.violations) {
      console.error(`- [${violation.impact ?? 'unknown'}] ${violation.id}: ${violation.help}`)
      for (const node of violation.nodes.slice(0, 3)) console.error(`  ${node.target.join(' ')}`)
    }
  } else {
    console.log(`OK: ${name} has no WCAG A/AA violations`)
  }
  return result.violations
}

const preview = await startPreview()
const browser = await chromium.launch({ headless: true })
const context = await browser.newContext({ viewport: { width: 1440, height: 1000 }, reducedMotion: 'reduce' })
const page = await context.newPage()
const violations = []

try {
  await page.goto(preview.url, { waitUntil: 'networkidle' })
  await settlePage(page)
  violations.push(...await audit(page, 'hero'))

  await page.getByRole('button', { name: /enter the field/i }).click()
  await page.locator('.reading-panel').waitFor()
  await settlePage(page)
  violations.push(...await audit(page, 'verse reader'))

  await page.getByRole('button', { name: /search/i }).first().click()
  await page.locator('.search-dialog').waitFor()
  await settlePage(page)
  violations.push(...await audit(page, 'search dialog'))
  await page.locator('.search-dialog').getByRole('button', { name: /close search/i }).click()

  await page.getByRole('button', { name: /chapters/i }).first().click()
  await page.locator('.chapter-drawer').waitFor()
  await settlePage(page)
  violations.push(...await audit(page, 'chapter index'))

  await page.locator('.chapter-drawer .tour-launch').click()
  await page.locator('.tour-card').waitFor()
  await settlePage(page)
  violations.push(...await audit(page, 'guided tour'))
  await page.locator('.tour-exit').click()

  await page.keyboard.press('k')
  await page.locator('.cosmic-hud').waitFor()
  await page.locator('.scene-layer canvas').waitFor()
  await settlePage(page, 700)
  violations.push(...await audit(page, 'cosmic mode'))
} finally {
  await browser.close()
  await preview.stop()
}

if (violations.length > 0) process.exit(1)
console.log('OK: accessibility audit passed for hero, verse, chapter, and cosmic modes')
