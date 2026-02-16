import React, { useState, useEffect } from 'react';
import { getSensors, analyzeAudio } from '../services/api';

const SCENARIOS = [
  { value: 'normal', label: 'Normal (Background noise)' },
  { value: 'leak', label: 'Gas Leak (High-freq hiss)' },
  { value: 'wind', label: 'Wind Noise' },
  { value: 'machinery', label: 'Machinery Hum' },
  { value: 'bird', label: 'Bird Chirps' },
];

const BAND_COLORS = {
  wind: '#78909c',
  machinery: '#ffd600',
  bird: '#40c4ff',
  gas_leak: '#ff1744',
};

function Simulate() {
  const [sensors, setSensors] = useState([]);
  const [selectedSensor, setSelectedSensor] = useState('');
  const [scenario, setScenario] = useState('normal');
  const [result, setResult] = useState(null);
  const [running, setRunning] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    getSensors()
      .then(data => {
        setSensors(data);
        if (data.length > 0) setSelectedSensor(data[0].id);
      })
      .catch(() => {});
  }, []);

  async function runSimulation() {
    if (!selectedSensor) return;
    setRunning(true);
    setError(null);
    setResult(null);

    try {
      const data = await analyzeAudio({
        sensor_id: selectedSensor,
        scenario: scenario,
        duration_seconds: 1.0,
        sample_rate: 44100,
      });
      setResult(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setRunning(false);
    }
  }

  const analysis = result?.analysis;
  const bandEnergies = analysis?.band_energies || {};
  const maxEnergy = Math.max(...Object.values(bandEnergies), 0.01);

  return (
    <div>
      {error && <div className="error">{error}</div>}

      <div className="card">
        <h2>Audio Simulation</h2>
        <p style={{ color: '#6b8fa3', marginBottom: 16, fontSize: 14 }}>
          Simulate different audio scenarios to test the leak detection pipeline.
          Select a sensor and scenario, then run the analysis.
        </p>

        <div className="simulate-controls">
          <select value={selectedSensor} onChange={e => setSelectedSensor(e.target.value)}>
            {sensors.map(s => (
              <option key={s.id} value={s.id}>
                {s.sensor_name} — {s.pipeline_id}
              </option>
            ))}
          </select>

          <select value={scenario} onChange={e => setScenario(e.target.value)}>
            {SCENARIOS.map(s => (
              <option key={s.value} value={s.value}>{s.label}</option>
            ))}
          </select>

          <button className="btn btn-primary" onClick={runSimulation} disabled={running}>
            {running ? 'Analyzing...' : 'Run Analysis'}
          </button>
        </div>
      </div>

      {analysis && (
        <>
          {/* Classification Result */}
          <div className="card">
            <h2>Analysis Result</h2>
            <div className="result-grid">
              <div className="result-item">
                <div className="label">Classification</div>
                <div className="value">
                  <span className={`badge ${analysis.classification}`} style={{ fontSize: 16 }}>
                    {analysis.classification}
                  </span>
                </div>
              </div>
              <div className="result-item">
                <div className="label">Leak Confidence</div>
                <div className="value" style={{
                  color: analysis.leak_confidence > 0.6 ? '#ff1744' : '#00e676'
                }}>
                  {(analysis.leak_confidence * 100).toFixed(1)}%
                </div>
              </div>
              <div className="result-item">
                <div className="label">Peak Frequency</div>
                <div className="value">{analysis.peak_frequency_hz?.toFixed(0)} Hz</div>
              </div>
              <div className="result-item">
                <div className="label">Avg Amplitude</div>
                <div className="value">{analysis.avg_amplitude?.toFixed(6)}</div>
              </div>
            </div>
          </div>

          {/* Frequency Band Energy Chart */}
          <div className="card">
            <h2>Frequency Band Energy</h2>
            <div className="bar-chart">
              {Object.entries(bandEnergies).map(([band, energy]) => (
                <div key={band} className="bar-item">
                  <div className="bar-value">{(energy * 100).toFixed(1)}%</div>
                  <div
                    className="bar"
                    style={{
                      height: `${(energy / maxEnergy) * 100}px`,
                      backgroundColor: BAND_COLORS[band] || '#6b8fa3',
                    }}
                  />
                  <div className="bar-label">{band.replace('_', ' ')}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Alert Status */}
          {analysis.leak_confidence > 0.6 && (
            <div className="card" style={{ borderColor: '#ff1744' }}>
              <h2 style={{ color: '#ff1744' }}>Alert Generated</h2>
              <p style={{ color: '#ff8a80' }}>
                Leak confidence exceeded 60% threshold. An alert has been created and
                can be viewed on the Alerts tab.
              </p>
            </div>
          )}
        </>
      )}
    </div>
  );
}

export default Simulate;
