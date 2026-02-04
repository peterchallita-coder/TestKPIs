// =========================
// DATA-DRIVEN DASHBOARD (data.json)
// =========================

let APP_DATA = null;
let trendChart = null;

// -------------------------
// Helpers
// -------------------------
function formatNumber(v) {
  const n = Number(v || 0);
  return Math.round(n).toLocaleString();
}

function getSelectedOperation() {
  return document.querySelector('input[name="operation"]:checked')?.value || "All";
}

function getSelectedMonthParts() {
  const el = document.querySelector(".SelectMonth");
  const val = (el?.value || "").trim(); // "YYYY-MM"
  const now = new Date();
  let year = now.getFullYear();
  let monthIndex = now.getMonth();

  const m = val.match(/^(\d{4})-(\d{2})$/);
  if (m) {
    const y = Number(m[1]);
    const mo = Number(m[2]);
    if (Number.isFinite(y) && Number.isFinite(mo) && mo >= 1 && mo <= 12) {
      year = y;
      monthIndex = mo - 1;
    }
  }
  return { year, monthIndex };
}

function monthKeyFromParts(year, monthIndex) {
  const mm = String(monthIndex + 1).padStart(2, "0");
  return `${year}-${mm}`;
}

function addMonths(year, monthIndex, delta) {
  const d = new Date(year, monthIndex + delta, 1);
  return { year: d.getFullYear(), monthIndex: d.getMonth() };
}

function getMonthLabels() {
  const { year, monthIndex } = getSelectedMonthParts();
  const fmt = (y, mi) =>
    new Date(y, mi, 1).toLocaleString("en-US", { month: "short", year: "numeric" });

  const prev = addMonths(year, monthIndex, -1);
  const ly = { year: year - 1, monthIndex };

  return {
    curLabel: fmt(year, monthIndex),
    prevLabel: fmt(prev.year, prev.monthIndex),
    lyLabel: fmt(ly.year, ly.monthIndex),
    curKey: monthKeyFromParts(year, monthIndex),
    prevKey: monthKeyFromParts(prev.year, prev.monthIndex),
    lyKey: monthKeyFromParts(ly.year, ly.monthIndex),
  };
}

// -------------------------
// KPI mapping (UI name -> fields)
// -------------------------
const DISPLAY_KPIS = [
  { ui: "Revenue", afr: "Revenue_USD", afm: "Revenue_USD", unit: "USD" },
  { ui: "Recharge", afr: "Recharge_USD", afm: "Recharge_USD", unit: "USD" },
  { ui: "Data Consumption", afr: "Data_Consumption_GB", afm: null, unit: "GB" },
  { ui: "Minute Of Use", afr: "Minute_of_Use_Min", afm: null, unit: "Min" },
  { ui: "Churn Subs", afr: "Churn_Subs", afm: "Churn_Subs", unit: "Subs" },
  { ui: "New Joining", afr: "New_Joining_Subs", afm: "New_Joining_Subs", unit: "Subs" },
  { ui: "Rgs 30", afr: "RGS_30_Subs", afm: "RGS_30_Subs", unit: "Subs" },
  { ui: "Active 30", afr: "Active_30_Subs", afm: "Active_30_Subs", unit: "Subs" },
  { ui: "Total Subs", afr: "Total_Subs", afm: "Total_Subs", unit: "Subs" },
];

const SUB_BARS = [
  { label: "Rgs 30", key: "RGS_30_Subs" },
  { label: "Active 30", key: "Active_30_Subs" },
  { label: "Total Subs", key: "Total_Subs" },
];

// -------------------------
// Monthly aggregation (uses configuration in data.json)
// -------------------------
function getRule(company, field) {
  const cfg = APP_DATA?.configuration?.kpis?.[company]?.[field];
  return cfg?.monthly_aggregation || APP_DATA?.configuration?.monthly_aggregation_rules?.default_rule || "sum";
}

function isSameMonth(dateStr, monthKey) {
  return typeof dateStr === "string" && dateStr.startsWith(monthKey);
}

function filterRows({ monthKey, operation }) {
  if (!APP_DATA) return [];
  const rows = APP_DATA.data || [];
  return rows.filter((r) => {
    if (!isSameMonth(r.date, monthKey)) return false;
    if (operation === "All") return true;
    return r.operation === operation;
  });
}

// For rules = "last" and operation="All": last per operation, then sum snapshots.
function aggregateFieldForMonth({ monthKey, operation, company, field }) {
  if (!field) return 0;

  const rows = filterRows({ monthKey, operation });
  const rule = getRule(company, field);

  if (rule === "last") {
    if (operation === "All") {
      const ops = APP_DATA?.metadata?.operations || ["DRC", "SL", "GM", "AO"];
      let total = 0;
      ops.forEach((op) => {
        const opRows = rows.filter((r) => r.operation === op);
        if (!opRows.length) return;
        // last available day in month for this op
        opRows.sort((a, b) => a.date.localeCompare(b.date));
        const lastRow = opRows[opRows.length - 1];
        total += Number(lastRow?.[company]?.[field] || 0);
      });
      return total;
    }

    if (!rows.length) return 0;
    rows.sort((a, b) => a.date.localeCompare(b.date));
    const lastRow = rows[rows.length - 1];
    return Number(lastRow?.[company]?.[field] || 0);
  }

  // default: sum
  return rows.reduce((s, r) => s + Number(r?.[company]?.[field] || 0), 0);
}

function aggregateKpiForMonth({ monthKey, operation, kpiMap }) {
  const afr = aggregateFieldForMonth({ monthKey, operation, company: "Africell", field: kpiMap.afr });
  const afm = aggregateFieldForMonth({ monthKey, operation, company: "Afrimoney", field: kpiMap.afm });
  return { afr, afm, total: afr + afm };
}

// -------------------------
// Trend series (daily)
// -------------------------
function buildDailySeries({ monthKey, operation, kpiMap }) {
  // Returns [{date, value}] sorted by date, with per-day totals (Africell+Afrimoney where applicable)
  const rows = filterRows({ monthKey, operation });

  const byDate = new Map();
  rows.forEach((r) => {
    const d = r.date;
    const afr = Number(r?.Africell?.[kpiMap.afr] || 0);
    const afm = Number(kpiMap.afm ? (r?.Afrimoney?.[kpiMap.afm] || 0) : 0);
    byDate.set(d, (byDate.get(d) || 0) + afr + afm);
  });

  const items = Array.from(byDate.entries())
    .map(([date, value]) => ({ date, value }))
    .sort((a, b) => a.date.localeCompare(b.date));

  return items;
}

function prettyDayLabel(dateStr) {
  // "YYYY-MM-DD" -> "Feb 03"
  const [y, m, d] = dateStr.split("-").map(Number);
  const dt = new Date(y, (m || 1) - 1, d || 1);
  const mon = dt.toLocaleString("en-US", { month: "short" });
  return `${mon} ${String(d).padStart(2, "0")}`;
}

// -------------------------
// UI updates
// -------------------------
function animateKpiValue(valueEl, newText) {
  if (!valueEl) return;

  valueEl.classList.add("kpi-updating");
  setTimeout(() => {
    valueEl.innerText = newText;
    valueEl.classList.remove("kpi-updating");
    valueEl.classList.add("kpi-flash");
    setTimeout(() => valueEl.classList.remove("kpi-flash"), 200);
  }, 120);
}

function updateTopKpis() {
  const { curKey } = getMonthLabels();
  const op = getSelectedOperation();

  document.querySelectorAll(".KpiCard").forEach((card) => {
    const name = card.querySelector(".KpiName")?.innerText.trim();
    const valueEl = card.querySelector(".KpiValue");
    const kpiMap = DISPLAY_KPIS.find((x) => x.ui === name);
    if (!kpiMap) return;

    const v = aggregateKpiForMonth({ monthKey: curKey, operation: op, kpiMap });
    animateKpiValue(valueEl, formatNumber(v.total));
  });
}

// 1. Update the function to accept an optional 'targetWidth'
function adjustBarLabel(bar, label, targetWidth) {
  // Use the passed width if available; otherwise, fall back to offsetWidth
  const barWidth = targetWidth !== undefined ? targetWidth : bar.offsetWidth;
  const labelWidth = label.scrollWidth + 20;

  if (barWidth < labelWidth) {
    label.classList.add("value-outside");
  } else {
    label.classList.remove("value-outside");
  }
}

function animateBarRow(rowEl, newValue, percent) {
  const bar = rowEl.querySelector(".bar");
  const valueEl = rowEl.querySelector(".value");
  if (!bar || !valueEl) return;

  valueEl.classList.add("bar-updating");

  setTimeout(() => {
    valueEl.innerText = formatNumber(newValue);
    valueEl.classList.remove("bar-updating");
    valueEl.classList.add("bar-flash");
    setTimeout(() => valueEl.classList.remove("bar-flash"), 200);

    // Apply the style change
    bar.style.width = `${percent}%`;

    // 2. Calculate the pixel value of that percentage
    // We get the parent container's width to know what 'percent%' actually equals in px
    const parentWidth = bar.parentElement.offsetWidth;
    const newWidthPx = (percent / 100) * parentWidth;

    // 3. Pass that new pixel width directly
    adjustBarLabel(bar, valueEl, newWidthPx);
  }, 120);
}

function updateSubscriberBars() {
  const { curKey } = getMonthLabels();
  const op = getSelectedOperation();

  const values = SUB_BARS.map((b) => {
    const kpiMap = { afr: b.key, afm: b.key };
    const v = aggregateKpiForMonth({ monthKey: curKey, operation: op, kpiMap });
    return v.total;
  });

  const max = Math.max(...values, 1);

  const rows = document.querySelectorAll(".chart .row");
  rows.forEach((row, i) => {
    const v = values[i] || 0;
    const pct = Math.max(6, Math.round((v / max) * 100));
    animateBarRow(row, v, pct);
  });
}

function ensureTrendChart(labels, rechargeData, revenueData) {
  const ctx = document.getElementById("trendChart");
  if (!ctx) return;

  if (!trendChart) {
    trendChart = new Chart(ctx, {
      type: "line",
      data: {
        labels,
        datasets: [
          {
            label: "Recharge",
            data: rechargeData,
            borderColor: "#243985",
            backgroundColor: "rgba(29, 78, 216, 0.15)",
            tension: 0.35,
            borderWidth: 2,
            pointRadius: 0,
            pointHoverRadius: 0,
          },
          {
            label: "Revenue",
            data: revenueData,
            borderColor: "#941851",
            backgroundColor: "rgba(220, 38, 38, 0.15)",
            tension: 0.35,
            borderWidth: 2,
            pointRadius: 0,
            pointHoverRadius: 0,
          },
        ],
      },
      options: {
        responsive: true,
        interaction: { mode: "index", intersect: false },
        plugins: {
          legend: {
            position: "bottom",
            labels: { boxWidth: 12, boxHeight: 12, padding: 16 },
          },
        },
        scales: {
          y: { grid: { display: false } },
          x: { grid: { display: false }, ticks: { maxRotation: 0, autoSkip: true, maxTicksLimit: 10 } },
        },
        animation: { duration: 650 },
      },
    });
  } else {
    trendChart.data.labels = labels;
    trendChart.data.datasets[0].data = rechargeData;
    trendChart.data.datasets[1].data = revenueData;
    trendChart.update();
  }
}

function updateTrendChart() {
  const { curKey } = getMonthLabels();
  const op = getSelectedOperation();

  const rechargeMap = DISPLAY_KPIS.find((x) => x.ui === "Recharge");
  const revenueMap = DISPLAY_KPIS.find((x) => x.ui === "Revenue");

  const rechargeSeries = buildDailySeries({ monthKey: curKey, operation: op, kpiMap: rechargeMap });
  const revenueSeries = buildDailySeries({ monthKey: curKey, operation: op, kpiMap: revenueMap });

  // Align on the same date axis (union)
  const allDates = Array.from(
    new Set([...rechargeSeries.map((x) => x.date), ...revenueSeries.map((x) => x.date)])
  ).sort();

  const rechargeBy = new Map(rechargeSeries.map((x) => [x.date, x.value]));
  const revenueBy = new Map(revenueSeries.map((x) => [x.date, x.value]));

  const labels = allDates.map(prettyDayLabel);
  const rechargeData = allDates.map((d) => rechargeBy.get(d) || 0);
  const revenueData = allDates.map((d) => revenueBy.get(d) || 0);

  ensureTrendChart(labels, rechargeData, revenueData);
}

// -------------------------
// KPI Panel
// -------------------------
function miniBarsHTML(items) {
  const max = Math.max(...items.map((x) => x.value), 1);

  return `
    <div class="miniBars">
      ${items
        .map(({ label, value, isCurrent }) => {
          const pct = Math.max(6, Math.round((value / max) * 100));
          return `
            <div class="miniRow ${isCurrent ? "miniRowCurrent" : ""}">
              <div class="miniLbl">${label}</div>
              <div class="miniTrack">
                <div class="miniFill" style="--w:${pct}%" data-value="${formatNumber(value)}"></div>
              </div>
            </div>
          `;
        })
        .join("")}
    </div>
  `;
}

/**
 * Adjust mini bar value placement (inside vs outside) based on available pixel width.
 * Mirrors the logic of adjustBarLabel used for the main subscriber bars.
 */
function adjustMiniBarLabel(miniFillEl) {
  if (!miniFillEl) return;

  // Measure the value text width by temporarily reading the ::after content via dataset + a hidden span
  const valueText = miniFillEl.getAttribute("data-value") || "";
  const measurer = document.createElement("span");
  measurer.style.position = "absolute";
  measurer.style.visibility = "hidden";
  measurer.style.whiteSpace = "nowrap";
  measurer.style.fontWeight = "700";
  measurer.style.fontSize = "1.05rem";
  measurer.textContent = valueText;
  document.body.appendChild(measurer);

  const valueWidth = measurer.getBoundingClientRect().width;
  document.body.removeChild(measurer);

  const barWidth = miniFillEl.offsetWidth;

  // +20px padding similar to main bars
  if (barWidth < valueWidth + 20) {
    miniFillEl.classList.add("mini-outside");
  } else {
    miniFillEl.classList.remove("mini-outside");
  }
}

function ShowKPIsPanel(card) {
  if (!APP_DATA) return;

  const kpiName = card.querySelector(".KpiName")?.innerText.trim();
  const kpiMap = DISPLAY_KPIS.find((x) => x.ui === kpiName);
  if (!kpiMap) return;

  const selectedOp = getSelectedOperation();
  const overlay = document.getElementById("kpiOverlay");
  const panel = document.getElementById("kpiPanel");

  const { prevLabel, curLabel, lyLabel, prevKey, curKey, lyKey } = getMonthLabels();

  // Specific operation view: totals + breakdown
  if (selectedOp !== "All") {
    const prev = aggregateKpiForMonth({ monthKey: prevKey, operation: selectedOp, kpiMap });
    const cur = aggregateKpiForMonth({ monthKey: curKey, operation: selectedOp, kpiMap });
    const ly = aggregateKpiForMonth({ monthKey: lyKey, operation: selectedOp, kpiMap });

    panel.innerHTML = `
      <button class="kpiCloseBtn" onclick="HideKPIsPanel()">✕</button>
      <h1>${kpiName} - ${selectedOp}</h1>

      <div class="kpiPeriodGrid">
        <div class="kpiPeriod">
          <div class="kpiPeriodTitle">${prevLabel}</div>
          <div class="kpiPeriodValue">${formatNumber(prev.total)}</div>
        </div>

        <div class="kpiPeriod kpiPeriodMain">
          <div class="kpiPeriodTitle">${curLabel}</div>
          <div class="kpiPeriodValue">${formatNumber(cur.total)}</div>
        </div>

        <div class="kpiPeriod">
          <div class="kpiPeriodTitle">${lyLabel}</div>
          <div class="kpiPeriodValue">${formatNumber(ly.total)}</div>
        </div>
      </div>

      ${miniBarsHTML([
        { label: prevLabel, value: prev.total },
        { label: curLabel, value: cur.total, isCurrent: true },
        { label: lyLabel, value: ly.total },
      ])}

      <div class="kpiBreakdown">
        <div class="kpiBreakdownTitle"><b>${curLabel} breakdown</b></div>
        <div class="kpiBreakdownRows">
          <div class="kpiBreakdownRow">
            <span class="kpiBreakdownLabel">Africell</span>
            <span class="kpiBreakdownValue">${formatNumber(cur.afr)}</span>
          </div>
          <div class="kpiBreakdownRow">
            <span class="kpiBreakdownLabel">Afrimoney</span>
            <span class="kpiBreakdownValue">${formatNumber(cur.afm)}</span>
          </div>
        </div>
      </div>
    `;

    overlay.style.display = "flex";
    requestAnimationFrame(() => {
      panel.querySelectorAll(".miniFill").forEach((el) => {
        el.classList.add("miniFillOn");
        // after width animation settles (0.65s in CSS), decide inside/outside
        setTimeout(() => adjustMiniBarLabel(el), 650);
      });
    });
    return;
  }

  // All operations view: per-op table for prev/cur/ly
  const ops = APP_DATA?.metadata?.operations || ["DRC", "SL", "GM", "AO"];
  const rows = ops.map((op) => {
    const prev = aggregateKpiForMonth({ monthKey: prevKey, operation: op, kpiMap }).total;
    const cur = aggregateKpiForMonth({ monthKey: curKey, operation: op, kpiMap }).total;
    const ly = aggregateKpiForMonth({ monthKey: lyKey, operation: op, kpiMap }).total;
    return { op, prev, cur, ly };
  });

  const totals = {
    prev: rows.reduce((s, r) => s + r.prev, 0),
    cur: rows.reduce((s, r) => s + r.cur, 0),
    ly: rows.reduce((s, r) => s + r.ly, 0),
  };

  panel.innerHTML = `
    <button class="kpiCloseBtn" onclick="HideKPIsPanel()">✕</button>
    <h1>${kpiName} - All</h1>

    <table class="kpi3colTable">
      <thead>
        <tr>
          <th>Op</th>
          <th>${prevLabel}</th>
          <th class="colCurrent">${curLabel}</th>
          <th>${lyLabel}</th>
        </tr>
      </thead>
      <tbody>
        ${rows
          .map(
            (r) => `
          <tr>
            <td><b>${r.op}</b></td>
            <td>${formatNumber(r.prev)}</td>
            <td class="colCurrent">${formatNumber(r.cur)}</td>
            <td>${formatNumber(r.ly)}</td>
          </tr>
        `
          )
          .join("")}
      </tbody>
    </table>

    <div class="kpiTotalsTitle"><b>Totals</b></div>

    ${miniBarsHTML([
      { label: prevLabel, value: totals.prev },
      { label: curLabel, value: totals.cur, isCurrent: true },
      { label: lyLabel, value: totals.ly },
    ])}
  `;

  overlay.style.display = "flex";
  requestAnimationFrame(() => {
    panel.querySelectorAll(".miniFill").forEach((el) => {
      el.classList.add("miniFillOn");
      setTimeout(() => adjustMiniBarLabel(el), 650);
    });
  });
}

function HideKPIsPanel() {
  const overlay = document.getElementById("kpiOverlay");
  if (overlay) overlay.style.display = "none";
}

// -------------------------
// Main update
// -------------------------
function updateAll() {
  if (!APP_DATA) return;
  updateTopKpis();
  updateSubscriberBars();
  updateTrendChart();
}

// -------------------------
// Load data + wire events
// -------------------------
async function initDashboard() {
  const res = await fetch("data.json", { cache: "no-store" });
  APP_DATA = await res.json();

  // Set default selected month to latest in metadata (end date)
  const end = APP_DATA?.metadata?.date_range?.end;
  if (end) {
    const el = document.querySelector(".SelectMonth");
    if (el && !String(el.value || "").match(/^\d{4}-\d{2}$/)) {
      el.value = String(end).slice(0, 7);
    } else if (el) {
      // keep current value, but clamp if outside range
      // (no-op for now)
    }
  }

  // Wire events
  document.querySelector(".SelectMonth")?.addEventListener("change", updateAll);
  document.querySelectorAll('input[name="operation"]').forEach((r) => r.addEventListener("change", updateAll));

  updateAll();
}

initDashboard();
