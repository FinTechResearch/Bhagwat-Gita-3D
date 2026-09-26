import { ArrowRight, Compass, Play, X } from 'lucide-react'
import type { Chapter } from '../types'

interface ChapterGateProps {
  chapter: Chapter
  onEnter: () => void
  onContinue: () => void
  onStartTour: () => void
}

export default function ChapterGate({ chapter, onEnter, onContinue, onStartTour }: ChapterGateProps) {
  return (
    <div className="chapter-gate" role="dialog" aria-labelledby="chapter-gate-title" aria-describedby="chapter-gate-description">
      <div className="chapter-gate__orb">
        <Compass size={22} />
      </div>
      <span className="eyebrow">A NEW ATMOSPHERE</span>
      <h2 id="chapter-gate-title">Chapter {String(chapter.chapterNumber).padStart(2, '0')}</h2>
      <h3>{chapter.nameTranslation || chapter.nameTransliterated}</h3>
      <p id="chapter-gate-description">{chapter.summary || chapter.nameMeaning}</p>
      <div className="chapter-gate__meta">
        <span><b>{chapter.verseCount}</b> verse coordinates</span>
        <span><b>{chapter.symbol}</b> {chapter.nameMeaning}</span>
      </div>
      <div className="chapter-gate__actions">
        <button className="primary-button primary-button--small" type="button" onClick={onEnter} autoFocus>
          Enter chapter <ArrowRight size={15} />
        </button>
        <button className="tour-launch tour-launch--small" type="button" onClick={onStartTour}><Play size={13} fill="currentColor" /> Guided tour</button>
        <button className="text-button" type="button" onClick={onContinue}>Keep drifting <X size={14} /></button>
      </div>
    </div>
  )
}
