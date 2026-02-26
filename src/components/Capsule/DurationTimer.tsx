import { useEffect, useRef, useState } from 'react'
import { invoke } from '@tauri-apps/api/core'
import { useAppStore } from '../../stores/appStore'

const MAX_RECORDING_SECONDS = 30

export function DurationTimer() {
  const pipelineState = useAppStore((s) => s.pipelineState)
  const [seconds, setSeconds] = useState(0)
  const stoppedRef = useRef(false)

  useEffect(() => {
    if (pipelineState !== 'recording') {
      setSeconds(0)
      stoppedRef.current = false
      return
    }
    const interval = setInterval(() => setSeconds((s) => s + 1), 1000)
    return () => clearInterval(interval)
  }, [pipelineState])

  useEffect(() => {
    if (pipelineState === 'recording' && seconds >= MAX_RECORDING_SECONDS && !stoppedRef.current) {
      stoppedRef.current = true
      invoke('stop_recording').catch(() => {})
    }
  }, [seconds, pipelineState])

  const mm = String(Math.floor(seconds / 60)).padStart(2, '0')
  const ss = String(seconds % 60).padStart(2, '0')

  return (
    <span className="text-[11px] font-mono text-white/80 tabular-nums">
      {mm}:{ss}
    </span>
  )
}
