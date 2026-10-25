import React, { useState } from 'react';
import { getProcessColor } from '../utils';

export default function SchedulingTab({ onRunScheduling, schedulingResult, onLoadBenchmark }) {
  const [algorithm, setAlgorithm] = useState('FCFS');
  const [quantum, setQuantum] = useState(2);

  const handleSubmit = (e) => {
    e.preventDefault();
    onRunScheduling({ algorithm, quantum });
  };

  const gantt = schedulingResult?.gantt || [];
  const metrics = schedulingResult?.metrics;
  const totalDuration = gantt.length > 0 ? gantt[gantt.length - 1].end : 1;

  // Unique timeline tick marks
  const times = [0];
  gantt.forEach((s) => times.push(s.end));
  const uniqueTimes = [...new Set(times)];

  return (
    <section id="view-scheduling" className="tab-view active">
      <div className="card">
        <div className="card-header border-bottom">
          <div>
            <h3 className="card-heading">CPU Scheduling Simulation</h3>
            <p className="card-subheading">Execute Member 1's scheduling dispatcher algorithms on active processes.</p>
          </div>
        </div>

        <div className="card-body">
          <form id="form-scheduling" className="scheduling-controls" onSubmit={handleSubmit}>
            <div className="form-group" style={{ flex: 2, minWidth: '220px' }}>
              <label htmlFor="sched-algo-select">Select Scheduling Algorithm</label>
              <select
                id="sched-algo-select"
                className="form-control"
                value={algorithm}
                onChange={(e) => setAlgorithm(e.target.value)}
              >
                <option value="FCFS">First-Come, First-Served (FCFS)</option>
                <option value="SJF">Shortest Job First (SJF - Non-Preemptive)</option>
                <option value="SRTF">Shortest Remaining Time First (SRTF - Preemptive SJF)</option>
                <option value="PRIORITY">Priority Scheduling (Non-Preemptive)</option>
                <option value="PRIORITY_PREEMPTIVE">Priority Scheduling (Preemptive)</option>
                <option value="RR">Round Robin (RR)</option>
              </select>
            </div>

            {algorithm === 'RR' && (
              <div className="form-group" id="quantum-group" style={{ flex: 1, minWidth: '110px' }}>
                <label htmlFor="sched-quantum-input">Time Quantum</label>
                <input
                  type="number"
                  id="sched-quantum-input"
                  className="form-control"
                  value={quantum}
                  min="1"
                  max="100"
                  onChange={(e) => setQuantum(parseInt(e.target.value, 10) || 1)}
                />
              </div>
            )}

            <div className="form-group align-end" style={{ display: 'flex', gap: '8px' }}>
              <button type="submit" className="btn btn-primary" id="btn-run-sched">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <polygon points="5 3 19 12 5 21 5 3"></polygon>
                </svg>
                RUN SIMULATION
              </button>
              {onLoadBenchmark && (
                <button
                  type="button"
                  className="btn btn-secondary"
                  id="btn-load-benchmark"
                  onClick={onLoadBenchmark}
                  title="Loads a varied set of processes with contrasting arrival times and bursts to showcase differences across all algorithms"
                >
                  Load Benchmark Workload
                </button>
              )}
            </div>
          </form>
        </div>
      </div>

      {/* SCHEDULING RESULTS CONTAINER */}
      {schedulingResult && metrics && (
        <div id="scheduling-results" className="margin-top-lg">
          {/* GANTT CHART CARD */}
          <div className="card">
            <div className="card-header border-bottom">
              <h3 className="card-heading">Gantt Chart Visualization</h3>
              <span className="badge badge-info" id="sched-algo-badge">
                {schedulingResult.algorithm}
              </span>
            </div>
            <div className="card-body">
              <div className="gantt-chart-wrapper" id="ganttChartContainer">
                <div className="gantt-timeline-bar">
                  {gantt.map((slice, idx) => {
                    const pct = ((slice.end - slice.start) / totalDuration) * 100;
                    const label = slice.pid ? slice.pid : 'IDLE';
                    const colorClass = slice.pid ? '' : 'idle';
                    const bgStyle = slice.pid ? { backgroundColor: getProcessColor(slice.pid) } : {};

                    return (
                      <div
                        key={idx}
                        className={`gantt-block ${colorClass}`}
                        style={{ width: `${pct}%`, ...bgStyle }}
                        title={`${label} (${slice.start} -> ${slice.end})`}
                      >
                        <span>{label}</span>
                      </div>
                    );
                  })}
                </div>

                <div className="gantt-time-axis">
                  {uniqueTimes.map((t, idx) => {
                    const leftPct = (t / totalDuration) * 100;
                    return (
                      <span key={idx} className="gantt-tick" style={{ left: `${leftPct}%` }}>
                        {t}
                      </span>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>

          {/* METRICS SUMMARY CARDS */}
          <div className="cards-grid margin-top-lg">
            <div className="card metric-card">
              <div className="card-title">Average Waiting Time</div>
              <div className="card-value color-blue" id="metric-avg-waiting">
                {metrics.average_waiting_time} ms
              </div>
            </div>
            <div className="card metric-card">
              <div className="card-title">Average Turnaround Time</div>
              <div className="card-value color-green" id="metric-avg-turnaround">
                {metrics.average_turnaround_time} ms
              </div>
            </div>
            <div className="card metric-card">
              <div className="card-title">Average Response Time</div>
              <div className="card-value color-purple" id="metric-avg-response">
                {metrics.average_response_time} ms
              </div>
            </div>
            <div className="card metric-card">
              <div className="card-title">CPU Utilization</div>
              <div className="card-value color-orange" id="metric-cpu-util">
                {metrics.cpu_utilization}%
              </div>
            </div>
          </div>

          {/* DETAILED METRICS TABLE */}
          <div className="card margin-top-lg">
            <div className="card-header border-bottom">
              <h3 className="card-heading">Per-Process Timing Metrics</h3>
            </div>
            <div className="table-container">
              <table className="data-table" id="schedMetricsTable">
                <thead>
                  <tr>
                    <th>PID</th>
                    <th>Completion Time</th>
                    <th>Turnaround Time</th>
                    <th>Waiting Time</th>
                    <th>Response Time</th>
                  </tr>
                </thead>
                <tbody>
                  {metrics.processes?.map((p) => (
                    <tr key={p.pid}>
                      <td><span className="pid-tag">{p.pid}</span></td>
                      <td>{p.completion_time} ms</td>
                      <td>{p.turnaround_time} ms</td>
                      <td>{p.waiting_time} ms</td>
                      <td>{p.response_time} ms</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
