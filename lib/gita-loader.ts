import rawData from '../src/data/gita.json'
import type { Chapter, CommentaryOption, GitaData, TranslationLanguage, TranslationOption, Verse } from '../src/types'

/**
 * The browser bundle uses a small, typed projection of BhagwatGita.db.
 * Run `npm run content:generate` to rebuild it whenever the source database
 * changes. Keeping the projection in the client avoids shipping a 33 MB
 * SQLite file while preserving a repository-style loader API.
 */
const data = rawData as GitaData
const verseById = new Map(data.verses.map((verse) => [verse.id, verse]))
const chapterByNumber = new Map(data.chapters.map((chapter) => [chapter.chapterNumber, chapter]))

export function getAllVerses(): Verse[] {
  return data.verses
}

export function getChapters(): Chapter[] {
  return data.chapters
}

export function getChapter(chapterNumber: number): Chapter | undefined {
  return chapterByNumber.get(chapterNumber)
}

export function getChapterVerses(chapterNumber: number): Verse[] {
  return data.verses.filter((verse) => verse.chapterNumber === chapterNumber)
}

/** Accepts either the internal row id or the source database's external id. */
export function getVerse(identifier: number): Verse | undefined {
  return verseById.get(identifier) ?? data.verses.find((verse) => verse.externalId === identifier)
}

export function getTranslations(verseId: number): Verse['translations']
export function getTranslations(verseId: number, language: TranslationLanguage): string
export function getTranslations(verseId: number, language?: TranslationLanguage): Verse['translations'] | string {
  const translations = getVerse(verseId)?.translations ?? { hindi: '', english: '' }
  return language ? translations[language] : translations
}

export function getTranslationOptions(verseId: number, language?: TranslationLanguage): TranslationOption[] {
  const options = getVerse(verseId)?.translationOptions ?? []
  return language ? options.filter((option) => option.language === language) : options
}

export function getCommentaryOptions(verseId: number, language?: TranslationLanguage): CommentaryOption[] {
  const options = getVerse(verseId)?.commentaryOptions ?? []
  return language ? options.filter((option) => option.language === language) : options
}

export function getAudioUrl(verseId: number): string {
  return getVerse(verseId)?.audioUrl ?? ''
}

/** The current schema stores the concise English rendering as the meaning. */
export function getMeaning(verseId: number): string {
  return getVerse(verseId)?.translations.english ?? ''
}

export function getDatabaseStats() {
  return {
    ...data.metadata,
    translationCount: data.verses.length * 2,
  }
}

export const gitaData = data
