"""CPU scheduling algorithms and dispatcher."""

from __future__ import annotations

from collections import deque
from typing import Any, Callable

from .metrics import calculate_metrics
from .models import GanttEntry, Process, _ScheduledProcess

SUPPORTED_ALGORITHMS = frozenset({
    "FCFS",
    "SJF",
    "SRTF",
    "SJF_PREEMPTIVE",
    "PRIORITY",
    "PRIORITY_PREEMPTIVE",
    "RR",
    "ROUND_ROBIN",
})


def schedule(
    processes: list[Process],
    algorithm: str,
    quantum: int = 2,
) -> dict[str, Any]:
    """
    Run a scheduling algorithm on the given processes.

    Args:
        processes: List of Process objects to schedule.
        algorithm: One of FCFS, SJF, SRTF, PRIORITY, PRIORITY_PREEMPTIVE, RR, or ROUND_ROBIN.
        quantum: Time quantum for Round Robin (must be > 0).

    Returns:
        A JSON-friendly dictionary with algorithm, gantt, metrics, and processes.

    Raises:
        ValueError: For invalid input or unknown algorithm.
    """
    _validate_inputs(processes, algorithm, quantum)

    algorithm_name = algorithm.upper()
    if algorithm_name == "ROUND_ROBIN":
        algorithm_name = "RR"

    scheduled = [
        _ScheduledProcess(process=process, original_index=index)
        for index, process in enumerate(processes)
    ]

    if algorithm_name == "FCFS":
        gantt, completion_times, response_times = _schedule_fcfs(scheduled)
    elif algorithm_name == "SJF":
        gantt, completion_times, response_times = _schedule_sjf(scheduled)
    elif algorithm_name in {"SRTF", "SJF_PREEMPTIVE"}:
        gantt, completion_times, response_times = _schedule_srtf(scheduled)
    elif algorithm_name == "PRIORITY":
        gantt, completion_times, response_times = _schedule_priority(scheduled)
    elif algorithm_name in {"PRIORITY_PREEMPTIVE", "PREEMPTIVE_PRIORITY"}:
        gantt, completion_times, response_times = _schedule_priority_preemptive(scheduled)
    elif algorithm_name == "RR":
        gantt, completion_times, response_times = _schedule_round_robin(
            scheduled, quantum
        )
    else:
        raise ValueError(f"unknown scheduling algorithm: {algorithm}")

    metrics = calculate_metrics(processes, completion_times, response_times, gantt)

    return {
        "algorithm": algorithm_name,
        "gantt": [entry.to_dict() for entry in gantt],
        "metrics": metrics,
        "processes": [process.to_dict() for process in processes],
    }


def _validate_inputs(
    processes: list[Process],
    algorithm: str,
    quantum: int,
) -> None:
    if not processes:
        raise ValueError("process list cannot be empty")

    seen_pids: set[str] = set()
    for process in processes:
        if process.pid in seen_pids:
            raise ValueError(f"duplicate pid: {process.pid}")
        seen_pids.add(process.pid)

    algorithm_name = algorithm.upper()
    if algorithm_name not in SUPPORTED_ALGORITHMS:
        raise ValueError(f"unknown scheduling algorithm: {algorithm}")

    if algorithm_name in {"RR", "ROUND_ROBIN"} and quantum <= 0:
        raise ValueError("quantum must be > 0")


def _append_gantt(
    gantt: list[GanttEntry],
    pid: str | None,
    start: int,
    end: int,
) -> None:
    if start == end:
        return
    if gantt and gantt[-1].pid == pid:
        gantt[-1] = GanttEntry(pid=pid, start=gantt[-1].start, end=end)
    else:
        gantt.append(GanttEntry(pid=pid, start=start, end=end))


def _add_idle_until(
    gantt: list[GanttEntry],
    current_time: int,
    next_time: int,
) -> int:
    if next_time > current_time:
        _append_gantt(gantt, None, current_time, next_time)
        return next_time
    return current_time


def _next_arrival_time(
    scheduled: list[_ScheduledProcess],
    done: set[str],
    after_time: int,
) -> int | None:
    pending = [
        item.process.arrival_time
        for item in scheduled
        if item.process.pid not in done and item.process.arrival_time > after_time
    ]
    return min(pending) if pending else None


def _record_first_response(
    item: _ScheduledProcess,
    current_time: int,
    response_times: dict[str, int],
) -> None:
    if item.response_time is None:
        item.response_time = current_time - item.process.arrival_time
        response_times[item.process.pid] = item.response_time


def _run_non_preemptive(
    scheduled: list[_ScheduledProcess],
    selector: Callable[[_ScheduledProcess], tuple[Any, ...]],
) -> tuple[list[GanttEntry], dict[str, int], dict[str, int]]:
    """Shared simulation loop for FCFS, SJF, and Priority."""
    gantt: list[GanttEntry] = []
    completion_times: dict[str, int] = {}
    response_times: dict[str, int] = {}
    done: set[str] = set()
    current_time = 0

    while len(done) < len(scheduled):
        available = [
            item
            for item in scheduled
            if item.process.pid not in done
            and item.process.arrival_time <= current_time
        ]

        if not available:
            next_arrival = _next_arrival_time(scheduled, done, current_time)
            if next_arrival is None:
                break
            current_time = _add_idle_until(gantt, current_time, next_arrival)
            continue

        selected = min(available, key=selector)
        _record_first_response(selected, current_time, response_times)

        start = current_time
        end = current_time + selected.process.burst_time
        _append_gantt(gantt, selected.process.pid, start, end)

        selected.completion_time = end
        completion_times[selected.process.pid] = end
        done.add(selected.process.pid)
        current_time = end

    return gantt, completion_times, response_times


def _schedule_fcfs(
    scheduled: list[_ScheduledProcess],
) -> tuple[list[GanttEntry], dict[str, int], dict[str, int]]:
    return _run_non_preemptive(
        scheduled,
        lambda item: (item.process.arrival_time, item.original_index),
    )


def _schedule_sjf(
    scheduled: list[_ScheduledProcess],
) -> tuple[list[GanttEntry], dict[str, int], dict[str, int]]:
    return _run_non_preemptive(
        scheduled,
        lambda item: (
            item.process.burst_time,
            item.process.arrival_time,
            item.original_index,
        ),
    )


def _schedule_priority(
    scheduled: list[_ScheduledProcess],
) -> tuple[list[GanttEntry], dict[str, int], dict[str, int]]:
    return _run_non_preemptive(
        scheduled,
        lambda item: (
            item.process.priority,
            item.process.arrival_time,
            item.original_index,
        ),
    )


def _run_preemptive(
    scheduled: list[_ScheduledProcess],
    selector: Callable[[_ScheduledProcess], tuple[Any, ...]],
) -> tuple[list[GanttEntry], dict[str, int], dict[str, int]]:
    """Shared simulation loop for preemptive algorithms (SRTF and Preemptive Priority)."""
    gantt: list[GanttEntry] = []
    completion_times: dict[str, int] = {}
    response_times: dict[str, int] = {}
    done: set[str] = set()
    current_time = 0

    while len(done) < len(scheduled):
        available = [
            item
            for item in scheduled
            if item.process.pid not in done
            and item.process.arrival_time <= current_time
        ]

        if not available:
            next_arrival = _next_arrival_time(scheduled, done, current_time)
            if next_arrival is None:
                break
            current_time = _add_idle_until(gantt, current_time, next_arrival)
            continue

        selected = min(available, key=selector)
        _record_first_response(selected, current_time, response_times)

        pending_arrivals = [
            item.process.arrival_time
            for item in scheduled
            if item.process.pid not in done
            and item.process.arrival_time > current_time
        ]
        next_arrival = min(pending_arrivals) if pending_arrivals else None

        if next_arrival is not None and next_arrival < current_time + selected.remaining_burst:
            run_time = next_arrival - current_time
        else:
            run_time = selected.remaining_burst

        slice_start = current_time
        slice_end = current_time + run_time
        _append_gantt(gantt, selected.process.pid, slice_start, slice_end)

        current_time = slice_end
        selected.remaining_burst -= run_time

        if selected.remaining_burst == 0:
            selected.completion_time = current_time
            completion_times[selected.process.pid] = current_time
            done.add(selected.process.pid)

    return gantt, completion_times, response_times


def _schedule_srtf(
    scheduled: list[_ScheduledProcess],
) -> tuple[list[GanttEntry], dict[str, int], dict[str, int]]:
    """Shortest Remaining Time First (Preemptive SJF)."""
    return _run_preemptive(
        scheduled,
        lambda item: (
            item.remaining_burst,
            item.process.arrival_time,
            item.original_index,
        ),
    )


def _schedule_priority_preemptive(
    scheduled: list[_ScheduledProcess],
) -> tuple[list[GanttEntry], dict[str, int], dict[str, int]]:
    """Preemptive Priority Scheduling."""
    return _run_preemptive(
        scheduled,
        lambda item: (
            item.process.priority,
            item.process.arrival_time,
            item.original_index,
        ),
    )


def _schedule_round_robin(
    scheduled: list[_ScheduledProcess],
    quantum: int,
) -> tuple[list[GanttEntry], dict[str, int], dict[str, int]]:
    gantt: list[GanttEntry] = []
    completion_times: dict[str, int] = {}
    response_times: dict[str, int] = {}
    done: set[str] = set()
    ready: deque[_ScheduledProcess] = deque()
    in_ready: set[str] = set()
    running_pid: str | None = None
    current_time = 0

    def enqueue_arrivals(up_to_time: int) -> None:
        arrivals = [
            item
            for item in scheduled
            if item.process.pid not in done
            and item.process.pid not in in_ready
            and item.process.pid != running_pid
            and item.process.arrival_time <= up_to_time
        ]
        arrivals.sort(key=lambda item: (item.process.arrival_time, item.original_index))
        for item in arrivals:
            ready.append(item)
            in_ready.add(item.process.pid)

    while len(done) < len(scheduled):
        enqueue_arrivals(current_time)

        if not ready:
            next_arrival = _next_arrival_time(scheduled, done, current_time)
            if next_arrival is None:
                break
            current_time = _add_idle_until(gantt, current_time, next_arrival)
            continue

        current = ready.popleft()
        in_ready.discard(current.process.pid)
        running_pid = current.process.pid
        _record_first_response(current, current_time, response_times)

        run_time = min(quantum, current.remaining_burst)
        slice_start = current_time

        for step in range(1, run_time + 1):
            enqueue_arrivals(current_time + step)

        slice_end = current_time + run_time
        _append_gantt(gantt, current.process.pid, slice_start, slice_end)
        current_time = slice_end
        current.remaining_burst -= run_time
        running_pid = None

        if current.remaining_burst == 0:
            current.completion_time = current_time
            completion_times[current.process.pid] = current_time
            done.add(current.process.pid)
        else:
            ready.append(current)
            in_ready.add(current.process.pid)

    return gantt, completion_times, response_times
