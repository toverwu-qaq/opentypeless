import { useState, useCallback, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { useAppStore } from '../../stores/appStore'
import type { HotkeyMode, OutputMode } from '../../stores/appStore'
import { updateHotkey, pauseHotkey, resumeHotkey, setAutoStart } from '../../lib/tauri'
import { SegmentedControl } from './shared/SegmentedControl'
import { Toggle } from './shared/Toggle'

function HotkeyRecorder() {
  const config = useAppStore((s) => s.config)
  const updateConfig = useAppStore((s) => s.updateConfig)
  const { t } = useTranslation()
  const [recording, setRecording] = useState(false)
  const [pending, setPending] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    e.preventDefault()
    e.stopPropagation()

    // Ignore lone modifier keys
    if (['Control', 'Shift', 'Alt', 'Meta'].includes(e.key)) return

    const parts: string[] = []
    if (e.ctrlKey) parts.push('Ctrl')
    if (e.altKey) parts.push('Alt')
    if (e.shiftKey) parts.push('Shift')
    if (e.metaKey) parts.push('Meta')

    // Must have at least one modifier
    if (parts.length === 0) return

    const keyMap: Record<string, string> = {
      ' ': 'Space',
      Tab: 'Tab',
      Enter: 'Enter',
      Backspace: 'Backspace',
      Escape: 'Escape',
      Delete: 'Delete',
      Insert: 'Insert',
      Home: 'Home',
      End: 'End',
      PageUp: 'PageUp',
      PageDown: 'PageDown',
      ArrowUp: 'Up',
      ArrowDown: 'Down',
      ArrowLeft: 'Left',
      ArrowRight: 'Right',
    }

    let keyName = keyMap[e.key] || e.key
    // Normalize single letters to uppercase
    if (keyName.length === 1) keyName = keyName.toUpperCase()
    // F-keys are already correct (F1, F2, etc.)

    parts.push(keyName)
    setPending(parts.join('+'))
  }, [])

  useEffect(() => {
    if (!recording) return
    window.addEventListener('keydown', handleKeyDown, true)
    return () => window.removeEventListener('keydown', handleKeyDown, true)
  }, [recording, handleKeyDown])

  const handleClick = () => {
    if (recording && pending) {
      // Confirm the pending hotkey
      setRecording(false)
      setError(null)
      updateHotkey(pending)
        .then(() => {
          updateConfig({ hotkey: pending })
          setPending(null)
        })
        .catch((e) => {
          setError(String(e))
          setPending(null)
          // Re-register the old hotkey on failure
          resumeHotkey().catch(() => {})
        })
    } else if (recording) {
      // Cancel recording — re-register the old hotkey
      setRecording(false)
      setPending(null)
      resumeHotkey().catch(() => {})
    } else {
      // Start recording — unregister global shortcut so webview can capture keys
      pauseHotkey().catch(() => {})
      setRecording(true)
      setPending(null)
      setError(null)
    }
  }

  return (
    <div>
      <button
        onClick={handleClick}
        className={`w-full px-3 py-2.5 rounded-[10px] text-[13px] font-mono text-left border transition-colors cursor-pointer ${
          recording
            ? 'bg-bg-tertiary border-text-secondary text-text-primary ring-2 ring-text-secondary/20'
            : 'bg-bg-secondary border-transparent text-text-primary hover:border-border'
        }`}
      >
        {recording ? pending || t('settings.pressKeyCombination') : config.hotkey}
      </button>
      {recording && pending && (
        <p className="text-[11px] text-text-tertiary mt-1.5">{t('settings.clickToConfirm')}</p>
      )}
      {error && <p className="text-[11px] text-error mt-1.5">{error}</p>}
    </div>
  )
}

export function GeneralPane() {
  const config = useAppStore((s) => s.config)
  const updateConfig = useAppStore((s) => s.updateConfig)
  const { t } = useTranslation()

  return (
    <div className="space-y-6">
      <Section title={t('settings.hotkey')}>
        <HotkeyRecorder />
        <div className="mt-3">
          <SegmentedControl
            options={[
              { value: 'hold', label: t('settings.holdToTalk') },
              { value: 'toggle', label: t('settings.toggleOnOff') },
            ]}
            value={config.hotkey_mode}
            onChange={(v) => updateConfig({ hotkey_mode: v as HotkeyMode })}
          />
        </div>
      </Section>

      <Section title={t('settings.outputMode')}>
        <SegmentedControl
          options={[
            { value: 'keyboard', label: t('settings.keyboardSimulation') },
            { value: 'clipboard', label: t('settings.clipboardPaste') },
          ]}
          value={config.output_mode}
          onChange={(v) => updateConfig({ output_mode: v as OutputMode })}
        />
      </Section>

      <Section title={t('settings.other')}>
        <Toggle
          checked={config.auto_start}
          onChange={(checked) => {
            updateConfig({ auto_start: checked })
            setAutoStart(checked).catch(() => {
              // Revert on failure
              updateConfig({ auto_start: !checked })
            })
          }}
          label={t('settings.launchAtStartup')}
        />
        {config.auto_start && (
          <Toggle
            checked={config.start_minimized}
            onChange={(checked) => updateConfig({ start_minimized: checked })}
            label={t('settings.startMinimized')}
          />
        )}
        <Toggle
          checked={config.close_to_tray}
          onChange={(checked) => updateConfig({ close_to_tray: checked })}
          label={t('settings.closeToTray')}
        />
      </Section>
    </div>
  )
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <h3 className="text-[11px] font-medium text-text-tertiary uppercase tracking-wider mb-2.5">
        {title}
      </h3>
      {children}
    </div>
  )
}
