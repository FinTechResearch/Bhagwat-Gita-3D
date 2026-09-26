import { useMemo, useRef } from 'react'
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import { Edges, Float } from '@react-three/drei'
import * as THREE from 'three'
import type { QualityProfile } from '../lib/quality'
import type { Verse } from '../types'

interface CosmicCanvasProps {
  verses: Verse[]
  currentIndex: number
  scrollProgress: number
  cosmicMode: boolean
  quality: QualityProfile
  reducedMotion: boolean
  onSelectVerse: (index: number) => void
}

interface SceneProps extends CosmicCanvasProps {
  currentVerse: Verse
}

const TAU = Math.PI * 2

const LIGHT_SCENE = {
  primary: '#7c3aed',
  secondary: '#ede9fe',
  accent: '#4c1d95',
  fog: '#ffffff',
}

function seeded(seed: number): number {
  const value = Math.sin(seed * 12.9898 + 78.233) * 43758.5453
  return value - Math.floor(value)
}

function makeStarPositions(count: number, spread: number, depth: number): Float32Array {
  const positions = new Float32Array(count * 3)
  for (let i = 0; i < count; i += 1) {
    const radius = Math.sqrt(seeded(i + 4)) * spread
    const angle = seeded(i + 91) * TAU
    positions[i * 3] = Math.cos(angle) * radius
    positions[i * 3 + 1] = Math.sin(angle) * radius * 0.68
    positions[i * 3 + 2] = (seeded(i + 177) - 0.5) * depth
  }
  return positions
}

function StarField({ progress, color, count, reducedMotion }: { progress: number; color: string; count: number; reducedMotion: boolean }) {
  const points = useMemo(() => makeStarPositions(count, 28, 80), [count])
  const group = useRef<THREE.Points>(null)

  useFrame((_, delta) => {
    if (!group.current) return
    if (!reducedMotion) group.current.rotation.y += delta * 0.006
    group.current.rotation.x = Math.sin(progress * 2.4) * 0.035
    group.current.position.z = -progress * 55
  })

  return (
    <points ref={group}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[points, 3]} />
      </bufferGeometry>
      <pointsMaterial
        color={color}
        size={0.035}
        sizeAttenuation
        transparent
        opacity={0.82}
        depthWrite={false}
        blending={THREE.AdditiveBlending}
      />
    </points>
  )
}

function Nebula({ verse, reducedMotion }: { verse: Verse; reducedMotion: boolean }) {
  const group = useRef<THREE.Group>(null)
  const { primary, secondary, accent } = verse.scene

  useFrame((state, delta) => {
    if (!group.current) return
    if (!reducedMotion) group.current.rotation.y += delta * 0.008
    group.current.rotation.z = reducedMotion ? 0 : Math.sin(state.clock.elapsedTime * 0.08) * 0.08
  })

  return (
    <group ref={group} position={[0, 0, -34]}>
      <mesh position={[-8, 3, -7]} scale={[13, 8, 5]}>
        <sphereGeometry args={[1, 32, 24]} />
        <meshBasicMaterial color={primary} transparent opacity={0.075} depthWrite={false} blending={THREE.AdditiveBlending} />
      </mesh>
      <mesh position={[9, -4, -12]} scale={[15, 10, 6]}>
        <sphereGeometry args={[1, 32, 24]} />
        <meshBasicMaterial color={secondary} transparent opacity={0.16} depthWrite={false} blending={THREE.AdditiveBlending} />
      </mesh>
      <mesh position={[0, 7, -20]} scale={[18, 4, 3]}>
        <sphereGeometry args={[1, 32, 20]} />
        <meshBasicMaterial color={accent} transparent opacity={0.035} depthWrite={false} blending={THREE.AdditiveBlending} />
      </mesh>
      <mesh position={[-3, -8, 2]} scale={[5, 3, 2]}>
        <sphereGeometry args={[1, 24, 16]} />
        <meshBasicMaterial color={accent} transparent opacity={0.07} depthWrite={false} blending={THREE.AdditiveBlending} />
      </mesh>
    </group>
  )
}

function LightRays({ verse }: { verse: Verse }) {
  const group = useRef<THREE.Group>(null)
  useFrame((state) => {
    if (!group.current) return
    group.current.rotation.z = Math.sin(state.clock.elapsedTime * 0.07) * 0.16
    group.current.rotation.x = Math.cos(state.clock.elapsedTime * 0.05) * 0.08
  })

  return (
    <group ref={group} position={[-1.8, 0.5, -17]}>
      {Array.from({ length: 7 }, (_, index) => {
        const angle = (index / 7) * Math.PI - Math.PI / 2
        return (
          <mesh key={index} position={[0, 0, 0]} rotation={[0, 0, angle]}>
            <planeGeometry args={[0.045 + index * 0.008, 15]} />
            <meshBasicMaterial color={index % 2 ? verse.scene.accent : verse.scene.primary} transparent opacity={0.075} depthWrite={false} blending={THREE.AdditiveBlending} />
          </mesh>
        )
      })}
    </group>
  )
}

function BurstParticles({ verse, kind }: { verse: Verse; kind: 'galaxy' | 'dust' }) {
  const points = useMemo(() => {
    const count = kind === 'galaxy' ? 280 : 190
    const values = new Float32Array(count * 3)
    for (let i = 0; i < count; i += 1) {
      const angle = seeded(i + (kind === 'galaxy' ? 20 : 320)) * TAU
      const radius = kind === 'galaxy'
        ? 0.35 + Math.pow(seeded(i + 510), 0.42) * 3.8
        : 2.2 + seeded(i + 730) * 8
      values[i * 3] = Math.cos(angle) * radius
      values[i * 3 + 1] = Math.sin(angle) * radius * (kind === 'galaxy' ? 0.56 : 0.8)
      values[i * 3 + 2] = (seeded(i + 940) - 0.5) * (kind === 'galaxy' ? 1.4 : 3)
    }
    return values
  }, [kind])
  const group = useRef<THREE.Points>(null)

  useFrame((state, delta) => {
    if (!group.current) return
    group.current.rotation.z += delta * (kind === 'galaxy' ? 0.12 : 0.025)
    group.current.rotation.x = Math.sin(state.clock.elapsedTime * 0.08) * 0.16
  })

  return (
    <points ref={group} position={kind === 'galaxy' ? [-3.5, 0.8, -12] : [3.8, -1.2, -7]}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[points, 3]} />
      </bufferGeometry>
      <pointsMaterial
        color={kind === 'galaxy' ? verse.scene.accent : verse.scene.primary}
        size={kind === 'galaxy' ? 0.045 : 0.025}
        transparent
        opacity={kind === 'galaxy' ? 0.8 : 0.46}
        depthWrite={false}
        blending={THREE.AdditiveBlending}
      />
    </points>
  )
}

function LotusBloom({ verse }: { verse: Verse }) {
  const group = useRef<THREE.Group>(null)
  useFrame((state, delta) => {
    if (!group.current) return
    group.current.rotation.y += delta * 0.16
    group.current.rotation.z = Math.sin(state.clock.elapsedTime * 0.3) * 0.08
  })

  return (
    <group ref={group} position={[3.4, -0.5, -8]} rotation={[0.18, 0, -0.14]}>
      {Array.from({ length: 10 }, (_, petal) => {
        const angle = (petal / 10) * TAU
        return (
          <mesh key={petal} position={[Math.cos(angle) * 0.58, Math.sin(angle) * 0.58, 0]} rotation={[0, 0, angle - Math.PI / 2]} scale={[0.34, 0.95, 0.12]}>
            <sphereGeometry args={[1, 20, 12]} />
            <meshBasicMaterial color={verse.scene.accent} transparent opacity={0.16} depthWrite={false} blending={THREE.AdditiveBlending} />
          </mesh>
        )
      })}
      <mesh>
        <sphereGeometry args={[0.24, 20, 16]} />
        <meshBasicMaterial color={verse.scene.primary} transparent opacity={0.85} blending={THREE.AdditiveBlending} />
      </mesh>
    </group>
  )
}

function ChapterAtmosphere({ verse, quality }: { verse: Verse; quality: QualityProfile }) {
  const isBattlefield = verse.chapterNumber === 1 || verse.theme === 'war'
  const isCosmic = verse.chapterNumber === 11 || verse.theme === 'cosmos' || verse.theme === 'divine'
  const isLotus = verse.chapterNumber === 6 || verse.theme === 'meditation'

  return (
    <>
      {quality.enableEffects && isBattlefield && <BurstParticles verse={verse} kind="dust" />}
      {quality.enableEffects && isCosmic && <BurstParticles verse={verse} kind="galaxy" />}
      {quality.enableEffects && isLotus && <LotusBloom verse={verse} />}
    </>
  )
}

function Tunnel({ verse, progress, quality }: { verse: Verse; progress: number; quality: QualityProfile }) {
  const ringCount = quality.level === 'low' ? 12 : quality.level === 'balanced' ? 18 : 24
  const rings = useMemo(
    () => Array.from({ length: ringCount }, (_, index) => ({ z: -index * (24 / ringCount) * 7.5 - 8, scale: 5.4 + index * 0.22 })),
    [ringCount],
  )

  return (
    <group position={[0, 0, -progress * 18]}>
      {rings.map((ring, index) => (
        <mesh key={ring.z} position={[0, 0, ring.z]} rotation={[0, 0, index * 0.08]}>
          <torusGeometry args={[ring.scale, index % 4 === 0 ? 0.028 : 0.012, 8, 96]} />
          <meshBasicMaterial
            color={index % 5 === 0 ? verse.scene.accent : verse.scene.primary}
            transparent
            opacity={0.13 - index * 0.003}
            depthWrite={false}
            blending={THREE.AdditiveBlending}
          />
        </mesh>
      ))}
    </group>
  )
}

function Mandala({ verse, cosmicMode, progress, reducedMotion }: { verse: Verse; cosmicMode: boolean; progress: number; reducedMotion: boolean }) {
  const group = useRef<THREE.Group>(null)
  useFrame((state, delta) => {
    if (!group.current) return
    const speed = cosmicMode ? 0.08 : 0.025
    if (!reducedMotion) group.current.rotation.z += delta * speed
    group.current.rotation.x = reducedMotion ? 0 : Math.sin(state.clock.elapsedTime * 0.12) * (cosmicMode ? 0.3 : 0.08)
  })

  return (
    <group ref={group} position={[cosmicMode ? 0 : 2.6, cosmicMode ? 0 : 0.7, cosmicMode ? -10 : -14 - progress * 19]}>
      <mesh>
        <torusGeometry args={[cosmicMode ? 6.1 : 3.15, cosmicMode ? 0.035 : 0.018, 8, 128]} />
        <meshBasicMaterial color={verse.scene.accent} transparent opacity={cosmicMode ? 0.5 : 0.3} blending={THREE.AdditiveBlending} />
      </mesh>
      <mesh rotation={[0, 0, Math.PI / 5]}>
        <torusGeometry args={[cosmicMode ? 5.45 : 2.65, 0.012, 6, 96]} />
        <meshBasicMaterial color={verse.scene.primary} transparent opacity={0.24} blending={THREE.AdditiveBlending} />
      </mesh>
      <mesh rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[cosmicMode ? 4.7 : 2.15, 0.01, 6, 96]} />
        <meshBasicMaterial color={verse.scene.secondary} transparent opacity={0.5} blending={THREE.AdditiveBlending} />
      </mesh>
      {[0, 1, 2, 3, 4, 5, 6, 7].map((petal) => {
        const angle = (petal / 8) * TAU
        return (
          <mesh
            key={petal}
            position={[Math.cos(angle) * (cosmicMode ? 2.1 : 1.35), Math.sin(angle) * (cosmicMode ? 2.1 : 1.35), 0]}
            rotation={[0, 0, angle]}
          >
            <torusGeometry args={[cosmicMode ? 0.38 : 0.25, 0.018, 6, 24, Math.PI * 1.35]} />
            <meshBasicMaterial color={verse.scene.accent} transparent opacity={0.22} blending={THREE.AdditiveBlending} />
          </mesh>
        )
      })}
    </group>
  )
}

function VerseWindows({ verses, currentIndex, scrollProgress, onSelectVerse }: Pick<CosmicCanvasProps, 'verses' | 'currentIndex' | 'scrollProgress' | 'onSelectVerse'>) {
  const start = Math.max(0, currentIndex - 5)
  const end = Math.min(verses.length, currentIndex + 6)
  const visible = verses.slice(start, end)

  return (
    <group position={[0, 0, -scrollProgress * 19]}>
      {visible.map((verse, localIndex) => {
        const index = start + localIndex
        const offset = index - currentIndex
        const distance = Math.abs(offset)
        const isCurrent = offset === 0
        const x = isCurrent ? 0 : (offset % 2 === 0 ? 1 : -1) * (2.5 + distance * 0.38)
        const y = isCurrent ? 0.25 : (offset % 3 === 0 ? 1.2 : -0.9) + distance * 0.08
        const z = -distance * 4.1
        const opacity = isCurrent ? 0.16 : Math.max(0.035, 0.105 - distance * 0.012)

        return (
          <Float key={verse.id} speed={isCurrent ? 1.1 : 0.7} rotationIntensity={isCurrent ? 0.12 : 0.22} floatIntensity={isCurrent ? 0.3 : 0.55}>
            <group position={[x, y, z]} rotation={[0, offset * -0.06, offset * 0.025]}>
              <mesh
                onClick={(event) => {
                  event.stopPropagation()
                  onSelectVerse(index)
                }}
                onPointerOver={() => {
                  document.body.style.cursor = 'pointer'
                }}
                onPointerOut={() => {
                  document.body.style.cursor = 'default'
                }}
              >
                <planeGeometry args={[isCurrent ? 4.6 : 3.8, isCurrent ? 3.05 : 2.5]} />
                <meshBasicMaterial
                  color={verse.scene.secondary}
                  transparent
                  opacity={opacity}
                  side={THREE.DoubleSide}
                  depthWrite={false}
                  blending={THREE.AdditiveBlending}
                />
                <Edges color={verse.scene.accent} linewidth={isCurrent ? 1.2 : 0.65} transparent opacity={isCurrent ? 0.75 : 0.28} />
              </mesh>
              <mesh position={[0, 0, 0.02]}>
                <ringGeometry args={[isCurrent ? 1.75 : 1.35, isCurrent ? 1.77 : 1.365, 64]} />
                <meshBasicMaterial color={verse.scene.primary} transparent opacity={isCurrent ? 0.32 : 0.12} blending={THREE.AdditiveBlending} />
              </mesh>
            </group>
          </Float>
        )
      })}
    </group>
  )
}

function CosmicKrishnaMode({ verses, onSelectVerse }: { verses: Verse[]; onSelectVerse: (index: number) => void }) {
  const positions = useMemo(() => {
    const points = new Float32Array(verses.length * 3)
    const chapterTotals = new Map<number, number>()
    verses.forEach((verse) => chapterTotals.set(verse.chapterNumber, (chapterTotals.get(verse.chapterNumber) ?? 0) + 1))

    verses.forEach((verse, index) => {
      const chapterAngle = ((verse.chapterNumber - 1) / 18) * TAU - Math.PI / 2
      const chapterPosition = (verse.verseNumber - 1) / Math.max(1, (chapterTotals.get(verse.chapterNumber) ?? 1) - 1)
      const radius = 3.9 + chapterPosition * 2.3 + Math.sin(index * 0.21) * 0.08
      const angle = chapterAngle + chapterPosition * 0.56
      points[index * 3] = Math.cos(angle) * radius
      points[index * 3 + 1] = Math.sin(angle) * radius * 0.78
      points[index * 3 + 2] = Math.sin(angle * 2.1) * 0.48
    })
    return points
  }, [verses])

  const linePositions = useMemo(() => {
    const lines = new Float32Array((verses.length - 1) * 6)
    for (let index = 0; index < verses.length - 1; index += 1) {
      const from = index * 3
      const to = (index + 1) * 3
      lines.set(positions.slice(from, from + 3), index * 6)
      lines.set(positions.slice(to, to + 3), index * 6 + 3)
    }
    return lines
  }, [positions, verses.length])

  const group = useRef<THREE.Group>(null)
  useFrame((_, delta) => {
    if (group.current) group.current.rotation.z += delta * 0.035
  })

  return (
    <group ref={group} position={[0, 0, -10]}>
      <points
        onClick={(event) => {
          event.stopPropagation()
          const index = (event as unknown as { index?: number }).index
          if (typeof index === 'number' && index < verses.length) onSelectVerse(index)
        }}
        onPointerOver={() => {
          document.body.style.cursor = 'pointer'
        }}
        onPointerOut={() => {
          document.body.style.cursor = 'default'
        }}
      >
        <bufferGeometry>
          <bufferAttribute attach="attributes-position" args={[positions, 3]} />
        </bufferGeometry>
        <pointsMaterial
          color="#7c3aed"
          size={0.105}
          sizeAttenuation
          transparent
          opacity={0.92}
          depthWrite={false}
          blending={THREE.AdditiveBlending}
        />
      </points>
      <lineSegments>
        <bufferGeometry>
          <bufferAttribute attach="attributes-position" args={[linePositions, 3]} />
        </bufferGeometry>
        <lineBasicMaterial color="#c4b5fd" transparent opacity={0.55} blending={THREE.AdditiveBlending} />
      </lineSegments>
      <mesh>
        <sphereGeometry args={[0.32, 32, 32]} />
        <meshBasicMaterial color="#5b21b6" transparent opacity={0.9} blending={THREE.AdditiveBlending} />
      </mesh>
      <mesh rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[1.05, 0.012, 8, 96]} />
        <meshBasicMaterial color="#8b5cf6" transparent opacity={0.6} blending={THREE.AdditiveBlending} />
      </mesh>
    </group>
  )
}

function CameraRig({ scrollProgress, cosmicMode }: { scrollProgress: number; cosmicMode: boolean }) {
  const { camera } = useThree()
  const target = useRef(new THREE.Vector3())
  const lookAt = useRef(new THREE.Vector3())

  useFrame((_, delta) => {
    const targetX = cosmicMode ? 0 : Math.sin(scrollProgress * Math.PI * 2.4) * 1.25
    const targetY = cosmicMode ? 3.4 : Math.cos(scrollProgress * Math.PI * 1.6) * 0.65
    const targetZ = cosmicMode ? 18 : 7.5 - scrollProgress * 19
    target.current.set(targetX, targetY, targetZ)
    camera.position.lerp(target.current, 1 - Math.exp(-delta * 2.2))
    lookAt.current.set(
      cosmicMode ? 0 : targetX * 0.16,
      cosmicMode ? 0 : targetY * 0.12,
      cosmicMode ? -10 : target.current.z - 6,
    )
    camera.lookAt(lookAt.current)
  })

  return null
}

function Scene({ verses, currentIndex, scrollProgress, cosmicMode, quality, reducedMotion, onSelectVerse, currentVerse }: SceneProps) {
  const { scene } = useThree()
  const background = useMemo(() => new THREE.Color(currentVerse.scene.fog), [currentVerse.scene.fog])
  const targetBackground = useMemo(() => new THREE.Color(), [])

  useFrame((_, delta) => {
    targetBackground.set(currentVerse.scene.fog)
    background.lerp(targetBackground, 1 - Math.exp(-delta * 0.75))
    if (scene.background instanceof THREE.Color) {
      scene.background.copy(background)
    } else {
      scene.background = background
    }
    if (scene.fog) scene.fog.color.copy(background)
  })

  return (
    <>
      <fog attach="fog" args={[currentVerse.scene.fog, 12, 48]} />
      <ambientLight intensity={0.34} color={currentVerse.scene.accent} />
      <pointLight position={[0, 0, 8]} intensity={12} distance={26} color={currentVerse.scene.primary} />
      <pointLight position={[-8, 4, -12]} intensity={8} distance={32} color={currentVerse.scene.secondary} />
      <StarField progress={scrollProgress} color={currentVerse.scene.accent} count={quality.starCount} reducedMotion={reducedMotion} />
      <Nebula verse={currentVerse} reducedMotion={reducedMotion} />
      {quality.enableEffects && <LightRays verse={currentVerse} />}
      <Tunnel verse={currentVerse} progress={scrollProgress} quality={quality} />
      <ChapterAtmosphere verse={currentVerse} quality={quality} />
      <Mandala verse={currentVerse} cosmicMode={cosmicMode} progress={scrollProgress} reducedMotion={reducedMotion} />
      {!cosmicMode && (
        <VerseWindows
          verses={verses}
          currentIndex={currentIndex}
          scrollProgress={scrollProgress}
          onSelectVerse={onSelectVerse}
        />
      )}
      {cosmicMode && <CosmicKrishnaMode verses={verses} onSelectVerse={onSelectVerse} />}
      <CameraRig scrollProgress={scrollProgress} cosmicMode={cosmicMode} />
    </>
  )
}

export default function CosmicCanvas(props: CosmicCanvasProps) {
  const sourceVerse = props.verses[props.currentIndex] ?? props.verses[0]
  const currentVerse = props.cosmicMode ? { ...sourceVerse, scene: LIGHT_SCENE } : sourceVerse

  return (
    <Canvas
      camera={{ position: [0, 0, 7.5], fov: 48, near: 0.1, far: 120 }}
      dpr={[1, props.quality.maxPixelRatio]}
      gl={{ antialias: true, alpha: false, powerPreference: 'high-performance' }}
      frameloop="always"
    >
      <Scene {...props} currentVerse={currentVerse} />
    </Canvas>
  )
}
