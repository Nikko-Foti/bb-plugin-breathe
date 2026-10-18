# Breathe

![Breathe's lavender pixel wave guiding a breathing cycle](assets/breathe-demo.gif)

A pixel wave in Lavender, Ocean, Sage, Rose, or Amber follows inhale, hold and exhale while the agent works. Classic (4/7/8), Even (4/4/4) and Unwind (4/0/6) presets and custom durations are available. Inhale/exhale accept 1–30 whole seconds; hold accepts 0–30, with zero skipping hold. BB adds pointer and keyboard ripples. Every color has its own light and dark appearance; Lavender is the default.

A standalone plugin for **BB** and **Claude Code**, with separate settings for each host.

Inspired by [Mindful Claude](https://github.com/halluton/Mindful-Claude) by [halluton](https://github.com/halluton), which turns the wait for Claude into a guided breathing exercise.

## A reminder to breathe

Slow, regular [breathing exercises](https://www.nhs.uk/mental-health/self-help/guides-tools-and-activities/breathing-exercises-for-stress/) can help ease stress and anxiety. Breathe brings the reminder back whenever your agent works, turning everyday waiting time into a cue to pause, breathe, and practise regularly.

## BB

Requires BB 0.46 or later with Plugin SDK 0.6.49 or later.

```sh
bb plugin install git:https://github.com/Nikko-Foti/bb-plugin-breathe.git@v0.1.1
```

Open **Breathe settings** from the composer label, the **+** menu, or plugin settings. Preview, Replay, Undo and Apply are available. The scene appears during active work, pauses offscreen, respects system reduced motion, and hides while waiting for input. Hide dismisses the current turn. An on-demand Breathe skill helps agents explain or configure it.

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
