
const API_BASE = "";

let temperatureChart;
let methaneChart;
let humidityChart;
let voltageChart;
let riskChart;

let isRefreshing = false;

// Clear view hides notifications only; it does not delete MySQL records.
const hiddenAlertIds = new Set();

function updateDate() {
    document.getElementById("currentDate").textContent =
        new Date().toLocaleString();
}

updateDate();

// ==========================================
// CREATE SENSOR LINE CHARTS
// ==========================================

function createChart(canvasId, label, color, suffix) {
    return new Chart(document.getElementById(canvasId), {
        type: "line",
        data: {
            labels: [],
            datasets: [{
                label: label,
                data: [],
                borderColor: color,
                backgroundColor: color + "22",
                fill: true,
                tension: 0.35,
                pointRadius: 3,
                pointHoverRadius: 6
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: true,

            interaction: {
                intersect: false,
                mode: "index"
            },

            plugins: {
                legend: {
                    labels: {
                        color: "#ffffff"
                    }
                },

                tooltip: {
                    callbacks: {
                        label: function(context) {
                            return context.dataset.label + ": " +
                                context.parsed.y + suffix;
                        }
                    }
                }
            },

            scales: {
                x: {
                    ticks: {
                        color: "#aab9cd",
                        maxRotation: 45,
                        maxTicksLimit: 8
                    },
                    grid: {
                        color: "#304057"
                    }
                },

                y: {
                    ticks: {
                        color: "#aab9cd"
                    },
                    grid: {
                        color: "#304057"
                    }
                }
            }
        }
    });
}

// ==========================================
// INITIALIZE ALL CHARTS
// ==========================================

function initializeCharts() {

    temperatureChart = createChart(
        "temperatureChart",
        "Temperature",
        "#ff7043",
        " °C"
    );

    methaneChart = createChart(
        "methaneChart",
        "Methane (approx.)",
        "#38bdf8",
        " ppm"
    );

    humidityChart = createChart(
        "humidityChart",
        "Humidity",
        "#a78bfa",
        " %"
    );

    voltageChart = createChart(
        "voltageChart",
        "MQ-4 Voltage",
        "#27c783",
        " V"
    );

    // Fire-risk doughnut chart
    riskChart = new Chart(
        document.getElementById("riskChart"),
        {
            type: "doughnut",

            data: {
                labels: [
                    "Normal",
                    "Fire Risk Low",
                    "Fire Risk Medium",
                    "Fire Risk High"
                ],

                datasets: [{
                    data: [0, 0, 0, 0],

                    backgroundColor: [
                        "#27c783",
                        "#facc15",
                        "#fb923c",
                        "#ff4d4d"
                    ],

                    borderColor: "#1b293d",
                    borderWidth: 3
                }]
            },

            options: {
                responsive: true,
                maintainAspectRatio: true,

                plugins: {
                    legend: {
                        position: "bottom",
                        labels: {
                            color: "#ffffff",
                            padding: 15
                        }
                    }
                }
            }
        }
    );
}

// ==========================================
// CONNECTION STATUS
// ==========================================

function setConnectionStatus(online) {

    const status = document.getElementById("connectionStatus");
    const dot = document.getElementById("connectionDot");
    const database = document.getElementById("databaseStatus");

    if (online) {

        status.textContent = "API Connected";
        status.style.color = "#27c783";
        dot.style.background = "#27c783";

        database.textContent = "Connected";
        database.style.color = "#27c783";

    } else {

        status.textContent = "Connection Failed";
        status.style.color = "#ff7070";
        dot.style.background = "#ff7070";

        database.textContent = "Unavailable";
        database.style.color = "#ff7070";
    }
}

// ==========================================
// FIRE RISK CLASS DETAILS
// ==========================================

function getRiskDetails(prediction) {

    const value = String(prediction || "").toLowerCase();

    const riskMap = {

        normal: {
            label: "Normal",
            className: "risk-normal",
            icon: "🛡️"
        },

        fire_risk_low: {
            label: "Fire Risk Low",
            className: "risk-low",
            icon: "🟡"
        },

        fire_risk_medium: {
            label: "Fire Risk Medium",
            className: "risk-medium",
            icon: "🟠"
        },

        fire_risk_high: {
            label: "Fire Risk High",
            className: "risk-high",
            icon: "🚨"
        }
    };

    return riskMap[value] || {
        label: prediction || "Unknown",
        className: "",
        icon: "❔"
    };
}

// ==========================================
// UPDATE PREDICTION DISPLAY
// ==========================================

function updatePredictionStyle(prediction) {

    const element = document.getElementById("prediction");
    const icon = document.getElementById("predictionIcon");

    const details = getRiskDetails(prediction);

    element.textContent = details.label;
    element.className = details.className;

    icon.textContent = details.icon;
}

// ==========================================
// LOAD LATEST SENSOR READING
// ==========================================

async function loadLatestReading() {

    const response = await fetch(
        `${API_BASE}/api/sensor/latest`,
        { cache: "no-store" }
    );

    if (!response.ok) {
        throw new Error("Unable to load latest sensor reading.");
    }

    const data = await response.json();

    if (data.temperature_c === undefined) {

        document.getElementById("lastUpdated").textContent =
            "No data yet";

        document.getElementById("prediction").textContent =
            "Waiting for data...";

        return;
    }

    document.getElementById("temperature").textContent =
        Number(data.temperature_c).toFixed(1) + " °C";

    document.getElementById("humidity").textContent =
        Number(data.humidity_percent).toFixed(1) + " %";

    document.getElementById("methane").textContent =
        Number(data.ch4_ppm_approx).toFixed(1) + " ppm";

    document.getElementById("voltage").textContent =
        Number(data.mq4_voltage).toFixed(2) + " V";

    document.getElementById("resistance").textContent =
        Number(data.rs_kohm).toFixed(2) + " kΩ";

    document.getElementById("lastUpdated").textContent =
        new Date(data.created_at).toLocaleString();

    updatePredictionStyle(data.prediction);
}

// ==========================================
// ALERT INFORMATION
// ==========================================

function getAlertType(prediction) {

    const value = String(prediction || "").toLowerCase();

    const alertMap = {

        fire_risk_low: {
            title: "Low Fire Risk",
            icon: "🟡",
            badge: "badge-low",
            description: "The experimental model classified this reading as Fire Risk Low."
        },

        fire_risk_medium: {
            title: "Medium Fire Risk",
            icon: "🟠",
            badge: "badge-medium",
            description: "The experimental model classified this reading as Fire Risk Medium."
        },

        fire_risk_high: {
            title: "High Fire Risk",
            icon: "🚨",
            badge: "badge-high",
            description: "The experimental model classified this reading as Fire Risk High."
        }
    };

    return alertMap[value] || null;
}

// ==========================================
// UPDATE RISK COUNTS AND CHART
// ==========================================

function updateRiskSummary(records) {

    const counts = {
        Normal: 0,
        Fire_Risk_Low: 0,
        Fire_Risk_Medium: 0,
        Fire_Risk_High: 0
    };

    records.forEach(record => {

        const prediction = record.prediction;

        if (Object.prototype.hasOwnProperty.call(counts, prediction)) {
            counts[prediction]++;
        }
    });

    document.getElementById("normalCount").textContent =
        counts.Normal;

    document.getElementById("lowRiskCount").textContent =
        counts.Fire_Risk_Low;

    document.getElementById("mediumRiskCount").textContent =
        counts.Fire_Risk_Medium;

    document.getElementById("highRiskCount").textContent =
        counts.Fire_Risk_High;

    riskChart.data.datasets[0].data = [
        counts.Normal,
        counts.Fire_Risk_Low,
        counts.Fire_Risk_Medium,
        counts.Fire_Risk_High
    ];

    riskChart.update("none");

    const totalRiskPredictions =
        counts.Fire_Risk_Low +
        counts.Fire_Risk_Medium +
        counts.Fire_Risk_High;

    document.getElementById("alertCount").textContent =
        `${totalRiskPredictions} Risk Predictions`;
}

// ==========================================
// RENDER ALERT NOTIFICATIONS
// ==========================================

function renderAlerts(records) {

    const alertList = document.getElementById("alertList");

    updateRiskSummary(records);

    const alerts = records.filter(record =>
        getAlertType(record.prediction) !== null
    );

    const visibleAlerts = alerts
        .filter(record => !hiddenAlertIds.has(Number(record.id)))
        .slice(0, 20);

    if (visibleAlerts.length === 0) {

        alertList.innerHTML = "";

        const empty = document.createElement("p");
        empty.className = "empty-alert";

        empty.textContent = alerts.length === 0
            ? "No fire-risk predictions in the available history."
            : "No visible notifications. New readings will appear here.";

        alertList.appendChild(empty);
        return;
    }

    alertList.innerHTML = "";

    visibleAlerts.forEach(record => {

        const type = getAlertType(record.prediction);

        const item = document.createElement("div");
        item.className = "alert-item";

        // Needed for Clear View button
        item.dataset.recordId = record.id;

        const icon = document.createElement("div");
        icon.className = "alert-icon";
        icon.textContent = type.icon;

        const details = document.createElement("div");
        details.className = "alert-details";

        const title = document.createElement("h4");
        title.textContent = type.title;

        const description = document.createElement("p");
        description.textContent = type.description;

        const badge = document.createElement("span");
        badge.className = `alert-badge ${type.badge}`;
        badge.textContent = "Experimental ML Prediction";

        details.appendChild(title);
        details.appendChild(description);
        details.appendChild(badge);

        const time = document.createElement("div");
        time.className = "alert-time";

        time.textContent =
            new Date(record.created_at).toLocaleString();

        item.appendChild(icon);
        item.appendChild(details);
        item.appendChild(time);

        alertList.appendChild(item);
    });
}

// ==========================================
// CLEAR VISIBLE ALERTS
// ==========================================

document.getElementById("clearAlerts").addEventListener(
    "click",
    function() {

        const alertList = document.getElementById("alertList");

        alertList.querySelectorAll(".alert-item").forEach(item => {

            if (item.dataset.recordId) {
                hiddenAlertIds.add(Number(item.dataset.recordId));
            }
        });

        alertList.innerHTML = "";

        const message = document.createElement("p");
        message.className = "empty-alert";

        message.textContent =
            "Visible notifications cleared. MySQL records have not been deleted.";

        alertList.appendChild(message);
    }
);

// ==========================================
// LOAD SENSOR HISTORY
// ==========================================

async function loadHistory() {

    const response = await fetch(
        `${API_BASE}/api/sensor/history?limit=50`,
        { cache: "no-store" }
    );

    if (!response.ok) {
        throw new Error("Unable to load sensor history.");
    }

    const records = await response.json();

    if (!Array.isArray(records)) {
        throw new Error("Invalid history response.");
    }

    // UPDATE HISTORY TABLE

    const table = document.getElementById("historyTable");
    table.innerHTML = "";

    if (records.length === 0) {

        const row = document.createElement("tr");
        const cell = document.createElement("td");

        cell.colSpan = 6;
        cell.textContent = "No sensor readings found.";

        row.appendChild(cell);
        table.appendChild(row);

    } else {

        records.forEach(record => {

            const row = document.createElement("tr");

            const values = [
                record.id,
                Number(record.temperature_c).toFixed(1) + " °C",
                Number(record.humidity_percent).toFixed(1) + " %",
                Number(record.ch4_ppm_approx).toFixed(1) + " ppm",
                getRiskDetails(record.prediction).label,
                new Date(record.created_at).toLocaleString()
            ];

            values.forEach(value => {

                const cell = document.createElement("td");
                cell.textContent = value;

                row.appendChild(cell);
            });

            table.appendChild(row);
        });
    }

    // UPDATE ALERTS AND RISK CHART

    renderAlerts(records);

    // CHART DATA IN CHRONOLOGICAL ORDER

    const chronological = [...records].reverse();

    const labels = chronological.map(record =>
        new Date(record.created_at).toLocaleTimeString()
    );

    function updateChart(chart, field) {

        chart.data.labels = labels;

        chart.data.datasets[0].data =
            chronological.map(record => Number(record[field]));

        chart.update("none");
    }

    updateChart(temperatureChart, "temperature_c");
    updateChart(methaneChart, "ch4_ppm_approx");
    updateChart(humidityChart, "humidity_percent");
    updateChart(voltageChart, "mq4_voltage");
}

// ==========================================
// REFRESH DASHBOARD
// ==========================================

async function refreshDashboard() {

    if (isRefreshing) return;

    isRefreshing = true;

    try {

        await loadLatestReading();
        await loadHistory();

        setConnectionStatus(true);

    } catch (error) {

        console.error("Dashboard refresh error:", error);
        setConnectionStatus(false);

    } finally {

        isRefreshing = false;
    }
}

// ==========================================
// START DASHBOARD
// ==========================================

initializeCharts();

document.getElementById("alertList").innerHTML =
    '<p class="empty-alert">Loading notifications...</p>';

refreshDashboard();

// Refresh every 3 seconds
setInterval(refreshDashboard, 3000);
