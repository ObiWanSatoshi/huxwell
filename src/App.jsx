import { Suspense, useRef, useEffect, useState } from 'react'
import { Canvas } from '@react-three/fiber'
import { motion, AnimatePresence } from 'framer-motion'
import Globe from './components/Globe'

export default function App() {
  const scrollTarget = useRef(0)
  const scrollProgress = useRef(0)
  const mouse = useRef({ x: 0, y: 0 })
  const [scrollPct, setScrollPct] = useState(0)
  const [isMobile, setIsMobile] = useState(false)
  const [reducedMotion, setReducedMotion] = useState(false)
  const [ctaSweepSignal, setCtaSweepSignal] = useState(0)
  const isTouchUi = isMobile
  const cameraPosition = isMobile ? [0, 0, 8] : [0, 0, 6]
  const scrollHintPath = isTouchUi ? 'M2 10 L10 2 L18 10' : 'M2 2 L10 10 L18 2'
  const scrollHintBob = isTouchUi ? [0, -5, 0] : [0, 5, 0]

  const maxDpr = reducedMotion ? 1 : isMobile ? 1.25 : 2

  useEffect(() => {
    const mobileQuery = window.matchMedia('(max-width: 768px), (pointer: coarse)')
    const motionQuery = window.matchMedia('(prefers-reduced-motion: reduce)')

    const updateEnvironment = () => {
      setIsMobile(mobileQuery.matches || navigator.maxTouchPoints > 0)
      setReducedMotion(motionQuery.matches)
    }

    updateEnvironment()

    if (mobileQuery.addEventListener) {
      mobileQuery.addEventListener('change', updateEnvironment)
      motionQuery.addEventListener('change', updateEnvironment)
      return () => {
        mobileQuery.removeEventListener('change', updateEnvironment)
        motionQuery.removeEventListener('change', updateEnvironment)
      }
    }

    mobileQuery.addListener(updateEnvironment)
    motionQuery.addListener(updateEnvironment)
    return () => {
      mobileQuery.removeListener(updateEnvironment)
      motionQuery.removeListener(updateEnvironment)
    }
  }, [])

  useEffect(() => {
    const handlePointerMove = (e) => {
      mouse.current.x = (e.clientX / window.innerWidth) * 2 - 1
      mouse.current.y = -((e.clientY / window.innerHeight) * 2 - 1)
    }
    window.addEventListener('pointermove', handlePointerMove, { passive: true })
    return () => window.removeEventListener('pointermove', handlePointerMove)
  }, [])

  // Wheel/touch/keyboard → scroll progress (0→1)
  useEffect(() => {
    if (reducedMotion) {
      scrollTarget.current = 0.2
      scrollProgress.current = 0.2
      return
    }

    const clamp01 = (value) => Math.max(0, Math.min(1, value))

    const handleWheel = (e) => {
      e.preventDefault()
      scrollTarget.current = clamp01(scrollTarget.current + e.deltaY * 0.0008)
    }

    let touchY = 0
    const handleTouchStart = (e) => {
      if (!e.touches.length) return
      touchY = e.touches[0].clientY
    }
    const handleTouchMove = (e) => {
      if (!e.touches.length) return
      const nextY = e.touches[0].clientY
      const deltaY = touchY - nextY
      touchY = nextY
      scrollTarget.current = clamp01(scrollTarget.current + deltaY * 0.0014)
      e.preventDefault()
    }

    const handleKeyDown = (e) => {
      if (e.key === 'ArrowDown' || e.key === 'PageDown' || e.key === ' ') {
        e.preventDefault()
        scrollTarget.current = clamp01(scrollTarget.current + 0.06)
      } else if (e.key === 'ArrowUp' || e.key === 'PageUp') {
        e.preventDefault()
        scrollTarget.current = clamp01(scrollTarget.current - 0.06)
      }
    }

    window.addEventListener('wheel', handleWheel, { passive: false })
    window.addEventListener('touchstart', handleTouchStart, { passive: true })
    window.addEventListener('touchmove', handleTouchMove, { passive: false })
    window.addEventListener('keydown', handleKeyDown)
    return () => {
      window.removeEventListener('wheel', handleWheel)
      window.removeEventListener('touchstart', handleTouchStart)
      window.removeEventListener('touchmove', handleTouchMove)
      window.removeEventListener('keydown', handleKeyDown)
    }
  }, [reducedMotion])

  // Keep progress text synced without interval polling
  useEffect(() => {
    let frame = 0
    let last = -1

    const tick = () => {
      const next = Math.round(scrollProgress.current * 100)
      if (next !== last) {
        last = next
        setScrollPct(next)
      }
      frame = window.requestAnimationFrame(tick)
    }

    frame = window.requestAnimationFrame(tick)
    return () => window.cancelAnimationFrame(frame)
  }, [])

  return (
    <div className="w-screen h-screen bg-black overflow-hidden relative">
      {/* 3D Canvas */}
      <Canvas
        camera={{ position: cameraPosition, fov: 45 }}
        dpr={[1, maxDpr]}
        gl={{ antialias: !isMobile, alpha: false, powerPreference: 'high-performance' }}
        style={{ position: 'absolute', inset: 0 }}
      >
        <color attach="background" args={['#000000']} />
        <Suspense fallback={null}>
          <Globe
            scrollTarget={scrollTarget}
            scrollProgress={scrollProgress}
            isMobile={isMobile}
            reducedMotion={reducedMotion}
            ctaSweepSignal={ctaSweepSignal}
            mouse={mouse}
          />
        </Suspense>
      </Canvas>

      {/* UI Overlay */}
      <div className="fixed inset-0 z-10 pointer-events-none">
        {/* Center — Hero logo + animated arrow, fades on scroll */}
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
                className="w-20 md:w-28 h-auto select-none"
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
                animate={{ opacity: 0.15, y: scrollHintBob }}
                transition={{
                  opacity: { delay: 2, duration: 1 },
                  y: { delay: 2, duration: 1.8, repeat: Infinity, ease: 'easeInOut' },
                }}
              >
                <path
                  d={scrollHintPath}
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

        {/* Top Center — Brand (always visible) */}
        <motion.div
          className="absolute top-10 left-1/2 -translate-x-1/2 flex flex-col items-center"
          initial={{ opacity: 0, y: -15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 1.2, delay: 0.3 }}
        >
          <img
            src="/huxwell.png"
            alt="huXwell"
            className="h-14 md:h-20 w-auto"
            style={{ filter: 'brightness(0) invert(1)' }}
          />
        </motion.div>

        {/* Bottom Left — Scroll progress bar */}
        <motion.div
          className="absolute bottom-8 left-8 md:bottom-12 md:left-12"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.8, duration: 1 }}
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

        {/* Bottom Center — Tagline + Contact (always visible) */}
        <motion.div
          className="absolute bottom-12 left-1/2 -translate-x-1/2 flex flex-col items-center gap-3"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.5, duration: 1.2 }}
        >
          <p className="footer-tagline text-sm md:text-base text-center">
            Investing in the evolving web&mdash;verifiable, intelligent, embodied.
          </p>
          <a
            href="mailto:info@huxwell.co.uk"
            className="text-[8px] md:text-[9px] tracking-[0.24em] uppercase text-white/65 hover:text-white transition-colors pointer-events-auto"
            onMouseEnter={() => setCtaSweepSignal((v) => v + 1)}
            onFocus={() => setCtaSweepSignal((v) => v + 1)}
          >
            info@huxwell.co.uk
          </a>
        </motion.div>
      </div>
    </div>
  )
}
