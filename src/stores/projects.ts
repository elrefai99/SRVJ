import { defineStore } from 'pinia'
import { ApiError } from '@/utils/api'
import * as projectsApi from '@/utils/projectsApi'
import { PROJECTS_PAGE_LIMIT } from '@/utils/projectsApi'
import { useAuthStore } from './auth'
import type { Pagination, Project, ProjectPayload } from '@/types/project'

interface ProjectsState {
  /** The current page of the signed-in user's projects (dashboard list). */
  projects: Project[]
  /** In-flight flag for any list/CRUD request. */
  loading: boolean
  /** Last human-readable error, or `null`. */
  error: string | null
  /** Current page (1-based) requested from the server. */
  page: number
  /** Current search term filtering the list (empty = no filter). */
  search: string
  /** Server pagination metadata for the loaded page, or `null` before first load. */
  pagination: Pagination | null
}

function messageOf(error: unknown): string {
  if (error instanceof ApiError) return error.message
  if (error instanceof Error) return error.message
  return 'Something went wrong. Please try again.'
}

/**
 * Projects owned by the signed-in user. CRUD goes through {@link projectsApi},
 * which talks to the SRVJ backend; the bearer token is pulled from the auth
 * store on each call. A project owns one diagram (1:1) — the canvas itself is
 * loaded/saved by the editor via `useDiagramSync`, not here. Mirrors the
 * additive auth pattern: none of this gates the editor when signed out.
 */
export const useProjectsStore = defineStore('projects', {
  state: (): ProjectsState => ({
    projects: [],
    loading: false,
    error: null,
    page: 1,
    search: '',
    pagination: null,
  }),

  actions: {
    /** Token of the signed-in user (or `null`), used for every request. */
    token(): string | null {
      return useAuthStore().token
    },

    /** Load the current page of projects (filtered by {@link search}). */
    async fetchProjects() {
      this.loading = true
      this.error = null
      try {
        const result = await projectsApi.listProjects(this.token(), {
          page: this.page,
          limit: PROJECTS_PAGE_LIMIT,
          search: this.search,
        })
        this.projects = result.projects
        this.pagination = result.pagination
        // Clamp to the last page if the requested one no longer exists (e.g. the
        // total shrank), then reload that page.
        const totalPages = result.pagination?.totalPages
        if (totalPages && this.page > totalPages) {
          this.page = totalPages
          await this.fetchProjects()
        }
      } catch (error) {
        this.error = messageOf(error)
      } finally {
        this.loading = false
      }
    },

    /** Apply a search term, reset to the first page, and reload. */
    async setSearch(search: string) {
      const next = search.trim()
      if (next === this.search) return
      this.search = next
      this.page = 1
      await this.fetchProjects()
    },

    /** Jump to a page (clamped to ≥ 1) and reload. */
    async goToPage(page: number) {
      const next = Math.max(1, Math.trunc(page))
      if (next === this.page) return
      this.page = next
      await this.fetchProjects()
    },

    /** Create a project, then re-fetch the list from the server; returns the
     * created project (for navigating into its editor) on success. */
    async createProject(payload: ProjectPayload): Promise<Project | null> {
      this.loading = true
      this.error = null
      try {
        const project = await projectsApi.createProject(payload, this.token())
        await this.fetchProjects()
        return project
      } catch (error) {
        this.error = messageOf(error)
        return null
      } finally {
        this.loading = false
      }
    },

    /** Update a project, then re-fetch the list from the server. */
    async updateProject(siteId: string, payload: ProjectPayload): Promise<boolean> {
      this.error = null
      try {
        await projectsApi.updateProject(siteId, payload, this.token())
        await this.fetchProjects()
        return true
      } catch (error) {
        this.error = messageOf(error)
        return false
      }
    },

    /** Invite a collaborator to a project by email with a role (EDITOR/VIEWER).
     * Returns true on success; the backend emails the invitee a signed accept
     * link. */
    async inviteToProject(
      siteId: string,
      email: string,
      role: projectsApi.InviteRole,
    ): Promise<boolean> {
      this.error = null
      try {
        await projectsApi.inviteToProject(siteId, email, role, this.token())
        return true
      } catch (error) {
        this.error = messageOf(error)
        return false
      }
    },

    /** Delete a project (cascades its diagram), then re-fetch the list. */
    async deleteProject(siteId: string): Promise<boolean> {
      this.error = null
      try {
        await projectsApi.deleteProject(siteId, this.token())
        await this.fetchProjects()
        return true
      } catch (error) {
        this.error = messageOf(error)
        return false
      }
    },
  },
})
