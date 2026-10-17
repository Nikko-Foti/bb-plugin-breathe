# Breathe for Claude Code

A moonlit lavender pixel wave follows inhale, hold and exhale while the agent works. Classic (4/7/8), Even (4/4/4) and Unwind (4/0/6) presets and custom durations are available. Inhale/exhale accept 1–30 whole seconds; hold accepts 0–30, with zero skipping hold.

Load this directory with `claude --plugin-dir ./claude` from the parent checkout, then run `/breathe`. Terminal draws half-block pixels; Desktop draws SVG. Settings include On/Off and Still/Animated plus breathing presets and durations. Claude stores its settings separately from BB.

This directory is self-contained and uses no network, shell, project-file access or model calls. Generated scene code comes from `npm run build:claude` in the parent package. MIT licensed.

Install from the parent checkout with `claude plugin install breathe --marketplace .`. The `/plugin install breathe --marketplace /absolute/path/to/bb-plugin-breathe` command also works in an interactive session.
