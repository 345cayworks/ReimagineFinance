/* Monthly Money Plan — load budget.json, render, recompute live. */
"use strict";

const STORE_KEY = "reimagine-budget-v1";
const fmt = (n) =>
  n.toLocaleString(undefined, { style: "currency", currency: "USD", maximumFractionDigits: 0 });
const pct = (n) => (n * 100).toFixed(0) + "%";

// On-brand, distinguishable color per spending category (donut + bars).
const SECTION_COLOR = {
  NEEDS: "#52618c",
  WANTS: "#7d8cb5",
  SAVINGS: "#2f8f57",
  INVESTMENTS: "#c79a4a",
  CHARITY: "#9d3834",
};

let DATA = null; // working copy (may carry user edits)
let DEFAULTS = null; // pristine copy from budget.json

async function init() {
  const res = await fetch("data/budget.json");
  DEFAULTS = await res.json();
  DATA = loadSaved() || structuredClone(DEFAULTS);

  document.getElementById("page-title").textContent = DATA.title;
  document.getElementById("page-subtitle").textContent = DATA.subtitle;
  document.getElementById("target-guide").textContent = DATA.targetGuide;

  const month = document.getElementById("budget-month");
  month.value = DATA.month || "";
  month.addEventListener("input", () => {
    DATA.month = month.value;
    save();
  });

  document.getElementById("reset-btn").addEventListener("click", () => {
    if (!confirm("Reset all amounts to the workbook defaults?")) return;
    localStorage.removeItem(STORE_KEY);
    DATA = structuredClone(DEFAULTS);
    month.value = "";
    renderSections();
    refreshDashboard();
  });

  document.getElementById("export-btn").addEventListener("click", exportCSV);

  renderSections();
  refreshDashboard();
  renderInstructions();
}

/* Re-render every live, computed view (snapshot, overview banner, charts). */
function refreshDashboard() {
  renderOverview();
  renderSnapshot();
  renderCharts();
}

/* Spending sections only (everything except INCOME), in workbook order. */
function spendingSections() {
  return DATA.sections.filter((s) => s.key !== "INCOME");
}

/* ---- totals ---- */
function sectionTotals(sec) {
  let planned = 0,
    actual = 0;
  for (const sub of sec.subheadings)
    for (const it of sub.items) {
      planned += it.planned;
      actual += it.actual;
    }
  return { planned, actual };
}
function incomeTotal() {
  const inc = DATA.sections.find((s) => s.key === "INCOME");
  return sectionTotals(inc);
}

/* ---- snapshot ---- */
function statusFor(key, plannedTotal, income) {
  if (key === "TOTAL") {
    return income.planned === plannedTotal ? "Balanced" : "Review";
  }
  const sec = DATA.sections.find((s) => s.key === key);
  const target = (sec.target || 0) * income.planned;
  // Spending categories: at/under target is good; over target needs review.
  if (key === "SAVINGS" || key === "INVESTMENTS") {
    return plannedTotal >= target ? "On Track" : "Review"; // want to hit/exceed
  }
  return plannedTotal <= target * 1.02 ? "On Track" : "Review";
}

function renderSnapshot() {
  const income = incomeTotal();
  const host = document.getElementById("snapshot-cards");
  host.innerHTML = "";
  let allocated = 0;

  for (const sec of DATA.sections) {
    if (sec.key === "INCOME") continue;
    const { planned } = sectionTotals(sec);
    allocated += planned;
    const target$ = (sec.target || 0) * income.planned;
    const over = planned - target$;
    const status = statusFor(sec.key, planned, income);
    host.appendChild(
      card({
        title: sec.key,
        amount: planned,
        target: sec.target,
        target$: target$,
        over,
        share: income.planned ? planned / income.planned : 0,
        status,
      })
    );
  }

  // Total card
  const totalCard = card({
    title: "TOTAL",
    amount: allocated,
    target: 1,
    target$: income.planned,
    over: allocated - income.planned,
    share: income.planned ? allocated / income.planned : 0,
    status: statusFor("TOTAL", allocated, income),
    isTotal: true,
  });
  host.appendChild(totalCard);
}

function card(o) {
  const el = document.createElement("div");
  el.className = "card" + (o.isTotal ? " total" : "");
  const cls = o.status.toLowerCase().replace(/\s/g, "");
  const overTxt =
    o.over === 0 ? "On target" : (o.over > 0 ? "+" : "") + fmt(o.over);
  el.innerHTML = `
    <h3>${o.title}</h3>
    <div class="amount">${fmt(o.amount)}</div>
    <div class="bar"><span style="width:${Math.min(100, o.share * 100).toFixed(0)}%"></span></div>
    <div class="meta">
      <span>Target ${o.target != null ? pct(o.target) : "—"} · ${fmt(o.target$)}</span>
      <span class="status ${cls}">${o.status}</span>
    </div>
    <div class="meta"><span>Share ${pct(o.share)}</span><span>${overTxt}</span></div>`;
  return el;
}

/* ---- budget tables ---- */
function renderSections() {
  const host = document.getElementById("budget-sections");
  host.innerHTML = '<h2 class="section-title">Budget Detail</h2>';

  DATA.sections.forEach((sec) => {
    const block = document.createElement("details");
    block.className = "section-block";
    if (sec.key === "INCOME" || sec.key === "NEEDS") block.open = true;

    const tot = sectionTotals(sec);
    block.innerHTML = `
      <summary>
        <span class="chev">▶</span>
        <span>${sec.key}</span>
        <span class="sec-meaning">${sec.meaning || ""}</span>
        <span class="sec-total" data-sectotal="${sec.key}">${fmt(tot.planned)}</span>
      </summary>`;

    const table = document.createElement("table");
    table.innerHTML = `
      <thead><tr>
        <th class="name">Item</th><th>Planned</th><th>Actual</th>
        <th>Difference</th><th>% Income</th>
      </tr></thead>`;
    const tbody = document.createElement("tbody");

    sec.subheadings.forEach((sub) => {
      if (sub.name) {
        const r = document.createElement("tr");
        r.className = "subhead";
        r.innerHTML = `<td colspan="5">${sub.name}</td>`;
        tbody.appendChild(r);
      }
      sub.items.forEach((it) => tbody.appendChild(itemRow(sec, it)));
    });

    const trTot = document.createElement("tr");
    trTot.className = "section-total";
    trTot.innerHTML = `<td class="name">Total ${sec.key}</td>
      <td data-roltotal="planned-${sec.key}">${fmt(tot.planned)}</td>
      <td data-roltotal="actual-${sec.key}">${fmt(tot.actual)}</td>
      <td colspan="2"></td>`;
    tbody.appendChild(trTot);

    table.appendChild(tbody);
    block.appendChild(table);
    host.appendChild(block);
  });
}

function itemRow(sec, it) {
  const tr = document.createElement("tr");
  const income = incomeTotal().planned;
  tr.innerHTML = `
    <td class="name">${it.name}</td>
    <td><input type="number" step="1" min="0" value="${it.planned}" data-f="planned" /></td>
    <td><input type="number" step="1" min="0" value="${it.actual}" data-f="actual" /></td>
    <td class="diff"></td>
    <td class="share"></td>`;

  const refreshRow = () => {
    const diff = it.actual - it.planned;
    const dCell = tr.querySelector(".diff");
    dCell.textContent = (diff > 0 ? "+" : "") + fmt(diff);
    dCell.classList.toggle("pos", diff > 0);
    dCell.classList.toggle("neg", diff < 0);
    const inc = incomeTotal().planned;
    tr.querySelector(".share").textContent = inc ? pct(it.planned / inc) : "—";
  };

  tr.querySelectorAll("input").forEach((inp) => {
    inp.addEventListener("input", () => {
      it[inp.dataset.f] = parseFloat(inp.value) || 0;
      refreshRow();
      refreshSectionTotal(sec);
      refreshDashboard();
      save();
    });
  });
  refreshRow();
  return tr;
}

function refreshSectionTotal(sec) {
  const tot = sectionTotals(sec);
  document
    .querySelectorAll(`[data-sectotal="${sec.key}"]`)
    .forEach((e) => (e.textContent = fmt(tot.planned)));
  const p = document.querySelector(`[data-roltotal="planned-${sec.key}"]`);
  const a = document.querySelector(`[data-roltotal="actual-${sec.key}"]`);
  if (p) p.textContent = fmt(tot.planned);
  if (a) a.textContent = fmt(tot.actual);
  // Income changes shift every % column — refresh all share cells in place.
  if (sec.key === "INCOME") refreshAllShares();
}

function refreshAllShares() {
  const inc = incomeTotal().planned;
  const host = document.getElementById("budget-sections");
  DATA.sections.forEach((sec) => {
    const block = host.querySelectorAll(".section-block")[
      DATA.sections.indexOf(sec)
    ];
    if (!block) return;
    const rows = block.querySelectorAll("tbody tr:not(.subhead):not(.section-total)");
    let i = 0;
    sec.subheadings.forEach((sub) =>
      sub.items.forEach((it) => {
        const cell = rows[i++]?.querySelector(".share");
        if (cell) cell.textContent = inc ? pct(it.planned / inc) : "—";
      })
    );
  });
}

/* ---- overview banner ---- */
function renderOverview() {
  const host = document.getElementById("overview");
  if (!host) return;
  const income = incomeTotal().planned;
  let allocated = 0;
  for (const sec of spendingSections()) allocated += sectionTotals(sec).planned;
  const left = income - allocated;
  let state = "balanced",
    label = "Balanced",
    leftLabel = "Unallocated";
  if (left > 0) {
    state = "review";
    label = "Money left to allocate";
  } else if (left < 0) {
    state = "over";
    label = "Over income";
    leftLabel = "Over by";
  }
  host.innerHTML = `
    <div class="ov-main">
      <span class="ov-label">Monthly income</span>
      <span class="ov-income">${fmt(income)}</span>
    </div>
    <div class="ov-stat"><span class="ov-label">Allocated</span>
      <span class="ov-val">${fmt(allocated)}</span>
      <span class="ov-sub">${income ? pct(allocated / income) : "—"} of income</span></div>
    <div class="ov-stat"><span class="ov-label">${leftLabel}</span>
      <span class="ov-val">${fmt(Math.abs(left))}</span>
      <span class="ov-sub">${income ? pct(Math.abs(left) / income) : "—"} of income</span></div>
    <div class="ov-status status ${state}">${label}</div>`;
}

/* ---- charts (vanilla SVG / CSS, no dependencies) ---- */
function renderCharts() {
  const income = incomeTotal().planned;
  const rows = spendingSections().map((sec) => {
    const t = sectionTotals(sec);
    return {
      key: sec.key,
      color: SECTION_COLOR[sec.key] || "#52618c",
      planned: t.planned,
      actual: t.actual,
      target$: (sec.target || 0) * income,
    };
  });
  renderDonut(rows, income);
  renderBars(rows);
}

function renderDonut(rows, income) {
  const host = document.getElementById("chart-donut");
  const legend = document.getElementById("donut-legend");
  if (!host) return;
  const total = rows.reduce((s, r) => s + r.planned, 0);
  const R = 70,
    W = 26,
    C = 2 * Math.PI * R;

  let arcs = "",
    acc = 0;
  if (total > 0) {
    rows
      .filter((r) => r.planned > 0)
      .forEach((r) => {
        const share = r.planned / total;
        const len = share * C;
        const angle = acc * 360;
        arcs += `<circle cx="100" cy="100" r="${R}" fill="none" stroke="${r.color}"
          stroke-width="${W}" stroke-dasharray="${len.toFixed(2)} ${C.toFixed(2)}"
          transform="rotate(${(angle - 90).toFixed(2)} 100 100)"><title>${r.key}: ${fmt(
          r.planned
        )} (${pct(share)})</title></circle>`;
        acc += share;
      });
  } else {
    arcs = `<circle cx="100" cy="100" r="${R}" fill="none" stroke="#e3e6ef" stroke-width="${W}" />`;
  }

  const center =
    total > 0
      ? `<text x="100" y="94" class="donut-amt">${fmt(total)}</text>
         <text x="100" y="116" class="donut-cap">allocated</text>`
      : `<text x="100" y="105" class="donut-cap">No amounts yet</text>`;

  const top = [...rows].sort((a, b) => b.planned - a.planned)[0];
  const aria =
    total > 0
      ? `Allocation donut. ${fmt(total)} allocated. Largest: ${top.key} ${pct(
          top.planned / total
        )}.`
      : "Allocation donut, no amounts entered yet.";

  host.innerHTML = `<svg viewBox="0 0 200 200" role="img" aria-label="${aria}">
    <g>${arcs}</g>${center}</svg>`;

  legend.innerHTML = rows
    .map(
      (r) => `<li><span class="sw" style="background:${r.color}"></span>
        <span class="lg-name">${r.key}</span>
        <span class="lg-val">${fmt(r.planned)}</span>
        <span class="lg-pct">${income ? pct(r.planned / income) : "—"}</span></li>`
    )
    .join("");
}

function renderBars(rows) {
  const host = document.getElementById("chart-bars");
  if (!host) return;
  const max = Math.max(
    1,
    ...rows.map((r) => Math.max(r.planned, r.actual, r.target$))
  );
  const w = (v) => ((v / max) * 100).toFixed(1) + "%";
  host.innerHTML = rows
    .map((r) => {
      // Only flag the spending caps (Needs/Wants) when over target — exceeding
      // the Savings/Investments/Charity target is intentional, not a problem.
      const capped = r.key === "NEEDS" || r.key === "WANTS";
      const over = capped && r.target$ > 0 && r.planned > r.target$ * 1.02;
      const tick =
        r.target$ > 0
          ? `<span class="bar-target" style="left:${w(
              r.target$
            )}" title="Target ${fmt(r.target$)}"></span>`
          : "";
      return `<div class="bar-row${over ? " over" : ""}">
        <div class="bar-head"><span class="bar-name">${r.key}</span>
          <span class="bar-vals">P ${fmt(r.planned)} · A ${fmt(r.actual)}</span></div>
        <div class="bar-track">
          <div class="bar bar-planned" style="width:${w(r.planned)}"></div>
          <div class="bar bar-actual" style="width:${w(r.actual)}"></div>
          ${tick}
        </div></div>`;
    })
    .join("");
}

/* ---- CSV export ---- */
function csvCell(v) {
  const s = String(v);
  return /[",\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s;
}
function exportCSV() {
  const income = incomeTotal().planned;
  const sharePct = (n) => (income ? Math.round((n / income) * 100) + "%" : "");
  const lines = [["Section", "Subheading", "Item", "Planned", "Actual", "Difference", "% Income"]];

  DATA.sections.forEach((sec) => {
    sec.subheadings.forEach((sub) => {
      sub.items.forEach((it) => {
        lines.push([
          sec.key,
          sub.name || "",
          it.name,
          it.planned,
          it.actual,
          it.actual - it.planned,
          sharePct(it.planned),
        ]);
      });
    });
    const t = sectionTotals(sec);
    lines.push([sec.key, "", "Total " + sec.key, t.planned, t.actual, t.actual - t.planned, sharePct(t.planned)]);
  });

  let allocated = 0;
  for (const sec of spendingSections()) allocated += sectionTotals(sec).planned;
  lines.push([]);
  lines.push(["SUMMARY", "", "Total Income", income, "", "", ""]);
  lines.push(["SUMMARY", "", "Total Allocated", allocated, "", "", sharePct(allocated)]);
  lines.push(["SUMMARY", "", "Unallocated", income - allocated, "", "", sharePct(income - allocated)]);

  const csv = lines.map((row) => row.map(csvCell).join(",")).join("\r\n");
  const slug = (DATA.month || "").trim().toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
  const name = "reimagine-budget" + (slug ? "-" + slug : "") + ".csv";
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

/* ---- instructions ---- */
function renderInstructions() {
  const body = document.getElementById("instructions-body");
  body.innerHTML = "";
  DATA.instructions.forEach((line) => {
    const p = document.createElement("p");
    p.textContent = line;
    if (/^(Step \d|Purpose|Welcome|Remember|Final|Tips|Why)/i.test(line))
      p.className = "head";
    body.appendChild(p);
  });
}

/* ---- persistence ---- */
function save() {
  localStorage.setItem(STORE_KEY, JSON.stringify(DATA));
}
function loadSaved() {
  try {
    const raw = localStorage.getItem(STORE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

init();
