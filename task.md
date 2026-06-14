# Task Checklist — Budget Webpage

## Phase 1 (done)
- [x] `scripts/extract_budget.py` — parse .xlsx → `data/budget.json`
- [x] `data/budget.json` — generated data
- [x] `index.html` — page shell
- [x] `assets/styles.css` — styling
- [x] `assets/app.js` — render + live recompute + localStorage
- [x] `README.md` — usage / rebuild / Pages instructions
- [x] Verify: totals match workbook (income 10500, needs 4155, balanced)
- [x] Commit + push to main

## Phase 2 — Modernization (done)
- [x] `assets/favicon.svg` — on-brand mark
- [x] `index.html` — favicon + meta, dashboard layout, Overview banner, Charts section, Export CSV button
- [x] `assets/styles.css` — modern tokens, refined cards/tables, chart + banner styles, reduced-motion
- [x] `assets/app.js` — renderCharts() (donut + bars), exportCSV(), Overview banner, wire into live recompute
- [x] `.github/workflows/deploy-pages.yml` — Actions deploy-pages
- [x] Verify: node --check, live edit updates charts/snapshot, CSV correct, desktop + mobile screenshots
- [x] Commit + push to main
