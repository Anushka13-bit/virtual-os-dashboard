/**
 * Virtual OS Dashboard — Frontend Controller
 * Member 3 Implementation
 */

// Global State Store
let currentState = null;
let cpuHistory = Array(20).fill(0);
let pollInterval = null;

// Color Palette for Process Gantt & Memory Blocks
const PROC_COLORS = [
  '#3b82f6', '#10b981', '#f59e0b', '#8b5cf6',
  '#ec4899', '#06b6d4', '#f97316', '#64748b'
];

document.addEventListener('DOMContentLoaded', () => {
  initNavigation();
  initEventListeners();
  fetchSystemState();
  startAutoPolling();
  initCpuChart();
});

/* ==========================================================================
   NAVIGATION & TAB SWITCHING
   ========================================================================== */
function initNavigation() {
  const navItems = document.querySelectorAll('.nav-item');
  navItems.forEach(item => {
    item.addEventListener('click', (e) => {
      e.preventDefault();
      const targetTab = item.getAttribute('data-tab');
      switchTab(targetTab);
    });
  });

  // Handle URL hash if present
  const hash = window.location.hash.replace('#', '');
  if (hash && document.getElementById(`view-${hash}`)) {
    switchTab(hash);
  }
}

function switchTab(tabId) {
  // Update Nav links
  document.querySelectorAll('.nav-item').forEach(nav => {
    nav.classList.toggle('active', nav.getAttribute('data-tab') === tabId);
  });

  // Update Tab Views
  document.querySelectorAll('.tab-view').forEach(view => {
    view.classList.toggle('active', view.id === `view-${tabId}`);
  });

  // Update Page Title
  const titles = {
    dashboard: ['Virtual OS Dashboard', 'Operating System Simulation & Resource Monitor'],
    processes: ['Process Management', 'Control & Inspection of Simulated System Processes'],
    scheduling: ['CPU Scheduling Simulation', 'Visualize Gantt Charts & Performance Metrics'],
    memory: ['Memory Management', 'Simulated RAM Allocation & Member 2 Integration Point'],
    paging: ['Paging & Replacement', 'Simulated Page Faults & Member 2 Integration Point'],
    deadlocks: ['Deadlock Management & Banker\'s Algorithm', 'Safety Analysis, Resource Requests & Resource Allocation Graph']
  };

  if (titles[tabId]) {
    document.getElementById('page-title').textContent = titles[tabId][0];
    document.getElementById('page-subtitle').textContent = titles[tabId][1];
  }
}

/* ==========================================================================
   EVENT LISTENERS & MODALS
   ========================================================================== */
function initEventListeners() {
  // Sync button
  document.getElementById('btn-refresh-state').addEventListener('click', () => {
    fetchSystemState();
    showToast('System state synchronized.', 'success');
  });

  // Modal controls
  const modal = document.getElementById('createProcessModal');
  document.getElementById('btn-open-create-modal').addEventListener('click', () => {
    modal.classList.add('active');
  });
  document.getElementById('btn-close-modal').addEventListener('click', () => {
    modal.classList.remove('active');
  });
  document.getElementById('btn-cancel-modal').addEventListener('click', () => {
    modal.classList.remove('active');
  });

  // Create Process Form Submit
  document.getElementById('form-create-process').addEventListener('submit', handleCreateProcess);

  // Scheduling Algorithm selector change
  document.getElementById('sched-algo-select').addEventListener('change', (e) => {
    const isRR = e.target.value === 'RR';
    document.getElementById('quantum-group').style.display = isRR ? 'block' : 'none';
  });

  // Scheduling Form Submit
  document.getElementById('form-scheduling').addEventListener('submit', handleRunScheduling);

  // Memory Strategy & Reset Controls
  const stratSelect = document.getElementById('mem-strategy-select');
  if (stratSelect) stratSelect.addEventListener('change', handleStrategyChange);

  const resetBtn = document.getElementById('btn-reset-memory');
  if (resetBtn) resetBtn.addEventListener('click', handleResetMemory);

  // Paging Simulation Form & Compare
  const formPaging = document.getElementById('form-paging');
  if (formPaging) formPaging.addEventListener('submit', handleRunPaging);

  const comparePagingBtn = document.getElementById('btn-compare-paging');
  if (comparePagingBtn) comparePagingBtn.addEventListener('click', handleComparePaging);

  // Deadlock Buttons
  document.getElementById('btn-run-safety-check').addEventListener('click', handleRunSafetyCheck);
  document.getElementById('btn-run-detect-deadlock').addEventListener('click', handleRunDeadlockDetection);

  // Resource Request Form Submit
  document.getElementById('form-resource-request').addEventListener('submit', handleResourceRequest);

  // Clear Event Log
  document.getElementById('btn-clear-log').addEventListener('click', () => {
    document.getElementById('eventLogBox').innerHTML = '';
  });
}

/* ==========================================================================
   API FETCHING & AUTO POLLING
   ========================================================================== */
function startAutoPolling() {
  if (pollInterval) clearInterval(pollInterval);
  pollInterval = setInterval(fetchSystemState, 1500);
}

async function fetchSystemState() {
  try {
    const res = await fetch('/api/state');
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const state = await res.json();
    currentState = state;

    updateSummaryCards(state);
    updateProcessTable(state.processes);
    updateCPUChart(state.cpu);
    updateMemoryDisplay(state.memory);
    updatePagingDisplay(state.paging);
    updateDeadlockStatus(state.deadlock);
    updateDeadlockFormInputs(state.deadlock);
    renderResourceAllocationGraph(state.deadlock);

  } catch (err) {
    console.error('Error fetching OS state:', err);
    document.getElementById('sys-status-text').textContent = 'API Connection Error';
  }
}

/* ==========================================================================
   UI UPDATERS
   ========================================================================== */
function updateSummaryCards(state) {
  // CPU Usage
  const cpuVal = state.cpu.usage_pct || 0;
  document.getElementById('card-cpu-val').textContent = `${cpuVal.toFixed(1)}%`;
  document.getElementById('card-cpu-bar').style.width = `${Math.min(100, cpuVal)}%`;

  // Memory Usage
  const mem = state.memory;
  document.getElementById('card-mem-val').textContent = `${mem.used_mb} / ${mem.total_mb} MB`;
  document.getElementById('card-mem-bar').style.width = `${mem.utilization_pct}%`;

  // Processes
  const procCount = state.processes.length;
  document.getElementById('card-proc-val').textContent = procCount;
  document.getElementById('card-proc-sub').textContent = `${procCount} Active Processes`;

  // Page Faults
  const paging = state.paging;
  document.getElementById('card-fault-val').textContent = paging.page_faults;
  const hitSub = document.getElementById('card-hit-sub');
  if (hitSub) {
    hitSub.textContent = `${paging.hit_ratio_pct}% hit ratio (${paging.page_hits} hits)`;
  }

  // Header Deadlock Status Badge
  const deadlock = state.deadlock;
  const headerBadge = document.getElementById('header-deadlock-badge');
  const headerText = document.getElementById('header-deadlock-text');
  
  headerBadge.className = `status-badge ${deadlock.status.toLowerCase()}`;
  headerText.textContent = `${deadlock.status} STATE`;

  document.getElementById('card-deadlock-val').textContent = deadlock.status;
  document.getElementById('card-deadlock-sub').textContent = deadlock.safe 
    ? 'All resources allocated safely' 
    : deadlock.explanation;
}

function updateProcessTable(processes) {
  const dashBody = document.querySelector('#dashProcessTable tbody');
  const fullBody = document.querySelector('#fullProcessTable tbody');

  if (!dashBody || !fullBody) return;

  const renderRows = (isFull) => {
    if (!processes || processes.length === 0) {
      return `<tr><td colspan="${isFull ? 8 : 7}" style="text-align: center; color: var(--text-dim);">No active processes in system.</td></tr>`;
    }

    return processes.map(p => `
      <tr>
        <td><span class="pid-tag">${p.pid}</span></td>
        <td><strong>${escapeHtml(p.name)}</strong></td>
        <td>${p.arrival_time} ms</td>
        <td>${p.burst_time} ms</td>
        <td>${p.priority}</td>
        <td>${p.memory_required} MB</td>
        <td><span class="badge-state ${p.state}">${p.state}</span></td>
        ${isFull ? `
          <td>
            <button class="btn btn-danger btn-xs" onclick="handleDeleteProcess('${p.pid}')">Delete</button>
          </td>
        ` : ''}
      </tr>
    `).join('');
  };

  dashBody.innerHTML = renderRows(false);
  fullBody.innerHTML = renderRows(true);
}

function updateMemoryDisplay(mem) {
  if (!mem) return;

  const totalElem = document.getElementById('mem-total-val');
  const usedElem = document.getElementById('mem-used-val');
  const freeElem = document.getElementById('mem-free-val');
  const utilElem = document.getElementById('mem-util-val');
  const fragElem = document.getElementById('mem-frag-val');
  const stratSelect = document.getElementById('mem-strategy-select');

  if (totalElem) totalElem.textContent = `${mem.total_mb} MB`;
  if (usedElem) usedElem.textContent = `${mem.used_mb} MB`;
  if (freeElem) freeElem.textContent = `${mem.free_mb} MB`;
  if (utilElem) utilElem.textContent = `${mem.utilization_pct}%`;
  if (fragElem) fragElem.textContent = `${mem.external_fragmentation || 0} MB`;
  if (stratSelect && mem.allocation_strategy) stratSelect.value = mem.allocation_strategy;

  const mapBar = document.getElementById('memoryMapBar');
  const legend = document.getElementById('memoryLegend');
  const blocksTable = document.querySelector('#memoryBlocksTable tbody');

  if (mapBar && mem.allocation_map && mem.allocation_map.length > 0) {
    mapBar.innerHTML = mem.allocation_map.map((block) => {
      const pct = (block.size / mem.total_mb) * 100;
      const label = block.pid ? block.pid : 'FREE';
      return `<div class="memory-block" style="width: ${pct}%; background-color: ${block.color};" title="${label}: ${block.size} MB (${block.start} - ${block.start + block.size} MB)">${label}</div>`;
    }).join('');

    if (legend) {
      legend.innerHTML = mem.allocation_map.map(b => `
        <div class="legend-item">
          <span class="legend-color" style="background-color: ${b.color};"></span>
          <span>${b.pid ? `Process ${b.pid}` : 'Free Memory'}: ${b.size} MB</span>
        </div>
      `).join('');
    }
  }

  if (blocksTable && mem.blocks) {
    blocksTable.innerHTML = mem.blocks.map(b => `
      <tr>
        <td><strong>${b.start} MB</strong></td>
        <td><strong>${b.end} MB</strong></td>
        <td>${b.size} MB</td>
        <td><span class="badge-state ${b.is_allocated ? 'RUNNING' : 'NEW'}">${b.is_allocated ? 'Allocated' : 'Free'}</span></td>
        <td>${b.process_id ? `<span class="pid-tag">${b.process_id}</span>` : '<span style="color: var(--text-dim);">Unallocated</span>'}</td>
      </tr>
    `).join('');
  }
}

function updatePagingDisplay(paging) {
  if (!paging) return;

  const framesElem = document.getElementById('paging-frames-val');
  const totalRefsElem = document.getElementById('paging-total-refs-val');
  const faultsElem = document.getElementById('paging-faults-val');
  const hitsElem = document.getElementById('paging-hits-val');
  const ratioElem = document.getElementById('paging-ratio-val');
  const currentAlgoBadge = document.getElementById('paging-current-algo-badge');

  if (framesElem) framesElem.textContent = paging.frame_count;
  if (totalRefsElem) totalRefsElem.textContent = paging.total_references || 0;
  if (faultsElem) faultsElem.textContent = paging.page_faults;
  if (hitsElem) hitsElem.textContent = paging.page_hits;
  if (ratioElem) ratioElem.textContent = `${paging.hit_ratio_pct}%`;
  if (currentAlgoBadge) currentAlgoBadge.textContent = paging.algorithm || 'FIFO';

  // Render Frame Grid
  const framesGrid = document.getElementById('pagingFramesGrid');
  if (framesGrid) {
    const history = paging.frame_history || [];
    const lastStep = history.length > 0 ? history[history.length - 1] : null;
    const currentFrames = lastStep ? lastStep.frames : Array(paging.frame_count).fill(null);

    framesGrid.innerHTML = currentFrames.map((page, idx) => `
      <div class="frame-box">
        <span class="frame-num">Frame ${idx}</span>
        <span class="frame-content">${page !== null && page !== undefined ? `Page ${page}` : '<em style="color: var(--text-dim); font-size:12px;">Empty</em>'}</span>
      </div>
    `).join('');
  }

  // Render Step-by-Step History Log Table
  const historyTable = document.querySelector('#pagingHistoryTable tbody');
  if (historyTable) {
    const history = paging.frame_history || [];
    if (history.length === 0) {
      historyTable.innerHTML = `<tr><td colspan="6" style="text-align: center; color: var(--text-dim);">No page replacement simulation executed yet. Use the controls above to run.</td></tr>`;
    } else {
      historyTable.innerHTML = history.map(h => `
        <tr>
          <td><strong>Step ${h.step}</strong></td>
          <td><span class="pid-tag" style="background-color: rgba(139, 92, 246, 0.2); color: var(--accent-purple);">Page ${h.page}</span></td>
          <td>[ ${h.frames.map(f => f !== null ? f : '-').join(', ')} ]</td>
          <td><span class="badge-state ${h.status === 'Hit' ? 'RUNNING' : 'TERMINATED'}">${h.status}</span></td>
          <td>${h.replaced_page !== null && h.replaced_page !== undefined ? `<span style="color: var(--accent-red); font-weight:600;">Page ${h.replaced_page}</span>` : '<span style="color: var(--text-dim);">-</span>'}</td>
          <td style="font-size: 12px; color: var(--text-muted);">${escapeHtml(h.reason || '')}</td>
        </tr>
      `).join('');
    }
  }
}

function updateDeadlockStatus(deadlock) {
  const banner = document.getElementById('deadlockStatusBanner');
  const title = document.getElementById('deadlockBannerTitle');
  const text = document.getElementById('deadlockBannerText');

  banner.className = `deadlock-status-banner ${deadlock.status.toLowerCase()}`;
  title.textContent = `${deadlock.status} STATE`;
  text.textContent = deadlock.explanation;

  // Available Resources Cards
  const cardsBox = document.getElementById('availableResourcesCards');
  if (cardsBox && deadlock.resources && deadlock.available) {
    cardsBox.innerHTML = deadlock.resources.map(r => `
      <div class="card metric-card">
        <div class="card-title">${r} Resource</div>
        <div class="card-value">${deadlock.available[r]} / ${deadlock.total_resources[r]}</div>
        <div class="card-subtext">Available / Total</div>
      </div>
    `).join('');
  }

  // Matrix Tables Rendering
  renderMatrixTable('allocMatrixTable', deadlock.allocation, deadlock.resources);
  renderMatrixTable('maxMatrixTable', deadlock.maximum, deadlock.resources);
  renderMatrixTable('needMatrixTable', deadlock.need, deadlock.resources);
}

function renderMatrixTable(tableId, matrix, resources) {
  const table = document.getElementById(tableId);
  if (!table || !matrix || !resources) return;

  const headerHtml = `
    <thead>
      <tr>
        <th>Process</th>
        ${resources.map(r => `<th>${r}</th>`).join('')}
      </tr>
    </thead>
  `;

  const rowsHtml = Object.keys(matrix).map(pid => `
    <tr>
      <td><span class="pid-tag">${pid}</span></td>
      ${resources.map(r => `<td><strong>${matrix[pid][r]}</strong></td>`).join('')}
    </tr>
  `).join('');

  table.innerHTML = headerHtml + `<tbody>${rowsHtml}</tbody>`;
}

function updateDeadlockFormInputs(deadlock) {
  const select = document.getElementById('req-pid-select');
  if (select && deadlock.allocation) {
    const currentVal = select.value;
    select.innerHTML = Object.keys(deadlock.allocation).map(pid => 
      `<option value="${pid}">${pid}</option>`
    ).join('');
    if (currentVal && select.querySelector(`option[value="${currentVal}"]`)) {
      select.value = currentVal;
    }
  }

  const container = document.getElementById('resourceInputsContainer');
  if (container && deadlock.resources) {
    container.innerHTML = deadlock.resources.map(r => `
      <div class="form-group">
        <label for="req-res-${r}">${r}</label>
        <input type="number" id="req-res-${r}" class="form-control req-res-input" data-resource="${r}" value="0" min="0" />
      </div>
    `).join('');
  }
}

/* ==========================================================================
   RESOURCE ALLOCATION GRAPH (RAG) SVG RENDERER
   ========================================================================== */
function renderResourceAllocationGraph(deadlock) {
  const svg = document.getElementById('ragSvg');
  if (!svg || !deadlock || !deadlock.allocation) return;

  const processes = Object.keys(deadlock.allocation);
  const resources = deadlock.resources || [];
  if (processes.length === 0 || resources.length === 0) {
    svg.innerHTML = '<text x="50%" y="50%" text-anchor="middle" fill="#9ca3af">No active processes for graph visualization.</text>';
    return;
  }

  const width = 760;
  const height = 300;
  
  // Calculate process positions on the left side
  const procPositions = {};
  processes.forEach((pid, idx) => {
    const y = (height / (processes.length + 1)) * (idx + 1);
    procPositions[pid] = { x: 140, y };
  });

  // Calculate resource positions on the right side
  const resPositions = {};
  resources.forEach((r, idx) => {
    const y = (height / (resources.length + 1)) * (idx + 1);
    resPositions[r] = { x: 620, y };
  });

  let svgContent = `
    <defs>
      <marker id="arrow-alloc" viewBox="0 0 10 10" refX="15" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
        <path d="M 0 0 L 10 5 L 0 10 z" fill="#10b981" />
      </marker>
      <marker id="arrow-req" viewBox="0 0 10 10" refX="15" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
        <path d="M 0 0 L 10 5 L 0 10 z" fill="#f59e0b" />
      </marker>
    </defs>
  `;

  // Draw Edges
  processes.forEach(pid => {
    const pPos = procPositions[pid];
    resources.forEach(r => {
      const rPos = resPositions[r];
      const allocCount = deadlock.allocation[pid][r] || 0;
      const needCount = deadlock.need ? (deadlock.need[pid][r] || 0) : 0;

      // Allocation Edge: Resource -> Process (Green)
      if (allocCount > 0) {
        svgContent += `
          <line x1="${rPos.x}" y1="${rPos.y}" x2="${pPos.x}" y2="${pPos.y}" 
                stroke="#10b981" stroke-width="${Math.min(4, 1 + allocCount)}" 
                marker-end="url(#arrow-alloc)" opacity="0.85" />
        `;
      }

      // Request/Need Edge: Process -> Resource (Amber)
      if (needCount > 0) {
        svgContent += `
          <line x1="${pPos.x}" y1="${pPos.y}" x2="${rPos.x}" y2="${rPos.y}" 
                stroke="#f59e0b" stroke-width="${Math.min(4, 1 + needCount)}" stroke-dasharray="4,4"
                marker-end="url(#arrow-req)" opacity="0.85" />
        `;
      }
    });
  });

  // Draw Process Nodes (Circles)
  processes.forEach(pid => {
    const pos = procPositions[pid];
    svgContent += `
      <g transform="translate(${pos.x}, ${pos.y})">
        <circle r="24" fill="#1f2937" stroke="#3b82f6" stroke-width="3" />
        <text text-anchor="middle" dy="4" fill="#f9fafb" font-weight="700" font-size="13">${pid}</text>
      </g>
    `;
  });

  // Draw Resource Nodes (Rectangles)
  resources.forEach(r => {
    const pos = resPositions[r];
    const avail = deadlock.available ? deadlock.available[r] : 0;
    const total = deadlock.total_resources ? deadlock.total_resources[r] : 0;

    svgContent += `
      <g transform="translate(${pos.x}, ${pos.y})">
        <rect x="-40" y="-20" width="80" height="40" rx="6" fill="#1f2937" stroke="#8b5cf6" stroke-width="3" />
        <text text-anchor="middle" dy="-2" fill="#f9fafb" font-weight="600" font-size="12">${r}</text>
        <text text-anchor="middle" dy="12" fill="#9ca3af" font-size="10">${avail}/${total} avail</text>
      </g>
    `;
  });

  svg.innerHTML = svgContent;
}

/* ==========================================================================
   FORM HANDLERS
   ========================================================================== */
async function handleCreateProcess(e) {
  e.preventDefault();
  const name = document.getElementById('input-name').value.trim();
  const arrival = parseInt(document.getElementById('input-arrival').value) || 0;
  const burst = parseInt(document.getElementById('input-burst').value) || 1;
  const priority = parseInt(document.getElementById('input-priority').value) || 0;
  const memory = parseInt(document.getElementById('input-memory').value) || 0;

  const maxCpu = parseInt(document.getElementById('input-max-cpu').value) || 0;
  const maxPrinter = parseInt(document.getElementById('input-max-printer').value) || 0;
  const maxDisk = parseInt(document.getElementById('input-max-disk').value) || 0;
  const maxNetwork = parseInt(document.getElementById('input-max-network').value) || 0;

  try {
    const res = await fetch('/api/processes', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name,
        arrival_time: arrival,
        burst_time: burst,
        priority,
        memory_required: memory,
        maximum_resources: {
          CPU: maxCpu,
          Printer: maxPrinter,
          Disk: maxDisk,
          Network: maxNetwork,
        }
      }),
    });

    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Failed to create process');

    const createdProc = data.process || {};
    document.getElementById('createProcessModal').classList.remove('active');
    document.getElementById('form-create-process').reset();
    showToast(`Process ${createdProc.pid} ('${createdProc.name}') created successfully.`, 'success');
    addLogEntry(`Process ${createdProc.pid} ('${createdProc.name}') created.`, 'success');
    fetchSystemState();

  } catch (err) {
    showToast(err.message, 'error');
  }
}

async function handleDeleteProcess(pid) {
  if (!confirm(`Are you sure you want to delete process ${pid}?`)) return;

  try {
    const res = await fetch(`/api/processes/${pid}`, { method: 'DELETE' });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Failed to delete process');

    showToast(`Process ${pid} deleted.`, 'success');
    addLogEntry(`Process ${pid} terminated.`, 'warning');
    fetchSystemState();

  } catch (err) {
    showToast(err.message, 'error');
  }
}

async function handleRunScheduling(e) {
  e.preventDefault();
  const algorithm = document.getElementById('sched-algo-select').value;
  const quantum = parseInt(document.getElementById('sched-quantum-input').value) || 2;

  try {
    const res = await fetch('/api/scheduling/run', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ algorithm, quantum }),
    });

    const result = await res.json();
    if (!res.ok) throw new Error(result.error || 'Scheduling failed');

    renderSchedulingResults(result);
    showToast(`Scheduled using ${result.algorithm}`, 'success');
    addLogEntry(`Ran CPU Scheduler: ${result.algorithm}`, 'info');

  } catch (err) {
    showToast(err.message, 'error');
  }
}

function renderSchedulingResults(result) {
  document.getElementById('scheduling-results').style.display = 'block';
  document.getElementById('sched-algo-badge').textContent = result.algorithm;

  // Render Metrics Cards
  const m = result.metrics;
  document.getElementById('metric-avg-waiting').textContent = `${m.average_waiting_time} ms`;
  document.getElementById('metric-avg-turnaround').textContent = `${m.average_turnaround_time} ms`;
  document.getElementById('metric-avg-response').textContent = `${m.average_response_time} ms`;
  document.getElementById('metric-cpu-util').textContent = `${m.cpu_utilization}%`;

  // Render Gantt Chart
  const ganttContainer = document.getElementById('ganttChartContainer');
  const gantt = result.gantt;
  const totalDuration = gantt.length > 0 ? gantt[gantt.length - 1].end : 1;

  let timelineHtml = '<div class="gantt-timeline-bar">';
  gantt.forEach((slice, idx) => {
    const pct = ((slice.end - slice.start) / totalDuration) * 100;
    const label = slice.pid ? slice.pid : 'IDLE';
    const colorClass = slice.pid ? '' : 'idle';
    const bgStyle = slice.pid ? `background-color: ${getProcessColor(slice.pid)};` : '';

    timelineHtml += `
      <div class="gantt-block ${colorClass}" style="width: ${pct}%; ${bgStyle}" title="${label} (${slice.start} -> ${slice.end})">
        <span>${label}</span>
      </div>
    `;
  });
  timelineHtml += '</div>';

  // Axis Ticks
  timelineHtml += '<div class="gantt-time-axis">';
  let times = [0];
  gantt.forEach(s => times.push(s.end));
  const uniqueTimes = [...new Set(times)];
  uniqueTimes.forEach(t => {
    const leftPct = (t / totalDuration) * 100;
    timelineHtml += `<span class="gantt-tick" style="left: ${leftPct}%;">${t}</span>`;
  });
  timelineHtml += '</div>';

  ganttContainer.innerHTML = timelineHtml;

  // Metrics Table
  const tableBody = document.querySelector('#schedMetricsTable tbody');
  tableBody.innerHTML = m.processes.map(p => `
    <tr>
      <td><span class="pid-tag">${p.pid}</span></td>
      <td>${p.completion_time} ms</td>
      <td>${p.turnaround_time} ms</td>
      <td>${p.waiting_time} ms</td>
      <td>${p.response_time} ms</td>
    </tr>
  `).join('');
}

async function handleRunSafetyCheck() {
  try {
    const res = await fetch('/api/deadlock/safety', { method: 'POST' });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Safety check failed');

    const chips = document.getElementById('safeSeqChips');
    if (data.safe && data.safe_sequence) {
      chips.innerHTML = data.safe_sequence.map(p => `<span class="seq-chip">${p}</span>`).join(' &rarr; ');
    } else {
      chips.innerHTML = '<span class="seq-chip" style="background-color: var(--accent-red);">None</span>';
    }

    document.getElementById('safetyExplanation').textContent = data.explanation;
    showToast(data.safe ? 'System is in a SAFE state.' : 'System is UNSAFE!', data.safe ? 'success' : 'error');
    addLogEntry(`Banker's Safety Check: ${data.explanation}`, data.safe ? 'success' : 'warning');

  } catch (err) {
    showToast(err.message, 'error');
  }
}

async function handleRunDeadlockDetection() {
  try {
    const res = await fetch('/api/deadlock/detect', { method: 'POST' });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Deadlock detection failed');

    showToast(data.explanation, data.deadlock_detected ? 'error' : 'success');
    addLogEntry(`Deadlock Detector: ${data.explanation}`, data.deadlock_detected ? 'error' : 'info');
    fetchSystemState();

  } catch (err) {
    showToast(err.message, 'error');
  }
}

async function handleResourceRequest(e) {
  e.preventDefault();
  const pid = document.getElementById('req-pid-select').value;
  const reqInputs = document.querySelectorAll('.req-res-input');
  
  const requestObj = {};
  reqInputs.forEach(inp => {
    const resName = inp.getAttribute('data-resource');
    requestObj[resName] = parseInt(inp.value) || 0;
  });

  try {
    const res = await fetch('/api/deadlock/request', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ process_id: pid, request: requestObj }),
    });

    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Resource request error');

    const resultBox = document.getElementById('requestResultBox');
    resultBox.style.display = 'block';

    if (data.granted) {
      resultBox.className = 'request-result-alert granted';
      resultBox.innerHTML = `<strong>✓ REQUEST GRANTED:</strong> ${escapeHtml(data.explanation)}`;
      showToast(`Request granted for ${pid}`, 'success');
      addLogEntry(`Resource Request GRANTED for ${pid}`, 'success');
    } else {
      resultBox.className = 'request-result-alert denied';
      resultBox.innerHTML = `<strong>✗ REQUEST DENIED:</strong> ${escapeHtml(data.explanation)}`;
      showToast(`Request denied for ${pid}`, 'error');
      addLogEntry(`Resource Request DENIED for ${pid}`, 'error');
    }

    fetchSystemState();

  } catch (err) {
    showToast(err.message, 'error');
  }
}

/* ==========================================================================
   MEMORY & PAGING FORM HANDLERS
   ========================================================================== */
async function handleStrategyChange(e) {
  const strategy = e.target.value;
  try {
    const res = await fetch('/api/memory/strategy', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ strategy }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Failed to change memory strategy');
    showToast(`Memory strategy switched to ${strategy.replace('_', ' ')}`, 'success');
    fetchSystemState();
  } catch (err) {
    showToast(err.message, 'error');
  }
}

async function handleResetMemory() {
  if (!confirm('Are you sure you want to reset memory allocation?')) return;
  try {
    const res = await fetch('/api/memory/reset', { method: 'POST' });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Failed to reset memory');
    showToast('Physical memory reset successfully.', 'success');
    addLogEntry('Memory Manager reset to initial unallocated state.', 'warning');
    fetchSystemState();
  } catch (err) {
    showToast(err.message, 'error');
  }
}

async function handleRunPaging(e) {
  e.preventDefault();
  const refStr = document.getElementById('paging-ref-string').value.trim();
  const frames = parseInt(document.getElementById('paging-frames-input').value) || 3;
  const algorithm = document.getElementById('paging-algo-select').value;

  try {
    const res = await fetch('/api/paging/run', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ reference_string: refStr, frame_count: frames, algorithm }),
    });

    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Paging simulation failed');

    const compBox = document.getElementById('paging-comparison-box');
    if (compBox) compBox.style.display = 'none';

    updatePagingDisplay(data);
    showToast(`Paging simulation executed (${data.algorithm}): ${data.page_faults} faults, ${data.page_hits} hits.`, 'success');
    addLogEntry(`Ran Page Replacement (${data.algorithm}): Faults=${data.page_faults}, Hits=${data.page_hits}, Hit Rate=${data.hit_ratio_pct || data.page_hit_rate}%`, 'info');

  } catch (err) {
    showToast(err.message, 'error');
  }
}

async function handleComparePaging() {
  const refStr = document.getElementById('paging-ref-string').value.trim();
  const frames = parseInt(document.getElementById('paging-frames-input').value) || 3;

  try {
    const res = await fetch('/api/paging/compare', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ reference_string: refStr, frame_count: frames }),
    });

    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Paging comparison failed');

    const compBox = document.getElementById('paging-comparison-box');
    if (compBox) compBox.style.display = 'block';

    const bestBadge = document.getElementById('paging-best-algo-badge');
    if (bestBadge) bestBadge.textContent = `Best: ${data.best_algorithm}`;

    const compTable = document.querySelector('#pagingComparisonTable tbody');
    if (compTable) {
      compTable.innerHTML = data.comparison.map(c => `
        <tr style="${c.algorithm === data.best_algorithm ? 'background-color: rgba(16, 185, 129, 0.1);' : ''}">
          <td><strong>${c.algorithm}</strong> ${c.algorithm === data.best_algorithm ? '<span class="pid-tag" style="background-color: var(--accent-green); color:#fff; margin-left:6px;">BEST</span>' : ''}</td>
          <td>${c.total_references}</td>
          <td><strong style="color: var(--accent-red);">${c.page_faults}</strong></td>
          <td><strong style="color: var(--accent-green);">${c.page_hits}</strong></td>
          <td>${c.page_fault_rate}%</td>
          <td>${c.page_hit_rate}%</td>
        </tr>
      `).join('');
    }

    const bestDetail = data.detailed_results ? data.detailed_results[data.best_algorithm] : null;
    if (bestDetail) {
      updatePagingDisplay(bestDetail);
    }

    showToast(`Comparison complete! Best algorithm: ${data.best_algorithm}`, 'success');
    addLogEntry(`Compared Paging Algorithms: Best performer is ${data.best_algorithm}`, 'success');

  } catch (err) {
    showToast(err.message, 'error');
  }
}

/* ==========================================================================
   CPU CHART & UTILS
   ========================================================================== */
function initCpuChart() {
  const canvas = document.getElementById('cpuChartCanvas');
  if (!canvas) return;
  canvas.width = canvas.parentElement.clientWidth;
  canvas.height = 180;
}

function updateCPUChart(cpu) {
  const canvas = document.getElementById('cpuChartCanvas');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');

  cpuHistory.push(cpu.usage_pct || 0);
  if (cpuHistory.length > 25) cpuHistory.shift();

  const w = canvas.width = canvas.parentElement.clientWidth;
  const h = canvas.height = 180;

  ctx.clearRect(0, 0, w, h);

  // Background Grid Lines
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.05)';
  ctx.lineWidth = 1;
  for (let y = 0; y <= h; y += 45) {
    ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(w, y); ctx.stroke();
  }

  // Draw Area Line Chart
  const step = w / (cpuHistory.length - 1);
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
}

function getProcessColor(pid) {
  const num = parseInt(pid.replace(/\D/g, '')) || 0;
  return PROC_COLORS[num % PROC_COLORS.length];
}

function showToast(msg, type = 'info') {
  const container = document.getElementById('toastContainer');
  if (!container) return;
  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  toast.textContent = msg;
  container.appendChild(toast);
  setTimeout(() => toast.remove(), 4000);
}

function addLogEntry(msg, type = 'info') {
  const box = document.getElementById('eventLogBox');
  if (!box) return;
  const now = new Date().toTimeString().split(' ')[0];
  const div = document.createElement('div');
  div.className = `log-entry ${type}`;
  div.innerHTML = `<span class="log-time">${now}</span> ${escapeHtml(msg)}`;
  box.prepend(div);
}

function escapeHtml(str) {
  if (!str) return '';
  return str.replace(/[&<>"']/g, m => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;'
  })[m]);
}
