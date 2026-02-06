import { motion, AnimatePresence } from 'framer-motion'
import { useState, useEffect } from 'react'

export default function UIOverlay({ mode, onToggle, scrollProgress, loaded }) {
  const [scrollPct, setScrollPct] = useState(0)

  useEffect(() => {
    const interval = setInterval(() => {
      setScrollPct(Math.round((scrollProgress.current || 0) * 100))
    }, 80)
    return () => clearInterval(interval)
  }, [scrollProgress])

  return (
    <div className="fixed inset-0 z-10 pointer-events-none">
      {/* Top — Brand logo centered */}
      <motion.div
        className="absolute top-8 left-1/2 -translate-x-1/2 md:top-12"
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: loaded ? 1 : 0, y: loaded ? 0 : -20 }}
        transition={{ duration: 1.2, delay: 0.3, ease: 'easeOut' }}
      >
        <img
          src="/huxwell.png"
          alt="huXwell"
          className="h-5 md:h-7 w-auto"
          style={{ filter: 'brightness(0) invert(1)' }}
        />
      </motion.div>

      {/* Eyes logo — subtle, below brand */}
      <motion.div
        className="absolute top-[68px] md:top-[88px] left-1/2 -translate-x-1/2"
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: loaded ? 1 : 0, scale: loaded ? 1 : 0.8 }}
        transition={{ duration: 1.2, delay: 0.8, ease: 'easeOut' }}
      >
        <img
          src="/eyes.png"
          alt=""
          className="w-7 h-7 md:w-9 md:h-9 opacity-30"
          style={{ filter: 'invert(1) brightness(2)' }}
        />
      </motion.div>

      {/* Center — scroll hint, fades on scroll */}
      <AnimatePresence>
        {scrollPct < 3 && loaded && (
          <motion.div
            className="absolute inset-0 flex items-center justify-center"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.5 }}
          >
            <motion.p
              className="text-white/10 text-[10px] md:text-xs tracking-[0.5em] uppercase select-none"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 2.8, duration: 1.2 }}
            >
              Scroll to explore
            </motion.p>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Bottom Left — Scroll progress bar */}
      <motion.div
        className="absolute bottom-8 left-8 md:bottom-12 md:left-12"
        initial={{ opacity: 0 }}
        animate={{ opacity: loaded ? 1 : 0 }}
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

      {/* Bottom Right — Mode Toggle */}
      <motion.div
        className="absolute bottom-8 right-8 md:bottom-12 md:right-12 pointer-events-auto"
        initial={{ opacity: 0 }}
        animate={{ opacity: loaded ? 1 : 0 }}
        transition={{ delay: 1.8, duration: 1 }}
      >
        <button
          onClick={onToggle}
          className="group flex items-center gap-2.5 px-3.5 py-2 border border-white/8 hover:border-white/20 bg-transparent transition-all duration-500 cursor-pointer"
        >
          <span
            className={`text-[9px] md:text-[10px] tracking-[0.2em] uppercase transition-colors duration-300 ${
              mode === 'world' ? 'text-white/50' : 'text-white/15'
            }`}
          >
            World
          </span>
          <div className="relative w-9 h-3.5 border border-white/15 rounded-full">
            <motion.div
              className="absolute top-[2.5px] w-2 h-2 bg-white/40 rounded-full"
              animate={{ left: mode === 'world' ? '3px' : '17px' }}
              transition={{ type: 'spring', stiffness: 400, damping: 25 }}
            />
          </div>
          <span
            className={`text-[9px] md:text-[10px] tracking-[0.2em] uppercase transition-colors duration-300 ${
              mode === 'mind' ? 'text-white/50' : 'text-white/15'
            }`}
          >
            Mind
          </span>
        </button>
      </motion.div>

      {/* Bottom Center — Tagline + Contact */}
      <motion.div
        className="absolute bottom-7 md:bottom-11 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2"
        initial={{ opacity: 0 }}
        animate={{ opacity: loaded ? 1 : 0 }}
        transition={{ delay: 2.2, duration: 1.2 }}
      >
        <p className="text-[9px] md:text-[11px] tracking-[0.15em] text-white/20 text-center">
          Investing in the future of the web&mdash;freedom, privacy, immersion.
        </p>
        <a
          href="mailto:info@huxwell.co.uk"
          className="text-[8px] md:text-[9px] tracking-[0.25em] uppercase text-white/12 hover:text-white/35 transition-colors duration-300 pointer-events-auto"
        >
          info@huxwell.co.uk
        </a>
      </motion.div>
    </div>
  )
}
