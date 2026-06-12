# Reimagine Finances — Monthly Money Plan

An interactive web version of the *Monthly Money Plan* budgeting workbook.
Enter your income and spending, and the page recomputes your Budget Snapshot,
category targets (50 / 20 / 10 / 10 / 10), differences, and on-track status live.

## Live site

Once GitHub Pages is enabled (see below), the page is served from the repo root:

```
https://<owner>.github.io/ReimagineFinance/
```

## Use it locally

It's a static page — no build step. Serve the folder and open it:

```bash
python3 -m http.server 8000
# then open http://localhost:8000
```

(Opening `index.html` directly via `file://` will not load `data/budget.json`
because of browser fetch restrictions — use a local server.)

Your edits are saved in your browser via `localStorage`. Use **Reset to
defaults** to restore the original workbook figures.

## Project layout

| Path | What it is |
| --- | --- |
| `index.html` | Page shell |
| `assets/styles.css` | Styling |
| `assets/app.js` | Render, live recompute, persistence |
| `data/budget.json` | Generated budget data the page consumes |
| `scripts/extract_budget.py` | Rebuilds `data/budget.json` from the `.xlsx` |

## Rebuild the data from the workbook

```bash
pip install openpyxl
python3 scripts/extract_budget.py path/to/workbook.xlsx
```

Omitting the path uses the bundled source workbook. The script prints the parsed
section count and total income (should be `10500`).

## Enable GitHub Pages (one-time)

Repo **Settings → Pages → Build and deployment**:

- **Source:** Deploy from a branch
- **Branch:** `main` · **Folder:** `/ (root)`

Save. Pages publishes within a minute or two at the URL above.
