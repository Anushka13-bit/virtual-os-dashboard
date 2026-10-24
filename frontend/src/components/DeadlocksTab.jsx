import React, { useState } from 'react';

export default function DeadlocksTab({
  deadlockState,
  onRunSafetyCheck,
  onRunDeadlockDetection,
  onRequestResources,
  safetyResult,
  requestResult
}) {
  const deadlock = deadlockState || {
    status: 'SAFE',
    safe: true,
    deadlock_detected: false,
    explanation: 'System is currently in a safe state.',
    resources: ['CPU', 'Printer', 'Disk', 'Network'],
    available: { CPU: 10, Printer: 5, Disk: 7, Network: 4 },
    total_resources: { CPU: 10, Printer: 5, Disk: 7, Network: 4 },
    allocation: {},
    maximum: {},
    need: {}
  };

  const resources = deadlock.resources || ['CPU', 'Printer', 'Disk', 'Network'];
  const processKeys = Object.keys(deadlock.allocation || {});

  const [selectedPid, setSelectedPid] = useState(processKeys[0] || '');
  const [resourceRequests, setResourceRequests] = useState({});

  // Ensure selected PID stays valid
  const currentPid = processKeys.includes(selectedPid) ? selectedPid : (processKeys[0] || '');

  const handleResourceInputChange = (r, val) => {
    setResourceRequests((prev) => ({
      ...prev,
      [r]: parseInt(val, 10) || 0
    }));
  };

  const handleRequestSubmit = (e) => {
    e.preventDefault();
    if (!currentPid) return;
    const reqObj = {};
    resources.forEach((r) => {
      reqObj[r] = resourceRequests[r] || 0;
    });
    onRequestResources({ process_id: currentPid, request: reqObj });
  };

  const statusClass = (deadlock.status || 'SAFE').toLowerCase();

  // RAG SVG Layout Calculation
  const width = 760;
  const height = 300;
  const procPositions = {};
  processKeys.forEach((pid, idx) => {
    const y = (height / (processKeys.length + 1)) * (idx + 1);
    procPositions[pid] = { x: 140, y };
  });

  const resPositions = {};
  resources.forEach((r, idx) => {
    const y = (height / (resources.length + 1)) * (idx + 1);
    resPositions[r] = { x: 620, y };
  });

  return (
    <section id="view-deadlocks" className="tab-view active">
      {/* SECTION 1: SYSTEM STATUS BANNER */}
      <div className={`deadlock-status-banner ${statusClass}`} id="deadlockStatusBanner">
        <div className="status-banner-icon" id="deadlockBannerIcon">
          <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
            <polyline points="22 4 12 14.01 9 11.01"></polyline>
          </svg>
        </div>
        <div className="status-banner-content">
          <h2 id="deadlockBannerTitle">{deadlock.status} STATE</h2>
          <p id="deadlockBannerText">{deadlock.explanation}</p>
        </div>
        <div className="status-banner-actions">
          <button className="btn btn-light" id="btn-run-safety-check" onClick={onRunSafetyCheck}>
            RUN SAFETY CHECK
          </button>
          <button className="btn btn-dark" id="btn-run-detect-deadlock" onClick={onRunDeadlockDetection}>
            DETECT DEADLOCK
          </button>
        </div>
      </div>

      {/* SECTION 2: AVAILABLE RESOURCES CARDS */}
      <div className="margin-top-lg">
        <h3 className="section-title">Available Resources</h3>
        <div className="cards-grid margin-top-sm" id="availableResourcesCards">
          {resources.map((r) => (
            <div key={r} className="card metric-card">
              <div className="card-title">{r} Resource</div>
              <div className="card-value">
                {deadlock.available?.[r] ?? 0} / {deadlock.total_resources?.[r] ?? 0}
              </div>
              <div className="card-subtext">Available / Total</div>
            </div>
          ))}
        </div>
      </div>

      {/* SECTION 3, 4, 5: RESOURCE MATRICES */}
      <div className="grid-3col gap-md margin-top-lg">
        {/* ALLOCATION MATRIX */}
        <div className="card">
          <div className="card-header border-bottom">
            <h3 className="card-heading">Allocation Matrix</h3>
          </div>
          <div className="table-container">
            <table className="matrix-table" id="allocMatrixTable">
              <thead>
                <tr>
                  <th>Process</th>
                  {resources.map((r) => (
                    <th key={r}>{r}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {processKeys.length === 0 ? (
                  <tr>
                    <td colSpan={resources.length + 1} style={{ textAlign: 'center', color: 'var(--text-dim)' }}>
                      No active processes.
                    </td>
                  </tr>
                ) : (
                  processKeys.map((pid) => (
                    <tr key={pid}>
                      <td><span className="pid-tag">{pid}</span></td>
                      {resources.map((r) => (
                        <td key={r}>
                          <strong>{deadlock.allocation?.[pid]?.[r] ?? 0}</strong>
                        </td>
                      ))}
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* MAXIMUM MATRIX */}
        <div className="card">
          <div className="card-header border-bottom">
            <h3 className="card-heading">Maximum Matrix</h3>
          </div>
          <div className="table-container">
            <table className="matrix-table" id="maxMatrixTable">
              <thead>
                <tr>
                  <th>Process</th>
                  {resources.map((r) => (
                    <th key={r}>{r}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {processKeys.length === 0 ? (
                  <tr>
                    <td colSpan={resources.length + 1} style={{ textAlign: 'center', color: 'var(--text-dim)' }}>
                      No active processes.
                    </td>
                  </tr>
                ) : (
                  processKeys.map((pid) => (
                    <tr key={pid}>
                      <td><span className="pid-tag">{pid}</span></td>
                      {resources.map((r) => (
                        <td key={r}>
                          <strong>{deadlock.maximum?.[pid]?.[r] ?? 0}</strong>
                        </td>
                      ))}
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* NEED MATRIX */}
        <div className="card">
          <div className="card-header border-bottom">
            <h3 className="card-heading">Need Matrix (Max - Alloc)</h3>
          </div>
          <div className="table-container">
            <table className="matrix-table" id="needMatrixTable">
              <thead>
                <tr>
                  <th>Process</th>
                  {resources.map((r) => (
                    <th key={r}>{r}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {processKeys.length === 0 ? (
                  <tr>
                    <td colSpan={resources.length + 1} style={{ textAlign: 'center', color: 'var(--text-dim)' }}>
                      No active processes.
                    </td>
                  </tr>
                ) : (
                  processKeys.map((pid) => (
                    <tr key={pid}>
                      <td><span className="pid-tag">{pid}</span></td>
                      {resources.map((r) => (
                        <td key={r}>
                          <strong>{deadlock.need?.[pid]?.[r] ?? 0}</strong>
                        </td>
                      ))}
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* SECTION 6 & 7: BANKER'S SAFETY & RESOURCE REQUEST */}
      <div className="grid-2col gap-lg margin-top-lg">
        {/* BANKER'S SAFETY RESULT PANEL */}
        <div className="card">
          <div className="card-header border-bottom">
            <h3 className="card-heading">Banker's Safety Execution Result</h3>
          </div>
          <div className="card-body">
            <div className="safety-result-box" id="safetyResultBox">
              <div className="safe-sequence-display">
                <span className="label">Safe Sequence:</span>
                <div className="sequence-chips" id="safeSeqChips">
                  {safetyResult ? (
                    safetyResult.safe && safetyResult.safe_sequence?.length > 0 ? (
                      safetyResult.safe_sequence.map((pid, idx) => (
                        <React.Fragment key={pid}>
                          <span className="seq-chip">{pid}</span>
                          {idx < safetyResult.safe_sequence.length - 1 && ' \u2192 '}
                        </React.Fragment>
                      ))
                    ) : (
                      <span className="seq-chip" style={{ backgroundColor: 'var(--accent-red)' }}>
                        None
                      </span>
                    )
                  ) : (
                    <span style={{ color: 'var(--text-dim)', fontSize: '13px' }}>
                      Click "RUN SAFETY CHECK" to execute algorithm.
                    </span>
                  )}
                </div>
              </div>
              <p className="explanation-text margin-top-sm" id="safetyExplanation">
                {safetyResult ? safetyResult.explanation : 'Click "RUN SAFETY CHECK" to execute algorithm.'}
              </p>
            </div>
          </div>
        </div>

        {/* RESOURCE REQUEST FORM */}
        <div className="card">
          <div className="card-header border-bottom">
            <h3 className="card-heading">Resource Request Simulation</h3>
          </div>
          <div className="card-body">
            <form id="form-resource-request" onSubmit={handleRequestSubmit}>
              <div className="form-group">
                <label htmlFor="req-pid-select">Target Process</label>
                <select
                  id="req-pid-select"
                  className="form-control"
                  value={currentPid}
                  onChange={(e) => setSelectedPid(e.target.value)}
                  disabled={processKeys.length === 0}
                >
                  {processKeys.length === 0 ? (
                    <option value="">No Active Processes</option>
                  ) : (
                    processKeys.map((pid) => (
                      <option key={pid} value={pid}>
                        {pid}
                      </option>
                    ))
                  )}
                </select>
              </div>

              <div className="form-row-4col margin-top-sm" id="resourceInputsContainer">
                {resources.map((r) => (
                  <div key={r} className="form-group">
                    <label htmlFor={`req-res-${r}`}>{r}</label>
                    <input
                      type="number"
                      id={`req-res-${r}`}
                      className="form-control req-res-input"
                      value={resourceRequests[r] ?? 0}
                      min="0"
                      onChange={(e) => handleResourceInputChange(r, e.target.value)}
                    />
                  </div>
                ))}
              </div>

              <button
                type="submit"
                className="btn btn-primary btn-full margin-top-md"
                id="btn-submit-request"
                disabled={processKeys.length === 0}
              >
                REQUEST RESOURCES
              </button>
            </form>

            {requestResult && (
              <div
                id="requestResultBox"
                className={`request-result-alert margin-top-md ${requestResult.granted ? 'granted' : 'denied'}`}
              >
                {requestResult.granted ? (
                  <>
                    <strong>✓ REQUEST GRANTED:</strong> {requestResult.explanation}
                  </>
                ) : (
                  <>
                    <strong>✗ REQUEST DENIED:</strong> {requestResult.explanation}
                  </>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* SECTION 12: RESOURCE ALLOCATION GRAPH (RAG) */}
      <div className="card margin-top-lg">
        <div className="card-header border-bottom">
          <div>
            <h3 className="card-heading">Resource Allocation Graph (RAG)</h3>
            <p className="card-subheading">
              Interactive visual representation of process nodes, resource nodes, allocation edges, and request edges.
            </p>
          </div>
        </div>
        <div className="card-body">
          <div className="rag-container" id="ragSvgContainer">
            <svg id="ragSvg" width="100%" height="320" viewBox="0 0 800 320">
              <defs>
                <marker
                  id="arrow-alloc"
                  viewBox="0 0 10 10"
                  refX="15"
                  refY="5"
                  markerWidth="6"
                  markerHeight="6"
                  orient="auto-start-reverse"
                >
                  <path d="M 0 0 L 10 5 L 0 10 z" fill="#10b981" />
                </marker>
                <marker
                  id="arrow-req"
                  viewBox="0 0 10 10"
                  refX="15"
                  refY="5"
                  markerWidth="6"
                  markerHeight="6"
                  orient="auto-start-reverse"
                >
                  <path d="M 0 0 L 10 5 L 0 10 z" fill="#f59e0b" />
                </marker>
              </defs>

              {processKeys.length === 0 || resources.length === 0 ? (
                <text x="50%" y="50%" textAnchor="middle" fill="#9ca3af">
                  No active processes for graph visualization.
                </text>
              ) : (
                <>
                  {/* Edges */}
                  {processKeys.map((pid) => {
                    const pPos = procPositions[pid];
                    return resources.map((r) => {
                      const rPos = resPositions[r];
                      const allocCount = deadlock.allocation?.[pid]?.[r] || 0;
                      const needCount = deadlock.need?.[pid]?.[r] || 0;

                      return (
                        <React.Fragment key={`${pid}-${r}`}>
                          {allocCount > 0 && (
                            <line
                              x1={rPos.x}
                              y1={rPos.y}
                              x2={pPos.x}
                              y2={pPos.y}
                              stroke="#10b981"
                              strokeWidth={Math.min(4, 1 + allocCount)}
                              markerEnd="url(#arrow-alloc)"
                              opacity="0.85"
                            />
                          )}
                          {needCount > 0 && (
                            <line
                              x1={pPos.x}
                              y1={pPos.y}
                              x2={rPos.x}
                              y2={rPos.y}
                              stroke="#f59e0b"
                              strokeWidth={Math.min(4, 1 + needCount)}
                              strokeDasharray="4,4"
                              markerEnd="url(#arrow-req)"
                              opacity="0.85"
                            />
                          )}
                        </React.Fragment>
                      );
                    });
                  })}

                  {/* Process Nodes (Circles) */}
                  {processKeys.map((pid) => {
                    const pos = procPositions[pid];
                    return (
                      <g key={pid} transform={`translate(${pos.x}, ${pos.y})`}>
                        <circle r="24" fill="#1f2937" stroke="#3b82f6" strokeWidth="3" />
                        <text textAnchor="middle" dy="4" fill="#f9fafb" fontWeight="700" fontSize="13">
                          {pid}
                        </text>
                      </g>
                    );
                  })}

                  {/* Resource Nodes (Rectangles) */}
                  {resources.map((r) => {
                    const pos = resPositions[r];
                    const avail = deadlock.available?.[r] ?? 0;
                    const total = deadlock.total_resources?.[r] ?? 0;
                    return (
                      <g key={r} transform={`translate(${pos.x}, ${pos.y})`}>
                        <rect x="-40" y="-20" width="80" height="40" rx="6" fill="#1f2937" stroke="#8b5cf6" strokeWidth="3" />
                        <text textAnchor="middle" dy="-2" fill="#f9fafb" fontWeight="600" fontSize="12">
                          {r}
                        </text>
                        <text textAnchor="middle" dy="12" fill="#9ca3af" fontSize="10">
                          {avail}/{total} avail
                        </text>
                      </g>
                    );
                  })}
                </>
              )}
            </svg>
          </div>
          <div className="rag-legend margin-top-sm">
            <span className="rag-legend-item">
              <span className="legend-circle proc"></span> Process Node
            </span>
            <span className="rag-legend-item">
              <span className="legend-square res"></span> Resource Node
            </span>
            <span className="rag-legend-item">
              <span className="legend-line alloc"></span> Allocation (Resource &rarr; Process)
            </span>
            <span className="rag-legend-item">
              <span className="legend-line req"></span> Request (Process &rarr; Resource)
            </span>
          </div>
        </div>
      </div>
    </section>
  );
}
