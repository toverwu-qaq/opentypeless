import { useEffect, useRef } from 'react'
import { useAppStore, type PipelineState } from '../stores/appStore'

interface CapsuleSize {
  width: number
  height: number
}

function getSizeForState(state: PipelineState, expanded: boolean, hasError: boolean): CapsuleSize {
  if (hasError) return { width: 200, height: 36 }
  if (expanded) return { width: 220, height: 90 }
  switch (state) {
    case 'idle':
      return { width: 36, height: 36 }
    case 'recording':
      return { width: 200, height: 36 }
    case 'transcribing':
    case 'polishing':
      return { width: 220, height: 36 }
    case 'outputting':
      return { width: 120, height: 36 }
    default:
      return { width: 36, height: 36 }
  }
}

export function useCapsuleResize() {
  const pipelineState = useAppStore((s) => s.pipelineState)
  const capsuleExpanded = useAppStore((s) => s.capsuleExpanded)
  const pipelineError = useAppStore((s) => s.pipelineError)
  const initialized = useRef(false)
  const prevWindowSize = useRef<{ width: number; height: number } | null>(null)

  const hasError = pipelineError !== null

  useEffect(() => {
    const size = getSizeForState(pipelineState, capsuleExpanded, hasError)
    const windowWidth = size.width + 24
    const windowHeight = size.height + 24

    import('@tauri-apps/api/window')
      .then(async ({ getCurrentWindow, LogicalSize, LogicalPosition, currentMonitor }) => {
        const win = getCurrentWindow()

        if (!initialized.current) {
          // First mount: center at bottom of screen
          await win.setSize(new LogicalSize(windowWidth, windowHeight)).catch(() => {})
          try {
            const monitor = await currentMonitor()
            if (monitor) {
              const sw = monitor.size.width / monitor.scaleFactor
              const sh = monitor.size.height / monitor.scaleFactor
              const x = Math.round(sw / 2 - windowWidth / 2)
              const y = Math.round(sh - windowHeight - 80)
              await win.setPosition(new LogicalPosition(x, y)).catch(() => {})
            }
          } catch {
            /* ignore – monitor info unavailable */
          }
          initialized.current = true
          prevWindowSize.current = { width: windowWidth, height: windowHeight }
          return
        }

        // Subsequent resizes: adjust position to keep center point stable
        const prev = prevWindowSize.current
        if (prev) {
          const pos = await win.outerPosition().catch(() => null)
          if (pos) {
            const monitor = await currentMonitor()
            const scale = monitor?.scaleFactor ?? 1
            const oldCenterX = pos.x / scale + prev.width / 2
            const oldCenterY = pos.y / scale + prev.height / 2
            const newX = Math.round(oldCenterX - windowWidth / 2)
            const newY = Math.round(oldCenterY - windowHeight / 2)
            await win.setSize(new LogicalSize(windowWidth, windowHeight)).catch(() => {})
            await win.setPosition(new LogicalPosition(newX, newY)).catch(() => {})
          } else {
            await win.setSize(new LogicalSize(windowWidth, windowHeight)).catch(() => {})
          }
        } else {
          await win.setSize(new LogicalSize(windowWidth, windowHeight)).catch(() => {})
        }

        prevWindowSize.current = { width: windowWidth, height: windowHeight }
      })
      .catch(() => {})
  }, [pipelineState, capsuleExpanded, hasError])

  return getSizeForState(pipelineState, capsuleExpanded, hasError)
}
