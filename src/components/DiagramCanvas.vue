<script setup lang="ts">
import { markRaw } from 'vue'
import { storeToRefs } from 'pinia'
import {
  VueFlow,
  useVueFlow,
  MarkerType,
  SelectionMode,
  type Connection,
  type EdgeChange,
  type GraphEdge,
  type GraphNode,
  type NodeChange,
} from '@vue-flow/core'
import { Background } from '@vue-flow/background'
import { Controls } from '@vue-flow/controls'
import { MiniMap } from '@vue-flow/minimap'
import { useDiagramStore } from '@/stores/diagram'
import type { NewNodeOptions } from '@/types/diagram'
import CustomNode from './CustomNode.vue'

const store = useDiagramStore()
const { nodes, edges } = storeToRefs(store)

// Register the single custom node implementation. `markRaw` prevents Vue from
// making the component definition itself reactive.
const nodeTypes = {
  custom: markRaw(CustomNode),
}

const { screenToFlowCoordinate, onConnect } = useVueFlow()

onConnect((connection: Connection) => store.onConnect(connection))

function handleNodesChange(changes: NodeChange[]) {
  store.onNodesChange(changes)
}

function handleEdgesChange(changes: EdgeChange[]) {
  store.onEdgesChange(changes)
}

// Snapshot before a drag so the whole move is a single undoable step.
function handleNodeDragStart() {
  store.commit()
}

// Vue Flow owns selection state (clicks, shift-click, marquee). We mirror the
// authoritative selection into the store on every change.
function handleSelectionChange({
  nodes: selNodes,
  edges: selEdges,
}: {
  nodes: GraphNode[]
  edges: GraphEdge[]
}) {
  store.setSelection(
    selNodes.map((n) => n.id),
    selEdges.map((e) => e.id),
  )
}

// ---- Drag & drop from the palette -------------------------------------------
function handleDragOver(event: DragEvent) {
  event.preventDefault()
  if (event.dataTransfer) event.dataTransfer.dropEffect = 'move'
}

function handleDrop(event: DragEvent) {
  const raw = event.dataTransfer?.getData('application/diagram-node')
  if (!raw) return
  let payload: NewNodeOptions
  try {
    payload = JSON.parse(raw) as NewNodeOptions
  } catch {
    return
  }
  const position = screenToFlowCoordinate({ x: event.clientX, y: event.clientY })
  store.addNode({ ...payload, position })
}
</script>

<template>
  <div class="relative h-full w-full" @dragover="handleDragOver" @drop="handleDrop">
    <VueFlow
      :nodes="nodes"
      :edges="edges"
      :node-types="nodeTypes"
      :default-edge-options="{ type: 'smoothstep', markerEnd: MarkerType.ArrowClosed }"
      :min-zoom="0.2"
      :max-zoom="4"
      :delete-key-code="null"
      :selection-on-drag="true"
      :selection-mode="SelectionMode.Partial"
      :pan-on-drag="[1, 2]"
      fit-view-on-init
      class="diagram-flow"
      @nodes-change="handleNodesChange"
      @edges-change="handleEdgesChange"
      @node-drag-start="handleNodeDragStart"
      @selection-change="handleSelectionChange"
    >
      <Background :gap="22" :size="1.2" pattern-color="#cbd5e1" />
      <Controls position="bottom-left" />
      <MiniMap pannable zoomable class="!bottom-4 !right-4" />

      <template v-if="nodes.length === 0">
        <div class="pointer-events-none absolute inset-0 flex items-center justify-center">
          <div class="text-center text-slate-400 dark:text-slate-500">
            <span class="i-carbon-flow mx-auto mb-2 block text-4xl" aria-hidden="true" />
            <p class="text-base font-medium">Your canvas is empty</p>
            <p class="mt-1 text-sm">
              Drag a shape from the toolbox, or click one to drop it in.
            </p>
          </div>
        </div>
      </template>
    </VueFlow>
  </div>
</template>
