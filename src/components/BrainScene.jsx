import { useRef, useMemo } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import {
  brainVertexShader,
  brainFragmentShader,
} from '../shaders/brainShaders'

const BRAIN_PARTICLES = 2000
const TRANSISTOR_PARTICLES = 800
const TOTAL = BRAIN_PARTICLES + TRANSISTOR_PARTICLES

function generateBrainPoint() {
  const theta = Math.random() * Math.PI * 2
  const phi = Math.acos(2 * Math.random() - 1)

  let x = Math.sin(phi) * Math.cos(theta)
  let y = Math.sin(phi) * Math.sin(theta)
  let z = Math.cos(phi)

  x *= 1.3
  y *= 1.05
  z *= 1.0

  if (x > 0) x += 0.06
  else x -= 0.06

  if (z > 0.3) {
    const bulge = 1.0 + 0.25 * Math.exp(-((z - 0.8) ** 2) * 4)
    x *= bulge
    y *= bulge
  }

  if (y < -0.2) {
    const bulge = 1.0 + 0.15 * Math.exp(-((y + 0.6) ** 2) * 5)
    x *= bulge
    z *= bulge
  }

  const wrinkle = Math.sin(x * 10) * Math.sin(y * 8) * Math.sin(z * 6) * 0.1
  const r = Math.sqrt(x * x + y * y + z * z)
  const scale = (r + wrinkle) / (r || 1)

  return [x * scale, y * scale, z * scale]
}

export default function BrainScene({ scrollProgress, mouse }) {
  const groupRef = useRef()
  const rotX = useRef(0)
  const rotY = useRef(0)

  const { positions, randoms, phases, isTransistors } = useMemo(() => {
    const pos = []
    const rand = new Float32Array(TOTAL)
    const ph = new Float32Array(TOTAL)
    const trans = new Float32Array(TOTAL)

    for (let i = 0; i < BRAIN_PARTICLES; i++) {
      const [bx, by, bz] = generateBrainPoint()
      const rFrac = Math.cbrt(Math.random())
      pos.push(bx * rFrac, by * rFrac, bz * rFrac)
      rand[i] = Math.random()
      ph[i] = Math.random() * Math.PI * 2
      trans[i] = 0.0
    }

    for (let i = 0; i < TRANSISTOR_PARTICLES; i++) {
      const idx = BRAIN_PARTICLES + i
      const [bx, by, bz] = generateBrainPoint()
      const surfaceBias = 0.85 + Math.random() * 0.25
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
      uMouse: { value: new THREE.Vector2(0, 0) },
    }),
    []
  )

  useFrame((state) => {
    const t = state.clock.elapsedTime
    const mx = mouse.current.x
    const my = mouse.current.y

    uniforms.uTime.value = t
    uniforms.uScrollProgress.value = scrollProgress.current
    uniforms.uMouse.value.set(mx, my)

    // Smooth cursor-driven tilt
    const targetRotX = Math.sin(t * 0.2) * 0.08 + my * 0.15
    const targetRotY = t * 0.06 + mx * 0.3
    rotX.current = THREE.MathUtils.lerp(rotX.current, targetRotX, 0.03)
    rotY.current = THREE.MathUtils.lerp(rotY.current, targetRotY, 0.03)

    if (groupRef.current) {
      groupRef.current.rotation.x = rotX.current
      groupRef.current.rotation.y = rotY.current
    }
  })

  return (
    <group ref={groupRef} scale={1.4}>
      <points>
        <bufferGeometry>
          <bufferAttribute attach="attributes-position" array={positions} count={TOTAL} itemSize={3} />
          <bufferAttribute attach="attributes-aRandom" array={randoms} count={TOTAL} itemSize={1} />
          <bufferAttribute attach="attributes-aPhase" array={phases} count={TOTAL} itemSize={1} />
          <bufferAttribute attach="attributes-aIsTransistor" array={isTransistors} count={TOTAL} itemSize={1} />
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
