import { GOOGLE_CLIENT_ID } from '@/utils/constants'

const GIS_SRC = 'https://accounts.google.com/gsi/client'

/** The single field we use off the GIS credential callback. */
interface CredentialResponse {
  credential: string
}

interface GoogleIdApi {
  initialize(config: {
    client_id: string
    callback: (response: CredentialResponse) => void
    auto_select?: boolean
    cancel_on_tap_outside?: boolean
    use_fedcm_for_prompt?: boolean
  }): void
  renderButton(parent: HTMLElement, options: Record<string, unknown>): void
  prompt(): void
  cancel(): void
  disableAutoSelect(): void
}

declare global {
  interface Window {
    google?: { accounts: { id: GoogleIdApi } }
  }
}

/** De-duped script load, shared across every `useGoogleAuth()` caller. */
let scriptPromise: Promise<void> | null = null

function loadGisScript(): Promise<void> {
  if (typeof window === 'undefined') return Promise.reject(new Error('Google sign-in needs a browser.'))
  if (window.google?.accounts?.id) return Promise.resolve()
  if (scriptPromise) return scriptPromise

  scriptPromise = new Promise<void>((resolve, reject) => {
    const script = document.createElement('script')
    script.src = GIS_SRC
    script.async = true
    script.defer = true
    script.onload = () => resolve()
    script.onerror = () => {
      scriptPromise = null // allow a retry on the next attempt
      reject(new Error('Failed to load Google sign-in.'))
    }
    document.head.appendChild(script)
  })
  return scriptPromise
}

export function useGoogleAuth() {
  const isConfigured = Boolean(GOOGLE_CLIENT_ID)

  async function init(onCredential: (credential: string) => void): Promise<void> {
    if (!isConfigured) throw new Error('Missing VITE_GOOGLE_CLIENT_ID')
    await loadGisScript()
    window.google!.accounts.id.initialize({
      client_id: GOOGLE_CLIENT_ID as string,
      callback: (response) => onCredential(response.credential),
      cancel_on_tap_outside: true,
      use_fedcm_for_prompt: true,
    })
  }

  /** Paint Google's official sign-in button into `el`. */
  function renderButton(el: HTMLElement, options: Record<string, unknown> = {}): void {
    window.google?.accounts.id.renderButton(el, {
      type: 'standard',
      theme: 'filled_black',
      size: 'large',
      text: 'continue_with',
      shape: 'rectangular',
      logo_alignment: 'left',
      width: 336,
      ...options,
    })
  }

  /** Show the floating One Tap account-chooser card. */
  function prompt(): void {
    window.google?.accounts.id.prompt()
  }

  /** Dismiss the One Tap card (e.g. when the dialog closes). */
  function cancel(): void {
    window.google?.accounts.id.cancel()
  }

  return { isConfigured, init, renderButton, prompt, cancel }
}
