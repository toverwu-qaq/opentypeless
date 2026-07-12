import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import i18n from '../../../i18n'
import { useAuthStore } from '../../../stores/authStore'
import { AccountPage } from '../index'

vi.mock('@tauri-apps/plugin-opener', () => ({ openUrl: vi.fn() }))
vi.mock('@tauri-apps/plugin-clipboard-manager', () => ({ readText: vi.fn() }))
vi.mock('../../../lib/api', () => ({
  uploadBackup: vi.fn(),
  downloadBackup: vi.fn(),
  createPortalSession: vi.fn(),
}))

const requestPasswordReset = vi.fn().mockResolvedValue(undefined)
const changePassword = vi.fn().mockResolvedValue(undefined)
const refreshCredentialCapability = vi.fn().mockResolvedValue(undefined)

function signedIn(capability: 'unknown' | 'present' | 'none') {
  useAuthStore.setState({
    user: {
      id: 'user-1',
      email: 'person@example.com',
      name: 'Person',
      emailVerified: true,
    },
    loading: false,
    error: null,
    credentialCapability: capability,
    plan: 'free',
    source: 'free',
    displayName: 'Free',
    requestPasswordReset,
    changePassword,
    refreshCredentialCapability,
  })
}

describe('AccountPage password controls', () => {
  beforeEach(async () => {
    vi.clearAllMocks()
    await i18n.changeLanguage('en')
    useAuthStore.setState({
      user: null,
      loading: false,
      error: null,
      emailVerificationPending: false,
      pendingEmail: null,
      credentialCapability: 'unknown',
      requestPasswordReset,
      changePassword,
      refreshCredentialCapability,
    })
  })

  afterEach(cleanup)

  it('places forgot password beneath the signed-out password field and uses the current locale', async () => {
    await i18n.changeLanguage('zh')
    render(<AccountPage />)

    const password = screen.getByLabelText('密码')
    const forgot = screen.getByRole('button', { name: '忘记密码？' })
    expect(password.compareDocumentPosition(forgot) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()

    fireEvent.click(forgot)
    fireEvent.change(screen.getByLabelText('邮箱'), { target: { value: 'person@example.com' } })
    fireEvent.click(screen.getByRole('button', { name: '发送重置链接' }))

    await waitFor(() => {
      expect(requestPasswordReset).toHaveBeenCalledWith('person@example.com', 'zh')
    })
    expect(screen.getByText('请检查邮箱')).toBeInTheDocument()
  })

  it('opens credential password controls in a focused modal and keeps invalid forms disabled', () => {
    signedIn('present')
    render(<AccountPage />)

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(screen.queryByLabelText('Current password')).not.toBeInTheDocument()
    const trigger = screen.getByRole('button', { name: 'Change password' })
    fireEvent.click(trigger)
    const dialog = screen.getByRole('dialog', { name: 'Change password' })
    expect(dialog.parentElement).toHaveClass('z-[9999]')
    expect(within(dialog).getByLabelText('Current password')).toHaveFocus()
    const submit = within(dialog).getByRole('button', { name: 'Change password' })
    expect(submit).toBeDisabled()

    fireEvent.change(within(dialog).getByLabelText('Current password'), {
      target: { value: 'old-password' },
    })
    fireEvent.change(within(dialog).getByLabelText('New password'), {
      target: { value: 'new-password' },
    })
    fireEvent.change(within(dialog).getByLabelText('Confirm password'), {
      target: { value: 'different' },
    })
    expect(submit).toBeDisabled()

    fireEvent.change(within(dialog).getByLabelText('Confirm password'), {
      target: { value: 'new-password' },
    })
    expect(submit).toBeEnabled()

    fireEvent.keyDown(window, { key: 'Escape' })
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(trigger).toHaveFocus()
  })

  it('renders Set password for OAuth-only accounts', () => {
    signedIn('none')
    render(<AccountPage />)

    fireEvent.click(screen.getByRole('button', { name: 'Set password' }))
    const dialog = screen.getByRole('dialog', { name: 'Set password' })
    expect(within(dialog).queryByLabelText('Current password')).not.toBeInTheDocument()
    expect(within(dialog).getByLabelText('New password')).toHaveFocus()
    expect(screen.queryByRole('button', { name: 'Change password' })).not.toBeInTheDocument()
  })

  it('renders neither password action while capability is unknown', () => {
    signedIn('unknown')
    render(<AccountPage />)

    expect(screen.queryByRole('button', { name: 'Set password' })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Change password' })).not.toBeInTheDocument()
    expect(screen.queryByText(/dashboard/i)).not.toBeInTheDocument()
  })
})
