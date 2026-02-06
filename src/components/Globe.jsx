import { useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { OrbitControls } from '@react-three/drei'

export default function Globe() {
  const groupRef = useRef()

  useFrame((state) => {
    if (groupRef.current) {
      // Slow auto-rotation (OrbitControls drag will add on top of this)
      groupRef.current.rotation.y += 0.002
    }
  })

  return (
    <>
      {/* Drag to spin — no zoom, no pan, just rotation */}
      <OrbitControls
        enableZoom={false}
        enablePan={false}
        enableDamping
        dampingFactor={0.05}
        rotateSpeed={0.5}
      />

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
    </>
  )
}
