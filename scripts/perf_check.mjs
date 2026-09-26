import { chromium, devices } from 'playwright'
import { mkdir, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { startPreview, settlePage } from './browser-helpers.mjs'

const outputDir = path.resolve('artifacts/performance')
await mkdir(outputDir, { recursive: true })

const preview = await startPreview()
const browser = await chromium.launch({ headless: true })
const context = await browser.newContext({ ...devices['iPhone 13'] })
const page = await context.newPage()
const cdp = await context.newCDPSession(page)
await cdp.send('Network.enable')
await cdp.send('Network.emulateNetworkConditions', {
  offline: false,
  latency: 150,
  downloadThroughput: 750 * 1024,
  uploadThroughput: 250 * 1024,
})
await cdp.send('Emulation.setCPUThrottlingRate', { rate: 4 })

try {
  const startedAt = Date.now()
  await page.goto(preview.url, { waitUntil: 'networkidle' })
  await settlePage(page)
  const metrics = await page.evaluate(() => {
    const navigation = performance.getEntriesByType('navigation')[0]
    const paints = Object.fromEntries(performance.getEntriesByType('paint').map((entry) => [entry.name, entry.startTime]))
    return {
      domContentLoaded: navigation?.domContentLoadedEventEnd ?? 0,
      load: navigation?.loadEventEnd ?? 0,
      firstContentfulPaint: paints['first-contentful-paint'] ?? 0,
      domNodes: document.querySelectorAll('*').length,
      versePanels: document.querySelectorAll('.verse-panel').length,
      bodyTextLength: document.body.innerText.length,
      scrollHeight: document.documentElement.scrollHeight,
    }
  })
  metrics.wallClockMs = Date.now() - startedAt
  await page.getByRole('button', { name: /enter the field/i }).click()
  await page.locator('.reading-panel').waitFor()
  await settlePage(page)
  metrics.reader = await page.evaluate(() => ({
    versePanels: document.querySelectorAll('.verse-panel').length,
    readingColumns: document.querySelectorAll('.verse-reading-grid > *').length,
    renderedSearchResults: document.querySelectorAll('.search-result').length,
  }))
  await writeFile(path.join(outputDir, 'mobile-iphone-13.json'), JSON.stringify(metrics, null, 2))
  console.log(JSON.stringify(metrics, null, 2))
  if (metrics.domContentLoaded > 5000 || metrics.load > 9000) throw new Error('Mobile load budget exceeded')
  if (metrics.domNodes > 6000) throw new Error('DOM node budget exceeded')
  if (metrics.reader.versePanels !== 1) throw new Error('Verse virtualization is not active')
  if (metrics.reader.readingColumns !== 3) throw new Error('Desktop reading columns missing on mobile flow')
  console.log('OK: throttled mobile profile passed performance budgets')
} finally {
  await browser.close()
  await preview.stop()
}
