import React from 'react';

export default function MemoryTab({ memoryState, onChangeStrategy, onResetMemory }) {
  const mem = memoryState || {
    total_mb: 1024,
    used_mb: 0,
    free_mb: 1024,
    utilization_pct: 0,
    external_fragmentation: 0,
    allocation_strategy: 'first_fit',
    blocks: [],
    allocation_map: []
  };

  const handleStrategyChange = (e) => {
    onChangeStrategy(e.target.value);
  };

  return (
    <section id="view-memory" className="tab-view active">
      <div className="card">
        <div className="card-header border-bottom">
          <div>
            <h3 className="card-heading">Physical Memory Management</h3>
            <p className="card-subheading">Member 2 Dynamic Partition Allocation & Block Coalescing Engine</p>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
            <label htmlFor="mem-strategy-select" style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-muted)' }}>
              Strategy:
            </label>
            <select
              id="mem-strategy-select"
              className="form-control"
              style={{ width: 'auto', padding: '6px 12px' }}
              value={mem.allocation_strategy || 'first_fit'}
              onChange={handleStrategyChange}
            >
              <option value="first_fit">First Fit</option>
              <option value="best_fit">Best Fit</option>
              <option value="worst_fit">Worst Fit</option>
            </select>
            <button className="btn btn-secondary btn-sm" id="btn-reset-memory" onClick={onResetMemory}>
              Reset Memory
            </button>
          </div>
        </div>
      </div>

      <div className="cards-grid margin-top-md">
        <div className="card metric-card">
          <div className="card-title">Total Memory</div>
          <div className="card-value" id="mem-total-val">{mem.total_mb} MB</div>
        </div>
        <div className="card metric-card">
          <div className="card-title">Used Memory</div>
          <div className="card-value color-blue" id="mem-used-val">{mem.used_mb} MB</div>
        </div>
        <div className="card metric-card">
          <div className="card-title">Free Memory</div>
          <div className="card-value color-green" id="mem-free-val">{mem.free_mb} MB</div>
        </div>
        <div className="card metric-card">
          <div className="card-title">Memory Utilization</div>
          <div className="card-value color-purple" id="mem-util-val">{mem.utilization_pct}%</div>
        </div>
        <div className="card metric-card">
          <div className="card-title">External Fragmentation</div>
          <div className="card-value color-orange" id="mem-frag-val">{mem.external_fragmentation || 0} MB</div>
        </div>
      </div>

      {/* MEMORY ALLOCATION MAP GRID */}
      <div className="card margin-top-lg">
        <div className="card-header border-bottom">
          <h3 className="card-heading">Physical Memory Allocation Map</h3>
        </div>
        <div className="card-body">
          <div className="memory-map-bar" id="memoryMapBar">
            {mem.allocation_map && mem.allocation_map.length > 0 ? (
              mem.allocation_map.map((block, idx) => {
                const pct = (block.size / mem.total_mb) * 100;
                const label = block.pid ? block.pid : 'FREE';
                return (
                  <div
                    key={idx}
                    className="memory-block"
                    style={{ width: `${pct}%`, backgroundColor: block.color }}
                    title={`${label}: ${block.size} MB (${block.start} - ${block.start + block.size} MB)`}
                  >
                    {label}
                  </div>
                );
              })
            ) : (
              <div
                className="memory-block"
                style={{ width: '100%', backgroundColor: '#10b981' }}
                title="FREE: 1024 MB"
              >
                FREE
              </div>
            )}
          </div>

          <div className="memory-legend margin-top-md" id="memoryLegend">
            {mem.allocation_map && mem.allocation_map.length > 0 ? (
              mem.allocation_map.map((b, idx) => (
                <div key={idx} className="legend-item">
                  <span className="legend-color" style={{ backgroundColor: b.color }}></span>
                  <span>{b.pid ? `Process ${b.pid}` : 'Free Memory'}: {b.size} MB</span>
                </div>
              ))
            ) : (
              <div className="legend-item">
                <span className="legend-color" style={{ backgroundColor: '#10b981' }}></span>
                <span>Free Memory: 1024 MB</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* MEMORY BLOCKS DETAIL TABLE */}
      <div className="card margin-top-lg">
        <div className="card-header border-bottom">
          <h3 className="card-heading">Memory Partition Blocks & Status</h3>
        </div>
        <div className="table-container">
          <table className="data-table" id="memoryBlocksTable">
            <thead>
              <tr>
                <th>Start Address</th>
                <th>End Address</th>
                <th>Block Size</th>
                <th>Status</th>
                <th>Allocated Process</th>
              </tr>
            </thead>
            <tbody>
              {mem.blocks && mem.blocks.length > 0 ? (
                mem.blocks.map((b, idx) => (
                  <tr key={idx}>
                    <td><strong>{b.start} MB</strong></td>
                    <td><strong>{b.end} MB</strong></td>
                    <td>{b.size} MB</td>
                    <td>
                      <span className={`badge-state ${b.is_allocated ? 'RUNNING' : 'NEW'}`}>
                        {b.is_allocated ? 'Allocated' : 'Free'}
                      </span>
                    </td>
                    <td>
                      {b.process_id ? (
                        <span className="pid-tag">{b.process_id}</span>
                      ) : (
                        <span style={{ color: 'var(--text-dim)' }}>Unallocated</span>
                      )}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="5" style={{ textAlign: 'center', color: 'var(--text-dim)' }}>
                    No partition blocks available.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  );
}
