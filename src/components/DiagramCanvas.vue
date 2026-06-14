<script setup lang="ts">
import { markRaw } from 'vue'
import { storeToRefs } from 'pinia'
import {
  VueFlow,
  useVueFlow,
  type Connection,
  type EdgeChange,
  type EdgeMouseEvent,
  type NodeChange,
  type NodeMouseEvent,
} from '@vue-flow/core'
import { Background } from '@vue-flow/background'
import { Controls } from '@vue-flow/controls'
import { MiniMap } from '@vue-flow/minimap'
import { useDiagramStore } from '@/stores/diagram'
import type { NodeVariant } from '@/types/diagram'
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

// Snapshot before a drag so the move is a single undoable step.
function handleNodeDragStart() {
  store.commit()
}

function handleNodeClick({ node }: NodeMouseEvent) {
  store.select({ type: 'node', id: node.id })
}

function handleEdgeClick({ edge }: EdgeMouseEvent) {
  store.select({ type: 'edge', id: edge.id })
}

function handlePaneClick() {
  store.clearSelection()
}

// ---- Drag & drop: dropping a node-variant string onto the canvas creates a
// node at the drop position (used by the palette). ----------------------------
function handleDragOver(event: DragEvent) {
  event.preventDefault()
  if (event.dataTransfer) event.dataTransfer.dropEffect = 'move'
}

function handleDrop(event: DragEvent) {
  const variant = event.dataTransfer?.getData('application/diagram-node') as NodeVariant
  if (!variant) return
  const position = screenToFlowCoordinate({ x: event.clientX, y: event.clientY })
  store.addNode(variant, position)
}
</script>

<template>
  <div class="relative h-full w-full" @dragover="handleDragOver" @drop="handleDrop">
    <VueFlow
      :nodes="nodes"
      :edges="edges"
      :node-types="nodeTypes"
      :default-edge-options="{ type: 'smoothstep' }"
      :min-zoom="0.2"
      :max-zoom="4"
      fit-view-on-init
      class="diagram-flow"
      @nodes-change="handleNodesChange"
      @edges-change="handleEdgesChange"
      @node-drag-start="handleNodeDragStart"
      @node-click="handleNodeClick"
      @edge-click="handleEdgeClick"
      @pane-click="handlePaneClick"
    >
      <Background :gap="20" :size="1.4" pattern-color="#cbd5e1" />
      <Controls position="bottom-left" />
      <MiniMap pannable zoomable class="!bottom-4 !right-4" />

      <template v-if="nodes.length === 0">
        <div
          class="pointer-events-none absolute inset-0 flex items-center justify-center"
        >
          <div class="text-center text-slate-400 dark:text-slate-500">
            <span class="i-carbon-flow mx-auto mb-2 block text-4xl" aria-hidden="true" />
            <p class="text-base font-medium">Your canvas is empty</p>
            <p class="mt-1 text-sm">Use “Add Node” in the toolbar to get started.</p>
          </div>
        </div>
      </template>
    </VueFlow>
  </div>
</template>
