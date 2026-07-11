import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { ShortcutBindingList } from '../ShortcutBindingList'
import * as tauri from '../../../lib/tauri'

vi.mock('../../../lib/tauri', () => ({
  pauseHotkey: vi.fn().mockResolvedValue(undefined),
  resumeHotkey: vi.fn().mockResolvedValue(undefined),
}))

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) =>
      ({
        'settings.pressKeyCombination': 'Press a key combination...',
        'settings.clickToConfirm': 'Click to confirm',
        'settings.shortcutAdd': 'Add shortcut',
        'settings.shortcutRemove': 'Remove shortcut',
        'settings.shortcutMoveUp': 'Move shortcut up',
        'settings.shortcutMoveDown': 'Move shortcut down',
        'settings.shortcutPrimary': 'Primary',
        'settings.shortcutMax': 'Up to three shortcuts',
        'settings.hotkeyConflict': 'Shortcut conflict',
      })[key] || key,
  }),
}))

const ctrlSlash = { primary: '/', modifiers: ['Ctrl'] }
const f8 = { primary: 'F8', modifiers: [] }
const f9 = { primary: 'F9', modifiers: [] }

describe('ShortcutBindingList', () => {
  beforeEach(() => vi.clearAllMocks())
  afterEach(cleanup)

  it('adds bindings up to three and disables a fourth', () => {
    const onChange = vi.fn()
    const { rerender } = render(
      <ShortcutBindingList
        role="dictation"
        label="Dictate"
        bindings={[ctrlSlash]}
        otherBindings={[]}
        required
        specialOptions={[{ value: 'F8', label: 'F8' }]}
        onChange={onChange}
      />,
    )

    fireEvent.click(screen.getByRole('button', { name: 'Add shortcut' }))
    fireEvent.click(screen.getByRole('button', { name: '—' }))
    fireEvent.click(screen.getByRole('button', { name: 'F8' }))
    expect(onChange).toHaveBeenCalledWith([ctrlSlash, f8])

    rerender(
      <ShortcutBindingList
        role="dictation"
        label="Dictate"
        bindings={[ctrlSlash, f8, f9]}
        otherBindings={[]}
        required
        specialOptions={[]}
        onChange={onChange}
      />,
    )
    expect(screen.getByRole('button', { name: 'Add shortcut' })).toBeDisabled()
    expect(screen.getByText('Up to three shortcuts')).toBeInTheDocument()
  })

  it('reorders rows, shifts primary, and keeps the last required binding', () => {
    const onChange = vi.fn()
    render(
      <ShortcutBindingList
        role="dictation"
        label="Dictate"
        bindings={[ctrlSlash, f8]}
        otherBindings={[]}
        required
        specialOptions={[]}
        onChange={onChange}
      />,
    )

    fireEvent.click(screen.getAllByRole('button', { name: 'Move shortcut up' })[1])
    expect(onChange).toHaveBeenCalledWith([f8, ctrlSlash])

    const removeButtons = screen.getAllByRole('button', { name: 'Remove shortcut' })
    expect(removeButtons[0]).not.toBeDisabled()
  })

  it('allows optional roles to remove their final binding', () => {
    const onChange = vi.fn()
    render(
      <ShortcutBindingList
        role="ask"
        label="Ask"
        bindings={[f8]}
        otherBindings={[]}
        required={false}
        specialOptions={[]}
        onChange={onChange}
      />,
    )

    fireEvent.click(screen.getByRole('button', { name: 'Remove shortcut' }))
    expect(onChange).toHaveBeenCalledWith([])
  })

  it('rejects a captured shortcut already used by another role', () => {
    const onChange = vi.fn()
    render(
      <ShortcutBindingList
        role="ask"
        label="Ask"
        bindings={[f8]}
        otherBindings={[ctrlSlash]}
        required={false}
        specialOptions={[{ value: 'Ctrl+/', label: 'Ctrl + /' }]}
        onChange={onChange}
      />,
    )

    fireEvent.click(screen.getByRole('button', { name: 'F8' }))
    fireEvent.click(screen.getByRole('button', { name: 'Ctrl + /' }))

    expect(screen.getByText('Shortcut conflict')).toBeInTheDocument()
    expect(onChange).not.toHaveBeenCalled()
    expect(tauri.resumeHotkey).toHaveBeenCalled()
  })
})
