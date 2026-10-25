import React, { useState, useEffect, useRef, useCallback } from 'react';
import Sidebar from './components/Sidebar';
import Header from './components/Header';
import DashboardTab from './components/DashboardTab';
import ProcessesTab from './components/ProcessesTab';
import SchedulingTab from './components/SchedulingTab';
import MemoryTab from './components/MemoryTab';
import PagingTab from './components/PagingTab';
import DeadlocksTab from './components/DeadlocksTab';
import CreateProcessModal from './components/CreateProcessModal';
import ToastContainer from './components/ToastContainer';
import './style.css';

export default function App() {
  const [currentTab, setCurrentTab] = useState(() => {
    const hash = window.location.hash.replace('#', '');
    return ['dashboard', 'processes', 'scheduling', 'memory', 'paging', 'deadlocks'].includes(hash)
      ? hash
      : 'dashboard';
  });

  const [systemState, setSystemState] = useState(null);
  const [cpuHistory, setCpuHistory] = useState(() => Array(20).fill(0));
  const [connectionStatus, setConnectionStatus] = useState('System Active');
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [toasts, setToasts] = useState([]);
  const [eventLogs, setEventLogs] = useState([
    {
      id: 'init-log',
      time: '00:00:00',
      text: 'Simulated OS initialized. Create processes to begin simulation.',
      type: 'info'
    }
  ]);

  // Results state from actions
  const [schedulingResult, setSchedulingResult] = useState(null);
  const [pagingComparisonResult, setPagingComparisonResult] = useState(null);
  const [safetyResult, setSafetyResult] = useState(null);
  const [requestResult, setRequestResult] = useState(null);

  // Sync hash with tab
  const handleSelectTab = (tabId) => {
    setCurrentTab(tabId);
    window.location.hash = tabId;
  };

  useEffect(() => {
    const handleHashChange = () => {
      const hash = window.location.hash.replace('#', '');
      if (['dashboard', 'processes', 'scheduling', 'memory', 'paging', 'deadlocks'].includes(hash)) {
        setCurrentTab(hash);
      }
    };
    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, []);

  // Toast Helper
  const showToast = useCallback((message, type = 'info') => {
    const id = Date.now() + Math.random().toString(36).substring(2, 9);
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4000);
  }, []);

  // Event Log Helper
  const addLog = useCallback((text, type = 'info') => {
    const now = new Date().toTimeString().split(' ')[0];
    const id = Date.now() + Math.random().toString(36).substring(2, 9);
    setEventLogs((prev) => [{ id, time: now, text, type }, ...prev]);
  }, []);

  // Fetch System State
  const fetchSystemState = useCallback(async () => {
    try {
      const res = await fetch('/api/state');
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      setSystemState(data);
      setConnectionStatus('System Active');

      // Update CPU chart history
      setCpuHistory((prev) => {
        const next = [...prev, data.cpu?.usage_pct || 0];
        if (next.length > 25) next.shift();
        return next;
      });
    } catch (err) {
      console.error('Error fetching OS state:', err);
      setConnectionStatus('API Connection Error');
    }
  }, []);

  // Auto Polling
  useEffect(() => {
    fetchSystemState();
    const interval = setInterval(fetchSystemState, 1500);
    return () => clearInterval(interval);
  }, [fetchSystemState]);

  // Sync State Button Handler
  const handleSyncState = () => {
    fetchSystemState();
    showToast('System state synchronized.', 'success');
  };

  // Clear Event Logs
  const handleClearLogs = () => {
    setEventLogs([]);
  };

  // Create Process API
  const handleCreateProcess = async (processData) => {
    try {
      const res = await fetch('/api/processes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(processData),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to create process');

      const created = data.process || {};
      setIsCreateModalOpen(false);
      showToast(`Process ${created.pid} ('${created.name}') created successfully.`, 'success');
      addLog(`Process ${created.pid} ('${created.name}') created.`, 'success');
      fetchSystemState();
    } catch (err) {
      showToast(err.message, 'error');
    }
  };

  // Delete Process API
  const handleDeleteProcess = async (pid) => {
    if (!window.confirm(`Are you sure you want to delete process ${pid}?`)) return;
    try {
      const res = await fetch(`/api/processes/${pid}`, { method: 'DELETE' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to delete process');

      showToast(`Process ${pid} deleted.`, 'success');
      addLog(`Process ${pid} terminated.`, 'warning');
      fetchSystemState();
    } catch (err) {
      showToast(err.message, 'error');
    }
  };

  // Run Scheduling Simulation API
  const handleRunScheduling = async ({ algorithm, quantum }) => {
    try {
      const res = await fetch('/api/scheduling/run', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ algorithm, quantum }),
      });
      const result = await res.json();
      if (!res.ok) throw new Error(result.error || 'Scheduling failed');

      setSchedulingResult(result);
      showToast(`Scheduled using ${result.algorithm}`, 'success');
      addLog(`Ran CPU Scheduler: ${result.algorithm}`, 'info');
      fetchSystemState();
    } catch (err) {
      showToast(err.message, 'error');
    }
  };

  // Load Benchmark Workload with varied arrivals, bursts, and priorities
  const handleLoadBenchmark = async () => {
    try {
      if (systemState?.processes?.length > 0) {
        for (const p of systemState.processes) {
          await fetch(`/api/processes/${p.pid}`, { method: 'DELETE' });
        }
      }

      const benchmarkProcesses = [
        { name: 'Alpha', arrival_time: 0, burst_time: 6, priority: 3, memory_required: 128 },
        { name: 'Beta', arrival_time: 2, burst_time: 2, priority: 1, memory_required: 256 },
        { name: 'Gamma', arrival_time: 4, burst_time: 8, priority: 4, memory_required: 64 },
        { name: 'Delta', arrival_time: 5, burst_time: 3, priority: 2, memory_required: 192 },
      ];

      for (const p of benchmarkProcesses) {
        await fetch('/api/processes', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(p),
        });
      }

      showToast('Loaded benchmark workload with distinct arrivals, bursts & priorities!', 'success');
      addLog('Loaded comparison benchmark: P1(arr 0, burst 6), P2(arr 2, burst 2, prio 1), P3(arr 4, burst 8), P4(arr 5, burst 3, prio 2).', 'info');
      fetchSystemState();
    } catch (err) {
      showToast(err.message, 'error');
    }
  };

  // Memory Strategy Change API
  const handleChangeMemoryStrategy = async (strategy) => {
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
  };

  // Reset Memory API
  const handleResetMemory = async () => {
    if (!window.confirm('Are you sure you want to reset memory allocation?')) return;
    try {
      const res = await fetch('/api/memory/reset', { method: 'POST' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to reset memory');

      showToast('Physical memory reset successfully.', 'success');
      addLog('Memory Manager reset to initial unallocated state.', 'warning');
      fetchSystemState();
    } catch (err) {
      showToast(err.message, 'error');
    }
  };

  // Run Paging Simulation API
  const handleRunPaging = async ({ reference_string, frame_count, algorithm }) => {
    try {
      const res = await fetch('/api/paging/run', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reference_string, frame_count, algorithm }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Paging simulation failed');

      setPagingComparisonResult(null);
      showToast(
        `Paging simulation executed (${data.algorithm}): ${data.page_faults} faults, ${data.page_hits} hits.`,
        'success'
      );
      addLog(
        `Ran Page Replacement (${data.algorithm}): Faults=${data.page_faults}, Hits=${data.page_hits}, Hit Rate=${data.hit_ratio_pct || data.page_hit_rate}%`,
        'info'
      );
      fetchSystemState();
    } catch (err) {
      showToast(err.message, 'error');
    }
  };

  // Compare Paging Algorithms API
  const handleComparePaging = async ({ reference_string, frame_count }) => {
    try {
      const res = await fetch('/api/paging/compare', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reference_string, frame_count }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Paging comparison failed');

      setPagingComparisonResult(data);
      showToast(`Comparison complete! Best algorithm: ${data.best_algorithm}`, 'success');
      addLog(`Compared Paging Algorithms: Best performer is ${data.best_algorithm}`, 'success');
      fetchSystemState();
    } catch (err) {
      showToast(err.message, 'error');
    }
  };

  // Deadlock Safety Check API
  const handleRunSafetyCheck = async () => {
    try {
      const res = await fetch('/api/deadlock/safety', { method: 'POST' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Safety check failed');

      setSafetyResult(data);
      showToast(data.safe ? 'System is in a SAFE state.' : 'System is UNSAFE!', data.safe ? 'success' : 'error');
      addLog(`Banker's Safety Check: ${data.explanation}`, data.safe ? 'success' : 'warning');
      fetchSystemState();
    } catch (err) {
      showToast(err.message, 'error');
    }
  };

  // Deadlock Detection API
  const handleRunDeadlockDetection = async () => {
    try {
      const res = await fetch('/api/deadlock/detect', { method: 'POST' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Deadlock detection failed');

      showToast(data.explanation, data.deadlock_detected ? 'error' : 'success');
      addLog(`Deadlock Detector: ${data.explanation}`, data.deadlock_detected ? 'error' : 'info');
      fetchSystemState();
    } catch (err) {
      showToast(err.message, 'error');
    }
  };

  // Resource Request API
  const handleResourceRequest = async ({ process_id, request }) => {
    try {
      const res = await fetch('/api/deadlock/request', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ process_id, request }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Resource request error');

      setRequestResult(data);
      if (data.granted) {
        showToast(`Request granted for ${process_id}`, 'success');
        addLog(`Resource Request GRANTED for ${process_id}`, 'success');
      } else {
        showToast(`Request denied for ${process_id}`, 'error');
        addLog(`Resource Request DENIED for ${process_id}`, 'error');
      }
      fetchSystemState();
    } catch (err) {
      showToast(err.message, 'error');
    }
  };

  return (
    <div className="app-layout">
      {/* SIDEBAR */}
      <Sidebar
        currentTab={currentTab}
        onSelectTab={handleSelectTab}
        connectionStatus={connectionStatus}
      />

      {/* MAIN CONTENT AREA */}
      <main className="main-content">
        {/* TOP HEADER */}
        <Header
          currentTab={currentTab}
          deadlockState={systemState?.deadlock}
          onSyncState={handleSyncState}
        />

        <div className="content-scroll">
          {currentTab === 'dashboard' && (
            <DashboardTab
              systemState={systemState}
              cpuHistory={cpuHistory}
              eventLogs={eventLogs}
              onClearLogs={handleClearLogs}
              onSwitchTab={handleSelectTab}
            />
          )}

          {currentTab === 'processes' && (
            <ProcessesTab
              processes={systemState?.processes || []}
              onOpenCreateModal={() => setIsCreateModalOpen(true)}
              onDeleteProcess={handleDeleteProcess}
            />
          )}

          {currentTab === 'scheduling' && (
            <SchedulingTab
              onRunScheduling={handleRunScheduling}
              schedulingResult={schedulingResult}
              onLoadBenchmark={handleLoadBenchmark}
            />
          )}

          {currentTab === 'memory' && (
            <MemoryTab
              memoryState={systemState?.memory}
              onChangeStrategy={handleChangeMemoryStrategy}
              onResetMemory={handleResetMemory}
            />
          )}

          {currentTab === 'paging' && (
            <PagingTab
              pagingState={systemState?.paging}
              onRunPaging={handleRunPaging}
              onComparePaging={handleComparePaging}
              comparisonResult={pagingComparisonResult}
            />
          )}

          {currentTab === 'deadlocks' && (
            <DeadlocksTab
              deadlockState={systemState?.deadlock}
              onRunSafetyCheck={handleRunSafetyCheck}
              onRunDeadlockDetection={handleRunDeadlockDetection}
              onRequestResources={handleResourceRequest}
              safetyResult={safetyResult}
              requestResult={requestResult}
            />
          )}
        </div>
      </main>

      {/* CREATE PROCESS MODAL */}
      <CreateProcessModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onCreateProcess={handleCreateProcess}
      />

      {/* TOAST NOTIFICATIONS */}
      <ToastContainer toasts={toasts} />
    </div>
  );
}
