import React, { useState, useEffect } from 'react';

export default function MemoryTab({
  memoryState,
  onChangeStrategy,
  onResetMemory,
  onConfigurePartitions,
}) {
  const mem = memoryState || {
    total_mb: 1024,
    used_mb: 0,
    free_mb: 1024,
    utilization_pct: 0,
    external_fragmentation: 0,
    external_frag_explanation: '',
    allocation_strategy: 'first_fit',
    blocks: [],
    allocation_map: [],
    allocation_log: [],
    unallocated_processes: [],
    partition_sizes: [],
    is_partitioned: false,
  };

  const [partitionInput, setPartitionInput] = useState('100, 500, 200, 300, 600');

  useEffect(() => {
    if (mem.partition_sizes && mem.partition_sizes.length > 0) {
      setPartitionInput(mem.partition_sizes.join(', '));
    }
  }, [mem.partition_sizes]);

  const handleStrategyChange = (e) => {
    onChangeStrategy(e.target.value);
  };

  const handlePartitionSubmit = (e) => {
    e.preventDefault();
    if (onConfigurePartitions) {
      onConfigurePartitions(partitionInput);
    }
  };

  const handlePresetClick = (preset) => {
    setPartitionInput(preset);
    if (onConfigurePartitions) {
      onConfigurePartitions(preset);
    }
  };

  const isExtFrag = (mem.external_fragmentation || 0) > 0;

  return (
    <section id="view-memory" className="tab-view active">
      {/* HEADER & TOP CONTROLS */}
      <div className="card">
        <div className="card-header border-bottom">
          <div>
            <h3 className="card-heading">Physical Memory Management</h3>
            <p className="card-subheading">
              Partition Allocation Engine, Algorithm Placement Tracing & External Fragmentation Analysis
            </p>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
            <label htmlFor="mem-strategy-select" style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-muted)' }}>
              Allocation Algorithm:
            </label>
            <select
              id="mem-strategy-select"
              className="form-control"
              style={{ width: 'auto', padding: '6px 14px', fontWeight: 600 }}
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

      {/* PARTITION CONFIGURATION CARD */}
      <div className="card margin-top-md" style={{ borderLeft: '4px solid var(--color-blue)' }}>
        <div className="card-body">
          <form onSubmit={handlePartitionSubmit}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px', marginBottom: '10px' }}>
              <div>
                <h4 style={{ margin: 0, fontSize: '15px', fontWeight: 700, color: '#f3f4f6' }}>
                  Input Memory Block Sizes for Partition Allocation
                </h4>
                <p style={{ margin: '4px 0 0 0', fontSize: '12px', color: 'var(--text-muted)' }}>
                  Specify existing physical memory partition capacities. Active processes will be allocated into these blocks via {mem.allocation_strategy?.replace('_', ' ').toUpperCase()}.
                </p>
              </div>
              <button type="submit" className="btn btn-primary" id="btn-apply-partitions" style={{ padding: '8px 18px', fontWeight: 600 }}>
                SET PARTITIONS & ALLOCATE
              </button>
            </div>

            <div style={{ display: 'flex', gap: '10px', alignItems: 'center', marginTop: '10px' }}>
              <input
                type="text"
                className="form-control"
                id="partition-sizes-input"
                value={partitionInput}
                onChange={(e) => setPartitionInput(e.target.value)}
                placeholder="e.g. 100, 500, 200, 300, 600"
                style={{ flex: 1, fontFamily: 'var(--font-mono)', fontSize: '13px' }}
              />
            </div>

            {/* QUICK PRESETS */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap', marginTop: '12px' }}>
              <span style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: 600 }}>Quick Presets:</span>
              <button
                type="button"
                className="preset-pill"
                onClick={() => handlePresetClick('100, 500, 200, 300, 600')}
              >
                100, 500, 200, 300, 600 MB (Textbook Standard)
              </button>
              <button
                type="button"
                className="preset-pill"
                onClick={() => handlePresetClick('100, 500, 200')}
              >
                100, 500, 200 MB (High Fragmentation Test)
              </button>
              <button
                type="button"
                className="preset-pill"
                onClick={() => handlePresetClick('200, 300, 400, 500')}
              >
                200, 300, 400, 500 MB (Balanced Workload)
              </button>
              <button
                type="button"
                className="preset-pill"
                onClick={() => handlePresetClick('256, 256, 256, 256')}
              >
                256, 256, 256, 256 MB (Uniform 1GB)
              </button>
            </div>
          </form>
        </div>
      </div>

      {/* METRIC SUMMARY CARDS */}
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
        <div className="card metric-card" style={{ border: isExtFrag ? '1px solid rgba(245, 158, 11, 0.4)' : undefined }}>
          <div className="card-title" style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span>External Fragmentation</span>
            {isExtFrag && (
              <span className="badge-state RUNNING" style={{ fontSize: '10px', padding: '1px 6px' }}>
                DETECTED
              </span>
            )}
          </div>
          <div className="card-value color-orange" id="mem-frag-val">
            {mem.external_fragmentation || 0} MB
          </div>
        </div>
      </div>

      {/* EXTERNAL FRAGMENTATION DIAGNOSTIC EXPLANATION */}
      {mem.external_frag_explanation && (
        <div
          className={`notice-banner margin-top-md ${isExtFrag ? 'warning' : 'info'}`}
          style={{
            display: 'flex',
            alignItems: 'flex-start',
            gap: '12px',
            backgroundColor: isExtFrag ? 'rgba(245, 158, 11, 0.1)' : 'rgba(59, 130, 246, 0.1)',
            border: isExtFrag ? '1px solid rgba(245, 158, 11, 0.35)' : '1px solid rgba(59, 130, 246, 0.3)',
            borderRadius: 'var(--radius-md)',
            padding: '14px 18px',
          }}
        >
          <div style={{ fontSize: '18px', lineHeight: 1 }}>{isExtFrag ? '⚠️' : 'ℹ️'}</div>
          <div>
            <div style={{ fontWeight: 700, fontSize: '13px', color: isExtFrag ? '#fbbf24' : '#93c5fd', marginBottom: '2px' }}>
              {isExtFrag ? 'External Fragmentation Diagnostic Analysis' : 'Partition Memory Status'}
            </div>
            <div style={{ fontSize: '12px', color: '#e5e7eb', lineHeight: 1.5 }}>
              {mem.external_frag_explanation}
            </div>
          </div>
        </div>
      )}

      {/* PHYSICAL MEMORY ALLOCATION MAP BAR */}
      <div className="card margin-top-lg">
        <div className="card-header border-bottom">
          <div>
            <h3 className="card-heading">Physical Memory Allocation Map</h3>
            <p className="card-subheading">
              Each block displays its assigned Block Name and Process Name (or Free status)
            </p>
          </div>
        </div>
        <div className="card-body">
          <div className="memory-map-bar" id="memoryMapBar">
            {mem.allocation_map && mem.allocation_map.length > 0 ? (
              mem.allocation_map.map((block, idx) => {
                const pct = mem.total_mb > 0 ? (block.size / mem.total_mb) * 100 : 0;
                const isAllocated = block.is_allocated || !!block.pid;
                return (
                  <div
                    key={idx}
                    className="memory-block"
                    style={{
                      width: `${pct}%`,
                      backgroundColor: isAllocated ? block.color : '#1a1f29',
                      border: isAllocated ? '1px solid rgba(0,0,0,0.3)' : '1px dashed #374151',
                    }}
                    title={`${block.label}: ${block.sublabel || `${block.size} MB`} (${block.start} - ${block.end || block.start + block.size} MB)`}
                  >
                    <div className="mem-block-title">{block.label}</div>
                    <div className="mem-block-sub">{block.sublabel}</div>
                  </div>
                );
              })
            ) : (
              <div
                className="memory-block"
                style={{ width: '100%', backgroundColor: '#10b981' }}
                title="FREE: 1024 MB"
              >
                <div className="mem-block-title">Block 1: Free</div>
                <div className="mem-block-sub">1024 MB Available</div>
              </div>
            )}
          </div>

          {/* ALLOCATION LEGEND */}
          <div className="memory-legend margin-top-md" id="memoryLegend">
            {mem.allocation_map && mem.allocation_map.length > 0 ? (
              mem.allocation_map.map((b, idx) => {
                const isAllocated = b.is_allocated || !!b.pid;
                return (
                  <div key={idx} className="legend-item">
                    <span
                      className="legend-color"
                      style={{
                        backgroundColor: isAllocated ? b.color : '#1a1f29',
                        border: isAllocated ? 'none' : '1px dashed #6b7280',
                      }}
                    ></span>
                    <span>
                      <strong>{b.label}</strong> — {b.sublabel || `${b.size} MB`}
                      {b.internal_fragmentation > 0 && (
                        <span style={{ color: 'var(--text-dim)', fontSize: '11px', marginLeft: '4px' }}>
                          (Internal Frag: {b.internal_fragmentation} MB)
                        </span>
                      )}
                    </span>
                  </div>
                );
              })
            ) : (
              <div className="legend-item">
                <span className="legend-color" style={{ backgroundColor: '#10b981' }}></span>
                <span>Block 1: Free (1024 MB)</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* PROCESS ALLOCATION PLACEMENT TRACE ("WHERE EACH PROCESS IS GOING") */}
      <div className="card margin-top-lg">
        <div className="card-header border-bottom">
          <div>
            <h3 className="card-heading">Process Allocation Mapping & Algorithm Placement Trace</h3>
            <p className="card-subheading">
              Live tracking showing where each user-created process is placed under {mem.allocation_strategy?.replace('_', ' ').toUpperCase()}
            </p>
          </div>
          <span className="badge-state RUNNING" style={{ textTransform: 'uppercase' }}>
            {mem.allocation_strategy?.replace('_', ' ')}
          </span>
        </div>
        <div className="table-container">
          <table className="data-table" id="processAllocationTable">
            <thead>
              <tr>
                <th>Process Name & PID</th>
                <th>Requested Memory</th>
                <th>Target Block Assigned</th>
                <th>Placement Decision & Algorithm Rationale</th>
                <th>Internal Fragmentation</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {mem.allocation_log && mem.allocation_log.length > 0 ? (
                mem.allocation_log.map((item, idx) => (
                  <tr key={idx}>
                    <td>
                      <span className="pid-tag" style={{ marginRight: '8px' }}>
                        {item.process_id}
                      </span>
                      <strong>{item.process_name}</strong>
                    </td>
                    <td>
                      <strong>{item.requested_size} MB</strong>
                    </td>
                    <td>
                      {item.allocated ? (
                        <span style={{ fontWeight: 700, color: '#60a5fa' }}>
                          {item.block_name} ({item.block_size} MB)
                        </span>
                      ) : (
                        <span style={{ color: '#ef4444', fontStyle: 'italic' }}>None (Unallocated)</span>
                      )}
                    </td>
                    <td style={{ fontSize: '12px', color: item.allocated ? '#d1d5db' : '#f87171' }}>
                      {item.reason}
                    </td>
                    <td>
                      {item.allocated ? (
                        item.internal_fragmentation > 0 ? (
                          <span style={{ color: '#fbbf24' }}>{item.internal_fragmentation} MB</span>
                        ) : (
                          <span style={{ color: '#34d399' }}>0 MB (Exact Fit)</span>
                        )
                      ) : (
                        <span style={{ color: 'var(--text-dim)' }}>—</span>
                      )}
                    </td>
                    <td>
                      <span className={`badge-state ${item.allocated ? 'RUNNING' : 'TERMINATED'}`}>
                        {item.status}
                      </span>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="6" style={{ textAlign: 'center', color: 'var(--text-dim)', padding: '24px' }}>
                    No processes created yet. Create processes in the <strong>Processes</strong> tab to allocate them across memory blocks.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* MEMORY BLOCKS DETAIL TABLE */}
      <div className="card margin-top-lg">
        <div className="card-header border-bottom">
          <div>
            <h3 className="card-heading">Memory Partition Blocks & Physical Addresses</h3>
            <p className="card-subheading">
              Current state of all physical partitions, assigned processes, and internal fragmentation
            </p>
          </div>
        </div>
        <div className="table-container">
          <table className="data-table" id="memoryBlocksTable">
            <thead>
              <tr>
                <th>Block Name</th>
                <th>Physical Address Range</th>
                <th>Partition Capacity</th>
                <th>Occupant Process</th>
                <th>Allocated Process Size</th>
                <th>Internal Fragmentation</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {mem.blocks && mem.blocks.length > 0 ? (
                mem.blocks.map((b, idx) => {
                  const isAllocated = b.is_allocated;
                  return (
                    <tr key={idx}>
                      <td>
                        <strong>{b.block_name || `Block ${idx + 1}`}</strong>
                      </td>
                      <td style={{ fontFamily: 'var(--font-mono)' }}>
                        {b.start} MB – {b.end || b.start + b.size} MB
                      </td>
                      <td>
                        <strong>{b.size} MB</strong>
                      </td>
                      <td>
                        {isAllocated && b.process_id ? (
                          <span>
                            <span className="pid-tag" style={{ marginRight: '6px' }}>{b.process_id}</span>
                            <strong>{b.process_name || b.process_id}</strong>
                          </span>
                        ) : (
                          <span style={{ color: 'var(--text-dim)' }}>Free (Unassigned)</span>
                        )}
                      </td>
                      <td>
                        {isAllocated ? (
                          <span>{b.allocated_size || b.size} MB</span>
                        ) : (
                          <span style={{ color: 'var(--text-dim)' }}>0 MB</span>
                        )}
                      </td>
                      <td>
                        {isAllocated ? (
                          b.internal_fragmentation > 0 ? (
                            <span style={{ color: '#fbbf24' }}>{b.internal_fragmentation} MB</span>
                          ) : (
                            <span style={{ color: '#34d399' }}>0 MB</span>
                          )
                        ) : (
                          <span style={{ color: 'var(--text-dim)' }}>0 MB</span>
                        )}
                      </td>
                      <td>
                        <span className={`badge-state ${isAllocated ? 'RUNNING' : 'NEW'}`}>
                          {isAllocated ? 'Allocated' : 'Free'}
                        </span>
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan="7" style={{ textAlign: 'center', color: 'var(--text-dim)' }}>
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
