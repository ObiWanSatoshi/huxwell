import { useRef } from 'react'
import { useFrame } from '@react-three/fiber'

export default function Globe() {
  const groupRef = useRef()

  useFrame((state) => {
    if (groupRef.current) {
      groupRef.current.rotation.y = state.clock.elapsedTime * 0.05
    }
  })

  return (
    <group ref={groupRef}>
      {/* Primary wireframe globe */}
      <mesh>
        <icosahedronGeometry args={[2, 2]} />
        <meshBasicMaterial
          wireframe
          color="#ffffff"
          transparent
          opacity={0.12}
        />
      </mesh>

      {/* Inner structure for depth */}
      <mesh>
        <icosahedronGeometry args={[1.95, 1]} />
        <meshBasicMaterial
          wireframe
          color="#ffffff"
          transparent
          opacity={0.04}
        />
      </mesh>
    </group>
  )
}
