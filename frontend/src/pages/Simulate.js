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
  wind: 'bg-gray-400',
  machinery: 'bg-amber-400',
  bird: 'bg-sky-400',
  gas_leak: 'bg-red-500',
};

const BAND_TEXT_COLORS = {
  wind: 'text-gray-600',
  machinery: 'text-amber-600',
  bird: 'text-sky-600',
  gas_leak: 'text-red-600',
};

const CLASSIFICATION_STYLES = {
  leak_suspected: 'bg-red-50 text-red-700 ring-red-600/20',
  leak_confirmed: 'bg-red-100 text-red-800 ring-red-700/20',
  normal: 'bg-green-50 text-green-700 ring-green-600/20',
  wind: 'bg-gray-50 text-gray-700 ring-gray-600/20',
  machinery: 'bg-yellow-50 text-yellow-700 ring-yellow-600/20',
  bird: 'bg-blue-50 text-blue-700 ring-blue-600/20',
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
    <div className="space-y-6">
      {error && (
        <div className="rounded-lg bg-red-50 border border-red-200 p-4">
          <p className="text-sm text-red-700">{error}</p>
        </div>
      )}

      {/* Controls */}
      <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
        <h2 className="text-base font-semibold text-gray-900">Audio Simulation</h2>
        <p className="text-sm text-gray-500 mt-1 mb-5">
          Simulate different audio scenarios to test the leak detection pipeline.
          Select a sensor and scenario, then run the analysis.
        </p>

        <div className="flex flex-wrap items-end gap-4">
          <div className="flex-1 min-w-[180px]">
            <label className="block text-xs font-medium text-gray-700 mb-1.5">Sensor</label>
            <select
              value={selectedSensor}
              onChange={e => setSelectedSensor(e.target.value)}
              className="block w-full rounded-md border border-gray-300 bg-white py-2 px-3 text-sm text-gray-700 shadow-sm focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 focus:outline-none"
            >
              {sensors.map(s => (
                <option key={s.id} value={s.id}>
                  {s.sensor_name} — {s.pipeline_id}
                </option>
              ))}
            </select>
          </div>

          <div className="flex-1 min-w-[180px]">
            <label className="block text-xs font-medium text-gray-700 mb-1.5">Scenario</label>
            <select
              value={scenario}
              onChange={e => setScenario(e.target.value)}
              className="block w-full rounded-md border border-gray-300 bg-white py-2 px-3 text-sm text-gray-700 shadow-sm focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 focus:outline-none"
            >
              {SCENARIOS.map(s => (
                <option key={s.value} value={s.value}>{s.label}</option>
              ))}
            </select>
          </div>

          <button
            onClick={runSimulation}
            disabled={running}
            className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {running ? (
              <>
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                Analyzing...
              </>
            ) : (
              <>
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664zM21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                Run Analysis
              </>
            )}
          </button>
        </div>
      </div>

      {analysis && (
        <>
          {/* Classification Result */}
          <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
            <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-4">Analysis Result</h2>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="bg-gray-50 rounded-lg p-4 text-center">
                <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">Classification</p>
                <div className="mt-2">
                  <span className={`inline-flex items-center rounded-full px-3 py-1 text-sm font-semibold ring-1 ring-inset ${CLASSIFICATION_STYLES[analysis.classification] || 'bg-gray-50 text-gray-700 ring-gray-600/20'}`}>
                    {analysis.classification}
                  </span>
                </div>
              </div>
              <div className="bg-gray-50 rounded-lg p-4 text-center">
                <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">Leak Confidence</p>
                <p className={`text-2xl font-bold mt-1 ${analysis.leak_confidence > 0.6 ? 'text-red-600' : 'text-green-600'}`}>
                  {(analysis.leak_confidence * 100).toFixed(1)}%
                </p>
              </div>
              <div className="bg-gray-50 rounded-lg p-4 text-center">
                <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">Peak Frequency</p>
                <p className="text-2xl font-bold mt-1 text-gray-900">{analysis.peak_frequency_hz?.toFixed(0)} Hz</p>
              </div>
              <div className="bg-gray-50 rounded-lg p-4 text-center">
                <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">Avg Amplitude</p>
                <p className="text-2xl font-bold mt-1 text-gray-900">{analysis.avg_amplitude?.toFixed(6)}</p>
              </div>
            </div>
          </div>

          {/* Frequency Band Energy Chart */}
          <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
            <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-4">Frequency Band Energy</h2>
            <div className="flex items-end gap-3 h-40 px-4">
              {Object.entries(bandEnergies).map(([band, energy]) => (
                <div key={band} className="flex-1 flex flex-col items-center gap-1.5">
                  <span className={`text-xs font-semibold ${BAND_TEXT_COLORS[band] || 'text-gray-600'}`}>
                    {(energy * 100).toFixed(1)}%
                  </span>
                  <div
                    className={`w-full max-w-[60px] rounded-t-md transition-all duration-300 ${BAND_COLORS[band] || 'bg-gray-300'}`}
                    style={{ height: `${(energy / maxEnergy) * 120}px`, minHeight: '4px' }}
                  />
                  <span className="text-xs text-gray-500 text-center whitespace-nowrap">{band.replace('_', ' ')}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Alert Status */}
          {analysis.leak_confidence > 0.6 && (
            <div className="bg-red-50 rounded-xl border border-red-200 p-5">
              <div className="flex items-start gap-3">
                <div className="flex-shrink-0 mt-0.5">
                  <svg className="w-5 h-5 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.34 16.5c-.77.833.192 2.5 1.732 2.5z" />
                  </svg>
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-red-800">Alert Generated</h3>
                  <p className="text-sm text-red-700 mt-1">
                    Leak confidence exceeded 60% threshold. An alert has been created and
                    can be viewed on the Alerts tab.
                  </p>
                </div>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}

export default Simulate;
