import React from 'react';

const TAB_TITLES = {
  dashboard: ['Virtual OS Dashboard', 'Operating System Simulation & Resource Monitor'],
  processes: ['Process Management', 'Control & Inspection of Simulated System Processes'],
  scheduling: ['CPU Scheduling Simulation', 'Visualize Gantt Charts & Performance Metrics'],
  memory: ['Memory Management', 'Simulated RAM Allocation & Dynamic Partition Engine'],
  paging: ['Paging & Replacement', 'Simulated Page Faults & Frame History Engine'],
  deadlocks: ["Deadlock Management & Banker's Algorithm", 'Safety Analysis, Resource Requests & Resource Allocation Graph']
};

export default function Header({ currentTab, deadlockState, onSyncState }) {
  const [title, subtitle] = TAB_TITLES[currentTab] || ['Virtual OS Dashboard', 'Operating System Simulation & Resource Monitor'];
  const status = (deadlockState?.status || 'SAFE').toLowerCase();
  const statusLabel = `${deadlockState?.status || 'SAFE'} STATE`;

  return (
    <header className="top-header">
      <div className="header-titles">
        <h1 id="page-title">{title}</h1>
        <p id="page-subtitle">{subtitle}</p>
      </div>
      <div className="header-actions">
        <div className={`status-badge ${status}`} id="header-deadlock-badge">
          <span className="badge-dot"></span>
          <span id="header-deadlock-text">{statusLabel}</span>
        </div>
        <button className="btn btn-secondary btn-sm" id="btn-refresh-state" onClick={onSyncState}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <polyline points="23 4 23 10 17 10"></polyline>
            <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"></path>
          </svg>
          Sync State
        </button>
      </div>
    </header>
  );
}
