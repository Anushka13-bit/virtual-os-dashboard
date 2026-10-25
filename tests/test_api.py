"""Tests for Flask API endpoints and integration."""

from __future__ import annotations

import json
import pytest

from backend.app import app, os_sim
from backend.scheduling import Process


@pytest.fixture
def client():
    app.config["TESTING"] = True
    with app.test_client() as client:
        # Reset os_sim state to fresh empty OS before each test
        os_sim.processes = []
        os_sim.next_pid_counter = 1
        os_sim.deadlock_mgr.processes = []
        os_sim.deadlock_mgr.allocation = {}
        os_sim.deadlock_mgr.maximum = {}
        os_sim.memory_mgr.reset(1024)
        os_sim.current_allocation_strategy = "first_fit"
        yield client


def test_initial_state_is_empty(client):
    res = client.get("/api/state")
    assert res.status_code == 200
    data = res.get_json()
    assert len(data["processes"]) == 0
    assert data["cpu"]["active_processes"] == 0
    assert data["cpu"]["usage_pct"] == 0.0
    assert data["deadlock"]["safe"] is True
    assert data["memory"]["total_mb"] == 1024
    assert data["memory"]["used_mb"] == 0


def test_create_and_delete_process_with_auto_pid(client):
    # Create first process without specifying PID
    p1_data = {
        "name": "Browser",
        "arrival_time": 0,
        "burst_time": 5,
        "priority": 1,
        "memory_required": 256,
        "maximum_resources": {"CPU": 3, "Printer": 1, "Disk": 2, "Network": 1},
    }
    res = client.post("/api/processes", json=p1_data)
    assert res.status_code == 201
    proc1 = res.get_json()["process"]
    assert proc1["pid"] == "P1"
    assert proc1["name"] == "Browser"

    # Verify memory state updated automatically
    mem_res = client.get("/api/memory/state")
    assert mem_res.status_code == 200
    mem_data = mem_res.get_json()
    assert mem_data["used_mb"] == 256
    assert "P1" in mem_data["allocated_processes"]

    # Create second process
    p2_data = {
        "name": "Database",
        "arrival_time": 1,
        "burst_time": 3,
        "priority": 2,
        "memory_required": 128,
    }
    res2 = client.post("/api/processes", json=p2_data)
    assert res2.status_code == 201
    proc2 = res2.get_json()["process"]
    assert proc2["pid"] == "P2"

    # Verify process list
    res_list = client.get("/api/processes")
    p_list = res_list.get_json()
    assert len(p_list) == 2
    assert p_list[0]["pid"] == "P1"
    assert p_list[1]["pid"] == "P2"

    # Delete P1 -> should release memory
    res_del = client.delete("/api/processes/P1")
    assert res_del.status_code == 200
    assert len(res_del.get_json()["processes"]) == 1

    mem_del = client.get("/api/memory/state").get_json()
    assert mem_del["used_mb"] == 128
    assert "P1" not in mem_del["allocated_processes"]
    assert "P2" in mem_del["allocated_processes"]


def test_invalid_process_input(client):
    # Invalid burst time <= 0
    bad_proc = {"name": "BadProc", "burst_time": -1}
    res = client.post("/api/processes", json=bad_proc)
    assert res.status_code == 400

    # Delete non-existent process
    res_del = client.delete("/api/processes/NON_EXISTENT")
    assert res_del.status_code == 404

    # Process creation exceeding total memory
    huge_proc = {"name": "HugeProc", "memory_required": 2048}
    res_huge = client.post("/api/processes", json=huge_proc)
    assert res_huge.status_code == 400
    assert "exceeds total memory" in res_huge.get_json()["error"]


def test_scheduling_empty_processes_returns_error(client):
    # Running scheduling when 0 processes exist
    res = client.post("/api/scheduling/run", json={"algorithm": "FCFS"})
    assert res.status_code == 400
    assert "No processes available" in res.get_json()["error"]


def test_scheduling_user_created_processes(client):
    # Create two processes
    client.post("/api/processes", json={"name": "JobA", "arrival_time": 0, "burst_time": 4, "priority": 1})
    client.post("/api/processes", json={"name": "JobB", "arrival_time": 1, "burst_time": 2, "priority": 2})

    for algo in ["FCFS", "SJF", "PRIORITY", "RR"]:
        res = client.post("/api/scheduling/run", json={"algorithm": algo, "quantum": 2})
        assert res.status_code == 200
        data = res.get_json()
        assert data["algorithm"] == (algo if algo != "ROUND_ROBIN" else "RR")
        assert len(data["processes"]) == 2
        assert "gantt" in data
        assert "metrics" in data


def test_banker_and_deadlock_on_user_processes(client):
    # Create process P1 and P2 with specific claims
    client.post("/api/processes", json={
        "name": "P1",
        "maximum_resources": {"CPU": 4, "Printer": 2, "Disk": 2, "Network": 1}
    })
    client.post("/api/processes", json={
        "name": "P2",
        "maximum_resources": {"CPU": 3, "Printer": 2, "Disk": 3, "Network": 2}
    })

    # Safety check endpoint
    res_safe = client.post("/api/deadlock/safety")
    assert res_safe.status_code == 200
    assert res_safe.get_json()["safe"] is True

    # Resource request endpoint
    res_req = client.post("/api/deadlock/request", json={
        "process_id": "P1",
        "request": {"CPU": 1, "Printer": 0, "Disk": 0, "Network": 0}
    })
    assert res_req.status_code == 200
    assert res_req.get_json()["granted"] is True

    # Deadlock detection endpoint
    res_det = client.post("/api/deadlock/detect")
    assert res_det.status_code == 200
    assert res_det.get_json()["deadlock_detected"] is False


def test_memory_allocation_and_strategy_endpoints(client):
    # Test strategy change endpoint
    strat_res = client.post("/api/memory/strategy", json={"strategy": "best_fit"})
    assert strat_res.status_code == 200
    assert strat_res.get_json()["strategy"] == "best_fit"

    # Manual allocation endpoint
    alloc_res = client.post("/api/memory/allocate", json={"process_id": "P10", "size": 300, "algorithm": "best_fit"})
    assert alloc_res.status_code == 200
    assert alloc_res.get_json()["success"] is True

    # Check memory state
    state_res = client.get("/api/memory/state")
    assert state_res.status_code == 200
    s_data = state_res.get_json()
    assert s_data["used_mb"] == 300
    assert s_data["allocated_processes"] == {"P10": 300}

    # Manual deallocation
    dealloc_res = client.post("/api/memory/deallocate", json={"process_id": "P10"})
    assert dealloc_res.status_code == 200
    assert dealloc_res.get_json()["success"] is True
    assert client.get("/api/memory/state").get_json()["used_mb"] == 0


def test_paging_api_endpoints(client):
    # Test GET paging state
    st_res = client.get("/api/paging/state")
    assert st_res.status_code == 200
    assert st_res.get_json()["integrated"] is True

    # Run FIFO page replacement
    fifo_payload = {
        "reference_string": "1 2 3 4 1 2 5 1 2 3",
        "frame_count": 3,
        "algorithm": "FIFO"
    }
    fifo_res = client.post("/api/paging/run", json=fifo_payload)
    assert fifo_res.status_code == 200
    f_data = fifo_res.get_json()
    assert f_data["algorithm"] == "FIFO"
    assert f_data["page_faults"] == 8
    assert f_data["page_hits"] == 2
    assert len(f_data["frame_history"]) == 10

    # Run LRU page replacement
    lru_payload = {
        "reference_string": [1, 2, 3, 4, 1, 2, 5, 1, 2, 3],
        "frame_count": 3,
        "algorithm": "LRU"
    }
    lru_res = client.post("/api/paging/run", json=lru_payload)
    assert lru_res.status_code == 200
    assert lru_res.get_json()["algorithm"] == "LRU"

    # Run Optimal page replacement
    opt_payload = {
        "reference_string": "1 2 3 4 1 2 5 1 2 3",
        "frame_count": 3,
        "algorithm": "OPTIMAL"
    }
    opt_res = client.post("/api/paging/run", json=opt_payload)
    assert opt_res.status_code == 200
    assert opt_res.get_json()["algorithm"] == "Optimal"
    assert opt_res.get_json()["page_faults"] == 6

    # Test paging comparison endpoint
    comp_res = client.post("/api/paging/compare", json={"reference_string": "1 2 3 4 1 2 5 1 2 3", "frame_count": 3})
    assert comp_res.status_code == 200
    c_data = comp_res.get_json()
    assert c_data["best_algorithm"] == "Optimal"
    assert len(c_data["comparison"]) == 3


def test_paging_invalid_inputs(client):
    # Frame count <= 0
    res = client.post("/api/paging/run", json={"reference_string": "1 2 3", "frame_count": 0})
    assert res.status_code == 400

    # Empty reference string
    res_empty = client.post("/api/paging/run", json={"reference_string": "", "frame_count": 3})
    assert res_empty.status_code == 400

    # Unknown algorithm
    res_unk = client.post("/api/paging/run", json={"reference_string": "1 2 3", "frame_count": 3, "algorithm": "INVALID"})
    assert res_unk.status_code == 400


def test_memory_partitions_api(client):
    # Configure partition blocks via string input
    res = client.post("/api/memory/partitions", json={"partition_string": "100, 500, 200, 300, 600"})
    assert res.status_code == 200
    data = res.get_json()["memory_state"]
    assert data["total_mb"] == 1700
    assert len(data["blocks"]) == 5
    assert data["is_partitioned"] is True

    # Create processes to allocate into partitions
    client.post("/api/processes", json={"name": "Browser", "burst_time": 4, "memory_required": 212})
    client.post("/api/processes", json={"name": "Database", "burst_time": 6, "memory_required": 417})

    state_res = client.get("/api/state")
    assert state_res.status_code == 200
    mem = state_res.get_json()["memory"]
    assert mem["is_partitioned"] is True
    assert len(mem["allocation_log"]) >= 2
    # Check that block name and process name are present
    alloc_items = [b for b in mem["blocks"] if b["is_allocated"]]
    assert len(alloc_items) == 2
    for b in alloc_items:
        assert b["block_name"].startswith("Block")
        assert b["process_name"] in ["Browser", "Database"]


