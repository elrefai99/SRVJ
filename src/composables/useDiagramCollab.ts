import { ref, watch } from 'vue'
import { storeToRefs } from 'pinia'
import * as Y from 'yjs'
import type { WebsocketProvider } from 'y-websocket'
import { useDiagramStore } from '@/stores/diagram'
import { useAuthStore } from '@/stores/auth'
import { getDiagram } from '@/utils/projectsApi'
import { COLLAB_WS_URL, DIAGRAM_VERSION } from '@/utils/constants'
import { diagramToSnapshot } from '@/types/project'
import type { DiagramEdge, DiagramNode, DiagramSnapshot } from '@/types/diagram'

const EMPTY_SNAPSHOT: DiagramSnapshot = { version: DIAGRAM_VERSION, nodes: [], edges: [] }

/** Connection state mirrored from the y-websocket provider's `status` event. */
export type CollabStatus = 'connecting' | 'connected' | 'disconnected'

/**
 * The collab room name MUST be the diagram's `site_id` (a uuid). The backend
 * authorizes by validating the last path segment of `/collab/<site_id>` as a
 * uuid, so anything else (a Mongo `_id`, project id, slug, or empty string)
 * is rejected with "Invalid uuid" / a 1006 close. Hard-guard before connecting.
 */
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

/** Tags transactions we originate, so our own writes don't echo back as remote. */
const LOCAL_ORIGIN = { source: 'srvj-local' } as const

/** Stable structural compare for two plain (JSON-serialisable) records. */
function sameJson(a: unknown, b: unknown): boolean {
  return JSON.stringify(a) === JSON.stringify(b)
}

/** Deep clone via JSON so what we hand to Yjs is a detached plain object. */
function plain<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T
}

/**
 * Project a node to its *persistable* shape before it enters the shared doc:
 * `selected` (and Vue Flow's runtime `dragging`) are per-user/ephemeral, so
 * writing them would broadcast every local selection + drag tick to peers and
 * churn the saved document. `applySnapshot` re-derives them on the way back in.
 */
function persistableNode(node: DiagramNode): DiagramNode {
  const { selected: _selected, dragging: _dragging, ...rest } = node as DiagramNode & {
    dragging?: boolean
  }
  return rest
}

function persistableEdge(edge: DiagramEdge): DiagramEdge {
  const { selected: _selected, ...rest } = edge
  return rest
}

/**
 * Reconcile a `Y.Array` of plain objects to match `target` (keyed by `id`),
 * minimising ops so concurrent peers' edits survive: drop removed ids, replace
 * only changed items in place, append new ones, then fix order if it diverged.
 * Must run inside the caller's `doc.transact(..., LOCAL_ORIGIN)`.
 */
function reconcileArray<T extends { id: string }>(yArr: Y.Array<T>, target: T[]) {
  const targetById = new Map(target.map((item) => [item.id, item]))

  // 1. Remove ids no longer present (back-to-front to keep indices valid).
  for (let i = yArr.length - 1; i >= 0; i--) {
    if (!targetById.has(yArr.get(i).id)) yArr.delete(i, 1)
  }

  // 2. Replace items whose content changed (delete + insert at the same index).
  for (let i = 0; i < yArr.length; i++) {
    const next = targetById.get(yArr.get(i).id)
    if (next && !sameJson(yArr.get(i), next)) {
      yArr.delete(i, 1)
      yArr.insert(i, [plain(next)])
    }
  }

  // 3. Append ids that don't exist yet, in target order.
  const present = new Set<string>()
  for (let i = 0; i < yArr.length; i++) present.add(yArr.get(i).id)
  const toAdd = target.filter((item) => !present.has(item.id))
  if (toAdd.length) yArr.push(toAdd.map(plain))

  // 4. If z-order diverged (same set, different sequence), rebuild once. Rare
  //    (only reorder/duplicate touch it), so the heavier op is acceptable.
  const orderMatches =
    yArr.length === target.length &&
    target.every((item, i) => yArr.get(i).id === item.id)
  if (!orderMatches) {
    yArr.delete(0, yArr.length)
    yArr.insert(0, target.map(plain))
  }
}

export function useDiagramCollab(getSiteId: () => string | null) {
  const store = useDiagramStore()
  const auth = useAuthStore()
  const { nodes, edges } = storeToRefs(store)

  const status = ref<CollabStatus>('disconnected')

  let doc: Y.Doc | null = null
  let provider: WebsocketProvider | null = null
  let yNodes: Y.Array<DiagramNode> | null = null
  let yEdges: Y.Array<DiagramEdge> | null = null
  let yMeta: Y.Map<unknown> | null = null

  let ready = false
  let applyingRemote = false
  let stopWatch: (() => void) | null = null
  // Whether we've ever completed an initial server sync. Used to seed the canvas
  // from the last saved version exactly once while the live session is still
  // (re)connecting, so the board isn't blank before the first sync lands.
  let hasSynced = false
  // Guards the one-time read-only seed (above) across reconnect attempts.
  let seededFallback = false

  /** Pull the whole doc into the store, preserving the local user's selection. */
  function hydrateFromDoc() {
    if (!yNodes || !yEdges || !yMeta) return
    const version = yMeta.get('version')
    const snapshot: DiagramSnapshot = {
      version: typeof version === 'number' ? version : DIAGRAM_VERSION,
      nodes: yNodes.toJSON() as DiagramNode[],
      edges: yEdges.toJSON() as DiagramEdge[],
    }

    // applySnapshot clears `.selected`; remember + restore it so an incoming
    // remote edit doesn't yank the local user's current selection.
    const selectedNodes = new Set(store.selectedNodeIds)
    const selectedEdges = new Set(store.selectedEdgeIds)

    applyingRemote = true
    store.applySnapshot(snapshot)
    if (selectedNodes.size) {
      store.nodes = store.nodes.map((n) =>
        selectedNodes.has(n.id) ? { ...n, selected: true } : n,
      )
    }
    if (selectedEdges.size) {
      store.edges = store.edges.map((e) =>
        selectedEdges.has(e.id) ? { ...e, selected: true } : e,
      )
    }
    applyingRemote = false
  }

  /** Push the store's current nodes/edges into the shared arrays atomically. */
  function pushLocal() {
    if (!doc || !yNodes || !yEdges || !yMeta) return
    doc.transact(() => {
      reconcileArray(yNodes!, store.nodes.map(persistableNode))
      reconcileArray(yEdges!, store.edges.map(persistableEdge))
      yMeta!.set('version', DIAGRAM_VERSION)
    }, LOCAL_ORIGIN)
  }

  function startLocalSync() {
    stopWatch?.()
    stopWatch = watch(
      [nodes, edges],
      () => {
        if (!ready || applyingRemote) return
        pushLocal()
      },
      { deep: true },
    )
  }

  /** Read-only fallback when the live session can't be established. */
  async function loadReadOnly() {
    const id = getSiteId()
    if (!id || !auth.token) {
      store.applySnapshot(EMPTY_SNAPSHOT)
      return
    }
    try {
      const diagram = await getDiagram(id, auth.token)
      store.applySnapshot(diagram ? diagramToSnapshot(diagram) : EMPTY_SNAPSHOT)
    } catch {
      store.applySnapshot(EMPTY_SNAPSHOT)
    }
  }

  /**
   * Open the live session. Returns `true` when a provider was created (the
   * connection itself is async — watch {@link status}/{@link error}); `false`
   * when collab is unconfigured/unavailable or the room id is invalid, so the
   * caller can fall back to a read-only REST load.
   *
   * The handshake URL is `${COLLAB_WS_URL}/${siteId}` — y-websocket joins
   * `serverUrl + '/' + roomName`, so `COLLAB_WS_URL` must end in `/collab`
   * (no id, no trailing slash) and `siteId` must be the diagram's `site_id`
   * uuid, producing `wss://<host>/collab/<uuid>`.
   */
  async function connect(): Promise<boolean> {
    const siteId = getSiteId()
    if (!siteId || !COLLAB_WS_URL || !auth.token) return false

    // Hard guard: the room name must be the diagram site_id (uuid), or the
    // backend rejects the upgrade with "Invalid uuid". Never connect otherwise.
    if (!UUID_RE.test(siteId)) {
      console.error(
        `collab: room name must be the diagram site_id (uuid), got: "${siteId}" — skipping live session.`,
      )
      return false
    }

    // Dynamic import keeps y-websocket (and its `WebSocket` use) out of any
    // non-browser module-evaluation pass — the editor lives behind ClientOnly,
    // but this keeps the composable self-safe (same pattern as usePresence).
    const { WebsocketProvider } = await import('y-websocket')
    // Bail if a teardown / id change happened while importing.
    if (getSiteId() !== siteId || provider) return false

    doc = new Y.Doc()
    yNodes = doc.getArray<DiagramNode>('nodes')
    yEdges = doc.getArray<DiagramEdge>('edges')
    yMeta = doc.getMap('metadata')

    // serverUrl = base ending in `/collab` (no id); roomName = the site_id uuid.
    // The httpOnly `access_token` cookie rides the wss handshake automatically.
    provider = new WebsocketProvider(COLLAB_WS_URL, siteId, doc)

    provider.on('status', ({ status: next }: { status: CollabStatus }) => {
      status.value = next
    })

    // The backend seeds the doc from the stored diagram; read it once the first
    // server sync lands, then begin mirroring local edits back into it.
    provider.on('sync', (isSynced: boolean) => {
      if (!isSynced) return
      hasSynced = true
      hydrateFromDoc()
      if (!ready) {
        ready = true
        startLocalSync()
      }
    })

    // A close *before* the first sync usually means the upgrade was rejected
    // (no access / expired session / missing cookie — typically code 1006).
    // Keep the provider alive so y-websocket keeps retrying the live session
    // (the user reconnects automatically when they (re)join the board); seed the
    // canvas once from the last saved version so it isn't blank while we retry.
    // A close *after* a successful sync is a transient drop; it auto-reconnects.
    provider.on('connection-close', (event: CloseEvent | null) => {
      if (hasSynced) return
      console.warn('collab: connection closed, retrying', event?.code ?? '(no code)')
      if (!seededFallback) {
        seededFallback = true
        void loadReadOnly()
      }
    })

    // Re-hydrate the store whenever a *remote* peer (or the server) mutates the
    // shared types. Our own writes carry LOCAL_ORIGIN and are skipped.
    const onRemote = (_events: unknown, transaction: Y.Transaction) => {
      if (transaction.origin === LOCAL_ORIGIN) return
      hydrateFromDoc()
    }
    yNodes.observeDeep(onRemote)
    yEdges.observeDeep(onRemote)
    yMeta.observe(onRemote)

    return true
  }

  /** Tear down just the Yjs/provider resources (keeps the store contents). */
  function teardownProvider() {
    stopWatch?.()
    stopWatch = null
    ready = false
    hasSynced = false
    seededFallback = false
    provider?.destroy()
    doc?.destroy()
    provider = null
    doc = null
    yNodes = null
    yEdges = null
    yMeta = null
  }

  function destroy() {
    teardownProvider()
    status.value = 'disconnected'
  }

  return { connect, destroy, status }
}
