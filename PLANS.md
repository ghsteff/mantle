# Mantle UI — Vercel-Inspired Design Overhaul

## Goal

Mantle is an Electron-based visual keyboard configurator for Kanata (a cross-platform keyboard remapper). The app lets users visually configure keyboard layers, tap-hold actions, and key remappings through a GUI instead of writing Lisp config files.

The app already uses Geist fonts, a dark monochrome palette, Radix UI primitives, and Tailwind CSS — all ingredients of Vercel's design DNA. However, the current UI falls short of the refined, intentional minimalism that defines Vercel's aesthetic: noisy backgrounds, sharp-cornered keys, inconsistent color tokens, fragmented tab controls, flat header, aggressive animations, and dense inspector panels all undercut the foundation.

This plan is a **10-step incremental refactor** to bring Mantle's front-end in line with Vercel's design language — calm, precise, monochrome, with purposeful motion and typographic hierarchy. Each item is self-contained and ordered by impact. Work through them one at a time, updating the status as each is completed.

**Tech stack context:** React 19, TypeScript, Tailwind 3, Radix UI, CVA, Geist Sans/Mono, Electron 39, Vite.

**App layout (top to bottom):**
- `Header` — 48px bar with app name, profile switcher, layer tabs, apply/discard buttons, import/export, status indicator
- `MainContent` — Two-column: left is `KeyboardGrid` (visual TKL keyboard), right is `KeyInspector` (272px sidebar for editing selected key)
- `LogPanel` — Resizable bottom panel showing Kanata process stdout/stderr

---

## 1. Remove the Grid Background
**File:** `src/components/MainContent.tsx`
**Impact:** High | **Effort:** Minimal

The `MainContent` component renders a decorative grid overlay using inline CSS `backgroundImage` with `linear-gradient` lines at 50px intervals at 40% opacity. This "graph paper" effect adds visual noise without serving a purpose. Vercel never uses decorative grids as backgrounds.

**What to change:**
- Remove the entire `<div className="absolute inset-0 opacity-[0.4] pointer-events-none" ...>` element (the grid overlay div with the `backgroundImage` style)
- Replace with a subtle radial gradient for depth: a centered radial gradient from `rgba(255,255,255,0.02)` to `transparent`, applied as a `background` style on the `<main>` element itself. Or simply leave it as pure black — the keyboard is the hero.

**Status:** [x] Completed

---

## 2. Round the Keys + Better Depth
**Files:** `src/components/keyboard/components/key/index.tsx`, `tailwind.config.js`
**Impact:** High | **Effort:** Low

Keys currently use `rounded-none` in their className (line ~76 of key/index.tsx), giving them a harsh, blocky appearance. The shadows are defined as custom Tailwind values in `tailwind.config.js` under `boxShadow`:
```
key: "0 2px 0 0 var(--key-shadow), inset 0 -2px 0 0 rgba(0,0,0,0.2)"
key-pressed: "0 1px 0 0 var(--key-shadow), inset 0 -1px 0 0 rgba(0,0,0,0.2)"
```
These are flat, mechanical shadows. Vercel uses small border radii and soft, layered shadows.

**What to change in key/index.tsx:**
- Replace `rounded-none` with `rounded-md` in the key button className
- Replace the selected state. Currently: `bg-key-bg-selected border-primary text-text-bright`. Change to: `bg-key-bg border-white/20 text-text-bright ring-1 ring-white/10` — a subtle glow ring instead of a filled background.

**What to change in tailwind.config.js:**
- Update the `boxShadow.key` value to: `"0 1px 3px rgba(0,0,0,0.4), 0 0 0 1px rgba(255,255,255,0.04)"`
- Update `boxShadow['key-pressed']` to: `"0 0px 1px rgba(0,0,0,0.4), 0 0 0 1px rgba(255,255,255,0.04)"`

**Preserve:** The `active:translate-y-[1px]` press effect and the `active:shadow-key-pressed` class swap should stay.

**Status:** [x] Completed

---

## 3. Consolidate Color System
**Files:** `src/index.css`, `tailwind.config.js`, all components
**Impact:** High | **Effort:** Medium

Two overlapping color systems coexist in `src/index.css`:
1. **Custom hex system** (lines 24-60): `--bg-primary: #000000`, `--text-muted: #666666`, `--key-bg: #121212`, etc.
2. **shadcn/ui oklch system** (lines 62-93): `--primary: oklch(0.92 ...)`, `--muted-foreground: oklch(0.705 ...)`, etc.

Components use them inconsistently. For example:
- `text-text-muted` (custom) and `text-muted-foreground` (shadcn) appear side by side in the same component (action-editor/index.tsx uses both)
- `bg-bg-tertiary` (custom) and `bg-secondary` (shadcn) map to similar grays
- The shadcn/ui base components (button, dialog, card, etc.) use the oklch tokens, while feature components (keyboard, editor, header, log panel) mostly use the custom hex tokens

**Decision: Keep the shadcn/ui token names but replace their oklch values with the custom hex values.** This means all components can use the shadcn naming convention (`text-muted-foreground`, `bg-secondary`, etc.) which is what the UI primitives already expect.

**Mapping to apply in `src/index.css`:**
| shadcn token | New value (from custom system) |
|---|---|
| `--background` | `#000000` (was `--bg-primary`) |
| `--foreground` | `#ffffff` (was `--text-primary`) |
| `--card` | `#0a0a0a` (was `--bg-secondary`) |
| `--card-foreground` | `#ffffff` |
| `--popover` | `#0a0a0a` |
| `--popover-foreground` | `#ffffff` |
| `--primary` | `#ffffff` (was `--accent`) |
| `--primary-foreground` | `#000000` (was `--text-on-accent`) |
| `--secondary` | `#111111` (was `--bg-tertiary`) |
| `--secondary-foreground` | `#ffffff` |
| `--muted` | `#111111` |
| `--muted-foreground` | `#666666` (was `--text-muted`) |
| `--accent` | `#1a1a1a` (was `--bg-hover`) |
| `--accent-foreground` | `#ffffff` |
| `--border` | `#262626` (was custom `--border`) |
| `--input` | `rgba(255,255,255,0.15)` |
| `--ring` | `#ffffff` |
| `--destructive` | `#ff3333` (was `--error`) |

Then remove the duplicate custom variables (`--bg-primary`, `--bg-secondary`, `--bg-tertiary`, `--bg-hover`, `--bg-active`, `--accent` (the custom one), `--accent-hover`, `--accent-muted`, `--text-primary`, `--text-secondary`, `--text-muted`, `--text-bright`, `--text-on-accent`). Keep `--key-*` and `--success`/`--warning`/`--error` variables as they serve specific purposes not covered by shadcn.

**Then migrate all component classes** from the custom system to shadcn equivalents:
- `bg-bg-primary` → `bg-background`
- `bg-bg-secondary` → `bg-card`
- `bg-bg-tertiary` → `bg-secondary` or `bg-muted`
- `bg-bg-hover` → `bg-accent`
- `text-text-primary` → `text-foreground`
- `text-text-secondary` → `text-muted-foreground` (accept slightly dimmer — `#a1a1a1` vs `#666666`) or add a `--text-secondary: #a1a1a1` variable
- `text-text-muted` → `text-muted-foreground`
- `text-text-bright` → `text-foreground`
- `border-border` → stays the same (already unified)

Also remove the now-unused custom color entries from `tailwind.config.js` (the `bg`, `text` namespaces under `colors`).

**Note:** `--text-secondary: #a1a1a1` has no direct shadcn equivalent (it's between `--foreground` white and `--muted-foreground` gray). Either add it as a new variable or map it to `--muted-foreground` and accept slightly dimmer secondary text.

**Status:** [x] Completed

---

## 4. Segmented Layer Tabs
**File:** `src/components/editor/layer-tabs.tsx`
**Impact:** High | **Effort:** Low

Layer tabs currently render as individual `Button` components (variant `default` for active, `outline` for inactive) with gaps between them. This looks fragmented. Replace with a connected segmented control pattern.

**Current structure (preserve all this functionality):**
- Each layer renders as a button (click to switch, double-click to rename inline)
- Inline `<input>` appears when renaming (`editingLayer` state)
- A delete `x` button appears on hover for the active layer (when >1 layer exists)
- An "Add Layer" flow: clicking shows an inline input + Add/Cancel buttons (`isAdding` state)

**Visual changes only (keep all logic/state):**
- Wrap the layer buttons in a container: `<div className="flex items-center bg-secondary rounded-md p-0.5 border border-border">`
- Replace the `Button` component for each layer tab with a plain `<button>` using classes: `px-3 py-1 rounded-sm text-xs font-medium transition-colors`. Active state: `bg-card text-foreground shadow-sm`. Inactive: `text-muted-foreground hover:text-foreground`
- Move the "Add Layer" button outside the segmented container. Change from `<Button variant="ghost">` with text "Add Layer" to just a `+` icon button: `<button className="ml-2 p-1 rounded-md text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"><PlusIcon className="size-3.5" /></button>`
- Keep the delete `x` button and inline rename input as-is (they overlay on top and work independently)

**Status:** [x] Completed

---

## 5. Header Polish
**File:** `src/components/Header.tsx`
**Impact:** Medium | **Effort:** Low

The header `<header>` currently uses `className="h-12 bg-bg-secondary border-b border-border ..."`. It's functional but flat. Vercel headers feel like a glass command bar.

**What to change:**
- Update the `<header>` className: replace `bg-bg-secondary` with `bg-card/80 backdrop-blur-md` (after color consolidation, `bg-card` = `#0a0a0a`). This gives a frosted glass effect. If doing this before plan #3, use `bg-[#0a0a0a]/80 backdrop-blur-md` instead.
- Make the "Mantle" `<h1>` more prominent: change from `text-sm font-semibold text-text-primary` to `text-sm font-bold tracking-tight font-mono`. After color consolidation, change `text-text-primary` to `text-foreground`.
- For the "Unsaved changes" section: currently this is conditionally rendered with `{isDirty && (...)}` which causes it to pop in/out. Instead, always render it but control visibility with opacity and transform. Replace the `{isDirty && (` conditional with: always render the wrapper div with `className={cn("flex items-center gap-2 transition-all duration-200", isDirty ? "opacity-100 translate-x-0" : "opacity-0 translate-x-2 pointer-events-none")}`. This requires importing `cn` from `@/lib/utils`.

**Note:** The header has `drag-region` class for macOS title bar dragging and `pl-20` for traffic light buttons. These must stay.

**Status:** [x] Completed

---

## 6. Key Inspector Hierarchy
**Files:** `src/components/editor/key-inspector.tsx`, `src/components/editor/action-editor/index.tsx`
**Impact:** Medium | **Effort:** Medium

The right-side inspector panel (272px, `w-72`) is dense. All labels use `text-xs uppercase tracking-wide` which creates a militant, shouting aesthetic. Vercel uses calm, lowercase labels.

**Changes in action-editor/index.tsx:**
- The "EDITING:" header (line ~60-66): Change from `<span className="font-semibold uppercase tracking-wide">EDITING:</span>` to `<span className="text-muted-foreground text-xs">Editing</span>`. Make the key label more prominent: `<span className="text-foreground font-mono text-base font-semibold">{label}</span>` on its own line below.
- All `<label>` elements with `text-text-secondary text-xs uppercase tracking-wide` (lines ~71, 94, 114, 129, 226, 249, 269): change to `text-xs text-muted-foreground font-medium` (drop `uppercase`, drop `tracking-wide`). Change label text to sentence-case: "Mode", "Key output", "On tap", "On hold", "Hold timeout", "Target layer", "Activation mode".
- The outer `<div className="space-y-4">` (line 58): change to `space-y-5` for more breathing room.
- The mode toggle buttons (Simple / Tap-Hold / Layer, lines 74-89): wrap in a segmented control container similar to plan #4: `<div className="flex bg-secondary rounded-md p-0.5 border border-border">`. Each button becomes a plain `<button>` with `flex-1 px-3 py-1.5 rounded-sm text-xs font-medium transition-colors flex items-center justify-center gap-1.5`. Active: `bg-card text-foreground shadow-sm`. Inactive: `text-muted-foreground hover:text-foreground`.

**Changes in key-inspector.tsx:**
- Empty state changes are covered by Plan #10, skip here.

**Preserve:** All the Lucide icons (Pointer, Hand, Layers) on the mode buttons and section headers.

**Status:** [x] Completed

---

## 7. Status Indicator Refinement
**Files:** `src/components/status/status-indicator.tsx`, `src/index.css`
**Impact:** Low | **Effort:** Low

The `StatusIndicator` component renders a clickable badge with a colored dot + label. The "running" state uses `animate-pulse-glow` (a `box-shadow` animation defined in index.css) which is visually aggressive.

**Note on color classes:** Status colors use the `status-*` Tailwind namespace (e.g., `text-status-success`, `bg-status-warning`), not bare `success`/`warning`. The Tailwind config maps them under `colors.status`.

**What to change in status-indicator.tsx:**
- Add `rounded-full` to the outer `<button>` className (currently no border-radius — it's a rectangle)
- Add a `borderClass` to the `getStatusConfig()` return values and apply it in the button className:
  - `running`: `bgClass: "bg-status-success/[0.06]"`, `textClass: "text-status-success"`, `dotClass: "bg-status-success animate-pulse-dot"`, `borderClass: "border border-status-success/20"`
  - `starting`: `bgClass: "bg-status-warning/[0.06]"`, `textClass: "text-status-warning"`, `dotClass: "bg-status-warning animate-pulse-warning"`, `borderClass: "border border-status-warning/20"`
  - `error`: `bgClass: "bg-status-error/[0.06]"`, `textClass: "text-status-error"`, `dotClass: "bg-status-error"`, `borderClass: "border border-status-error/20"`
  - `stopped`: `bgClass: "bg-secondary"`, `textClass: "text-muted-foreground"`, `dotClass: "bg-muted-foreground"`, `borderClass: "border border-border"`
- Change the dot size from `w-2 h-2` to `w-1.5 h-1.5`
- Change the label font-size from `text-sm` to `text-xs`

**What to change in index.css:**
- Replace the `pulse-glow` keyframes with a calmer dot animation:
```css
@keyframes pulse-dot {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.4; }
}
.animate-pulse-dot {
  animation: pulse-dot 2s ease-in-out infinite;
}
```
- Remove the old `.animate-pulse-glow` class and `@keyframes pulse-glow`

**Status:** [x] Completed

---

## 8. Log Panel Refinement
**File:** `src/components/LogPanel.tsx`
**Impact:** Low | **Effort:** Low

The log panel renders `KanataLogEntry` objects. Each entry has this shape (from `src/types/index.ts`):
```ts
interface KanataLogEntry {
  type: "stdout" | "stderr";
  message: string;
  timestamp: number; // Unix timestamp in milliseconds
}
```

Currently the panel just renders `log.message` with color based on `log.type`. The `timestamp` field exists in the data but is not displayed.

**What to change:**
- Add a timestamp display to each log line. Format as `HH:MM:SS` using `new Date(log.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false })`. Render as: `<span className="text-muted-foreground select-none mr-3 tabular-nums shrink-0">{formattedTime}</span>` before the message text.
- Change the log container text size: update `font-mono text-xs` to `font-mono text-[11px] leading-relaxed`
- Add alternating row backgrounds: on each log `<div>`, add a conditional class. Use the `cn` utility (import from `@/lib/utils`): `className={cn(log.type === "stderr" ? "text-status-error" : "text-muted-foreground", i % 2 === 0 && "bg-white/[0.02]")}`
- Change the "Clear" button: replace `<Button variant="ghost">Clear</Button>` with an icon-only button. Import `Trash2` from `lucide-react`. Use `<Tooltip>` wrapping `<Button variant="ghost" size="icon-xs"><Trash2 className="size-3.5" /></Button>` with tooltip text "Clear logs".
- Change the "Logs" label: remove `uppercase` from its className

**Note:** The log lines currently use `text-text-secondary` for stdout and `text-status-error` for stderr. After color consolidation, `text-text-secondary` becomes `text-muted-foreground`.

**Status:** [x] Completed

---

## 9. Transitions & Micro-interactions
**Files:** Listed below per change
**Impact:** Medium | **Effort:** Medium

The app currently has minimal motion. Vercel uses smooth, consistent 150-200ms transitions. These changes add polish across specific components.

**Specific changes:**

1. **Key selection scale** (`src/components/keyboard/components/key/index.tsx`):
   - The key button already has `transition-all duration-100`. Change `duration-100` to `duration-150`.
   - Add a subtle scale on selection: in the selected branch of the ternary (where `isSelected` is true), add `scale-[1.03]`. The existing `transition-all` will animate this automatically.

2. **Inspector panel** (`src/components/editor/key-inspector.tsx`):
   - The inspector always renders at `w-72` but shows different content based on `selectedKey`. Since both states render the same-sized container, just add `transition-all duration-200` to the outer `<div>` in both branches. No structural change needed.

3. **Keys/Actions toggle** (`src/components/keyboard/components/keyboard-grid.tsx`):
   - The toggle container (the `div` with `absolute top-4 right-4 ...`) has no transition. Add `transition-opacity duration-200` to its className.

4. **Log panel** (`src/components/LogPanel.tsx`):
   - The panel uses `ResizablePanel` which handles its own height. The resize handle already works smoothly. No transition change needed here.

5. **Profile switcher** (`src/components/profiles/profile-switcher.tsx`):
   - Already uses Radix Popover which has built-in open/close animations. No change needed.

**Status:** [x] Completed

---

## 10. Empty State for Key Inspector
**File:** `src/components/editor/key-inspector.tsx`
**Impact:** Low | **Effort:** Minimal

The empty state (when no key is selected) currently renders:
```tsx
<div className="text-4xl mb-2">⌨️</div>
<div className="text-sm">Select a key to edit</div>
```
Vercel never uses emoji in UI. Replace with refined typography + a Lucide icon.

**What to change:**
- Import `{ Keyboard }` from `lucide-react` (already a project dependency — `lucide-react` v0.562.0)
- Replace the emoji div with: `<Keyboard className="size-8 text-muted-foreground/40 mb-3" strokeWidth={1} />`
- Change the text div to: `<p className="text-sm text-muted-foreground">Click a key to configure</p>`

**Status:** [x] Completed
