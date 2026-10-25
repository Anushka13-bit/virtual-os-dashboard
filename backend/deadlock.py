"""Deadlock detection and management module."""

from __future__ import annotations

from typing import Any

from backend.banker import BankersAlgorithm


def detect_deadlock(
    processes: list[str],
    resources: list[str],
    available: dict[str, int],
    allocation: dict[str, dict[str, int]],
    request: dict[str, dict[str, int]],
) -> dict[str, Any]:
    """
    Detect deadlock using the standard multi-instance resource detection algorithm
    (Shoshani & Coffman / Silberschatz).

    A process is considered DONE upfront only if it holds NO allocated resources
    AND has NO pending request (i.e. it is truly idle). This prevents incorrectly
    pre-marking blocked processes as finished.

    Steps:
      1. Work = Available
      2. Finish[i] = True only if Allocation[i] == 0 AND Request[i] == 0
      3. Find i where Finish[i]=False and Request[i] <= Work
      4. Work += Allocation[i], Finish[i] = True
      5. Repeat; any Finish[i]=False at the end → deadlock
    """
    _validate_detection_inputs(processes, resources, available, allocation, request)

    work = dict(available)
    finish: dict[str, bool] = {}

    for p in processes:
        has_allocation = any(allocation[p][r] > 0 for r in resources)
        has_request = any(request[p][r] > 0 for r in resources)
        finish[p] = (not has_allocation) and (not has_request)

    while True:
        found = False
        for p in processes:
            if not finish[p] and all(request[p][r] <= work[r] for r in resources):
                for r in resources:
                    work[r] += allocation[p][r]
                finish[p] = True
                found = True
                break
        if not found:
            break

    deadlocked = [p for p in processes if not finish[p]]
    deadlock_detected = len(deadlocked) > 0

    involved_resources: list[str] = []
    if deadlock_detected:
        needed = set()
        for p in deadlocked:
            for r in resources:
                if request[p][r] > 0:
                    needed.add(r)
        involved_resources = sorted(needed)
        explanation = (
            f"DEADLOCK DETECTED! Processes {deadlocked} are deadlocked "
            f"waiting for resources {involved_resources}."
        )
    else:
        explanation = "No deadlock detected. All processes can eventually complete."

    return {
        "deadlock_detected": deadlock_detected,
        "involved_processes": deadlocked,
        "involved_resources": involved_resources,
        "explanation": explanation,
    }


def _validate_detection_inputs(
    processes: list[str],
    resources: list[str],
    available: dict[str, int],
    allocation: dict[str, dict[str, int]],
    request: dict[str, dict[str, int]],
) -> None:
    if not processes:
        raise ValueError("processes list cannot be empty")
    if not resources:
        raise ValueError("resources list cannot be empty")
    for r in resources:
        if r not in available:
            raise ValueError(f"missing resource {r} in available vector")
        if available[r] < 0:
            raise ValueError(f"available quantity cannot be negative for {r}")
    for p in processes:
        if p not in allocation:
            raise ValueError(f"missing allocation entry for process {p}")
        if p not in request:
            raise ValueError(f"missing request entry for process {p}")
        for r in resources:
            if r not in allocation[p]:
                raise ValueError(f"missing resource {r} in allocation for {p}")
            if r not in request[p]:
                raise ValueError(f"missing resource {r} in request for {p}")
            if allocation[p][r] < 0:
                raise ValueError(f"negative allocation for {p}, {r}")
            if request[p][r] < 0:
                raise ValueError(f"negative request for {p}, {r}")


class DeadlockManager:
    """
    Central manager for simulated deadlock and resource allocation state.

    Maintains four matrices kept strictly consistent:
      Allocation[p][r]  — resources currently held by p
      Maximum[p][r]     — maximum p may ever need
      Need[p][r]        — Maximum - Allocation  (derived, never stored)
      Request[p][r]     — ACTUAL pending waiting requests (insufficient available)

    Invariants:
      Available = Total - sum(Allocation)        (computed on demand)
      Need = Maximum - Allocation                (computed on demand)
      0 <= Allocation[p][r] <= Maximum[p][r] <= Total[r]
      Request[p][r] > 0  only when resources were unavailable at request time
    """

    # Sensible default max claims used when none are provided.
    # Kept below Total (CPU=10, Printer=5, Disk=7, Network=4) so they are valid.
    DEFAULT_MAX_CLAIMS = [
        {"CPU": 5, "Printer": 2, "Disk": 3, "Network": 1},
        {"CPU": 4, "Printer": 2, "Disk": 2, "Network": 2},
        {"CPU": 3, "Printer": 3, "Disk": 2, "Network": 1},
        {"CPU": 6, "Printer": 1, "Disk": 4, "Network": 2},
    ]

    def __init__(self) -> None:
        self.resources = ["CPU", "Printer", "Disk", "Network"]
        self.total_resources = {"CPU": 10, "Printer": 5, "Disk": 7, "Network": 4}

        self.processes: list[str] = []
        self.allocation: dict[str, dict[str, int]] = {}
        self.maximum: dict[str, dict[str, int]] = {}
        self.request: dict[str, dict[str, int]] = {}
        self.completed_processes: set[str] = set()

    # ------------------------------------------------------------------
    # Synchronisation
    # ------------------------------------------------------------------

    def sync_with_processes(
        self,
        active_pids: list[str],
        max_demands: dict[str, dict[str, int]] | None = None,
    ) -> None:
        """
        Synchronise resource matrices with active OS processes.

        New processes are initialised with zero allocation and zero request.
        Their maximum is taken from max_demands if provided, otherwise from
        DEFAULT_MAX_CLAIMS. Invalid max values (> total) raise ValueError.

        Removed processes release their allocations; pending waiting requests
        from other processes are retried automatically.
        """
        existing_pids = set(self.processes)

        for idx, pid in enumerate(active_pids):
            if pid not in existing_pids:
                self.processes.append(pid)
                self.allocation[pid] = {r: 0 for r in self.resources}
                self.request[pid] = {r: 0 for r in self.resources}

                has_explicit = (
                    max_demands
                    and pid in max_demands
                    and any(int(max_demands[pid].get(r, 0) or 0) > 0 for r in self.resources)
                )
                if has_explicit:
                    # Validate: maximum must not exceed total capacity
                    new_max: dict[str, int] = {}
                    for r in self.resources:
                        val = max(0, int(max_demands[pid].get(r, 0) or 0))
                        if val > self.total_resources[r]:
                            raise ValueError(
                                f"Maximum claim for {pid}, {r} ({val}) exceeds "
                                f"total capacity ({self.total_resources[r]})"
                            )
                        new_max[r] = val
                    self.maximum[pid] = new_max
                else:
                    claim = self.DEFAULT_MAX_CLAIMS[idx % len(self.DEFAULT_MAX_CLAIMS)]
                    self.maximum[pid] = {r: claim[r] for r in self.resources}

        # Remove processes that are no longer active
        current_active = set(active_pids)
        self.processes = [p for p in self.processes if p in current_active]
        self.allocation = {p: self.allocation[p] for p in self.processes if p in self.allocation}
        self.maximum = {p: self.maximum[p] for p in self.processes if p in self.maximum}
        self.request = {p: self.request[p] for p in self.processes if p in self.request}
        self.completed_processes = {p for p in self.completed_processes if p in current_active}

        # After a process removal resources may now satisfy waiting requests
        self._retry_pending_requests()

    # ------------------------------------------------------------------
    # Helpers
    # ------------------------------------------------------------------

    def get_banker(self) -> BankersAlgorithm:
        """Return a BankersAlgorithm instance reflecting active, unfinished processes."""
        active = [p for p in self.processes if p not in self.completed_processes]
        pids = active if active else self.processes
        return BankersAlgorithm(
            processes=pids,
            resources=self.resources,
            total_resources=self.total_resources,
            allocation={p: dict(self.allocation[p]) for p in pids},
            maximum={p: dict(self.maximum[p]) for p in pids},
        )

    def _compute_available(self) -> dict[str, int]:
        return {
            r: self.total_resources[r] - sum(self.allocation[p][r] for p in self.processes)
            for r in self.resources
        }

    def _compute_need(self) -> dict[str, dict[str, int]]:
        need = {}
        for p in self.processes:
            if p in self.completed_processes:
                need[p] = {r: 0 for r in self.resources}
            else:
                need[p] = {
                    r: self.maximum[p][r] - self.allocation[p][r] for r in self.resources
                }
        return need

    def _retry_pending_requests(self) -> None:
        """
        After a resource release or process removal, try to satisfy any
        WAITING requests (requests blocked purely because resources were
        unavailable). Uses availability-only check (no safety check) since
        these requests were already validated against Need when first made.
        """
        changed = True
        while changed:
            changed = False
            avail = self._compute_available()
            for p in self.processes:
                if p in self.completed_processes:
                    continue
                pending = self.request[p]
                if any(pending[r] > 0 for r in self.resources):
                    if all(pending[r] <= avail[r] for r in self.resources):
                        for r in self.resources:
                            self.allocation[p][r] += pending[r]
                        self.request[p] = {r: 0 for r in self.resources}
                        changed = True
                        break  # restart after each allocation

    def complete_process(self, process_id: str) -> dict[str, Any]:
        """
        Complete a process:
        - Release its allocated resources.
        - Mark it as completed and exclude from future safety checks.
        - Prevent it from requesting resources unless restarted.
        - Retry pending requests from waiting processes.
        - Recalculate safety and deadlock status.
        """
        if process_id not in self.processes:
            raise ValueError(f"unknown process ID: {process_id}")

        self.completed_processes.add(process_id)
        self.allocation[process_id] = {r: 0 for r in self.resources}
        self.request[process_id] = {r: 0 for r in self.resources}
        self._retry_pending_requests()
        return self.get_state_summary()

    def load_scenario(self, scenario: str) -> dict[str, Any]:
        """
        Load a predefined pedagogical scenario:
        - "safe": Standard Banker safe state with a safe sequence of length 3 (P1, P2, P3).
        - "unsafe": Unsafe state where no safe sequence exists, but no circular wait yet.
        - "deadlock": Genuine circular wait between processes P1 and P2 on CPU and Disk.
        - "reset": Clears allocations and pending requests for all processes.
        """
        scenario = scenario.strip().lower()

        if scenario == "safe":
            self.processes = ["P1", "P2", "P3"]
            self.completed_processes = set()
            self.allocation = {
                "P1": {"CPU": 2, "Printer": 1, "Disk": 2, "Network": 1},
                "P2": {"CPU": 3, "Printer": 1, "Disk": 1, "Network": 1},
                "P3": {"CPU": 2, "Printer": 1, "Disk": 1, "Network": 0},
            }
            self.maximum = {
                "P1": {"CPU": 4, "Printer": 2, "Disk": 3, "Network": 1},
                "P2": {"CPU": 5, "Printer": 2, "Disk": 2, "Network": 2},
                "P3": {"CPU": 3, "Printer": 1, "Disk": 2, "Network": 1},
            }
            self.request = {p: {r: 0 for r in self.resources} for p in self.processes}

        elif scenario == "unsafe":
            self.processes = ["P1", "P2"]
            self.completed_processes = set()
            self.allocation = {
                "P1": {"CPU": 5, "Printer": 2, "Disk": 3, "Network": 2},
                "P2": {"CPU": 5, "Printer": 3, "Disk": 4, "Network": 2},
            }
            self.maximum = {
                "P1": {"CPU": 6, "Printer": 3, "Disk": 4, "Network": 3},
                "P2": {"CPU": 6, "Printer": 4, "Disk": 5, "Network": 3},
            }
            self.request = {p: {r: 0 for r in self.resources} for p in self.processes}

        elif scenario == "deadlock":
            self.processes = ["P1", "P2"]
            self.completed_processes = set()
            self.allocation = {
                "P1": {"CPU": 10, "Printer": 0, "Disk": 0, "Network": 0},
                "P2": {"CPU": 0, "Printer": 0, "Disk": 7, "Network": 0},
            }
            self.maximum = {
                "P1": {"CPU": 10, "Printer": 0, "Disk": 2, "Network": 0},
                "P2": {"CPU": 2, "Printer": 0, "Disk": 7, "Network": 0},
            }
            self.request = {
                "P1": {"CPU": 0, "Printer": 0, "Disk": 1, "Network": 0},
                "P2": {"CPU": 1, "Printer": 0, "Disk": 0, "Network": 0},
            }

        elif scenario == "reset":
            for p in self.processes:
                self.allocation[p] = {r: 0 for r in self.resources}
                self.request[p] = {r: 0 for r in self.resources}
            self.completed_processes = set()

        else:
            raise ValueError(
                f"unknown scenario '{scenario}'. Available: safe, unsafe, deadlock, reset"
            )

        return self.get_state_summary()

    # ------------------------------------------------------------------
    # Resource Request
    # ------------------------------------------------------------------

    def request_resources(
        self, process_id: str, request_dict: dict[str, int], mode: str = "banker"
    ) -> dict[str, Any]:
        """
        Process a resource request for process_id.

        mode="banker"   — Banker's Avoidance: commit only if resulting state is safe.
        mode="simulate" — Simulation / contention: commit if resources available,
                          regardless of safety (for deadlock demonstration).
        mode="force"    — Alias for "simulate" (backward compat).

        Both modes:
        1. Reject if Request > Need (exceeds declared maximum — never auto-expand).
        2. Mark WAITING if Request > Available (log in request matrix, no allocation).

        Banker mode additional step:
        3. If resources available but granting leads to unsafe state → DENY.
           State is completely unchanged. Return current system safety.

        Simulate mode additional step:
        3. Force-allocate regardless of safety; detect resulting deadlock status.
        """
        if process_id not in self.processes:
            raise ValueError(f"unknown process ID: {process_id}")

        if process_id in self.completed_processes:
            avail = self._compute_available()
            need = self._compute_need()
            return {
                "granted": False,
                "waiting": False,
                "denied_reason": "process_completed",
                "reason": f"Process {process_id} has completed. Cannot request resources unless restarted.",
                "explanation": f"Request rejected: process {process_id} is already completed.",
                "safe": True,
                "status": "SAFE",
                "safe_sequence": [],
                "deadlock_detected": False,
                "involved_processes": [],
                "involved_resources": [],
                "available": avail,
                "allocation": self.allocation,
                "maximum": self.maximum,
                "need": need,
                "request": self.request,
            }

        for r, req_val in request_dict.items():
            if r not in self.resources:
                raise ValueError(f"unknown resource ID: {r}")
            if int(req_val) < 0:
                raise ValueError(f"request amount cannot be negative for {r}")

        clean_req = {r: int(request_dict.get(r, 0)) for r in self.resources}
        mode = mode.lower().strip()
        if mode == "force":
            mode = "simulate"  # normalise alias

        avail = self._compute_available()
        need = self._compute_need()

        # ── Step 1: Validate Request <= Need ────────────────────────────
        for r in self.resources:
            if clean_req[r] > need[process_id][r]:
                return {
                    "granted": False,
                    "waiting": False,
                    "denied_reason": "exceeds_need",
                    "reason": (
                        f"Request[{r}]={clean_req[r]} exceeds "
                        f"Need[{r}]={need[process_id][r]} for {process_id}. "
                        f"Cannot request more than declared maximum."
                    ),
                    "explanation": (
                        f"Request REJECTED for {process_id}: amount for '{r}' exceeds the "
                        f"process's declared maximum need (Maximum - Allocation). "
                        f"No state was changed."
                    ),
                    "safe": self.get_banker().check_safety()["safe"] if self.processes else True,
                    "available": avail,
                    "allocation": self.allocation,
                    "maximum": self.maximum,
                    "need": need,
                    "request": self.request,
                }

        # ── Step 2: Check Request <= Available ──────────────────────────
        if not all(clean_req[r] <= avail[r] for r in self.resources):
            # Resources not currently available — mark process as WAITING.
            # Pending request is logged in the request matrix so deadlock
            # detection can inspect it. No allocation occurs.
            self.request[process_id] = clean_req
            blocked = [r for r in self.resources if clean_req[r] > avail[r]]
            return {
                "granted": False,
                "waiting": True,
                "denied_reason": "insufficient_available",
                "reason": f"Insufficient available resources: {blocked} unavailable.",
                "explanation": (
                    f"Process {process_id} is now WAITING. "
                    f"Requested {clean_req} but available is only {avail}. "
                    f"The request is logged and will be retried automatically "
                    f"when resources are released."
                ),
                "available": avail,
                "allocation": self.allocation,
                "maximum": self.maximum,
                "need": need,
                "request": self.request,
            }

        # ── Resources are available — apply mode-specific logic ──────────

        if mode == "simulate":
            # Deadlock Simulation: force-allocate regardless of safety.
            # Used to intentionally create unsafe/deadlock states for demonstration.
            for r in self.resources:
                self.allocation[process_id][r] += clean_req[r]
            self.request[process_id] = {r: 0 for r in self.resources}
            summary = self.get_state_summary()
            return {
                "granted": True,
                "waiting": False,
                "safe": summary["safe"],
                "status": summary["status"],
                "safe_sequence": summary.get("safe_sequence", []),
                "deadlock_detected": summary["deadlock_detected"],
                "involved_processes": summary["involved_processes"],
                "involved_resources": summary["involved_resources"],
                "available": summary["available"],
                "allocation": self.allocation,
                "maximum": self.maximum,
                "need": summary["need"],
                "request": self.request,
                "explanation": (
                    f"[Simulation] Request GRANTED for {process_id}. "
                    f"System is now {summary['status']}. {summary['explanation']}"
                ),
            }

        # mode == "banker": Banker's Avoidance ────────────────────────────
        banker = self.get_banker()
        banker_res = banker.request_resources(process_id, clean_req)

        if banker_res.get("granted"):
            # Safe — commit allocation permanently.
            self.allocation = banker.allocation
            self.request[process_id] = {r: 0 for r in self.resources}
            return {
                "granted": True,
                "waiting": False,
                "safe": True,
                "status": "SAFE",
                "safe_sequence": banker_res["safe_sequence"],
                "deadlock_detected": False,
                "involved_processes": [],
                "involved_resources": [],
                "available": banker_res["available"],
                "allocation": self.allocation,
                "maximum": self.maximum,
                "need": banker_res["need"],
                "request": self.request,
                "explanation": banker_res["explanation"],
            }
        else:
            # Banker DENIED: resources were available but granting would create
            # an unsafe state.  DO NOT log in request matrix — the request is
            # simply rejected, not pending.  State is completely unchanged.
            current_safety = self.get_banker().check_safety()
            return {
                "granted": False,
                "waiting": False,
                "denied_reason": "unsafe_state",
                "safe": current_safety["safe"],
                "status": "SAFE" if current_safety["safe"] else "UNSAFE",
                "safe_sequence": current_safety["safe_sequence"],
                "deadlock_detected": False,
                "involved_processes": [],
                "involved_resources": [],
                "reason": banker_res.get("reason", "Granting would lead to an UNSAFE state."),
                "available": avail,          # unchanged
                "allocation": self.allocation,  # unchanged
                "maximum": self.maximum,
                "need": need,                # unchanged
                "request": self.request,     # NOT modified
                "explanation": (
                    f"Request DENIED by Banker's Algorithm for {process_id}: "
                    f"granting {clean_req} would leave the system UNSAFE. "
                    f"No allocation was made. {current_safety['explanation']}"
                ),
            }

    # ------------------------------------------------------------------
    # Resource Release
    # ------------------------------------------------------------------

    def release_resources(
        self, process_id: str, release_dict: dict[str, int] | None = None
    ) -> dict[str, Any]:
        """
        Release resources held by process_id.

        If release_dict is None, releases ALL allocated resources.
        After release, pending waiting requests from other processes are
        automatically retried.
        """
        if process_id not in self.processes:
            raise ValueError(f"unknown process ID: {process_id}")

        if release_dict is None:
            self.allocation[process_id] = {r: 0 for r in self.resources}
        else:
            for r in self.resources:
                amount = int(release_dict.get(r, 0))
                if amount < 0:
                    raise ValueError(f"release amount cannot be negative for {r}")
                if amount > self.allocation[process_id][r]:
                    raise ValueError(
                        f"cannot release {amount} of {r}: only "
                        f"{self.allocation[process_id][r]} allocated to {process_id}"
                    )
                self.allocation[process_id][r] -= amount

        # Clear this process's own pending request
        self.request[process_id] = {r: 0 for r in self.resources}

        # Retry other processes' pending waiting requests
        self._retry_pending_requests()

        return self.get_state_summary()

    # ------------------------------------------------------------------
    # State Summary
    # ------------------------------------------------------------------

    def get_state_summary(self) -> dict[str, Any]:
        """
        Return the complete deadlock status dictionary.

        Status priority:
          DEADLOCK > UNSAFE > SAFE

        Detection uses the actual request matrix (pending waiting requests only).
        Safety check uses Banker's Algorithm on current allocation/maximum.
        """
        if not self.processes:
            return {
                "resources": self.resources,
                "total_resources": self.total_resources,
                "available": dict(self.total_resources),
                "allocation": {},
                "maximum": {},
                "need": {},
                "request": {},
                "safe": True,
                "safe_sequence": [],
                "status": "SAFE",
                "deadlock_detected": False,
                "involved_processes": [],
                "involved_resources": [],
                "explanation": "No active processes in system.",
            }

        banker = self.get_banker()
        safety = banker.check_safety()

        detection = detect_deadlock(
            processes=self.processes,
            resources=self.resources,
            available=safety["available"],
            allocation=self.allocation,
            request=self.request,
        )

        if detection["deadlock_detected"]:
            status = "DEADLOCK"
            explanation = detection["explanation"]
        elif not safety["safe"]:
            status = "UNSAFE"
            explanation = safety["explanation"]
        else:
            status = "SAFE"
            explanation = safety["explanation"]

        return {
            "resources": self.resources,
            "total_resources": self.total_resources,
            "available": safety["available"],
            "allocation": self.allocation,
            "maximum": self.maximum,
            "need": safety["need"],
            "request": self.request,
            "safe": safety["safe"],
            "safe_sequence": safety["safe_sequence"],
            "status": status,
            "deadlock_detected": detection["deadlock_detected"],
            "involved_processes": detection["involved_processes"],
            "involved_resources": detection["involved_resources"],
            "explanation": explanation,
        }
