import { useState, useRef, useEffect, Suspense } from 'react'
import { Canvas } from '@react-three/fiber'
import SceneContainer from './components/SceneContainer'
import UIOverlay from './components/UIOverlay'

function Loader() {
  return (
    <div className="fixed inset-0 z-50 bg-black flex items-center justify-center">
      <p className="font-cinzel text-lg tracking-[0.3em] text-white/40 animate-pulse">
        hu<span className="font-bold">X</span>well
      </p>
    </div>
  )
}

export default function App() {
  const [mode, setMode] = useState('world')
  const scrollProgress = useRef(0)
  const mouse = useRef({ x: 0, y: 0 })

  useEffect(() => {
    const handleMouseMove = (e) => {
      mouse.current.x = (e.clientX / window.innerWidth) * 2 - 1
      mouse.current.y = -(e.clientY / window.innerHeight) * 2 + 1
    }
    window.addEventListener('mousemove', handleMouseMove)
    return () => window.removeEventListener('mousemove', handleMouseMove)
  }, [])

  const handleToggle = () => {
    setMode((prev) => (prev === 'world' ? 'mind' : 'world'))
  }

  return (
    <div className="w-screen h-screen bg-black overflow-hidden relative">
      <Suspense fallback={<Loader />}>
        <Canvas
          camera={{ position: [0, 0, 6], fov: 45 }}
          dpr={[1, 1.5]}
          gl={{
            antialias: true,
            alpha: false,
            powerPreference: 'high-performance',
          }}
          style={{ position: 'absolute', inset: 0 }}
        >
          <color attach="background" args={['#000000']} />
          <SceneContainer mode={mode} scrollProgress={scrollProgress} mouse={mouse} />
        </Canvas>
      </Suspense>

      <UIOverlay
        mode={mode}
        onToggle={handleToggle}
        scrollProgress={scrollProgress}
      />
    </div>
  )
}
