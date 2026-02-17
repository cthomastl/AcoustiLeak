import React, { useState, useEffect } from 'react';
import { getSensors, updateSensor } from '../services/api';

const STATUS_STYLES = {
  active: 'bg-green-50 text-green-700 ring-green-600/20',
  inactive: 'bg-gray-50 text-gray-600 ring-gray-500/20',
  maintenance: 'bg-amber-50 text-amber-700 ring-amber-600/20',
};

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

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="text-center">
          <div className="inline-block w-8 h-8 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin" />
          <p className="mt-3 text-sm text-gray-500">Loading sensors...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {error && (
        <div className="rounded-lg bg-red-50 border border-red-200 p-4">
          <p className="text-sm text-red-700">{error}</p>
        </div>
      )}

      <div className="bg-white rounded-xl border border-gray-200 shadow-sm">
        <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
          <div>
            <h2 className="text-base font-semibold text-gray-900">Pipeline Sensors</h2>
            <p className="text-sm text-gray-500 mt-0.5">{sensors.length} sensors registered</p>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead>
              <tr className="bg-gray-50">
                <th className="px-5 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">ID</th>
                <th className="px-5 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Name</th>
                <th className="px-5 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Pipeline</th>
                <th className="px-5 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Location</th>
                <th className="px-5 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Coordinates</th>
                <th className="px-5 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Status</th>
                <th className="px-5 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Installed</th>
                <th className="px-5 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {sensors.map(s => (
                <tr key={s.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-5 py-3.5 text-sm text-gray-500 font-mono">{s.id}</td>
                  <td className="px-5 py-3.5 text-sm font-semibold text-gray-900">{s.sensor_name}</td>
                  <td className="px-5 py-3.5 text-sm text-gray-600">{s.pipeline_id}</td>
                  <td className="px-5 py-3.5 text-sm text-gray-600">{s.location_description}</td>
                  <td className="px-5 py-3.5 text-xs text-gray-400 font-mono">
                    {s.location_lat && s.location_lng
                      ? `${Number(s.location_lat).toFixed(4)}, ${Number(s.location_lng).toFixed(4)}`
                      : '\u2014'}
                  </td>
                  <td className="px-5 py-3.5">
                    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ring-1 ring-inset ${STATUS_STYLES[s.status] || 'bg-gray-50 text-gray-600 ring-gray-500/20'}`}>
                      {s.status}
                    </span>
                  </td>
                  <td className="px-5 py-3.5 text-xs text-gray-500">{new Date(s.installed_at).toLocaleDateString()}</td>
                  <td className="px-5 py-3.5">
                    <select
                      value={s.status}
                      onChange={e => handleStatusChange(s.id, e.target.value)}
                      className="block rounded-md border border-gray-300 bg-white py-1.5 px-2.5 text-xs text-gray-700 shadow-sm focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 focus:outline-none"
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
