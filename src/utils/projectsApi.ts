import { apiFetch, apiFetchEnvelope } from './api'
import type {
  Diagram,
  Pagination,
  Project,
  ProjectInvite,
  ProjectPayload,
  SaveDiagramPayload,
} from '@/types/project'

/** Projects requested per dashboard page (and the default backend `limit`). */
export const PROJECTS_PAGE_LIMIT = 9

/** Query params for the paged project list. */
export interface ProjectListParams {
  page?: number
  limit?: number
  search?: string
}

/** One page of projects plus the server's pagination metadata. */
export interface ProjectListResult {
  projects: Project[]
  pagination: Pagination | null
}

/**
 * GET one page of the signed-in user's projects, optionally filtered by `search`.
 * Reads the whole envelope so the `pagination` sibling of `data` comes through.
 */
export async function listProjects(
  token: string | null,
  params: ProjectListParams = {},
): Promise<ProjectListResult> {
  const query = new URLSearchParams({
    page: String(params.page ?? 1),
    limit: String(params.limit ?? PROJECTS_PAGE_LIMIT),
  })
  const search = params.search?.trim()
  if (search) query.set('search', search)

  const envelope = await apiFetchEnvelope<Project[]>(`/project?${query.toString()}`, { token })
  return {
    projects: envelope.data ?? [],
    pagination: (envelope.pagination as Pagination | undefined) ?? null,
  }
}

export function getProject(siteId: string, token: string | null) {
  return apiFetch<Project>(`/project/${siteId}`, { token })
}

export function createProject(payload: ProjectPayload, token: string | null) {
  return apiFetch<Project>('/project/create', { method: 'POST', body: payload, token })
}

export function updateProject(siteId: string, payload: ProjectPayload, token: string | null) {
  return apiFetch<Project>(`/project/edit/${siteId}`, { method: 'PUT', body: payload, token })
}

export function deleteProject(siteId: string, token: string | null) {
  return apiFetch<void>(`/project/delete/${siteId}`, { method: 'DELETE', token })
}

export function getDiagram(diagramSiteId: string, token: string | null) {
  return apiFetch<Diagram>(`/diagram/${diagramSiteId}`, { token })
}

export function saveDiagram(
  diagramSiteId: string,
  payload: SaveDiagramPayload,
  token: string | null,
) {
  return apiFetch<Diagram>(`/diagram/${diagramSiteId}`, { method: 'PATCH', body: payload, token })
}

/**
 * Invite someone to collaborate on a project (owner action). The backend emails
 * the address a signed invite link (the JWT consumed by {@link getInvite}).
 * `projectSiteId` is the project's public `site_id`.
 */
export function inviteToProject(projectSiteId: string, email: string, token: string | null) {
  return apiFetch<void>('/project/invite', {
    method: 'POST',
    body: { email, project: projectSiteId },
    token,
  })
}

/**
 * Preview a project invitation by its `inviteToken` — the JWT carried in the
 * `/app/invite/:token` URL (signed server-side with `{ site_id, email }`, 6h
 * expiry). Sent as the `token` query param; the backend decodes it to resolve
 * the project (`site_id`) and invitee. The bearer `token` is forwarded when
 * present, but the call works for guests too (they sign in before accepting).
 */
export function getInvite(inviteToken: string, token: string | null) {
  const query = new URLSearchParams({ token: inviteToken })
  return apiFetch<ProjectInvite>(`/project/invite/get?${query.toString()}`, { token })
}

/** How the invitee responds to an invitation (the `status` query param). */
export type InviteResponse = 'accept' | 'reject'

/**
 * Respond to a project invitation. `id` is the project `site_id` decoded from
 * the invite JWT (see {@link decodeInviteProjectId}); `status` is accept/reject.
 * The signed-in user's access token rides in the header (required) and the
 * status in the query. On accept the user becomes a `ProjectMember`; the backend
 * returns the joined project (with its embedded diagram) so the editor can open.
 */
export function acceptInvite(id: string, status: InviteResponse, token: string | null) {
  const query = new URLSearchParams({ status })
  return apiFetch<Project>(`/project/invite/accept/${id}?${query.toString()}`, {
    method: 'PATCH',
    token,
  })
}

/** The (unverified) claims we read out of an invite JWT, client-side. */
export interface InvitePayload {
  /** Project `site_id` the invite addresses. */
  site_id?: string
  /** Email the invite was sent to. */
  email?: string
  /** Expiry, in seconds since the epoch (standard JWT `exp`). */
  exp?: number
}

/**
 * Decode the (unverified) payload of an invite JWT (the `:token` from the
 * `/app/invite/:token` URL), signed server-side as `{ site_id, email, exp }`.
 * We read it purely to address the accept call and to tell the user *why* a
 * link won't load (malformed vs. expired) — the backend still verifies the
 * signature. Returns `null` if the token isn't a well-formed JWT.
 */
export function decodeInvitePayload(inviteToken: string): InvitePayload | null {
  const part = inviteToken.split('.')[1]
  if (!part) return null
  try {
    const json = atob(part.replace(/-/g, '+').replace(/_/g, '/'))
    return JSON.parse(json) as InvitePayload
  } catch {
    return null
  }
}

/** Convenience: the project `site_id` from an invite JWT, or `null`. */
export function decodeInviteProjectId(inviteToken: string): string | null {
  return decodeInvitePayload(inviteToken)?.site_id ?? null
}

/** True when an invite JWT carries an `exp` that's already in the past. */
export function isInviteExpired(inviteToken: string): boolean {
  const exp = decodeInvitePayload(inviteToken)?.exp
  return typeof exp === 'number' && exp * 1000 <= Date.now()
}
