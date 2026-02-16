/**
 * API service for communicating with AcoustiLeak backend.
 */

const API_BASE = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

async function fetchJson(url, options = {}) {
  const res = await fetch(url, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  });
  if (!res.ok) {
    const error = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error(error.error || `HTTP ${res.status}`);
  }
  return res.json();
}

// Health
export const getHealth = () => fetchJson(`${API_BASE}/health`);

// Dashboard
export const getDashboard = () => fetchJson(`${API_BASE}/dashboard`);

// Sensors
export const getSensors = () => fetchJson(`${API_BASE}/sensors`);
export const getSensor = (id) => fetchJson(`${API_BASE}/sensors/${id}`);
export const createSensor = (data) =>
  fetchJson(`${API_BASE}/sensors`, { method: 'POST', body: JSON.stringify(data) });
export const updateSensor = (id, data) =>
  fetchJson(`${API_BASE}/sensors/${id}`, { method: 'PUT', body: JSON.stringify(data) });

// Readings
export const getReadings = (params = {}) => {
  const qs = new URLSearchParams(params).toString();
  return fetchJson(`${API_BASE}/readings${qs ? `?${qs}` : ''}`);
};
export const analyzeAudio = (data) =>
  fetchJson(`${API_BASE}/readings/analyze`, { method: 'POST', body: JSON.stringify(data) });

// Alerts
export const getAlerts = (params = {}) => {
  const qs = new URLSearchParams(params).toString();
  return fetchJson(`${API_BASE}/alerts${qs ? `?${qs}` : ''}`);
};
export const acknowledgeAlert = (id, data = {}) =>
  fetchJson(`${API_BASE}/alerts/${id}/acknowledge`, { method: 'PUT', body: JSON.stringify(data) });
