import React, { useState } from 'react';

export default function DeadlocksTab({
  deadlockState,
  onRequestResources,
  onRunSafetyCheck,
  onRunDeadlockDetection,
  onLoadScenario,
  onReleaseResources,
  onCompleteProcess,
  safetyResult,
  requestResult,
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
    need: {},
    request: {},
    involved_processes: [],
    involved_resources: [],
  };

  const resources = deadlock.resources || ['CPU', 'Printer', 'Disk', 'Network'];
  const processKeys = Object.keys(deadlock.allocation || {});

  const [selectedPid, setSelectedPid] = useState(processKeys[0] || '');
  const [selectedMode, setSelectedMode] = useState('banker'); // 'banker' | 'simulate'
  const [resourceRequests, setResourceRequests] = useState({});

  // Ensure selected PID stays valid
  const currentPid = processKeys.includes(selectedPid) ? selectedPid : (processKeys[0] || '');

  const handleResourceInputChange = (r, val) => {
    setResourceRequests((prev) => ({
      ...prev,
      [r]: Math.max(0, parseInt(val, 10) || 0),
    }));
  };

  const handleRequestSubmit = (e) => {
    e.preventDefault();
    if (!currentPid) return;
    const reqObj = {};
    resources.forEach((r) => {
      reqObj[r] = resourceRequests[r] || 0;
    });
    onRequestResources({ process_id: currentPid, request: reqObj, mode: selectedMode });
  };

  const handleReleaseAll = () => {
    if (!currentPid || !onReleaseResources) return;
    onReleaseResources({ process_id: currentPid });
  };

  const handleComplete = () => {
    if (!currentPid || !onCompleteProcess) return;
    onCompleteProcess(currentPid);
  };

  const statusClass = (deadlock.status || 'SAFE').toLowerCase();

  // RAG SVG Layout Calculation
  const height = 300;
  const procPositions = {};
  processKeys.forEach((pid, idx) => {
    const y = (height / (processKeys.length + 1)) * (idx + 1);
    procPositions[pid] = { x: 150, y };
  });

  const resPositions = {};
  resources.forEach((r, idx) => {
    const y = (height / (resources.length + 1)) * (idx + 1);
    resPositions[r] = { x: 650, y };
  });

  const deadlockedPids = new Set(deadlock.involved_processes || []);
  const deadlockedRes = new Set(deadlock.involved_resources || []);

  return (
    <section id="view-deadlocks" className="tab-view active">
      {/* SECTION 1: SYSTEM STATUS BANNER & CONTROLS */}
      <div className={`deadlock-status-banner ${statusClass}`} id="deadlockStatusBanner">
        <div className="status-banner-icon" id="deadlockBannerIcon">
          {deadlock.status === 'DEADLOCK' ? (
            <svg width="34" height="34" viewBox="0 0 24 24" fill="none" stroke="#ef4444" strokeWidth="2.5">
              <circle cx="12" cy="12" r="10" />
              <line x1="15" y1="9" x2="9" y2="15" />
              <line x1="9" y1="9" x2="15" y2="15" />
            </svg>
          ) : deadlock.status === 'UNSAFE' ? (
            <svg width="34" height="34" viewBox="0 0 24 24" fill="none" stroke="#f59e0b" strokeWidth="2.5">
              <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
              <line x1="12" y1="9" x2="12" y2="13" />
              <line x1="12" y1="17" x2="12.01" y2="17" />
            </svg>
          ) : (
            <svg width="34" height="34" viewBox="0 0 24 24" fill="none" stroke="#10b981" strokeWidth="2.5">
              <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
              <polyline points="22 4 12 14.01 9 11.01" />
            </svg>
          )}
        </div>
        <div className="status-banner-content" style={{ flex: 1 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <h2 id="deadlockBannerTitle" style={{ margin: 0 }}>
              {deadlock.status} STATE
            </h2>
            <span
              className={`badge-state ${
                deadlock.status === 'SAFE' ? 'RUNNING' : deadlock.status === 'DEADLOCK' ? 'TERMINATED' : 'NEW'
              }`}
              style={{ fontSize: '11px', padding: '2px 8px' }}
            >
              {deadlock.status === 'DEADLOCK'
                ? 'CIRCULAR WAIT DETECTED'
                : deadlock.status === 'UNSAFE'
                ? 'NO SAFE SEQUENCE'
                : 'SAFE SEQUENCE AVAILABLE'}
            </span>
          </div>
          <p id="deadlockBannerText" style={{ margin: '6px 0 0 0', lineHeight: 1.4 }}>
            {deadlock.explanation}
          </p>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', minWidth: '180px' }}>
          <button
            type="button"
            className="btn btn-light"
            id="btn-run-safety-check"
            style={{ fontWeight: 600, padding: '7px 14px' }}
            onClick={() => onRunSafetyCheck && onRunSafetyCheck()}
          >
            RUN SAFETY CHECK
          </button>
          <button
            type="button"
            className="btn btn-dark"
            id="btn-run-detect-deadlock"
            style={{ fontWeight: 600, padding: '7px 14px' }}
            onClick={() => onRunDeadlockDetection && onRunDeadlockDetection()}
          >
            DETECT DEADLOCK
          </button>
        </div>
      </div>

      {/* PEDAGOGICAL SCENARIOS ROW */}
      <div
        className="card margin-top-sm"
        style={{
          padding: '10px 16px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '10px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-dim)' }}>
            DEMO SCENARIOS:
          </span>
        </div>
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
          <button
            type="button"
            className="btn btn-dark"
            style={{ fontSize: '12px', padding: '4px 10px' }}
            onClick={() => onLoadScenario && onLoadScenario('safe')}
          >
            Load Safe Scenario
          </button>
          <button
            type="button"
            className="btn btn-dark"
            style={{ fontSize: '12px', padding: '4px 10px' }}
            onClick={() => onLoadScenario && onLoadScenario('unsafe')}
          >
            Load Unsafe Scenario
          </button>
          <button
            type="button"
            className="btn btn-dark"
            style={{ fontSize: '12px', padding: '4px 10px' }}
            onClick={() => onLoadScenario && onLoadScenario('deadlock')}
          >
            Load Deadlock Scenario
          </button>
          <button
            type="button"
            className="btn btn-dark"
            style={{ fontSize: '12px', padding: '4px 10px' }}
            onClick={() => onLoadScenario && onLoadScenario('reset')}
          >
            Reset All
          </button>
        </div>
      </div>

      {/* SECTION 2: AVAILABLE RESOURCES CARDS */}
      <div className="margin-top-md">
        <h3 className="section-title">Available Vector (Unallocated Capacity)</h3>
        <div className="cards-grid margin-top-sm" id="availableResourcesCards">
          {resources.map((r) => {
            const avail = deadlock.available?.[r] ?? 0;
            const total = deadlock.total_resources?.[r] ?? 0;
            const isExhausted = avail === 0;
            return (
              <div
                key={r}
                className="card metric-card"
                style={{ border: isExhausted ? '1px solid rgba(239, 68, 68, 0.4)' : undefined }}
              >
                <div className="card-title" style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span>{r} Resource</span>
                  {isExhausted && <span style={{ color: '#ef4444', fontSize: '10px', fontWeight: 700 }}>EXHAUSTED</span>}
                </div>
                <div className={`card-value ${isExhausted ? 'color-orange' : 'color-green'}`}>
                  {avail} / {total}
                </div>
                <div className="card-subtext">Available / Total System Capacity</div>
              </div>
            );
          })}
        </div>
      </div>

      {/* SECTION 3: FOUR SYNCHRONIZED RESOURCE MATRICES */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '16px', marginTop: '20px' }}>
        {/* 1. ALLOCATION MATRIX */}
        <div className="card">
          <div className="card-header border-bottom">
            <h3 className="card-heading">Allocation Matrix (Held)</h3>
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

        {/* 2. MAXIMUM MATRIX */}
        <div className="card">
          <div className="card-header border-bottom">
            <h3 className="card-heading">Maximum Matrix (Declared)</h3>
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

        {/* 3. NEED MATRIX */}
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

        {/* 4. REQUEST MATRIX (WAITING) */}
        <div className="card" style={{ border: deadlock.status === 'DEADLOCK' ? '1px solid rgba(239, 68, 68, 0.4)' : undefined }}>
          <div className="card-header border-bottom">
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <h3 className="card-heading">Request Matrix (Waiting)</h3>
              {deadlock.status === 'DEADLOCK' && (
                <span className="badge-state TERMINATED" style={{ fontSize: '9px', padding: '1px 5px' }}>
                  DEADLOCK
                </span>
              )}
            </div>
          </div>
          <div className="table-container">
            <table className="matrix-table" id="reqMatrixTable">
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
                  processKeys.map((pid) => {
                    const isDeadlocked = deadlockedPids.has(pid);
                    return (
                      <tr key={pid} style={{ backgroundColor: isDeadlocked ? 'rgba(239, 68, 68, 0.1)' : undefined }}>
                        <td>
                          <span className={`pid-tag ${isDeadlocked ? 'color-red' : ''}`}>{pid}</span>
                          {isDeadlocked && <span style={{ color: '#ef4444', fontSize: '10px', marginLeft: '4px' }}>🔒</span>}
                        </td>
                        {resources.map((r) => {
                          const reqVal = deadlock.request?.[pid]?.[r] ?? 0;
                          return (
                            <td key={r}>
                              <strong style={{ color: reqVal > 0 ? (isDeadlocked ? '#ef4444' : '#f59e0b') : 'inherit' }}>
                                {reqVal}
                              </strong>
                            </td>
                          );
                        })}
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* SECTION 4 & 5: CONTROLS, RESOURCE REQUEST FORM, AND RESULT STATUS */}
      <div className="grid-2col gap-lg margin-top-lg">
        {/* RESOURCE REQUEST FORM & MODE SELECTOR */}
        <div className="card">
          <div className="card-header border-bottom">
            <div>
              <h3 className="card-heading">Resource Request & Process Controls</h3>
              <p className="card-subheading">Choose algorithm mode and submit requests or release held resources.</p>
            </div>
          </div>
          <div className="card-body">
            <form id="form-resource-request" onSubmit={handleRequestSubmit}>
              {/* MODE SELECTOR */}
              <div className="form-group">
                <label style={{ fontWeight: 600, display: 'block', marginBottom: '6px' }}>Operating Mode</label>
                <div style={{ display: 'flex', gap: '12px' }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', cursor: 'pointer' }}>
                    <input
                      type="radio"
                      name="deadlock-mode"
                      value="banker"
                      checked={selectedMode === 'banker'}
                      onChange={() => setSelectedMode('banker')}
                    />
                    <span><strong>Banker's Avoidance</strong> (Safe Check)</span>
                  </label>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', cursor: 'pointer' }}>
                    <input
                      type="radio"
                      name="deadlock-mode"
                      value="simulate"
                      checked={selectedMode === 'simulate'}
                      onChange={() => setSelectedMode('simulate')}
                    />
                    <span><strong>Deadlock Simulation</strong> (Contention)</span>
                  </label>
                </div>
                <div style={{ fontSize: '11px', color: 'var(--text-dim)', marginTop: '4px' }}>
                  {selectedMode === 'banker'
                    ? 'Grants allocation ONLY if resulting state is SAFE; rolls back if unsafe.'
                    : 'Allocates resources directly without safety check to intentionally produce unsafe or deadlock states.'}
                </div>
              </div>

              {/* TARGET PROCESS SELECTOR */}
              <div className="form-group margin-top-sm">
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

              {/* RESOURCE REQUEST INPUTS */}
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

              {/* SUBMIT BUTTON */}
              <button
                type="submit"
                className="btn btn-primary btn-full margin-top-md"
                id="btn-submit-request"
                disabled={processKeys.length === 0}
                style={{ fontWeight: 600 }}
              >
                {selectedMode === 'banker' ? 'REQUEST RESOURCES (BANKER\'S AVOIDANCE)' : 'REQUEST RESOURCES (SIMULATION ALLOCATE)'}
              </button>

              {/* RELEASE & COMPLETE BUTTONS */}
              <div style={{ display: 'flex', gap: '8px', marginTop: '10px' }}>
                <button
                  type="button"
                  className="btn btn-dark"
                  style={{ flex: 1, fontSize: '12px' }}
                  disabled={!currentPid}
                  onClick={handleReleaseAll}
                >
                  Release Resources ({currentPid})
                </button>
                <button
                  type="button"
                  className="btn btn-dark"
                  style={{ flex: 1, fontSize: '12px', color: '#f87171' }}
                  disabled={!currentPid}
                  onClick={handleComplete}
                >
                  Complete Process ({currentPid})
                </button>
              </div>
            </form>
          </div>
        </div>

        {/* BANKER'S SAFETY & ACTION RESULT PANEL */}
        <div className="card">
          <div className="card-header border-bottom">
            <h3 className="card-heading">Result & Safety Status Section</h3>
          </div>
          <div className="card-body">
            {/* ACTION RESULT BOX (IF REQUEST MADE) */}
            {requestResult ? (
              <div
                id="requestResultBox"
                className={`request-result-alert ${
                  requestResult.granted ? 'granted' : requestResult.waiting ? 'warning' : 'denied'
                }`}
                style={{
                  padding: '12px 16px',
                  borderRadius: 'var(--radius-sm)',
                  backgroundColor: requestResult.granted
                    ? 'rgba(16, 185, 129, 0.15)'
                    : requestResult.waiting
                    ? 'rgba(245, 158, 11, 0.15)'
                    : 'rgba(239, 68, 68, 0.15)',
                  border: requestResult.granted
                    ? '1px solid #10b981'
                    : requestResult.waiting
                    ? '1px solid #f59e0b'
                    : '1px solid #ef4444',
                  color: requestResult.granted ? '#34d399' : requestResult.waiting ? '#fbbf24' : '#f87171',
                  fontSize: '12px',
                  lineHeight: 1.5,
                  marginBottom: '16px',
                }}
              >
                <div>
                  <span
                    style={{
                      display: 'inline-block',
                      padding: '2px 8px',
                      borderRadius: '4px',
                      fontWeight: 700,
                      fontSize: '11px',
                      marginRight: '8px',
                      backgroundColor: requestResult.granted ? '#10b981' : requestResult.waiting ? '#f59e0b' : '#ef4444',
                      color: '#ffffff',
                    }}
                  >
                    {requestResult.granted ? 'GRANTED' : requestResult.waiting ? 'WAITING' : 'DENIED'}
                  </span>
                  <strong>{requestResult.reason || (requestResult.granted ? 'Allocation committed' : 'Request rejected')}</strong>
                </div>
                <div style={{ marginTop: '6px' }}>{requestResult.explanation}</div>
                {requestResult.denied_reason === 'unsafe_state' && requestResult.current_state_safe && (
                  <div style={{ marginTop: '6px', fontSize: '11px', color: '#93c5fd' }}>
                    Restored State Safety: System safely reverted to current SAFE state with sequence [{requestResult.current_state_safe_sequence?.join(' → ')}].
                  </div>
                )}
              </div>
            ) : null}

            {/* SAFETY RESULT BOX */}
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
                        None (Unsafe State)
                      </span>
                    )
                  ) : deadlock.safe_sequence && deadlock.safe_sequence.length > 0 ? (
                    deadlock.safe_sequence.map((pid, idx) => (
                      <React.Fragment key={pid}>
                        <span className="seq-chip">{pid}</span>
                        {idx < deadlock.safe_sequence.length - 1 && ' \u2192 '}
                      </React.Fragment>
                    ))
                  ) : (
                    <span style={{ color: 'var(--text-dim)', fontSize: '13px' }}>
                      {deadlock.safe ? 'Click "RUN SAFETY CHECK" to test safety.' : 'No safe sequence (Unsafe State).'}
                    </span>
                  )}
                </div>
              </div>

              {deadlock.deadlock_detected && (
                <div style={{ marginTop: '12px', padding: '10px', backgroundColor: 'rgba(239, 68, 68, 0.1)', border: '1px solid #ef4444', borderRadius: '4px' }}>
                  <div style={{ color: '#ef4444', fontWeight: 700, fontSize: '12px' }}>
                    🔒 DEADLOCK DETECTED
                  </div>
                  <div style={{ fontSize: '12px', marginTop: '4px' }}>
                    <strong>Deadlocked Processes:</strong> {deadlock.involved_processes?.join(', ') || 'None'}
                  </div>
                  <div style={{ fontSize: '12px', marginTop: '2px' }}>
                    <strong>Contended Resources:</strong> {deadlock.involved_resources?.join(', ') || 'None'}
                  </div>
                </div>
              )}

              <p className="explanation-text margin-top-sm" id="safetyExplanation">
                {safetyResult
                  ? safetyResult.explanation
                  : deadlock.explanation || 'Click "RUN SAFETY CHECK" to execute algorithm.'}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* SECTION 6: MINIMAL RESOURCE ALLOCATION GRAPH (RAG) */}
      <div className="card margin-top-lg">
        <div className="card-header border-bottom">
          <div>
            <h3 className="card-heading">Resource Allocation Graph (RAG)</h3>
            <p className="card-subheading">
              Visualizes held allocations (Resource &rarr; Process) and pending requests (Process &rarr; Resource).
            </p>
          </div>
          {deadlock.status === 'DEADLOCK' && (
            <span className="badge-state TERMINATED" style={{ fontWeight: 700 }}>
              DEADLOCK CYCLE ACTIVE
            </span>
          )}
        </div>
        <div className="card-body">
          <div className="rag-container" id="ragSvgContainer">
            <svg id="ragSvg" width="100%" height="280" viewBox="0 0 800 280">
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
                  <path d="M 0 0 L 10 5 L 0 10 z" fill="#3b82f6" />
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

              {/* RAG Edges */}
              {processKeys.map((pid) => {
                const pPos = procPositions[pid];
                if (!pPos) return null;
                return resources.map((r) => {
                  const rPos = resPositions[r];
                  if (!rPos) return null;
                  const allocCount = deadlock.allocation?.[pid]?.[r] || 0;
                  const reqCount = deadlock.request?.[pid]?.[r] || 0;

                  return (
                    <React.Fragment key={`${pid}-${r}`}>
                      {/* Allocation Edge: Resource -> Process */}
                      {allocCount > 0 && (
                        <g>
                          <line
                            x1={rPos.x}
                            y1={rPos.y}
                            x2={pPos.x}
                            y2={pPos.y}
                            stroke="#3b82f6"
                            strokeWidth="2"
                            markerEnd="url(#arrow-alloc)"
                          />
                          <text
                            x={(rPos.x + pPos.x) / 2}
                            y={(rPos.y + pPos.y) / 2 - 6}
                            fill="#93c5fd"
                            fontSize="11"
                            textAnchor="middle"
                          >
                            held: {allocCount}
                          </text>
                        </g>
                      )}
                      {/* Request Edge: Process -> Resource */}
                      {reqCount > 0 && (
                        <g>
                          <line
                            x1={pPos.x}
                            y1={pPos.y}
                            x2={rPos.x}
                            y2={rPos.y}
                            stroke="#f59e0b"
                            strokeWidth="2"
                            strokeDasharray="4,4"
                            markerEnd="url(#arrow-req)"
                          />
                          <text
                            x={(pPos.x + rPos.x) / 2}
                            y={(pPos.y + rPos.y) / 2 + 14}
                            fill="#fcd34d"
                            fontSize="11"
                            textAnchor="middle"
                          >
                            waiting: {reqCount}
                          </text>
                        </g>
                      )}
                    </React.Fragment>
                  );
                });
              })}

              {/* Process Nodes (Left) */}
              {processKeys.map((pid) => {
                const pos = procPositions[pid];
                if (!pos) return null;
                const isDeadlocked = deadlockedPids.has(pid);
                return (
                  <g key={`node-${pid}`}>
                    <circle
                      cx={pos.x}
                      cy={pos.y}
                      r="22"
                      fill={isDeadlocked ? 'rgba(239, 68, 68, 0.2)' : 'rgba(59, 130, 246, 0.1)'}
                      stroke={isDeadlocked ? '#ef4444' : '#3b82f6'}
                      strokeWidth="2"
                    />
                    <text
                      x={pos.x}
                      y={pos.y + 4}
                      fill={isDeadlocked ? '#ef4444' : '#ffffff'}
                      fontSize="12"
                      fontWeight="bold"
                      textAnchor="middle"
                    >
                      {pid}
                    </text>
                  </g>
                );
              })}

              {/* Resource Nodes (Right) */}
              {resources.map((r) => {
                const pos = resPositions[r];
                if (!pos) return null;
                const isDeadlocked = deadlockedRes.has(r);
                return (
                  <g key={`node-${r}`}>
                    <rect
                      x={pos.x - 30}
                      y={pos.y - 18}
                      width="60"
                      height="36"
                      rx="4"
                      fill={isDeadlocked ? 'rgba(239, 68, 68, 0.2)' : 'rgba(16, 185, 129, 0.1)'}
                      stroke={isDeadlocked ? '#ef4444' : '#10b981'}
                      strokeWidth="2"
                    />
                    <text
                      x={pos.x}
                      y={pos.y + 4}
                      fill={isDeadlocked ? '#ef4444' : '#ffffff'}
                      fontSize="11"
                      fontWeight="bold"
                      textAnchor="middle"
                    >
                      {r}
                    </text>
                  </g>
                );
              })}
            </svg>
          </div>
        </div>
      </div>
    </section>
  );
}
