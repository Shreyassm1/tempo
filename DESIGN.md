---
name: Tempo
description: A personal ticket scheduler with a quiet Steel Ball Run homage.
---

# Tempo design

Minimal task UI first; the Steel Ball Run references stay small and never rename anything.

## Colour

Stock Tailwind scales are remapped in `tailwind.config.js`, so ordinary classes pick up the theme:

- `slate`: day sand to leather ink (50 `#f8f0de` … 900 `#231812`); `white` is paper `#fffaf0`.
- `zinc` / `gray`: night parchment to violet (100 `#f3e9d6` … 950 `#120d1f`).
- `rose`: magenta, only for urgency and overdue (500 `#d23a84`).
- `indigo`: turquoise, for selection, drag targets and focus (500 `#1a9a91`).
- Amber marks scheduled work on the timeline; emerald marks done.

## Type

Inter for everything, including the "Tempo" wordmark. Dela Gothic One loads only the ゴ and ド glyphs, for the ゴゴゴ mark.

## Motifs (`src/components/Frontier.tsx`)

- **Backdrop:** plain paper (`#f4ecdb` day, `#15102a` night) with one hairline golden rectangle and spiral.
- **Steel ball:** the logo, Sync icon, in-progress status and mobile New-task button. Static, never spins.
- **Horseshoe:** to-do (solid) and backlog (dashed) status. Done is a flag.
- **ゴゴゴ:** small and faded, only next to overdue dates.
- **Tumbleweed:** empty board columns and empty timeline.
- **To be continued:** muted outline arrow closing the timeline.

## Rules

- Copy stays plain English. No character art, faces or official logos; all drawings are original.
- Motion only on the ゴゴゴ tremble and the tumbleweed, both off under `prefers-reduced-motion`.
- Light, dark and system themes all stay.
