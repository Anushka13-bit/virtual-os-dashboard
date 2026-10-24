import React from 'react';

export default function ProcessesTab({ processes, onOpenCreateModal, onDeleteProcess }) {
  return (
    <section id="view-processes" className="tab-view active">
      <div className="card">
        <div className="card-header border-bottom">
          <div>
            <h3 className="card-heading">Process Control Panel</h3>
            <p className="card-subheading">Add, inspect, or terminate simulated processes in the central OS state.</p>
          </div>
          <button className="btn btn-primary" id="btn-open-create-modal" onClick={onOpenCreateModal}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="12" y1="5" x2="12" y2="19"></line>
              <line x1="5" y1="12" x2="19" y2="12"></line>
            </svg>
            Create Process
          </button>
        </div>

        <div className="table-container">
          <table className="data-table" id="fullProcessTable">
            <thead>
              <tr>
                <th>PID</th>
                <th>Process Name</th>
                <th>Arrival Time</th>
                <th>Burst Time</th>
                <th>Priority</th>
                <th>Memory Req (MB)</th>
                <th>State</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {processes.length === 0 ? (
                <tr>
                  <td colSpan="8" style={{ textAlign: 'center', color: 'var(--text-dim)' }}>
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
                    <td>
                      <button
                        className="btn btn-danger btn-xs"
                        onClick={() => onDeleteProcess(p.pid)}
                      >
                        Delete
                      </button>
                    </td>
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
