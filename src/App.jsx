import { Suspense } from 'react'
import { Canvas } from '@react-three/fiber'
import { motion } from 'framer-motion'
import Globe from './components/Globe'

export default function App() {
  return (
    <div className="w-screen h-screen bg-black overflow-hidden relative">
      {/* 3D Canvas */}
      <Canvas
        camera={{ position: [0, 0, 6], fov: 45 }}
        dpr={[1, 2]}
        gl={{ antialias: true, alpha: false }}
        style={{ position: 'absolute', inset: 0 }}
      >
        <color attach="background" args={['#000000']} />
        <Suspense fallback={null}>
          <Globe />
        </Suspense>
      </Canvas>

      {/* UI Overlay */}
      <div className="fixed inset-0 z-10 pointer-events-none">
        {/* Top Center — Brand */}
        <motion.div
          className="absolute top-10 left-1/2 -translate-x-1/2 flex flex-col items-center gap-4"
          initial={{ opacity: 0, y: -15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 1.2, delay: 0.3 }}
        >
          <img
            src="/huxwell.png"
            alt="huXwell"
            className="h-5 md:h-7 w-auto"
            style={{ filter: 'brightness(0) invert(1)' }}
          />
          <img
            src="/eyes.png"
            alt=""
            className="w-7 h-7 md:w-9 md:h-9 opacity-30"
            style={{ filter: 'invert(1) brightness(2)' }}
          />
        </motion.div>

        {/* Bottom Center — Tagline + Contact */}
        <motion.div
          className="absolute bottom-10 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.5, duration: 1.2 }}
        >
          <p className="text-[10px] md:text-xs tracking-[0.15em] text-white/25 text-center">
            Investing in the future of the web&mdash;freedom, privacy, immersion.
          </p>
          <a
            href="mailto:info@huxwell.co.uk"
            className="text-[9px] tracking-[0.25em] uppercase text-white/15 hover:text-white/40 transition-colors pointer-events-auto"
          >
            info@huxwell.co.uk
          </a>
        </motion.div>
      </div>
    </div>
  )
}
