import { ChevronLeft, ChevronRight, X } from 'lucide-react'
import { useEffect, useMemo, useRef, useState } from 'react'
import type { KeyboardEvent as ReactKeyboardEvent } from 'react'
import VerseAudio from './VerseAudio'
import type { Chapter, Verse } from '../types'

interface GuidedTourProps {
  chapter: Chapter
  chapterVerses: Verse[]
  startPosition: number
  onSelectIndex: (index: number) => void
  onExit: () => void
}

export default function GuidedTour({ chapter, chapterVerses, startPosition, onSelectIndex, onExit }: GuidedTourProps) {
  const [position, setPosition] = useState(startPosition)
  const [autoAdvance, setAutoAdvance] = useState(true)
  const closeRef = useRef<HTMLButtonElement>(null)
  const previousFocusRef = useRef<HTMLElement | null>(null)
  const verse = chapterVerses[position] ?? chapterVerses[0]

  useEffect(() => {
    previousFocusRef.current = document.activeElement instanceof HTMLElement ? document.activeElement : null
    closeRef.current?.focus()
    return () => previousFocusRef.current?.focus()
  }, [])

  useEffect(() => {
    onSelectIndex(position)
  }, [onSelectIndex, position])

  const move = (delta: number) => {
    setPosition((current) => Math.min(chapterVerses.length - 1, Math.max(0, current + delta)))
  }

  const handleAudioEnded = () => {
    if (!autoAdvance) return
    if (position >= chapterVerses.length - 1) onExit()
    else move(1)
  }

  const handleKeyDown = (event: ReactKeyboardEvent<HTMLDivElement>) => {
    if (event.key === 'Escape') {
      event.preventDefault()
      onExit()
    }
    if (event.key === 'ArrowRight') {
      event.preventDefault()
      move(1)
    }
    if (event.key === 'ArrowLeft') {
      event.preventDefault()
      move(-1)
    }
  }

  const progress = useMemo(() => ((position + 1) / Math.max(1, chapterVerses.length)) * 100, [chapterVerses.length, position])

  if (!verse) return null

  return (
    <div className="tour-overlay" role="dialog" aria-modal="true" aria-labelledby="tour-title" onKeyDown={handleKeyDown}>
      <div className="tour-card">
        <header className="tour-card__header">
          <div>
            <span className="eyebrow">GUIDED TOUR · CHAPTER {String(chapter.chapterNumber).padStart(2, '0')}</span>
            <h2 id="tour-title">{chapter.nameTranslation || chapter.nameTransliterated}</h2>
          </div>
          <button ref={closeRef} className="icon-button" type="button" onClick={onExit} aria-label="Exit guided tour">
            <X size={18} />
          </button>
        </header>
        <div className="tour-progress" role="progressbar" aria-label="Tour progress" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(progress)}>
          <span style={{ width: `${progress}%` }} />
        </div>
        <div className="tour-card__counter"><span>VERSE {String(verse.verseNumber).padStart(2, '0')}</span><span>{position + 1} / {chapterVerses.length}</span></div>
        <div className="tour-verse">
          <div className="tour-verse__sanskrit" lang="sa">{verse.sanskrit}</div>
          <p>{verse.translations.english}</p>
        </div>
        <div className="tour-narration tour-narration--verse-audio">
          <VerseAudio verse={verse} compact onEnded={handleAudioEnded} />
          <label className="tour-auto">
            <input type="checkbox" checked={autoAdvance} onChange={(event) => setAutoAdvance(event.target.checked)} />
            <span>Auto-advance</span>
          </label>
        </div>
        <div className="tour-controls">
          <button type="button" onClick={() => move(-1)} disabled={position === 0} aria-label="Previous tour verse"><ChevronLeft size={17} /></button>
          <button className="tour-exit" type="button" onClick={onExit}>Exit tour</button>
          <button type="button" onClick={() => move(1)} disabled={position === chapterVerses.length - 1} aria-label="Next tour verse"><ChevronRight size={17} /></button>
        </div>
      </div>
    </div>
  )
}
