# Implementation Plan — Monthly Money Plan → Webpage

## Goal
Turn the `Reimagine_Finances` budget spreadsheet into a self-contained,
interactive webpage that mirrors the workbook: editable Planned/Actual amounts,
a live Budget Snapshot, the 50/20/10/10/10 target guide, and the instructions.

## Source data (parsed)
- **Monthly Money Plan** sheet: Budget Snapshot table + line items grouped by
  `Section` (INCOME, NEEDS, WANTS, SAVINGS, INVESTMENTS, CHARITY) → `Subheading`
  (Housing, Utilities, …) with Planned $, Actual $, Difference, % of Income.
- **Instructions** sheet: step-by-step guide text.
- **Lists** sheet: section → target % → meaning.

## Files to touch
- `[NEW] scripts/extract_budget.py` — parse the .xlsx into `data/budget.json`
  (sections → subheadings → items, snapshot, targets, instructions). One-time/
  repeatable build step.
- `[NEW] data/budget.json` — generated structured data the page consumes.
- `[NEW] index.html` — page shell (snapshot cards, target guide, budget tables,
  instructions panel).
- `[NEW] assets/styles.css` — styling (clean financial dashboard look).
- `[NEW] assets/app.js` — load JSON, render tables, recompute Difference /
  % of Income / snapshot totals / On Track–Review status live as user edits
  Planned & Actual; persist edits to localStorage.
- `[NEW] README.md` — how to rebuild data and open the page.

## Logical behavior
1. Load `data/budget.json`.
2. Render Budget Snapshot cards (Target %, Target $, Planned, Actual, Over/Under,
   Status) computed from line items, not hard-coded.
3. Render each Section as a collapsible table grouped by Subheading; Planned and
   Actual cells are editable `<input>`s.
4. On edit: recompute row Difference + % of income, category totals, snapshot,
   and status (Over/Under target → On Track / Review / Balanced). Save to
   localStorage. Reset button restores workbook defaults.
5. Instructions rendered in a side/expandable panel from the Instructions sheet.

## Tech choice
Vanilla HTML/CSS/JS, zero build step, no dependencies — opens directly in a
browser and is trivial to host as a static page. (Confirm if you'd prefer React/
a framework instead.)

## Verification
- Run `python3 scripts/extract_budget.py`, confirm `data/budget.json` totals
  match workbook (Total Income 10500, Needs 4155, snapshot balanced).
- Open `index.html`, edit a value, confirm snapshot + status recompute.

## Open question
Static vanilla page (recommended) vs. a framework? Proceeding with vanilla unless
you say otherwise.

---

# Phase 2 — Modernization, Charts, Export, Deploy (approved 2026-06-14)

## Goal
Modernize the interface to a polished "financial dashboard" look, add live
charts, CSV export, a favicon, and a GitHub Pages deploy workflow. Stay vanilla
HTML/CSS/JS — **zero dependencies, no build step** (SVG charts, not a chart lib,
so the page still works fully offline).

## Files to touch
- `[MODIFY] index.html` — favicon + meta (description, theme-color); restructure
  into a dashboard layout; add an Overview banner, a Charts section, and an
  "Export CSV" button in the toolbar.
- `[MODIFY] assets/styles.css` — modern token system (surfaces, elevation scale,
  radii), refined cards/tables, status pills, chart styles, hover/focus states,
  `prefers-reduced-motion`, tighter responsive rules.
- `[MODIFY] assets/app.js` — `renderCharts()` (SVG donut: allocation by section;
  SVG planned-vs-actual bars with a target tick), wired into the existing live
  recompute path; `exportCSV()` (Blob download of all line items + totals);
  Overview banner recompute.
- `[NEW] assets/favicon.svg` — on-brand scalable mark (navy/gold) from the logo.
- `[NEW] .github/workflows/deploy-pages.yml` — Actions deploy-pages (readable
  build status; owner sets Pages source = "GitHub Actions").

## Logical behavior (additions)
1. Donut: one arc per spending section sized by planned share; center = total
   allocated; interactive legend (value + % of income). `role="img"` + aria-label.
2. Bars: per spending section, Planned vs Actual horizontal bars with a target
   tick at `target% × income`; over-target bars flagged.
3. Charts re-render in the same spots `renderSnapshot()` already fires (edit,
   reset) so they stay live. Respect `prefers-reduced-motion` (no transitions).
4. Export CSV → `reimagine-budget[-month].csv`: Section, Subheading, Item,
   Planned, Actual, Difference, % Income, plus section + snapshot totals.

## Verification
- `node --check assets/app.js`; load via local server; edit a value → snapshot,
  charts, totals all update; Export CSV downloads correct numbers; favicon shows.
- Screenshot the running page (Claude Preview) at desktop + mobile widths.
