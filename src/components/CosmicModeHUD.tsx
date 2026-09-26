import { ArrowLeft, MousePointer2, Sparkles } from 'lucide-react'
import { useEffect, useRef } from 'react'
import type { KeyboardEvent as ReactKeyboardEvent } from 'react'
import type { Chapter, Verse } from '../types'

interface CosmicModeHUDProps {
  verse: Verse
  chapter: Chapter
  total: number
  onClose: () => void
}

export default function CosmicModeHUD({ verse, chapter, total, onClose }: CosmicModeHUDProps) {
  const closeButtonRef = useRef<HTMLButtonElement>(null)
  const previousFocusRef = useRef<HTMLElement | null>(null)

  useEffect(() => {
    previousFocusRef.current = document.activeElement instanceof HTMLElement ? document.activeElement : null
    closeButtonRef.current?.focus()
    return () => previousFocusRef.current?.focus()
  }, [])

  const handleKeyDown = (event: ReactKeyboardEvent<HTMLDivElement>) => {
    if (event.key === 'Tab') {
      event.preventDefault()
      closeButtonRef.current?.focus()
    }
  }

  return (
    <div className="cosmic-hud" role="dialog" aria-modal="true" aria-labelledby="cosmic-mode-title" aria-describedby="cosmic-mode-description" onKeyDown={handleKeyDown}>
      <div className="cosmic-hud__topline">
        <div className="cosmic-hud__brand"><Sparkles size={15} /> COSMIC KRISHNA FIELD</div>
        <button ref={closeButtonRef} className="icon-button icon-button--dark" type="button" onClick={onClose} aria-label="Return to the journey">
          <ArrowLeft size={17} />
        </button>
      </div>
      <div className="cosmic-hud__center">
        <span className="eyebrow">THE WHOLE TEXT, AS ONE CONSTELLATION</span>
        <h2 id="cosmic-mode-title">Every verse is a <em>star.</em></h2>
        <p id="cosmic-mode-description">Move through the mandala. Select any point of light to arrive at a verse.</p>
        <div className="cosmic-hud__coordinates">
          <span><b>{String(chapter.chapterNumber).padStart(2, '0')}.{String(verse.verseNumber).padStart(2, '0')}</b> current coordinate</span>
          <span><b>{total}</b> connected stars</span>
        </div>
      </div>
      <div className="cosmic-hud__footer">
        <span><MousePointer2 size={14} /> Click a star to travel</span>
        <span><kbd>K</kbd> return to reading</span>
      </div>
    </div>
  )
}
