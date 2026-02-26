import { motion } from 'framer-motion'
import { Keyboard } from 'lucide-react'
import { useAppStore } from '../../stores/appStore'

export function DoneStep() {
  const config = useAppStore((s) => s.config)

  return (
    <div className="flex flex-col items-center gap-6 py-4">
      {/* Success animation */}
      <motion.div
        className="w-20 h-20 rounded-full bg-success/10 flex items-center justify-center"
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        transition={{ type: 'spring', stiffness: 500, damping: 20 }}
      >
        <motion.span
          className="text-[36px]"
          initial={{ opacity: 0, scale: 0 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.2, type: 'spring', stiffness: 500, damping: 20 }}
        >
          ✓
        </motion.span>
      </motion.div>

      <div className="text-center">
        <h2 className="text-[17px] font-semibold text-text-primary">All Set</h2>
        <p className="text-[13px] text-text-secondary mt-1">Start using voice input</p>
      </div>

      {/* Hotkey hint */}
      <div className="bg-bg-secondary rounded-[14px] p-4 w-full">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-[10px] bg-accent/10 flex items-center justify-center">
            <Keyboard size={18} className="text-accent" />
          </div>
          <div>
            <p className="text-[13px] font-medium text-text-primary">Hotkey</p>
            <p className="text-[12px] text-text-secondary">
              {config.hotkey_mode === 'hold' ? 'Hold' : 'Press'} {config.hotkey} {config.hotkey_mode === 'hold' ? 'to talk' : 'to start/stop'}
            </p>
          </div>
        </div>
      </div>

      {/* Capsule preview */}
      <div className="flex items-center gap-3 text-[13px] text-text-secondary">
        <div className="w-10 h-10 rounded-full bg-bg-secondary/80 border border-border flex items-center justify-center">
          <span className="text-[16px]">🎙</span>
        </div>
        <span>← This is your voice capsule</span>
      </div>
    </div>
  )
}
