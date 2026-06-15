import { defineStore } from 'pinia'
import { ApiError, apiFetch } from '@/utils/api'
import { storage } from '@/utils/storage'
import { AUTH_TOKEN_STORAGE_KEY } from '@/utils/constants'
import type { AuthData, LoginPayload, RegisterPayload, User } from '@/types/auth'

interface AuthState {
  /** Profile of the signed-in user, or `null` when signed out. */
  user: User | null
  /** Bearer access token, restored from localStorage on init. */
  token: string | null
  /** In-flight flag for any auth request (drives button spinners). */
  loading: boolean
  /** Last human-readable error message, or `null`. */
  error: string | null
}

function messageOf(error: unknown): string {
  if (error instanceof ApiError) return error.message
  if (error instanceof Error) return error.message
  return 'Something went wrong. Please try again.'
}

/**
 * Authentication state for the SRVJ backend. The token is persisted via the
 * `storage` wrapper and replayed on init; the editor itself stays usable while
 * signed out, so this store is purely additive (no route guarding).
 */
export const useAuthStore = defineStore('auth', {
  state: (): AuthState => ({
    user: null,
    token: storage.get<string>(AUTH_TOKEN_STORAGE_KEY),
    loading: false,
    error: null,
  }),

  getters: {
    isAuthenticated: (state): boolean => Boolean(state.token && state.user),
  },

  actions: {
    /** Persist (or clear) the bearer token in both state and localStorage. */
    setToken(token: string | null) {
      this.token = token
      if (token) storage.set(AUTH_TOKEN_STORAGE_KEY, token)
      else storage.remove(AUTH_TOKEN_STORAGE_KEY)
    },

    /** Drop all client-side session state (used on logout and 401). */
    clearSession() {
      this.user = null
      this.setToken(null)
    },

    async login(payload: LoginPayload) {
      this.loading = true
      this.error = null
      try {
        const data = await apiFetch<AuthData>('/auth/login', { method: 'POST', body: payload })
        this.setToken(data.token)
        await this.fetchProfile()
      } catch (error) {
        this.error = messageOf(error)
        throw error
      } finally {
        this.loading = false
      }
    },

    async register(payload: RegisterPayload) {
      this.loading = true
      this.error = null
      try {
        await apiFetch('/auth/register', { method: 'POST', body: payload })
        // The register endpoint doesn't reliably return a token, so sign in
        // with the same credentials to land in an authenticated state.
        await this.login({ email: payload.email, password: payload.password })
      } catch (error) {
        this.error = messageOf(error)
        throw error
      } finally {
        this.loading = false
      }
    },

    /** Fetch `/user/me`; clears the session if the token is rejected (401). */
    async fetchProfile() {
      if (!this.token) return
      try {
        this.user = await apiFetch<User>('/user/me', { token: this.token })
      } catch (error) {
        if (error instanceof ApiError && error.status === 401) this.clearSession()
        throw error
      }
    },

    /** Exchange the httpOnly refresh cookie for a fresh access token. */
    async refresh() {
      const data = await apiFetch<AuthData>('/auth/refresh', { method: 'POST' })
      this.setToken(data.token)
      return data.token
    },

    async logout() {
      try {
        await apiFetch('/auth/logout', { method: 'POST', token: this.token })
      } catch {
        // Logging out client-side must always succeed even if the call fails.
      } finally {
        this.clearSession()
      }
    },

    /**
     * Called once on app startup: if a persisted token exists, validate it by
     * loading the profile. Failures are swallowed (the session is cleared in
     * `fetchProfile` on 401), so the editor never blocks on auth.
     */
    async init() {
      if (!this.token) return
      try {
        await this.fetchProfile()
      } catch {
        // Stale/invalid token already cleared; nothing more to do.
      }
    },
  },
})
