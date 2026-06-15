/**
 * Multi-anchor connection handles.
 *
 * Every node renders several invisible handles per side so arrows drawn by the
 * toolbar Arrow tool can attach at distinct points instead of all stacking on a
 * side's centre. `CustomNode` renders the handles; the diagram store picks which
 * anchor a new edge uses — both import this module so the handle ids agree.
 */

export type HandleSide = 'top' | 'right' | 'bottom' | 'left'

export const HANDLE_SIDES: HandleSide[] = ['top', 'right', 'bottom', 'left']

/**
 * Fractional positions (%) of the anchor points along each side. Centre first,
 * so a node's first connection on a side sits in the middle and extra arrows
 * spread outwards.
 */
export const ANCHOR_OFFSETS = [50, 28, 72] as const

export const ANCHORS_PER_SIDE = ANCHOR_OFFSETS.length

/**
 * Handle id for the n-th anchor on a side. Index 0 keeps the bare side name
 * (`top` / `right` / …) so edges saved before multi-anchor still resolve.
 */
export function anchorId(side: HandleSide, index: number): string {
  return index === 0 ? side : `${side}-${index}`
}

/** Which side a handle id belongs to (`top-2` → `top`). */
export function handleSide(id: string | null | undefined): string {
  return (id ?? '').split('-')[0]
}

export interface HandleDescriptor {
  id: string
  side: HandleSide
  /** CSS property used to offset the handle along its side. */
  axis: 'left' | 'top'
  /** Offset (%) along the side. */
  offset: number
}

/** Every handle to render on a node — each anchor on each side. */
export function nodeHandleDescriptors(): HandleDescriptor[] {
  const out: HandleDescriptor[] = []
  for (const side of HANDLE_SIDES) {
    const axis: 'left' | 'top' = side === 'top' || side === 'bottom' ? 'left' : 'top'
    ANCHOR_OFFSETS.forEach((offset, index) => {
      out.push({ id: anchorId(side, index), side, axis, offset })
    })
  }
  return out
}
