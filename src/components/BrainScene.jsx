import { useRef, useMemo } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import {
  brainVertexShader,
  brainFragmentShader,
} from '../shaders/brainShaders'

const BRAIN_PARTICLES = 3500
const TRANSISTOR_PARTICLES = 1500
const TOTAL = BRAIN_PARTICLES + TRANSISTOR_PARTICLES

// Generate a brain-like shape using superellipsoid + lobes
function generateBrainPoint() {
  // Start with a slightly flattened ellipsoid
  const theta = Math.random() * Math.PI * 2
  const phi = Math.acos(2 * Math.random() - 1)

  let x = Math.sin(phi) * Math.cos(theta)
  let y = Math.sin(phi) * Math.sin(theta)
  let z = Math.cos(phi)

  // Scale to brain proportions: wider, shorter, deeper
  x *= 1.4
  y *= 1.1
  z *= 1.0

  // Add lobe separation: push apart the two hemispheres
  const hemisphereGap = 0.08
  if (x > 0) x += hemisphereGap
  else x -= hemisphereGap

  // Add frontal lobe bulge
  if (z > 0.3) {
    const bulgeFactor = 1.0 + 0.3 * Math.exp(-((z - 0.8) ** 2) * 4)
    x *= bulgeFactor
    y *= bulgeFactor
  }

  // Add temporal lobe bulge (sides, lower)
  if (y < -0.2) {
    const temporalBulge = 1.0 + 0.2 * Math.exp(-((y + 0.6) ** 2) * 5)
    x *= temporalBulge
    z *= temporalBulge
  }

  // Cerebellum (back-bottom bump)
  if (z < -0.5 && y < 0) {
    const cerebellum = 1.0 + 0.25 * Math.exp(-((z + 0.8) ** 2 + (y + 0.3) ** 2) * 4)
    x *= cerebellum
  }

  // Add surface wrinkle noise (sulci/gyri)
  const noiseScale = 0.15
  const wrinkle = Math.sin(x * 12) * Math.sin(y * 10) * Math.sin(z * 8) * noiseScale
  const r = Math.sqrt(x * x + y * y + z * z)
  const nr = r + wrinkle
  const scale = nr / (r || 1)

  return [x * scale, y * scale, z * scale]
}

export default function BrainScene({ scrollProgress }) {
  const pointsRef = useRef()
  const groupRef = useRef()

  const { positions, randoms, phases, isTransistors } = useMemo(() => {
    const pos = []
    const rand = new Float32Array(TOTAL)
    const ph = new Float32Array(TOTAL)
    const trans = new Float32Array(TOTAL)

    // Brain organic particles (filled volume)
    for (let i = 0; i < BRAIN_PARTICLES; i++) {
      const [bx, by, bz] = generateBrainPoint()
      // Fill volume: random radius fraction
      const rFrac = Math.cbrt(Math.random())
      pos.push(bx * rFrac, by * rFrac, bz * rFrac)
      rand[i] = Math.random()
      ph[i] = Math.random() * Math.PI * 2
      trans[i] = 0.0
    }

    // Transistor particles (surface + protruding)
    for (let i = 0; i < TRANSISTOR_PARTICLES; i++) {
      const idx = BRAIN_PARTICLES + i
      const [bx, by, bz] = generateBrainPoint()
      // Place on surface with slight outward bias
      const surfaceBias = 0.85 + Math.random() * 0.3
      pos.push(bx * surfaceBias, by * surfaceBias, bz * surfaceBias)
      rand[idx] = Math.random()
      ph[idx] = Math.random() * Math.PI * 2
      trans[idx] = 1.0
    }

    return {
      positions: new Float32Array(pos),
      randoms: rand,
      phases: ph,
      isTransistors: trans,
    }
  }, [])

  const uniforms = useMemo(
    () => ({
      uTime: { value: 0 },
      uScrollProgress: { value: 0 },
    }),
    []
  )

  useFrame((state) => {
    const t = state.clock.elapsedTime
    uniforms.uTime.value = t
    uniforms.uScrollProgress.value = scrollProgress.current

    if (groupRef.current) {
      groupRef.current.rotation.y = t * 0.08
      groupRef.current.rotation.x = Math.sin(t * 0.3) * 0.1
    }
  })

  return (
    <group ref={groupRef} scale={1.5}>
      <points ref={pointsRef}>
        <bufferGeometry>
          <bufferAttribute
            attach="attributes-position"
            array={positions}
            count={TOTAL}
            itemSize={3}
          />
          <bufferAttribute
            attach="attributes-aRandom"
            array={randoms}
            count={TOTAL}
            itemSize={1}
          />
          <bufferAttribute
            attach="attributes-aPhase"
            array={phases}
            count={TOTAL}
            itemSize={1}
          />
          <bufferAttribute
            attach="attributes-aIsTransistor"
            array={isTransistors}
            count={TOTAL}
            itemSize={1}
          />
        </bufferGeometry>
        <shaderMaterial
          vertexShader={brainVertexShader}
          fragmentShader={brainFragmentShader}
          uniforms={uniforms}
          transparent
          depthWrite={false}
          blending={THREE.AdditiveBlending}
        />
      </points>
    </group>
  )
}
