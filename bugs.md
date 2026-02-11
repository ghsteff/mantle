# Mantle Bug + Task Handoff

This file is a handoff backlog for a fresh agent. It contains concrete bug fixes and cleanup tasks, ranked by priority.

## Scope Decision (Important)

This project is now **macOS-only**. Any code paths, packaging config, binaries, or UX behavior for Windows/Linux should be removed or explicitly unsupported.

---

## Priority 0 - Security + Data Safety

### 1) Sanitize profile names to prevent path traversal

- **Priority:** P0
- **Files:** `src/kanata/config-manager.ts`, any renderer code that creates/renames profiles
- **Problem:** Profile names are used in file paths (`config-${profileName}.json`) without strict validation. Names containing separators or traversal sequences can escape the intended config directory.
- **Why this matters:** A crafted profile name can cause unintended file read/write/rename/delete under user permissions.
- **What to change:**
  - Add a single profile name sanitizer/validator in `ConfigManager` (allowlist style, e.g. lowercase letters, numbers, `-`, `_`).
  - Reject invalid names in `createProfile`, `renameProfile`, `switchProfile`, `deleteProfile`, and any internal helper that converts names to paths.
  - Ensure normalized path stays inside `configDir` (defense in depth).
  - Surface failure as explicit `false` + meaningful log message.
- **Acceptance criteria:**
  - Invalid names like `../foo`, `a/b`, `a\\b`, and empty string are rejected.
  - Normal names still work (`default`, `work`, `gaming-1`).
  - No profile operation can touch files outside `configDir`.

### 2) Restrict backup restore paths

- **Priority:** P0
- **Files:** `src/kanata/config-manager.ts`, `src/ipc/handlers.ts`
- **Problem:** `restoreBackup(backupPath)` trusts arbitrary paths from IPC.
- **Why this matters:** Renderer can request reading unrelated local files and overwrite active profile if parsed shape appears valid.
- **What to change:**
  - Only allow restore from known backup files in `configDir`.
  - Validate by resolving path and ensuring it is one of `listBackups()` results (or at minimum under `configDir` and matching expected backup filename pattern).
  - Reject non-backup paths with clear logging.
- **Acceptance criteria:**
  - Restore succeeds for real files from `listBackups()`.
  - Restore fails for `/tmp/foo.json`, `../x.json`, and other external paths.

---

## Priority 1 - macOS-Only Cleanup (Project Decision)

### 3) Remove Windows/Linux packaging + binary references

- **Priority:** P1
- **Files:** `forge.config.ts`, `bin/` assets, docs (`README.md` if needed)
- **Problem:** Build config and repository still include Windows/Linux makers and binaries.
- **Why this matters:** Creates false support expectations and maintenance burden.
- **What to change:**
  - In `forge.config.ts`, remove non-macOS makers (`MakerSquirrel`, `MakerDeb`, `MakerRpm`) and keep mac packaging only.
  - Remove non-mac binaries from `extraResource`; keep only macOS binaries needed at runtime.
  - Remove stale non-mac binaries from `bin/` if repository policy allows deleting tracked artifacts.
  - Update README/docs to state macOS-only support explicitly.
- **Acceptance criteria:**
  - Packaging flow produces mac artifacts only.
  - No runtime references to Windows/Linux binaries remain.
  - Project docs clearly state macOS-only.

### 4) Simplify binary resolution and process management to macOS-only

- **Priority:** P1
- **Files:** `src/kanata/binary-path.ts`, `src/kanata/process-manager.ts`
- **Problem:** Current logic still branches by platform, but operational model is effectively macOS LaunchDaemon.
- **Why this matters:** Dead branches increase complexity and confuse future contributors/agents.
- **What to change:**
  - In `binary-path.ts`, drop non-mac platform branches; resolve only mac binary names (`arm64` / `x64`).
  - In process manager, remove dead comments/branches implying other platforms are supported.
  - Keep behavior centered on LaunchDaemon flow and make unsupported platform behavior explicit (if code can still run in dev on other platforms, fail fast with a clear message).
- **Acceptance criteria:**
  - Startup code path is straightforward and mac-specific.
  - No calls to Unix-vs-Windows branching for Kanata runtime remain unless strictly needed for guardrails.

### 5) Fix `window-all-closed` behavior for predictable app quit behavior

- **Priority:** P1
- **Files:** `src/main.ts`
- **Problem:** Code currently no-ops on `window-all-closed` for all platforms.
- **Why this matters:** Even in macOS-only app, this diverges from expected lifecycle and can leave background process running unexpectedly.
- **What to change:**
  - Implement intended lifecycle explicitly.
  - If desired behavior is "mac style keep-alive", keep it but update comments to match.
  - If desired behavior is "quit when all windows close", call `app.quit()` accordingly.
  - Make comments and behavior consistent.
- **Acceptance criteria:**
  - Closing the last window behaves exactly as product intent specifies.
  - Comments accurately reflect real behavior.

---

## Priority 2 - Reliability + Correctness

### 6) Prevent event listener leaks when recreating windows

- **Priority:** P2
- **Files:** `src/ipc/handlers.ts`, `src/main.ts`
- **Problem:** `setupProcessEventForwarding(mainWindow)` attaches listeners each time a new window is created; old listeners are not cleaned up.
- **Why this matters:** Duplicate events, memory growth, and eventual `EventEmitter` warnings.
- **What to change:**
  - Register one forwarding layer globally, or
  - Track listeners per window and detach them on `mainWindow.on("closed")`.
  - Ensure no duplicate attachments after close/reopen cycles.
- **Acceptance criteria:**
  - Reopening windows repeatedly does not increase listener counts.
  - Each log/status event appears exactly once per active window.

### 7) Parse all `defalias` blocks on import

- **Priority:** P2
- **Files:** `src/kanata/parser.ts`
- **Problem:** Parser currently reads only one `defalias` block.
- **Why this matters:** Valid Kanata configs with multiple alias blocks lose data on import.
- **What to change:**
  - Use `extractAllBlocks` for `defalias`.
  - Parse and merge aliases from all blocks (define deterministic conflict behavior, e.g. last-write-wins).
- **Acceptance criteria:**
  - Importing a file with multiple `defalias` blocks preserves all aliases.
  - Round-trip export contains expected alias set.

### 8) Improve parser tokenization for quoted strings

- **Priority:** P2
- **Files:** `src/kanata/parser.ts`
- **Problem:** Tokenization splits on whitespace without quote awareness.
- **Why this matters:** Actions/values with spaces can be corrupted on import.
- **What to change:**
  - Make lexer quote-aware while still respecting nested parentheses.
  - Add handling for escaped quotes if needed by supported syntax.
- **Acceptance criteria:**
  - Quoted tokens with spaces survive parse.
  - Existing simple configs still parse unchanged.

### 9) Eliminate async state updates after unmount in contexts/hooks

- **Priority:** P2
- **Files:** `src/contexts/kanata-context.tsx`, `src/contexts/karabiner-context.tsx`, and any similar async effects
- **Problem:** Promise and timeout callbacks can call `setState` after provider unmount.
- **Why this matters:** React warnings, stale state, brittle behavior during rapid navigation or app teardown.
- **What to change:**
  - Add cancellation flags and timeout cleanup in effects/callbacks.
  - Guard async completions before calling state setters.
- **Acceptance criteria:**
  - No "setState on unmounted component" warnings under mount/unmount stress.
  - Behavior remains unchanged during normal use.

---

## Priority 3 - UX/Hardening

### 10) Guard macOS-only settings deep-link API

- **Priority:** P3
- **Files:** `src/ipc/handlers.ts`
- **Problem:** `OPEN_INPUT_MONITORING` always tries Apple URL scheme.
- **Why this matters:** Low impact now (mac-only project), but still should be explicit and robust.
- **What to change:**
  - Add early platform guard and explicit error/log if not darwin.
  - Keep Finder reveal logic tied to same guard.
- **Acceptance criteria:**
  - Handler is explicit and self-documenting.
  - No accidental ambiguous behavior.

### 11) Prevent duplicate default-profile creation attempt race

- **Priority:** P3
- **Files:** `src/components/MainContent.tsx`
- **Problem:** Startup effect can issue repeated create calls before profile state settles.
- **Why this matters:** Usually harmless, but noisy and can create edge-case timing bugs.
- **What to change:**
  - Add one-shot `useRef` guard around default profile bootstrap.
- **Acceptance criteria:**
  - At startup, default profile creation request happens at most once.

---

## Suggested Execution Order

1. Complete P0 tasks first (`#1`, `#2`).
2. Execute macOS-only cleanup (`#3`, `#4`, `#5`) as a focused PR.
3. Land reliability fixes (`#6`-`#9`).
4. Finish hardening/UX cleanup (`#10`, `#11`).

## Notes for Fresh Agent

- Treat this file as implementation guidance, not just observations.
- When changing parser behavior (`#7`, `#8`), preserve backwards compatibility with existing saved configs.
- For macOS-only cleanup, ensure docs and build config agree with runtime assumptions.
