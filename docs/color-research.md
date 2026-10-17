# Breathe: five color palettes

Researched and implemented October 17, 2026.

Breathe now offers **Lavender, Ocean, Sage, Rose, and Amber**. Lavender remains the default, preserving the familiar wave. These are five complete palettes: wave bands, halo, floating dot, shimmer, sparks, ripples, phase label, and settings accents. BB adapts them to the host's light or dark appearance; Claude's SVG and terminal rendering retain their existing dark scene backdrop.

## What the evidence supports

### Preference is personal, and associations matter

Palmer and Schloss's ecological-valence study found support for preferences being related to the pleasantness of objects people associate with a color, including clear skies and water. This supports considering natural associations when choosing alternatives. It does **not** establish that a blue UI causes relaxation or that every user prefers blue. We use Ocean as a recognizable cool option and let users choose. [Original study, PNAS (2010)](https://doi.org/10.1073/pnas.0906172107).

Jonauskaite and colleagues tested color–emotion associations in 4,598 participants across 30 nations and 22 native languages. They found substantial shared patterns, with additional variation associated with linguistic and geographic proximity. The practical implication is to offer variety and avoid universal claims about what a color means. Their study concerns associations, not the therapeutic effect of a breathing animation. [Original study, Psychological Science (2020)](https://www.psychologicalscience.org/journals/psychological-science/0956797620948810/).

### Saturation and brightness matter alongside hue

Wilms and Oberfeld independently varied hue, saturation, and brightness with 62 participants viewing colors on an LED display. More saturated and brighter colors were associated with greater arousal; interactions among the three dimensions also mattered. This suggests avoiding the simplistic rule that any blue is quiet and any red is intense. Our design inference is to use moderate chroma, limit bright highlights to small pixels, and maintain a soft progression through each wave. This particular interface and these hex values were not tested in that study. [Original paper, Psychological Research (2018)](https://www.staff.uni-mainz.de/oberfeld/downloads/Wilms-Oberfeld2018_Article_ColorAndEmotionEffectsOfHueSat.pdf).

Elliot's review describes methodological problems in color research and cautions against premature generalization to real applications. We therefore describe the choices visually—cool blue, muted green, dusty pink, warm gold—and make no claim that a specific palette improves sleep, reduces anxiety, or produces a physiological effect. [Research review, Frontiers in Psychology (2015)](https://www.frontiersin.org/journals/psychology/articles/10.3389/fpsyg.2015.00368/full).

## Design references and decisions

Apple's Dark Mode guidance calls for adapting colors to appearance and checking contrast, rather than assuming the light appearance can simply be inverted. Breathe's dark palettes have a subdued base with a luminous crest; the light palettes use a deeper colored crest and lighter base. These are separately authored ramps. [Apple Human Interface Guidelines](https://developer.apple.com/design/human-interface-guidelines/dark-mode).

Radix's color system separates backgrounds, borders, solid fills, and text by purpose. Its palette-composition guide also recommends neutral surfaces when many accent colors coexist. Breathe follows those principles: the host's neutral background stays in place, swatches show the actual palettes, and the selected color supplies only the relevant accents. We did not copy a Radix scale or inherit its accessibility guarantees. [Radix scale usage](https://www.radix-ui.com/colors/docs/palette-composition/understanding-the-scale), [palette composition](https://www.radix-ui.com/colors/docs/palette-composition/composing-a-palette).

The new ramps were balanced using OKLCH before conversion to ordinary sRGB hex values. A shared lightness structure makes switching color less likely to cause a conspicuous brightness jump. The W3C defines Oklab/OKLCH as perceptual color spaces; final appearance still needs visual inspection on the real surface. sRGB tokens also work in the shared software renderer and terminal output, avoiding a browser-only color dependency. [W3C CSS Color 4, Oklab and OKLCH](https://www.w3.org/TR/css-color-4/#ok-lab).

W3C's use-of-color guidance requires visible alternatives when color conveys information. Each option therefore has a written name, a selected checkmark, and a native radio state in BB. Keyboard focus is visible. Claude offers named buttons with a checkmark on the current choice. Phase instructions remain written text. [WCAG use of color](https://www.w3.org/WAI/WCAG22/Understanding/use-of-color.html).

The contrast checks target at least 4.5:1 for phase text and 3:1 for the crest on representative light and dark surfaces. These are focused checks, not a claim of complete WCAG conformance. The faint baseline, halo, and sparks are decorative; they do not carry unique instructions. Arbitrary custom host themes may produce different contrast. [WCAG text contrast](https://www.w3.org/WAI/WCAG22/Understanding/contrast-minimum.html), [non-text contrast](https://www.w3.org/WAI/WCAG22/understanding/non-text-contrast.html).

## The five choices

The names and precise colors below are design judgments informed by the sources above; no source ranks these five as scientifically best.

| Palette | Visual intent | Dark wave, base → crest | Light wave, base → crest |
| --- | --- | --- | --- |
| Lavender | Familiar moonlit purple; preserves the original wave | `#292538` `#4D446E` `#9281BF` `#D2C6ED` | `#B6A1CC` `#A481C6` `#8352B3` `#633592` |
| Ocean | Airy, cool blue with a little cyan | `#1D2B34` `#294C60` `#5D94B3` `#AAD1E8` | `#91B4C9` `#6097B7` `#29749A` `#134E6A` |
| Sage | Muted botanical green; less vivid than mint or emerald | `#202C22` `#394E3D` `#75967B` `#BAD2BE` | `#9FB5A2` `#78997E` `#4E7757` `#315038` |
| Rose | Dusty pink, giving a soft warm alternative | `#342426` `#623B42` `#B77883` `#ECBCC3` | `#CCA1A8` `#BA7B86` `#9C5161` `#6B343F` |
| Amber | Warm honey and sand, without a bright yellow field | `#30271B` `#584426` `#A78657` `#DFC6A5` | `#C0AA8C` `#AA895A` `#8B6324` `#5F4110` |

Lavender keeps the existing brand recognizable. Ocean and Sage cover distinct cool families. Rose and Amber provide warm choices with distinct pink and golden hues. Five similarly pale blues would offer less meaningful variety. Neon green, intense red, and rainbow gradients were excluded as aesthetic choices for a small ambient animation; this is not a medical judgment about those colors.

## Behavior and verification

Picking a color changes only the settings preview until Apply. Undo or closing discards the draft. Applying a palette preserves timing and enablement. The live wave repaints without restarting its breathing clock or clearing an active ripple. Existing settings without a palette load Lavender. Unknown persisted palette values also fall back to Lavender; the BB save boundary rejects invalid values.

The shared palette table is used by BB's Canvas renderer and Claude's SVG/terminal adapter. Automated checks cover migration, strict saves, persistence, draft isolation, concurrent settings updates, all five distinct outputs, Still mode, timing continuity, and contrast. Visual inspection covers the rendered wave and controls in both appearances and at narrow settings widths. See `color-validation.md` for the completed verification record and its limits.
