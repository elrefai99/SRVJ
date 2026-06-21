<div align="center">

# SRVJ — Diagram Editor & Whiteboard
<img src="https://res.cloudinary.com/cs74as-sjoaaaaaaaaaaaadsa/image/upload/v1782020694/SRVJ/favicon_le87qf.png" width="200" alt="SRVJ" />

A web-based diagram editor and whiteboard. It blends a **Draw.io / Lucidchart**
style flow editor with the look-and-feel of **[Excalidraw](https://excalidraw.com)**
(hand-drawn "sketch" mode) and **Miro** (sticky notes, infinite canvas, zoom bar) —
backed by your own account so every diagram is saved, organised, and shareable.
</div>
## The app at a glance

SRVJ is four spaces that flow into each other:

- **Home** — a public landing page that introduces the editor.
- **Dashboard** — your workspace: every project you own, with search and quick
  access. Create, rename, and delete projects from here.
- **Project** — a single project and the diagrams inside it.
- **Editor** — the full-screen canvas where the work happens.

You can sketch on the canvas without signing in (your work is kept locally in the
browser), and sign in whenever you want it saved to your account and synced across
devices.
## Features

### Canvas
- Full-screen, infinite, pan-and-zoom canvas with a dotted grid background.
- Miro-style **zoom bar** (zoom in/out + click the percentage to fit to screen).
- **Mini-map** for quick navigation around large diagrams.
- **Dark mode** (persisted, follows your OS preference on first run).
- **Sketch mode** — an Excalidraw-style hand-drawn theme (handwriting font +
  wobbly borders), toggleable and persisted.

### Shapes & nodes
- Classic shapes: **rectangle, ellipse, diamond**, plus a Miro-style **sticky
  note** and a borderless **text** label.
- **Freehand pen** — draw smooth, pressure-styled ink strokes anywhere on the
  canvas; each stroke moves and resizes like any other element.
- **ERD modelling** — Chen-notation stamps (entities, weak entities,
  relationships, attributes, key / multivalued / derived attributes) and a
  crow's-foot **table** with inline-editable fields and PK / FK toggles.
- A colourful Excalidraw-like palette with adjustable **fill style, stroke
  style, stroke width, and opacity** — restyle the current selection live.
- **Double-click to edit** a label; new shapes open straight into editing.
- **Resize with the mouse** via drag handles on the selected node.

### Edges
- Connect nodes by dragging from a handle, or use the **Arrow tool** to click a
  source then a target.
- Edges fan out across multiple connection points so arrows don't stack.
- Inline-editable edge labels and arrowheads; click an edge to select or delete.

### Selection
- Click to select; **Shift-click** to add to the selection.
- **Drag on empty canvas to marquee-select** multiple elements.
- **Ctrl/Cmd + A** to select everything.
- Hold **Space** to temporarily pan while a tool is active.

### Saving, sharing & collaboration
- **Auto-save** — your changes are saved continuously, with no Save button to
  remember.
- **Undo / Redo** with a generous history.
- **Share** a diagram with a single link.
- **Live collaboration** — see other people's cursors move in real time as you
  work together on the same diagram.
- **Export** a diagram as a file and **import** it back.
- **Reset** the canvas (undoable).

### Keyboard shortcuts
| Action | Shortcut |
| --- | --- |
| Select tool | `V` |
| Pen tool | `P` |
| Delete selection | `Delete` / `Backspace` |
| Select all | `Ctrl/Cmd + A` |
| Undo | `Ctrl/Cmd + Z` |
| Redo | `Ctrl/Cmd + Shift + Z` or `Ctrl + Y` |
| Clear selection / exit tool | `Esc` |
