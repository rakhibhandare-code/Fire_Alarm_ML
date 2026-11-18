# 🔥 FireGuard – IoT-Based Fire Risk Monitoring System

An experimental IoT-based fire-risk monitoring system that combines ESP32, environmental sensors, Machine Learning, and a web dashboard to monitor sensor conditions and classify fire-risk levels.

## 📌 Project Overview

FireGuard collects environmental data using DHT22 and MQ-4 sensors connected to an ESP32. The collected readings are sent to an ASP.NET Core backend, which communicates with a Python Flask API. A trained Random Forest Machine Learning model classifies the readings into four categories:

- Normal
- Fire Risk Low
- Fire Risk Medium
- Fire Risk High

The readings and predictions are stored in MySQL and displayed on a web dashboard.

## 🎯 Objectives

- Monitor temperature and humidity.
- Monitor combustible-gas sensor response.
- Classify environmental readings into fire-risk categories using Machine Learning.
- Provide a web dashboard for monitoring readings and predictions.
- Generate a local buzzer alert when temperature reaches the configured threshold.

## 🛠️ Technologies Used

**Hardware**
- ESP32-WROOM-DA
- DHT22 Temperature and Humidity Sensor
- MQ-4 Gas Sensor
- Buzzer

**Software**
- Python
- Flask
- Scikit-learn
- Random Forest Classifier
- ASP.NET Core Web API
- MySQL
- HTML, CSS and JavaScript
- Chart.js
- Arduino IDE
- Jupyter Notebook

## 🏗️ System Architecture

```text
DHT22 + MQ-4 Sensors
        |
        v
      ESP32
        |
        | Wi-Fi / HTTP POST (JSON)
        v
  ASP.NET Core Backend
        |
        v
    Python Flask API
        |
        v
  Random Forest Model
        |
        v
   Risk Classification
        |
        v
     MySQL Database
        |
        v
    Web Dashboard
```

## 🔄 Project Workflow

1. DHT22 measures temperature and humidity.
2. MQ-4 measures the gas sensor response.
3. ESP32 processes sensor readings and creates a JSON payload.
4. ESP32 sends the readings to the ASP.NET Core API through Wi-Fi.
5. ASP.NET Core validates the data and forwards it to the Flask API.
6. The Random Forest model classifies the readings.
7. The backend stores readings and predictions in MySQL.
8. The dashboard displays readings, risk categories, alerts, charts and history.

The ESP32 also controls the buzzer locally based on the configured temperature threshold of 30°C.

## 🤖 Machine Learning Model

The project uses a Random Forest Classifier.

**Input features:**
- Temperature
- Humidity
- MQ-4 sensor voltage
- Sensor resistance (Rs)

**Output classes:**
- Normal
- Fire_Risk_Low
- Fire_Risk_Medium
- Fire_Risk_High

The model was trained using a synthetic dataset containing 6,000 records.

The notebook reported 89.92% test accuracy on its synthetic test dataset. This is not a measure of real-world fire-detection accuracy.

## 📂 Main Project Files

| File | Description |
|---|---|
| `Program.cs` | ASP.NET Core backend |
| `ml_api.py` | Flask prediction API |
| `fire_alarm.ipynb` | ML model training notebook |
| `fire_risk_synthetic_dataset.csv` | Synthetic training dataset |
| `fire_risk_model.pkl` | Saved Random Forest model |
| `index.html` | Dashboard structure |
| `style.css` | Dashboard styling |
| `script.js` | Dashboard functionality |
| `appsettings.json` | Backend configuration |

## ⚙️ How to Run the Project

### 1. Start the Python ML API

Install the required Python packages:

```bash
pip install flask pandas numpy scikit-learn joblib
```

Start the Flask server:

```bash
python ml_api.py
```

The API runs on port `5000` by default.

### 2. Start the ASP.NET Core Backend

Open the backend project folder:

```bash
cd FireAlarm.Api
```

Run:

```bash
dotnet restore
dotnet run --urls "http://0.0.0.0:5199"
```

Make sure MySQL is running and the database connection is configured correctly.

### 3. Connect the ESP32

- Connect DHT22, MQ-4 and buzzer to their configured ESP32 pins.
- Configure your Wi-Fi credentials.
- Configure the backend IP address and port in the ESP32 firmware.
- Upload the firmware to ESP32.

### 4. Open the Dashboard

Open the backend dashboard URL:

```text
http://localhost:5199/
```

The dashboard displays the latest sensor readings and predictions.

## ⚠️ Limitations

- The Machine Learning model uses synthetic demonstration data.
- MQ-4 primarily responds to methane and other combustible gases; it is not a dedicated smoke or flame detector.
- Methane concentration values are approximate and require proper calibration.
- This project is an experimental prototype and is not a certified fire-safety system.

## 🚀 Future Scope

- Train the model using real-world sensor datasets.
- Improve sensor calibration and prediction reliability.
- Add mobile notifications.
- Integrate additional smoke and flame sensors.
- Improve the dashboard with more monitoring features.


---

**FireGuard – Smart Monitoring Through IoT and Machine Learning.**