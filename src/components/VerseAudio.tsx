import { Pause, Play, Volume2 } from 'lucide-react'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { Verse } from '../types'

export type VerseAudioTrack = 'sanskrit' | 'hindi' | 'english'

interface VerseAudioProps {
  verse: Verse
  hindiText?: string
  englishText?: string
  compact?: boolean
  onEnded?: () => void
}

function formatTime(seconds: number): string {
  if (!Number.isFinite(seconds) || seconds <= 0) return '00:00'
  return `${String(Math.floor(seconds / 60)).padStart(2, '0')}:${String(Math.floor(seconds % 60)).padStart(2, '0')}`
}

export default function VerseAudio({ verse, hindiText, englishText, compact = false, onEnded }: VerseAudioProps) {
  const [activeTrack, setActiveTrack] = useState<VerseAudioTrack>('sanskrit')
  const [isPlaying, setIsPlaying] = useState(false)
  const [currentTime, setCurrentTime] = useState(0)
  const [duration, setDuration] = useState(0)
  const [error, setError] = useState('')
  const [isTtsLoading, setIsTtsLoading] = useState(false)
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([])
  const audioRef = useRef<HTMLAudioElement>(null)
  const speechFallbackRef = useRef(false)
  const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null)
  const onEndedRef = useRef(onEnded)
  onEndedRef.current = onEnded

  const texts = useMemo(() => ({
    sanskrit: verse.sanskrit,
    hindi: hindiText || verse.translations.hindi,
    english: englishText || verse.translations.english,
  }), [englishText, hindiText, verse])

  const audioSource = useMemo(() => {
    if (activeTrack === 'sanskrit') return verse.audioUrl
    return `/api/tts?lang=${activeTrack}&text=${encodeURIComponent(texts[activeTrack])}`
  }, [activeTrack, texts, verse.audioUrl])

  useEffect(() => {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) return
    const synth = window.speechSynthesis
    const updateVoices = () => setVoices(synth.getVoices())
    updateVoices()
    synth.addEventListener('voiceschanged', updateVoices)
    return () => synth.removeEventListener('voiceschanged', updateVoices)
  }, [])

  const stopPlayback = useCallback(() => {
    const audio = audioRef.current
    if (audio) audio.pause()
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) window.speechSynthesis.cancel()
    utteranceRef.current = null
    setIsPlaying(false)
  }, [])

  useEffect(() => {
    stopPlayback()
    setCurrentTime(0)
    setDuration(0)
    setError('')
    setIsTtsLoading(false)
    speechFallbackRef.current = false
    return stopPlayback
  }, [activeTrack, stopPlayback, verse.id])

  useEffect(() => stopPlayback, [stopPlayback])

  const speak = () => {
    if (typeof window === 'undefined' || !('speechSynthesis' in window) || typeof SpeechSynthesisUtterance === 'undefined') {
      setError('Speech synthesis is not available in this browser')
      return
    }
    const synth = window.speechSynthesis
    const language = activeTrack === 'hindi' ? 'hi-IN' : activeTrack === 'english' ? 'en-IN' : 'sa-IN'
    const languagePrefix = language.slice(0, 2).toLowerCase()
    const selectedVoice = voices.find((voice) => voice.lang.toLowerCase() === language.toLowerCase())
      ?? voices.find((voice) => voice.lang.toLowerCase().startsWith(languagePrefix))
    const text = texts[activeTrack]

    try {
      synth.cancel()
      synth.resume()
    } catch {
      // Some browsers throw while the speech engine is warming up.
    }

    const attempt = (useVoice: boolean) => {
      const utterance = new SpeechSynthesisUtterance(text)
      utterance.lang = language
      utterance.rate = activeTrack === 'hindi' ? 0.9 : 0.94
      if (useVoice && selectedVoice) utterance.voice = selectedVoice
      utterance.onstart = () => setIsPlaying(true)
      utterance.onend = () => {
        setIsPlaying(false)
        onEndedRef.current?.()
      }
      utterance.onerror = (event) => {
        if (useVoice && selectedVoice && ['synthesis-failed', 'voice-unavailable', 'language-unavailable'].includes(event.error)) {
          window.setTimeout(() => attempt(false), 180)
          return
        }
        setIsPlaying(false)
        setError(
          event.error === 'not-allowed'
            ? 'Speech is blocked by the browser. Tap play again.'
            : voices.length === 0
              ? 'No system voice is installed for this language.'
              : `Speech unavailable (${event.error})`,
        )
      }
      utteranceRef.current = utterance
      try {
        synth.speak(utterance)
      } catch {
        setIsPlaying(false)
        setError('Speech engine is still starting. Tap play again.')
      }
    }

    setError('')
    setIsPlaying(true)
    attempt(true)
  }

  const toggle = () => {
    if (isPlaying) {
      stopPlayback()
      return
    }
    setError('')
    if (audioSource) {
      const audio = audioRef.current
      if (!audio) return
      if (activeTrack !== 'sanskrit') setIsTtsLoading(true)
      audio.load()
      void audio.play().then(() => setIsPlaying(true)).catch(() => {
        setIsTtsLoading(false)
        setError(activeTrack === 'sanskrit' ? 'Audio could not be loaded' : 'Neural audio is unavailable; using browser voice.')
        if (activeTrack !== 'sanskrit' && !speechFallbackRef.current) {
          speechFallbackRef.current = true
          speak()
        }
      })
      return
    }
    speak()
  }

  const tracks: Array<{ id: VerseAudioTrack; label: string; sublabel: string }> = [
    { id: 'sanskrit', label: 'Sanskrit', sublabel: 'Verse recitation' },
    { id: 'hindi', label: 'Hindi', sublabel: 'Female neural voice' },
    { id: 'english', label: 'English', sublabel: 'Female neural voice' },
  ]
  const isFileTrack = Boolean(audioSource)

  return (
    <div className={`verse-audio ${compact ? 'verse-audio--compact' : ''}`}>
      <div className="verse-audio__tracks" role="tablist" aria-label="Verse audio language">
        {tracks.map((track) => (
          <button
            key={track.id}
            className={`verse-audio__track ${activeTrack === track.id ? 'verse-audio__track--active' : ''}`}
            type="button"
            role="tab"
            aria-selected={activeTrack === track.id}
            onClick={() => setActiveTrack(track.id)}
          >
            <span>{track.label}</span>
            <small>{track.sublabel}</small>
          </button>
        ))}
      </div>
      <div className="verse-audio__player">
        <button className="verse-audio__play" type="button" onClick={toggle} aria-label={isPlaying ? `Pause ${activeTrack} audio` : `Play ${activeTrack} audio`}>
          {isPlaying ? <Pause size={14} fill="currentColor" /> : <Play size={14} fill="currentColor" />}
        </button>
        <div className="verse-audio__copy">
          <span><Volume2 size={12} /> {tracks.find((track) => track.id === activeTrack)?.label}</span>
          <small>{error || (isTtsLoading ? 'Generating neural audio…' : isFileTrack ? (isPlaying ? (activeTrack === 'sanskrit' ? 'Playing recitation' : 'Playing neural voice') : 'Neural audio aligned to this verse') : voices.length === 0 ? 'System voice will load on first play' : 'Browser voice ready')}</small>
        </div>
        {isFileTrack ? (
          <>
            <input
              className="verse-audio__range"
              type="range"
              min="0"
              max={duration || 0}
              step="0.1"
              value={Math.min(currentTime, duration || 0)}
              onChange={(event) => {
                const nextTime = Number(event.target.value)
                if (audioRef.current) audioRef.current.currentTime = nextTime
                setCurrentTime(nextTime)
              }}
              disabled={duration === 0}
              aria-label="Sanskrit recitation progress"
            />
            <span className="verse-audio__time">{formatTime(currentTime)} / {formatTime(duration)}</span>
          </>
        ) : (
          <span className="verse-audio__time">{isPlaying ? 'SPEAKING' : 'READY'}</span>
        )}
        <audio
          ref={audioRef}
          src={audioSource}
          preload="none"
          onLoadedMetadata={(event) => {
            setDuration(event.currentTarget.duration)
            setIsTtsLoading(false)
          }}
          onTimeUpdate={(event) => setCurrentTime(event.currentTarget.currentTime)}
          onPlay={() => setIsPlaying(true)}
          onPause={() => setIsPlaying(false)}
          onEnded={() => {
            setIsPlaying(false)
            setCurrentTime(0)
            onEndedRef.current?.()
          }}
          onError={() => {
            setIsTtsLoading(false)
            if (activeTrack !== 'sanskrit' && !speechFallbackRef.current) {
              speechFallbackRef.current = true
              speak()
              return
            }
            setError('Audio could not be loaded')
          }}
          aria-label={activeTrack === 'sanskrit' ? 'Sanskrit verse recitation' : `${activeTrack} neural meaning audio`}
        />
      </div>
    </div>
  )
}
