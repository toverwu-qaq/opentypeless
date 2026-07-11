import { useCallback, useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { ArrowDown, ArrowUp, Plus, Trash2 } from 'lucide-react'
import {
  bindingFromHotkey,
  hotkeyFromBinding,
  isMacPlatform,
} from '../../stores/appStore'
import type { HotkeyRole } from '../../lib/tauri'
import type { ShortcutBinding } from '../../stores/appStore'
import { pauseHotkey, resumeHotkey } from '../../lib/tauri'

const STANDALONE_KEYS = new Set([
  'Space',
  'Tab',
  'Enter',
  'Backspace',
  'Escape',
  'Delete',
  'Insert',
  'Home',
  'End',
  'PageUp',
  'PageDown',
  'Up',
  'Down',
  'Left',
  'Right',
  'F1',
  'F2',
  'F3',
  'F4',
  'F5',
  'F6',
  'F7',
  'F8',
  'F9',
  'F10',
  'F11',
  'F12',
])

const MAX_BINDINGS = 3

interface HotkeyRecorderProps {
  value: string
  onSaved: (hotkey: string) => void
  validateHotkey?: (hotkey: string) => string | null
  specialOptions?: Array<{ value: string; label: string }>
  disabled?: boolean
}

export function HotkeyRecorder({
  value,
  onSaved,
  validateHotkey,
  specialOptions,
  disabled = false,
}: HotkeyRecorderProps) {
  const { t } = useTranslation()
  const isMac = isMacPlatform()
  const [recording, setRecording] = useState(false)
  const [pending, setPending] = useState<string | null>(null)
  const [modifierHint, setModifierHint] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const autoConfirmTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  const confirmHotkey = useCallback(
    (hotkey: string) => {
      if (autoConfirmTimer.current) {
        clearTimeout(autoConfirmTimer.current)
        autoConfirmTimer.current = null
      }
      setRecording(false)
      setModifierHint(null)
      setPending(null)
      const validationError = validateHotkey?.(hotkey)
      if (validationError) {
        setError(validationError)
        resumeHotkey().catch((resumeError) => setError(String(resumeError)))
        return
      }
      setError(null)
      onSaved(hotkey)
      resumeHotkey().catch((resumeError) => setError(String(resumeError)))
    },
    [onSaved, validateHotkey],
  )

  const handleKeyDown = useCallback(
    (event: KeyboardEvent) => {
      event.preventDefault()
      event.stopPropagation()

      const parts: string[] = []
      if (isMac && event.metaKey) parts.push('Command')
      if (event.ctrlKey) parts.push('Ctrl')
      if (event.altKey) parts.push(isMac ? 'Option' : 'Alt')
      if (event.shiftKey) parts.push('Shift')
      if (!isMac && event.metaKey) parts.push('Meta')

      if (['Control', 'Shift', 'Alt', 'Meta'].includes(event.key)) {
        setModifierHint(parts.length > 0 ? `${parts.join('+')}+...` : null)
        return
      }

      setModifierHint(null)
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
        '。': '.',
        '?': '/',
      }
      let keyName = keyMap[event.key] || event.key
      if (keyName.length === 1) keyName = keyName.toUpperCase()
      if (parts.length === 0 && !STANDALONE_KEYS.has(keyName)) return

      parts.push(keyName)
      const combo = parts.join('+')
      setPending(combo)
      if (autoConfirmTimer.current) clearTimeout(autoConfirmTimer.current)
      autoConfirmTimer.current = setTimeout(() => confirmHotkey(combo), 1500)
    },
    [confirmHotkey, isMac],
  )

  useEffect(() => {
    if (!recording) return
    const clearModifierHint = () => setModifierHint(null)
    window.addEventListener('keydown', handleKeyDown, true)
    window.addEventListener('keyup', clearModifierHint, true)
    return () => {
      window.removeEventListener('keydown', handleKeyDown, true)
      window.removeEventListener('keyup', clearModifierHint, true)
      if (autoConfirmTimer.current) clearTimeout(autoConfirmTimer.current)
    }
  }, [handleKeyDown, recording])

  const handleClick = () => {
    if (disabled) return
    if (recording && pending) {
      confirmHotkey(pending)
    } else if (recording) {
      setRecording(false)
      setPending(null)
      setModifierHint(null)
      if (autoConfirmTimer.current) clearTimeout(autoConfirmTimer.current)
      resumeHotkey().catch(() => {})
    } else {
      pauseHotkey().catch(() => {})
      setRecording(true)
      setPending(null)
      setError(null)
    }
  }

  return (
    <div className="min-w-0">
      <button
        type="button"
        onClick={handleClick}
        disabled={disabled}
        className={`h-9 w-full rounded-[8px] border px-3 text-left font-mono text-[12px] transition-colors disabled:opacity-40 ${
          recording
            ? 'border-text-secondary bg-bg-tertiary text-text-primary ring-2 ring-text-secondary/20'
            : 'border-transparent bg-bg-secondary text-text-primary hover:border-border'
        }`}
      >
        {recording ? pending || modifierHint || t('settings.pressKeyCombination') : value}
      </button>
      {recording && pending && (
        <p className="mt-1 text-[11px] text-text-tertiary">{t('settings.clickToConfirm')}</p>
      )}
      {recording && specialOptions && specialOptions.length > 0 && (
        <div className="mt-1.5 flex flex-wrap gap-1.5">
          {specialOptions.map((option) => (
            <button
              key={option.value}
              type="button"
              onClick={() => confirmHotkey(option.value)}
              className="rounded-[8px] border border-border bg-bg-secondary px-2 py-1 text-[11px] text-text-secondary hover:border-border-focus hover:text-text-primary"
            >
              {option.label}
            </button>
          ))}
        </div>
      )}
      {error && <p className="mt-1 text-[11px] text-error">{error}</p>}
    </div>
  )
}

interface ShortcutBindingListProps {
  role: Extract<HotkeyRole, 'dictation' | 'ask' | 'translate'>
  label: string
  bindings: ShortcutBinding[]
  otherBindings: ShortcutBinding[]
  required: boolean
  specialOptions: Array<{ value: string; label: string }>
  onChange: (bindings: ShortcutBinding[]) => void
  disabled?: boolean
  trailingAction?: React.ReactNode
}

function bindingIdentity(binding: ShortcutBinding) {
  const semanticModifiers = binding.modifiers.map((modifier) => {
    if (modifier === 'Option') return 'Alt'
    if (modifier === 'Command') return 'Super'
    return modifier
  })
  return [...semanticModifiers, binding.primary].join('+')
}

export function ShortcutBindingList({
  role,
  label,
  bindings,
  otherBindings,
  required,
  specialOptions,
  onChange,
  disabled = false,
  trailingAction,
}: ShortcutBindingListProps) {
  const { t } = useTranslation()
  const [adding, setAdding] = useState(false)
  const atLimit = bindings.length >= MAX_BINDINGS

  useEffect(() => {
    if (atLimit) setAdding(false)
  }, [atLimit])

  const validate = (hotkey: string, editingIndex: number | null) => {
    const candidate = bindingFromHotkey(hotkey)
    if (!candidate) return t('settings.hotkeyInvalid')
    const identity = bindingIdentity(candidate)
    const ownConflicts = bindings.some(
      (binding, index) => index !== editingIndex && bindingIdentity(binding) === identity,
    )
    const externalConflict = otherBindings.some((binding) => bindingIdentity(binding) === identity)
    return ownConflicts || externalConflict ? t('settings.hotkeyConflict') : null
  }

  const saveAt = (index: number, hotkey: string) => {
    const binding = bindingFromHotkey(hotkey)
    if (!binding) return
    onChange(bindings.map((current, currentIndex) => (currentIndex === index ? binding : current)))
  }

  const move = (index: number, offset: -1 | 1) => {
    const target = index + offset
    if (target < 0 || target >= bindings.length) return
    const next = [...bindings]
    ;[next[index], next[target]] = [next[target], next[index]]
    onChange(next)
  }

  return (
    <div data-hotkey-role={role}>
      <div className="mb-1.5 flex min-h-7 items-center gap-2">
        <p className="min-w-0 flex-1 text-[12px] font-medium text-text-secondary">{label}</p>
        {trailingAction}
        <button
          type="button"
          aria-label={t('settings.shortcutAdd')}
          title={t('settings.shortcutAdd')}
          disabled={disabled || atLimit || adding}
          onClick={() => setAdding(true)}
          className="grid h-7 w-7 place-items-center rounded-[6px] border-none bg-transparent text-text-tertiary hover:bg-bg-hover hover:text-text-primary disabled:opacity-35"
        >
          <Plus size={14} />
        </button>
      </div>

      <div className="space-y-1.5">
        {bindings.map((binding, index) => (
          <div key={`${bindingIdentity(binding)}-${index}`} className="flex min-w-0 items-start gap-1">
            <div className="min-w-0 flex-1">
              <HotkeyRecorder
                value={hotkeyFromBinding(binding)}
                disabled={disabled}
                specialOptions={specialOptions}
                validateHotkey={(hotkey) => validate(hotkey, index)}
                onSaved={(hotkey) => saveAt(index, hotkey)}
              />
              <p
                aria-hidden={index !== 0}
                className={`mt-0.5 h-3 text-[10px] text-text-tertiary ${
                  index === 0 ? '' : 'invisible'
                }`}
              >
                {t('settings.shortcutPrimary')}
              </p>
            </div>
            <button
              type="button"
              aria-label={t('settings.shortcutMoveUp')}
              title={t('settings.shortcutMoveUp')}
              disabled={disabled || index === 0}
              onClick={() => move(index, -1)}
              className="grid h-9 w-7 flex-none place-items-center rounded-[6px] border-none bg-transparent text-text-tertiary hover:bg-bg-hover hover:text-text-primary disabled:opacity-25"
            >
              <ArrowUp size={13} />
            </button>
            <button
              type="button"
              aria-label={t('settings.shortcutMoveDown')}
              title={t('settings.shortcutMoveDown')}
              disabled={disabled || index === bindings.length - 1}
              onClick={() => move(index, 1)}
              className="grid h-9 w-7 flex-none place-items-center rounded-[6px] border-none bg-transparent text-text-tertiary hover:bg-bg-hover hover:text-text-primary disabled:opacity-25"
            >
              <ArrowDown size={13} />
            </button>
            <button
              type="button"
              aria-label={t('settings.shortcutRemove')}
              title={t('settings.shortcutRemove')}
              disabled={disabled || (required && bindings.length === 1)}
              onClick={() => onChange(bindings.filter((_, currentIndex) => currentIndex !== index))}
              className="grid h-9 w-7 flex-none place-items-center rounded-[6px] border-none bg-transparent text-text-tertiary hover:bg-bg-hover hover:text-error disabled:opacity-25"
            >
              <Trash2 size={13} />
            </button>
          </div>
        ))}

        {adding && !atLimit && (
          <div className="flex min-w-0 items-start gap-1">
            <div className="min-w-0 flex-1">
              <HotkeyRecorder
                value="—"
                disabled={disabled}
                specialOptions={specialOptions}
                validateHotkey={(hotkey) => validate(hotkey, null)}
                onSaved={(hotkey) => {
                  const binding = bindingFromHotkey(hotkey)
                  if (!binding) return
                  setAdding(false)
                  onChange([...bindings, binding])
                }}
              />
            </div>
            <button
              type="button"
              aria-label={t('settings.shortcutRemove')}
              title={t('settings.shortcutRemove')}
              onClick={() => setAdding(false)}
              className="grid h-9 w-7 flex-none place-items-center rounded-[6px] border-none bg-transparent text-text-tertiary hover:bg-bg-hover hover:text-error"
            >
              <Trash2 size={13} />
            </button>
          </div>
        )}
      </div>

      {atLimit && <p className="mt-1 text-[10px] text-text-tertiary">{t('settings.shortcutMax')}</p>}
    </div>
  )
}
