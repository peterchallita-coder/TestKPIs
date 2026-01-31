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

// Example data (you can replace these arrays with your real daily numbers)
const recharge = generateSeries({ start: 31_200_000, end: 34_700_000, noise: 300_000 });
const revenue = generateSeries({ start: 30_800_000, end: 34_200_000, noise: 280_000 });

// Format ticks/tooltips as "30.5M"
function formatMillions(v) {
    return (v / 1_000_000).toFixed(1) + "M";
}

const ctx = document.getElementById("trendChart");

new Chart(ctx, {
    type: "line",
    data: {
        labels,
        datasets: [
            {
                label: "Recharge",
                data: recharge,
                borderColor: "#243985",
                backgroundColor: "rgba(29, 78, 216, 0.15)",
                tension: 0.35,
                borderWidth: 2,
                pointRadius: 0,
                pointHoverRadius: 0
            },
            {
                label: "Revenue",
                data: revenue,
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
            legend: { position: "bottom",
    labels: {
      boxWidth: 12,      // small color indicator
      boxHeight: 12,
      padding: 16
    } },
        },
        scales: {
            y: {
                grid: {
                    display: false
                },
                min: 30_000_000,
                max: 35_000_000,
                ticks: {
                    callback: (value) => formatMillions(value),
                },
                title: { display: false, text: "USD" }
            },
            x: {
                grid: {
                    display: false
                },
                ticks: { maxRotation: 0, autoSkip: true, maxTicksLimit: 10 }
            }
        }
    },
});