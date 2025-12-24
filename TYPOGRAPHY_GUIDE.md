Great instinct — **“everything mono” is coherent, but not always optimal**. Many of the best technical tools (VS Code, Linear, Figma, GitHub, Stripe) use **mono + sans deliberately**, not ideologically.

Below is a **Typography Usage Guide** you can append to the Mantle design system. It preserves Mantle’s technical identity while improving readability, hierarchy, and marketing clarity.

---

# Mantle Typography Guide

**Mono + Sans Usage Rules**

---

## 1. Typography Philosophy

Mantle treats typography as **signal**, not decoration.

- **Monospace = structure, logic, state**
- **Sans-serif = explanation, narrative, orientation**

Mono communicates _systems_.
Sans communicates _meaning_.

Using both increases clarity without diluting Mantle’s technical feel.

---

## 2. Typeface Roles

### 2.1 Monospace (Primary Functional Font)

Use monospace when the text represents:

- A **system**
- A **state**
- A **value**
- A **mapping**
- A **literal**

**Monospace implies “this is exact.”**

Recommended:

- JetBrains Mono
- Inter Mono
- SF Mono

---

### 2.2 Sans-Serif (Secondary Contextual Font)

Use sans-serif when the text is:

- Explanatory
- Navigational
- Instructional
- Marketing-facing

**Sans implies “this is for humans, not machines.”**

Recommended:

- Inter
- SF Pro
- IBM Plex Sans

---

## 3. App UI Typography Rules

### 3.1 Always Monospace

Use monospace for:

- Key labels (`R`, `Esc`, `Cmd`)
- Action types (`Tap-Hold`, `Layer`)
- Inspector values
- Code-like strings
- Status indicators
- Short UI labels that represent _mechanics_

Examples:

```
Tap-Hold
Transparent
Inherit from lower layer
R → Ctrl
Layer: nav
```

---

### 3.2 Sans-Serif Allowed (and Encouraged)

Use sans-serif for:

- Section headers
- Panel titles
- Explanatory copy
- Empty states
- Tooltips longer than one sentence
- Onboarding instructions

Examples:

> “Tap sends `R`. Hold activates the navigation layer.”

---

### 3.3 Mixed Usage (Best Practice)

**Headers in sans, contents in mono**

This creates hierarchy without visual noise.

Example:

```
[Inspector]
Action Type:
Tap-Hold
```

---

## 4. Landing Page Typography

### 4.1 Headlines

**Sans-serif**

- Large
- Clean
- Calm
- Neutral

Example:

> Mantle is a programmable keyboard layer system.

---

### 4.2 Supporting Copy

**Sans-serif**

- Short paragraphs
- Clear explanation
- Human-readable

---

### 4.3 Feature Labels & Terms

**Monospace**

Used for:

- Feature names
- Keywords
- Concepts users will see in the app

Example:

> Supports `Tap-Hold`, `Transparent`, and layered key inheritance.

---

## 5. Type Hierarchy Example

```plaintext
[Sans]    Inspector
[Sans]    Action Type
[Mono]    Tap-Hold
[Sans]    Sends a key when tapped, activates a layer when held.
```

---

## 6. Weight & Contrast Rules

### Monospace

- Default weight: 400
- Active / selected: 500–600
- Avoid bolding large blocks

### Sans-serif

- Headers: 500–600
- Body: 400
- Avoid ultra-light weights

---

## 7. Do / Don’t Summary

### Do

- Use mono for literals and states
- Use sans for explanations
- Mix intentionally, not arbitrarily
- Keep fonts visually compatible

### Don’t

- Use mono for long paragraphs
- Use sans for key legends or mappings
- Mix more than two families
- Use decorative fonts anywhere

---

## 8. LLM Instruction Snippet

Use this when generating UI or copy:

> “Choose monospace for system-level text, literals, values, and key mappings. Choose sans-serif for headers, explanations, and human-readable guidance. Maintain Mantle’s dark, technical aesthetic.”

---

## 9. Final Take

**Everything monospaced is consistent — but consistency ≠ clarity.**

Mantle is strongest when:

- Mono defines the _machine_
- Sans supports the _human_

That balance makes Mantle feel **professional, intentional, and mature**, not dogmatic.
