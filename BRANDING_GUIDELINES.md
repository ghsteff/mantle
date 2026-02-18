---
# Branding Guidelines

Below are two distinct directions for Mantle's visual identity. Each reflects a different interpretation of what the product represents.
---

## Direction A: "Precision Instrument"

### Concept

Mantle is a tool of craft - like a machinist's caliper or a well-made mechanical switch. The brand should feel **exact, premium, and quietly confident**. Think Leica, Teenage Engineering, or a high-end audio interface.

### Name Treatment

- "Mantle" set in a geometric sans-serif (e.g., **GT America**, **ABC Diatype**, or the current Geist)
- All lowercase: **mantle**
- Generous letter-spacing (tracking +0.05em to +0.1em)
- No logomark needed - the wordmark is the logo

### Color Palette

| Role           | Color      | Hex       |
| -------------- | ---------- | --------- |
| Background     | True Black | `#000000` |
| Surface        | Midnight   | `#0A0A0A` |
| Border         | Graphite   | `#1A1A1A` |
| Primary Text   | White      | `#FFFFFF` |
| Secondary Text | Slate      | `#6B6B6B` |
| Accent         | Warm White | `#F5F0EB` |
| Success        | Mint       | `#00D47B` |
| Warning        | Amber      | `#E5A100` |
| Error          | Coral      | `#E54D42` |

### Typography

- **Primary**: Geist Sans (already in use) - clean, no-nonsense
- **Monospace**: Geist Mono - for key labels and technical details
- Sizes stay small and precise. Body at 13px, labels at 11px. Nothing shouts.

### Tone of Voice

- **Sparse.** Say less. Every word earns its place.
- Technical accuracy over friendliness. "Apply" not "Save your awesome changes!"
- No exclamation marks. No emoji. No marketing speak inside the app.
- Example empty state: _"Select a key to begin."_
- Example tooltip: _"Tap: action on press and release. Hold: action after 200ms threshold."_

### Visual Principles

- Generous whitespace. Let elements breathe.
- Hairline borders (1px, low opacity) to separate regions
- No gradients, no glows, no decoration
- Subtle shadows only where depth is functionally necessary (e.g., key caps)
- Micro-interactions: 150ms transitions, slight scale on press, opacity fades
- The keyboard visualization is the hero. Everything else recedes.

### Personality in One Sentence

_"The app disappears. The keyboard remains."_

## Direction B: "Command Line Evolved"

### Concept

Mantle bridges the gap between terminal power and visual clarity. The brand should feel **hacker-elegant** - like the best TUI apps, or a beautifully-themed terminal. Think Warp terminal, Ghostty, or the Catppuccin color scheme community. This direction leans into the developer identity rather than away from it.

### Name Treatment

- "Mantle" set in a monospace or semi-mono typeface (e.g., **Berkeley Mono**, **Commit Mono**, **Geist Mono**)
- Styled as a prompt: **> mantle** or simply **mantle\_**
- The underscore or cursor-blink motif connects to terminal culture
- Could render the name in a subtle ASCII box: `[ mantle ]`

### Color Palette

| Role           | Color          | Hex       |
| -------------- | -------------- | --------- |
| Background     | Terminal Black | `#0D1117` |
| Surface        | Panel Dark     | `#161B22` |
| Border         | Rule Gray      | `#30363D` |
| Primary Text   | Terminal White | `#E6EDF3` |
| Secondary Text | Comment Gray   | `#7D8590` |
| Accent         | Bright Green   | `#39D353` |
| Accent Alt     | Bright Cyan    | `#58D1F0` |
| Success        | Green          | `#3FB950` |
| Warning        | Yellow         | `#D29922` |
| Error          | Red            | `#F85149` |

### Typography

- **Primary**: Geist Mono or Berkeley Mono for everything - lean fully into monospace
- **Fallback**: Geist Sans only where monospace genuinely hurts readability (long descriptions)
- Sizes stay compact. 12-13px. Dense but legible.
- Key labels in monospace feel natural and precise.

### Tone of Voice

- **Direct and technical.** Respects the user's intelligence.
- Use Kanata terminology where appropriate - users should learn the real concepts
- Terse is good. "tap: esc | hold: lctl" is a valid UI string.
- Example empty state: _"No key selected"_
- Example tooltip: _"tap-hold 200 esc lctl"_ (show the actual Kanata output alongside the visual)
- Status messages read like logs: "kanata started (pid 4821)" / "config reloaded"

### Visual Principles

- Monospace grid alignment - elements snap to a character grid where possible
- The keyboard could render with ASCII-art borders as an option/easter egg
- Green accent on black evokes terminal, but used tastefully (not "Matrix" themed)
- Minimal border-radius (2-4px) - more angular than the other directions
- Status bar at the bottom, like a terminal/editor status line
- Key actions displayed in a code-like syntax alongside the visual editor
- Animations are fast and snappy (100-150ms). No languorous fades.
- Dense layout. Information-rich. Power users don't need hand-holding.

### Personality in One Sentence

_"All the power of Kanata. None of the config files."_

---

## Comparison at a Glance

| Aspect                 | A: Precision Instrument | B: Workshop Bench       | C: Command Line Evolved |
| ---------------------- | ----------------------- | ----------------------- | ----------------------- |
| **Feeling**            | Premium, minimal        | Warm, approachable      | Technical, hacker-cool  |
| **Audience lean**      | Design-minded devs      | Broader / newcomers     | Terminal-native devs    |
| **Color mood**         | Pure B&W                | Dark with purple warmth | Dark with green/cyan    |
| **Typography**         | Sans-serif, airy        | Rounded sans, readable  | Monospace, dense        |
| **Key rendering**      | Flat, precise           | Soft depth, tactile     | Angular, grid-aligned   |
| **Tone**               | Sparse, confident       | Friendly, helpful       | Direct, technical       |
| **Risk**               | Could feel cold         | Could feel generic      | Could alienate non-devs |
| **Closest to current** | Very close              | Moderate departure      | Moderate departure      |
