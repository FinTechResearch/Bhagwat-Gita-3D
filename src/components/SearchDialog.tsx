import { ArrowUpRight, Search, X } from 'lucide-react'
import { useEffect, useMemo, useRef, useState } from 'react'
import type { KeyboardEvent as ReactKeyboardEvent } from 'react'
import type { Verse } from '../types'

interface SearchDialogProps {
  verses: Verse[]
  onClose: () => void
  onSelect: (index: number) => void
}

interface SearchResult {
  verse: Verse
  field: string
  preview: string
}

function resultFor(verse: Verse, tokens: string[]): SearchResult | null {
  const fields: Array<[string, string]> = [
    ['English translation', verse.translations.english],
    ['Hindi translation', verse.translations.hindi],
    ['Sanskrit', verse.sanskrit],
    ['Transliteration', verse.transliteration],
    ['Commentary', [verse.commentary, ...verse.commentaryOptions.map((option) => option.text)].join(' ')],
    ['Word meanings', verse.wordMeanings],
  ]
  const normalized = fields.map(([, value]) => value.toLowerCase())
  if (!tokens.every((token) => normalized.some((value) => value.includes(token)))) return null
  const fieldIndex = normalized.findIndex((value) => tokens.every((token) => value.includes(token)))
  const preview = fields[fieldIndex >= 0 ? fieldIndex : 0][1].replace(/\s+/g, ' ').trim()
  return { verse, field: fields[fieldIndex >= 0 ? fieldIndex : 0][0], preview: preview.slice(0, 150) }
}

export default function SearchDialog({ verses, onClose, onSelect }: SearchDialogProps) {
  const [query, setQuery] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)
  const previousFocusRef = useRef<HTMLElement | null>(null)

  useEffect(() => {
    previousFocusRef.current = document.activeElement instanceof HTMLElement ? document.activeElement : null
    inputRef.current?.focus()
    return () => previousFocusRef.current?.focus()
  }, [])

  const results = useMemo(() => {
    const tokens = query.trim().toLowerCase().split(/\s+/).filter(Boolean)
    if (tokens.length === 0) return []
    return verses
      .map((verse) => resultFor(verse, tokens))
      .filter((result): result is SearchResult => result !== null)
      .slice(0, 40)
  }, [query, verses])

  const handleKeyDown = (event: ReactKeyboardEvent<HTMLDivElement>) => {
    if (event.key !== 'Tab') return
    const focusable = Array.from(event.currentTarget.querySelectorAll<HTMLElement>('button:not([disabled]):not(.search-overlay__backdrop), input, [href], [tabindex]:not([tabindex="-1"])'))
    if (focusable.length === 0) return
    const first = focusable[0]
    const last = focusable[focusable.length - 1]
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault()
      last.focus()
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault()
      first.focus()
    }
  }

  return (
    <div className="search-overlay" role="dialog" aria-modal="true" aria-labelledby="search-title" aria-describedby="search-description" onKeyDown={handleKeyDown}>
      <button className="search-overlay__backdrop" type="button" onClick={onClose} aria-label="Close search" />
      <section className="search-dialog">
        <header className="search-dialog__header">
          <div>
            <span className="eyebrow">SEARCH THE FIELD</span>
            <h2 id="search-title">Find a <em>verse.</em></h2>
            <p id="search-description">Search Sanskrit, transliteration, translations, commentary, and word meanings.</p>
          </div>
          <button className="icon-button" type="button" onClick={onClose} aria-label="Close search">
            <X size={18} />
          </button>
        </header>
        <label className="search-input">
          <Search size={17} />
          <span className="sr-only">Search verses</span>
          <input
            ref={inputRef}
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Try “soul”, “Kurukshetra”, or “dharma”"
            aria-label="Search verses"
          />
          <kbd>/</kbd>
        </label>
        <div className="search-results" aria-live="polite">
          {query.trim() && <span className="search-results__count">{results.length} result{results.length === 1 ? '' : 's'}</span>}
          {!query.trim() && <div className="search-empty">Begin with a word, a phrase, or a verse number.</div>}
          {query.trim() && results.length === 0 && <div className="search-empty">No verses match that search yet.</div>}
          {results.map(({ verse, field, preview }) => (
            <button className="search-result" type="button" key={verse.id} onClick={() => onSelect(verses.indexOf(verse))}>
              <span className="search-result__coordinate">{String(verse.chapterNumber).padStart(2, '0')}.{String(verse.verseNumber).padStart(2, '0')}</span>
              <span className="search-result__copy">
                <strong>{preview || verse.sanskrit.slice(0, 150)}</strong>
                <small>{field} · {verse.transliteration.split('\n')[0]}</small>
              </span>
              <ArrowUpRight size={15} />
            </button>
          ))}
        </div>
        <footer className="search-dialog__footer"><span>Enter a verse number in the reader to jump directly</span><span>ESC to close</span></footer>
      </section>
    </div>
  )
}
