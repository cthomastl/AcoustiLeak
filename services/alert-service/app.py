"""
AcoustiLeak Alert Service
Manages alerts generated from audio analysis.
Handles alert creation, acknowledgement, and resolution.
"""

import os
from datetime import datetime, date
from decimal import Decimal

import pymysql
import pymysql.cursors
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


def determine_severity(leak_confidence):
    """Map leak confidence to alert severity."""
    if leak_confidence >= 0.9:
        return "critical"
    elif leak_confidence >= 0.8:
        return "high"
    elif leak_confidence >= 0.7:
        return "medium"
    return "low"


# ──────────────────────────────────────────────
#  Routes
# ──────────────────────────────────────────────
@app.route("/health", methods=["GET"])
def health():
    return jsonify({
        "service": "alert-service",
        "status": "running",
    })


@app.route("/alerts", methods=["GET"])
def get_alerts():
    """
    Get alerts with optional filters.
    Query params: resolved (bool), severity, sensor_id, limit
    """
    resolved = request.args.get("resolved")
    severity = request.args.get("severity")
    sensor_id = request.args.get("sensor_id")
    limit = request.args.get("limit", 50, type=int)

    try:
        conn = get_db()
        cur = conn.cursor()

        query = """
            SELECT a.*, s.sensor_name, s.pipeline_id, s.location_description
            FROM alerts a
            JOIN sensors s ON a.sensor_id = s.id
            WHERE 1=1
        """
        params = []

        if resolved is not None:
            query += " AND a.resolved = %s"
            params.append(resolved.lower() == "true")
        if severity:
            query += " AND a.severity = %s"
            params.append(severity)
        if sensor_id:
            query += " AND a.sensor_id = %s"
            params.append(int(sensor_id))

        query += " ORDER BY a.created_at DESC LIMIT %s"
        params.append(limit)

        cur.execute(query, params)
        alerts = serialize_rows(cur.fetchall())
        cur.close()
        conn.close()

        return jsonify(alerts)
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@app.route("/alerts", methods=["POST"])
def create_alert():
    """Create a new alert from audio analysis results."""
    data = request.get_json()

    sensor_id = data.get("sensor_id")
    reading_id = data.get("reading_id")
    leak_confidence = data.get("leak_confidence", 0)
    classification = data.get("classification", "leak_suspected")

    if not sensor_id:
        return jsonify({"error": "sensor_id is required"}), 400

    severity = determine_severity(leak_confidence)

    # Determine alert type
    if leak_confidence >= 0.85:
        alert_type = "major_leak"
    else:
        alert_type = "micro_leak"

    message = (
        f"Potential {alert_type.replace('_', ' ')} detected. "
        f"Classification: {classification}. "
        f"Confidence: {leak_confidence:.1%}"
    )

    try:
        conn = get_db()
        cur = conn.cursor()
        cur.execute(
            """INSERT INTO alerts (sensor_id, reading_id, alert_type, severity, message, leak_confidence)
               VALUES (%s, %s, %s, %s, %s, %s)""",
            (sensor_id, reading_id, alert_type, severity, message, leak_confidence),
        )
        conn.commit()
        alert_id = cur.lastrowid
        cur.execute("SELECT * FROM alerts WHERE id = %s", (alert_id,))
        alert = serialize_row(cur.fetchone())
        cur.close()
        conn.close()

        return jsonify(alert), 201
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@app.route("/alerts/<int:alert_id>/acknowledge", methods=["PUT"])
def acknowledge_alert(alert_id):
    """Mark an alert as acknowledged by an operator."""
    data = request.get_json() or {}
    acknowledged_by = data.get("acknowledged_by", "operator")

    try:
        conn = get_db()
        cur = conn.cursor()
        cur.execute(
            """UPDATE alerts
               SET acknowledged = TRUE, acknowledged_by = %s, acknowledged_at = NOW()
               WHERE id = %s""",
            (acknowledged_by, alert_id),
        )
        conn.commit()
        cur.execute("SELECT * FROM alerts WHERE id = %s", (alert_id,))
        alert = serialize_row(cur.fetchone())
        cur.close()
        conn.close()

        if not alert:
            return jsonify({"error": "Alert not found"}), 404

        return jsonify(alert)
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@app.route("/alerts/<int:alert_id>/resolve", methods=["PUT"])
def resolve_alert(alert_id):
    """Mark an alert as resolved."""
    try:
        conn = get_db()
        cur = conn.cursor()
        cur.execute(
            """UPDATE alerts
               SET resolved = TRUE, resolved_at = NOW()
               WHERE id = %s""",
            (alert_id,),
        )
        conn.commit()
        cur.execute("SELECT * FROM alerts WHERE id = %s", (alert_id,))
        alert = serialize_row(cur.fetchone())
        cur.close()
        conn.close()

        if not alert:
            return jsonify({"error": "Alert not found"}), 404

        return jsonify(alert)
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@app.route("/alerts/stats", methods=["GET"])
def alert_stats():
    """Get alert statistics."""
    try:
        conn = get_db()
        cur = conn.cursor()

        cur.execute("""
            SELECT
                SUM(CASE WHEN NOT resolved THEN 1 ELSE 0 END) AS active_alerts,
                SUM(CASE WHEN resolved THEN 1 ELSE 0 END) AS resolved_alerts,
                SUM(CASE WHEN severity = 'critical' AND NOT resolved THEN 1 ELSE 0 END) AS critical_active,
                SUM(CASE WHEN severity = 'high' AND NOT resolved THEN 1 ELSE 0 END) AS high_active,
                SUM(CASE WHEN NOT acknowledged AND NOT resolved THEN 1 ELSE 0 END) AS unacknowledged,
                COUNT(*) AS total_alerts
            FROM alerts
        """)
        stats = serialize_row(cur.fetchone())
        cur.close()
        conn.close()

        return jsonify(stats)
    except Exception as e:
        return jsonify({"error": str(e)}), 500


if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5002, debug=True)
