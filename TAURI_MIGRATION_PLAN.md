# Tauri Migration Plan

This document is the working checklist for migrating Mantle from Electron to Tauri in incremental, reversible phases.

## Migration Goals

- Preserve user-facing behavior for core workflows.
- Improve long-term platform efficiency and security posture.
- Keep migration risk bounded with milestone gates and rollback criteria.

## Scope (Initial)

- Platform: macOS first (Apple Silicon + Intel)
- Critical workflows:
  - Profile management
  - Config read/write
  - Kanata start/stop/status
  - Error and log surfacing

## Milestone Plan

### M1: Foundation (1-3 days)

- [x] Scaffold `src-tauri`
- [x] Launch existing React UI in Tauri shell
- [x] Add first Rust command (`health_check`)
- [x] Add typed renderer invoke wrapper

### M2: Config I/O Parity (2-4 days)

- [x] Port config load/save commands to Rust
- [ ] Preserve current JSON schema
- [ ] Implement atomic writes
- [ ] Validate paths and errors in UI

### M3: Process Lifecycle Parity (4-7 days)

- [~] Port Kanata process manager to Rust (core start/stop/restart/status + event streaming done)
- [x] Implement explicit process state machine (`idle`, `starting`, `running`, `stopping`, `error`) (Tauri runtime now transitions cleanly through explicit `idle` + transient states)
- [x] Stream logs/status events to renderer
- [~] Validate restart/cleanup behavior (added stop-in-progress guard and exit cleanup hook)

### M4: macOS Integration + Security (3-6 days)

- [x] Rebuild daemon/service behavior used for Kanata launch
- [~] Validate permission UX and diagnostics (one-time admin setup messaging + stale daemon/sudoers self-heal)
- [x] Restrict Tauri capabilities (currently `core:default` only; no extra filesystem/process plugin permissions)
- [~] Threat model shell/path handling (removed shell wrappers for daemon control; added input/path hardening for privileged setup)

### M5: Packaging + Parallel Validation (2-4 days)

- [ ] Configure signing/notarization pipeline
- [ ] Run scenario matrix (Electron vs Tauri)
- [ ] Measure app size, memory, startup
- [ ] Fix parity blockers

### M6: Cutover (1-2 days)

- [ ] Switch default dev/build docs to Tauri
- [ ] Remove Electron-only runtime paths
- [ ] Tag first stable Tauri release
- [ ] Keep one fallback Electron release tag

## Checklist by Phase

### 0) Success Criteria and Guardrails

- [ ] Define acceptance criteria for parity
- [ ] Define non-functional goals (size/startup/reliability)
- [ ] Define rollback rule for paused migration

### 1) Runtime Boundary (Renderer)

- [x] Centralize renderer access to desktop API via shared client helper (`src/platform/kanata-client.ts`)
- [x] Move `KanataApi` contract into a shared file (`src/ipc/kanata-api.ts`)
- [x] Update contexts to use shared client boundary instead of direct global reads
- [~] Add Tauri invoke-based implementation behind same boundary (started with `getStatus`)

### 2) Command Surface Mapping

- [ ] Map each IPC channel in `src/ipc/channels.ts` to Tauri command/event names
- [ ] Normalize command result shape (`success`, `error`, `code`, `details`)
- [ ] Decide event naming and payload contracts

### 3) Config and Profiles

- [x] Port config manager operations
- [x] Port profile CRUD operations
- [ ] Keep schema/version compatibility
- [ ] Validate import/export parity

### 4) Kanata Process Management

- [~] Port spawn/stop/restart/status paths (single-process flow implemented in Tauri)
- [~] Preserve crash handling behavior (unexpected exits now surface crash + error state; auto-restart removed)
- [~] Add robust shutdown cleanup (Tauri exit now invokes Kanata stop cleanup)
- [ ] Validate long-running stability

### 5) Karabiner and System Hooks

- [~] Port Karabiner status/install commands (Tauri commands + event streaming wired for check/install/cancel/open/launch)
- [~] Port system settings openers and permission prompts (Input Monitoring opener now also reveals Kanata binary in Finder)
- [ ] Validate degraded behavior if checks fail

### 6) Packaging and Release

- [ ] Build local signed package
- [ ] Validate fresh install/upgrade/uninstall
- [ ] Document release checklist

## Go/No-Go Gates

- Gate A (post-M2): config/profile flows are stable and maintainable.
- Gate B (post-M3): Kanata lifecycle is reliable across restart/reboot cycles.
- Gate C (post-M5): parity met for critical workflows and packaging is production-ready.

## Scenario Matrix for Parity Testing

- [ ] Cold start app
- [ ] Load active profile
- [ ] Edit keys and save config
- [ ] Start Kanata, verify running state
- [ ] Stop and restart Kanata
- [ ] Import/export `.kbd`
- [ ] Validate behavior after app restart
- [ ] Validate behavior after user logout/login

## Current Status

- Started M1 by extracting a shared renderer runtime boundary:
  - `src/ipc/kanata-api.ts`
  - `src/platform/kanata-client.ts`
  - Updated context providers to call through this boundary.
- Completed additional M1 steps:
  - Scaffolded `src-tauri` with initial `tauri.conf.json`.
  - Added `health_check` command in `src-tauri/src/lib.rs`.
  - Added `src/platform/tauri-health.ts` and startup health probe in `src/App.tsx`.
  - Added `tauri:dev` and `tauri:build` scripts to `package.json`.
- Completed first invoke-backed app operation:
  - Added Rust command `kanata_get_status` in `src-tauri/src/lib.rs`.
  - Added renderer adapter `src/platform/kanata-status.ts`.
  - Updated `KanataProvider` to source initial status via runtime-aware adapter.
- Started the next invoke-backed operation:
  - Added Rust command placeholder `config_load` in `src-tauri/src/lib.rs`.
  - Added renderer adapter `src/platform/config-loader.ts`.
  - Updated `ConfigProvider` to load from runtime adapter with safe fallback during migration.
- Completed initial `config_load` file I/O in Rust:
  - Reads active profile from `profiles.json` under app data `kanata` directory.
  - Loads `config-<activeProfile>.json` when available.
  - Falls back to legacy `config.json`.
- Completed save + profile metadata parity commands:
  - Added `config_save` in Rust and hooked renderer `saveConfigToRuntime`.
  - Added `profiles_list` and `profiles_get_active` commands in Rust.
  - Updated profile refresh path to call runtime adapters instead of Electron-only API.
  - Suppressed Electron-only Kanata warning when running under Tauri runtime.
- Completed Tauri profile mutation commands and runtime wiring:
  - Added `profiles_create`, `profiles_switch`, `profiles_delete`, `profiles_rename` in Rust.
  - Added renderer runtime adapters for profile mutations in `src/platform/profiles-runtime.ts`.
  - Updated `ProfileProvider` to use runtime adapters instead of Electron-only profile mutations.
- Completed first Kanata lifecycle parity block in Tauri:
  - Added Rust commands `kanata_start`, `kanata_stop`, `kanata_restart`, `kanata_get_status`.
  - Added Rust event emission for `kanata-log`, `kanata-status-change`, `kanata-crash`, `kanata-error`, `kanata-permission-denied`, `kanata-exclusive-access-denied`.
  - Added runtime adapter `src/platform/kanata-runtime.ts` and event constants in `src/platform/kanata-runtime-events.ts`.
  - Updated `KanataProvider` to subscribe through runtime adapters instead of Electron-only event sources.
  - Added `kanata.kbd` generation on Tauri config save/switch paths to unblock runtime process startup.
- Started M4 hardening pass:
  - Confirmed Tauri capabilities remain least-privilege via `src-tauri/capabilities/default.json` with `core:default` only.
  - Hardened privileged macOS command setup in `src-tauri/src/lib.rs`:
    - Removed `sh -c` usage from daemon kickstart/stop and PID detection paths.
    - Added strict username validation before writing sudoers entries.
    - Added shell-safe quoting for privileged install command paths.
    - Added XML escaping for LaunchDaemon plist path fields.
    - Added stale daemon/sudoers drift detection and automatic repair path.
    - Added a stop guard to no-op cleanup when Kanata is already down, preventing shutdown-time admin/password prompts.
  - Added renderer diagnostics for setup/permission failures:
    - Replaced Kanata permission booleans with a single explicit issue state in `src/contexts/kanata-context.tsx`.
    - Added `AdminSetupModal` and wired issue-aware modal UX in `src/components/LogPanel.tsx`.
  - Added status-toggle transition guard in `src/components/status/status-indicator.tsx` to prevent command spam during `starting`/`stopping`.
- Started Karabiner runtime migration:
  - Added Tauri backend commands `karabiner_check`, `karabiner_install`, `karabiner_cancel_install`, `karabiner_open_pkg`, `karabiner_launch_app`.
  - Added Tauri event emission for `karabiner-install-output` and `karabiner-install-complete`.
  - Added renderer adapters `src/platform/karabiner-runtime.ts` + `src/platform/karabiner-runtime-events.ts`.
  - Updated `KarabinerProvider` to use runtime adapters instead of Electron-only `window.kanata` hooks.
  - Updated Tauri `open_input_monitoring_settings` command to mirror Electron UX by opening System Settings and revealing the Kanata binary in Finder.
- Next implementation step: run long-running lifecycle stability validation (start/stop/restart, forced crash, app exit cleanup, relaunch) and close remaining M4 diagnostics gaps with manual scenario verification.
