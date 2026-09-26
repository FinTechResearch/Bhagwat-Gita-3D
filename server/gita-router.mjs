import { readFileSync } from 'node:fs'
import { getDatabase } from '../api/_db.js'
import { getTtsAudio, TTS_VOICES } from './tts.mjs'

const TRANSLATION_AUTHORS = new Set([
  'Swami Adidevananda',
  'Swami Gambirananda',
  'Swami Tejomayananda',
  'Swami Ramsukhdas',
])
const COMMENTARY_AUTHORS = new Set(['Swami Sivananda', 'Swami Ramsukhdas'])
const PURPLE_SCENE = {
  primary: '#7c3aed',
  secondary: '#ede9fe',
  accent: '#4c1d95',
  fog: '#ffffff',
}

function clean(value = '') {
  return String(value).replaceAll('\u00a0', ' ').replace(/[ \t]+/g, ' ').replace(/\n{3,}/g, '\n\n').trim()
}

function shorten(value = '', limit = 900) {
  const text = clean(value)
  if (text.length <= limit) return text
  return `${text.slice(0, limit).replace(/\s+\S*$/, '')}…`
}

function editorialSummary(value = '') {
  const text = clean(value)
  if (!text) return ''
  return shorten(text.split(/(?<=[.!?])\s+/)[0], 280)
}

function sendJson(response, status, payload) {
  if (typeof response.status === 'function' && typeof response.json === 'function') {
    response.status(status).json(payload)
    return
  }
  response.statusCode = status
  response.setHeader('Content-Type', 'application/json; charset=utf-8')
  response.end(JSON.stringify(payload))
}

function sendBinary(response, file, voice) {
  if (typeof response.send === 'function') {
    response.setHeader('Content-Type', 'audio/mpeg')
    response.setHeader('Cache-Control', 'public, max-age=31536000, immutable')
    response.setHeader('X-TTS-Voice', voice)
    return response.send(readFileSync(file))
  }
  response.statusCode = 200
  response.setHeader('Content-Type', 'audio/mpeg')
  response.setHeader('Cache-Control', 'public, max-age=31536000, immutable')
  response.setHeader('X-TTS-Voice', voice)
  response.end(readFileSync(file))
}

function withCors(response) {
  response.setHeader('Access-Control-Allow-Origin', process.env.CORS_ORIGIN || '*')
  response.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS')
  response.setHeader('Access-Control-Allow-Headers', 'Content-Type')
}

function serializeVerse(row) {
  const database = getDatabase()
  const translations = database.prepare(
    'SELECT lang, author_name, description FROM translations WHERE verse_id = ? AND lang IN (\'english\', \'hindi\')',
  ).all(row.id)
  const translationOptions = translations
    .filter((translation) => TRANSLATION_AUTHORS.has(translation.author_name))
    .map((translation) => ({
      language: translation.lang,
      author: translation.author_name,
      text: clean(translation.description),
    }))
  const defaultTranslation = (language, author) => translationOptions.find(
    (option) => option.language === language && option.author === author,
  )?.text || translationOptions.find((option) => option.language === language)?.text || ''

  const commentaries = database.prepare(
    'SELECT lang, author_name, description FROM commentaries WHERE verse_id = ? AND author_name IN (?, ?)',
  ).all(row.id, 'Swami Sivananda', 'Swami Ramsukhdas')
  const commentaryOptions = commentaries.map((commentary) => ({
    language: commentary.lang,
    author: commentary.author_name,
    text: shorten(commentary.description),
  }))
  const defaultCommentary = commentaryOptions.find((option) => option.language === 'english') || commentaryOptions[0]

  return {
    id: row.id,
    externalId: row.external_id,
    chapterId: row.chapter_id,
    chapterNumber: row.chapter_number,
    verseNumber: row.verse_number,
    verseOrder: row.verse_order,
    title: row.title,
    sanskrit: clean(row.text),
    transliteration: clean(row.transliteration),
    wordMeanings: clean(row.word_meanings),
    translations: {
      hindi: defaultTranslation('hindi', 'Swami Tejomayananda'),
      english: defaultTranslation('english', 'Swami Adidevananda'),
    },
    translationOptions,
    editorialSummary: editorialSummary(defaultTranslation('english', 'Swami Adidevananda')),
    commentary: shorten(defaultCommentary?.text || '', 420),
    commentaryAuthor: defaultCommentary?.author || '',
    commentaryOptions,
    audioUrl: row.audio_url || '',
    theme: 'cosmos',
    keywords: [],
    scene: PURPLE_SCENE,
  }
}

function listChapters() {
  return getDatabase().prepare(`
    SELECT id, chapter_number, name, name_meaning, name_translation,
           name_transliterated, chapter_summary, chapter_summary_hindi, verses_count
    FROM chapters
    ORDER BY chapter_number
  `).all().map((row) => ({
    id: row.id,
    chapterNumber: row.chapter_number,
    name: row.name,
    nameMeaning: row.name_meaning,
    nameTranslation: row.name_translation,
    nameTransliterated: row.name_transliterated,
    summary: clean(row.chapter_summary),
    summaryHindi: clean(row.chapter_summary_hindi),
    verseCount: row.verses_count,
  }))
}

export async function handleApiRequest(request, response) {
  withCors(response)
  if (request.method === 'OPTIONS') {
    response.statusCode = 204
    response.end()
    return
  }
  if (request.method !== 'GET') {
    sendJson(response, 405, { error: 'Method not allowed' })
    return
  }

  const requestUrl = new URL(request.url || '/', 'http://localhost')
  const path = requestUrl.pathname.replace(/\/$/, '') || '/'

  if (path === '/api/health') {
    const database = getDatabase()
    sendJson(response, 200, {
      status: 'ok',
      source: 'BhagwatGita.db',
      verses: database.prepare('SELECT COUNT(*) AS count FROM verses').get().count,
      chapters: database.prepare('SELECT COUNT(*) AS count FROM chapters').get().count,
      ttsVoices: TTS_VOICES,
    })
    return
  }

  if (path === '/api/tts') {
    const language = requestUrl.searchParams.get('lang') || ''
    const text = requestUrl.searchParams.get('text') || ''
    if (!Object.prototype.hasOwnProperty.call(TTS_VOICES, language) || !text.trim()) {
      sendJson(response, 400, { error: 'Use /api/tts?lang=hindi|english&text=...' })
      return
    }
    try {
      const result = await getTtsAudio(language, text)
      sendBinary(response, result.file, result.voice)
    } catch (error) {
      sendJson(response, 503, { error: 'Neural TTS is unavailable', detail: error instanceof Error ? error.message : String(error) })
    }
    return
  }

  if (path === '/api/chapters') {
    sendJson(response, 200, { chapters: listChapters() })
    return
  }

  if (path === '/api/verses') {
    const chapter = Number.parseInt(requestUrl.searchParams.get('chapter') || '', 10)
    const offset = Math.max(0, Number.parseInt(requestUrl.searchParams.get('offset') || '0', 10) || 0)
    const requestedLimit = Number.parseInt(requestUrl.searchParams.get('limit') || '50', 10) || 50
    const limit = Math.min(1000, Math.max(1, requestedLimit))
    const database = getDatabase()
    const rows = chapter
      ? database.prepare(`
          SELECT v.id, v.external_id, v.chapter_id, v.chapter_number, v.verse_number,
                 v.verse_order, v.title, v.text, v.transliteration, v.word_meanings,
                 r.audio_url
          FROM verses v
          LEFT JOIN verse_recitations r ON r.verse_id = v.id
          WHERE v.chapter_number = ?
          ORDER BY v.verse_order
          LIMIT ? OFFSET ?
        `).all(chapter, limit, offset)
      : database.prepare(`
          SELECT v.id, v.external_id, v.chapter_id, v.chapter_number, v.verse_number,
                 v.verse_order, v.title, v.text, v.transliteration, v.word_meanings,
                 r.audio_url
          FROM verses v
          LEFT JOIN verse_recitations r ON r.verse_id = v.id
          ORDER BY v.verse_order
          LIMIT ? OFFSET ?
        `).all(limit, offset)
    sendJson(response, 200, {
      verses: rows.map(serializeVerse),
      pagination: { offset, limit, count: rows.length },
    })
    return
  }

  const verseMatch = path.match(/^\/api\/verses\/(\d+)$/)
  if (verseMatch) {
    const row = getDatabase().prepare(`
      SELECT v.id, v.external_id, v.chapter_id, v.chapter_number, v.verse_number,
             v.verse_order, v.title, v.text, v.transliteration, v.word_meanings,
             r.audio_url
      FROM verses v
      LEFT JOIN verse_recitations r ON r.verse_id = v.id
      WHERE v.id = ? OR v.external_id = ?
      LIMIT 1
    `).get(Number(verseMatch[1]), Number(verseMatch[1]))
    if (!row) {
      sendJson(response, 404, { error: 'Verse not found' })
      return
    }
    sendJson(response, 200, { verse: serializeVerse(row) })
    return
  }

  sendJson(response, 404, { error: 'Route not found' })
}
