# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

SRVJ is a browser-based diagram editor / whiteboard (Draw.io-style flow editor with Excalidraw and Miro flavour) built with Vue 3, Vite, TypeScript, Vue Flow, Pinia, and UnoCSS.

## Commands

This project uses **pnpm** (npm's installer trips over the existing pnpm store layout). Run from the project root.

```bash
pnpm install
pnpm dev          # Vite dev server (prints local URL, e.g. http://localhost:5173)
pnpm type-check   # vue-tsc --noEmit  (strict; this is the only "lint")
pnpm build        # type-check, then vite build
pnpm preview      # serve the production build
```

There is **no test suite and no ESLint/Prettier config**. `pnpm type-check` (or `pnpm build`) is the gate — `tsconfig.json` is strict with `noUnusedLocals`, `noUnusedParameters`, `noImplicitReturns`, and `noFallthroughCasesInSwitch`, so unused imports/vars fail the build.

## Architecture

### The Pinia store is the single source of truth; Vue Flow runs *controlled*
`src/stores/diagram.ts` owns nodes, edges, selection, and undo/redo history. `DiagramCanvas.vue` binds `:nodes`/`:edges` from the store and feeds every Vue Flow event back into it:

`VueFlow @nodes-change/@edges-change` → `store.onNodesChange/onEdgesChange` → `applyNodeChanges/applyEdgeChanges` rewrite `store.nodes/edges` → bound back into `:nodes/:edges`.

So **the store's node objects *are* Vue Flow's processed `GraphNode`s.** Domain types (`DiagramNode`, `DiagramEdge` in `src/types/diagram.ts`) are deliberately plain/serialisable and are cast across the Vue Flow boundary with `as unknown as GraphNode[]`.

### Mutation gotcha: replace, don't mutate in place
Vue Flow only re-renders when the node array / node object **reference changes**. A store action that mutates `node.data.x` in place will update state but **will not re-render the node**. Always rebuild:

```ts
this.nodes = this.nodes.map((n) =>
  n.id === id ? { ...n, data: { ...n.data, label } } : n,
)
```

`updateNodeColor` and `updateNodeLabel` both follow this pattern — match it for any new node-data mutation.

### Undo/redo
`commit()` deep-clones the current diagram onto a `past` stack (capped at `MAX_HISTORY` = 50) and clears `future`. **Mutating actions call `commit()` first.** The high-frequency change handlers (`onNodesChange`/`onEdgesChange`) intentionally do **not** commit; instead a node drag is bracketed by one `store.commit()` on `@node-drag-start`. Selection is **derived** from each element's `.selected` flag (kept in sync by `applyNodeChanges`), not stored as a separate list.

### One custom node renders everything
A single Vue Flow node type, `custom` → `CustomNode.vue`, renders all shapes (`rectangle`/`ellipse`/`diamond`/`sticky`/`text`) and flow variants (`default`/`input`/`output`). Shape, colour, variant, and label all live in `node.data`. New shapes are created blank and open straight into inline label editing: `store.addNode` records the new id in `editNodeId`, and the freshly-mounted `CustomNode` claims it once via `store.takeEditNode(id)`.

### Active-tool state lives outside Pinia
`src/composables/useEditorTool.ts` holds the selected palette tool and colour as **module-level refs** (not store state) so `NodePalette.vue` (picks the tool) and `DiagramCanvas.vue` (draw-to-create via pointer events, or palette drag-and-drop) share one source. `useDarkMode` and `useSketchMode` use the same module-level-ref pattern and toggle a class on `<html>` (`.dark`, `.sketch-mode`), persisting the choice.

### Persistence
`useDiagramPersistence` (wired up in `EditorView.vue`, the composition root): `load()` restores a snapshot on startup; a debounced (`AUTOSAVE_DELAY` = 500ms) deep watcher auto-saves `store.snapshot` to `localStorage`. Snapshots carry `DIAGRAM_VERSION`; `normalizeNode` backfills defaults so legacy/imported diagrams stay valid. `localStorage` access goes through the never-throws `src/utils/storage.ts` wrapper. Keys: `srvj:diagram`, `srvj:theme`, `srvj:sketch` (see `src/utils/constants.ts`).

## Conventions

- **`@/` aliases `src/`** (configured in both `vite.config.ts` and `tsconfig.json`).
- **Auto-imports** (`vite.config.ts`): Vue and Pinia APIs plus anything in `src/composables` and `src/stores` are auto-imported; components in `src/components` and `src/views` are auto-registered. `src/auto-imports.d.ts` and `src/components.d.ts` are **generated — never edit them by hand**. (Existing code still imports explicitly; either style works.)
- **Icons** are pure-CSS via UnoCSS `presetIcons`: use class names like `i-mdi-trash-can-outline`, `i-carbon-flow`. Icons referenced **dynamically** (string-built class names) must be added to `safelist` in `uno.config.ts`, or they won't be generated.
- **Styling** is UnoCSS utilities (Wind/Tailwind-compatible) directly in templates; `dark:` variants use the `.dark` class. Keep business logic in the store/composables — templates stay declarative.
