import { cleanup, fireEvent, render, screen, within } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import type { TranslationConfig } from '../../../stores/appStore'
import { TranslationTargets } from '../TranslationTargets'

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => key,
  }),
}))

afterEach(cleanup)

function renderTargets(
  value: TranslationConfig = {
    targets: ['en', 'ja'],
    active_target: 'en',
  },
) {
  const onChange = vi.fn()
  render(<TranslationTargets value={value} onChange={onChange} />)
  return onChange
}

describe('TranslationTargets', () => {
  it('keeps language choices unique and adds the first available target', () => {
    const onChange = renderTargets()

    const japaneseRow = screen.getByTestId('translation-target-ja')
    expect(within(japaneseRow).queryByRole('option', { name: 'English' })).not.toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: 'settings.addTranslationTarget' }))

    expect(onChange).toHaveBeenCalledWith({
      targets: ['en', 'ja', 'zh'],
      active_target: 'en',
    })
  })

  it('caps the ordered target set at five', () => {
    renderTargets({
      targets: ['en', 'ja', 'zh', 'fr', 'de'],
      active_target: 'en',
    })

    expect(screen.getByRole('button', { name: 'settings.addTranslationTarget' })).toBeDisabled()
    expect(screen.getAllByTestId(/^translation-target-/)).toHaveLength(5)
  })

  it('reorders targets without changing the active target', () => {
    const onChange = renderTargets({
      targets: ['en', 'ja', 'fr'],
      active_target: 'ja',
    })

    fireEvent.click(screen.getByRole('button', { name: 'settings.moveTranslationTargetUp ja' }))

    expect(onChange).toHaveBeenCalledWith({
      targets: ['ja', 'en', 'fr'],
      active_target: 'ja',
    })
  })

  it('selects the nearest remaining target when removing the active target', () => {
    const onChange = renderTargets({
      targets: ['en', 'ja', 'fr'],
      active_target: 'ja',
    })

    fireEvent.click(screen.getByRole('button', { name: 'settings.removeTranslationTarget ja' }))

    expect(onChange).toHaveBeenCalledWith({
      targets: ['en', 'fr'],
      active_target: 'fr',
    })
  })

  it('does not allow removing the final target and exposes active selection', () => {
    renderTargets({ targets: ['en'], active_target: 'en' })

    expect(
      screen.getByRole('button', { name: 'settings.removeTranslationTarget en' }),
    ).toBeDisabled()
    expect(
      screen.getByRole('radio', { name: 'settings.setActiveTranslationTarget en' }),
    ).toBeChecked()
  })
})
