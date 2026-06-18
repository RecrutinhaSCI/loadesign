import { motion } from 'framer-motion'
import { Sparkles } from 'lucide-react'

export function LoadingScreen() {
  return (
    <div className="fixed inset-0 bg-dark-bg flex items-center justify-center z-50">
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="flex flex-col items-center gap-4"
      >
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ repeat: Infinity, duration: 2, ease: 'linear' }}
          className="w-10 h-10 rounded-xl bg-loa-600/20 border border-loa-600/30 flex items-center justify-center"
        >
          <Sparkles size={16} className="text-loa-400" />
        </motion.div>
        <p className="text-xs text-white/20 tracking-widest uppercase">Loa Design</p>
      </motion.div>
    </div>
  )
}