---
name: frontend-design
title: Frontend design
category: Build
description: Distinctive, polished user interfaces with a clear visual direction, real states and responsive layouts. Use for any new page, screen or redesign.
---
# Frontend design

Goal: an interface that looks designed on purpose, not like a template.

## 1. Decide the direction before code
- Read what exists first: the current CSS variables, fonts, components, spacing. If the project has a theme, extend it; never fight it.
- For a new look, write three lines in your head: the mood (calm, technical, playful, premium), one typeface pairing, one accent color with its role. Keep that decision for the whole job.
- Pick a type scale (for example 12, 14, 16, 20, 28, 40) and a spacing scale (4, 8, 12, 16, 24, 32, 48). Use only those values.

## 2. Layout
- Design the content first: real headings, real labels, real numbers. Never lorem ipsum.
- One primary action per view. Secondary actions are quieter (ghost or text buttons).
- Use a max content width (about 680px for reading, 1200px for dashboards). Align everything to a grid; consistent left edges matter more than decoration.
- Mobile first: check 375px, 768px and 1280px. No horizontal scroll, tap targets at least 40px.

## 3. Visual quality checklist
- Contrast: body text at least 4.5:1. Muted text is still readable.
- Hierarchy through size and weight, not through many colors. At most one accent plus neutrals plus status colors (success, warning, danger).
- Borders 1px with low contrast, radius consistent (pick one: 6, 8 or 12px). Shadows soft and rare.
- Icons from one set, one stroke width, aligned with text baselines.
- Numbers in tables use tabular figures and right alignment.
- For RTL languages (Persian, Arabic) set dir="rtl" on the container, use logical CSS (margin-inline-start, padding-inline-end) and a font that supports the script (Vazirmatn for Persian).

## 4. Every state, not only the happy one
For each component build: loading (skeleton, not a spinner on a blank page), empty (a sentence plus the action that fills it), error (what happened and what to do), disabled, hover, focus-visible (a visible ring for keyboard users), and long content (very long names, 0 items, 1000 items).

## 5. Motion
- Transitions 120 to 220ms, ease-out. Animate opacity and transform only.
- Respect prefers-reduced-motion.

## 6. Accessibility
- Real buttons and links, labels for every input, alt text for meaningful images, aria-live for toasts.
- Everything reachable with Tab, Escape closes dialogs, focus returns to the trigger.

## 7. Verify by looking
- Run the app, open the preview and take screenshots at desktop and mobile widths.
- Compare against the checklist above and fix what looks off: misaligned edges, cramped spacing, weak contrast, orphaned words in headings.
- Show the user the screenshot and say in one or two lines what direction you chose.
