import { API_BASE_URL } from './constants'
import type { ApiEnvelope } from '@/types/auth'

/**
 * Error thrown by {@link apiFetch} for any non-successful request. `status` is
 * the HTTP status (or `0` for a network/transport failure) so callers can
 * branch on `401` to clear a stale session.
 */
export class ApiError extends Error {
  status: number

  constructor(message: string, status: number) {
    super(message)
    this.name = 'ApiError'
    this.status = status
  }
}

interface RequestOptions {
  method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE'
  /** Serialised as JSON; sets the `Content-Type` header when present. */
  body?: unknown
  /** Bearer access token attached as `Authorization: Bearer <token>`. */
  token?: string | null
}

/**
 * Thin fetch wrapper around the SRVJ backend. Attaches the bearer token, sends
 * credentials (so the httpOnly refresh cookie rides along where same-site),
 * unwraps the standard {@link ApiEnvelope}, and throws {@link ApiError} on any
 * failure — including the raw-HTML error pages the backend occasionally
 * returns, which would otherwise blow up `response.json()`.
 */
export async function apiFetch<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const { method = 'GET', body, token } = options

  const headers: Record<string, string> = {}
  if (body !== undefined) headers['Content-Type'] = 'application/json'
  if (token) headers.Authorization = `Bearer ${token}`

  let response: Response
  try {
    response = await fetch(`${API_BASE_URL}${path}`, {
      method,
      headers,
      credentials: 'include',
      body: body === undefined ? undefined : JSON.stringify(body),
    })
  } catch {
    throw new ApiError('Network error — please check your connection and try again.', 0)
  }

  let envelope: ApiEnvelope<T> | null = null
  try {
    envelope = (await response.json()) as ApiEnvelope<T>
  } catch {
    envelope = null
  }

  if (!response.ok || !envelope?.success) {
    throw new ApiError(
      envelope?.message ?? `Request failed (${response.status})`,
      response.status,
    )
  }

  return envelope.data
}
