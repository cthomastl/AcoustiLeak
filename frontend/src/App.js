import React, { useState } from 'react';
import Dashboard from './pages/Dashboard';
import Sensors from './pages/Sensors';
import Alerts from './pages/Alerts';
import Simulate from './pages/Simulate';
import './App.css';

const TABS = [
  { id: 'dashboard', label: 'Dashboard' },
  { id: 'sensors', label: 'Sensors' },
  { id: 'alerts', label: 'Alerts' },
  { id: 'simulate', label: 'Simulate' },
];

function App() {
  const [activeTab, setActiveTab] = useState('dashboard');

  const renderPage = () => {
    switch (activeTab) {
      case 'sensors': return <Sensors />;
      case 'alerts': return <Alerts />;
      case 'simulate': return <Simulate />;
      default: return <Dashboard />;
    }
  };

  return (
    <div className="app">
      <header className="app-header">
        <div className="logo">
          <div className="logo-icon">AL</div>
          <div>
            <h1>AcoustiLeak</h1>
            <span className="tagline">Pipeline Gas Leak Detection</span>
          </div>
        </div>
        <nav className="nav-tabs">
          {TABS.map(tab => (
            <button
              key={tab.id}
              className={`nav-tab ${activeTab === tab.id ? 'active' : ''}`}
              onClick={() => setActiveTab(tab.id)}
            >
              {tab.label}
            </button>
          ))}
        </nav>
      </header>
      <main className="app-main">
        {renderPage()}
      </main>
    </div>
  );
}

export default App;
