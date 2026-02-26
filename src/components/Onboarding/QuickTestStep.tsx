import { useState } from 'react'
import { motion } from 'framer-motion'
import { Mic, FileText, Sparkles, Type } from 'lucide-react'
import { useRecording } from '../../hooks/useRecording'
import { useAppStore } from '../../stores/appStore'

const STAGES = [
  { icon: Mic, label: 'Record', key: 'recording' },
  { icon: FileText, label: 'STT', key: 'transcribing' },
  { icon: Sparkles, label: 'LLM', key: 'polishing' },
  { icon: Type, label: 'Output', key: 'outputting' },
] as const

export function QuickTestStep() {
  const pipelineState = useAppStore((s) => s.pipelineState)
  const polishedText = useAppStore((s) => s.polishedText)
  const finalTranscript = useAppStore((s) => s.finalTranscript)
  const { startRecording, stopRecording, isRecording, isProcessing } = useRecording()
  const [hasRecorded, setHasRecorded] = useState(false)

  const handlePointerDown = () => {
    if (!isRecording && !isProcessing) {
      startRecording()
    }
  }

  const handlePointerUp = () => {
    if (isRecording) {
      stopRecording()
      setHasRecorded(true)
    }
  }

  const activeIndex = STAGES.findIndex((s) => s.key === pipelineState)

  return (
    <div className="space-y-6">
      {/* Pipeline visualization */}
      <div className="flex items-center justify-center gap-1">
        {STAGES.map((stage, i) => {
          const Icon = stage.icon
          const isActive = i === activeIndex
          const isDone = activeIndex > i || (pipelineState === 'idle' && hasRecorded)

          return (
            <div key={stage.key} className="flex items-center">
              <motion.div
                className={`flex flex-col items-center gap-1.5 px-3 py-2 rounded-[10px] transition-colors ${
                  isActive
                    ? 'bg-accent/10'
                    : isDone
                      ? 'bg-success/10'
                      : 'bg-bg-secondary'
                }`}
                animate={isActive ? { scale: [1, 1.05, 1] } : {}}
                transition={isActive ? { repeat: Infinity, duration: 1.5 } : {}}
              >
                <Icon
                  size={18}
                  className={
                    isActive
                      ? 'text-accent'
                      : isDone
                        ? 'text-success'
                        : 'text-text-tertiary'
                  }
                />
                <span className={`text-[11px] ${
                  isActive ? 'text-accent' : isDone ? 'text-success' : 'text-text-tertiary'
                }`}>
                  {stage.label}
                </span>
              </motion.div>
              {i < STAGES.length - 1 && (
                <div className={`w-4 h-[1px] ${
                  isDone ? 'bg-success/40' : 'bg-border'
                }`} />
              )}
            </div>
          )
        })}
      </div>

      {/* Record button */}
      <div className="flex flex-col items-center gap-3">
        <motion.button
          className="w-16 h-16 rounded-full flex items-center justify-center text-white cursor-pointer border-none outline-none"
          style={{ backgroundColor: isRecording ? '#FF3B30' : '#007AFF' }}
          animate={isRecording ? { scale: [1, 1.05, 1] } : {}}
          transition={isRecording ? { repeat: Infinity, duration: 1 } : {}}
          whileTap={{ scale: 0.95 }}
          onPointerDown={handlePointerDown}
          onPointerUp={handlePointerUp}
          onPointerLeave={isRecording ? handlePointerUp : undefined}
        >
          <Mic size={24} />
        </motion.button>
        <p className="text-[13px] text-text-secondary">
          {isRecording ? 'Release to stop recording' : 'Hold and say something'}
        </p>
      </div>

      {/* Result preview */}
      {(finalTranscript || polishedText) && (
        <div className="bg-bg-secondary rounded-[10px] p-3 space-y-1">
          {finalTranscript && (
            <p className="text-[12px] text-text-tertiary line-through">{finalTranscript}</p>
          )}
          {polishedText && (
            <p className="text-[13px] text-text-primary">{polishedText}</p>
          )}
        </div>
      )}
    </div>
  )
}
