import { useRef, useMemo } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import {
  earthVertexShader,
  earthFragmentShader,
} from '../shaders/earthShaders'

const NODE_COUNT = 800
const EARTH_RADIUS = 2.0

function fibonacciSphere(count, radius) {
  const positions = []
  const normals = []
  const goldenAngle = Math.PI * (3 - Math.sqrt(5))
  for (let i = 0; i < count; i++) {
    const y = 1 - (i / (count - 1)) * 2
    const r = Math.sqrt(1 - y * y)
    const theta = goldenAngle * i
    const x = Math.cos(theta) * r
    const z = Math.sin(theta) * r
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
    const { positions: pos, normals: nrm } = fibonacciSphere(NODE_COUNT, EARTH_RADIUS)
    const rand = new Float32Array(NODE_COUNT)
    const ph = new Float32Array(NODE_COUNT)
    for (let i = 0; i < NODE_COUNT; i++) {
      rand[i] = Math.random()
      ph[i] = Math.random() * Math.PI * 2
    }

    // Sparse connection lines between nearby nodes
    const lines = []
    const posArr = Array.from({ length: NODE_COUNT }, (_, i) => [
      pos[i * 3], pos[i * 3 + 1], pos[i * 3 + 2]
    ])
    let count = 0
    const maxLines = 350
    for (let i = 0; i < NODE_COUNT && count < maxLines; i += 2) {
      for (let j = i + 1; j < NODE_COUNT && count < maxLines; j += 2) {
        const dx = posArr[i][0] - posArr[j][0]
        const dy = posArr[i][1] - posArr[j][1]
        const dz = posArr[i][2] - posArr[j][2]
        const d = Math.sqrt(dx * dx + dy * dy + dz * dz)
        if (d > 0.2 && d < 0.55) {
          lines.push(...posArr[i], ...posArr[j])
          count++
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

  const pointUniforms = useMemo(() => ({
    uTime: { value: 0 },
    uScrollProgress: { value: 0 },
    uMouse: { value: new THREE.Vector2(0, 0) },
  }), [])

  const lineUniforms = useMemo(() => ({
    uScrollProgress: { value: 0 },
  }), [])

  useFrame((state) => {
    const t = state.clock.elapsedTime
    const mx = mouse.current.x
    const my = mouse.current.y

    pointUniforms.uTime.value = t
    pointUniforms.uScrollProgress.value = scrollProgress.current
    pointUniforms.uMouse.value.set(mx, my)
    lineUniforms.uScrollProgress.value = scrollProgress.current

    // Smooth cursor-driven tilt + auto rotation
    const targetRotX = my * 0.15
    const targetRotY = t * 0.04 + mx * 0.25
    rotX.current = THREE.MathUtils.lerp(rotX.current, targetRotX, 0.03)
    rotY.current = THREE.MathUtils.lerp(rotY.current, targetRotY, 0.03)

    if (groupRef.current) {
      groupRef.current.rotation.x = rotX.current
      groupRef.current.rotation.y = rotY.current
      const zoom = THREE.MathUtils.lerp(0, -1.0, Math.max(0, (scrollProgress.current - 0.5) * 2))
      groupRef.current.position.z = zoom
    }
  })

  return (
    <group ref={groupRef}>
      {/* Wireframe icosahedron — gives clear globe structure */}
      <mesh>
        <icosahedronGeometry args={[EARTH_RADIUS, 3]} />
        <meshBasicMaterial wireframe color="#ffffff" transparent opacity={0.035} />
      </mesh>

      {/* Inner wireframe for depth */}
      <mesh>
        <icosahedronGeometry args={[EARTH_RADIUS * 0.97, 2]} />
        <meshBasicMaterial wireframe color="#ffffff" transparent opacity={0.015} />
      </mesh>

      {/* Surface nodes */}
      <points>
        <bufferGeometry>
          <bufferAttribute attach="attributes-position" array={positions} count={NODE_COUNT} itemSize={3} />
          <bufferAttribute attach="attributes-normal" array={normals} count={NODE_COUNT} itemSize={3} />
          <bufferAttribute attach="attributes-aRandom" array={randoms} count={NODE_COUNT} itemSize={1} />
          <bufferAttribute attach="attributes-aPhase" array={phases} count={NODE_COUNT} itemSize={1} />
        </bufferGeometry>
        <shaderMaterial
          vertexShader={earthVertexShader}
          fragmentShader={earthFragmentShader}
          uniforms={pointUniforms}
          transparent
          depthWrite={false}
        />
      </points>

      {/* Connection lines — appear on scroll */}
      <lineSegments>
        <bufferGeometry>
          <bufferAttribute
            attach="attributes-position"
            array={linePositions}
            count={linePositions.length / 3}
            itemSize={3}
          />
        </bufferGeometry>
        <shaderMaterial
          vertexShader={`
            uniform float uScrollProgress;
            varying float vAlpha;
            void main() {
              gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
              vAlpha = smoothstep(0.05, 0.4, uScrollProgress) * 0.12;
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
    </group>
  )
}
