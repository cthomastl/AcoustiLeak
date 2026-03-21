import React, { useState, useEffect } from 'react';
import { getDashboard, getHealth } from '../services/api';

function Dashboard() {
  const [data, setData] = useState(null);
  const [health, setHealth] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
    const interval = setInterval(loadData, 10000);
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

  if (loading) {
    return (
      <div className="loading">
        <div className="spinner" />
        <p>Loading dashboard...</p>
      </div>
    );
  }

  const sensorCounts = data?.sensor_counts || {};
  const alertCounts = data?.alert_counts || {};
  const totalSensors = Object.values(sensorCounts).reduce((a, b) => a + b, 0);
  const totalAlerts = data?.total_active_alerts || 0;
  const recentLeaks = data?.recent_leak_detections || [];

  return (
    <div>
      {error && <div className="error">{error}</div>}

      {/* System Status */}
      <div className="card">
        <h2>System Status</h2>
        <div style={{ display: 'flex', gap: 20, alignItems: 'center' }}>
          <span style={{ fontSize: 13 }}>
            <span className={`status-dot ${health ? 'online' : 'offline'}`} />
            API Gateway: {health ? 'Online' : 'Offline'}
          </span>
          <span style={{ fontSize: 13 }}>
            <span className="status-dot muted" />
            Database: {health?.database || 'unknown'}
          </span>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="stats-grid">
        <div className="stat-card indigo">
          <div className="stat-card-inner">
            <div>
              <div className="stat-label">Total Sensors</div>
              <div className="stat-value">{totalSensors}</div>
            </div>
            <div className="stat-icon">&#9678;</div>
          </div>
        </div>
        <div className="stat-card green">
          <div className="stat-card-inner">
            <div>
              <div className="stat-label">Active Sensors</div>
              <div className="stat-value">{sensorCounts.active || 0}</div>
            </div>
            <div className="stat-icon">&#10003;</div>
          </div>
        </div>
        <div className={`stat-card ${totalAlerts > 0 ? 'red' : 'green'}`}>
          <div className="stat-card-inner">
            <div>
              <div className="stat-label">Active Alerts</div>
              <div className="stat-value">{totalAlerts}</div>
            </div>
            <div className="stat-icon">&#9888;</div>
          </div>
        </div>
        <div className="stat-card amber">
          <div className="stat-card-inner">
            <div>
              <div className="stat-label">Critical Alerts</div>
              <div className="stat-value">{alertCounts.critical || 0}</div>
            </div>
            <div className="stat-icon">&#9888;</div>
          </div>
        </div>
      </div>

      {/* Alert Breakdown */}
      {totalAlerts > 0 && (
        <div className="card">
          <h2>Active Alert Breakdown</h2>
          <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
            {['critical', 'high', 'medium', 'low'].map(sev => (
              <div key={sev} style={{ display: 'flex', alignItems: 'center', gap: 8, background: '#f9fafb', borderRadius: 8, padding: '8px 16px' }}>
                <span className={`badge ${sev}`}>{sev}</span>
                <span style={{ fontWeight: 700, fontSize: 18, color: '#111827' }}>{alertCounts[sev] || 0}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Recent Leak Detections */}
      <div className="card">
        <h2>Recent Leak Detections</h2>
        {recentLeaks.length === 0 ? (
          <div className="empty-state">
            <p>No leak detections recorded yet. Use the Simulate tab to test.</p>
          </div>
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
                    <td className="muted">{new Date(r.timestamp).toLocaleString()}</td>
                    <td className="bold">{r.sensor_name}</td>
                    <td>{r.pipeline_id}</td>
                    <td><span className={`badge ${r.classification}`}>{r.classification}</span></td>
                    <td className="bold">{(r.leak_confidence * 100).toFixed(1)}%</td>
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
