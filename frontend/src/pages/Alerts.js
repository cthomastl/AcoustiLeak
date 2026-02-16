import React, { useState, useEffect } from 'react';
import { getAlerts, acknowledgeAlert } from '../services/api';

function Alerts() {
  const [alerts, setAlerts] = useState([]);
  const [filter, setFilter] = useState('active');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    loadAlerts();
  }, [filter]);

  async function loadAlerts() {
    setLoading(true);
    try {
      const params = {};
      if (filter === 'active') params.resolved = 'false';
      else if (filter === 'resolved') params.resolved = 'true';
      const data = await getAlerts(params);
      setAlerts(data);
      setError(null);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  async function handleAcknowledge(alertId) {
    try {
      await acknowledgeAlert(alertId, { acknowledged_by: 'operator' });
      loadAlerts();
    } catch (err) {
      setError(err.message);
    }
  }

  return (
    <div>
      {error && <div className="error">{error}</div>}

      <div className="card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <h2 style={{ marginBottom: 0 }}>Alerts</h2>
          <div style={{ display: 'flex', gap: 8 }}>
            {['active', 'resolved', 'all'].map(f => (
              <button
                key={f}
                className={`btn btn-sm ${filter === f ? 'btn-primary' : 'btn-secondary'}`}
                onClick={() => setFilter(f)}
              >
                {f.charAt(0).toUpperCase() + f.slice(1)}
              </button>
            ))}
          </div>
        </div>

        {loading ? (
          <div className="loading">Loading alerts...</div>
        ) : alerts.length === 0 ? (
          <p style={{ color: '#6b8fa3' }}>No {filter} alerts found. Run a simulation to generate test alerts.</p>
        ) : (
          <div className="table-wrapper">
            <table>
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Time</th>
                  <th>Sensor</th>
                  <th>Pipeline</th>
                  <th>Type</th>
                  <th>Severity</th>
                  <th>Confidence</th>
                  <th>Message</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {alerts.map(a => (
                  <tr key={a.id}>
                    <td>{a.id}</td>
                    <td style={{ fontSize: 12 }}>{new Date(a.created_at).toLocaleString()}</td>
                    <td>{a.sensor_name}</td>
                    <td>{a.pipeline_id}</td>
                    <td>{a.alert_type}</td>
                    <td><span className={`badge ${a.severity}`}>{a.severity}</span></td>
                    <td>{a.leak_confidence ? (a.leak_confidence * 100).toFixed(1) + '%' : '—'}</td>
                    <td style={{ fontSize: 12, maxWidth: 250, overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {a.message}
                    </td>
                    <td>
                      {a.resolved ? (
                        <span className="badge active">Resolved</span>
                      ) : a.acknowledged ? (
                        <span className="badge maintenance">Acknowledged</span>
                      ) : (
                        <span className="badge critical">New</span>
                      )}
                    </td>
                    <td>
                      {!a.acknowledged && !a.resolved && (
                        <button
                          className="btn btn-sm btn-secondary"
                          onClick={() => handleAcknowledge(a.id)}
                        >
                          Acknowledge
                        </button>
                      )}
                    </td>
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

export default Alerts;
