import { spawn } from 'node:child_process'
import { existsSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')

async function waitForServer(url, timeoutMs = 30_000) {
  const startedAt = Date.now()
  while (Date.now() - startedAt < timeoutMs) {
    try {
      const response = await fetch(url)
      if (response.ok) return
    } catch {
      // Preview server is still starting.
    }
    await new Promise((resolve) => setTimeout(resolve, 250))
  }
  throw new Error(`Preview server did not start within ${timeoutMs}ms`)
}

export async function startPreview({ port = 4173 } = {}) {
  if (!existsSync(path.join(ROOT, 'dist', 'index.html'))) {
    throw new Error('Missing dist/index.html. Run `npm run build` before browser checks.')
  }
  const child = spawn('npm', ['run', 'preview', '--', '--host', '127.0.0.1', '--port', String(port)], {
    cwd: ROOT,
    stdio: 'ignore',
    detached: process.platform !== 'win32',
    env: { ...process.env, NO_COLOR: '1' },
  })
  const url = `http://127.0.0.1:${port}`
  await waitForServer(url)
  return {
    url,
    async stop() {
      if (process.platform !== 'win32' && child.pid) {
        try { process.kill(-child.pid, 'SIGTERM') } catch { child.kill('SIGTERM') }
      } else {
        child.kill('SIGTERM')
      }
      await new Promise((resolve) => setTimeout(resolve, 150))
    },
  }
}

export async function settlePage(page, milliseconds = 350) {
  await page.evaluate(async () => {
    if (document.fonts?.ready) await document.fonts.ready
  })
  await page.waitForTimeout(milliseconds)
}
