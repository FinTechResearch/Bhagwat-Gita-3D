import type { Verse } from '../types'

const BOOKMARK_KEY = 'gita-bookmarks'
const RECENT_KEY = 'gita-recent-verses'

function readStoredIds(key: string): number[] {
  if (typeof window === 'undefined') return []
  try {
    const value = JSON.parse(window.localStorage.getItem(key) ?? '[]')
    return Array.isArray(value) ? value.filter((id): id is number => typeof id === 'number') : []
  } catch {
    return []
  }
}

function writeStoredIds(key: string, ids: number[]) {
  try {
    window.localStorage.setItem(key, JSON.stringify(ids))
  } catch {
    // Private browsing or a restricted storage context should not break reading.
  }
}

export function loadBookmarks(): number[] {
  return readStoredIds(BOOKMARK_KEY)
}

export function saveBookmarks(ids: number[]): number[] {
  writeStoredIds(BOOKMARK_KEY, ids)
  return ids
}

export function toggleBookmark(ids: number[], verseId: number): number[] {
  const next = ids.includes(verseId) ? ids.filter((id) => id !== verseId) : [verseId, ...ids]
  return saveBookmarks(next)
}

export function loadRecentVerses(): number[] {
  return readStoredIds(RECENT_KEY)
}

export function addRecentVerse(ids: number[], verseId: number, limit = 8): number[] {
  const next = [verseId, ...ids.filter((id) => id !== verseId)].slice(0, limit)
  writeStoredIds(RECENT_KEY, next)
  return next
}

export function verseHash(verse: Verse): string {
  return `#verse-${verse.chapterNumber}-${verse.verseNumber}`
}

export function parseVerseHash(hash: string): { chapterNumber: number; verseNumber: number } | null {
  const match = hash.match(/^#verse-(\d+)-(\d+)$/)
  if (!match) return null
  return { chapterNumber: Number(match[1]), verseNumber: Number(match[2]) }
}

export function findVerseIndex(verses: Verse[], hash: string): number {
  const target = parseVerseHash(hash)
  if (!target) return 0
  const index = verses.findIndex((verse) => verse.chapterNumber === target.chapterNumber && verse.verseNumber === target.verseNumber)
  return index < 0 ? 0 : index
}
