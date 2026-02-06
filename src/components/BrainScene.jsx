import { useRef, useMemo } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import {
  brainVertexShader,
  brainFragmentShader,
} from '../shaders/brainShaders'

const BRAIN_PARTICLES = 1800
const TRANSISTOR_PARTICLES = 600
const TOTAL = BRAIN_PARTICLES + TRANSISTOR_PARTICLES

function generateBrainPoint() {
  const theta = Math.random() * Math.PI * 2
  const phi = Math.acos(2 * Math.random() - 1)

  let x = Math.sin(phi) * Math.cos(theta)
  let y = Math.sin(phi) * Math.sin(theta)
  let z = Math.cos(phi)

  // Brain proportions: wider, shorter
  x *= 1.35
  y *= 1.05
  z *= 1.15

  // Hemisphere split
  x += x > 0 ? 0.07 : -0.07

  // Flatten top
  if (y > 0.7) y *= 0.85

  // Frontal lobe bulge
  if (z > 0.4) {
    const f = 1.0 + 0.2 * Math.exp(-(z - 0.7) * (z - 0.7) * 5)
    x *= f
  }

  // Temporal lobe
  if (y < -0.3 && Math.abs(x) > 0.5) {
    const t = 1.0 + 0.15 * Math.exp(-(y + 0.5) * (y + 0.5) * 4)
    z *= t
  }

  // Cerebellum (back-bottom)
  if (z < -0.5 && y < -0.2) {
    const c = 1.0 + 0.2 * Math.exp(-(z + 0.7) * (z + 0.7) * 4 - (y + 0.4) * (y + 0.4) * 3)
    x *= c * 0.8
  }

  // Surface folds (sulci/gyri)
  const r = Math.sqrt(x * x + y * y + z * z)
  const fold = Math.sin(x * 8) * Math.cos(y * 6) * Math.sin(z * 7) * 0.08
  const s = (r + fold) / (r || 1)

  return [x * s, y * s, z * s]
}

export default function BrainScene({ scrollProgress, mouse }) {
  const groupRef = useRef()
  const rotX = useRef(0)
  const rotY = useRef(0)

  const { positions, randoms, phases, isTransistors, isSurface } = useMemo(() => {
    const pos = []
    const rand = new Float32Array(TOTAL)
    const ph = new Float32Array(TOTAL)
    const trans = new Float32Array(TOTAL)
    const surf = new Float32Array(TOTAL)

    // Brain particles: 70% surface (clear silhouette), 30% interior (atmosphere)
    const surfaceCount = Math.floor(BRAIN_PARTICLES * 0.7)
    for (let i = 0; i < BRAIN_PARTICLES; i++) {
      const [bx, by, bz] = generateBrainPoint()
      const onSurface = i < surfaceCount
      const rFrac = onSurface
        ? 0.85 + Math.random() * 0.15
        : Math.cbrt(Math.random()) * 0.85
      pos.push(bx * rFrac, by * rFrac, bz * rFrac)
      rand[i] = Math.random()
      ph[i] = Math.random() * Math.PI * 2
      trans[i] = 0.0
      surf[i] = onSurface ? 1.0 : 0.0
    }

    // Transistor particles: on surface, protrude on scroll
    for (let i = 0; i < TRANSISTOR_PARTICLES; i++) {
      const idx = BRAIN_PARTICLES + i
      const [bx, by, bz] = generateBrainPoint()
      const surfaceBias = 0.88 + Math.random() * 0.2
      pos.push(bx * surfaceBias, by * surfaceBias, bz * surfaceBias)
      rand[idx] = Math.random()
      ph[idx] = Math.random() * Math.PI * 2
      trans[idx] = 1.0
      surf[idx] = 1.0
    }

    return {
      positions: new Float32Array(pos),
      randoms: rand,
      phases: ph,
      isTransistors: trans,
      isSurface: surf,
    }
  }, [])

  const uniforms = useMemo(() => ({
    uTime: { value: 0 },
    uScrollProgress: { value: 0 },
    uMouse: { value: new THREE.Vector2(0, 0) },
  }), [])

  useFrame((state) => {
    const t = state.clock.elapsedTime
    const mx = mouse.current.x
    const my = mouse.current.y

    uniforms.uTime.value = t
    uniforms.uScrollProgress.value = scrollProgress.current
    uniforms.uMouse.value.set(mx, my)

    const targetRotX = Math.sin(t * 0.2) * 0.08 + my * 0.15
    const targetRotY = t * 0.06 + mx * 0.25
    rotX.current = THREE.MathUtils.lerp(rotX.current, targetRotX, 0.03)
    rotY.current = THREE.MathUtils.lerp(rotY.current, targetRotY, 0.03)

    if (groupRef.current) {
      groupRef.current.rotation.x = rotX.current
      groupRef.current.rotation.y = rotY.current
    }
  })

  return (
    <group ref={groupRef} scale={1.5}>
      <points>
        <bufferGeometry>
          <bufferAttribute attach="attributes-position" array={positions} count={TOTAL} itemSize={3} />
          <bufferAttribute attach="attributes-aRandom" array={randoms} count={TOTAL} itemSize={1} />
          <bufferAttribute attach="attributes-aPhase" array={phases} count={TOTAL} itemSize={1} />
          <bufferAttribute attach="attributes-aIsTransistor" array={isTransistors} count={TOTAL} itemSize={1} />
          <bufferAttribute attach="attributes-aIsSurface" array={isSurface} count={TOTAL} itemSize={1} />
        </bufferGeometry>
        <shaderMaterial
          vertexShader={brainVertexShader}
          fragmentShader={brainFragmentShader}
          uniforms={uniforms}
          transparent
          depthWrite={false}
        />
      </points>
    </group>
  )
}
