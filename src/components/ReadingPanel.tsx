import { Bookmark, Check, ChevronLeft, ChevronRight, History, Share2, Sparkles } from 'lucide-react'
import { useEffect, useMemo, useRef, useState } from 'react'
import type { KeyboardEvent as ReactKeyboardEvent, TouchEvent } from 'react'
import type { Chapter, CommentaryOption, TranslationLanguage, TranslationOption, Verse } from '../types'
import VerseAudio from './VerseAudio'

interface ReadingPanelProps {
  verse: Verse
  chapter: Chapter
  index: number
  total: number
  onPrevious: () => void
  onNext: () => void
  onJump: (index: number) => void
  onOpenCosmicMode: () => void
  isBookmarked: boolean
  onToggleBookmark: () => void
  onShare: () => void
  shareStatus: string
  bookmarkedVerses: Verse[]
  recentVerses: Verse[]
  onSelectVerse: (verse: Verse) => void
}

const themeLabels: Record<Verse['theme'], string> = {
  soul: 'Soul current',
  war: 'Battlefield resonance',
  meditation: 'Lotus meditation',
  divine: 'Divine radiance',
  knowledge: 'Inner knowing',
  action: 'Sacred action',
  devotion: 'Devotional field',
  nature: 'Threefold nature',
  cosmos: 'Cosmic revelation',
}

function formatVerse(index: number): string {
  return String(index + 1).padStart(3, '0')
}

type TranslationPreferences = Record<TranslationLanguage, string>

const TRANSLATION_STORAGE_KEY = 'gita-translation-preferences'
const COMMENTARY_STORAGE_KEY = 'gita-commentary-preference'
const DEFAULT_TRANSLATION_AUTHORS: TranslationPreferences = {
  english: 'Swami Adidevananda',
  hindi: 'Swami Tejomayananda',
}

function loadTranslationPreferences(): TranslationPreferences {
  if (typeof window === 'undefined') return DEFAULT_TRANSLATION_AUTHORS
  try {
    const stored = JSON.parse(window.localStorage.getItem(TRANSLATION_STORAGE_KEY) ?? '{}') as Partial<TranslationPreferences>
    return {
      english: stored.english || DEFAULT_TRANSLATION_AUTHORS.english,
      hindi: stored.hindi || DEFAULT_TRANSLATION_AUTHORS.hindi,
    }
  } catch {
    return DEFAULT_TRANSLATION_AUTHORS
  }
}

function loadCommentaryPreference(): string {
  if (typeof window === 'undefined') return 'Swami Sivananda'
  return window.localStorage.getItem(COMMENTARY_STORAGE_KEY) || 'Swami Sivananda'
}

function translationFor(verse: Verse, language: TranslationLanguage, author: string): TranslationOption | undefined {
  return verse.translationOptions.find((option) => option.language === language && option.author === author)
    ?? verse.translationOptions.find((option) => option.language === language)
}

function commentaryFor(verse: Verse, author: string): CommentaryOption | undefined {
  return verse.commentaryOptions.find((option) => option.author === author) ?? verse.commentaryOptions[0]
}

export default function ReadingPanel({
  verse,
  chapter,
  index,
  total,
  onPrevious,
  onNext,
  onJump,
  onOpenCosmicMode,
  isBookmarked,
  onToggleBookmark,
  onShare,
  shareStatus,
  bookmarkedVerses,
  recentVerses,
  onSelectVerse,
}: ReadingPanelProps) {
  const [meaningOpen, setMeaningOpen] = useState(false)
  const [jumpValue, setJumpValue] = useState(String(index + 1))
  const [translationPreferences, setTranslationPreferences] = useState<TranslationPreferences>(loadTranslationPreferences)
  const [commentaryPreference, setCommentaryPreference] = useState(loadCommentaryPreference)
  const touchStart = useRef<{ x: number; y: number } | null>(null)

  const hindiTranslation = useMemo(
    () => translationFor(verse, 'hindi', translationPreferences.hindi),
    [translationPreferences.hindi, verse],
  )
  const englishTranslation = useMemo(
    () => translationFor(verse, 'english', translationPreferences.english),
    [translationPreferences.english, verse],
  )
  const commentary = useMemo(
    () => commentaryFor(verse, commentaryPreference),
    [commentaryPreference, verse],
  )

  const handleTouchStart = (event: TouchEvent<HTMLElement>) => {
    const touch = event.touches[0]
    if (touch) touchStart.current = { x: touch.clientX, y: touch.clientY }
  }

  const handleTouchEnd = (event: TouchEvent<HTMLElement>) => {
    const start = touchStart.current
    const touch = event.changedTouches[0]
    touchStart.current = null
    if (!start || !touch) return
    const deltaX = touch.clientX - start.x
    const deltaY = touch.clientY - start.y
    if (Math.abs(deltaX) < 60 || Math.abs(deltaX) < Math.abs(deltaY) * 1.2) return
    if (deltaX < 0) onNext()
    else onPrevious()
  }

  const handleKeyDown = (event: ReactKeyboardEvent<HTMLElement>) => {
    const target = event.target as HTMLElement
    if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.tagName === 'SELECT' || target.tagName === 'BUTTON') return
    if (event.key === 'ArrowRight' || event.key === 'ArrowLeft') {
      event.preventDefault()
      if (event.key === 'ArrowRight') onNext()
      else onPrevious()
    }
    if (event.key === 'Home' || event.key === 'End') {
      event.preventDefault()
      onJump(event.key === 'Home' ? 0 : total - 1)
    }
  }

  useEffect(() => {
    setJumpValue(String(index + 1))
    setMeaningOpen(false)
  }, [index, verse.id])

  useEffect(() => {
    try {
      window.localStorage.setItem(TRANSLATION_STORAGE_KEY, JSON.stringify(translationPreferences))
    } catch {
      // Storage may be unavailable in a restricted browser context.
    }
  }, [translationPreferences])

  useEffect(() => {
    try {
      window.localStorage.setItem(COMMENTARY_STORAGE_KEY, commentaryPreference)
    } catch {
      // Storage may be unavailable in a restricted browser context.
    }
  }, [commentaryPreference])

  const submitJump = () => {
    const parsed = Number.parseInt(jumpValue, 10)
    if (Number.isFinite(parsed)) onJump(Math.min(total - 1, Math.max(0, parsed - 1)))
  }

  const handleTranslationChange = (language: TranslationLanguage, author: string) => {
    setTranslationPreferences((preferences) => ({ ...preferences, [language]: author }))
  }

  return (
    <aside
      className="reading-panel"
      aria-label="Current verse"
      aria-keyshortcuts="ArrowLeft ArrowRight Home End K"
      tabIndex={-1}
      onKeyDown={handleKeyDown}
    >
      <p className="sr-only" aria-live="polite" aria-atomic="true">
        Chapter {chapter.chapterNumber}, verse {verse.verseNumber} of {total}.
      </p>
      <div className="reading-panel__topline">
        <div className="reading-location">
          <span className="reading-location__eyebrow">NOW TRAVELING</span>
          <strong>
            CHAPTER {String(chapter.chapterNumber).padStart(2, '0')} <i>/</i> VERSE {String(verse.verseNumber).padStart(2, '0')}
          </strong>
        </div>
        <div className="reading-counter">
          <span>{formatVerse(index)}</span>
          <small>/ {String(total).padStart(3, '0')}</small>
        </div>
      </div>

      <article className="verse-panel" key={verse.id} onTouchStart={handleTouchStart} onTouchEnd={handleTouchEnd}>
        <div className="verse-panel__header">
          <div>
            <span className="verse-panel__label">THE VERSE</span>
            <span className="verse-panel__theme">{themeLabels[verse.theme]}</span>
          </div>
          <span className="verse-panel__glyph">✦</span>
        </div>

        {verse.editorialSummary && (
          <div className="editorial-summary">
            <span>EDITORIAL SUMMARY</span>
            <p>{verse.editorialSummary}</p>
          </div>
        )}

        <div className="verse-reading-grid">
          <div className="translation-block translation-block--sanskrit">
            <span className="translation-block__label">SANSKRIT / धर्म</span>
            <div className="verse-sanskrit" lang="sa">
              {verse.sanskrit}
            </div>
            <div className="verse-transliteration">{verse.transliteration}</div>
          </div>
          <div className="translation-block">
            <span className="translation-block__label">HINDI / हिन्दी</span>
            <p lang="hi">{hindiTranslation?.text || verse.translations.hindi || 'Translation arriving in the next edition.'}</p>
            <span className="translation-source">{hindiTranslation?.author || 'Source unavailable'}</span>
          </div>
          <div className="translation-block translation-block--english">
            <span className="translation-block__label">ENGLISH / MEANING</span>
            <p>{englishTranslation?.text || verse.translations.english || 'Meaning arriving in the next edition.'}</p>
            <span className="translation-source">{englishTranslation?.author || 'Source unavailable'}</span>
          </div>
        </div>

        <VerseAudio verse={verse} hindiText={hindiTranslation?.text} englishText={englishTranslation?.text} />

        <details className="translation-preferences">
          <summary>Translation sources &amp; citations</summary>
          <div className="preference-grid">
            <label>
              <span>English source</span>
              <select value={englishTranslation?.author || ''} onChange={(event) => handleTranslationChange('english', event.target.value)}>
                {verse.translationOptions.filter((option) => option.language === 'english').map((option) => (
                  <option value={option.author} key={option.author}>{option.author}</option>
                ))}
              </select>
            </label>
            <label>
              <span>Hindi source</span>
              <select value={hindiTranslation?.author || ''} onChange={(event) => handleTranslationChange('hindi', event.target.value)}>
                {verse.translationOptions.filter((option) => option.language === 'hindi').map((option) => (
                  <option value={option.author} key={option.author}>{option.author}</option>
                ))}
              </select>
            </label>
          </div>
          <p className="preference-note">Selections are remembered on this device. Sources are projected from BhagwatGita.db.</p>
        </details>

        <details className="reading-library">
          <summary><History size={13} /> Library · {bookmarkedVerses.length} saved · {recentVerses.length} recent</summary>
          <div className="library-columns">
            <div>
              <span className="library-label">SAVED VERSES</span>
              {bookmarkedVerses.length > 0 ? bookmarkedVerses.slice(0, 8).map((savedVerse) => (
                <button className="library-item" type="button" key={savedVerse.id} onClick={() => onSelectVerse(savedVerse)}>
                  <b>{String(savedVerse.chapterNumber).padStart(2, '0')}.{String(savedVerse.verseNumber).padStart(2, '0')}</b>
                  <span>{savedVerse.translations.english.replace(/\s+/g, ' ').slice(0, 74)}…</span>
                </button>
              )) : <small className="library-empty">Bookmark a verse to keep it here.</small>}
            </div>
            <div>
              <span className="library-label">RECENTLY READ</span>
              {recentVerses.slice(0, 6).map((recentVerse) => (
                <button className="library-item" type="button" key={recentVerse.id} onClick={() => onSelectVerse(recentVerse)}>
                  <b>{String(recentVerse.chapterNumber).padStart(2, '0')}.{String(recentVerse.verseNumber).padStart(2, '0')}</b>
                  <span>{recentVerse.transliteration.split('\n')[0]}</span>
                </button>
              ))}
            </div>
          </div>
        </details>

        <button className="meaning-toggle" type="button" onClick={() => setMeaningOpen((open) => !open)} aria-expanded={meaningOpen} aria-controls="field-notes">
          <span>{meaningOpen ? 'Hide field notes' : 'Reveal field notes'}</span>
          <span className="meaning-toggle__line" />
          <span>{meaningOpen ? '−' : '+'}</span>
        </button>

        {meaningOpen && (
          <div className="field-notes" id="field-notes">
            <div className="field-notes__header">
              <span>CURATED COMMENTARY</span>
              <label>
                <span className="sr-only">Commentary source</span>
                <select value={commentary?.author || ''} onChange={(event) => setCommentaryPreference(event.target.value)}>
                  {verse.commentaryOptions.map((option) => (
                    <option value={option.author} key={`${option.language}-${option.author}`}>{option.author} · {option.language}</option>
                  ))}
                </select>
              </label>
            </div>
            <p>{commentary?.text || verse.commentary || 'The field notes are still being prepared for this verse.'}</p>
            {commentary?.author && <small>— {commentary.author}</small>}
            {verse.wordMeanings && (
              <details>
                <summary>Word map</summary>
                <p>{verse.wordMeanings}</p>
              </details>
            )}
          </div>
        )}
      </article>

      <div className="reading-controls">
        <div className="reading-controls__arrows">
          <button type="button" onClick={onPrevious} disabled={index === 0} aria-label="Previous verse">
            <ChevronLeft size={16} />
          </button>
          <button type="button" onClick={onNext} disabled={index === total - 1} aria-label="Next verse">
            <ChevronRight size={16} />
          </button>
        </div>
        <div className="reading-controls__actions">
          <button className={`reading-action ${isBookmarked ? 'reading-action--active' : ''}`} type="button" onClick={onToggleBookmark} aria-pressed={isBookmarked} aria-label={isBookmarked ? 'Remove bookmark' : 'Bookmark verse'}>
            {isBookmarked ? <Check size={14} /> : <Bookmark size={14} />}
          </button>
          <button className="reading-action" type="button" onClick={onShare} aria-label="Copy shareable verse link">
            <Share2 size={14} />
          </button>
          {shareStatus && <span className="share-status" role="status">{shareStatus}</span>}
        </div>
        <label className="jump-control">
          <span>JUMP TO</span>
          <input
            value={jumpValue}
            onChange={(event) => setJumpValue(event.target.value.replace(/[^0-9]/g, '').slice(0, 3))}
            onKeyDown={(event) => {
              if (event.key === 'Enter') submitJump()
            }}
            onBlur={submitJump}
            inputMode="numeric"
            aria-label="Jump to verse number"
          />
          <span className="jump-control__total">/ {total}</span>
        </label>
        <button className="cosmic-trigger" type="button" onClick={onOpenCosmicMode}>
          <Sparkles size={15} />
          <span>Cosmic field</span>
          <kbd>K</kbd>
        </button>
      </div>
    </aside>
  )
}
