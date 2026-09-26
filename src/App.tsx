import { lazy, Suspense, useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { gsap } from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import {
  ArrowDown,
  ArrowRight,
  Compass,
  Menu,
  Search,
  Volume2,
  VolumeX,
  X,
} from 'lucide-react'
import ChapterGate from './components/ChapterGate'
import ChapterIndex from './components/ChapterIndex'
import ChapterTransition from './components/ChapterTransition'
import CosmicModeHUD from './components/CosmicModeHUD'
import GuidedTour from './components/GuidedTour'
import ReadingPanel from './components/ReadingPanel'
import SearchDialog from './components/SearchDialog'
import { addRecentVerse, findVerseIndex, loadBookmarks, loadRecentVerses, toggleBookmark, verseHash } from './lib/reading-history'
import { useQualityProfile } from './lib/quality'
import { getAllVerses, getChapters, getDatabaseStats } from '../lib/gita-loader'
import type { Chapter, Verse } from './types'

import './index.css'
import './light-theme.css'

const CosmicCanvas = lazy(() => import('./components/CosmicCanvas'))

gsap.registerPlugin(ScrollTrigger)

const CHAPTER_HEIGHT_VH = 78

function clamp(value: number, min = 0, max = 1): number {
  return Math.min(max, Math.max(min, value))
}

function usePrefersReducedMotion(): boolean {
  const [reducedMotion, setReducedMotion] = useState(false)

  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)')
    const updatePreference = () => setReducedMotion(mediaQuery.matches)
    updatePreference()
    mediaQuery.addEventListener('change', updatePreference)
    return () => mediaQuery.removeEventListener('change', updatePreference)
  }, [])

  return reducedMotion
}

function useAmbientAudio() {
  const [enabled, setEnabled] = useState(false)
  const contextRef = useRef<AudioContext | null>(null)
  const gainRef = useRef<GainNode | null>(null)

  const toggle = useCallback(() => {
    if (enabled) {
      const context = contextRef.current
      const gain = gainRef.current
      if (context && gain) {
        gain.gain.cancelScheduledValues(context.currentTime)
        gain.gain.setTargetAtTime(0, context.currentTime, 0.12)
        window.setTimeout(() => void context.close(), 500)
      }
      contextRef.current = null
      gainRef.current = null
      setEnabled(false)
      return
    }

    const AudioContextConstructor =
      window.AudioContext ??
      (window as typeof window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
    if (!AudioContextConstructor) return

    const context = new AudioContextConstructor()
    const gain = context.createGain()
    const filter = context.createBiquadFilter()
    filter.type = 'lowpass'
    filter.frequency.value = 540
    filter.Q.value = 0.35
    gain.gain.value = 0.0001
    gain.connect(filter)
    filter.connect(context.destination)

    ;[110, 164.81, 220].forEach((frequency, index) => {
      const oscillator = context.createOscillator()
      const oscillatorGain = context.createGain()
      oscillator.type = index === 2 ? 'triangle' : 'sine'
      oscillator.frequency.value = frequency
      oscillator.detune.value = index * 3 - 3
      oscillatorGain.gain.value = index === 0 ? 0.65 : 0.18
      oscillator.connect(oscillatorGain)
      oscillatorGain.connect(gain)
      oscillator.start()
    })

    gain.gain.setTargetAtTime(0.025, context.currentTime, 0.6)
    contextRef.current = context
    gainRef.current = gain
    setEnabled(true)
  }, [enabled])

  useEffect(() => {
    return () => {
      const context = contextRef.current
      if (context) void context.close()
    }
  }, [])

  return { enabled, toggle }
}

export default function App() {
  const verses = useMemo(() => getAllVerses(), [])
  const chapters = useMemo(() => getChapters(), [])
  const stats = useMemo(() => getDatabaseStats(), [])
  const rootRef = useRef<HTMLDivElement>(null)
  const journeyRef = useRef<HTMLElement>(null)
  const previousChapter = useRef(1)
  const pendingGateChapter = useRef<number | null>(null)
  const [currentIndex, setCurrentIndex] = useState(() => findVerseIndex(verses, typeof window === 'undefined' ? '' : window.location.hash))
  const [scrollProgress, setScrollProgress] = useState(0)
  const [journeyActive, setJourneyActive] = useState(false)
  const [chaptersOpen, setChaptersOpen] = useState(false)
  const [searchOpen, setSearchOpen] = useState(false)
  const [chapterGate, setChapterGate] = useState<number | null>(null)
  const [transitionChapter, setTransitionChapter] = useState<number | null>(null)
  const [transitionFromChapter, setTransitionFromChapter] = useState<number | null>(null)
  const [tourChapter, setTourChapter] = useState<number | null>(null)
  const [cosmicMode, setCosmicMode] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)
  const [bookmarkedIds, setBookmarkedIds] = useState(loadBookmarks)
  const [recentIds, setRecentIds] = useState(loadRecentVerses)
  const [shareStatus, setShareStatus] = useState('')
  const reducedMotion = usePrefersReducedMotion()
  const quality = useQualityProfile()
  const { enabled: soundEnabled, toggle: toggleSound } = useAmbientAudio()

  const currentVerse: Verse = verses[currentIndex] ?? verses[0]
  const currentChapter: Chapter = chapters.find((chapter) => chapter.chapterNumber === currentVerse.chapterNumber) ?? chapters[0]
  const gateChapter = chapterGate ? chapters.find((chapter) => chapter.chapterNumber === chapterGate) : undefined
  const transitionData = transitionChapter ? chapters.find((chapter) => chapter.chapterNumber === transitionChapter) : undefined
  const transitionFromData = transitionFromChapter ? chapters.find((chapter) => chapter.chapterNumber === transitionFromChapter) : undefined
  const tourData = tourChapter ? chapters.find((chapter) => chapter.chapterNumber === tourChapter) : undefined
  const tourVerses = useMemo(
    () => tourChapter ? verses.filter((verse) => verse.chapterNumber === tourChapter) : [],
    [tourChapter, verses],
  )
  const bookmarkedVerses = useMemo(
    () => bookmarkedIds.map((id) => verses.find((verse) => verse.id === id)).filter((verse): verse is Verse => Boolean(verse)),
    [bookmarkedIds, verses],
  )
  const recentVerseList = useMemo(
    () => recentIds.map((id) => verses.find((verse) => verse.id === id)).filter((verse): verse is Verse => Boolean(verse)),
    [recentIds, verses],
  )

  const goToVerse = useCallback((index: number, smooth = true) => {
    const safeIndex = clamp(index, 0, verses.length - 1)
    const node = journeyRef.current
    if (!node) return
    const journeyTop = node.offsetTop
    const journeyDistance = Math.max(1, node.offsetHeight - window.innerHeight)
    const destination = journeyTop + (safeIndex / Math.max(1, verses.length - 1)) * journeyDistance
    if (!smooth) setCurrentIndex(Math.round(safeIndex))
    setJourneyActive(true)
    window.scrollTo({ top: destination, behavior: smooth && !reducedMotion ? 'smooth' : 'auto' })
  }, [reducedMotion, verses.length])

  const enterJourney = useCallback(() => {
    setChaptersOpen(false)
    setMenuOpen(false)
    goToVerse(0)
  }, [goToVerse])

  useEffect(() => {
    if (currentIndex > 0) goToVerse(currentIndex, false)
    // Deep links are resolved once on entry; scroll state owns navigation after that.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    if (!journeyActive) return
    setRecentIds((previous) => {
      const next = addRecentVerse(previous, verses[currentIndex].id)
      return next[0] === previous[0] ? previous : next
    })
  }, [currentIndex, journeyActive, verses])

  useEffect(() => {
    if (!journeyActive) return
    try {
      window.history.replaceState(null, '', verseHash(verses[currentIndex]))
    } catch {
      // History can be unavailable in embedded previews.
    }
  }, [currentIndex, journeyActive, verses])

  const handleTransitionComplete = useCallback(() => {
    setTransitionChapter(null)
    setTransitionFromChapter(null)
    if (pendingGateChapter.current !== null) {
      setChapterGate(pendingGateChapter.current)
      pendingGateChapter.current = null
    }
  }, [])

  useLayoutEffect(() => {
    if (!rootRef.current || reducedMotion) return
    const context = gsap.context(() => {
      gsap.fromTo('.hero-copy > *', { opacity: 0, y: 24 }, { opacity: 1, y: 0, duration: 1.1, stagger: 0.12, ease: 'power3.out', delay: 0.15 })
    }, rootRef)
    return () => context.revert()
  }, [reducedMotion])

  useEffect(() => {
    const node = journeyRef.current
    if (!node) return

    const handleScrollState = () => {
      setJourneyActive(window.scrollY > node.offsetTop - window.innerHeight * 0.68)
    }

    const trigger = ScrollTrigger.create({
      trigger: node,
      start: 'top top',
      end: 'bottom bottom',
      onUpdate: (self) => {
        const progress = clamp(self.progress)
        const nextIndex = Math.min(verses.length - 1, Math.max(0, Math.round(progress * (verses.length - 1))))
        setScrollProgress(progress)
        setCurrentIndex(nextIndex)
      },
    })

    window.addEventListener('scroll', handleScrollState, { passive: true })
    window.addEventListener('resize', handleScrollState)
    handleScrollState()
    ScrollTrigger.refresh()

    return () => {
      trigger.kill()
      window.removeEventListener('scroll', handleScrollState)
      window.removeEventListener('resize', handleScrollState)
    }
  }, [verses.length])

  useEffect(() => {
    if (!journeyActive || cosmicMode) return
    const chapterNumber = currentVerse.chapterNumber
    if (previousChapter.current !== chapterNumber) {
      pendingGateChapter.current = chapterNumber
      setTransitionFromChapter(previousChapter.current)
      setChapterGate(null)
      setTransitionChapter(chapterNumber)
    }
    previousChapter.current = chapterNumber
  }, [cosmicMode, currentVerse.chapterNumber, currentVerse.verseNumber, journeyActive])

  useEffect(() => {
    if (!journeyActive || reducedMotion) return
    const panel = rootRef.current?.querySelector('.verse-panel')
    if (!panel) return
    gsap.fromTo(panel, { opacity: 0.2, y: 18 }, { opacity: 1, y: 0, duration: 0.72, ease: 'power3.out', overwrite: true })
    gsap.fromTo('.verse-panel__header, .verse-reading-grid', { opacity: 0, y: 12 }, { opacity: 1, y: 0, duration: 0.65, stagger: 0.08, delay: 0.08, ease: 'power2.out', overwrite: true })
  }, [currentIndex, journeyActive, reducedMotion])

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null
      const isTextEntry = target?.tagName === 'INPUT' || target?.tagName === 'TEXTAREA' || target?.tagName === 'SELECT'
      const isDocumentTarget = !target || target === document.body || target === document.documentElement
      if (event.key === 'Escape') {
        setChaptersOpen(false)
        setSearchOpen(false)
        setChapterGate(null)
        setTransitionChapter(null)
        setTransitionFromChapter(null)
        setTourChapter(null)
        pendingGateChapter.current = null
        setCosmicMode(false)
        return
      }
      if (isTextEntry) return

      if (event.key.toLowerCase() === 'k') {
        event.preventDefault()
        setCosmicMode((mode) => !mode)
      }
      if (event.key === '/') {
        event.preventDefault()
        setSearchOpen(true)
      }
      if (journeyActive && isDocumentTarget) {
        if (event.key === 'ArrowRight') {
          event.preventDefault()
          goToVerse(currentIndex + 1)
        }
        if (event.key === 'ArrowLeft') {
          event.preventDefault()
          goToVerse(currentIndex - 1)
        }
        if (event.key === 'Home') {
          event.preventDefault()
          goToVerse(0)
        }
        if (event.key === 'End') {
          event.preventDefault()
          goToVerse(verses.length - 1)
        }
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [currentIndex, goToVerse, journeyActive, verses.length])

  const handleCanvasSelect = (index: number) => {
    if (cosmicMode) setCosmicMode(false)
    goToVerse(index)
  }

  const handleChapterEnter = (index: number) => {
    setChaptersOpen(false)
    setChapterGate(null)
    goToVerse(index)
  }

  const handleStartTour = (chapterNumber: number) => {
    const firstIndex = verses.findIndex((verse) => verse.chapterNumber === chapterNumber)
    setChaptersOpen(false)
    setChapterGate(null)
    setCosmicMode(false)
    setTourChapter(chapterNumber)
    if (firstIndex >= 0) goToVerse(firstIndex, false)
  }

  const handleTourSelect = useCallback((position: number) => {
    const verse = tourVerses[position]
    if (!verse) return
    const index = verses.findIndex((candidate) => candidate.id === verse.id)
    if (index >= 0) goToVerse(index, false)
  }, [goToVerse, tourVerses, verses])

  const handleTourExit = useCallback(() => setTourChapter(null), [])

  const handleGateContinue = () => setChapterGate(null)

  const handleToggleBookmark = () => {
    setBookmarkedIds((previous) => toggleBookmark(previous, currentVerse.id))
  }

  const handleShare = () => {
    const url = window.location.href
    if (navigator.clipboard?.writeText) {
      void navigator.clipboard.writeText(url).then(() => setShareStatus('Link copied')).catch(() => setShareStatus('Copy unavailable'))
    } else {
      setShareStatus('Copy the URL from your browser')
    }
    window.setTimeout(() => setShareStatus(''), 2200)
  }

  const handleSelectVerse = (verse: Verse) => {
    const index = verses.indexOf(verse)
    if (index >= 0) {
      setSearchOpen(false)
      goToVerse(index)
    }
  }

  const handleSearchSelect = (index: number) => {
    setSearchOpen(false)
    goToVerse(index)
  }

  return (
    <div ref={rootRef} className={`app-shell ${journeyActive ? 'app-shell--journey' : ''} ${cosmicMode ? 'app-shell--cosmic' : ''} ${reducedMotion ? 'app-shell--reduced-motion' : ''}`}>
      <a className="skip-link" href="#main-content">Skip to main content</a>
      {transitionData && (
        <ChapterTransition chapter={transitionData} fromChapter={transitionFromData} soundEnabled={soundEnabled} reducedMotion={reducedMotion} onComplete={handleTransitionComplete} />
      )}

      <div className={`scene-layer ${cosmicMode ? 'scene-layer--cosmic' : 'scene-layer--quiet'}`} aria-hidden={!cosmicMode}>
        {cosmicMode && (
          <Suspense fallback={null}>
            <CosmicCanvas
              verses={verses}
              currentIndex={currentIndex}
              scrollProgress={scrollProgress}
              cosmicMode={cosmicMode}
              quality={quality}
              reducedMotion={reducedMotion}
              onSelectVerse={handleCanvasSelect}
            />
          </Suspense>
        )}
      </div>

      <header className="site-header">
        <button className="brand" type="button" onClick={() => window.scrollTo({ top: 0, behavior: reducedMotion ? 'auto' : 'smooth' })} aria-label="Return to the beginning">
          <span className="brand__mark">ॐ</span>
          <span className="brand__words"><strong>BHAGAVAD GITA</strong><small>COSMIC ARCHIVE</small></span>
        </button>

        <nav className={`site-nav ${menuOpen ? 'site-nav--open' : ''}`} aria-label="Primary navigation">
          <button type="button" onClick={enterJourney}>Journey</button>
          <button type="button" onClick={() => { setMenuOpen(false); setChaptersOpen(true) }}>Chapters <span>18</span></button>
          <button type="button" onClick={() => setCosmicMode((mode) => !mode)}>Cosmic field <kbd>K</kbd></button>
        </nav>

        <div className="header-actions">
          <button className="search-trigger" type="button" onClick={() => setSearchOpen(true)}>
            <Search size={15} />
            <span>Search</span>
            <kbd>/</kbd>
          </button>
          <button className={`sound-toggle ${soundEnabled ? 'sound-toggle--on' : ''}`} type="button" onClick={toggleSound} aria-pressed={soundEnabled}>
            {soundEnabled ? <Volume2 size={15} /> : <VolumeX size={15} />}
            <span>{soundEnabled ? 'Field audio on' : 'Field audio'}</span>
          </button>
          <button className="menu-toggle" type="button" onClick={() => setMenuOpen((open) => !open)} aria-label="Toggle navigation" aria-expanded={menuOpen}>
            {menuOpen ? <X size={19} /> : <Menu size={19} />}
          </button>
        </div>
      </header>

      <div className="global-progress" aria-hidden="true"><span style={{ height: `${Math.max(1, scrollProgress * 100)}%` }} /></div>
      <p className="sr-only" aria-live="polite" aria-atomic="true">
        {journeyActive ? `Reading chapter ${currentChapter.chapterNumber}, verse ${currentVerse.verseNumber}, ${Math.round(((currentIndex + 1) / verses.length) * 100)} percent through the text.` : 'Journey not started.'}
      </p>

      <main id="main-content">
        <section className="hero" id="top">
          <div className="hero-copy">
            <div className="eyebrow eyebrow--bright"><span className="eyebrow__line" /> A CINEMATIC READING OF THE LIVING GITA</div>
            <h1>Travel beyond<br /><em>the page.</em></h1>
            <p className="hero__lede">Seven hundred and one coordinates of wisdom, suspended in a universe that changes as you move.</p>
            <div className="hero__actions">
              <button className="primary-button" type="button" onClick={enterJourney}>Enter the field <ArrowRight size={17} /></button>
              <button className="ghost-button" type="button" onClick={() => setChaptersOpen(true)}><Compass size={16} /> Explore chapters</button>
            </div>
            <div className="hero__stats">
              <div><strong>{stats.chapterCount}</strong><span>chapters</span></div>
              <div><strong>{stats.verseCount}</strong><span>verse coordinates</span></div>
              <div><strong>02</strong><span>living languages</span></div>
            </div>
          </div>
          <button className="scroll-cue" type="button" onClick={enterJourney}>
            <span>SCROLL TO DESCEND</span>
            <ArrowDown size={15} />
          </button>
          <div className="hero__footer-note"><span>BHAGAWAT GITA / FIELD STUDY 01</span><span>SCROLL = TIME TRAVEL</span></div>
        </section>

        <section className="journey-track" ref={journeyRef} style={{ height: `${verses.length * CHAPTER_HEIGHT_VH}vh` }} aria-label="The Gita verse journey" />

        <section className="after-journey">
          <span className="eyebrow">THE FIELD REMAINS WITH YOU</span>
          <h2>Carry the light<br /><em>with you.</em></h2>
          <p>The Gita is not a destination. It is a way of seeing the next horizon.</p>
          <button className="ghost-button" type="button" onClick={() => window.scrollTo({ top: 0, behavior: reducedMotion ? 'auto' : 'smooth' })}>Return to origin <ArrowRight size={15} /></button>
        </section>
      </main>

      {journeyActive && !cosmicMode && !tourChapter && (
        <ReadingPanel
          verse={currentVerse}
          chapter={currentChapter}
          index={currentIndex}
          total={verses.length}
          onPrevious={() => goToVerse(currentIndex - 1)}
          onNext={() => goToVerse(currentIndex + 1)}
          onJump={(index) => goToVerse(index)}
          onOpenCosmicMode={() => setCosmicMode(true)}
          isBookmarked={bookmarkedIds.includes(currentVerse.id)}
          onToggleBookmark={handleToggleBookmark}
          onShare={handleShare}
          shareStatus={shareStatus}
          bookmarkedVerses={bookmarkedVerses}
          recentVerses={recentVerseList}
          onSelectVerse={handleSelectVerse}
        />
      )}

      {!cosmicMode && gateChapter && journeyActive && (
        <ChapterGate chapter={gateChapter} onEnter={() => handleChapterEnter(verses.findIndex((verse) => verse.chapterNumber === gateChapter.chapterNumber))} onContinue={handleGateContinue} onStartTour={() => handleStartTour(gateChapter.chapterNumber)} />
      )}

      {tourData && tourVerses.length > 0 && (
        <GuidedTour
          chapter={tourData}
          chapterVerses={tourVerses}
          startPosition={0}
          onSelectIndex={handleTourSelect}
          onExit={handleTourExit}
        />
      )}

      {chaptersOpen && (
        <ChapterIndex
          chapters={chapters}
          verses={verses}
          currentChapter={currentChapter.chapterNumber}
          onClose={() => setChaptersOpen(false)}
          onEnter={handleChapterEnter}
          onStartTour={handleStartTour}
        />
      )}

      {searchOpen && <SearchDialog verses={verses} onClose={() => setSearchOpen(false)} onSelect={handleSearchSelect} />}

      {cosmicMode && <CosmicModeHUD verse={currentVerse} chapter={currentChapter} total={verses.length} onClose={() => setCosmicMode(false)} />}

      <div className="bottom-telemetry" aria-hidden="true">
        <span><i className="status-dot" /> FIELD ONLINE · {quality.label}</span>
        <span className="bottom-telemetry__center">{journeyActive ? `${currentChapter.nameTranslation || currentChapter.nameTransliterated}  ·  ${currentVerse.verseNumber}/${currentChapter.verseCount}` : 'AWAITING FIRST DESCENT'}</span>
        <span>{String(Math.round((currentIndex + 1) / verses.length * 100)).padStart(2, '0')}% OF THE TEXT</span>
      </div>
    </div>
  )
}
