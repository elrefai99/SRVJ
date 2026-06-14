import { defineStore } from 'pinia'
import {
  addEdge,
  applyEdgeChanges,
  applyNodeChanges,
  type Connection,
  type EdgeChange,
  type GraphEdge,
  type GraphNode,
  type NodeChange,
  type XYPosition,
} from '@vue-flow/core'
import type {
  DiagramEdge,
  DiagramNode,
  DiagramSnapshot,
  NewNodeOptions,
  NodeColor,
  NodeShape,
  NodeVariant,
} from '@/types/diagram'
import { createId } from '@/utils/id'
import {
  DEFAULT_COLOR,
  DEFAULT_SHAPE,
  DEFAULT_VARIANT,
  DIAGRAM_VERSION,
  MAX_HISTORY,
} from '@/utils/constants'

interface DiagramState {
  nodes: DiagramNode[]
  edges: DiagramEdge[]
  selectedNodeIds: string[]
  selectedEdgeIds: string[]
  /** Stack of past snapshots for undo. */
  past: DiagramSnapshot[]
  /** Stack of undone snapshots for redo. */
  future: DiagramSnapshot[]
}

const VARIANTS = new Set<NodeVariant>(['default', 'input', 'output'])
const SHAPES = new Set<NodeShape>(['rectangle', 'ellipse', 'diamond'])
const COLORS = new Set<NodeColor>(['slate', 'blue', 'green', 'yellow', 'red', 'violet'])

function buildNode(options: NewNodeOptions): DiagramNode {
  const variant = options.variant ?? DEFAULT_VARIANT
  const fallbackLabel: Record<NodeVariant, string> = {
    input: 'Input',
    output: 'Output',
    default: 'Node',
  }
  return {
    id: createId('node'),
    type: 'custom',
    position: options.position ?? {
      x: 160 + Math.random() * 220,
      y: 140 + Math.random() * 140,
    },
    data: {
      label: options.label ?? fallbackLabel[variant],
      variant,
      shape: options.shape ?? DEFAULT_SHAPE,
      color: options.color ?? DEFAULT_COLOR,
    },
  }
}

/** Backfill defaults so legacy / imported nodes always have a complete shape. */
function normalizeNode(node: DiagramNode): DiagramNode {
  const data = node.data ?? ({} as DiagramNode['data'])
  return {
    ...node,
    type: 'custom',
    data: {
      label: typeof data.label === 'string' ? data.label : 'Node',
      variant: VARIANTS.has(data.variant) ? data.variant : DEFAULT_VARIANT,
      shape: SHAPES.has(data.shape) ? data.shape : DEFAULT_SHAPE,
      color: COLORS.has(data.color) ? data.color : DEFAULT_COLOR,
    },
  }
}

/** Deep clone helper that keeps snapshots independent of live reactive state. */
function clone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T
}

export const useDiagramStore = defineStore('diagram', {
  state: (): DiagramState => ({
    nodes: [],
    edges: [],
    selectedNodeIds: [],
    selectedEdgeIds: [],
    past: [],
    future: [],
  }),

  getters: {
    snapshot: (state): DiagramSnapshot => ({
      version: DIAGRAM_VERSION,
      nodes: clone(state.nodes),
      edges: clone(state.edges),
    }),

    canUndo: (state): boolean => state.past.length > 0,
    canRedo: (state): boolean => state.future.length > 0,
    nodeCount: (state): number => state.nodes.length,
    edgeCount: (state): number => state.edges.length,

    selectedCount: (state): number =>
      state.selectedNodeIds.length + state.selectedEdgeIds.length,
    hasSelection(): boolean {
      return this.selectedCount > 0
    },

    /** Shared colour of the current node selection, or null when mixed/empty. */
    selectionColor(state): NodeColor | null {
      if (state.selectedNodeIds.length === 0) return null
      const ids = new Set(state.selectedNodeIds)
      const colors = new Set(
        state.nodes.filter((n) => ids.has(n.id)).map((n) => n.data.color),
      )
      return colors.size === 1 ? [...colors][0] : null
    },
  },

  actions: {
    /** Capture the current diagram onto the undo stack before a mutation. */
    commit() {
      this.past.push({
        version: DIAGRAM_VERSION,
        nodes: clone(this.nodes),
        edges: clone(this.edges),
      })
      if (this.past.length > MAX_HISTORY) this.past.shift()
      this.future = []
    },

    /** Replace the live diagram with the given snapshot (no history push). */
    applySnapshot(snapshot: DiagramSnapshot) {
      this.nodes = clone(snapshot.nodes).map(normalizeNode)
      this.edges = clone(snapshot.edges)
      this.clearSelection()
    },

    // ---- Vue Flow change handlers (controlled flow) -----------------------
    // Vue Flow's change helpers are typed against its internal `GraphNode` /
    // `GraphEdge` shapes; our store keeps plain serialisable objects, so we
    // cast across that boundary.

    onNodesChange(changes: NodeChange[]) {
      this.nodes = applyNodeChanges(
        changes,
        this.nodes as unknown as GraphNode[],
      ) as unknown as DiagramNode[]
    },

    onEdgesChange(changes: EdgeChange[]) {
      this.edges = applyEdgeChanges(
        changes,
        this.edges as unknown as GraphEdge[],
      ) as unknown as DiagramEdge[]
    },

    onConnect(connection: Connection) {
      this.commit()
      this.edges = addEdge(
        { ...connection, animated: false, type: 'smoothstep' },
        this.edges as unknown as GraphEdge[],
      ) as unknown as DiagramEdge[]
    },

    // ---- Node operations --------------------------------------------------

    addNode(options: NewNodeOptions = {}) {
      this.commit()
      this.nodes.push(buildNode(options))
    },

    updateNodeLabel(id: string, label: string) {
      const node = this.nodes.find((n) => n.id === id)
      if (!node || node.data.label === label) return
      this.commit()
      node.data = { ...node.data, label }
    },

    /** Recolour the given node ids (defaults to the current selection). */
    updateNodeColor(color: NodeColor, ids: string[] = this.selectedNodeIds) {
      if (ids.length === 0) return
      this.commit()
      const set = new Set(ids)
      this.nodes = this.nodes.map((n) =>
        set.has(n.id) ? { ...n, data: { ...n.data, color } } : n,
      )
    },

    // ---- Selection --------------------------------------------------------

    setSelection(nodeIds: string[], edgeIds: string[]) {
      this.selectedNodeIds = nodeIds
      this.selectedEdgeIds = edgeIds
    },

    clearSelection() {
      this.selectedNodeIds = []
      this.selectedEdgeIds = []
    },

    selectAll() {
      this.nodes = this.nodes.map((n) => ({ ...n, selected: true }))
      this.edges = this.edges.map((e) => ({ ...e, selected: true }))
      this.selectedNodeIds = this.nodes.map((n) => n.id)
      this.selectedEdgeIds = this.edges.map((e) => e.id)
    },

    // ---- Deletion ---------------------------------------------------------

    /** Delete every selected node + edge (and edges touching deleted nodes). */
    deleteSelected() {
      if (!this.hasSelection) return
      this.commit()
      const nodeSet = new Set(this.selectedNodeIds)
      const edgeSet = new Set(this.selectedEdgeIds)
      this.nodes = this.nodes.filter((n) => !nodeSet.has(n.id))
      this.edges = this.edges.filter(
        (e) => !edgeSet.has(e.id) && !nodeSet.has(e.source) && !nodeSet.has(e.target),
      )
      this.clearSelection()
    },

    // ---- History ----------------------------------------------------------

    undo() {
      const previous = this.past.pop()
      if (!previous) return
      this.future.push({
        version: DIAGRAM_VERSION,
        nodes: clone(this.nodes),
        edges: clone(this.edges),
      })
      this.nodes = clone(previous.nodes)
      this.edges = clone(previous.edges)
      this.clearSelection()
    },

    redo() {
      const next = this.future.pop()
      if (!next) return
      this.past.push({
        version: DIAGRAM_VERSION,
        nodes: clone(this.nodes),
        edges: clone(this.edges),
      })
      this.nodes = clone(next.nodes)
      this.edges = clone(next.edges)
      this.clearSelection()
    },

    // ---- Bulk operations --------------------------------------------------

    reset() {
      if (this.nodes.length === 0 && this.edges.length === 0) return
      this.commit()
      this.nodes = []
      this.edges = []
      this.clearSelection()
    },

    loadSnapshot(snapshot: DiagramSnapshot, recordHistory = true) {
      if (recordHistory) this.commit()
      this.applySnapshot(snapshot)
    },
  },
})
