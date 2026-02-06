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
      {/* Top Left - Brand logo image */}
      <motion.div
        className="absolute top-8 left-8 md:top-10 md:left-10"
        initial={{ opacity: 0, y: -15 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 1.5, ease: 'easeOut' }}
      >
        <img
          src="/huxwell.png"
          alt="huXwell"
          className="h-5 md:h-6 w-auto"
          style={{ filter: 'brightness(0) invert(1)' }}
        />
      </motion.div>

      {/* Center hint - fades away on scroll */}
      <AnimatePresence>
        {scrollPct < 3 && (
          <motion.div
            className="absolute inset-0 flex items-center justify-center"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.6 }}
          >
            <motion.p
              className="text-white/15 text-[10px] md:text-xs tracking-[0.4em] uppercase"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 2.5, duration: 1.2 }}
            >
              Scroll to explore
            </motion.p>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Bottom Left - Scroll progress */}
      <motion.div
        className="absolute bottom-8 left-8 md:bottom-10 md:left-10"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1.5, duration: 1 }}
      >
        <div className="flex items-center gap-3">
          <div className="w-12 md:w-20 h-px bg-white/10 relative overflow-hidden">
            <motion.div
              className="absolute top-0 left-0 h-full bg-white/30"
              style={{ width: `${scrollPct}%` }}
            />
          </div>
          <span className="text-[9px] md:text-[10px] text-white/20 font-mono tabular-nums">
            {String(scrollPct).padStart(3, '0')}
          </span>
        </div>
      </motion.div>

      {/* Bottom Right - Mode Toggle */}
      <motion.div
        className="absolute bottom-8 right-8 md:bottom-10 md:right-10 pointer-events-auto"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1.5, duration: 1 }}
      >
        <button
          onClick={onToggle}
          className="group flex items-center gap-2.5 px-3 py-1.5 border border-white/10 hover:border-white/25 bg-transparent transition-all duration-500 cursor-pointer"
        >
          <span
            className={`text-[9px] md:text-[10px] tracking-[0.15em] uppercase transition-colors duration-300 ${
              mode === 'world' ? 'text-white/60' : 'text-white/20'
            }`}
          >
            World
          </span>

          <div className="relative w-8 h-3 border border-white/20 rounded-full">
            <motion.div
              className="absolute top-[1.5px] w-2 h-2 bg-white/50 rounded-full"
              animate={{ left: mode === 'world' ? '2px' : '14px' }}
              transition={{ type: 'spring', stiffness: 400, damping: 25 }}
            />
          </div>

          <span
            className={`text-[9px] md:text-[10px] tracking-[0.15em] uppercase transition-colors duration-300 ${
              mode === 'mind' ? 'text-white/60' : 'text-white/20'
            }`}
          >
            Mind
          </span>
        </button>
      </motion.div>

      {/* Bottom Center - Eyes logo + Tagline + Contact */}
      <motion.div
        className="absolute bottom-7 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1.8, duration: 1.2 }}
      >
        <img
          src="/eyes.png"
          alt=""
          className="w-6 h-6 md:w-7 md:h-7 opacity-40"
          style={{ filter: 'invert(1) brightness(2)' }}
        />
        <p className="text-[9px] md:text-[10px] tracking-[0.2em] text-white/25 text-center whitespace-nowrap">
          Investing in the future of the web&mdash;freedom, privacy, immersion.
        </p>
        <a
          href="mailto:info@huxwell.co.uk"
          className="text-[8px] md:text-[9px] tracking-[0.2em] uppercase text-white/15 hover:text-white/40 transition-colors pointer-events-auto"
        >
          info@huxwell.co.uk
        </a>
      </motion.div>
    </div>
  )
}
