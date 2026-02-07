# AGENTS.md

## Project Overview

Mantle is a visual keyboard configurator GUI for [Kanata](https://github.com/jtroo/kanata), built with Electron + React. Users configure keyboard remappings through a visual editor instead of writing Kanata's Lisp config files by hand.

## Tech Stack

- **Framework**: Electron 39 + React 19 + TypeScript (strict)
- **Build**: Vite + Electron Forge
- **Styling**: Tailwind CSS + Radix UI + class-variance-authority
- **Package Manager**: pnpm
- **State**: React Context API (no external state library)

## Architecture

```
src/
├── main.ts              # Electron main process
├── preload.ts           # IPC bridge (contextBridge)
├── renderer.tsx         # React entry point
├── App.tsx              # Root component + context providers
├── components/          # React components
│   ├── ui/              # Base primitives (button, dialog, input, etc.)
│   ├── keyboard/        # Visual keyboard editor
│   ├── editor/          # Key configuration editor
│   ├── status/          # Kanata status indicator
│   ├── profiles/        # Profile management
│   └── presets/         # Preset picker + first-run wizard
├── contexts/            # React Context state (config, kanata, profile, ui)
├── kanata/              # Kanata process management & config generation
│   ├── process-manager.ts  # Child process lifecycle, LaunchDaemon on macOS
│   ├── config-manager.ts   # File I/O for config persistence
│   ├── generator.ts        # JSON → Kanata Lisp (.kbd)
│   └── parser.ts           # Kanata Lisp → JSON
├── ipc/                 # IPC channel definitions + handlers
├── presets/             # Built-in keyboard presets (qwerty, colemak, etc.)
├── types/               # Shared TypeScript types
├── lib/                 # Utilities (cn(), error helpers)
└── constants/           # App-wide constants
```

**IPC flow**: Renderer → preload (`window.kanata` API) → main process handlers.

## Commands

```bash
pnpm install        # Install dependencies
pnpm start           # Dev mode with hot reload
pnpm run lint        # ESLint
pnpm run make        # Build platform-specific installers
pnpm run package     # Package without installer
```

## Conventions

- **File naming**: PascalCase for components, kebab-case for utilities
- **Types**: Shared types live in `src/types/index.ts`
- **Path aliases**: `@/*` → `src/*`
- **Styling**: Tailwind utilities + CSS custom properties for theming (`--primary`, `--key-bg`, etc.)
- **IPC channels**: Centralized in `src/ipc/channels.ts` — never use string literals
- **Error patterns**: See `src/lib/errors.ts` — silent (log + return null), state (set React error state), or throws (context hooks outside provider)
- **No tests**: There are currently no automated tests
