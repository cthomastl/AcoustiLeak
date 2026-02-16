-- AcoustiLeak Database Schema
-- PostgreSQL schema for pipeline gas leak detection system

-- Sensors table: each microphone attached to a pipeline
CREATE TABLE IF NOT EXISTS sensors (
    id SERIAL PRIMARY KEY,
    sensor_name VARCHAR(100) NOT NULL,
    pipeline_id VARCHAR(50) NOT NULL,
    location_lat DECIMAL(10, 7),
    location_lng DECIMAL(10, 7),
    location_description VARCHAR(255),
    status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'maintenance')),
    installed_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Audio readings: raw audio analysis results from each sensor
CREATE TABLE IF NOT EXISTS audio_readings (
    id SERIAL PRIMARY KEY,
    sensor_id INTEGER NOT NULL REFERENCES sensors(id) ON DELETE CASCADE,
    timestamp TIMESTAMP DEFAULT NOW(),
    duration_seconds DECIMAL(6, 2) NOT NULL,
    sample_rate INTEGER DEFAULT 44100,
    peak_frequency_hz DECIMAL(10, 2),
    avg_amplitude DECIMAL(10, 6),
    high_freq_energy DECIMAL(10, 6),
    noise_floor DECIMAL(10, 6),
    leak_confidence DECIMAL(5, 4) DEFAULT 0.0,
    classification VARCHAR(30) DEFAULT 'normal'
        CHECK (classification IN ('normal', 'wind', 'machinery', 'bird', 'leak_suspected', 'leak_confirmed'))
);

-- Alerts: generated when a potential leak is detected
CREATE TABLE IF NOT EXISTS alerts (
    id SERIAL PRIMARY KEY,
    sensor_id INTEGER NOT NULL REFERENCES sensors(id) ON DELETE CASCADE,
    reading_id INTEGER REFERENCES audio_readings(id) ON DELETE SET NULL,
    alert_type VARCHAR(30) NOT NULL DEFAULT 'micro_leak'
        CHECK (alert_type IN ('micro_leak', 'major_leak', 'sensor_offline', 'anomaly')),
    severity VARCHAR(20) NOT NULL DEFAULT 'medium'
        CHECK (severity IN ('low', 'medium', 'high', 'critical')),
    message TEXT,
    leak_confidence DECIMAL(5, 4),
    acknowledged BOOLEAN DEFAULT FALSE,
    acknowledged_by VARCHAR(100),
    acknowledged_at TIMESTAMP,
    resolved BOOLEAN DEFAULT FALSE,
    resolved_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Operators: users who monitor the system
CREATE TABLE IF NOT EXISTS operators (
    id SERIAL PRIMARY KEY,
    username VARCHAR(50) UNIQUE NOT NULL,
    email VARCHAR(100) UNIQUE NOT NULL,
    full_name VARCHAR(100) NOT NULL,
    role VARCHAR(30) DEFAULT 'operator' CHECK (role IN ('operator', 'supervisor', 'admin')),
    created_at TIMESTAMP DEFAULT NOW()
);

-- Indexes for common queries
CREATE INDEX IF NOT EXISTS idx_readings_sensor_id ON audio_readings(sensor_id);
CREATE INDEX IF NOT EXISTS idx_readings_timestamp ON audio_readings(timestamp);
CREATE INDEX IF NOT EXISTS idx_readings_classification ON audio_readings(classification);
CREATE INDEX IF NOT EXISTS idx_alerts_sensor_id ON alerts(sensor_id);
CREATE INDEX IF NOT EXISTS idx_alerts_severity ON alerts(severity);
CREATE INDEX IF NOT EXISTS idx_alerts_resolved ON alerts(resolved);
CREATE INDEX IF NOT EXISTS idx_sensors_status ON sensors(status);

-- Seed data: sample sensors on pipelines
INSERT INTO sensors (sensor_name, pipeline_id, location_lat, location_lng, location_description, status)
VALUES
    ('MIC-001', 'PL-NORTH-01', 29.7604, -95.3698, 'North Pipeline - Junction A', 'active'),
    ('MIC-002', 'PL-NORTH-01', 29.7620, -95.3710, 'North Pipeline - Valve Station 3', 'active'),
    ('MIC-003', 'PL-SOUTH-02', 29.6500, -95.2800, 'South Pipeline - Compressor Site', 'active'),
    ('MIC-004', 'PL-SOUTH-02', 29.6480, -95.2750, 'South Pipeline - River Crossing', 'maintenance'),
    ('MIC-005', 'PL-EAST-03', 29.7800, -95.2000, 'East Pipeline - Storage Facility', 'active'),
    ('MIC-006', 'PL-WEST-04', 29.7500, -95.5000, 'West Pipeline - Distribution Hub', 'active')
ON CONFLICT DO NOTHING;
