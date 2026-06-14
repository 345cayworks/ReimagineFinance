# Handoff — Reimagine Finances Budget Webpage

## What this is
An interactive web version of the *Reimagine Finances — Monthly Money Plan*
budgeting workbook. Static site (vanilla HTML/CSS/JS, no build step) that renders
a live Budget Snapshot, editable Planned/Actual tables, the 50/20/10/10/10
target guide, and the workbook instructions. User edits persist to localStorage.

## Repo / branch / PR
- Repo: `345cayworks/reimaginefinance`
- Working branch: `main` (all work landed here at the user's direction)
- Open PR: **#1** — https://github.com/345cayworks/ReimagineFinance/pull/1
  (pushing more commits to `main` updates it)
- Latest commit: `09b2d0d` (logo rebrand)

## Current state — DONE
- `scripts/extract_budget.py` parses the source `.xlsx` → `data/budget.json`
  (sections → subheadings → items, targets, instructions). Verified totals:
  income 10500, Needs 4155, Wants 2045, Savings 1000, Investments 2250,
  Charity 1050, balanced.
- `index.html` + `assets/{styles.css,app.js}` render snapshot cards, editable
  tables, live recompute of difference/% income/section totals/status, reset to
  defaults, instructions panel.
- Branding reworked to match the logo (extracted to `assets/logo.png`): navy
  `#1c2138/#323957`, steel-blue `#52618c`, brick-red `#9d3834`, gold `#c79a4a`,
  silver text; header shows logo + "Learn, Adapt and Prosper" tagline.
- `README.md` documents local use, data rebuild, and Pages setup.

## OUTSTANDING — needs the repo owner
1. **Enable GitHub Pages** (only the owner can; not exposed via API tools here):
   Settings → Pages → Deploy from a branch → `main` / `/ (root)`.
   Site will publish at https://345cayworks.github.io/reimaginefinance/
2. Liveness can't be verified from the agent container — its network policy
   allowlists hosts and blocks `github.io` (curl returns 403 regardless).
   Verify in a real browser, or add a GitHub Actions Pages workflow (gives a
   readable build status in the Actions tab).

## Possible next steps (not started)
- Favicon / tab icon from the logo mark.
- GitHub Actions `deploy-pages` workflow for a definitive deploy signal.
- Charts (category donut / planned-vs-actual bars).
- Export edited budget back to CSV/xlsx.

## Conventions / environment notes
- "Antigravity Protocol" skill is active: terse output, exact chunk edits, no
  full-file dumps, plan-then-execute for large tasks. Skill lives at
  `~/.claude/skills/antigravity-protocol/SKILL.md`.
- No headless browser in the container (can't screenshot). Pillow + openpyxl are
  pip-installed for parsing the workbook/logo.
- Source workbook path (container):
  `/root/.claude/uploads/fa24fb34-a65e-5a31-bed0-f45084d6fa8e/929e5ba7-Reimagine_Finances__Monthly_Spending_and_Mone_PlancBudget_share_v2.xlsx`
- Plan/checklist artifacts: `implementation_plan.md`, `task.md`.

## Verify quickly
```bash
python3 scripts/extract_budget.py     # expect income=10500
python3 -m http.server 8000           # open http://localhost:8000
node --check assets/app.js
```
