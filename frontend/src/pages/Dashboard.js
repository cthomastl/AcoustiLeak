import React, { useState, useEffect } from 'react';
import { getDashboard, getHealth } from '../services/api';

const SEVERITY_STYLES = {
  critical: 'bg-red-50 text-red-700 ring-red-600/20',
  high: 'bg-orange-50 text-orange-700 ring-orange-600/20',
  medium: 'bg-yellow-50 text-yellow-700 ring-yellow-600/20',
  low: 'bg-blue-50 text-blue-700 ring-blue-600/20',
};

const CLASSIFICATION_STYLES = {
  leak_suspected: 'bg-red-50 text-red-700 ring-red-600/20',
  leak_confirmed: 'bg-red-100 text-red-800 ring-red-700/20',
  normal: 'bg-green-50 text-green-700 ring-green-600/20',
  wind: 'bg-gray-50 text-gray-700 ring-gray-600/20',
  machinery: 'bg-yellow-50 text-yellow-700 ring-yellow-600/20',
  bird: 'bg-blue-50 text-blue-700 ring-blue-600/20',
};

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
      <div className="flex items-center justify-center py-20">
        <div className="text-center">
          <div className="inline-block w-8 h-8 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin" />
          <p className="mt-3 text-sm text-gray-500">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  const sensorCounts = data?.sensor_counts || {};
  const alertCounts = data?.alert_counts || {};
  const totalSensors = Object.values(sensorCounts).reduce((a, b) => a + b, 0);
  const totalAlerts = data?.total_active_alerts || 0;
  const recentLeaks = data?.recent_leak_detections || [];

  const stats = [
    {
      label: 'Total Sensors',
      value: totalSensors,
      color: 'text-indigo-600',
      bg: 'bg-indigo-50',
      icon: 'M9 3v2m6-2v2M9 19v2m6-2v2M5 9H3m2 6H3m18-6h-2m2 6h-2M7 19h10a2 2 0 002-2V7a2 2 0 00-2-2H7a2 2 0 00-2 2v10a2 2 0 002 2zM9 9h6v6H9V9z',
    },
    {
      label: 'Active Sensors',
      value: sensorCounts.active || 0,
      color: 'text-green-600',
      bg: 'bg-green-50',
      icon: 'M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z',
    },
    {
      label: 'Active Alerts',
      value: totalAlerts,
      color: totalAlerts > 0 ? 'text-red-600' : 'text-green-600',
      bg: totalAlerts > 0 ? 'bg-red-50' : 'bg-green-50',
      icon: 'M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9',
    },
    {
      label: 'Critical Alerts',
      value: alertCounts.critical || 0,
      color: 'text-amber-600',
      bg: 'bg-amber-50',
      icon: 'M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.34 16.5c-.77.833.192 2.5 1.732 2.5z',
    },
  ];

  return (
    <div className="space-y-6">
      {error && (
        <div className="rounded-lg bg-red-50 border border-red-200 p-4">
          <p className="text-sm text-red-700">{error}</p>
        </div>
      )}

      {/* System Status */}
      <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
        <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">System Status</h2>
        <div className="flex items-center gap-6">
          <div className="flex items-center gap-2">
            <span className={`inline-block w-2 h-2 rounded-full ${health ? 'bg-green-500' : 'bg-red-500'}`} />
            <span className="text-sm font-medium text-gray-700">
              API Gateway: {health ? 'Online' : 'Offline'}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <span className="inline-block w-2 h-2 rounded-full bg-gray-400" />
            <span className="text-sm text-gray-500">
              Database: {health?.database || 'unknown'}
            </span>
          </div>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map(stat => (
          <div key={stat.label} className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-500">{stat.label}</p>
                <p className={`text-3xl font-bold mt-1 ${stat.color}`}>{stat.value}</p>
              </div>
              <div className={`${stat.bg} rounded-lg p-2.5`}>
                <svg className={`w-5 h-5 ${stat.color}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d={stat.icon} />
                </svg>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Alert Breakdown */}
      {totalAlerts > 0 && (
        <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
          <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-4">Active Alert Breakdown</h2>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {['critical', 'high', 'medium', 'low'].map(sev => (
              <div key={sev} className="flex items-center justify-between px-4 py-3 bg-gray-50 rounded-lg">
                <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ring-1 ring-inset ${SEVERITY_STYLES[sev]}`}>
                  {sev}
                </span>
                <span className="text-lg font-bold text-gray-900">{alertCounts[sev] || 0}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Recent Leak Detections */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm">
        <div className="px-5 py-4 border-b border-gray-100">
          <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Recent Leak Detections</h2>
        </div>
        {recentLeaks.length === 0 ? (
          <div className="px-5 py-12 text-center">
            <svg className="mx-auto h-10 w-10 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2z" />
            </svg>
            <p className="mt-3 text-sm text-gray-500">No leak detections recorded yet. Use the Simulate tab to test.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead>
                <tr className="bg-gray-50">
                  <th className="px-5 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Time</th>
                  <th className="px-5 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Sensor</th>
                  <th className="px-5 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Pipeline</th>
                  <th className="px-5 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Classification</th>
                  <th className="px-5 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Confidence</th>
                  <th className="px-5 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Peak Freq (Hz)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {recentLeaks.map(r => (
                  <tr key={r.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-5 py-3.5 text-sm text-gray-500 whitespace-nowrap">{new Date(r.timestamp).toLocaleString()}</td>
                    <td className="px-5 py-3.5 text-sm font-medium text-gray-900">{r.sensor_name}</td>
                    <td className="px-5 py-3.5 text-sm text-gray-600">{r.pipeline_id}</td>
                    <td className="px-5 py-3.5">
                      <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ring-1 ring-inset ${CLASSIFICATION_STYLES[r.classification] || 'bg-gray-50 text-gray-700 ring-gray-600/20'}`}>
                        {r.classification}
                      </span>
                    </td>
                    <td className="px-5 py-3.5 text-sm font-medium text-gray-900">{(r.leak_confidence * 100).toFixed(1)}%</td>
                    <td className="px-5 py-3.5 text-sm text-gray-600">{r.peak_frequency_hz?.toFixed(0)}</td>
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
