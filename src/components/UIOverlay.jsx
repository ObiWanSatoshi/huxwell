import { motion, AnimatePresence } from 'framer-motion'
import { useState, useEffect } from 'react'

export default function UIOverlay({ mode, onToggle, scrollProgress }) {
  const [scrollPct, setScrollPct] = useState(0)

  useEffect(() => {
    const interval = setInterval(() => {
      setScrollPct(Math.round((scrollProgress.current || 0) * 100))
    }, 100)
    return () => clearInterval(interval)
  }, [scrollProgress])

  return (
    <div className="fixed inset-0 z-10 pointer-events-none">
      {/* Top Left - Brand */}
      <motion.div
        className="absolute top-6 left-6 md:top-10 md:left-10"
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 1.2, ease: 'easeOut' }}
      >
        <h1 className="font-cinzel text-2xl md:text-4xl tracking-[0.25em] text-white font-bold">
          hu<span className="text-white">X</span>well
        </h1>
        <motion.p
          className="text-[10px] md:text-xs tracking-[0.3em] uppercase text-white/40 mt-1"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.8, duration: 1 }}
        >
          Humanity &times; Technology
        </motion.p>
      </motion.div>

      {/* Top Right - Logo */}
      <motion.div
        className="absolute top-6 right-6 md:top-10 md:right-10"
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 1.2, delay: 0.3, ease: 'easeOut' }}
      >
        <img
          src="/eyes.png"
          alt="huXwell"
          className="w-10 h-10 md:w-14 md:h-14 invert brightness-200 opacity-80 hover:opacity-100 transition-opacity"
          style={{ filter: 'invert(1) brightness(2)' }}
        />
      </motion.div>

      {/* Center tagline - appears on load */}
      <AnimatePresence>
        {scrollPct < 5 && (
          <motion.div
            className="absolute inset-0 flex flex-col items-center justify-center"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.8 }}
          >
            <motion.p
              className="text-white/30 text-xs md:text-sm tracking-[0.5em] uppercase"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 1.5, duration: 1 }}
            >
              {mode === 'world' ? 'The Connected World' : 'The Synthesized Mind'}
            </motion.p>
            <motion.p
              className="text-white/15 text-[10px] md:text-xs tracking-[0.3em] uppercase mt-3"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 2.5, duration: 1 }}
            >
              Scroll to explore
            </motion.p>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Bottom Left - Scroll indicator */}
      <motion.div
        className="absolute bottom-6 left-6 md:bottom-10 md:left-10"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1, duration: 1 }}
      >
        <div className="flex items-center gap-3">
          <div className="w-16 md:w-24 h-[1px] bg-white/20 relative overflow-hidden">
            <motion.div
              className="absolute top-0 left-0 h-full bg-white/60"
              style={{ width: `${scrollPct}%` }}
            />
          </div>
          <span className="text-[10px] md:text-xs text-white/30 font-mono tabular-nums">
            {String(scrollPct).padStart(3, '0')}
          </span>
        </div>
      </motion.div>

      {/* Bottom Right - Mode Toggle */}
      <motion.div
        className="absolute bottom-6 right-6 md:bottom-10 md:right-10 pointer-events-auto"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 1.2, duration: 1 }}
      >
        <button
          onClick={onToggle}
          className="group relative flex items-center gap-3 px-4 py-2 border border-white/20 hover:border-white/50 bg-black/40 backdrop-blur-sm transition-all duration-500 cursor-pointer"
        >
          <span
            className={`text-[10px] md:text-xs tracking-[0.2em] uppercase transition-colors duration-300 ${
              mode === 'world' ? 'text-white' : 'text-white/30'
            }`}
          >
            World
          </span>

          {/* Toggle track */}
          <div className="relative w-10 h-4 border border-white/30 rounded-full">
            <motion.div
              className="absolute top-[2px] w-2.5 h-2.5 bg-white rounded-full"
              animate={{ left: mode === 'world' ? '2px' : '18px' }}
              transition={{ type: 'spring', stiffness: 500, damping: 30 }}
            />
          </div>

          <span
            className={`text-[10px] md:text-xs tracking-[0.2em] uppercase transition-colors duration-300 ${
              mode === 'mind' ? 'text-white' : 'text-white/30'
            }`}
          >
            Mind
          </span>
        </button>
      </motion.div>

      {/* Bottom Center - Contact */}
      <motion.div
        className="absolute bottom-6 left-1/2 -translate-x-1/2"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 2, duration: 1 }}
      >
        <a
          href="mailto:info@huxwell.co.uk"
          className="text-[9px] md:text-[10px] tracking-[0.3em] uppercase text-white/20 hover:text-white/50 transition-colors pointer-events-auto"
        >
          info@huxwell.co.uk
        </a>
      </motion.div>
    </div>
  )
}
