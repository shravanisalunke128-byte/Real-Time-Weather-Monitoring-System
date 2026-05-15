/* === CONFIGURATION === */
// IMPORTANT: Paste your ESP32 IP address below!
// Make sure you have 'http://' before the IP and '/data' at the end.
const ESP32_URL = 'http://172.22.25.112/data';

// How often to fetch new data (in milliseconds)
const UPDATE_INTERVAL = 2000; // 2 seconds

/* === DOM ELEMENTS === */
// Getting all the HTML elements we need to update
const tempEl = document.getElementById('temp-val');
const humEl = document.getElementById('hum-val');
const soilEl = document.getElementById('soil-val');
const rainEl = document.getElementById('rain-val');
const lightEl = document.getElementById('light-val');

const soilStatusEl = document.getElementById('soil-status');
const rainStatusEl = document.getElementById('rain-status');
const lightStatusEl = document.getElementById('light-status');

const connectionBadge = document.getElementById('connection-status');
const statusText = document.getElementById('status-text');

/* === CHART SETUP === */
// Global Chart styling to match dark theme
Chart.defaults.color = '#94a3b8';
Chart.defaults.borderColor = 'rgba(148, 163, 184, 0.1)';

const MAX_DATA_POINTS = 15; // How many points to show on the graph

// 1. Temperature & Humidity Chart
const weatherCtx = document.getElementById('weatherChart').getContext('2d');
const weatherChart = new Chart(weatherCtx, {
    type: 'line',
    data: {
        labels: [], // Time labels
        datasets: [
            {
                label: 'Temperature (°C)',
                borderColor: '#ef4444',
                backgroundColor: 'rgba(239, 68, 68, 0.1)',
                data: [],
                tension: 0.4, // Smooth curves
                fill: true
            },
            {
                label: 'Humidity (%)',
                borderColor: '#3b82f6',
                backgroundColor: 'rgba(59, 130, 246, 0.1)',
                data: [],
                tension: 0.4,
                fill: true
            }
        ]
    },
    options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
            legend: { position: 'bottom' }
        },
        scales: {
            y: { beginAtZero: true }
        }
    }
});

// 2. Sensor Overview Chart (Bar Chart)
const sensorCtx = document.getElementById('sensorChart').getContext('2d');
const sensorChart = new Chart(sensorCtx, {
    type: 'bar',
    data: {
        labels: ['Soil Moisture', 'Light (LDR)'],
        datasets: [{
            label: 'Sensor Value',
            backgroundColor: ['#10b981', '#f59e0b'],
            data: [0, 0],
            borderRadius: 6
        }]
    },
    options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
            legend: { display: false }
        },
        scales: {
            y: { beginAtZero: true }
        }
    }
});


/* === MAIN LOGIC === */

// Helper function to get current time for chart labels
function getCurrentTime() {
    const now = new Date();
    return now.getHours().toString().padStart(2, '0') + ':' +
        now.getMinutes().toString().padStart(2, '0') + ':' +
        now.getSeconds().toString().padStart(2, '0');
}

// Function to update all the UI elements with new data
function updateDashboard(data) {
    // 1. Update text values
    tempEl.innerText = data.temperature;
    humEl.innerText = data.humidity;
    soilEl.innerText = data.soil;
    rainEl.innerText = data.rain;
    lightEl.innerText = data.light;

    // 2. Update status indicators based on thresholds

    // Soil Status (Lower value usually means more moisture, depends on sensor calibration)
    if (data.soil > 600) { // Example threshold, adjust based on your sensor
        soilStatusEl.innerText = 'Dry';
        soilStatusEl.className = 'status-indicator status-dry';
    } else {
        soilStatusEl.innerText = 'Wet';
        soilStatusEl.className = 'status-indicator status-wet';
    }

    // Rain Status (0 often means rain detected on digital pins, or use analog threshold)
    if (data.rain < 1000) { // Assuming analog sensor where low = wet
        rainStatusEl.innerText = 'Rain Detected';
        rainStatusEl.className = 'status-indicator status-rain';
    } else {
        rainStatusEl.innerText = 'No Rain';
        rainStatusEl.className = 'status-indicator status-norain';
    }

    // Light Status (LDR)
    if (data.light > 500) { // Example threshold
        lightStatusEl.innerText = 'Day';
        lightStatusEl.className = 'status-indicator status-day';
    } else {
        lightStatusEl.innerText = 'Night';
        lightStatusEl.className = 'status-indicator status-night';
    }

    // 3. Update Charts
    const timeNow = getCurrentTime();

    // Update Line Chart (Weather)
    weatherChart.data.labels.push(timeNow);
    weatherChart.data.datasets[0].data.push(data.temperature);
    weatherChart.data.datasets[1].data.push(data.humidity);

    // Keep only the last MAX_DATA_POINTS points to avoid squishing
    if (weatherChart.data.labels.length > MAX_DATA_POINTS) {
        weatherChart.data.labels.shift();
        weatherChart.data.datasets[0].data.shift();
        weatherChart.data.datasets[1].data.shift();
    }
    weatherChart.update();

    // Update Bar Chart (Sensors)
    sensorChart.data.datasets[0].data = [data.soil, data.light];
    sensorChart.update();
}

// Generate dummy data if ESP32 is offline
function generateDummyData() {
    return {
        temperature: Math.floor(Math.random() * (35 - 20) + 20), // 20-35
        humidity: Math.floor(Math.random() * (80 - 40) + 40),    // 40-80
        soil: Math.floor(Math.random() * 1023),                 // 0-1023
        rain: Math.floor(Math.random() * 4095),                 // 0-4095
        light: Math.floor(Math.random() * 1023)                 // 0-1023
    };
}

// Function to fetch data from ESP32
async function fetchSensorData() {
    try {
        // Try to fetch data from ESP32
        const response = await fetch(ESP32_URL);

        if (!response.ok) {
            throw new Error('Network response was not ok');
        }

        const data = await response.json();

        // Update connection status UI
        connectionBadge.classList.remove('disconnected');
        connectionBadge.classList.add('connected');
        statusText.innerText = 'ESP32 Connected (Live Data)';

        // Update dashboard with real data
        updateDashboard(data);

    } catch (error) {
        console.log("Error fetching from ESP32, using dummy data.", error);

        // Update connection status UI
        connectionBadge.classList.remove('connected');
        connectionBadge.classList.add('disconnected');
        statusText.innerText = 'ESP32 Disconnected (Using Dummy Data)';

        // Update dashboard with dummy data for demonstration
        const dummyData = generateDummyData();
        updateDashboard(dummyData);
    }
}

// Initialize
// Fetch immediately on load, then set interval
fetchSensorData();
setInterval(fetchSensorData, UPDATE_INTERVAL);
