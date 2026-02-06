import { useRef } from 'react'
import { useFrame } from '@react-three/fiber'
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

function SceneContent({ mode, scrollProgress, mouse }) {
  const earthRef = useRef()
  const brainRef = useRef()
  const earthScale = useRef(mode === 'world' ? 1 : 0)
  const brainScale = useRef(mode === 'mind' ? 1 : 0)

  useFrame(() => {
    const earthTarget = mode === 'world' ? 1 : 0
    const brainTarget = mode === 'mind' ? 1 : 0

    earthScale.current = THREE.MathUtils.lerp(earthScale.current, earthTarget, 0.04)
    brainScale.current = THREE.MathUtils.lerp(brainScale.current, brainTarget, 0.04)

    if (earthRef.current) {
      earthRef.current.scale.setScalar(earthScale.current)
      earthRef.current.visible = earthScale.current > 0.01
    }
    if (brainRef.current) {
      brainRef.current.scale.setScalar(brainScale.current)
      brainRef.current.visible = brainScale.current > 0.01
    }
  })

  return (
    <>
      <group ref={earthRef}>
        <EarthScene scrollProgress={scrollProgress} mouse={mouse} />
      </group>
      <group ref={brainRef} scale={0}>
        <BrainScene scrollProgress={scrollProgress} mouse={mouse} />
      </group>
    </>
  )
}

export default function SceneContainer({ mode, scrollProgress, mouse }) {
  return (
    <ScrollControls pages={3} damping={0.3}>
      <ScrollTracker scrollProgress={scrollProgress} />
      <SceneContent mode={mode} scrollProgress={scrollProgress} mouse={mouse} />
    </ScrollControls>
  )
}
