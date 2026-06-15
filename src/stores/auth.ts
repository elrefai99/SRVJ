import { defineStore } from 'pinia'
import { ApiError, apiFetch, registerTokenRefresher } from '@/utils/api'
import { storage } from '@/utils/storage'
import { API_BASE_URL, AUTH_TOKEN_STORAGE_KEY } from '@/utils/constants'
import type {
  AuthData,
  LoginPayload,
  RegisterPayload,
  UpdateProfilePayload,
  User,
} from '@/types/auth'

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

    /**
     * Begin the server-side Google OAuth flow by handing the browser off to the
     * backend's `/auth/google` route. The backend walks the user through
     * Google's consent screen and redirects back to the app with a `?token=`,
     * which {@link consumeRedirectToken} adopts on the next load. This navigates
     * away from the page, so it never returns.
     */
    loginWithGoogle() {
      if (!API_BASE_URL) {
        this.error = 'Google sign-in is unavailable right now.'
        return
      }
      this.error = null
      window.location.href = `${API_BASE_URL}/auth/google`
    },

    /**
     * Exchange a Google ID token (the `credential` from the Identity Services
     * popup / One Tap) for an SRVJ session: POST it to `/auth/google`, store the
     * returned bearer token, then load the profile — same end state as a normal
     * `login`. The backend is responsible for verifying the credential's
     * signature and audience before issuing a token.
     */
    async loginWithGoogleCredential(credential: string) {
      this.loading = true
      this.error = null
      try {
        const data = await apiFetch<AuthData>('/auth/google', {
          method: 'POST',
          body: { credential },
        })
        this.setToken(data.token)
        await this.fetchProfile()
      } catch (error) {
        this.error = messageOf(error)
        throw error
      } finally {
        this.loading = false
      }
    },

    /**
     * Adopt an access token handed back in the URL by the Google OAuth redirect
     * (`/?token=<jwt>`), then strip it (and any `auth_error`) from the address
     * bar so it isn't bookmarked, shared, or logged. A `?auth_error=` is
     * surfaced via `error` instead. Returns `true` when a token was adopted.
     */
    consumeRedirectToken(): boolean {
      if (typeof window === 'undefined') return false

      const params = new URLSearchParams(window.location.search)
      const token = params.get('token')
      const authError = params.get('auth_error')
      if (!token && !authError) return false

      // Scrub the auth params and rewrite the URL without a navigation.
      params.delete('token')
      params.delete('auth_error')
      const query = params.toString()
      const cleanUrl = `${window.location.pathname}${query ? `?${query}` : ''}${window.location.hash}`
      window.history.replaceState({}, '', cleanUrl)

      if (authError) {
        this.error = authError
        return false
      }
      if (token) {
        this.setToken(token)
        return true
      }
      return false
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

    /**
     * Update the signed-in user's profile (name and/or avatar). Sends a
     * multipart body so the new avatar `img` file rides along, then refreshes
     * `user` from the canonical `/user/me` so the UI reflects the server state.
     */
    async updateProfile(payload: UpdateProfilePayload) {
      this.loading = true
      this.error = null
      try {
        const form = new FormData()
        if (payload.fullname !== undefined) form.append('fullname', payload.fullname)
        if (payload.img) form.append('img', payload.img)

        await apiFetch('/user/update', { method: 'PUT', body: form, token: this.token })
        await this.fetchProfile()
      } catch (error) {
        this.error = messageOf(error)
        throw error
      } finally {
        this.loading = false
      }
    },

    /**
     * Permanently delete the signed-in user's account, then clear the local
     * session. Irreversible — the caller is responsible for confirming intent.
     */
    async deleteAccount() {
      this.loading = true
      this.error = null
      try {
        await apiFetch('/user/delete', { method: 'DELETE', token: this.token })
        this.clearSession()
      } catch (error) {
        this.error = messageOf(error)
        throw error
      } finally {
        this.loading = false
      }
    },

    /**
     * Exchange the httpOnly refresh cookie for a fresh access token. Returns
     * the new token, or `null` if the session can't be renewed (the refresh
     * cookie is missing/expired) — in which case the session is cleared so the
     * user is prompted to sign in again. `skipAuthRefresh` stops a failed
     * refresh from recursing back into `apiFetch`'s retry path.
     */
    async refresh(): Promise<string | null> {
      try {
        const data = await apiFetch<AuthData>('/auth/refresh', {
          method: 'POST',
          skipAuthRefresh: true,
        })
        this.setToken(data.token)
        return data.token
      } catch (error) {
        if (error instanceof ApiError && error.status === 401) this.clearSession()
        return null
      }
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
      // Let apiFetch transparently renew an expired access token on any 401.
      registerTokenRefresher(() => this.refresh())
      // Adopt a token returned by the Google OAuth redirect, if we just landed
      // back from one — this seeds `this.token` before the check below.
      this.consumeRedirectToken()
      if (!this.token) return
      try {
        await this.fetchProfile()
      } catch {
        // Stale/invalid token already cleared; nothing more to do.
      }
    },
  },
})
