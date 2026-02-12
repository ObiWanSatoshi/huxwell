import { Suspense, useRef, useEffect, useState } from 'react'
import { Canvas } from '@react-three/fiber'
import { motion, AnimatePresence } from 'framer-motion'
import Globe from './components/Globe'

export default function App() {
  const scrollTarget = useRef(0)
  const scrollProgress = useRef(0)
  const [scrollPct, setScrollPct] = useState(0)

  // Wheel → scroll progress (0→1)
  useEffect(() => {
    const handleWheel = (e) => {
      e.preventDefault()
      scrollTarget.current = Math.max(
        0,
        Math.min(1, scrollTarget.current + e.deltaY * 0.0008),
      )
    }
    window.addEventListener('wheel', handleWheel, { passive: false })
    return () => window.removeEventListener('wheel', handleWheel)
  }, [])

  // Poll scroll progress for UI display
  useEffect(() => {
    const interval = setInterval(() => {
      setScrollPct(Math.round(scrollProgress.current * 100))
    }, 80)
    return () => clearInterval(interval)
  }, [])

  const scrolled = scrollPct >= 3

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
          <Globe scrollTarget={scrollTarget} scrollProgress={scrollProgress} />
        </Suspense>
      </Canvas>

      {/* UI Overlay */}
      <div className="fixed inset-0 z-10 pointer-events-none">
        {/* Center — Hero logo + animated arrow, visible only at 0% scroll */}
        <AnimatePresence>
          {scrollPct < 12 && (
            <motion.div
              className="absolute inset-0 flex flex-col items-center justify-center gap-8"
              initial={{ opacity: 0 }}
              animate={{ opacity: Math.max(0, 1 - scrollPct / 10) }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.4 }}
            >
              <motion.img
                src="/eyes.png"
                alt=""
                className="w-16 h-16 md:w-24 md:h-24 select-none"
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 1.2, delay: 0.2 }}
              />
              <motion.svg
                width="20"
                height="12"
                viewBox="0 0 20 12"
                className="select-none"
                initial={{ opacity: 0 }}
                animate={{ opacity: 0.15, y: [0, 5, 0] }}
                transition={{
                  opacity: { delay: 2, duration: 1 },
                  y: { delay: 2, duration: 1.8, repeat: Infinity, ease: 'easeInOut' },
                }}
              >
                <path
                  d="M2 2 L10 10 L18 2"
                  stroke="white"
                  strokeWidth="1.5"
                  fill="none"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </motion.svg>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Top Center — Brand (appears after scroll starts) */}
        <motion.div
          className="absolute top-10 left-1/2 -translate-x-1/2 flex flex-col items-center gap-4"
          initial={{ opacity: 0, y: -15 }}
          animate={{ opacity: scrolled ? 1 : 0, y: scrolled ? 0 : -15 }}
          transition={{ duration: 0.8 }}
        >
          <img
            src="/huxwell.png"
            alt="huXwell"
            className="h-14 md:h-20 w-auto"
            style={{ filter: 'brightness(0) invert(1)' }}
          />
          <img
            src="/eyes.png"
            alt=""
            className="w-7 h-7 md:w-9 md:h-9 opacity-30"
          />
        </motion.div>

        {/* Bottom Left — Scroll progress bar (appears after scroll starts) */}
        <motion.div
          className="absolute bottom-8 left-8 md:bottom-12 md:left-12"
          initial={{ opacity: 0 }}
          animate={{ opacity: scrolled ? 1 : 0 }}
          transition={{ duration: 0.8 }}
        >
          <div className="flex items-center gap-3">
            <div className="w-14 md:w-24 h-px bg-white/8 relative overflow-hidden">
              <div
                className="absolute top-0 left-0 h-full bg-white/30 transition-[width] duration-150"
                style={{ width: `${scrollPct}%` }}
              />
            </div>
            <span className="text-[9px] md:text-[10px] text-white/20 font-mono tabular-nums">
              {String(scrollPct).padStart(3, '0')}
            </span>
          </div>
        </motion.div>

        {/* Bottom Center — Tagline + Contact (appears after scroll starts) */}
        <motion.div
          className="absolute bottom-12 left-1/2 -translate-x-1/2 flex flex-col items-center gap-3"
          initial={{ opacity: 0 }}
          animate={{ opacity: scrolled ? 1 : 0 }}
          transition={{ duration: 1, delay: scrolled ? 0.3 : 0 }}
        >
          <p
            className="text-sm md:text-base tracking-[0.15em] text-white text-center"
            style={{ fontFamily: "'Source Serif 4', serif" }}
          >
            Investing in the evolving web&mdash;verifiable, intelligent, embodied.
          </p>
          <a
            href="mailto:info@huxwell.co.uk"
            className="text-[7px] md:text-[8px] tracking-[0.25em] uppercase text-white/60 hover:text-white transition-colors pointer-events-auto"
          >
            info@huxwell.co.uk
          </a>
        </motion.div>
      </div>
    </div>
  )
}
