# DriverKit Installation Spike (Mantle)

## Goal

Evaluate whether Mantle can install and activate the required virtual keyboard DriverKit component directly, without requiring users to install/run the full Karabiner-Elements app as part of onboarding.

## Current Product Context

- Mantle currently onboards users via Karabiner-Elements install flow.
- Real dependency appears to be the **Karabiner virtual HID driver** (DriverKit system extension), not Karabiner keymapping UI.
- Recent field issue: Mantle/Kanata can show as started while remaps do not apply when Karabiner is running and holding exclusive keyboard access.
- Conflict handling was already added in commit `2ffd82c` so users now get explicit guidance when this happens.

---

## What Was Verified in This Spike

### 1) Package structure from installed cask

Observed under:

- `/opt/homebrew/Caskroom/karabiner-elements/15.9.0/Karabiner-Elements.pkg`

Expanding the product package shows two components:

- `org.pqrs.Karabiner-Elements`
- `org.pqrs.Karabiner-DriverKit-VirtualHIDDevice`

From Distribution metadata:

- `org.pqrs.Karabiner-DriverKit-VirtualHIDDevice` is explicitly a separate package payload.

### 2) Driver package contains manager + dext

Expanded DriverKit package payload includes:

- `/Applications/.Karabiner-VirtualHIDDevice-Manager.app`
- `.../Library/SystemExtensions/org.pqrs.Karabiner-DriverKit-VirtualHIDDevice.dext`
- daemon bits under `/Library/Application Support/org.pqrs/Karabiner-DriverKit-VirtualHIDDevice/...`

### 3) Manager CLI exists and supports activation

Command:

- `"/Applications/.Karabiner-VirtualHIDDevice-Manager.app/Contents/MacOS/Karabiner-VirtualHIDDevice-Manager" --help`

Output confirms supported actions:

- `activate`
- `forceActivate`
- `deactivate`

Running `activate` successfully produced:

- `activation of org.pqrs.Karabiner-DriverKit-VirtualHIDDevice is requested`
- request finished/completed messages

### 4) Installed receipt + active extension evidence

Installed packages:

- `org.pqrs.Karabiner-Elements`
- `org.pqrs.Karabiner-DriverKit-VirtualHIDDevice`

System extensions status included:

- `org.pqrs.Karabiner-DriverKit-VirtualHIDDevice` `[activated enabled]`

### 5) Signature verification

`pkgutil --check-signature` on `Karabiner-Elements.pkg` reports:

- signed and notarized
- Developer ID Installer: Fumihiko Takayama (`G43BCU2T37`)

---

## Key Conclusion

Direct DriverKit-focused onboarding is **technically feasible**:

1. Install DriverKit package
2. Trigger activation via manager CLI
3. Guide user through required Apple approval UX
4. Verify extension is activated

This means onboarding can likely shift from:

- "Install Karabiner-Elements app"

to:

- "Install virtual keyboard driver required by Mantle"

without requiring users to keep Karabiner running.

---

## Constraints and Risks

1. **Licensing / redistribution**
   - Need explicit confirmation that bundling/rehosting pqrs DriverKit package is allowed.

2. **System extension approval cannot be bypassed**
   - User approval remains an OS-level requirement.

3. **Privilege elevation required for install**
   - Installing pkg to system locations requires admin privileges.

4. **Version/update management**
   - Must define how Mantle fetches, pins, and updates DriverKit package versions.

5. **Behavioral conflicts still possible**
   - Even with direct install, other remappers can still conflict at runtime (now detected and surfaced).

---

## Current Codebase Notes (Important)

### Driver detection currently conflates app presence

In `src/karabiner/index.ts`, driver detection uses:

- `/Library/Application Support/org.pqrs/Karabiner-DriverKit-VirtualHIDDevice`
- `/Applications/Karabiner-Elements.app`

This means "driver installed" can be true because app exists, even if driver activation status is not robustly validated.

### Onboarding language and flow are app-centric today

Current onboarding heavily references installing/opening Karabiner-Elements UI rather than driver-only intent.

---

## Recommended Next Steps

## Phase 1: Detection correctness

1. Split checks into:
   - driver package present
   - system extension activated
   - Karabiner app present (separate, optional)
2. Stop using Karabiner app path as a proxy for driver health.

## Phase 2: Installer path prototype

1. Add a new internal installer path for DriverKit package:
   - elevated install (`installer -pkg <driverkit.pkg> -target /`)
2. Run manager activation command:
   - `Karabiner-VirtualHIDDevice-Manager activate`
3. Poll for success via:
   - `systemextensionsctl list`
   - expected filesystem markers (secondary signal)

## Phase 3: UX adjustments (after prototype is stable)

1. Update onboarding copy to "driver install" framing.
2. Remove instruction that implies Karabiner app must remain running.
3. Add explicit "quit other remappers" guidance near Start.

## Phase 4: Packaging and policy

1. Decide where DriverKit package artifact comes from:
   - bundled in app resources, or
   - downloaded at runtime from trusted source.
2. Add checksum and signature validation flow.
3. Document version pinning and update cadence.

---

## Acceptance Criteria for DriverKit-Only Path

1. Fresh machine can complete onboarding without opening Karabiner-Elements UI.
2. Driver is activated and Mantle remaps work after onboarding.
3. Mantle clearly handles approval-required states.
4. Mantle detects and explains remapper conflict states.
5. No onboarding step requires user to keep Karabiner running after setup.

---

## Useful Commands Collected During Spike

- List installed receipts:
  - `pkgutil --pkgs | rg -i "karabiner|pqrs|virtualhid|driverkit"`
- List active system extensions:
  - `systemextensionsctl list | rg -i "pqrs|karabiner|virtualhid"`
- Expand top-level pkg:
  - `pkgutil --expand-full "/opt/homebrew/Caskroom/karabiner-elements/<ver>/Karabiner-Elements.pkg" "<out>"`
- Verify pkg signature:
  - `pkgutil --check-signature "<pkg path>"`
- Manager CLI help:
  - `"/Applications/.Karabiner-VirtualHIDDevice-Manager.app/Contents/MacOS/Karabiner-VirtualHIDDevice-Manager" --help`
- Trigger activation:
  - `"/Applications/.Karabiner-VirtualHIDDevice-Manager.app/Contents/MacOS/Karabiner-VirtualHIDDevice-Manager" activate`

---

## Immediate Follow-up Ticket Suggestions

1. `driverkit: split driver/app detection semantics`
2. `driverkit: add direct DriverKit install prototype behind feature flag`
3. `onboarding: rewrite copy for driver-first flow`
4. `security: define package trust + verification policy for DriverKit artifact`
