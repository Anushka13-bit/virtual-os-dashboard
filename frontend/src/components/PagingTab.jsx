import React, { useState } from 'react';

export default function PagingTab({
  pagingState,
  onRunPaging,
  onComparePaging,
  comparisonResult
}) {
  const [refString, setRefString] = useState('7 0 1 2 0 3 0 4 2 3 0 3 2 1 2 0 1 7 0 1');
  const [frameCount, setFrameCount] = useState(3);
  const [algorithm, setAlgorithm] = useState('FIFO');

  const paging = pagingState || {
    frame_count: 3,
    total_references: 0,
    page_faults: 0,
    page_hits: 0,
    hit_ratio_pct: 0,
    algorithm: 'FIFO',
    frame_history: []
  };

  const handleRunSubmit = (e) => {
    e.preventDefault();
    onRunPaging({
      reference_string: refString.trim(),
      frame_count: frameCount,
      algorithm
    });
  };

  const handleCompareClick = () => {
    onComparePaging({
      reference_string: refString.trim(),
      frame_count: frameCount
    });
  };

  const history = paging.frame_history || [];
  const lastStep = history.length > 0 ? history[history.length - 1] : null;
  const currentFrames = lastStep ? lastStep.frames : Array(paging.frame_count || 3).fill(null);

  return (
    <section id="view-paging" className="tab-view active">
      <div className="card">
        <div className="card-header border-bottom">
          <div>
            <h3 className="card-heading">Virtual Memory & Page Replacement Simulator</h3>
            <p className="card-subheading">Execute Member 2's FIFO, LRU, and Optimal algorithms on custom page reference strings.</p>
          </div>
        </div>

        <div className="card-body">
          <form id="form-paging" className="scheduling-controls" onSubmit={handleRunSubmit}>
            <div className="form-group" style={{ flex: 2, minWidth: '220px' }}>
              <label htmlFor="paging-ref-string">Page Reference String (space/comma separated)</label>
              <input
                type="text"
                id="paging-ref-string"
                className="form-control"
                value={refString}
                onChange={(e) => setRefString(e.target.value)}
                placeholder="e.g. 7 0 1 2 0 3 0 4"
                required
              />
            </div>

            <div className="form-group" style={{ flex: 1, minWidth: '120px' }}>
              <label htmlFor="paging-frames-input">Page Frames</label>
              <input
                type="number"
                id="paging-frames-input"
                className="form-control"
                value={frameCount}
                onChange={(e) => setFrameCount(parseInt(e.target.value, 10) || 1)}
                min="1"
                max="10"
                required
              />
            </div>

            <div className="form-group" style={{ flex: 1, minWidth: '140px' }}>
              <label htmlFor="paging-algo-select">Algorithm</label>
              <select
                id="paging-algo-select"
                className="form-control"
                value={algorithm}
                onChange={(e) => setAlgorithm(e.target.value)}
              >
                <option value="FIFO">FIFO (First-In, First-Out)</option>
                <option value="LRU">LRU (Least Recently Used)</option>
                <option value="OPTIMAL">Optimal (Belady's)</option>
              </select>
            </div>

            <div className="form-group align-end" style={{ display: 'flex', gap: '10px' }}>
              <button type="submit" className="btn btn-primary" id="btn-run-paging">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <polygon points="5 3 19 12 5 21 5 3"></polygon>
                </svg>
                RUN SIMULATION
              </button>
              <button
                type="button"
                className="btn btn-secondary"
                id="btn-compare-paging"
                onClick={handleCompareClick}
              >
                COMPARE ALL
              </button>
            </div>
          </form>
        </div>
      </div>

      {/* PAGING METRICS SUMMARY CARDS */}
      <div className="cards-grid margin-top-lg">
        <div className="card metric-card">
          <div className="card-title">Page Frames</div>
          <div className="card-value" id="paging-frames-val">{paging.frame_count}</div>
        </div>
        <div className="card metric-card">
          <div className="card-title">Total References</div>
          <div className="card-value color-blue" id="paging-total-refs-val">{paging.total_references || 0}</div>
        </div>
        <div className="card metric-card">
          <div className="card-title">Page Faults</div>
          <div className="card-value color-red" id="paging-faults-val">{paging.page_faults}</div>
        </div>
        <div className="card metric-card">
          <div className="card-title">Page Hits</div>
          <div className="card-value color-green" id="paging-hits-val">{paging.page_hits}</div>
        </div>
        <div className="card metric-card">
          <div className="card-title">Hit Ratio</div>
          <div className="card-value color-purple" id="paging-ratio-val">{paging.hit_ratio_pct}%</div>
        </div>
      </div>

      {/* COMPARISON RESULTS PANEL */}
      {comparisonResult && (
        <div id="paging-comparison-box" className="card margin-top-lg">
          <div className="card-header border-bottom">
            <h3 className="card-heading">Algorithm Performance Comparison</h3>
            <span className="badge badge-primary" id="paging-best-algo-badge">
              Best: {comparisonResult.best_algorithm}
            </span>
          </div>
          <div className="table-container">
            <table className="data-table" id="pagingComparisonTable">
              <thead>
                <tr>
                  <th>Algorithm</th>
                  <th>Total References</th>
                  <th>Page Faults</th>
                  <th>Page Hits</th>
                  <th>Fault Rate (%)</th>
                  <th>Hit Rate (%)</th>
                </tr>
              </thead>
              <tbody>
                {comparisonResult.comparison?.map((c) => {
                  const isBest = c.algorithm === comparisonResult.best_algorithm;
                  return (
                    <tr
                      key={c.algorithm}
                      style={{
                        backgroundColor: isBest ? 'rgba(16, 185, 129, 0.1)' : undefined
                      }}
                    >
                      <td>
                        <strong>{c.algorithm}</strong>
                        {isBest && (
                          <span
                            className="pid-tag"
                            style={{
                              backgroundColor: 'var(--accent-green)',
                              color: '#fff',
                              marginLeft: '6px'
                            }}
                          >
                            BEST
                          </span>
                        )}
                      </td>
                      <td>{c.total_references}</td>
                      <td><strong style={{ color: 'var(--accent-red)' }}>{c.page_faults}</strong></td>
                      <td><strong style={{ color: 'var(--accent-green)' }}>{c.page_hits}</strong></td>
                      <td>{c.page_fault_rate}%</td>
                      <td>{c.page_hit_rate}%</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* FINAL PAGE FRAMES STATE */}
      <div className="card margin-top-lg">
        <div className="card-header border-bottom">
          <h3 className="card-heading">Final Page Frames State</h3>
          <span className="badge badge-info" id="paging-current-algo-badge">
            {paging.algorithm || 'FIFO'}
          </span>
        </div>
        <div className="card-body">
          <div className="frames-grid" id="pagingFramesGrid">
            {currentFrames.map((page, idx) => (
              <div key={idx} className="frame-box">
                <span className="frame-num">Frame {idx}</span>
                <span className="frame-content">
                  {page !== null && page !== undefined ? (
                    `Page ${page}`
                  ) : (
                    <em style={{ color: 'var(--text-dim)', fontSize: '12px' }}>Empty</em>
                  )}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* STEP-BY-STEP FRAME HISTORY LOG TABLE */}
      <div className="card margin-top-lg">
        <div className="card-header border-bottom">
          <h3 className="card-heading">Step-by-Step Page Frame History Log</h3>
        </div>
        <div className="table-container">
          <table className="data-table" id="pagingHistoryTable">
            <thead>
              <tr>
                <th>Step #</th>
                <th>Referenced Page</th>
                <th>Frame Contents State</th>
                <th>Status</th>
                <th>Replaced Page</th>
                <th>Reason / Explanation</th>
              </tr>
            </thead>
            <tbody>
              {history.length === 0 ? (
                <tr>
                  <td colSpan="6" style={{ textAlign: 'center', color: 'var(--text-dim)' }}>
                    No page replacement simulation executed yet. Use the controls above to run.
                  </td>
                </tr>
              ) : (
                history.map((h) => (
                  <tr key={h.step}>
                    <td><strong>Step {h.step}</strong></td>
                    <td>
                      <span
                        className="pid-tag"
                        style={{
                          backgroundColor: 'rgba(139, 92, 246, 0.2)',
                          color: 'var(--accent-purple)'
                        }}
                      >
                        Page {h.page}
                      </span>
                    </td>
                    <td>[ {h.frames.map((f) => (f !== null ? f : '-')).join(', ')} ]</td>
                    <td>
                      <span className={`badge-state ${h.status === 'Hit' ? 'RUNNING' : 'TERMINATED'}`}>
                        {h.status}
                      </span>
                    </td>
                    <td>
                      {h.replaced_page !== null && h.replaced_page !== undefined ? (
                        <span style={{ color: 'var(--accent-red)', fontWeight: 600 }}>
                          Page {h.replaced_page}
                        </span>
                      ) : (
                        <span style={{ color: 'var(--text-dim)' }}>-</span>
                      )}
                    </td>
                    <td style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                      {h.reason || ''}
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
