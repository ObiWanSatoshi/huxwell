import { useRef, useMemo } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import {
  earthVertexShader,
  earthFragmentShader,
} from '../shaders/earthShaders'

const PARTICLE_COUNT = 4000
const CONNECTION_COUNT = 600
const EARTH_RADIUS = 2.0

// Fibonacci sphere distribution for even spacing
function fibonacciSphere(count, radius) {
  const positions = []
  const goldenAngle = Math.PI * (3 - Math.sqrt(5))
  for (let i = 0; i < count; i++) {
    const y = 1 - (i / (count - 1)) * 2
    const radiusAtY = Math.sqrt(1 - y * y)
    const theta = goldenAngle * i
    positions.push(
      Math.cos(theta) * radiusAtY * radius,
      y * radius,
      Math.sin(theta) * radiusAtY * radius
    )
  }
  return positions
}

export default function EarthScene({ scrollProgress }) {
  const pointsRef = useRef()
  const linesRef = useRef()
  const groupRef = useRef()

  const { positions, randoms, phases } = useMemo(() => {
    const pos = fibonacciSphere(PARTICLE_COUNT, EARTH_RADIUS)
    const rand = new Float32Array(PARTICLE_COUNT)
    const ph = new Float32Array(PARTICLE_COUNT)
    for (let i = 0; i < PARTICLE_COUNT; i++) {
      rand[i] = Math.random()
      ph[i] = Math.random() * Math.PI * 2
    }
    return {
      positions: new Float32Array(pos),
      randoms: rand,
      phases: ph,
    }
  }, [])

  // Build connection lines between nearby particles
  const { linePositions, connectionPhases } = useMemo(() => {
    const lines = []
    const cPhases = []
    let count = 0
    const posArr = Array.from({ length: PARTICLE_COUNT }, (_, i) => [
      positions[i * 3],
      positions[i * 3 + 1],
      positions[i * 3 + 2],
    ])

    for (let i = 0; i < PARTICLE_COUNT && count < CONNECTION_COUNT; i++) {
      for (let j = i + 1; j < PARTICLE_COUNT && count < CONNECTION_COUNT; j++) {
        const dx = posArr[i][0] - posArr[j][0]
        const dy = posArr[i][1] - posArr[j][1]
        const dz = posArr[i][2] - posArr[j][2]
        const dist = Math.sqrt(dx * dx + dy * dy + dz * dz)
        if (dist < 0.45) {
          lines.push(...posArr[i], ...posArr[j])
          cPhases.push(Math.random() * Math.PI * 2, Math.random() * Math.PI * 2)
          count++
        }
      }
    }

    return {
      linePositions: new Float32Array(lines),
      connectionPhases: new Float32Array(cPhases),
    }
  }, [positions])

  const pointUniforms = useMemo(
    () => ({
      uTime: { value: 0 },
      uScrollProgress: { value: 0 },
    }),
    []
  )

  const lineUniforms = useMemo(
    () => ({
      uScrollProgress: { value: 0 },
    }),
    []
  )

  useFrame((state) => {
    const t = state.clock.elapsedTime
    pointUniforms.uTime.value = t
    pointUniforms.uScrollProgress.value = scrollProgress.current
    lineUniforms.uScrollProgress.value = scrollProgress.current

    if (groupRef.current) {
      groupRef.current.rotation.y = t * 0.05
      // Zoom out effect after 50% scroll
      const zoomOut = THREE.MathUtils.lerp(0, -1.5, Math.max(0, (scrollProgress.current - 0.5) * 2))
      groupRef.current.position.z = zoomOut
    }
  })

  return (
    <group ref={groupRef}>
      {/* Earth particle sphere */}
      <points ref={pointsRef}>
        <bufferGeometry>
          <bufferAttribute
            attach="attributes-position"
            array={positions}
            count={PARTICLE_COUNT}
            itemSize={3}
          />
          <bufferAttribute
            attach="attributes-aRandom"
            array={randoms}
            count={PARTICLE_COUNT}
            itemSize={1}
          />
          <bufferAttribute
            attach="attributes-aPhase"
            array={phases}
            count={PARTICLE_COUNT}
            itemSize={1}
          />
        </bufferGeometry>
        <shaderMaterial
          vertexShader={earthVertexShader}
          fragmentShader={earthFragmentShader}
          uniforms={pointUniforms}
          transparent
          depthWrite={false}
          blending={THREE.AdditiveBlending}
        />
      </points>

      {/* Connection lines */}
      <lineSegments ref={linesRef}>
        <bufferGeometry>
          <bufferAttribute
            attach="attributes-position"
            array={linePositions}
            count={linePositions.length / 3}
            itemSize={3}
          />
          <bufferAttribute
            attach="attributes-aConnectionPhase"
            array={connectionPhases}
            count={connectionPhases.length}
            itemSize={1}
          />
        </bufferGeometry>
        <shaderMaterial
          vertexShader={`
            uniform float uScrollProgress;
            attribute float aConnectionPhase;
            varying float vLineAlpha;
            void main() {
              gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
              float appear = smoothstep(0.0, 0.5, uScrollProgress);
              vLineAlpha = appear * (0.15 + 0.15 * sin(aConnectionPhase));
            }
          `}
          fragmentShader={`
            varying float vLineAlpha;
            void main() {
              gl_FragColor = vec4(1.0, 1.0, 1.0, vLineAlpha);
            }
          `}
          uniforms={lineUniforms}
          transparent
          depthWrite={false}
          blending={THREE.AdditiveBlending}
        />
      </lineSegments>

      {/* Wireframe sphere outline */}
      <mesh>
        <sphereGeometry args={[EARTH_RADIUS * 1.001, 32, 32]} />
        <meshBasicMaterial
          color="#ffffff"
          wireframe
          transparent
          opacity={0.03}
        />
      </mesh>
    </group>
  )
}
