import assert from 'node:assert/strict'
import { handleApiRequest } from '../server/gita-router.mjs'

async function call(path) {
  const response = {
    statusCode: 200,
    headers: {},
    body: '',
    setHeader(key, value) {
      this.headers[key] = value
    },
    end(body = '') {
      this.body = body
    },
  }
  await handleApiRequest({ method: 'GET', url: path }, response)
  return { status: response.statusCode, body: JSON.parse(response.body) }
}

const health = await call('/api/health')
assert.equal(health.status, 200)
assert.equal(health.body.verses, 701)
assert.equal(health.body.chapters, 18)
assert.equal(health.body.ttsVoices.hindi, 'hi-IN-SwaraNeural')
assert.equal(health.body.ttsVoices.english, 'en-IN-NeerjaNeural')

const verses = await call('/api/verses?limit=1')
assert.equal(verses.status, 200)
assert.equal(verses.body.verses.length, 1)
assert.equal(verses.body.verses[0].translationOptions.length, 4)
assert.equal(verses.body.verses[0].commentaryOptions.length, 2)
assert.equal(verses.body.verses[0].audioUrl.startsWith('https://'), true)

console.log('OK: live SQLite API health, verse query, sources, commentary, and recitation fields')
