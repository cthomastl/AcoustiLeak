import React, { useState, useEffect } from 'react';
import { getDashboard, getHealth } from '../services/api';

function Dashboard() {
  const [data, setData] = useState(null);
  const [health, setHealth] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
    const interval = setInterval(loadData, 10000); // refresh every 10s
    return () => clearInterval(interval);
  }, []);

  async function loadData() {
    try {
      const [dashData, healthData] = await Promise.all([
        getDashboard().catch(() => null),
        getHealth().catch(() => null),
      ]);
      if (dashData) setData(dashData);
      if (healthData) setHealth(healthData);
      setError(null);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  if (loading) return <div className="loading">Loading dashboard...</div>;

  const sensorCounts = data?.sensor_counts || {};
  const alertCounts = data?.alert_counts || {};
  const totalSensors = Object.values(sensorCounts).reduce((a, b) => a + b, 0);
  const totalAlerts = data?.total_active_alerts || 0;
  const recentLeaks = data?.recent_leak_detections || [];

  return (
    <div>
      {error && <div className="error">{error}</div>}

      {/* System Status */}
      <div className="card" style={{ marginBottom: 24 }}>
        <h2>System Status</h2>
        <div style={{ display: 'flex', gap: 20, alignItems: 'center' }}>
          <span style={{ color: health ? '#00e676' : '#ff1744', fontSize: 14 }}>
            ● API Gateway: {health ? 'Online' : 'Offline'}
          </span>
          <span style={{ color: '#6b8fa3', fontSize: 14 }}>
            DB: {health?.database || 'unknown'}
          </span>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="stats-grid">
        <div className="stat-card info">
          <div className="stat-value">{totalSensors}</div>
          <div className="stat-label">Total Sensors</div>
        </div>
        <div className="stat-card success">
          <div className="stat-value">{sensorCounts.active || 0}</div>
          <div className="stat-label">Active Sensors</div>
        </div>
        <div className={`stat-card ${totalAlerts > 0 ? 'critical' : 'success'}`}>
          <div className="stat-value">{totalAlerts}</div>
          <div className="stat-label">Active Alerts</div>
        </div>
        <div className="stat-card warning">
          <div className="stat-value">{alertCounts.critical || 0}</div>
          <div className="stat-label">Critical Alerts</div>
        </div>
      </div>

      {/* Alert Breakdown */}
      {totalAlerts > 0 && (
        <div className="card">
          <h2>Active Alert Breakdown</h2>
          <div className="stats-grid">
            {['critical', 'high', 'medium', 'low'].map(sev => (
              <div key={sev} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0' }}>
                <span className={`badge ${sev}`}>{sev}</span>
                <span style={{ fontWeight: 600 }}>{alertCounts[sev] || 0}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Recent Leak Detections */}
      <div className="card">
        <h2>Recent Leak Detections</h2>
        {recentLeaks.length === 0 ? (
          <p style={{ color: '#6b8fa3' }}>No leak detections recorded yet. Use the Simulate tab to test.</p>
        ) : (
          <div className="table-wrapper">
            <table>
              <thead>
                <tr>
                  <th>Time</th>
                  <th>Sensor</th>
                  <th>Pipeline</th>
                  <th>Classification</th>
                  <th>Confidence</th>
                  <th>Peak Freq (Hz)</th>
                </tr>
              </thead>
              <tbody>
                {recentLeaks.map(r => (
                  <tr key={r.id}>
                    <td>{new Date(r.timestamp).toLocaleString()}</td>
                    <td>{r.sensor_name}</td>
                    <td>{r.pipeline_id}</td>
                    <td><span className={`badge ${r.classification}`}>{r.classification}</span></td>
                    <td>{(r.leak_confidence * 100).toFixed(1)}%</td>
                    <td>{r.peak_frequency_hz?.toFixed(0)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

export default Dashboard;
