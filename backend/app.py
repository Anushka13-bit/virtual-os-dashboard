"""Flask Web Application and REST API for Virtual OS Dashboard."""

from __future__ import annotations

import os
import sys
from typing import Any

# Ensure project root directory is in Python path
BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
if BASE_DIR not in sys.path:
    sys.path.insert(0, BASE_DIR)

from flask import Flask, jsonify, render_template, request, send_from_directory

from backend.deadlock import DeadlockManager
from backend.memory import (
    MemoryManager,
    allocate_first_fit,
    allocate_best_fit,
    allocate_worst_fit,
    deallocate_process,
    reset_memory,
    fifo,
    lru,
    optimal,
    parse_reference_string,
    calculate_memory_stats,
    calculate_page_replacement_stats,
    compare_page_replacement,
)
from backend.scheduling import Process, schedule


class SimulatedOS:
    """Central state manager for the simulated operating system."""

    def __init__(self) -> None:
        # Processes list starts empty; user creates processes via UI or API
        self.processes: list[Process] = []
        self.next_pid_counter = 1
        
        # Deadlock Manager instance (starts empty)
        self.deadlock_mgr = DeadlockManager()
        self.deadlock_mgr.sync_with_processes([])

        # Member 2 Authoritative Memory Manager instance
        self.memory_mgr = MemoryManager(total_memory=1024)
        self.current_allocation_strategy = "first_fit"

        # Member 2 Memory State Dictionary (synced with memory_mgr)
        self.memory_state: dict[str, Any] = {}
        
        # Member 2 Paging Module State
        self.paging_state: dict[str, Any] = {
            "page_faults": 0,
            "page_hits": 0,
            "total_references": 0,
            "hit_ratio_pct": 0.0,
            "page_fault_rate": 0.0,
            "frame_count": 4,
            "reference_string": [],
            "algorithm": "FIFO",
            "frame_history": [],
            "supported_algorithms": ["FIFO", "LRU", "OPTIMAL"],
            "integrated": True,
            "message": "Page replacement module active.",
        }

        self.cpu_ticks = 0
        self.cpu_usage_pct = 0.0
        self.update_metrics()


    def generate_unique_pid(self) -> str:
        """Generate next authoritative PID sequentially (P1, P2, P3...)."""
        count = len(self.processes) + 1
        while True:
            candidate = f"P{count}"
            if not any(p.pid == candidate for p in self.processes):
                return candidate
            count += 1

    def update_metrics(self) -> None:
        """Synchronize process matrices and compute dynamic memory metrics."""
        # Synchronize deadlock processes
        self.deadlock_mgr.sync_with_processes([p.pid for p in self.processes])
        
        # Synchronize MemoryManager with active processes
        allocated_pids = set(self.memory_mgr.get_allocated_processes().keys())
        active_pids = {p.pid for p in self.processes}

        # Deallocate orphaned process allocations
        for orphaned_pid in allocated_pids - active_pids:
            self.memory_mgr.deallocate(orphaned_pid)

        # Allocate memory for active processes needing memory
        for p in self.processes:
            if p.memory_required > 0 and p.pid not in allocated_pids:
                self.memory_mgr.allocate(p.pid, p.memory_required, self.current_allocation_strategy)

        # Calculate statistics via Member 2's calculate_memory_stats
        mem_stats = calculate_memory_stats(self.memory_mgr)

        # Generate dynamic color-coded allocation map
        colors = ["#3b82f6", "#10b981", "#f59e0b", "#8b5cf6", "#ec4899", "#06b6d4"]
        proc_color_map = {}
        for idx, p in enumerate(self.processes):
            proc_color_map[p.pid] = colors[idx % len(colors)]

        alloc_map = []
        for block in self.memory_mgr.blocks:
            b_dict = block.to_dict()
            if block.is_allocated and block.process_id:
                b_dict["color"] = proc_color_map.get(block.process_id, "#3b82f6")
            else:
                b_dict["color"] = "#374151"
            alloc_map.append(b_dict)

        self.memory_state = {
            "total_mb": mem_stats["total_memory"],
            "used_mb": mem_stats["used_memory"],
            "free_mb": mem_stats["free_memory"],
            "utilization_pct": mem_stats["utilization_percentage"],
            "external_fragmentation": mem_stats["external_fragmentation"],
            "allocation_strategy": self.current_allocation_strategy,
            "allocated_processes": mem_stats["allocated_processes"],
            "blocks": [b.to_dict() for b in self.memory_mgr.blocks],
            "allocation_map": alloc_map,
            "integrated": True,
            "message": f"Memory managed via {self.current_allocation_strategy.replace('_', ' ').title()}.",
        }

    def get_full_state(self) -> dict[str, Any]:
        """Return the aggregated central OS state snapshot."""
        self.update_metrics()
        deadlock_info = self.deadlock_mgr.get_state_summary()

        return {
            "cpu": {
                "usage_pct": round(self.cpu_usage_pct, 1) if self.processes else 0.0,
                "ticks": self.cpu_ticks if self.processes else 0,
                "active_processes": len(self.processes),
            },
            "memory": self.memory_state,
            "paging": self.paging_state,
            "processes": [p.to_dict() for p in self.processes],
            "deadlock": deadlock_info,
            "system_status": "NORMAL" if deadlock_info["safe"] else ("DEADLOCK" if deadlock_info["deadlock_detected"] else "WARNING"),
        }


# Path setup for frontend directory
BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
FRONTEND_DIR = os.path.join(BASE_DIR, "frontend")
DIST_DIR = os.path.join(FRONTEND_DIR, "dist")


def get_static_folder() -> str:
    """Return build dist directory if built, otherwise fallback to frontend directory."""
    if os.path.exists(DIST_DIR) and os.path.exists(os.path.join(DIST_DIR, "index.html")):
        return DIST_DIR
    return FRONTEND_DIR


app = Flask(__name__, static_folder=None)
os_sim = SimulatedOS()


@app.after_request
def add_cors_headers(response):
    """Enable CORS for Vite development server."""
    response.headers["Access-Control-Allow-Origin"] = "*"
    response.headers["Access-Control-Allow-Headers"] = "Content-Type,Authorization"
    response.headers["Access-Control-Allow-Methods"] = "GET,POST,PUT,DELETE,OPTIONS"
    return response


@app.before_request
def handle_preflight():
    """Handle CORS preflight OPTIONS requests."""
    if request.method == "OPTIONS":
        res = app.make_default_options_response()
        res.headers["Access-Control-Allow-Origin"] = "*"
        res.headers["Access-Control-Allow-Headers"] = "Content-Type,Authorization"
        res.headers["Access-Control-Allow-Methods"] = "GET,POST,PUT,DELETE,OPTIONS"
        return res


@app.route("/")
def index():
    """Serve main web dashboard."""
    folder = get_static_folder()
    return send_from_directory(folder, "index.html")


@app.route("/assets/<path:path>")
def static_assets(path: str):
    """Serve built Vite assets."""
    folder = os.path.join(get_static_folder(), "assets")
    return send_from_directory(folder, path)


@app.route("/<path:path>")
def static_files(path: str):
    """Serve frontend static assets or fallback to index.html for SPA routing."""
    folder = get_static_folder()
    if os.path.exists(os.path.join(folder, path)):
        return send_from_directory(folder, path)
    return send_from_directory(folder, "index.html")


@app.route("/api/state", methods=["GET"])
def get_state():
    """Return complete simulated OS state snapshot as JSON."""
    return jsonify(os_sim.get_full_state())


@app.route("/api/processes", methods=["GET"])
def get_processes():
    """Return list of active processes."""
    return jsonify([p.to_dict() for p in os_sim.processes])


@app.route("/api/processes", methods=["POST"])
def create_process():
    """
    Create a new simulated process.
    Expected JSON: {name, arrival_time, burst_time, priority, memory_required, [pid], [maximum_resources]}
    """
    data = request.get_json() or {}
    
    try:
        raw_pid = str(data.get("pid", "")).strip()
        if raw_pid:
            if any(p.pid == raw_pid for p in os_sim.processes):
                return jsonify({"error": f"process with PID '{raw_pid}' already exists"}), 400
            pid = raw_pid
        else:
            pid = os_sim.generate_unique_pid()

        name = str(data.get("name", "")).strip() or pid
        arrival_time = int(data.get("arrival_time", 0))
        burst_time = int(data.get("burst_time", 1))
        priority = int(data.get("priority", 0))
        memory_required = int(data.get("memory_required", 0))
        max_resources = data.get("maximum_resources")

        new_process = Process(
            pid=pid,
            name=name,
            arrival_time=arrival_time,
            burst_time=burst_time,
            priority=priority,
            memory_required=memory_required,
            state="READY",
        )
        
        # Verify and allocate memory if memory_required > 0
        if memory_required > 0:
            alloc_res = os_sim.memory_mgr.allocate(pid, memory_required, os_sim.current_allocation_strategy)
            if not alloc_res["success"]:
                return jsonify({"error": alloc_res["message"]}), 400

        os_sim.processes.append(new_process)
        
        # Synchronize deadlock manager with process and optional max claims
        max_demands_dict = {pid: max_resources} if isinstance(max_resources, dict) else None
        os_sim.deadlock_mgr.sync_with_processes(
            [p.pid for p in os_sim.processes], max_demands=max_demands_dict
        )
        
        return jsonify({
            "message": f"Process '{pid}' created successfully.",
            "process": new_process.to_dict(),
        }), 201

    except ValueError as err:
        return jsonify({"error": str(err)}), 400
    except Exception as err:
        return jsonify({"error": f"invalid payload: {str(err)}"}), 400


@app.route("/api/processes/<pid>", methods=["DELETE"])
def delete_process(pid: str):
    """Delete a process by PID."""
    matching = [p for p in os_sim.processes if p.pid == pid]
    if not matching:
        return jsonify({"error": f"process '{pid}' not found"}), 404

    os_sim.processes = [p for p in os_sim.processes if p.pid != pid]
    os_sim.memory_mgr.deallocate(pid)
    os_sim.deadlock_mgr.sync_with_processes([p.pid for p in os_sim.processes])
    
    return jsonify({
        "message": f"Process '{pid}' deleted.",
        "processes": [p.to_dict() for p in os_sim.processes],
    })


@app.route("/api/scheduling/run", methods=["POST"])
def run_scheduling():
    """
    Run CPU scheduling simulation calling Member 1's scheduler module.
    Expected JSON: {algorithm: "FCFS"|"SJF"|"PRIORITY"|"RR", quantum: int}
    """
    if not os_sim.processes:
        return jsonify({"error": "No processes available to schedule"}), 400

    data = request.get_json() or {}
    algorithm = str(data.get("algorithm", "FCFS")).strip().upper()
    quantum = int(data.get("quantum", 2))

    try:
        # Direct call to Member 1's schedule module
        result = schedule(os_sim.processes, algorithm=algorithm, quantum=quantum)
        
        # Compute CPU ticks and utilization from actual scheduling activity
        gantt = result.get("gantt", [])
        if gantt:
            os_sim.cpu_ticks += gantt[-1]["end"]
        os_sim.cpu_usage_pct = float(result.get("metrics", {}).get("cpu_utilization", 0.0))

        return jsonify(result)
    except ValueError as err:
        return jsonify({"error": str(err)}), 400
    except Exception as err:
        return jsonify({"error": f"Scheduling error: {str(err)}"}), 500


@app.route("/api/deadlock/state", methods=["GET"])
def get_deadlock_state():
    """Return current deadlock module state."""
    return jsonify(os_sim.deadlock_mgr.get_state_summary())


@app.route("/api/deadlock/safety", methods=["POST"])
def run_safety_check():
    """Run Banker's Safety Algorithm."""
    try:
        banker = os_sim.deadlock_mgr.get_banker()
        result = banker.check_safety()
        return jsonify(result)
    except ValueError as err:
        return jsonify({"error": str(err)}), 400


@app.route("/api/deadlock/request", methods=["POST"])
def process_resource_request():
    """
    Run Banker's Resource Request Algorithm.
    Expected JSON: {process_id: "P1", request: {CPU: 1, Printer: 0, ...}}
    """
    data = request.get_json() or {}
    pid = str(data.get("process_id", "")).strip()
    req_dict = data.get("request", {})

    if not pid:
        return jsonify({"error": "process_id is required"}), 400
    if not isinstance(req_dict, dict):
        return jsonify({"error": "request must be a dictionary of resource quantities"}), 400

    try:
        banker = os_sim.deadlock_mgr.get_banker()
        req_clean = {r: int(val) for r, val in req_dict.items()}
        result = banker.request_resources(pid, req_clean)
        
        # If granted, persist the allocation change in deadlock manager
        if result.get("granted"):
            os_sim.deadlock_mgr.allocation = banker.allocation

        return jsonify(result)
    except ValueError as err:
        return jsonify({"error": str(err)}), 400


@app.route("/api/deadlock/detect", methods=["POST"])
def run_deadlock_detection():
    """Run Deadlock Detection algorithm."""
    try:
        summary = os_sim.deadlock_mgr.get_state_summary()
        return jsonify({
            "deadlock_detected": summary["deadlock_detected"],
            "involved_processes": summary["involved_processes"],
            "involved_resources": summary["involved_resources"],
            "explanation": summary["explanation"],
            "status": summary["status"],
        })
    except ValueError as err:
        return jsonify({"error": str(err)}), 400


# Member 2 Integration Endpoints (Memory & Paging)
@app.route("/api/memory/state", methods=["GET"])
def get_memory_state():
    """Return Member 2 MemoryManager state."""
    os_sim.update_metrics()
    return jsonify(os_sim.memory_state)


@app.route("/api/memory/allocate", methods=["POST"])
def allocate_memory():
    """
    Allocate memory for a process/PID.
    Expected JSON: {process_id: "P1", size: 100, [algorithm]: "first_fit"|"best_fit"|"worst_fit"}
    """
    data = request.get_json() or {}
    pid = str(data.get("process_id", "")).strip()
    size = int(data.get("size", 0))
    algorithm = str(data.get("algorithm", os_sim.current_allocation_strategy)).strip().lower()

    if not pid:
        return jsonify({"error": "process_id is required"}), 400

    result = os_sim.memory_mgr.allocate(pid, size, algorithm)
    if not result["success"]:
        return jsonify(result), 400

    # Ensure process exists in processes list if not already present
    if not any(p.pid == pid for p in os_sim.processes):
        os_sim.processes.append(
            Process(pid=pid, name=pid, arrival_time=0, burst_time=1, priority=0, memory_required=size, state="READY")
        )
    else:
        for p in os_sim.processes:
            if p.pid == pid:
                p.memory_required = size

    os_sim.update_metrics()
    return jsonify(result)


@app.route("/api/memory/deallocate", methods=["POST"])
def deallocate_memory():
    """
    Deallocate memory for a process/PID.
    Expected JSON: {process_id: "P1"}
    """
    data = request.get_json() or {}
    pid = str(data.get("process_id", "")).strip()

    if not pid:
        return jsonify({"error": "process_id is required"}), 400

    result = os_sim.memory_mgr.deallocate(pid)
    if not result["success"]:
        return jsonify(result), 400

    # Remove process from active processes and sync deadlock manager
    os_sim.processes = [p for p in os_sim.processes if p.pid != pid]
    os_sim.deadlock_mgr.sync_with_processes([p.pid for p in os_sim.processes])

    os_sim.update_metrics()
    return jsonify(result)


@app.route("/api/memory/strategy", methods=["POST"])
def set_memory_strategy():
    """
    Set active allocation strategy (first_fit, best_fit, worst_fit).
    Expected JSON: {strategy: "first_fit"|"best_fit"|"worst_fit"}
    """
    data = request.get_json() or {}
    strategy = str(data.get("strategy", "first_fit")).strip().lower()

    if strategy not in ("first_fit", "best_fit", "worst_fit", "firstfit", "bestfit", "worstfit"):
        return jsonify({"error": f"Invalid strategy '{strategy}'. Choose from first_fit, best_fit, or worst_fit."}), 400

    os_sim.current_allocation_strategy = strategy
    os_sim.update_metrics()
    return jsonify({
        "message": f"Allocation strategy set to {strategy}.",
        "strategy": os_sim.current_allocation_strategy,
        "memory_state": os_sim.memory_state,
    })


@app.route("/api/memory/reset", methods=["POST"])
def reset_memory_state():
    """
    Reset memory manager to initial empty state.
    Expected JSON: {[total_memory]: int}
    """
    data = request.get_json() or {}
    total_mem = data.get("total_memory")
    if total_mem is not None:
        total_mem = int(total_mem)

    try:
        res = reset_memory(os_sim.memory_mgr, total_mem)
        os_sim.update_metrics()
        return jsonify(res)
    except ValueError as err:
        return jsonify({"error": str(err)}), 400


@app.route("/api/paging/state", methods=["GET"])
def get_paging_state():
    """Return Member 2 paging state."""
    return jsonify(os_sim.paging_state)


@app.route("/api/paging/run", methods=["POST"])
def run_paging_simulation():
    """
    Run Page Replacement simulation (FIFO, LRU, Optimal).
    Expected JSON: {reference_string: "1 2 3 4" | [1, 2, 3, 4], frame_count: 3, algorithm: "FIFO"|"LRU"|"OPTIMAL"}
    """
    data = request.get_json() or {}
    ref_str_input = data.get("reference_string")
    frame_count = int(data.get("frame_count", 4))
    algorithm = str(data.get("algorithm", "FIFO")).strip().upper()

    if ref_str_input is None or (isinstance(ref_str_input, str) and not ref_str_input.strip()):
        return jsonify({"error": "reference_string is required"}), 400
    if frame_count <= 0:
        return jsonify({"error": "frame_count must be a positive integer greater than 0"}), 400

    try:
        parsed_ref = parse_reference_string(ref_str_input)
        if not parsed_ref:
            return jsonify({"error": "reference_string cannot be empty"}), 400

        if algorithm == "FIFO":
            result = fifo(parsed_ref, frame_count)
        elif algorithm == "LRU":
            result = lru(parsed_ref, frame_count)
        elif algorithm in ("OPTIMAL", "BELADY"):
            result = optimal(parsed_ref, frame_count)
        else:
            return jsonify({"error": f"Unsupported algorithm '{algorithm}'. Supported: FIFO, LRU, OPTIMAL."}), 400

        # Update central paging state
        os_sim.paging_state.update({
            "page_faults": result["page_faults"],
            "page_hits": result["page_hits"],
            "total_references": result["total_references"],
            "hit_ratio_pct": result["page_hit_rate"],
            "page_fault_rate": result["page_fault_rate"],
            "frame_count": result["frame_count"],
            "reference_string": result["reference_string"],
            "algorithm": result["algorithm"],
            "frame_history": result["frame_history"],
            "integrated": True,
            "message": f"Paging simulation completed using {result['algorithm']}.",
        })

        return jsonify(result)

    except ValueError as err:
        return jsonify({"error": str(err)}), 400
    except TypeError as err:
        return jsonify({"error": str(err)}), 400
    except Exception as err:
        return jsonify({"error": f"Paging execution error: {str(err)}"}), 500


@app.route("/api/paging/compare", methods=["POST"])
def compare_paging_algorithms():
    """
    Run FIFO, LRU, and Optimal page replacement algorithms on identical inputs for side-by-side comparison.
    Expected JSON: {reference_string: "1 2 3 4" | [1, 2, 3, 4], frame_count: 3}
    """
    data = request.get_json() or {}
    ref_str_input = data.get("reference_string")
    frame_count = int(data.get("frame_count", 4))

    if ref_str_input is None or (isinstance(ref_str_input, str) and not ref_str_input.strip()):
        return jsonify({"error": "reference_string is required"}), 400
    if frame_count <= 0:
        return jsonify({"error": "frame_count must be a positive integer greater than 0"}), 400

    try:
        parsed_ref = parse_reference_string(ref_str_input)
        if not parsed_ref:
            return jsonify({"error": "reference_string cannot be empty"}), 400

        result = compare_page_replacement(parsed_ref, frame_count)

        # Update paging_state with best algorithm details for UI preview
        best_algo = result.get("best_algorithm", "FIFO")
        best_detail = result.get("detailed_results", {}).get(best_algo, {})

        if best_detail:
            os_sim.paging_state.update({
                "page_faults": best_detail["page_faults"],
                "page_hits": best_detail["page_hits"],
                "total_references": best_detail["total_references"],
                "hit_ratio_pct": best_detail["page_hit_rate"],
                "page_fault_rate": best_detail["page_fault_rate"],
                "frame_count": best_detail["frame_count"],
                "reference_string": best_detail["reference_string"],
                "algorithm": f"Comparison (Best: {best_algo})",
                "frame_history": best_detail["frame_history"],
                "integrated": True,
                "message": f"Comparative analysis completed. Best algorithm: {best_algo}.",
            })

        return jsonify(result)

    except ValueError as err:
        return jsonify({"error": str(err)}), 400
    except TypeError as err:
        return jsonify({"error": str(err)}), 400
    except Exception as err:
        return jsonify({"error": f"Paging comparison error: {str(err)}"}), 500


if __name__ == "__main__":
    print("Starting Virtual OS Dashboard server on http://127.0.0.1:5000 ...")
    app.run(host="127.0.0.1", port=5000, debug=True)

