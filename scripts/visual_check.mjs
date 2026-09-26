import { chromium } from 'playwright'
import { mkdir, readFile, writeFile, copyFile } from 'node:fs/promises'
import path from 'node:path'
import pixelmatch from 'pixelmatch'
import { PNG } from 'pngjs'
import { startPreview, settlePage } from './browser-helpers.mjs'

const root = path.resolve('artifacts')
const baselineDir = path.join(root, 'visual-baseline')
const currentDir = path.join(root, 'visual-current')
const diffDir = path.join(root, 'visual-diff')
await Promise.all([mkdir(baselineDir, { recursive: true }), mkdir(currentDir, { recursive: true }), mkdir(diffDir, { recursive: true })])
const update = process.argv.includes('--update')

const preview = await startPreview()
const browser = await chromium.launch({ headless: true })
const context = await browser.newContext({ viewport: { width: 1440, height: 1000 }, reducedMotion: 'reduce' })
const page = await context.newPage()

async function capture(name) {
  const currentPath = path.join(currentDir, `${name}.png`)
  await page.screenshot({ path: currentPath })
  const baselinePath = path.join(baselineDir, `${name}.png`)
  if (update) {
    await copyFile(currentPath, baselinePath)
    console.log(`UPDATED: ${name}`)
    return
  }
  let baseline
  try {
    baseline = PNG.sync.read(await readFile(baselinePath))
  } catch {
    await copyFile(currentPath, baselinePath)
    console.log(`CREATED: ${name} (run again to compare against this baseline)`)
    return
  }
  const current = PNG.sync.read(await readFile(currentPath))
  if (current.width !== baseline.width || current.height !== baseline.height) throw new Error(`${name}: screenshot dimensions changed`)
  const diff = new PNG({ width: current.width, height: current.height })
  const mismatched = pixelmatch(current.data, baseline.data, diff.data, current.width, current.height, { threshold: 0.12 })
  if (mismatched > 0) {
    await writeFile(path.join(diffDir, `${name}.png`), PNG.sync.write(diff))
    throw new Error(`${name}: ${mismatched} pixels differ from baseline`)
  }
  console.log(`OK: ${name} matches visual baseline`)
}

try {
  await page.goto(preview.url, { waitUntil: 'networkidle' })
  await settlePage(page)
  await capture('hero')

  await page.getByRole('button', { name: /enter the field/i }).click()
  await page.locator('.reading-panel').waitFor()
  await settlePage(page)
  await capture('verse')

  await page.getByRole('button', { name: /chapters/i }).first().click()
  await page.locator('.chapter-drawer').waitFor()
  await settlePage(page)
  await capture('chapter')

  await page.locator('.chapter-drawer').getByRole('button', { name: /close chapter index/i }).click()
  await page.keyboard.press('k')
  await page.locator('.cosmic-hud').waitFor()
  await page.locator('.scene-layer canvas').waitFor()
  await settlePage(page, 700)
  await capture('cosmic')
} finally {
  await browser.close()
  await preview.stop()
}

console.log(update ? 'Visual baselines updated.' : 'Visual regression check passed.')
