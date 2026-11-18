
from flask import Flask, request, jsonify
import joblib
import pandas as pd
import numpy as np

app = Flask(__name__)

# Load trained Fire Risk model
model_data = joblib.load("fire_risk_model.pkl")

fire_model = model_data["model"]
features = model_data["features"]
classes = model_data["classes"]


@app.route("/", methods=["GET"])
def home():
    return jsonify({
        "message": "FireGuard Fire Risk Prediction API is running!",
        "status": "Online"
    })


@app.route("/predict", methods=["POST"])
def predict():

    try:
        data = request.get_json()

        if not data:
            return jsonify({
                "error": "No JSON data received"
            }), 400

        # Read sensor values
        temperature = float(data["temperature_c"])
        humidity = float(data["humidity_percent"])
        mq4_voltage = float(data["mq4_voltage"])
        rs_kohm = float(data["rs_kohm"])

        values = [
            temperature,
            humidity,
            mq4_voltage,
            rs_kohm
        ]

        # Check for valid numeric values
        if not all(np.isfinite(v) for v in values):
            return jsonify({
                "error": "Sensor values must be finite"
            }), 400

        # Temperature validation
        if not (15 <= temperature <= 85):
            return jsonify({
                "error": "Temperature outside accepted demo range"
            }), 400

        # Humidity validation
        if not (0 <= humidity <= 100):
            return jsonify({
                "error": "Humidity must be between 0 and 100"
            }), 400

        # Original MQ-4 sensor voltage range
        if not (0 < mq4_voltage <= 5.0):
            return jsonify({
                "error": "MQ4 voltage must be above 0 and at most 5.0V"
            }), 400

        # MQ-4 resistance validation
        if not (0 < rs_kohm <= 100):
            return jsonify({
                "error": "Invalid MQ4 resistance"
            }), 400

        # Prepare model input
        input_data = pd.DataFrame(
            [values],
            columns=features
        )

        # -----------------------------------
        # TEMPERATURE THRESHOLD: 30 DEGREE C
        # -----------------------------------

        if temperature >= 30:

            prediction = "Fire_Risk_Low"

            scores = {
                str(label): (
                    100.0 if str(label) == "Fire_Risk_Low"
                    else 0.0
                )
                for label in classes
            }

        else:

            # Use Random Forest model normally
            prediction = fire_model.predict(input_data)[0]

            probabilities = fire_model.predict_proba(input_data)[0]

            scores = {
                str(label): round(float(probability) * 100, 2)
                for label, probability in zip(classes, probabilities)
            }

        # Return prediction response
        return jsonify({
            "prediction": str(prediction),
            "scores": scores,
            "temperature_c": temperature,
            "humidity_percent": humidity,
            "mq4_voltage": mq4_voltage,
            "rs_kohm": rs_kohm,
            "model": "FireGuard Random Forest"
        })

    except (KeyError, TypeError, ValueError) as error:
        return jsonify({
            "error": str(error)
        }), 400

    except Exception as error:
        return jsonify({
            "error": str(error)
        }), 500


if __name__ == "__main__":
    app.run(
        host="0.0.0.0",
        port=5000,
        debug=False
    )
