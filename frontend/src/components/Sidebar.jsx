import React from 'react';

export default function Sidebar({ currentTab, onSelectTab, connectionStatus }) {
  const navItems = [
    {
      id: 'dashboard',
      label: 'Dashboard',
      icon: (
        <svg className="nav-icon" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <rect x="3" y="3" width="7" height="7"></rect>
          <rect x="14" y="3" width="7" height="7"></rect>
          <rect x="14" y="14" width="7" height="7"></rect>
          <rect x="3" y="14" width="7" height="7"></rect>
        </svg>
      )
    },
    {
      id: 'processes',
      label: 'Processes',
      icon: (
        <svg className="nav-icon" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M12 2H2v10h10V2zM22 2h-8v6h8V2zM22 12h-8v10h8V12zM12 16H2v6h10v-6z"></path>
        </svg>
      )
    },
    {
      id: 'scheduling',
      label: 'Scheduling',
      icon: (
        <svg className="nav-icon" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <polyline points="22 12 18 12 15 21 9 3 6 12 2 12"></polyline>
        </svg>
      )
    },
    {
      id: 'memory',
      label: 'Memory',
      icon: (
        <svg className="nav-icon" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M6 19v-3b0 0 1 2-2h12a2 2 0 0 1 2 2v3s0 2-2 2H8a2 2 0 0 1-2-2z"></path>
          <path d="M6 5v3a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V5s0-2-2-2H8a2 2 0 0 0-2 2z"></path>
          <line x1="12" y1="10" x2="12" y2="14"></line>
        </svg>
      )
    },
    {
      id: 'paging',
      label: 'Paging',
      icon: (
        <svg className="nav-icon" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
          <polyline points="14 2 14 8 20 8"></polyline>
          <line x1="16" y1="13" x2="8" y2="13"></line>
          <line x1="16" y1="17" x2="8" y2="17"></line>
        </svg>
      )
    },
    {
      id: 'deadlocks',
      label: 'Deadlocks',
      icon: (
        <svg className="nav-icon" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect>
          <path d="M7 11V7a5 5 0 0 1 10 0v4"></path>
        </svg>
      )
    }
  ];

  return (
    <aside className="sidebar">
      <div className="brand">
        <div className="brand-icon">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <rect x="2" y="3" width="20" height="14" rx="2" ry="2"></rect>
            <line x1="8" y1="21" x2="16" y2="21"></line>
            <line x1="12" y1="17" x2="12" y2="21"></line>
          </svg>
        </div>
        <div className="brand-text">
          <span className="title">VIRTUAL OS</span>
          <span className="subtitle">Simulated Core v1.0</span>
        </div>
      </div>

      <nav className="nav-menu">
        {navItems.map((item) => (
          <a
            key={item.id}
            href={`#${item.id}`}
            className={`nav-item ${currentTab === item.id ? 'active' : ''}`}
            data-tab={item.id}
            onClick={(e) => {
              e.preventDefault();
              onSelectTab(item.id);
            }}
          >
            {item.icon}
            {item.label}
          </a>
        ))}
      </nav>

      <div className="sidebar-footer">
        <div className="system-indicator">
          <span className="pulse-dot"></span>
          <span id="sys-status-text">{connectionStatus}</span>
        </div>
      </div>
    </aside>
  );
}
