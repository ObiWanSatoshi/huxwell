import { useState, useRef, useEffect, Suspense } from 'react'
import { Canvas } from '@react-three/fiber'
import { motion } from 'framer-motion'
import SceneContainer from './components/SceneContainer'
import UIOverlay from './components/UIOverlay'

export default function App() {
  const [mode, setMode] = useState('world')
  const [loaded, setLoaded] = useState(false)
  const scrollProgress = useRef(0)
  const mouse = useRef({ x: 0, y: 0 })

  useEffect(() => {
    const handleMouseMove = (e) => {
      mouse.current.x = (e.clientX / window.innerWidth) * 2 - 1
      mouse.current.y = -(e.clientY / window.innerHeight) * 2 + 1
    }
    const handleTouch = (e) => {
      const t = e.touches[0]
      mouse.current.x = (t.clientX / window.innerWidth) * 2 - 1
      mouse.current.y = -(t.clientY / window.innerHeight) * 2 + 1
    }

    window.addEventListener('mousemove', handleMouseMove)
    window.addEventListener('touchmove', handleTouch, { passive: true })

    // Let 3D initialize before revealing
    const timer = setTimeout(() => setLoaded(true), 900)

    return () => {
      window.removeEventListener('mousemove', handleMouseMove)
      window.removeEventListener('touchmove', handleTouch)
      clearTimeout(timer)
    }
  }, [])

  return (
    <div className="w-screen h-screen overflow-hidden relative">
      {/* Cinematic loading screen */}
      <motion.div
        className="fixed inset-0 z-50 bg-black flex items-center justify-center"
        initial={{ opacity: 1 }}
        animate={{ opacity: loaded ? 0 : 1 }}
        transition={{ duration: 1.2, ease: 'easeInOut' }}
        style={{ pointerEvents: loaded ? 'none' : 'all' }}
      >
        <motion.img
          src="/huxwell.png"
          alt="Huxwell"
          className="h-5 md:h-6 w-auto"
          style={{ filter: 'brightness(0) invert(1)' }}
          initial={{ opacity: 0 }}
          animate={{ opacity: 0.35 }}
          transition={{ duration: 0.6 }}
        />
      </motion.div>

      {/* 3D Canvas — alpha true so CSS gradient background shows through */}
      <Canvas
        camera={{ position: [0, 0, 5.5], fov: 45 }}
        dpr={[1, 2]}
        gl={{
          antialias: true,
          alpha: true,
          powerPreference: 'high-performance',
        }}
        style={{ position: 'absolute', inset: 0 }}
      >
        <Suspense fallback={null}>
          <SceneContainer mode={mode} scrollProgress={scrollProgress} mouse={mouse} />
        </Suspense>
      </Canvas>

      {/* UI Overlay */}
      <UIOverlay
        mode={mode}
        onToggle={() => setMode((prev) => (prev === 'world' ? 'mind' : 'world'))}
        scrollProgress={scrollProgress}
        loaded={loaded}
      />
    </div>
  )
}
