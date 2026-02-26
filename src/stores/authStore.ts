import { create } from 'zustand'
import { invoke } from '@tauri-apps/api/core'
import { authClient } from '../lib/auth-client'
import { getSubscriptionStatus } from '../lib/api'
import { toast } from '../components/Toast'

let sttWarningShown = false
let llmWarningShown = false

export interface AuthUser {
  id: string
  email: string
  name: string | null
}

interface AuthState {
  // User
  user: AuthUser | null
  plan: 'free' | 'pro'
  subscriptionEnd: string | null

  // Quotas
  sttSecondsUsed: number
  sttSecondsLimit: number
  llmTokensUsed: number
  llmTokensLimit: number

  // Loading
  loading: boolean
  error: string | null

  // Actions
  initialize: () => Promise<void>
  signIn: (email: string, password: string) => Promise<void>
  signUp: (email: string, password: string, name: string) => Promise<void>
  signOut: () => Promise<void>
  refreshSubscription: () => Promise<void>
  handleDeepLinkToken: (token: string) => Promise<void>
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  plan: 'free',
  subscriptionEnd: null,
  sttSecondsUsed: 0,
  sttSecondsLimit: 0,
  llmTokensUsed: 0,
  llmTokensLimit: 0,
  loading: false,
  error: null,

  initialize: async () => {
    try {
      set({ loading: true, error: null })
      const { data: session } = await authClient.getSession()
      if (session?.user) {
        set({
          user: {
            id: session.user.id,
            email: session.user.email,
            name: session.user.name ?? null,
          },
        })
        // Push saved session token to Rust for cloud providers
        const savedToken = localStorage.getItem('session_token')
        if (savedToken) {
          await invoke('set_session_token', { token: savedToken }).catch(() => {})
        }
        await get().refreshSubscription()
      }
    } catch {
      // Not logged in — that's fine
    } finally {
      set({ loading: false })
    }
  },

  signIn: async (email, password) => {
    set({ loading: true, error: null })
    try {
      const { data, error } = await authClient.signIn.email(
        { email, password },
        {
          onSuccess: async (ctx) => {
            const token = ctx.response.headers.get('set-auth-token')
            if (token) {
              localStorage.setItem('session_token', token)
              await invoke('set_session_token', { token }).catch(() => {})
            }
          },
        },
      )
      if (error) throw new Error(error.message ?? 'Sign in failed')
      if (data?.user) {
        set({
          user: {
            id: data.user.id,
            email: data.user.email,
            name: data.user.name ?? null,
          },
        })
        await get().refreshSubscription()
      }
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Sign in failed'
      set({ error: msg })
      throw e
    } finally {
      set({ loading: false })
    }
  },

  signUp: async (email, password, name) => {
    set({ loading: true, error: null })
    try {
      const { data, error } = await authClient.signUp.email(
        { email, password, name },
        {
          onSuccess: async (ctx) => {
            const token = ctx.response.headers.get('set-auth-token')
            if (token) {
              localStorage.setItem('session_token', token)
              await invoke('set_session_token', { token }).catch(() => {})
            }
          },
        },
      )
      if (error) throw new Error(error.message ?? 'Sign up failed')
      if (data?.user) {
        set({
          user: {
            id: data.user.id,
            email: data.user.email,
            name: data.user.name ?? null,
          },
        })
        await get().refreshSubscription()
      }
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Sign up failed'
      set({ error: msg })
      throw e
    } finally {
      set({ loading: false })
    }
  },

  signOut: async () => {
    try {
      await authClient.signOut()
    } finally {
      // Clear session token in localStorage and Rust
      localStorage.removeItem('session_token')
      await invoke('set_session_token', { token: '' }).catch(() => {})
      set({
        user: null,
        plan: 'free',
        subscriptionEnd: null,
        sttSecondsUsed: 0,
        sttSecondsLimit: 0,
        llmTokensUsed: 0,
        llmTokensLimit: 0,
        error: null,
      })
      sttWarningShown = false
      llmWarningShown = false
    }
  },

  refreshSubscription: async () => {
    try {
      const status = await getSubscriptionStatus()
      set({
        plan: status.plan,
        subscriptionEnd: status.subscriptionEnd,
        sttSecondsUsed: status.sttSecondsUsed,
        sttSecondsLimit: status.sttSecondsLimit,
        llmTokensUsed: status.llmTokensUsed,
        llmTokensLimit: status.llmTokensLimit,
      })
      if (status.plan === 'pro') {
        if (status.sttSecondsLimit > 0 && status.sttSecondsUsed / status.sttSecondsLimit >= 0.9 && !sttWarningShown) {
          toast('STT quota is above 90%. Consider switching to BYOK mode.', 'error')
          sttWarningShown = true
        }
        if (status.llmTokensLimit > 0 && status.llmTokensUsed / status.llmTokensLimit >= 0.9 && !llmWarningShown) {
          toast('LLM quota is above 90%. Consider switching to BYOK mode.', 'error')
          llmWarningShown = true
        }
      }
    } catch (e) {
      console.warn('Failed to refresh subscription status:', e instanceof Error ? e.message : e)
    }
  },

  handleDeepLinkToken: async (token: string) => {
    try {
      set({ loading: true, error: null })
      localStorage.setItem('session_token', token)
      await invoke('set_session_token', { token }).catch(() => {})
      const { data: session } = await authClient.getSession({
        fetchOptions: {
          headers: { Authorization: `Bearer ${token}` },
        },
      })
      if (session?.user) {
        set({
          user: {
            id: session.user.id,
            email: session.user.email,
            name: session.user.name ?? null,
          },
        })
        await get().refreshSubscription()
      }
    } catch {
      set({ error: 'Failed to authenticate with token' })
    } finally {
      set({ loading: false })
    }
  },
}))
