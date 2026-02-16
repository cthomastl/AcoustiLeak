-- AcoustiLeak Database Schema
-- MySQL schema for pipeline gas leak detection system

-- Sensors table: each microphone attached to a pipeline
CREATE TABLE IF NOT EXISTS sensors (
    id INT AUTO_INCREMENT PRIMARY KEY,
    sensor_name VARCHAR(100) NOT NULL,
    pipeline_id VARCHAR(50) NOT NULL,
    location_lat DECIMAL(10, 7),
    location_lng DECIMAL(10, 7),
    location_description VARCHAR(255),
    status ENUM('active', 'inactive', 'maintenance') DEFAULT 'active',
    installed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- Audio readings: raw audio analysis results from each sensor
CREATE TABLE IF NOT EXISTS audio_readings (
    id INT AUTO_INCREMENT PRIMARY KEY,
    sensor_id INT NOT NULL,
    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    duration_seconds DECIMAL(6, 2) NOT NULL,
    sample_rate INT DEFAULT 44100,
    peak_frequency_hz DECIMAL(10, 2),
    avg_amplitude DECIMAL(10, 6),
    high_freq_energy DECIMAL(10, 6),
    noise_floor DECIMAL(10, 6),
    leak_confidence DECIMAL(5, 4) DEFAULT 0.0,
    classification ENUM('normal', 'wind', 'machinery', 'bird', 'leak_suspected', 'leak_confirmed') DEFAULT 'normal',
    FOREIGN KEY (sensor_id) REFERENCES sensors(id) ON DELETE CASCADE
);

-- Alerts: generated when a potential leak is detected
CREATE TABLE IF NOT EXISTS alerts (
    id INT AUTO_INCREMENT PRIMARY KEY,
    sensor_id INT NOT NULL,
    reading_id INT,
    alert_type ENUM('micro_leak', 'major_leak', 'sensor_offline', 'anomaly') NOT NULL DEFAULT 'micro_leak',
    severity ENUM('low', 'medium', 'high', 'critical') NOT NULL DEFAULT 'medium',
    message TEXT,
    leak_confidence DECIMAL(5, 4),
    acknowledged BOOLEAN DEFAULT FALSE,
    acknowledged_by VARCHAR(100),
    acknowledged_at TIMESTAMP NULL,
    resolved BOOLEAN DEFAULT FALSE,
    resolved_at TIMESTAMP NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (sensor_id) REFERENCES sensors(id) ON DELETE CASCADE,
    FOREIGN KEY (reading_id) REFERENCES audio_readings(id) ON DELETE SET NULL
);

-- Operators: users who monitor the system
CREATE TABLE IF NOT EXISTS operators (
    id INT AUTO_INCREMENT PRIMARY KEY,
    username VARCHAR(50) UNIQUE NOT NULL,
    email VARCHAR(100) UNIQUE NOT NULL,
    full_name VARCHAR(100) NOT NULL,
    role ENUM('operator', 'supervisor', 'admin') DEFAULT 'operator',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for common queries
CREATE INDEX idx_readings_sensor_id ON audio_readings(sensor_id);
CREATE INDEX idx_readings_timestamp ON audio_readings(timestamp);
CREATE INDEX idx_readings_classification ON audio_readings(classification);
CREATE INDEX idx_alerts_sensor_id ON alerts(sensor_id);
CREATE INDEX idx_alerts_severity ON alerts(severity);
CREATE INDEX idx_alerts_resolved ON alerts(resolved);
CREATE INDEX idx_sensors_status ON sensors(status);

-- Seed data: sample sensors on pipelines
INSERT IGNORE INTO sensors (sensor_name, pipeline_id, location_lat, location_lng, location_description, status)
VALUES
    ('MIC-001', 'PL-NORTH-01', 29.7604, -95.3698, 'North Pipeline - Junction A', 'active'),
    ('MIC-002', 'PL-NORTH-01', 29.7620, -95.3710, 'North Pipeline - Valve Station 3', 'active'),
    ('MIC-003', 'PL-SOUTH-02', 29.6500, -95.2800, 'South Pipeline - Compressor Site', 'active'),
    ('MIC-004', 'PL-SOUTH-02', 29.6480, -95.2750, 'South Pipeline - River Crossing', 'maintenance'),
    ('MIC-005', 'PL-EAST-03', 29.7800, -95.2000, 'East Pipeline - Storage Facility', 'active'),
    ('MIC-006', 'PL-WEST-04', 29.7500, -95.5000, 'West Pipeline - Distribution Hub', 'active');
