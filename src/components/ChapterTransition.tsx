import { useEffect, useRef } from 'react'
import type { CSSProperties } from 'react'
import type { Chapter } from '../types'

interface ChapterTransitionProps {
  chapter: Chapter
  fromChapter?: Chapter
  soundEnabled: boolean
  reducedMotion: boolean
  onComplete: () => void
}

function playChapterCue(enabled: boolean) {
  if (!enabled || typeof window === 'undefined') return
  const AudioContextConstructor =
    window.AudioContext ??
    (window as typeof window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
  if (!AudioContextConstructor) return

  try {
    const context = new AudioContextConstructor()
    const gain = context.createGain()
    gain.gain.setValueAtTime(0.0001, context.currentTime)
    gain.gain.exponentialRampToValueAtTime(0.035, context.currentTime + 0.08)
    gain.gain.exponentialRampToValueAtTime(0.0001, context.currentTime + 1.25)
    gain.connect(context.destination)
    ;[196, 293.66, 392].forEach((frequency, index) => {
      const oscillator = context.createOscillator()
      const oscillatorGain = context.createGain()
      oscillator.type = index === 1 ? 'triangle' : 'sine'
      oscillator.frequency.value = frequency
      oscillatorGain.gain.value = index === 0 ? 0.7 : 0.25
      oscillator.connect(oscillatorGain)
      oscillatorGain.connect(gain)
      oscillator.start(context.currentTime + index * 0.12)
    })
    window.setTimeout(() => void context.close(), 1500)
  } catch {
    // Audio is an enhancement; a blocked context should never interrupt reading.
  }
}

export default function ChapterTransition({ chapter, fromChapter, soundEnabled, reducedMotion, onComplete }: ChapterTransitionProps) {
  const completeRef = useRef(onComplete)
  completeRef.current = onComplete

  useEffect(() => {
    playChapterCue(soundEnabled)
    const timer = window.setTimeout(() => completeRef.current(), reducedMotion ? 650 : 2300)
    return () => window.clearTimeout(timer)
  }, [chapter.chapterNumber, reducedMotion, soundEnabled])

  const dust = Array.from({ length: 22 }, (_, index) => index)

  return (
    <div className={`chapter-transition ${reducedMotion ? 'chapter-transition--reduced' : ''}`} role="status" aria-live="polite">
      <div className="chapter-transition__wash" aria-hidden="true" />
      <div className="chapter-transition__geometry" aria-hidden="true">
        <svg viewBox="0 0 500 500">
          <circle cx="250" cy="250" r="188" />
          <circle cx="250" cy="250" r="142" />
          <circle cx="250" cy="250" r="84" />
          <path d="M250 62 L250 438 M62 250 L438 250 M114 114 L386 386 M386 114 L114 386" />
          <path d="M250 108 L382 316 L118 316 Z" />
        </svg>
      </div>
      <div className="chapter-transition__dust" aria-hidden="true">
        {dust.map((particle) => <i
          key={particle}
          style={{
            '--dust-index': particle,
            '--dust-x': `${(particle - 11) * 21}px`,
            '--dust-y': `${(particle - 11) * 15}px`,
            '--dust-end-x': `${(particle - 11) * 34}px`,
            '--dust-end-y': `${(particle - 11) * 26 - 30}px`,
          } as CSSProperties}
        />)}
      </div>
      {fromChapter && (
        <div className="chapter-transition__path" aria-label={`Constellation path from chapter ${fromChapter.chapterNumber} to chapter ${chapter.chapterNumber}`}>
          <span>{fromChapter.symbol}</span>
          <i />
          <b>CONSTELLATION PATH</b>
          <i />
          <span>{chapter.symbol}</span>
        </div>
      )}
      <div className="chapter-transition__copy">
        <span className="eyebrow">{fromChapter ? `CHAPTER ${String(fromChapter.chapterNumber).padStart(2, '0')} → ${String(chapter.chapterNumber).padStart(2, '0')}` : `CHAPTER ${String(chapter.chapterNumber).padStart(2, '0')}`} · ATMOSPHERE SHIFT</span>
        <h2>{chapter.nameTranslation || chapter.nameTransliterated}</h2>
        <p>{chapter.nameMeaning}</p>
        <span className="chapter-transition__line" aria-hidden="true" />
        <small>{chapter.symbol} {chapter.verseCount} verse coordinates</small>
      </div>
    </div>
  )
}
