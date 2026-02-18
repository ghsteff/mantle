# Mantle - Product Requirements Document

## What is Mantle?

Mantle is a desktop app that lets you customize what every key on your keyboard does - without writing any code. It's a visual editor for Kanata, a powerful keyboard remapping engine that runs on Mac, Windows, and Linux.

## The Problem

Keyboard customization today is fragmented and frustrating:

- **Mechanical keyboard users** can flash custom firmware (QMK/ZMK), but only for supported boards - and the process is technical.
- **Software remappers** like Kanata are incredibly powerful but require hand-editing Lisp configuration files - a non-starter for most people.
- **Platform-specific tools** (Karabiner on Mac, AutoHotkey on Windows) don't transfer across operating systems and each have their own learning curve.

People who would benefit most from keyboard customization - those with RSI, developers wanting efficiency, anyone tired of reaching for modifier keys - are locked out by complexity.

## The Solution

Mantle gives you a visual keyboard on screen. Click a key, tell it what you want it to do, and you're done. Changes apply instantly.

### Core Capabilities

1. **Simple Remaps** - Make any key act as any other key. Caps Lock becomes Escape. Right Alt becomes Backspace. Whatever you want.

2. **Tap-Hold Actions** - A key does one thing when tapped and another when held. Tap Caps Lock for Escape, hold it for Control. This is the killer feature that makes compact layouts usable.

3. **Layers** - Create entire alternate keyboard layouts that activate when you hold a key. Hold Space to turn your right hand into arrow keys and navigation. Hold a thumb key to get a numpad. Stack as many layers as you want.

4. **Profiles** - Save different configurations for different contexts. One for coding, one for gaming, one for writing. Switch between them from the app.

5. **Built-in Presets** - Start from popular community layouts (Colemak, Dvorak, Homerow Mods) instead of from scratch.

6. **Live Reload** - See your changes take effect immediately. No restarts, no re-flashing, no waiting.

## Who Is It For?

- **Developers and power users** who live at their keyboard and want to work faster
- **People with RSI or repetitive strain** who need to reduce finger travel and awkward key combos
- **Keyboard enthusiasts** who want QMK-style customization on any keyboard, including laptops
- **Cross-platform users** who want the same keyboard behavior everywhere
- **Curious tinkerers** who've heard about keyboard layers but found the setup too intimidating

## What Success Looks Like

- Someone downloads Mantle, applies a preset, and has a better keyboard experience within 2 minutes
- An experienced user can replicate their QMK layout in Mantle without touching a config file
- A user on Mac sets up their layout once and gets the same experience when they switch to their Linux machine

## Platform Support

- macOS (requires Karabiner virtual HID driver)
- Windows (requires administrator privileges)
- Linux (requires input group membership)

## Non-Goals

- Mantle is not a typing tutor or keyboard training app
- Mantle does not replace Kanata - it's a frontend for it
- Mantle does not handle mouse remapping or macros (for now)
- Mantle does not require an account, cloud sync, or internet connection
