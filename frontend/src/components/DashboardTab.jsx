import React, { useEffect, useRef } from 'react';

export default function DashboardTab({
  systemState,
  cpuHistory,
  eventLogs,
  onClearLogs,
  onSwitchTab,
}) {
  const canvasRef = useRef(null);

  const cpu = systemState?.cpu || { usage_pct: 0, ticks: 0, active_processes: 0 };
  const mem = systemState?.memory || { total_mb: 1024, used_mb: 0, utilization_pct: 0 };
  const paging = systemState?.paging || { page_faults: 0, page_hits: 0, hit_ratio_pct: 0 };
  const deadlock = systemState?.deadlock || { status: 'SAFE', safe: true, explanation: 'All resources allocated safely' };
  const processes = systemState?.processes || [];

  const cpuVal = cpu.usage_pct || 0;

  // Render CPU Chart on canvas whenever cpuHistory changes
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const parentWidth = canvas.parentElement?.clientWidth || 400;
    const w = (canvas.width = parentWidth);
    const h = (canvas.height = 180);

    ctx.clearRect(0, 0, w, h);

    // Background Grid Lines
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.05)';
    ctx.lineWidth = 1;
    for (let y = 0; y <= h; y += 45) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(w, y);
      ctx.stroke();
    }

    if (cpuHistory.length === 0) return;

    // Draw Line Chart
    const step = w / Math.max(1, cpuHistory.length - 1);
    ctx.beginPath();
    cpuHistory.forEach((val, idx) => {
      const x = idx * step;
      const y = h - (val / 100) * (h - 20) - 10;
      if (idx === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    });

    ctx.strokeStyle = '#3b82f6';
    ctx.lineWidth = 2.5;
    ctx.stroke();

    // Gradient fill
    ctx.lineTo(w, h);
    ctx.lineTo(0, h);
    ctx.closePath();
    const grad = ctx.createLinearGradient(0, 0, 0, h);
    grad.addColorStop(0, 'rgba(59, 130, 246, 0.3)');
    grad.addColorStop(1, 'rgba(59, 130, 246, 0.0)');
    ctx.fillStyle = grad;
    ctx.fill();
  }, [cpuHistory]);

  return (
    <section id="view-dashboard" className="tab-view active">
      {/* SUMMARY CARDS */}
      <div className="cards-grid">
        <div className="card metric-card">
          <div className="card-header">
            <span className="card-title">CPU Usage</span>
            <div className="card-icon cpu-icon">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <rect x="4" y="4" width="16" height="16" rx="2" ry="2"></rect>
                <rect x="9" y="9" width="6" height="6"></rect>
                <line x1="9" y1="1" x2="9" y2="4"></line>
                <line x1="15" y1="1" x2="15" y2="4"></line>
                <line x1="9" y1="20" x2="9" y2="23"></line>
                <line x1="15" y1="20" x2="15" y2="23"></line>
                <line x1="20" y1="9" x2="23" y2="9"></line>
                <line x1="20" y1="15" x2="23" y2="15"></line>
                <line x1="1" y1="9" x2="4" y2="9"></line>
                <line x1="1" y1="15" x2="4" y2="15"></line>
              </svg>
            </div>
          </div>
          <div className="card-value" id="card-cpu-val">{cpuVal.toFixed(1)}%</div>
          <div className="progress-bar-container">
            <div className="progress-bar" id="card-cpu-bar" style={{ width: `${Math.min(100, cpuVal)}%` }}></div>
          </div>
        </div>

        <div className="card metric-card">
          <div className="card-header">
            <span className="card-title">Memory Usage</span>
            <div className="card-icon mem-icon">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M6 19v-3a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v3s0 2-2 2H8a2 2 0 0 1-2-2z"></path>
                <path d="M6 5v3a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V5s0-2-2-2H8a2 2 0 0 0-2 2z"></path>
              </svg>
            </div>
          </div>
          <div className="card-value" id="card-mem-val">{mem.used_mb} / {mem.total_mb} MB</div>
          <div className="progress-bar-container">
            <div className="progress-bar green" id="card-mem-bar" style={{ width: `${mem.utilization_pct}%` }}></div>
          </div>
        </div>

        <div className="card metric-card">
          <div className="card-header">
            <span className="card-title">Active Processes</span>
            <div className="card-icon proc-icon">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
                <circle cx="9" cy="7" r="4"></circle>
                <path d="M23 21v-2a4 4 0 0 0-3-3.87"></path>
                <path d="M16 3.13a4 4 0 0 1 0 7.75"></path>
              </svg>
            </div>
          </div>
          <div className="card-value" id="card-proc-val">{processes.length}</div>
          <div className="card-subtext" id="card-proc-sub">{processes.length} Active Processes</div>
        </div>

        <div className="card metric-card">
          <div className="card-header">
            <span className="card-title">Page Faults</span>
            <div className="card-icon fault-icon">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path>
                <line x1="12" y1="9" x2="12" y2="13"></line>
                <line x1="12" y1="17" x2="12.01" y2="17"></line>
              </svg>
            </div>
          </div>
          <div className="card-value" id="card-fault-val">{paging.page_faults}</div>
          <div className="card-subtext" id="card-hit-sub">
            {paging.hit_ratio_pct}% hit ratio ({paging.page_hits} hits)
          </div>
        </div>

        <div className="card metric-card">
          <div className="card-header">
            <span className="card-title">Deadlock Status</span>
            <div className="card-icon deadlock-icon">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect>
                <path d="M7 11V7a5 5 0 0 1 10 0v4"></path>
              </svg>
            </div>
          </div>
          <div className="card-value" id="card-deadlock-val">{deadlock.status}</div>
          <div className="card-subtext" id="card-deadlock-sub">
            {deadlock.safe ? 'All resources allocated safely' : deadlock.explanation}
          </div>
        </div>
      </div>

      {/* CHARTS & OVERVIEW ROW */}
      <div className="grid-2col gap-lg margin-top-lg">
        {/* CPU ACTIVITY CHART CARD */}
        <div className="card">
          <div className="card-header border-bottom">
            <h3 className="card-heading">CPU Activity Monitor</h3>
            <span className="badge badge-primary">Real-time</span>
          </div>
          <div className="chart-box">
            <canvas ref={canvasRef} height="180"></canvas>
          </div>
        </div>

        {/* SYSTEM LOG & EVENT PANEL */}
        <div className="card">
          <div className="card-header border-bottom">
            <h3 className="card-heading">System Event Log</h3>
            <button className="btn btn-ghost btn-xs" id="btn-clear-log" onClick={onClearLogs}>
              Clear
            </button>
          </div>
          <div className="event-log-container" id="eventLogBox">
            {eventLogs.map((log) => (
              <div key={log.id} className={`log-entry ${log.type}`}>
                <span className="log-time">{log.time}</span> {log.text}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ACTIVE PROCESSES TABLE */}
      <div className="card margin-top-lg">
        <div className="card-header border-bottom">
          <h3 className="card-heading">Active Processes Overview</h3>
          <a
            href="#processes"
            className="link-btn"
            onClick={(e) => {
              e.preventDefault();
              onSwitchTab('processes');
            }}
          >
            Manage Processes &rarr;
          </a>
        </div>
        <div className="table-container">
          <table className="data-table" id="dashProcessTable">
            <thead>
              <tr>
                <th>PID</th>
                <th>Process Name</th>
                <th>Arrival Time</th>
                <th>Burst Time</th>
                <th>Priority</th>
                <th>Memory (MB)</th>
                <th>State</th>
              </tr>
            </thead>
            <tbody>
              {processes.length === 0 ? (
                <tr>
                  <td colSpan="7" style={{ textAlign: 'center', color: 'var(--text-dim)' }}>
                    No active processes in system.
                  </td>
                </tr>
              ) : (
                processes.map((p) => (
                  <tr key={p.pid}>
                    <td><span className="pid-tag">{p.pid}</span></td>
                    <td><strong>{p.name}</strong></td>
                    <td>{p.arrival_time} ms</td>
                    <td>{p.burst_time} ms</td>
                    <td>{p.priority}</td>
                    <td>{p.memory_required} MB</td>
                    <td><span className={`badge-state ${p.state}`}>{p.state}</span></td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  );
}
