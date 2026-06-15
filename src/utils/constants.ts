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
  'SRVJ is a free, browser-based diagram editor and whiteboard — a Draw.io-style flow editor with an Excalidraw hand-drawn look and Miro-style sticky notes. No sign-up, works offline.'
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
export const AUTOSAVE_DELAY = 500
export const MAX_HISTORY = 50
export const DEFAULT_VARIANT: NodeVariant = 'default'
export const DEFAULT_SHAPE: NodeShape = 'rectangle'
export const DEFAULT_COLOR: NodeColor = 'slate'
export const DEFAULT_FILL_STYLE: FillStyle = 'solid'
export const DEFAULT_STROKE_STYLE: StrokeStyle = 'solid'
export const DEFAULT_STROKE_WIDTH: StrokeWidth = 'medium'
export const DEFAULT_OPACITY = 100
