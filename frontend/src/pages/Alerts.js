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
        <div className="card-header">
          <div>
            <div className="card-title">Alerts</div>
            <div className="card-subtitle">Monitor and manage system alerts</div>
          </div>
          <div className="filter-group">
            {['active', 'resolved', 'all'].map(f => (
              <button
                key={f}
                className={`filter-btn ${filter === f ? 'active' : ''}`}
                onClick={() => setFilter(f)}
              >
                {f.charAt(0).toUpperCase() + f.slice(1)}
              </button>
            ))}
          </div>
        </div>

        {loading ? (
          <div className="loading">
            <div className="spinner" />
            <p>Loading alerts...</p>
          </div>
        ) : alerts.length === 0 ? (
          <div className="empty-state">
            <p>No {filter} alerts found. Run a simulation to generate test alerts.</p>
          </div>
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
                    <td className="mono">{a.id}</td>
                    <td className="muted" style={{ whiteSpace: 'nowrap' }}>{new Date(a.created_at).toLocaleString()}</td>
                    <td className="bold">{a.sensor_name}</td>
                    <td>{a.pipeline_id}</td>
                    <td>{a.alert_type}</td>
                    <td><span className={`badge ${a.severity}`}>{a.severity}</span></td>
                    <td className="bold">{a.leak_confidence ? (a.leak_confidence * 100).toFixed(1) + '%' : '\u2014'}</td>
                    <td style={{ maxWidth: 250, overflow: 'hidden', textOverflow: 'ellipsis', fontSize: 12 }}>{a.message}</td>
                    <td>
                      {a.resolved ? (
                        <span className="badge resolved">Resolved</span>
                      ) : a.acknowledged ? (
                        <span className="badge acknowledged">Acknowledged</span>
                      ) : (
                        <span className="badge new-alert">New</span>
                      )}
                    </td>
                    <td>
                      {!a.acknowledged && !a.resolved && (
                        <button className="btn btn-secondary btn-sm" onClick={() => handleAcknowledge(a.id)}>
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
