import { useRef, useMemo } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import {
  earthVertexShader,
  earthFragmentShader,
} from '../shaders/earthShaders'

const PARTICLE_COUNT = 2000
const EARTH_RADIUS = 2.0

function fibonacciSphere(count, radius) {
  const positions = []
  const normals = []
  const goldenAngle = Math.PI * (3 - Math.sqrt(5))
  for (let i = 0; i < count; i++) {
    const y = 1 - (i / (count - 1)) * 2
    const radiusAtY = Math.sqrt(1 - y * y)
    const theta = goldenAngle * i
    const x = Math.cos(theta) * radiusAtY
    const z = Math.sin(theta) * radiusAtY
    positions.push(x * radius, y * radius, z * radius)
    normals.push(x, y, z)
  }
  return { positions, normals }
}

export default function EarthScene({ scrollProgress, mouse }) {
  const groupRef = useRef()
  const rotX = useRef(0)
  const rotY = useRef(0)

  const { positions, normals, randoms, phases, linePositions } = useMemo(() => {
    const { positions: pos, normals: nrm } = fibonacciSphere(PARTICLE_COUNT, EARTH_RADIUS)
    const rand = new Float32Array(PARTICLE_COUNT)
    const ph = new Float32Array(PARTICLE_COUNT)
    for (let i = 0; i < PARTICLE_COUNT; i++) {
      rand[i] = Math.random()
      ph[i] = Math.random() * Math.PI * 2
    }

    // Sparse connection lines
    const lines = []
    const posArr = []
    for (let i = 0; i < PARTICLE_COUNT; i++) {
      posArr.push([pos[i * 3], pos[i * 3 + 1], pos[i * 3 + 2]])
    }
    let lineCount = 0
    const maxLines = 300
    for (let i = 0; i < PARTICLE_COUNT && lineCount < maxLines; i += 3) {
      for (let j = i + 1; j < PARTICLE_COUNT && lineCount < maxLines; j += 3) {
        const dx = posArr[i][0] - posArr[j][0]
        const dy = posArr[i][1] - posArr[j][1]
        const dz = posArr[i][2] - posArr[j][2]
        const dist = Math.sqrt(dx * dx + dy * dy + dz * dz)
        if (dist < 0.5 && dist > 0.15) {
          lines.push(...posArr[i], ...posArr[j])
          lineCount++
        }
      }
    }

    return {
      positions: new Float32Array(pos),
      normals: new Float32Array(nrm),
      randoms: rand,
      phases: ph,
      linePositions: new Float32Array(lines),
    }
  }, [])

  const pointUniforms = useMemo(
    () => ({
      uTime: { value: 0 },
      uScrollProgress: { value: 0 },
      uMouse: { value: new THREE.Vector2(0, 0) },
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
    const mx = mouse.current.x
    const my = mouse.current.y

    pointUniforms.uTime.value = t
    pointUniforms.uScrollProgress.value = scrollProgress.current
    pointUniforms.uMouse.value.set(mx, my)
    lineUniforms.uScrollProgress.value = scrollProgress.current

    // Smooth cursor-driven tilt
    const targetRotX = my * 0.15
    const targetRotY = t * 0.04 + mx * 0.3
    rotX.current = THREE.MathUtils.lerp(rotX.current, targetRotX, 0.03)
    rotY.current = THREE.MathUtils.lerp(rotY.current, targetRotY, 0.03)

    if (groupRef.current) {
      groupRef.current.rotation.x = rotX.current
      groupRef.current.rotation.y = rotY.current

      const zoomOut = THREE.MathUtils.lerp(0, -1.2, Math.max(0, (scrollProgress.current - 0.5) * 2))
      groupRef.current.position.z = zoomOut
    }
  })

  return (
    <group ref={groupRef}>
      <points>
        <bufferGeometry>
          <bufferAttribute attach="attributes-position" array={positions} count={PARTICLE_COUNT} itemSize={3} />
          <bufferAttribute attach="attributes-normal" array={normals} count={PARTICLE_COUNT} itemSize={3} />
          <bufferAttribute attach="attributes-aRandom" array={randoms} count={PARTICLE_COUNT} itemSize={1} />
          <bufferAttribute attach="attributes-aPhase" array={phases} count={PARTICLE_COUNT} itemSize={1} />
        </bufferGeometry>
        <shaderMaterial
          vertexShader={earthVertexShader}
          fragmentShader={earthFragmentShader}
          uniforms={pointUniforms}
          transparent
          depthWrite={false}
        />
      </points>

      {/* Sparse connection lines */}
      <lineSegments>
        <bufferGeometry>
          <bufferAttribute attach="attributes-position" array={linePositions} count={linePositions.length / 3} itemSize={3} />
        </bufferGeometry>
        <shaderMaterial
          vertexShader={`
            uniform float uScrollProgress;
            varying float vAlpha;
            void main() {
              gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
              vAlpha = smoothstep(0.0, 0.5, uScrollProgress) * 0.08;
            }
          `}
          fragmentShader={`
            varying float vAlpha;
            void main() {
              gl_FragColor = vec4(1.0, 1.0, 1.0, vAlpha);
            }
          `}
          uniforms={lineUniforms}
          transparent
          depthWrite={false}
        />
      </lineSegments>

      {/* Faint wireframe outline */}
      <mesh>
        <sphereGeometry args={[EARTH_RADIUS * 1.002, 24, 24]} />
        <meshBasicMaterial color="#ffffff" wireframe transparent opacity={0.015} />
      </mesh>
    </group>
  )
}
