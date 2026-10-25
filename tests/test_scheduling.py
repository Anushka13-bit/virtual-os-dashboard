"""Tests for the CPU scheduling module."""

from __future__ import annotations

import json

import pytest

from backend.scheduling import Process, schedule


def _make_processes(specs: list[tuple]) -> list[Process]:
    return [Process(*spec) for spec in specs]


def test_fcfs_basic_case():
    processes = _make_processes(
        [
            ("P1", "A", 0, 5, 1),
            ("P2", "B", 1, 3, 1),
            ("P3", "C", 2, 4, 1),
        ]
    )

    result = schedule(processes, "FCFS")

    assert result["algorithm"] == "FCFS"
    assert result["gantt"] == [
        {"pid": "P1", "start": 0, "end": 5, "duration": 5},
        {"pid": "P2", "start": 5, "end": 8, "duration": 3},
        {"pid": "P3", "start": 8, "end": 12, "duration": 4},
    ]

    by_pid = {item["pid"]: item for item in result["metrics"]["processes"]}
    assert by_pid["P1"] == {
        "pid": "P1",
        "completion_time": 5,
        "turnaround_time": 5,
        "waiting_time": 0,
        "response_time": 0,
    }
    assert by_pid["P2"]["completion_time"] == 8
    assert by_pid["P2"]["waiting_time"] == 4
    assert by_pid["P2"]["response_time"] == 4
    assert by_pid["P3"]["completion_time"] == 12
    assert by_pid["P3"]["waiting_time"] == 6

    assert result["metrics"]["average_waiting_time"] == 3.33
    assert result["metrics"]["average_turnaround_time"] == 7.33
    assert result["metrics"]["average_response_time"] == 3.33
    assert result["metrics"]["cpu_utilization"] == 100.0


def test_sjf_basic_case():
    processes = _make_processes(
        [
            ("P1", "A", 0, 8, 1),
            ("P2", "B", 1, 4, 1),
            ("P3", "C", 2, 2, 1),
        ]
    )

    result = schedule(processes, "SJF")

    assert result["gantt"] == [
        {"pid": "P1", "start": 0, "end": 8, "duration": 8},
        {"pid": "P3", "start": 8, "end": 10, "duration": 2},
        {"pid": "P2", "start": 10, "end": 14, "duration": 4},
    ]

    by_pid = {item["pid"]: item for item in result["metrics"]["processes"]}
    assert by_pid["P1"]["waiting_time"] == 0
    assert by_pid["P3"]["waiting_time"] == 6
    assert by_pid["P2"]["waiting_time"] == 9


def test_priority_basic_case():
    processes = _make_processes(
        [
            ("P1", "A", 0, 5, 2),
            ("P2", "B", 1, 3, 1),
            ("P3", "C", 2, 4, 3),
        ]
    )

    result = schedule(processes, "PRIORITY")

    assert result["gantt"] == [
        {"pid": "P1", "start": 0, "end": 5, "duration": 5},
        {"pid": "P2", "start": 5, "end": 8, "duration": 3},
        {"pid": "P3", "start": 8, "end": 12, "duration": 4},
    ]

    by_pid = {item["pid"]: item for item in result["metrics"]["processes"]}
    assert by_pid["P2"]["response_time"] == 4
    assert by_pid["P3"]["waiting_time"] == 6


def test_round_robin_basic_case():
    processes = _make_processes(
        [
            ("P1", "A", 0, 5, 1),
            ("P2", "B", 1, 3, 1),
            ("P3", "C", 2, 4, 1),
        ]
    )

    result = schedule(processes, "RR", quantum=2)

    assert result["algorithm"] == "RR"
    assert result["gantt"] == [
        {"pid": "P1", "start": 0, "end": 2, "duration": 2},
        {"pid": "P2", "start": 2, "end": 4, "duration": 2},
        {"pid": "P3", "start": 4, "end": 6, "duration": 2},
        {"pid": "P1", "start": 6, "end": 8, "duration": 2},
        {"pid": "P2", "start": 8, "end": 9, "duration": 1},
        {"pid": "P3", "start": 9, "end": 11, "duration": 2},
        {"pid": "P1", "start": 11, "end": 12, "duration": 1},
    ]

    by_pid = {item["pid"]: item for item in result["metrics"]["processes"]}
    assert by_pid["P1"]["response_time"] == 0
    assert by_pid["P2"]["response_time"] == 1
    assert by_pid["P3"]["response_time"] == 2
    assert by_pid["P1"]["completion_time"] == 12
    assert by_pid["P2"]["completion_time"] == 9
    assert by_pid["P3"]["completion_time"] == 11
    assert by_pid["P1"]["waiting_time"] == 7
    assert by_pid["P2"]["waiting_time"] == 5
    assert by_pid["P3"]["waiting_time"] == 5


def test_cpu_idle_time():
    processes = _make_processes([("P1", "A", 3, 2, 1)])

    result = schedule(processes, "FCFS")

    assert result["gantt"] == [
        {"pid": None, "start": 0, "end": 3, "duration": 3},
        {"pid": "P1", "start": 3, "end": 5, "duration": 2},
    ]
    assert result["metrics"]["cpu_utilization"] == 40.0


def test_same_arrival_times_use_input_order():
    processes = _make_processes(
        [
            ("P1", "A", 0, 2, 1),
            ("P2", "B", 0, 3, 1),
            ("P3", "C", 0, 1, 1),
        ]
    )

    result = schedule(processes, "FCFS")
    assert [entry["pid"] for entry in result["gantt"]] == ["P1", "P2", "P3"]

    sjf_result = schedule(processes, "SJF")
    assert [entry["pid"] for entry in sjf_result["gantt"]] == ["P3", "P1", "P2"]


def test_duplicate_pid_raises():
    processes = _make_processes(
        [
            ("P1", "A", 0, 2, 1),
            ("P1", "B", 1, 3, 1),
        ]
    )

    with pytest.raises(ValueError, match="duplicate pid"):
        schedule(processes, "FCFS")


def test_invalid_quantum_raises():
    processes = _make_processes([("P1", "A", 0, 2, 1)])

    with pytest.raises(ValueError, match="quantum must be > 0"):
        schedule(processes, "RR", quantum=0)


def test_invalid_process_values():
    with pytest.raises(ValueError, match="pid cannot be empty"):
        Process("", "A", 0, 2)

    with pytest.raises(ValueError, match="arrival_time must be >= 0"):
        Process("P1", "A", -1, 2)

    with pytest.raises(ValueError, match="burst_time must be > 0"):
        Process("P1", "A", 0, 0)

    with pytest.raises(ValueError, match="memory_required must be >= 0"):
        Process("P1", "A", 0, 2, 0, -1)

    with pytest.raises(ValueError, match="invalid state"):
        Process("P1", "A", 0, 2, 0, 0, "INVALID")


def test_dispatcher_function():
    processes = _make_processes([("P1", "A", 0, 2, 1)])

    for algorithm in ("FCFS", "SJF", "PRIORITY", "RR", "ROUND_ROBIN"):
        result = schedule(processes, algorithm, quantum=1)
        assert set(result.keys()) == {"algorithm", "gantt", "metrics", "processes"}
        assert isinstance(result["gantt"], list)
        assert isinstance(result["metrics"], dict)

    with pytest.raises(ValueError, match="process list cannot be empty"):
        schedule([], "FCFS")

    with pytest.raises(ValueError, match="unknown scheduling algorithm"):
        schedule(processes, "FIFO")


def test_metric_correctness_manual_verification():
    processes = _make_processes(
        [
            ("P1", "A", 0, 4, 1),
            ("P2", "B", 2, 2, 1),
        ]
    )

    result = schedule(processes, "FCFS")

    assert result["gantt"] == [
        {"pid": "P1", "start": 0, "end": 4, "duration": 4},
        {"pid": "P2", "start": 4, "end": 6, "duration": 2},
    ]

    by_pid = {item["pid"]: item for item in result["metrics"]["processes"]}
    assert by_pid["P1"] == {
        "pid": "P1",
        "completion_time": 4,
        "turnaround_time": 4,
        "waiting_time": 0,
        "response_time": 0,
    }
    assert by_pid["P2"] == {
        "pid": "P2",
        "completion_time": 6,
        "turnaround_time": 4,
        "waiting_time": 2,
        "response_time": 2,
    }
    assert result["metrics"]["average_waiting_time"] == 1.0
    assert result["metrics"]["average_turnaround_time"] == 4.0
    assert result["metrics"]["average_response_time"] == 1.0


def test_result_is_json_serializable():
    processes = _make_processes(
        [
            ("P1", "A", 0, 2, 1),
            ("P2", "B", 1, 1, 2),
        ]
    )

    for algorithm in ("FCFS", "SJF", "SRTF", "PRIORITY", "PRIORITY_PREEMPTIVE", "RR"):
        result = schedule(processes, algorithm, quantum=1)
        json.dumps(result)


def test_srtf_preemption():
    # P1 arrives at 0 with burst 8
    # P2 arrives at 1 with burst 4 -> preempts P1 (4 < 7 remaining)
    # P3 arrives at 2 with burst 2 -> preempts P2 (2 < 3 remaining)
    processes = _make_processes(
        [
            ("P1", "A", 0, 8, 1),
            ("P2", "B", 1, 4, 1),
            ("P3", "C", 2, 2, 1),
        ]
    )

    result = schedule(processes, "SRTF")

    assert result["algorithm"] == "SRTF"
    assert result["gantt"] == [
        {"pid": "P1", "start": 0, "end": 1, "duration": 1},
        {"pid": "P2", "start": 1, "end": 2, "duration": 1},
        {"pid": "P3", "start": 2, "end": 4, "duration": 2},
        {"pid": "P2", "start": 4, "end": 7, "duration": 3},
        {"pid": "P1", "start": 7, "end": 14, "duration": 7},
    ]


def test_priority_preemption():
    # P1 arrives at 0 with burst 6, priority 3
    # P2 arrives at 2 with burst 2, priority 1 -> preempts P1
    processes = _make_processes(
        [
            ("P1", "A", 0, 6, 3),
            ("P2", "B", 2, 2, 1),
        ]
    )

    result = schedule(processes, "PRIORITY_PREEMPTIVE")

    assert result["algorithm"] == "PRIORITY_PREEMPTIVE"
    assert result["gantt"] == [
        {"pid": "P1", "start": 0, "end": 2, "duration": 2},
        {"pid": "P2", "start": 2, "end": 4, "duration": 2},
        {"pid": "P1", "start": 4, "end": 8, "duration": 4},
    ]
