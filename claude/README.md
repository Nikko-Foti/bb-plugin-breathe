# Breathe for Claude Code

A lavender pixel wave follows inhale, hold and exhale while the agent works. Classic (4/7/8), Even (4/4/4) and Unwind (4/0/6) presets and custom durations are available. Inhale/exhale accept 1–30 whole seconds; hold accepts 0–30, with zero skipping hold. BB supports pointer and keyboard ripples. Light mode uses an amethyst crest; dark mode uses moonlit lavender.

Load this directory with `claude --plugin-dir ./claude` from the parent checkout, then run `/breathe`. Terminal and Desktop are supported. Settings include On/Off and Still/Animated plus breathing presets and durations. Each host-managed store is independent of the other plugin. Disable While We Wait to avoid duplicate scenes.

This directory is self-contained and uses no network, shell, project-file access or model calls. Generated scene code comes from `npm run build:claude` in the parent package. MIT licensed.

Install from the parent checkout with `claude plugin install breathe --marketplace .`. The `/plugin install breathe --marketplace /absolute/path/to/bb-plugin-breathe` command also works in an interactive session.
