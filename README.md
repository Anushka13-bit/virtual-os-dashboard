# Virtual OS Dashboard

A fully integrated, simulated Operating System dashboard built with **Python (Flask)** and **HTML5 / CSS3 / JavaScript**. It visualises and simulates six core OS subsystems in real-time: CPU Scheduling, Memory Allocation, Page Replacement, Deadlock Avoidance and Detection, and live Process Management — all in a single dark-mode web dashboard.

---

## 🌟 Features at a Glance

| Module | Algorithms / Capabilities |
|---|---|
| **CPU Scheduling** | FCFS, SJF, Priority, Round Robin — animated Gantt charts + timing metrics |
| **Memory Allocation** | First Fit, Best Fit, Worst Fit — coalescing deallocation, fragmentation tracking |
| **Page Replacement** | FIFO, LRU, Optimal (Belady's) — frame history, fault/hit rates, side-by-side comparison |
| **Deadlock Management** | Banker's Safety Algorithm, Resource Request Algorithm, Multi-instance Deadlock Detection, Resource Allocation Graph (RAG) |
| **Process Control** | Create, inspect, and terminate simulated processes — state propagates across all modules |
| **Live Dashboard** | Auto-refreshing metrics, real-time CPU activity chart, system event log |

---

## 📁 Project Structure

```
virtual-os-dashboard/
├── backend/
│   ├── app.py                     # Flask application & all REST API routes
│   ├── deadlock.py                # DeadlockManager — Banker's + detection algorithms
│   ├── banker.py                  # Banker's Algorithm core implementation
│   ├── scheduling/
│   │   ├── __init__.py
│   │   ├── models.py              # Process & GanttEntry data models
│   │   ├── scheduler.py           # FCFS, SJF, Priority, Round Robin dispatcher
│   │   ├── metrics.py             # Turnaround, waiting, response time calculations
│   │   └── example.py            # Standalone usage example
│   └── memory/
│       ├── __init__.py
│       ├── allocation.py          # MemoryManager — First/Best/Worst Fit, coalescing
│       ├── page_replacement.py    # FIFO, LRU, Optimal page replacement
│       └── statistics.py          # Memory & paging stats, compare_page_replacement
├── frontend/
│   ├── index.html                 # Single-page dashboard UI (6 tabs)
│   ├── dashboard.js               # All UI logic, API polling, chart rendering
│   └── style.css                  # Dark theme, layout, component styles
├── tests/
│   ├── test_api.py                # Flask REST API integration tests (9)
│   ├── test_scheduling.py         # CPU scheduling algorithm tests (12)
│   ├── test_deadlock.py           # Deadlock / Banker's algorithm tests (9)
│   ├── test_memory_allocation.py  # Memory allocation tests (5)
│   ├── test_page_replacement.py   # Page replacement tests (8)
│   └── test_memory_statistics.py  # Memory stats & comparison tests (3)
├── requirements.txt               # flask>=3.0.0, pytest>=8.0.0
├── requirements-dev.txt           # pytest>=8.0 (dev-only)
└── pytest.ini                     # pythonpath = . (enables backend.* imports)
```

---

## 🚀 Setup & Running

### Prerequisites
- Python 3.8+
- macOS / Linux / Windows

### 1. Clone and enter the project

```bash
git clone https://github.com/Anushka13-bit/virtual-os-dashboard.git
cd virtual-os-dashboard
git checkout main
```

### 2. Create and activate a virtual environment

> **Required on macOS** — the system Python is externally managed and blocks global pip installs.

```bash
python3 -m venv .venv
source .venv/bin/activate      # macOS / Linux
# .venv\Scripts\activate       # Windows
```

### 3. Install dependencies

```bash
pip install -r requirements.txt
```

### 4. Build or Run Frontend (React + Vite)

The frontend is built with **React + Vite**, maintaining the exact dark-mode OS dashboard UI:

```bash
# Install frontend dependencies (first time)
cd frontend && npm install

# Build the production React bundle (auto-served by Flask)
npm run build
cd ..
```

### 5. Start the server

```bash
python backend/app.py
```

Open your browser and go to: **[http://127.0.0.1:5000](http://127.0.0.1:5000)**

> **Frontend Development Mode (Optional with HMR):**
> Run `cd frontend && npm run dev` to start Vite at `http://localhost:5173` with instant hot module reloading (automatically proxies all API requests to Flask on port 5000).

### 6. Run the test suite

```bash
pytest -v
# 46 passed in ~0.3s
```

> To reactivate the venv in a new terminal session: `source .venv/bin/activate`

---

## 🖥️ Dashboard Tabs — What They Do

### 1. Dashboard (Home)
Live overview of the entire simulated OS:
- **CPU Usage** — percentage from last scheduling run
- **Memory Usage** — MB used vs total (1024 MB)
- **Active Processes** — count and READY/RUNNING breakdown
- **Page Faults** — from last page replacement simulation
- **Deadlock Status** — SAFE / WARNING / DEADLOCK badge (auto-updates every 2s)
- **CPU Activity Monitor** — real-time canvas chart
- **System Event Log** — timestamped log of every action

### 2. Processes
- Click **"Create Process"** to open the form
- Fields: Name, Arrival Time, Burst Time, Priority, Memory Required (MB)
- PID is auto-assigned (P1, P2, P3 …) or can be specified manually
- Deleting a process immediately frees its memory and updates the deadlock resource graph

### 3. Scheduling
- Select: **FCFS**, **SJF**, **Priority Scheduling**, or **Round Robin**
- For Round Robin, set a **Time Quantum** (default: 2)
- Click **RUN SIMULATION** → animated **Gantt Chart** appears
- Metrics table: Completion Time, Turnaround Time, Waiting Time, Response Time per process + averages + CPU Utilisation %

### 4. Memory
- Colour-coded **allocation map** showing each process's memory block
- Stats: Total, Used, Free MB, Utilisation %, External Fragmentation count
- Switch between **First Fit**, **Best Fit**, **Worst Fit** strategies live

### 5. Paging
- Enter a **Reference String** (e.g. `7 0 1 2 0 3 0 4 2 3 0 3 2`)
- Set **Frame Count** (e.g. `3`)
- Run **FIFO**, **LRU**, or **Optimal** individually, or **Compare All** side-by-side
- Output: step-by-step frame history table, page faults count, page hits, fault rate %

### 6. Deadlocks
- **Run Safety Check** — Banker's Algorithm returns safe sequence or flags unsafe state
- **Resource Request** — simulate a process requesting resources; granted or denied
- **Run Detection** — detect if system is already deadlocked; names involved processes/resources
- **Resource Allocation Graph (RAG)** — live SVG showing allocation and request edges

---

## 🔌 REST API Reference

All endpoints accept and return JSON. Base URL: `http://127.0.0.1:5000`

### Process Management

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/api/state` | Full OS state snapshot (CPU, memory, paging, processes, deadlock) |
| `GET` | `/api/processes` | List all active processes |
| `POST` | `/api/processes` | Create a new process |
| `DELETE` | `/api/processes/<pid>` | Delete a process by PID |

**Create process — request body:**
```json
{
  "name": "Alpha",
  "arrival_time": 0,
  "burst_time": 5,
  "priority": 2,
  "memory_required": 100
}
```

### CPU Scheduling

| Method | Endpoint | Description |
|---|---|---|
| `POST` | `/api/scheduling/run` | Run scheduling algorithm on active processes |

```json
{ "algorithm": "RR", "quantum": 2 }
```
Supported: `FCFS`, `SJF`, `PRIORITY`, `RR` / `ROUND_ROBIN`

Response includes: `algorithm`, `gantt` (Gantt chart entries), `metrics` (per-process + averages), `processes`

### Memory Management

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/api/memory/state` | Current memory allocation state |
| `POST` | `/api/memory/allocate` | Allocate memory (`process_id`, `size`, `algorithm`) |
| `POST` | `/api/memory/deallocate` | Free memory for a process (`process_id`) |
| `POST` | `/api/memory/strategy` | Set strategy: `first_fit`, `best_fit`, `worst_fit` |
| `POST` | `/api/memory/reset` | Reset memory to empty state |

### Page Replacement

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/api/paging/state` | Current paging state |
| `POST` | `/api/paging/run` | Run a page replacement algorithm |
| `POST` | `/api/paging/compare` | Compare FIFO, LRU, Optimal on same input |

```json
{
  "reference_string": "7 0 1 2 0 3 0 4 2 3 0 3 2",
  "frame_count": 3,
  "algorithm": "LRU"
}
```

### Deadlock

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/api/deadlock/state` | Allocation matrix, need matrix, available resources, safety status |
| `POST` | `/api/deadlock/safety` | Run Banker's Safety Algorithm |
| `POST` | `/api/deadlock/request` | Simulate resource request (`process_id`, `request`) |
| `POST` | `/api/deadlock/detect` | Run deadlock detection |

---

## 🧪 Test Suite

| Test File | Tests | What It Covers |
|---|---|---|
| `test_api.py` | 9 | REST endpoints, HTTP status codes, JSON structure |
| `test_scheduling.py` | 12 | FCFS, SJF, Priority, RR, idle time, duplicate PIDs, validation |
| `test_deadlock.py` | 9 | Banker's safety, resource requests, deadlock detection |
| `test_memory_allocation.py` | 5 | First/Best/Worst Fit, deallocation, free-block coalescing |
| `test_page_replacement.py` | 8 | FIFO, LRU, Optimal, single frame, repeated pages, edge cases |
| `test_memory_statistics.py` | 3 | Utilisation %, external fragmentation, algorithm comparison |
| **Total** | **46** | **All passing** |

Run specific modules:
```bash
pytest tests/test_scheduling.py -v
pytest tests/test_api.py -v
```

---

## 🔗 Git Branches

| Branch | Content |
|---|---|
| `main` | Fully integrated project (all modules merged) |
| `process-scheduling` | Member 1 — CPU scheduling module |
| `member2-memory` | Member 2 — Memory allocation & page replacement |
| `member3-deadlock-dashboard` | Member 3 — Deadlock module & dashboard UI |

---

## ⚙️ Development Notes

- **Auto-reload**: Flask runs in debug mode — reloads automatically on file save.
- **Live UI**: Frontend polls `/api/state` every 2 seconds — any API change appears in the browser instantly without refreshing.
- **State lifetime**: All state (processes, memory, deadlock) lives in-memory and resets on server restart.
- **`.venv/` is local**: Not committed to git — each developer creates it with `python3 -m venv .venv`.
