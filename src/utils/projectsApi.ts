import { apiFetch, apiFetchEnvelope } from './api'
import type {
  Diagram,
  Pagination,
  Project,
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
