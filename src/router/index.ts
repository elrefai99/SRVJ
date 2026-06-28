import type { RouteRecordRaw } from 'vue-router'

/**
 * Route table consumed by `vite-ssg` (see `src/main.ts`), which owns the
 * router instance — creating a memory history during static generation and a
 * web history in the browser. Exported as plain records so it can be crawled
 * for pre-rendering.
 */
/**
 * Route `meta` drives the navigation guard in `main.ts`:
 *  - `guestOnly`: signed-in users are bounced to `/dashboard` (the public Home
 *    is hidden once you have a session).
 *  - `requiresAuth`: signed-out users are bounced to `/` (Home, where they can
 *    sign in). Dashboard + Editor are account-scoped.
 */
export const routes: RouteRecordRaw[] = [
  {
    path: '/',
    name: 'home',
    component: () => import('@/views/HomeView.vue'),
    meta: { guestOnly: true },
  },
  {
    path: '/el/demo',
    name: 'demo',
    component: () => import('@/views/DemoView.vue'),
  },
  {
    path: '/el/projects',
    name: 'dashboard',
    component: () => import('@/views/DashboardView.vue'),
    meta: { requiresAuth: true },
  },
  {
    path: '/el/board/:diagramId',
    name: 'editor',
    component: () => import('@/views/EditorView.vue'),
    meta: { requiresAuth: true },
  },
  {
    // Accept a collaboration invite from a project owner. Reachable signed-out
    // (the invitee may not have an account yet) — the page itself prompts for
    // sign-in before accepting, so this route is intentionally unguarded. The
    // JWT may arrive in the path segment or as a `?token=` query param, so the
    // param is optional.
    path: '/app/invite/:token?',
    name: 'invite',
    component: () => import('@/views/InviteView.vue'),
  },
  {
    path: '/:pathMatch(.*)*',
    name: 'not-found',
    component: () => import('@/views/NotFoundView.vue'),
  },
]
