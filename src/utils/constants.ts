import type {
  FillStyle,
  NodeColor,
  NodeShape,
  NodeVariant,
  StrokeStyle,
  StrokeWidth,
} from '@/types/diagram'

export const SITE_URL = 'https://srvj.elrefai.me'
export const SITE_NAME = 'SRVJ'
export const SITE_DESCRIPTION =
  'SRVJ is a free, browser-based diagram editor and whiteboard — flowcharts, ERDs, mind maps and sticky notes on one infinite canvas.'
export const DIAGRAM_VERSION = 3
export const STORAGE_KEY = 'srvj:diagram'
export const THEME_STORAGE_KEY = 'srvj:theme'
export const SKETCH_STORAGE_KEY = 'srvj:sketch'
export const AUTH_TOKEN_STORAGE_KEY = 'srvj:auth-token'

/**
 * Base URL of the SRVJ backend (all auth/user endpoints live under it).
 * Override per-environment with a `VITE_API_URL` env var.
 */
export const API_BASE_URL = import.meta.env.VITE_API_URL as string | undefined

/**
 * Google OAuth **web** client ID, used to render the Google Identity Services
 * sign-in popup / One Tap card. Set it via `VITE_GOOGLE_CLIENT_ID`; when absent,
 * the auth dialog falls back to the server-redirect Google button.
 */
export const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID as string | undefined

/**
 * WebSocket URL of the CRDT (Yjs / y-websocket) presence + sync server. Live
 * collaboration cursors connect here, joining a channel named after the room
 * (or the diagram id). Set it via `VITE_CRDT_WS_URL` (e.g. `wss://crdt.srvj…`);
 * when absent, presence is disabled and the editor is single-player.
 */
export const CRDT_WS_URL = import.meta.env.VITE_CRDT_WS_URL as string | undefined

/**
 * Base WebSocket URL of the Yjs **document** collaboration server (standard
 * `y-websocket`), which lives at the `/collab` path on the same host as the REST
 * API. This value is the *base only* (ends in `/collab`, no id, no trailing
 * slash): the provider joins `serverUrl + '/' + roomName`, where roomName is the
 * diagram's `site_id` uuid, so the final handshake URL is
 * `wss://<host>/collab/<site_id>`. The backend authorizes by validating that
 * last path segment as a uuid.
 *
 * Auth is the existing httpOnly `access_token` cookie (sent automatically by the
 * browser over TLS — never read in JS), so connect over `wss://` and ensure the
 * frontend origin is in the backend CORS allowlist, or the upgrade is rejected.
 *
 * Resolution order: explicit `VITE_WS_URL` (a base, e.g. `wss://api.example.com`)
 * with `/collab` appended; otherwise derived from {@link API_BASE_URL}'s origin
 * (http→ws, https→wss). `undefined` when neither is available — document collab
 * is then disabled and the editor loads the diagram read-only.
 */
function deriveCollabWsUrl(): string | undefined {
  const explicit = import.meta.env.VITE_WS_URL as string | undefined
  if (explicit) return `${explicit.replace(/\/+$/, '')}/collab`
  if (!API_BASE_URL) return undefined
  try {
    const url = new URL(API_BASE_URL)
    const protocol = url.protocol === 'https:' ? 'wss:' : 'ws:'
    return `${protocol}//${url.host}/collab`
  } catch {
    return undefined
  }
}
export const COLLAB_WS_URL = deriveCollabWsUrl()

export const AUTOSAVE_DELAY = 500
export const MAX_HISTORY = 50
export const DEFAULT_VARIANT: NodeVariant = 'default'
export const DEFAULT_SHAPE: NodeShape = 'rectangle'
export const DEFAULT_COLOR: NodeColor = 'slate'
// Excalidraw-style: new shapes are outline-only (the canvas shows through).
// Sticky notes are forced solid at creation (see `buildNode`).
export const DEFAULT_FILL_STYLE: FillStyle = 'transparent'
export const DEFAULT_STROKE_STYLE: StrokeStyle = 'solid'
export const DEFAULT_STROKE_WIDTH: StrokeWidth = 'medium'
export const DEFAULT_OPACITY = 100
