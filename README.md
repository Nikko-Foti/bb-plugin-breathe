# Breathe

A lavender pixel wave follows inhale, hold and exhale while the agent works. Classic (4/7/8), Even (4/4/4) and Unwind (4/0/6) presets and custom durations are available. Inhale/exhale accept 1–30 whole seconds; hold accepts 0–30, with zero skipping hold. BB supports pointer and keyboard ripples. Light mode uses an amethyst crest; dark mode uses moonlit lavender.

A standalone plugin for **BB** and **Claude Code**. Its package, settings, styles and commands are independent of the other scene.

Inspired by [Mindful Claude](https://github.com/halluton/Mindful-Claude) by [halluton](https://github.com/halluton), which turns the wait for Claude into a guided breathing exercise.

## A reminder to breathe

Slow, regular [breathing exercises](https://www.nhs.uk/mental-health/self-help/guides-tools-and-activities/breathing-exercises-for-stress/) can help ease stress and anxiety. Breathe brings the reminder back whenever your agent works, turning everyday waiting time into a cue to pause, breathe, and practise regularly.

## BB

Requires BB 0.46 or later with Plugin SDK 0.6.49 or later.

```sh
bb plugin install git:https://github.com/Nikko-Foti/bb-plugin-breathe.git@main
```

Open **Breathe settings** from the composer label, the **+** menu, or plugin settings. Preview, Replay, Undo and Apply are available. The scene appears during active work, pauses offscreen, respects system reduced motion, and hides while waiting for input. Hide dismisses the current turn. Enabling both standalone plugins displays both; each has its own switch.

## Claude Code

Use a Claude Code version supporting JavaScript mods. Install the local package:

```sh
claude plugin install breathe --marketplace .
```

Run **`/breathe`** for settings. Terminal draws colored half-block pixels; Desktop draws SVG. Still mode freezes motion. Preview edits before Apply; Close discards them. The package in `claude/` is self-contained and needs no npm dependencies at runtime.

## Moving from While We Wait

Install the standalone plugins, copy the breathing timing into Breathe, and turn on the scene(s) you want. Disable the combined While We Wait plugin to avoid duplicate scenes. Its existing settings can remain for rollback. BB and Claude settings are separate; the new plugins never read or overwrite another plugin's store.

## Development

```sh
npm ci
npm run typecheck
npm test
npm run build
npm run check:claude-build
npm run validate:claude
npm run test:claude
```

MIT licensed. Runs locally without external services, model calls, or access to your project files.
