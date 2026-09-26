import assert from 'node:assert/strict'
import { stat } from 'node:fs/promises'
import { getTtsAudio, TTS_VOICES } from '../server/tts.mjs'

const english = await getTtsAudio('english', 'A short test of the Gita meaning voice.')
const hindi = await getTtsAudio('hindi', 'गीता के अर्थ की एक छोटी परीक्षण आवाज़।')
const englishSize = (await stat(english.file)).size
const hindiSize = (await stat(hindi.file)).size
assert.ok(englishSize > 1000, 'English MP3 was not generated')
assert.ok(hindiSize > 1000, 'Hindi MP3 was not generated')
console.log(`OK: generated female neural voices ${TTS_VOICES.english} and ${TTS_VOICES.hindi}`)
