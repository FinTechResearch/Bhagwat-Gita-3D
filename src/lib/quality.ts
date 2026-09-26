import { useEffect, useState } from 'react'

export type QualityLevel = 'high' | 'balanced' | 'low'

export interface QualityProfile {
  level: QualityLevel
  label: string
  maxPixelRatio: number
  starCount: number
  enableEffects: boolean
  reducedMotion: boolean
}

type NavigatorWithHints = Navigator & {
  deviceMemory?: number
  connection?: { saveData?: boolean; effectiveType?: string }
}

function detectProfile(): QualityProfile {
  if (typeof window === 'undefined') {
    return { level: 'balanced', label: 'BALANCED', maxPixelRatio: 1.35, starCount: 900, enableEffects: true, reducedMotion: false }
  }

  const navigatorWithHints = window.navigator as NavigatorWithHints
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
  const coarsePointer = window.matchMedia('(pointer: coarse)').matches
  const narrowViewport = window.innerWidth < 700
  const lowMemory = typeof navigatorWithHints.deviceMemory === 'number' && navigatorWithHints.deviceMemory <= 4
  const lowConcurrency = typeof navigatorWithHints.hardwareConcurrency === 'number' && navigatorWithHints.hardwareConcurrency <= 4
  const saveData = navigatorWithHints.connection?.saveData === true
  const constrained = reducedMotion || saveData || lowMemory || lowConcurrency || (coarsePointer && narrowViewport)

  if (constrained) {
    return {
      level: 'low',
      label: reducedMotion ? 'REDUCED MOTION' : 'ECO',
      maxPixelRatio: 1,
      starCount: 420,
      enableEffects: false,
      reducedMotion,
    }
  }

  if (coarsePointer || narrowViewport || lowConcurrency) {
    return {
      level: 'balanced',
      label: 'BALANCED',
      maxPixelRatio: 1.35,
      starCount: 850,
      enableEffects: true,
      reducedMotion,
    }
  }

  return {
    level: 'high',
    label: 'HIGH DETAIL',
    maxPixelRatio: 1.65,
    starCount: 1450,
    enableEffects: true,
    reducedMotion,
  }
}

export function useQualityProfile(): QualityProfile {
  const [profile, setProfile] = useState<QualityProfile>(detectProfile)

  useEffect(() => {
    const update = () => setProfile(detectProfile())
    const motionQuery = window.matchMedia('(prefers-reduced-motion: reduce)')
    window.addEventListener('resize', update)
    motionQuery.addEventListener('change', update)
    return () => {
      window.removeEventListener('resize', update)
      motionQuery.removeEventListener('change', update)
    }
  }, [])

  return profile
}
