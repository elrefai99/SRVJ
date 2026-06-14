import { computed, ref } from 'vue'
import type { NodeColor, NodeShape, NodeVariant } from '@/types/diagram'

/** A shape-creation tool (what gets drawn when you drag on the canvas). */
export interface ShapeTool {
  shape: NodeShape
  variant: NodeVariant
}

/** The active tool: either the selection cursor or a shape to draw. */
export type ActiveTool = 'select' | ShapeTool

// Shared module-level state so the palette and canvas agree on the tool.
const activeTool = ref<ActiveTool>('select')
const activeColor = ref<NodeColor>('slate')

export function useEditorTool() {
  const isSelectTool = computed(() => activeTool.value === 'select')

  function setTool(tool: ActiveTool) {
    activeTool.value = tool
  }

  function resetTool() {
    activeTool.value = 'select'
  }

  function setColor(color: NodeColor) {
    activeColor.value = color
  }

  /** True when `tool` is the currently active shape tool. */
  function isActive(tool: ShapeTool): boolean {
    const current = activeTool.value
    return current !== 'select' && current.shape === tool.shape && current.variant === tool.variant
  }

  return { activeTool, activeColor, isSelectTool, setTool, resetTool, setColor, isActive }
}
