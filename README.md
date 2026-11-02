# Breathe

![Breathe's lavender pixel wave guiding a breathing cycle](assets/breathe-demo.gif)

An animated pixel wave that guides your breathing while your agent works.

Choose from five colors and breathing presets, or set your own rhythm. The wave disappears when your agent finishes or needs input.

A standalone plugin for **BB** and **Claude Code**, with separate settings for each host.

Inspired by [Mindful Claude](https://github.com/halluton/Mindful-Claude) by [halluton](https://github.com/halluton).

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
