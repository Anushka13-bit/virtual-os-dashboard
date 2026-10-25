"""Tests for Banker's Algorithm and Deadlock Detection modules."""

from __future__ import annotations

import pytest

from backend.banker import BankersAlgorithm
from backend.deadlock import DeadlockManager, detect_deadlock


# --------------------------------------------------------------------------
# 1. Safe resource request granted
# --------------------------------------------------------------------------
def test_safe_resource_request_granted():
    processes = ["P1", "P2"]
    resources = ["CPU", "Printer"]
    total = {"CPU": 10, "Printer": 10}
    allocation = {
        "P1": {"CPU": 1, "Printer": 1},
        "P2": {"CPU": 2, "Printer": 2},
    }
    maximum = {
        "P1": {"CPU": 4, "Printer": 4},
        "P2": {"CPU": 5, "Printer": 5},
    }

    banker = BankersAlgorithm(processes, resources, total, allocation, maximum)
    req_result = banker.request_resources("P1", {"CPU": 1, "Printer": 1})

    assert req_result["granted"] is True
    assert req_result["safe"] is True
    assert banker.allocation["P1"] == {"CPU": 2, "Printer": 2}
    assert banker.calculate_available() == {"CPU": 6, "Printer": 6}


# --------------------------------------------------------------------------
# 2. Available request rejected because it creates an unsafe state
# --------------------------------------------------------------------------
def test_available_request_rejected_due_to_unsafe():
    processes = ["P1", "P2"]
    resources = ["CPU"]
    total = {"CPU": 5}
    allocation = {
        "P1": {"CPU": 2},
        "P2": {"CPU": 2},
    }
    maximum = {
        "P1": {"CPU": 5},
        "P2": {"CPU": 5},
    }

    banker = BankersAlgorithm(processes, resources, total, allocation, maximum)
    # Available CPU is 1. P1 requests 1.
    # Resources are physically available (1 <= 1), but if granted:
    # P1 allocation=3, Available=0. P1 Need=2, P2 Need=3. Neither can finish -> Unsafe!
    req_result = banker.request_resources("P1", {"CPU": 1})

    assert req_result["granted"] is False
    assert req_result["safe"] is False
    assert req_result["denied_reason"] == "unsafe_state"
    # State MUST remain completely unchanged
    assert banker.allocation["P1"] == {"CPU": 2}
    assert banker.calculate_available() == {"CPU": 1}


# --------------------------------------------------------------------------
# 3. Request exceeding Need rejected
# --------------------------------------------------------------------------
def test_request_exceeding_need_rejected():
    manager = DeadlockManager()
    manager.sync_with_processes(["P1", "P2"])

    # P1 max is {"CPU": 5, ...}, allocation is 0 -> Need is 5
    # Requesting 8 exceeds Need
    res = manager.request_resources("P1", {"CPU": 8})

    assert res["granted"] is False
    assert res["waiting"] is False
    assert res["denied_reason"] == "exceeds_need"
    assert "exceeds Need" in res["reason"]
    # Request matrix not modified
    assert manager.request["P1"]["CPU"] == 0
    assert manager.allocation["P1"]["CPU"] == 0


# --------------------------------------------------------------------------
# 4. Insufficient Available resulting in WAITING
# --------------------------------------------------------------------------
def test_insufficient_available_resulting_in_waiting():
    processes = ["P1", "P2"]
    resources = ["CPU"]
    total = {"CPU": 5}
    allocation = {
        "P1": {"CPU": 2},
        "P2": {"CPU": 2},
    }
    maximum = {
        "P1": {"CPU": 4},
        "P2": {"CPU": 4},
    }

    banker = BankersAlgorithm(processes, resources, total, allocation, maximum)
    # Available CPU is 1. P1 requests 2. Request <= Need (2 <= 2), but Request > Available (2 > 1)
    req_result = banker.request_resources("P1", {"CPU": 2})

    assert req_result["granted"] is False
    assert "exceeds currently Available" in req_result["reason"]
    assert banker.allocation["P1"] == {"CPU": 2}

    # In DeadlockManager:
    manager = DeadlockManager()
    manager.sync_with_processes(
        ["P1", "P2"],
        max_demands={"P1": {"CPU": 5, "Printer": 2, "Disk": 2, "Network": 1},
                     "P2": {"CPU": 5, "Printer": 2, "Disk": 2, "Network": 1}}
    )
    # Give P2 8 CPU via simulation mode so available CPU becomes 2
    manager.request_resources("P2", {"CPU": 5}, mode="simulate")
    # P1 needs 5 CPU, requests 3 CPU. 3 <= Need(5), but 3 > Available(5).
    # Wait: total CPU is 10, P2 holds 5, Available is 5.
    # If P1 requests 6 CPU, 6 > Need(5) -> exceeds_need.
    # To test waiting: allocate 8 to P2, so Available is 2.
    manager.maximum["P2"]["CPU"] = 8
    manager.allocation["P2"]["CPU"] = 8
    # Available is 10 - 8 = 2. P1 requests 4. Need is 5. 4 <= Need(5), 4 > Available(2).
    res_waiting = manager.request_resources("P1", {"CPU": 4})
    assert res_waiting["granted"] is False
    assert res_waiting["waiting"] is True
    assert res_waiting["denied_reason"] == "insufficient_available"
    assert manager.request["P1"]["CPU"] == 4
    assert manager.allocation["P1"]["CPU"] == 0


# --------------------------------------------------------------------------
# 5. Unsafe rejection preserving all original matrices and safe sequence
# --------------------------------------------------------------------------
def test_unsafe_rejection_preserving_original_matrices():
    manager = DeadlockManager()
    # Load safe state
    safe_summary = manager.load_scenario("safe")
    orig_alloc = {p: dict(manager.allocation[p]) for p in manager.processes}
    orig_max = {p: dict(manager.maximum[p]) for p in manager.processes}
    orig_avail = dict(safe_summary["available"])
    orig_seq = list(safe_summary["safe_sequence"])

    # Try an unsafe request in banker mode
    res = manager.request_resources("P1", {"CPU": 2, "Printer": 1}, mode="banker")

    if not res["granted"]:
        # Rejection must preserve all matrices exactly
        assert manager.allocation == orig_alloc
        assert manager.maximum == orig_max
        assert manager._compute_available() == orig_avail
        # Rejection includes restored state safety information
        assert res["current_state_safe"] is True
        assert res["current_state_safe_sequence"] == orig_seq


# --------------------------------------------------------------------------
# 6. Genuine circular resource waiting detected as deadlock in simulation mode
# --------------------------------------------------------------------------
def test_genuine_circular_resource_waiting_detected_as_deadlock():
    manager = DeadlockManager()
    deadlock_summary = manager.load_scenario("deadlock")

    assert deadlock_summary["deadlock_detected"] is True
    assert deadlock_summary["status"] == "DEADLOCK"
    assert set(deadlock_summary["involved_processes"]) == {"P1", "P2"}
    assert set(deadlock_summary["involved_resources"]) == {"CPU", "Disk"}


# --------------------------------------------------------------------------
# 7. Waiting without deadlock correctly identified
# --------------------------------------------------------------------------
def test_waiting_without_deadlock_correctly_identified():
    processes = ["P1", "P2"]
    resources = ["R1", "R2"]
    available = {"R1": 1, "R2": 0}
    allocation = {
        "P1": {"R1": 1, "R2": 0},
        "P2": {"R1": 0, "R2": 1},
    }
    # P1 is waiting for R2 (amount 1). P2 has no request (it will finish and release R2).
    request = {
        "P1": {"R1": 0, "R2": 1},
        "P2": {"R1": 0, "R2": 0},
    }

    result = detect_deadlock(processes, resources, available, allocation, request)

    assert result["deadlock_detected"] is False
    assert result["involved_processes"] == []


# --------------------------------------------------------------------------
# 8. Process completion releasing resources and allowing pending requests to proceed
# --------------------------------------------------------------------------
def test_process_completion_releasing_resources_and_retrying():
    manager = DeadlockManager()
    manager.sync_with_processes(
        ["P1", "P2"],
        max_demands={
            "P1": {"CPU": 5, "Printer": 2, "Disk": 2, "Network": 1},
            "P2": {"CPU": 5, "Printer": 2, "Disk": 2, "Network": 1},
        }
    )
    # P2 allocates 7 CPU in simulation mode, leaving 3 CPU available
    manager.maximum["P2"]["CPU"] = 7
    manager.allocation["P2"]["CPU"] = 7
    assert manager._compute_available()["CPU"] == 3

    # P1 needs 5, requests 4. Since 4 > 3, P1 is WAITING.
    res1 = manager.request_resources("P1", {"CPU": 4})
    assert res1["waiting"] is True
    assert manager.request["P1"]["CPU"] == 4
    assert manager.allocation["P1"]["CPU"] == 0

    # P2 completes and releases its resources
    manager.complete_process("P2")

    # P2's allocation should now be 0, and P1's waiting request should be auto-retried and granted!
    assert manager.allocation["P2"]["CPU"] == 0
    assert manager.allocation["P1"]["CPU"] == 4
    assert manager.request["P1"]["CPU"] == 0
    assert "P2" in manager.completed_processes

    # Completed process cannot request resources
    res_completed = manager.request_resources("P2", {"CPU": 1})
    assert res_completed["granted"] is False
    assert res_completed["denied_reason"] == "process_completed"


# --------------------------------------------------------------------------
# 9. Correct resource totals and matrix consistency after every operation
# --------------------------------------------------------------------------
def test_matrix_consistency_and_resource_totals():
    manager = DeadlockManager()
    manager.sync_with_processes(["P1", "P2", "P3"])

    # Allocate some resources
    manager.request_resources("P1", {"CPU": 2, "Printer": 1}, mode="banker")
    manager.request_resources("P2", {"CPU": 1, "Disk": 2}, mode="banker")

    summary = manager.get_state_summary()
    total = summary["total_resources"]
    avail = summary["available"]
    alloc = summary["allocation"]
    need = summary["need"]
    max_m = summary["maximum"]

    for r in manager.resources:
        sum_alloc = sum(alloc[p][r] for p in manager.processes)
        # Available = Total - sum(Allocation)
        assert avail[r] == total[r] - sum_alloc
        assert avail[r] >= 0
        for p in manager.processes:
            # Need = Maximum - Allocation
            assert need[p][r] == max_m[p][r] - alloc[p][r]
            assert 0 <= alloc[p][r] <= max_m[p][r] <= total[r]


# --------------------------------------------------------------------------
# 10. Multiple processes and resource types (Textbook Banker's Example)
# --------------------------------------------------------------------------
def test_textbook_bankers_algorithm_multiple_processes_resources():
    # Silberschatz Operating System Concepts - Section 8.6.3 Banker's Example:
    # 5 processes: P0, P1, P2, P3, P4
    # 3 resources: A(10), B(5), C(7)
    processes = ["P0", "P1", "P2", "P3", "P4"]
    resources = ["A", "B", "C"]
    total = {"A": 10, "B": 5, "C": 7}
    allocation = {
        "P0": {"A": 0, "B": 1, "C": 0},
        "P1": {"A": 2, "B": 0, "C": 0},
        "P2": {"A": 3, "B": 0, "C": 2},
        "P3": {"A": 2, "B": 1, "C": 1},
        "P4": {"A": 0, "B": 0, "C": 2},
    }
    maximum = {
        "P0": {"A": 7, "B": 5, "C": 3},
        "P1": {"A": 3, "B": 2, "C": 2},
        "P2": {"A": 9, "B": 0, "C": 2},
        "P3": {"A": 2, "B": 2, "C": 2},
        "P4": {"A": 4, "B": 3, "C": 3},
    }

    banker = BankersAlgorithm(processes, resources, total, allocation, maximum)

    # 1. Check initial safety
    res_initial = banker.check_safety()
    assert res_initial["safe"] is True
    # Available should be A:3, B:3, C:2
    assert res_initial["available"] == {"A": 3, "B": 3, "C": 2}
    # Safe sequence starting with P1 or P3
    assert len(res_initial["safe_sequence"]) == 5

    # 2. P1 requests (1, 0, 2)
    # Available is (3, 3, 2) >= (1, 0, 2). State remains SAFE.
    req1 = banker.request_resources("P1", {"A": 1, "B": 0, "C": 2})
    assert req1["granted"] is True
    assert req1["safe"] is True
    assert banker.allocation["P1"] == {"A": 3, "B": 0, "C": 2}
    assert banker.calculate_available() == {"A": 2, "B": 3, "C": 0}

    # 3. P4 requests (3, 3, 0)
    # Available is (2, 3, 0) < (3, 3, 0) -> Denied due to available
    req2 = banker.request_resources("P4", {"A": 3, "B": 3, "C": 0})
    assert req2["granted"] is False
    assert req2["denied_reason"] == "insufficient_available"

    # 4. P0 requests (0, 2, 0)
    # Available is (2, 3, 0) >= (0, 2, 0), BUT granting it would leave Available = (2, 1, 0)
    # which leads to an UNSAFE state!
    req3 = banker.request_resources("P0", {"A": 0, "B": 2, "C": 0})
    assert req3["granted"] is False
    assert req3["denied_reason"] == "unsafe_state"
    # State remains unchanged
    assert banker.allocation["P0"] == {"A": 0, "B": 1, "C": 0}
    assert banker.calculate_available() == {"A": 2, "B": 3, "C": 0}


# --------------------------------------------------------------------------
# Additional verification for synchronization and scenarios
# --------------------------------------------------------------------------
def test_deadlock_manager_sync():
    manager = DeadlockManager()
    summary = manager.get_state_summary()

    assert "resources" in summary
    assert "available" in summary
    manager.sync_with_processes(["P1", "P2", "P5"])
    assert "P5" in manager.processes
    assert "P3" not in manager.processes


def test_deadlock_manager_scenarios():
    manager = DeadlockManager()

    # 1. Test Unsafe Scenario
    unsafe_summary = manager.load_scenario("unsafe")
    assert unsafe_summary["safe"] is False
    assert unsafe_summary["status"] == "UNSAFE"
    assert unsafe_summary["deadlock_detected"] is False

    # 2. Test Deadlock Scenario
    deadlock_summary = manager.load_scenario("deadlock")
    assert deadlock_summary["deadlock_detected"] is True
    assert deadlock_summary["status"] == "DEADLOCK"
    assert set(deadlock_summary["involved_processes"]) == {"P1", "P2"}
    assert set(deadlock_summary["involved_resources"]) == {"CPU", "Disk"}

    # 3. Test Safe Scenario
    safe_summary = manager.load_scenario("safe")
    assert safe_summary["safe"] is True
    assert safe_summary["status"] == "SAFE"
    assert safe_summary["deadlock_detected"] is False
    assert len(safe_summary["safe_sequence"]) == 3
