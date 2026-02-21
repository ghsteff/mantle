# Refactor Plan (Tauri)

This doc tracks the refactors identified in the repo scan and the order we’ll land them. Each item should be implemented as a small, reviewable change with its own commit.

Note on naming: `src-tauri/` is the standard folder name used by Tauri (v1 and v2). Renaming it is possible, but uncommon and adds config/tooling churn.

## Execution Order

### P0: Security + Data Safety

- [x] Restrict backup restore paths (prevent arbitrary file reads)
  - Files: `src-tauri/src/lib.rs`, `src/platform/config-maintenance-runtime.ts`, `src/platform/tauri-contract.ts`
  - Current issue: `config_restore_backup` accepts any `backup_path` and reads it.
  - Fix: validate the path is within the app config directory and matches a known backup file.
  - Acceptance: restore works for results from `config_list_backups`, fails for `/tmp/foo.json`, `../x.json`, symlinks out of dir.

- [x] Sanitize profile names (prevent path traversal via `config-{name}.json`)
  - Files: `src-tauri/src/lib.rs`, `src/platform/profiles-runtime.ts`, any UI that creates/renames profiles
  - Fix: strict allowlist validator for profile names; enforce in *all* profile commands (create/switch/delete/rename) and any path construction.
  - Acceptance: reject `../foo`, `a/b`, `a\\b`, empty/whitespace-only; allow `default`, `work`, `gaming-1`.

### P1: Reliability (timers, async cleanup, one-shot bootstrap)

- [x] Clear scheduled timeouts / intervals on unmount
  - Files: `src/hooks/use-onboarding-flow.ts`, `src/components/onboarding/driver-onboarding-modal.tsx`, `src/contexts/karabiner-context.tsx`
  - Fix: store timer IDs in refs and clear them in effect cleanup; guard against setState after unmount.

- [x] Prevent duplicate default profile creation attempts
  - Files: `src/components/MainContent.tsx`
  - Fix: `useRef` one-shot guard around default profile bootstrap.

### P2: Docs + repo truth alignment

- [x] Update `AGENTS.md` to describe the Tauri architecture (not Electron)
  - Files: `AGENTS.md`
  - Fix: update runtime description, folder layout, IPC/event flow, and dev/build commands.

- [x] Update README to match product scope (macOS-only vs cross-platform)
  - Files: `README.md`, `bugs.md`
  - Fix: make scope consistent and remove stale references to non-existent Electron Forge config if applicable.

### P3: Tooling / deps cleanup (higher churn, do after P0/P1)

- [x] Decide on Electron/Electron-Forge dependency removal
  - Files: `package.json`
  - Options:
    - Remove if fully migrated to Tauri
    - Keep temporarily if migration is in-progress (but document why)

- [x] Fix TS module config for Vite + modern TS
  - Files: `tsconfig.json`
  - Likely change: `module: "ESNext"` and modern `moduleResolution` as needed.

- [x] Standardize Radix imports (avoid mixing `radix-ui` barrel with `@radix-ui/react-*`)
  - Files: `src/components/ui/*`
  - Fix: prefer `@radix-ui/react-*` packages, remove `radix-ui` dependency if unused afterwards.

## Remaining Backlog

These are follow-ups from the original scan that weren’t captured in the initial checklist.

- [x] Rust: replace root/admin shell-string execution with structured `Command` steps
  - Files: `src-tauri/src/lib.rs` (`install_passwordless_launchdaemon`, `run_admin_shell` usage)
  - Goal: reduce injection risk, improve error reporting, ensure partial failures clean up.

- [x] Rust: reduce blocking I/O on command handlers (avoid UI stalls)
  - Files: `src-tauri/src/lib.rs`
  - Goal: move heavy work off the main thread; avoid `thread::sleep` in command handlers.

- [x] Kanata parser: parse all `(defalias ...)` blocks and merge deterministically
  - Files: `src/kanata/parser.ts`
  - Goal: don’t drop aliases on import when multiple blocks exist.

- [x] Kanata parser: quote-aware tokenization
  - Files: `src/kanata/parser.ts`
  - Goal: handle quoted strings containing spaces without corrupting tokens.

- [x] UI: remove `confirm()`/`alert()` usage in favor of app dialogs
  - Files: `src/contexts/profile-context.tsx`, `src/components/editor/layer-tabs.tsx`, `src/components/profiles/import-export-button.tsx`
  - Goal: consistent UI/UX and testable flows.

- [x] State modeling: reduce redundant/derived flags (“boolean soup”)
  - Files: `src/contexts/config-context.tsx`, `src/contexts/karabiner-context.tsx`
  - Goal: discriminated unions over multiple booleans/derived fields where practical.

## Working Agreement

- Each checkbox lands as its own commit.
- Prefer backend validation (Rust) for security invariants; frontend validation is for UX only.
- Avoid type assertions (`as`) unless there’s a clear reason; if added, document why in the commit message/body.

