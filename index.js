// =========================
// TREND CHART (based on your original)
// =========================

// Labels for December 1..31
const labels = Array.from({ length: 31 }, (_, i) => `Dec ${i + 1}`);

// Helper: generate daily values between 30M and 35M with a gentle trend + noise
function generateSeries({ start = 31_000_000, end = 34_000_000, noise = 350_000 }) {
  const n = 31;
  const series = [];
  for (let i = 0; i < n; i++) {
    const t = i / (n - 1);
    const base = start + (end - start) * t;
    const jitter = (Math.random() * 2 - 1) * noise; // +/- noise
    // Clamp strictly to [30M, 35M]
    const value = Math.min(35_000_000, Math.max(30_000_000, Math.round(base + jitter)));
    series.push(value);
  }
  return series;
}

// Format ticks/tooltips as "30.5M"
function formatMillions(v) {
  return (v / 1_000_000).toFixed(1) + "M";
}

const ctx = document.getElementById("trendChart");

// Create chart ONCE, then update later
const trendChart = new Chart(ctx, {
  type: "line",
  data: {
    labels,
    datasets: [
      {
        label: "Recharge",
        data: generateSeries({ start: 31_200_000, end: 34_700_000, noise: 300_000 }),
        borderColor: "#243985",
        backgroundColor: "rgba(29, 78, 216, 0.15)",
        tension: 0.35,
        borderWidth: 2,
        pointRadius: 0,
        pointHoverRadius: 0
      },
      {
        label: "Revenue",
        data: generateSeries({ start: 30_800_000, end: 34_200_000, noise: 280_000 }),
        borderColor: "#941851",
        backgroundColor: "rgba(220, 38, 38, 0.15)",
        tension: 0.35,
        borderWidth: 2,
        pointRadius: 0,
        pointHoverRadius: 0
      }
    ],
  },
  options: {
    responsive: true,
    interaction: { mode: "index", intersect: false },
    plugins: {
      tooltip: {
        callbacks: {
          label: (ctx) => `${ctx.dataset.label}: ${formatMillions(ctx.parsed.y)}`
        }
      },
      legend: {
        position: "bottom",
        labels: {
          boxWidth: 12,
          boxHeight: 12,
          padding: 16
        }
      },
    },
    scales: {
      y: {
        grid: { display: false },
        min: 30_000_000,
        max: 35_000_000,
        ticks: { callback: (value) => formatMillions(value) },
        title: { display: false, text: "USD" }
      },
      x: {
        grid: { display: false },
        ticks: { maxRotation: 0, autoSkip: true, maxTicksLimit: 10 }
      }
    },
    animation: { duration: 650 }
  },
});


// =========================
// RANDOM + FORMAT HELPERS
// =========================

function randInt(min, max) {
  min = Math.round(min);
  max = Math.round(max);
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function formatNumber(v) {
  return Math.round(v).toLocaleString();
}


// =========================
// FILTER HELPERS
// =========================

function getSelectedOperation() {
  return document.querySelector('input[name="operation"]:checked')?.value || "All";
}

// Reads dropdown label like "2026 Jan" from your HTML <select class="SelectMonth">
function getSelectedMonthParts() {
  const sel = document.querySelector(".SelectMonth");
  const txt = sel?.selectedOptions?.[0]?.textContent?.trim() || "";
  // expected: "2026 Jan"
  const parts = txt.split(/\s+/);
  const year = Number(parts[0]) || new Date().getFullYear();
  const monStr = (parts[1] || "Jan").slice(0, 3);

  const monthMap = { Jan:0, Feb:1, Mar:2, Apr:3, May:4, Jun:5, Jul:6, Aug:7, Sep:8, Oct:9, Nov:10, Dec:11 };
  const m = monthMap[monStr] ?? 0;

  return { year, monthIndex: m };
}

function getMonthLabels() {
  const { year, monthIndex } = getSelectedMonthParts();
  const cur = new Date(year, monthIndex, 1);
  const prev = new Date(year, monthIndex - 1, 1);
  const ly = new Date(year - 1, monthIndex, 1);

  const fmt = (dt) => dt.toLocaleString("en-US", { month: "short", year: "numeric" });
  return {
    prevLabel: fmt(prev),
    curLabel: fmt(cur),
    lyLabel: fmt(ly),
  };
}


// =========================
// KPI CONFIG (Top cards + panel logic)
// =========================

const KPI_CONFIG = {
  Revenue:   { min: 700_000_000, max: 1_400_000_000 },
  Recharge:  { min: 800_000_000, max: 1_600_000_000 },
  "Active 30": { min: 1_500_000, max: 3_500_000 },
  "Active 90": { min: 2_500_000, max: 5_500_000 }
};


// =========================
// KPI CARD ANIMATION
// =========================

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

function updateKPIs() {
  document.querySelectorAll(".KpiCard").forEach((card) => {
    const name = card.querySelector(".KpiName")?.innerText.trim();
    const valueEl = card.querySelector(".KpiValue");
    const cfg = KPI_CONFIG[name];
    if (!cfg) return;

    const value = randInt(cfg.min, cfg.max);
    animateKpiValue(valueEl, formatNumber(value));
  });
}


// =========================
// BAR SECTION (Active 1 / 30 / 90) – animate widths + values
// =========================

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

    bar.style.width = `${percent}%`;
  }, 120);
}

function updateBars() {
  const rows = document.querySelectorAll(".chart .row");
  if (!rows.length) return;

  const active1 = randInt(40_000_000, 70_000_000);
  const active30 = randInt(60_000_000, 95_000_000);
  const active90 = randInt(85_000_000, 130_000_000);

  const vals = [active1, active30, active90];
  const max = Math.max(...vals);

  rows.forEach((row, i) => {
    const v = vals[i];
    const pct = Math.max(5, Math.round((v / max) * 100));
    animateBarRow(row, v, pct);
  });
}


// =========================
// TREND CHART UPDATE
// =========================

function updateTrendChart() {
  const newRecharge = generateSeries({
    start: randInt(30_800_000, 31_800_000),
    end: randInt(34_000_000, 35_000_000),
    noise: randInt(200_000, 380_000)
  });

  const newRevenue = generateSeries({
    start: randInt(30_500_000, 31_500_000),
    end: randInt(33_500_000, 34_800_000),
    noise: randInt(180_000, 360_000)
  });

  trendChart.data.datasets[0].data = newRecharge;
  trendChart.data.datasets[1].data = newRevenue;
  trendChart.update();
}


// =========================
// PANEL: 3 PERIOD VALUES + MINI BAR CHART
// =========================

// create related values so prev/LY look realistic
function makeComparableValues(current) {
  const prev = Math.round(current * (0.92 + Math.random() * 0.12));  // ~ -8% to +4%
  const ly = Math.round(current * (0.85 + Math.random() * 0.30));    // ~ -15% to +15%
  return { prev, cur: current, ly };
}

function miniBarsHTML(items) {
  const max = Math.max(...items.map(x => x.value), 1);

  return `
    <div class="miniBars">
      ${items.map(({ label, value, isCurrent }) => {
        const pct = Math.max(6, Math.round((value / max) * 100)); // keep visible
        return `
          <div class="miniRow ${isCurrent ? "miniRowCurrent" : ""}">
            <div class="miniLbl">${label}</div>
            <div class="miniTrack">
              <div class="miniFill"
                   style="--w:${pct}%"
                   data-value="${formatNumber(value)}"></div>
            </div>
          </div>
        `;
      }).join("")}
    </div>
  `;
}

function ShowKPIsPanel(card) {
  const kpiName = card.querySelector(".KpiName").innerText.trim();
  const selectedOp = getSelectedOperation();

  const overlay = document.getElementById("kpiOverlay");
  const panel = document.getElementById("kpiPanel");

  const cfg = KPI_CONFIG[kpiName];
  if (!cfg) return;

  const { prevLabel, curLabel, lyLabel } = getMonthLabels();

  // Specific operation view: show totals for the 3 periods + breakdown for current
  if (selectedOp !== "All") {
    const afrCur = randInt(cfg.min * 0.55, cfg.max * 0.75);
    const afmCur = randInt(cfg.min * 0.20, cfg.max * 0.40);
    const totalCur = afrCur + afmCur;

    const v3 = makeComparableValues(totalCur);

    panel.innerHTML = `
      <button class="kpiCloseBtn" onclick="HideKPIsPanel()">✕</button>

      <h1>${kpiName} - ${selectedOp}</h1>

      <div class="kpiPeriodGrid">
        <div class="kpiPeriod">
          <div class="kpiPeriodTitle">${prevLabel}</div>
          <div class="kpiPeriodValue">${formatNumber(v3.prev)}</div>
        </div>

        <div class="kpiPeriod kpiPeriodMain">
          <div class="kpiPeriodTitle">${curLabel}</div>
          <div class="kpiPeriodValue">${formatNumber(v3.cur)}</div>
        </div>

        <div class="kpiPeriod">
          <div class="kpiPeriodTitle">${lyLabel}</div>
          <div class="kpiPeriodValue">${formatNumber(v3.ly)}</div>
        </div>
      </div>

      ${miniBarsHTML([
        { label: prevLabel, value: v3.prev },
        { label: curLabel, value: v3.cur, isCurrent: true },
        { label: lyLabel, value: v3.ly }
      ])}

      <div class="kpiBreakdown">
        <div class="kpiBreakdownTitle"><b>${curLabel} breakdown</b></div>
          <div class="kpiBreakdownRows">
            <div class="kpiBreakdownRow">
              <span class="kpiBreakdownLabel">Africell</span>
              <span class="kpiBreakdownValue">${formatNumber(afrCur)}</span>
            </div>
              
            <div class="kpiBreakdownRow">
              <span class="kpiBreakdownLabel">Afrimoney</span>
              <span class="kpiBreakdownValue">${formatNumber(afmCur)}</span>
            </div>
          </div>
      </div>
    `;

    overlay.style.display = "flex";

    // animate mini bars from 0 → target width
    requestAnimationFrame(() => {
      panel.querySelectorAll(".miniFill").forEach(el => el.classList.add("miniFillOn"));
    });

    return;
  }

  // All operations view: show table with 3 columns + totals mini chart
  const ops = ["DRC", "SL", "GM", "AO"];
  const rows = ops.map((op) => {
    const cur = randInt(cfg.min, cfg.max);
    const v3 = makeComparableValues(cur);
    return { op, ...v3 };
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
        ${rows.map(r => `
          <tr>
            <td><b>${r.op}</b></td>
            <td>${formatNumber(r.prev)}</td>
            <td class="colCurrent">${formatNumber(r.cur)}</td>
            <td>${formatNumber(r.ly)}</td>
          </tr>
        `).join("")}
      </tbody>
    </table>

    <div class="kpiTotalsTitle"><b>Totals</b></div>

    ${miniBarsHTML([
      { label: prevLabel, value: totals.prev },
      { label: curLabel, value: totals.cur, isCurrent: true },
      { label: lyLabel, value: totals.ly }
    ])}
  `;

  overlay.style.display = "flex";
  requestAnimationFrame(() => {
    panel.querySelectorAll(".miniFill").forEach(el => el.classList.add("miniFillOn"));
  });
}

function HideKPIsPanel() {
  const overlay = document.getElementById("kpiOverlay");
  if (overlay) overlay.style.display = "none";
}


// =========================
// ONE UPDATE TO RULE THEM ALL
// =========================

function updateAll() {
  updateKPIs();
  updateBars();
  updateTrendChart();
}


// =========================
// EVENTS (Month + Operation)
// =========================

document.querySelector(".SelectMonth")?.addEventListener("change", updateAll);
document.querySelectorAll('input[name="operation"]')
  .forEach(r => r.addEventListener("change", updateAll));


// =========================
// INITIAL LOAD
// =========================

updateAll();
