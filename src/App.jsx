import { useState, useRef, Suspense } from 'react'
import { Canvas } from '@react-three/fiber'
import SceneContainer from './components/SceneContainer'
import UIOverlay from './components/UIOverlay'

function Loader() {
  return (
    <div className="fixed inset-0 z-50 bg-black flex flex-col items-center justify-center">
      <p className="font-cinzel text-xl tracking-[0.3em] text-white/60 animate-pulse">
        hu<span>X</span>well
      </p>
    </div>
  )
}

export default function App() {
  const [mode, setMode] = useState('world')
  const scrollProgress = useRef(0)

  const handleToggle = () => {
    setMode((prev) => (prev === 'world' ? 'mind' : 'world'))
    scrollProgress.current = 0
  }

  return (
    <div className="w-screen h-screen bg-black overflow-hidden relative">
      {/* 3D Canvas */}
      <Suspense fallback={<Loader />}>
        <Canvas
          camera={{ position: [0, 0, 6], fov: 50 }}
          dpr={[1, 2]}
          gl={{
            antialias: true,
            alpha: false,
            powerPreference: 'high-performance',
          }}
          style={{ position: 'absolute', inset: 0 }}
        >
          <color attach="background" args={['#000000']} />
          <fog attach="fog" args={['#000000', 8, 20]} />
          <SceneContainer mode={mode} scrollProgress={scrollProgress} />
        </Canvas>
      </Suspense>

      {/* HTML UI Overlay */}
      <UIOverlay
        mode={mode}
        onToggle={handleToggle}
        scrollProgress={scrollProgress}
      />
    </div>
  )
}
