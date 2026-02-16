import React, { useState, useEffect } from 'react';
import { getSensors, updateSensor } from '../services/api';

function Sensors() {
  const [sensors, setSensors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    loadSensors();
  }, []);

  async function loadSensors() {
    try {
      const data = await getSensors();
      setSensors(data);
      setError(null);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  async function handleStatusChange(id, newStatus) {
    try {
      await updateSensor(id, { status: newStatus });
      loadSensors();
    } catch (err) {
      setError(err.message);
    }
  }

  if (loading) return <div className="loading">Loading sensors...</div>;

  return (
    <div>
      {error && <div className="error">{error}</div>}

      <div className="card">
        <h2>Pipeline Sensors ({sensors.length})</h2>
        <div className="table-wrapper">
          <table>
            <thead>
              <tr>
                <th>ID</th>
                <th>Name</th>
                <th>Pipeline</th>
                <th>Location</th>
                <th>Coordinates</th>
                <th>Status</th>
                <th>Installed</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {sensors.map(s => (
                <tr key={s.id}>
                  <td>{s.id}</td>
                  <td style={{ fontWeight: 600 }}>{s.sensor_name}</td>
                  <td>{s.pipeline_id}</td>
                  <td>{s.location_description}</td>
                  <td style={{ fontSize: 12, color: '#6b8fa3' }}>
                    {s.location_lat && s.location_lng
                      ? `${Number(s.location_lat).toFixed(4)}, ${Number(s.location_lng).toFixed(4)}`
                      : '—'}
                  </td>
                  <td><span className={`badge ${s.status}`}>{s.status}</span></td>
                  <td style={{ fontSize: 12 }}>{new Date(s.installed_at).toLocaleDateString()}</td>
                  <td>
                    <select
                      value={s.status}
                      onChange={e => handleStatusChange(s.id, e.target.value)}
                      style={{ fontSize: 12, padding: '4px 8px' }}
                    >
                      <option value="active">Active</option>
                      <option value="inactive">Inactive</option>
                      <option value="maintenance">Maintenance</option>
                    </select>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

export default Sensors;
