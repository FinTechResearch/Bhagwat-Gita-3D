import { createHash } from 'node:crypto'
import { existsSync, mkdirSync } from 'node:fs'
import { spawn } from 'node:child_process'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const CACHE_DIR = path.join(ROOT, '.cache', 'tts')
const PYTHON = process.env.TTS_PYTHON || 'python3'
const pending = new Map()

export const TTS_VOICES = {
  hindi: process.env.TTS_HINDI_VOICE || 'hi-IN-SwaraNeural',
  english: process.env.TTS_ENGLISH_VOICE || 'en-IN-NeerjaNeural',
}

function cachePath(language, voice, text) {
  const hash = createHash('sha256').update(`${language}|${voice}|${text}`).digest('hex').slice(0, 24)
  return path.join(CACHE_DIR, language, `${hash}.mp3`)
}

function generateWithPython({ text, voice, output, rate }) {
  return new Promise((resolve, reject) => {
    const child = spawn(PYTHON, [path.join(ROOT, 'scripts', 'tts_generate.py')], {
      cwd: ROOT,
      stdio: ['pipe', 'pipe', 'pipe'],
      env: { ...process.env, PYTHONUNBUFFERED: '1' },
    })
    let stdout = ''
    let stderr = ''
    child.stdout.on('data', (chunk) => { stdout += chunk })
    child.stderr.on('data', (chunk) => { stderr += chunk })
    child.on('error', reject)
    child.on('close', (code) => {
      if (code === 0) {
        resolve(stdout)
      } else {
        reject(new Error(stderr || `TTS process exited with code ${code}`))
      }
    })
    child.stdin.end(JSON.stringify({ text, voice, output, rate }))
  })
}

export async function getTtsAudio(language, text) {
  const normalizedText = String(text || '').trim().slice(0, 2400)
  if (!normalizedText || !Object.prototype.hasOwnProperty.call(TTS_VOICES, language)) throw new Error('Unsupported TTS language or empty text')
  const voice = TTS_VOICES[language]
  const output = cachePath(language, voice, normalizedText)
  if (existsSync(output)) return { file: output, voice, cached: true }

  const existing = pending.get(output)
  if (existing) return existing
  const task = (async () => {
    mkdirSync(path.dirname(output), { recursive: true })
    await generateWithPython({
      text: normalizedText,
      voice,
      output,
      rate: language === 'hindi' ? '-6%' : '-4%',
    })
    return { file: output, voice, cached: false }
  })()
  pending.set(output, task)
  try {
    return await task
  } finally {
    pending.delete(output)
  }
}

export function ttsCacheDirectory() {
  return CACHE_DIR
}
