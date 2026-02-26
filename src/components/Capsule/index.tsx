import { useState, useRef, useCallback } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { useAppStore } from '../../stores/appStore'
import { useRecording } from '../../hooks/useRecording'
import { useCapsuleResize } from '../../hooks/useCapsuleResize'
import { CapsuleIdle } from './CapsuleIdle'
import { CapsuleRecording } from './CapsuleRecording'
import { CapsuleProcessing } from './CapsuleProcessing'
import { CapsulePolishing } from './CapsulePolishing'
import { CapsuleComplete } from './CapsuleComplete'
import { CapsuleError } from './CapsuleError'
import { CapsuleContextMenu } from './CapsuleContextMenu'

const DRAG_THRESHOLD = 5

function getCapsuleState(pipelineState: string, hasError: boolean) {
  if (hasError) return 'error'
  return pipelineState
}

export function Capsule() {
  const pipelineState = useAppStore((s) => s.pipelineState)
  const pipelineError = useAppStore((s) => s.pipelineError)
  const { startRecording, stopRecording, isRecording, isProcessing } = useRecording()
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number } | null>(null)

  const dragStart = useRef<{ x: number; y: number } | null>(null)
  const isDragging = useRef(false)

  useCapsuleResize()

  const hasError = pipelineError !== null
  const capsuleState = getCapsuleState(pipelineState, hasError)

  const handlePointerDown = useCallback((e: React.PointerEvent) => {
    dragStart.current = { x: e.clientX, y: e.clientY }
    isDragging.current = false
  }, [])

  const handlePointerMove = useCallback((e: React.PointerEvent) => {
    if (!dragStart.current || isDragging.current) return
    const dx = e.clientX - dragStart.current.x
    const dy = e.clientY - dragStart.current.y
    if (Math.abs(dx) > DRAG_THRESHOLD || Math.abs(dy) > DRAG_THRESHOLD) {
      isDragging.current = true
      dragStart.current = null
      import('@tauri-apps/api/window').then(({ getCurrentWindow }) => {
        getCurrentWindow().startDragging().catch(() => {})
      }).catch(() => {})
    }
  }, [])

  const handlePointerUp = useCallback(() => {
    if (isDragging.current) {
      isDragging.current = false
      dragStart.current = null
      return
    }
    dragStart.current = null

    if (isRecording) {
      stopRecording()
    } else if (!isProcessing && !hasError && pipelineState === 'idle') {
      startRecording()
    }
  }, [isRecording, isProcessing, hasError, pipelineState, startRecording, stopRecording])

  const handleContextMenu = (e: React.MouseEvent) => {
    e.preventDefault()
    setContextMenu({ x: e.clientX, y: e.clientY })
  }

  return (
    <div
      className="w-full h-full flex items-center justify-center"
      onContextMenu={handleContextMenu}
    >
      {/* Persistent outer shell — jelly capsule */}
      <motion.div
        className={`rounded-full pointer-events-auto ${
          capsuleState === 'error'
            ? 'jelly-capsule-error'
            : capsuleState === 'idle'
              ? 'jelly-capsule text-neutral-700'
              : 'jelly-capsule-active text-white'
        }`}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
      >
        <AnimatePresence mode="wait" initial={false}>
          <motion.div
            key={capsuleState}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
          >
            {capsuleState === 'idle' && <CapsuleIdle />}
            {capsuleState === 'recording' && <CapsuleRecording />}
            {capsuleState === 'transcribing' && <CapsuleProcessing />}
            {capsuleState === 'polishing' && <CapsulePolishing />}
            {capsuleState === 'outputting' && <CapsuleComplete />}
            {capsuleState === 'error' && <CapsuleError />}
          </motion.div>
        </AnimatePresence>
      </motion.div>

      {contextMenu && (
        <CapsuleContextMenu
          x={contextMenu.x}
          y={contextMenu.y}
          onClose={() => setContextMenu(null)}
        />
      )}
    </div>
  )
}
