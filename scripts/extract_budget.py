#!/usr/bin/env python3
"""Parse the Monthly Money Plan workbook into data/budget.json.

Re-runnable build step. Reads the source .xlsx and emits a structured JSON the
webpage consumes: sections -> subheadings -> items, category targets, and the
instructions text.

Usage:
    python3 scripts/extract_budget.py [path/to/workbook.xlsx]
"""
import json
import sys
from pathlib import Path

import openpyxl

DEFAULT_SRC = (
    "/root/.claude/uploads/fa24fb34-a65e-5a31-bed0-f45084d6fa8e/"
    "929e5ba7-Reimagine_Finances__Monthly_Spending_and_Mone_PlancBudget_share_v2.xlsx"
)

# Category targets (from the Lists sheet / 50-20-10-10-10 guide).
TARGETS = {
    "NEEDS": 0.50,
    "WANTS": 0.20,
    "SAVINGS": 0.10,
    "INVESTMENTS": 0.10,
    "CHARITY": 0.10,
}
MEANINGS = {
    "INCOME": "Money Coming In",
    "NEEDS": "Must-Pay Bills",
    "WANTS": "Lifestyle Choices",
    "SAVINGS": "Money Set Aside",
    "INVESTMENTS": "Money for Growth",
    "CHARITY": "Giving Back",
}
SECTION_ORDER = ["INCOME", "NEEDS", "WANTS", "SAVINGS", "INVESTMENTS", "CHARITY"]


def num(v):
    return float(v) if isinstance(v, (int, float)) else 0.0


def extract(src):
    wb = openpyxl.load_workbook(src, data_only=True)
    plan = wb["Monthly Money Plan "]

    # Columns on the line-item table (A..H):
    # Section | Subheading | Item | Planned $ | Actual $ | Difference | % | Notes
    sections = {}
    for row in plan.iter_rows(min_col=1, max_col=8, values_only=True):
        section, sub, item, planned, actual = (
            row[0],
            row[1],
            row[2],
            row[3],
            row[4],
        )
        if section not in SECTION_ORDER:
            continue
        if not item:  # subheading separator / group header row
            continue
        sec = sections.setdefault(
            section,
            {
                "key": section,
                "meaning": MEANINGS.get(section, ""),
                "target": TARGETS.get(section),
                "subheadings": {},
            },
        )
        grp = sec["subheadings"].setdefault(sub or "", [])
        grp.append(
            {
                "name": str(item).strip(),
                "planned": round(num(planned), 2),
                "actual": round(num(actual), 2),
            }
        )

    ordered = []
    for key in SECTION_ORDER:
        if key not in sections:
            continue
        sec = sections[key]
        sec["subheadings"] = [
            {"name": name, "items": items}
            for name, items in sec["subheadings"].items()
        ]
        ordered.append(sec)

    # Instructions sheet -> list of non-empty text lines (col B/C).
    instr_ws = wb["Instructions for Monthly Plan "]
    instructions = []
    for row in instr_ws.iter_rows(min_col=2, max_col=3, values_only=True):
        text = row[0]
        if text and str(text).strip():
            instructions.append(str(text).strip())

    return {
        "title": "Monthly Money Plan",
        "subtitle": "A simple monthly budget for income, needs, wants, "
        "savings, investments, and charity.",
        "targetGuide": "Needs 50% | Wants 20% | Savings 10% | "
        "Investments 10% | Charity 10%",
        "sections": ordered,
        "instructions": instructions,
    }


def main():
    src = sys.argv[1] if len(sys.argv) > 1 else DEFAULT_SRC
    data = extract(src)
    out = Path(__file__).resolve().parent.parent / "data" / "budget.json"
    out.parent.mkdir(parents=True, exist_ok=True)
    out.write_text(json.dumps(data, indent=2), encoding="utf-8")

    income = sum(
        i["planned"]
        for s in data["sections"]
        if s["key"] == "INCOME"
        for sub in s["subheadings"]
        for i in sub["items"]
    )
    print(f"Wrote {out} ({len(data['sections'])} sections, income={income:.0f})")


if __name__ == "__main__":
    main()
