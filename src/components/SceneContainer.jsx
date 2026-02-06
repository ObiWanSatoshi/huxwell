import { useRef, useEffect } from 'react'
import { useThree, useFrame } from '@react-three/fiber'
import { ScrollControls, useScroll } from '@react-three/drei'
import * as THREE from 'three'
import EarthScene from './EarthScene'
import BrainScene from './BrainScene'

function ScrollTracker({ scrollProgress }) {
  const scroll = useScroll()

  useFrame(() => {
    scrollProgress.current = scroll.offset
  })

  return null
}

function SceneContent({ mode, scrollProgress, transitionProgress }) {
  const earthRef = useRef()
  const brainRef = useRef()

  useFrame(() => {
    if (earthRef.current) {
      const earthOpacity = mode === 'world' ? 1 : 0
      earthRef.current.visible = transitionProgress.current > 0.01
      earthRef.current.scale.setScalar(
        THREE.MathUtils.lerp(earthRef.current.scale.x, earthOpacity, 0.05)
      )
    }
    if (brainRef.current) {
      const brainOpacity = mode === 'mind' ? 1 : 0
      brainRef.current.visible = transitionProgress.current < 0.99
      brainRef.current.scale.setScalar(
        THREE.MathUtils.lerp(brainRef.current.scale.x, brainOpacity, 0.05)
      )
    }
  })

  return (
    <>
      <group ref={earthRef}>
        <EarthScene scrollProgress={scrollProgress} />
      </group>
      <group ref={brainRef} scale={0}>
        <BrainScene scrollProgress={scrollProgress} />
      </group>
    </>
  )
}

export default function SceneContainer({ mode, scrollProgress }) {
  const transitionProgress = useRef(mode === 'world' ? 1 : 0)

  useEffect(() => {
    // Track target for smooth transition
    const target = mode === 'world' ? 1 : 0
    const animate = () => {
      transitionProgress.current = THREE.MathUtils.lerp(
        transitionProgress.current,
        target,
        0.05
      )
      if (Math.abs(transitionProgress.current - target) > 0.001) {
        requestAnimationFrame(animate)
      }
    }
    animate()
  }, [mode])

  return (
    <ScrollControls pages={3} damping={0.25}>
      <ScrollTracker scrollProgress={scrollProgress} />
      <SceneContent
        mode={mode}
        scrollProgress={scrollProgress}
        transitionProgress={transitionProgress}
      />

      {/* Ambient lighting */}
      <ambientLight intensity={0.3} />
      <pointLight position={[10, 10, 10]} intensity={0.5} />
    </ScrollControls>
  )
}
