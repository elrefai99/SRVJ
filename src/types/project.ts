import type { DiagramNode, DiagramEdge, DiagramSnapshot } from './diagram'
import type { User } from './auth'

/** Who can see a project (mirrors the Prisma `ProjectVisibility` enum). */
export type ProjectVisibility = 'PRIVATE' | 'PUBLIC' | 'UNLISTED'

export const PROJECT_VISIBILITIES: ProjectVisibility[] = ['PRIVATE', 'PUBLIC', 'UNLISTED']

/** A collaborator's role on a project (mirrors the Prisma `ProjectRole` enum). */
export type ProjectRole = 'OWNER' | 'EDITOR' | 'VIEWER'

/**
 * A project owned by the signed-in user. Every record is addressed publicly by
 * its `site_id` (a uuid) — the integer `id` is internal to the backend, so the
 * frontend routes and API calls use `site_id`. A project owns exactly **one**
 * diagram (1:1; `Diagram.projectId` is unique server-side), so the project's
 * `title` also names its canvas.
 */
export interface Project {
  id: number
  site_id: string
  title: string
  description?: string | null
  visibility: ProjectVisibility
  ownerId?: number
  createdAt: string
  updatedAt: string
  /** The project's one canvas — embedded by the list/detail endpoints. Open
   * the editor at its `diagram.site_id`. */
  diagram?: Diagram | null
  /** Collaborators, embedded by the list/detail endpoints. */
  members?: ProjectMember[]
}

/** A collaborator on a project, with the member's user embedded. */
export interface ProjectMember {
  id: number
  site_id: string
  role: ProjectRole
  projectId: number
  userId: number
  createdAt: string
  user?: User
}

/**
 * A pending invitation to collaborate, as returned by `GET /invite/get` (the
 * invite `token` is carried in the `/app/invite/:token` URL). This is a
 * display-only preview the invitee sees before accepting — it names who invited
 * them, the board/workspace, the role they'll receive, and when the link
 * expires. Accepting POSTs back to {@link acceptUrl} (or the accept endpoint).
 */
export interface ProjectInvite {
  /** The invitee — the email/name the invite was addressed to. */
  firstName: string
  /** Display name of the person who sent the invite (the project owner). */
  inviterName?: string
  /** Name of the board (project/diagram) being shared. */
  boardName: string
  /** Workspace the board lives in. */
  workspaceName: string
  /** Role granted on accepting (e.g. "All", "Editor", "Viewer"). */
  role: string
  /** Human-readable time until the link expires, e.g. "3h". */
  expiresIn?: string
  /** Backend-supplied URL to accept the invite (may be empty — see acceptInvite). */
  acceptUrl?: string
}

/**
 * A project's single canvas. Stores `nodes`/`edges`/`version` in the same shape
 * as the editor's {@link DiagramSnapshot} (plus optional free-form `metadata`),
 * so converting between the two is a field copy — see {@link diagramToSnapshot}.
 */
export interface Diagram {
  id: number
  site_id: string
  projectId: number
  version: number
  nodes: DiagramNode[]
  edges: DiagramEdge[]
  metadata?: Record<string, unknown> | null
  createdAt: string
  updatedAt: string
}

/** Body for creating/updating a project. */
export interface ProjectPayload {
  title: string
  description?: string
  visibility: ProjectVisibility
}

/**
 * List-pagination metadata returned alongside `data` by the paged `/project`
 * endpoint (sibling of `data` in the envelope, not nested inside it).
 */
export interface Pagination {
  page: number
  limit: number
  total: number
  totalPages: number
  hasNextPage: boolean
  hasPrevPage: boolean
}

/** Body for saving a project's canvas (the editor autosaves this). */
export interface SaveDiagramPayload {
  version: number
  nodes: DiagramNode[]
  edges: DiagramEdge[]
  metadata?: Record<string, unknown> | null
}

/** Project a backend {@link Diagram} into the editor's {@link DiagramSnapshot}. */
export function diagramToSnapshot(diagram: Diagram): DiagramSnapshot {
  return {
    version: diagram.version,
    nodes: diagram.nodes ?? [],
    edges: diagram.edges ?? [],
  }
}
