import React, { useState, useEffect } from 'react';
import { getSensors, analyzeAudio } from '../services/api';

const SCENARIOS = [
  { value: 'normal', label: 'Normal (Background noise)' },
  { value: 'leak', label: 'Gas Leak (High-freq hiss)' },
  { value: 'wind', label: 'Wind Noise' },
  { value: 'machinery', label: 'Machinery Hum' },
  { value: 'bird', label: 'Bird Chirps' },
];

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
        <div className="card-header">
          <div>
            <div className="card-title">Audio Simulation</div>
            <div className="card-subtitle">
              Simulate different audio scenarios to test the leak detection pipeline.
            </div>
          </div>
        </div>

        <div className="form-row">
          <div className="form-group">
            <label>Sensor</label>
            <select value={selectedSensor} onChange={e => setSelectedSensor(e.target.value)}>
              {sensors.map(s => (
                <option key={s.id} value={s.id}>
                  {s.sensor_name} — {s.pipeline_id}
                </option>
              ))}
            </select>
          </div>

          <div className="form-group">
            <label>Scenario</label>
            <select value={scenario} onChange={e => setScenario(e.target.value)}>
              {SCENARIOS.map(s => (
                <option key={s.value} value={s.value}>{s.label}</option>
              ))}
            </select>
          </div>

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
                <div className="result-label">Classification</div>
                <div style={{ marginTop: 8 }}>
                  <span className={`badge ${analysis.classification}`} style={{ fontSize: 13, padding: '4px 14px' }}>
                    {analysis.classification}
                  </span>
                </div>
              </div>
              <div className="result-item">
                <div className="result-label">Leak Confidence</div>
                <div className={`result-value ${analysis.leak_confidence > 0.6 ? 'danger' : 'success'}`}>
                  {(analysis.leak_confidence * 100).toFixed(1)}%
                </div>
              </div>
              <div className="result-item">
                <div className="result-label">Peak Frequency</div>
                <div className="result-value">{analysis.peak_frequency_hz?.toFixed(0)} Hz</div>
              </div>
              <div className="result-item">
                <div className="result-label">Avg Amplitude</div>
                <div className="result-value">{analysis.avg_amplitude?.toFixed(6)}</div>
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
                    className={`bar ${band}`}
                    style={{
                      height: `${(energy / maxEnergy) * 120}px`,
                    }}
                  />
                  <div className="bar-label">{band.replace('_', ' ')}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Alert Status */}
          {analysis.leak_confidence > 0.6 && (
            <div className="alert-banner">
              <div className="alert-banner-icon">&#9888;</div>
              <div>
                <h3>Alert Generated</h3>
                <p>
                  Leak confidence exceeded 60% threshold. An alert has been created and
                  can be viewed on the Alerts tab.
                </p>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}

export default Simulate;
