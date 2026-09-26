import { ArrowUpRight, Compass, X } from 'lucide-react'
import { useEffect, useRef } from 'react'
import type { KeyboardEvent as ReactKeyboardEvent } from 'react'
import type { Chapter, Verse } from '../types'

interface ChapterIndexProps {
  chapters: Chapter[]
  verses: Verse[]
  currentChapter: number
  onClose: () => void
  onEnter: (index: number) => void
  onStartTour: (chapterNumber: number) => void
}

function firstVerseIndex(verses: Verse[], chapterNumber: number): number {
  const index = verses.findIndex((verse) => verse.chapterNumber === chapterNumber)
  return index < 0 ? 0 : index
}

export default function ChapterIndex({ chapters, verses, currentChapter, onClose, onEnter, onStartTour }: ChapterIndexProps) {
  const activeChapter = chapters.find((chapter) => chapter.chapterNumber === currentChapter) ?? chapters[0]
  const closeButtonRef = useRef<HTMLButtonElement>(null)
  const previousFocusRef = useRef<HTMLElement | null>(null)

  useEffect(() => {
    previousFocusRef.current = document.activeElement instanceof HTMLElement ? document.activeElement : null
    closeButtonRef.current?.focus()
    return () => previousFocusRef.current?.focus()
  }, [])

  const handleDialogKeyDown = (event: ReactKeyboardEvent<HTMLDivElement>) => {
    if (event.key !== 'Tab') return
    const focusable = Array.from(event.currentTarget.querySelectorAll<HTMLElement>('button:not([disabled]):not(.overlay-backdrop), [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'))
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
    <div className="overlay-layer" role="dialog" aria-modal="true" aria-labelledby="chapter-index-title" aria-describedby="chapter-index-description" onKeyDown={handleDialogKeyDown}>
      <button className="overlay-backdrop" type="button" onClick={onClose} aria-label="Close chapter index" />
      <section className="chapter-drawer">
        <header className="drawer-header">
          <div className="drawer-heading">
            <div className="chapter-drawer__planet">
              <span>{activeChapter.symbol}</span>
            </div>
            <div>
              <span className="eyebrow">THE 18 CHAPTERS</span>
              <h2 id="chapter-index-title">Choose a <em>constellation.</em></h2>
            </div>
          </div>
          <button ref={closeButtonRef} className="icon-button" type="button" onClick={onClose} aria-label="Close chapter index">
            <X size={18} />
          </button>
        </header>
        <p className="drawer-intro" id="chapter-index-description">Each chapter is a distinct atmosphere. Enter anywhere, then let the field carry you forward.</p>
        <button className="tour-launch" type="button" onClick={() => onStartTour(activeChapter.chapterNumber)}>
          <Compass size={15} /> Begin guided tour of chapter {String(activeChapter.chapterNumber).padStart(2, '0')}
        </button>
        <div className="chapter-list">
          {chapters.map((chapter) => {
            const isCurrent = chapter.chapterNumber === currentChapter
            const firstIndex = firstVerseIndex(verses, chapter.chapterNumber)
            return (
              <button
                className={`chapter-row ${isCurrent ? 'chapter-row--current' : ''}`}
                type="button"
                key={chapter.id}
                onClick={() => onEnter(firstIndex)}
                aria-current={isCurrent ? 'step' : undefined}
              >
                <span className="chapter-row__number">{String(chapter.chapterNumber).padStart(2, '0')}</span>
                <span className="chapter-row__symbol">{chapter.symbol}</span>
                <span className="chapter-row__copy">
                  <strong>{chapter.nameTranslation || chapter.nameTransliterated}</strong>
                  <small>{chapter.nameMeaning}</small>
                </span>
                <span className="chapter-row__count">
                  <strong>{chapter.verseCount}</strong>
                  <small>verses</small>
                </span>
                <ArrowUpRight className="chapter-row__arrow" size={16} />
              </button>
            )
          })}
        </div>
        <footer className="drawer-footer">
          <span><i className="status-dot" /> All chapters are unlocked</span>
          <span>701 verse coordinates</span>
        </footer>
      </section>
    </div>
  )
}
