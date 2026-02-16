"""
AcoustiLeak API Gateway
Main REST API service - handles sensors, readings, and proxies to other services.
"""

import os
from datetime import datetime, date
from decimal import Decimal

import pymysql
import pymysql.cursors
import requests
from flask import Flask, jsonify, request
from flask_cors import CORS

app = Flask(__name__)
CORS(app)

# Database connection config
DB_CONFIG = {
    "host": os.environ.get("DB_HOST", "sql-db-1.ccdgyuq2ejgs.us-east-1.rds.amazonaws.com"),
    "port": int(os.environ.get("DB_PORT", "3306")),
    "database": os.environ.get("DB_NAME", "acoustileak"),
    "user": os.environ.get("DB_USER", "admin"),
    "password": os.environ.get("DB_PASSWORD", "password"),
    "cursorclass": pymysql.cursors.DictCursor,
}

# Internal service URLs
AUDIO_PROCESSOR_URL = os.environ.get("AUDIO_PROCESSOR_URL", "http://audio-processor:5001")
ALERT_SERVICE_URL = os.environ.get("ALERT_SERVICE_URL", "http://alert-service:5002")


def get_db():
    """Get a database connection."""
    return pymysql.connect(**DB_CONFIG)


def serialize_row(row):
    """Convert a row dict so all values are JSON-serializable."""
    if row is None:
        return None
    out = {}
    for k, v in row.items():
        if isinstance(v, Decimal):
            out[k] = float(v)
        elif isinstance(v, (datetime, date)):
            out[k] = v.isoformat()
        else:
            out[k] = v
    return out


def serialize_rows(rows):
    return [serialize_row(r) for r in rows]


# ──────────────────────────────────────────────
#  Health check
# ──────────────────────────────────────────────
@app.route("/api/health", methods=["GET"])
def health():
    """Health check endpoint."""
    db_status = "connected"
    try:
        conn = get_db()
        conn.close()
    except Exception:
        db_status = "disconnected"

    return jsonify({
        "service": "api-gateway",
        "status": "running",
        "database": db_status,
        "timestamp": datetime.utcnow().isoformat(),
    })


# ──────────────────────────────────────────────
#  Sensors CRUD
# ──────────────────────────────────────────────
@app.route("/api/sensors", methods=["GET"])
def get_sensors():
    """List all sensors."""
    try:
        conn = get_db()
        cur = conn.cursor()
        cur.execute("SELECT * FROM sensors ORDER BY id")
        sensors = serialize_rows(cur.fetchall())
        cur.close()
        conn.close()
        return jsonify(sensors)
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@app.route("/api/sensors/<int:sensor_id>", methods=["GET"])
def get_sensor(sensor_id):
    """Get a single sensor by ID."""
    try:
        conn = get_db()
        cur = conn.cursor()
        cur.execute("SELECT * FROM sensors WHERE id = %s", (sensor_id,))
        sensor = serialize_row(cur.fetchone())
        cur.close()
        conn.close()
        if not sensor:
            return jsonify({"error": "Sensor not found"}), 404
        return jsonify(sensor)
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@app.route("/api/sensors", methods=["POST"])
def create_sensor():
    """Create a new sensor."""
    data = request.get_json()
    required = ["sensor_name", "pipeline_id"]
    for field in required:
        if field not in data:
            return jsonify({"error": f"Missing required field: {field}"}), 400

    try:
        conn = get_db()
        cur = conn.cursor()
        cur.execute(
            """INSERT INTO sensors (sensor_name, pipeline_id, location_lat, location_lng, location_description, status)
               VALUES (%s, %s, %s, %s, %s, %s)""",
            (
                data["sensor_name"],
                data["pipeline_id"],
                data.get("location_lat"),
                data.get("location_lng"),
                data.get("location_description", ""),
                data.get("status", "active"),
            ),
        )
        conn.commit()
        sensor_id = cur.lastrowid
        cur.execute("SELECT * FROM sensors WHERE id = %s", (sensor_id,))
        sensor = serialize_row(cur.fetchone())
        cur.close()
        conn.close()
        return jsonify(sensor), 201
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@app.route("/api/sensors/<int:sensor_id>", methods=["PUT"])
def update_sensor(sensor_id):
    """Update a sensor's status or details."""
    data = request.get_json()
    try:
        conn = get_db()
        cur = conn.cursor()
        cur.execute(
            """UPDATE sensors
               SET sensor_name = COALESCE(%s, sensor_name),
                   pipeline_id = COALESCE(%s, pipeline_id),
                   location_description = COALESCE(%s, location_description),
                   status = COALESCE(%s, status)
               WHERE id = %s""",
            (
                data.get("sensor_name"),
                data.get("pipeline_id"),
                data.get("location_description"),
                data.get("status"),
                sensor_id,
            ),
        )
        conn.commit()
        cur.execute("SELECT * FROM sensors WHERE id = %s", (sensor_id,))
        sensor = serialize_row(cur.fetchone())
        cur.close()
        conn.close()
        if not sensor:
            return jsonify({"error": "Sensor not found"}), 404
        return jsonify(sensor)
    except Exception as e:
        return jsonify({"error": str(e)}), 500


# ──────────────────────────────────────────────
#  Audio Readings
# ──────────────────────────────────────────────
@app.route("/api/readings", methods=["GET"])
def get_readings():
    """Get recent audio readings, optionally filtered by sensor_id."""
    sensor_id = request.args.get("sensor_id")
    limit = request.args.get("limit", 50, type=int)

    try:
        conn = get_db()
        cur = conn.cursor()

        if sensor_id:
            cur.execute(
                "SELECT * FROM audio_readings WHERE sensor_id = %s ORDER BY timestamp DESC LIMIT %s",
                (sensor_id, limit),
            )
        else:
            cur.execute(
                "SELECT * FROM audio_readings ORDER BY timestamp DESC LIMIT %s",
                (limit,),
            )

        readings = serialize_rows(cur.fetchall())
        cur.close()
        conn.close()
        return jsonify(readings)
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@app.route("/api/readings/analyze", methods=["POST"])
def analyze_audio():
    """
    Submit audio data for analysis.
    Proxies to the audio-processor service, stores the result, and triggers alerts if needed.
    """
    data = request.get_json()
    if "sensor_id" not in data:
        return jsonify({"error": "sensor_id is required"}), 400

    try:
        # Send to audio processor for analysis
        analysis_resp = requests.post(
            f"{AUDIO_PROCESSOR_URL}/process",
            json=data,
            timeout=10,
        )
        analysis = analysis_resp.json()

        # Store the reading
        conn = get_db()
        cur = conn.cursor()
        cur.execute(
            """INSERT INTO audio_readings
               (sensor_id, duration_seconds, sample_rate, peak_frequency_hz,
                avg_amplitude, high_freq_energy, noise_floor, leak_confidence, classification)
               VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s)""",
            (
                data["sensor_id"],
                analysis.get("duration_seconds", 1.0),
                analysis.get("sample_rate", 44100),
                analysis.get("peak_frequency_hz"),
                analysis.get("avg_amplitude"),
                analysis.get("high_freq_energy"),
                analysis.get("noise_floor"),
                analysis.get("leak_confidence", 0.0),
                analysis.get("classification", "normal"),
            ),
        )
        conn.commit()
        reading_id = cur.lastrowid
        cur.execute("SELECT * FROM audio_readings WHERE id = %s", (reading_id,))
        reading = serialize_row(cur.fetchone())
        cur.close()
        conn.close()

        # If leak suspected, notify alert service
        if analysis.get("leak_confidence", 0) > 0.6:
            try:
                requests.post(
                    f"{ALERT_SERVICE_URL}/alerts",
                    json={
                        "sensor_id": data["sensor_id"],
                        "reading_id": reading["id"],
                        "leak_confidence": analysis["leak_confidence"],
                        "classification": analysis["classification"],
                    },
                    timeout=5,
                )
            except Exception:
                pass  # Alert service failure shouldn't block the response

        return jsonify({"reading": reading, "analysis": analysis}), 201
    except requests.exceptions.ConnectionError:
        return jsonify({"error": "Audio processor service unavailable"}), 503
    except Exception as e:
        return jsonify({"error": str(e)}), 500


# ──────────────────────────────────────────────
#  Alerts (proxy to alert service)
# ──────────────────────────────────────────────
@app.route("/api/alerts", methods=["GET"])
def get_alerts():
    """Get alerts - proxies to alert service."""
    try:
        params = request.args.to_dict()
        resp = requests.get(f"{ALERT_SERVICE_URL}/alerts", params=params, timeout=5)
        return jsonify(resp.json()), resp.status_code
    except requests.exceptions.ConnectionError:
        return jsonify({"error": "Alert service unavailable"}), 503


@app.route("/api/alerts/<int:alert_id>/acknowledge", methods=["PUT"])
def acknowledge_alert(alert_id):
    """Acknowledge an alert."""
    try:
        data = request.get_json() or {}
        resp = requests.put(
            f"{ALERT_SERVICE_URL}/alerts/{alert_id}/acknowledge",
            json=data,
            timeout=5,
        )
        return jsonify(resp.json()), resp.status_code
    except requests.exceptions.ConnectionError:
        return jsonify({"error": "Alert service unavailable"}), 503


# ──────────────────────────────────────────────
#  Dashboard summary
# ──────────────────────────────────────────────
@app.route("/api/dashboard", methods=["GET"])
def dashboard():
    """Aggregated dashboard data for the frontend."""
    try:
        conn = get_db()
        cur = conn.cursor()

        # Sensor counts by status
        cur.execute(
            "SELECT status, COUNT(*) as count FROM sensors GROUP BY status"
        )
        sensor_counts = {row["status"]: row["count"] for row in cur.fetchall()}

        # Active (unresolved) alerts count
        cur.execute(
            "SELECT severity, COUNT(*) as count FROM alerts WHERE resolved = FALSE GROUP BY severity"
        )
        alert_counts = {row["severity"]: row["count"] for row in cur.fetchall()}

        # Recent readings with leak detections
        cur.execute(
            """SELECT ar.*, s.sensor_name, s.pipeline_id
               FROM audio_readings ar
               JOIN sensors s ON ar.sensor_id = s.id
               WHERE ar.classification IN ('leak_suspected', 'leak_confirmed')
               ORDER BY ar.timestamp DESC LIMIT 10"""
        )
        recent_leaks = serialize_rows(cur.fetchall())

        cur.close()
        conn.close()

        return jsonify({
            "sensor_counts": sensor_counts,
            "alert_counts": alert_counts,
            "total_active_alerts": sum(alert_counts.values()),
            "recent_leak_detections": recent_leaks,
        })
    except Exception as e:
        return jsonify({"error": str(e)}), 500


if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5000, debug=True)
