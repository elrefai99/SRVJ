import { apiFetch } from './api'
import type { Diagram, Project, ProjectPayload, SaveDiagramPayload } from '@/types/project'

export function listProjects(token: string | null) {
  return apiFetch<Project[]>('/project', { token })
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
