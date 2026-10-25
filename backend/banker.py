"""Banker's Algorithm implementation for deadlock avoidance."""

from __future__ import annotations

from typing import Any


class BankersAlgorithm:
    """
    Implements Banker's Safety and Resource Request algorithms.

    Invariants enforced:
      Need[i][j]      = Maximum[i][j] - Allocation[i][j]
      Available[j]    = Total[j] - sum_i(Allocation[i][j])
      0 <= Allocation <= Maximum <= Total
    """

    def __init__(
        self,
        processes: list[str],
        resources: list[str],
        total_resources: dict[str, int],
        allocation: dict[str, dict[str, int]],
        maximum: dict[str, dict[str, int]],
    ) -> None:
        self.processes = list(processes)
        self.resources = list(resources)
        self.total_resources = dict(total_resources)
        self.allocation = {p: dict(alloc) for p, alloc in allocation.items()}
        self.maximum = {p: dict(max_res) for p, max_res in maximum.items()}
        self.validate_state()

    def validate_state(self) -> None:
        """Validate inputs and matrix consistency."""
        if not isinstance(self.processes, list) or not self.processes:
            raise ValueError("processes list cannot be empty")
        if len(set(self.processes)) != len(self.processes):
            raise ValueError("duplicate process IDs in process list")
        if not isinstance(self.resources, list) or not self.resources:
            raise ValueError("resources list cannot be empty")
        if len(set(self.resources)) != len(self.resources):
            raise ValueError("duplicate resource IDs in resource list")

        for r in self.resources:
            if r not in self.total_resources:
                raise ValueError(f"missing total count for resource: {r}")
            if self.total_resources[r] < 0:
                raise ValueError(f"total resource quantity cannot be negative for {r}")

        for p in self.processes:
            if p not in self.allocation:
                raise ValueError(f"missing allocation matrix row for process: {p}")
            if p not in self.maximum:
                raise ValueError(f"missing maximum matrix row for process: {p}")
            for r in self.resources:
                if r not in self.allocation[p]:
                    raise ValueError(f"missing resource {r} in allocation for process {p}")
                if r not in self.maximum[p]:
                    raise ValueError(f"missing resource {r} in maximum for process {p}")
                alloc_val = self.allocation[p][r]
                max_val = self.maximum[p][r]
                if alloc_val < 0:
                    raise ValueError(f"negative allocation for process {p}, resource {r}")
                if max_val < 0:
                    raise ValueError(f"negative maximum requirement for process {p}, resource {r}")
                if alloc_val > max_val:
                    raise ValueError(
                        f"allocation ({alloc_val}) exceeds maximum ({max_val}) for process {p}, resource {r}"
                    )

        for r in self.resources:
            sum_alloc = sum(self.allocation[p][r] for p in self.processes)
            if sum_alloc > self.total_resources[r]:
                raise ValueError(
                    f"total allocated {r} ({sum_alloc}) exceeds total capacity ({self.total_resources[r]})"
                )

    def calculate_need(self) -> dict[str, dict[str, int]]:
        """Need[i][j] = Maximum[i][j] - Allocation[i][j]."""
        return {
            p: {r: self.maximum[p][r] - self.allocation[p][r] for r in self.resources}
            for p in self.processes
        }

    def calculate_available(self) -> dict[str, int]:
        """Available[j] = Total[j] - sum_i(Allocation[i][j])."""
        return {
            r: self.total_resources[r] - sum(self.allocation[p][r] for p in self.processes)
            for r in self.resources
        }

    def check_safety(self) -> dict[str, Any]:
        """
        Execute Banker's Safety Algorithm on the current state.

        Returns a structured dict with:
          safe, safe_sequence, available, need, allocation, maximum, explanation.
        """
        need = self.calculate_need()
        available = self.calculate_available()
        work = dict(available)
        finish = {p: False for p in self.processes}
        safe_sequence: list[str] = []

        while len(safe_sequence) < len(self.processes):
            found = False
            for p in self.processes:
                if not finish[p] and all(need[p][r] <= work[r] for r in self.resources):
                    for r in self.resources:
                        work[r] += self.allocation[p][r]
                    finish[p] = True
                    safe_sequence.append(p)
                    found = True
                    break
            if not found:
                break

        is_safe = len(safe_sequence) == len(self.processes)

        if is_safe:
            seq_str = " -> ".join(safe_sequence)
            explanation = f"System is in a SAFE state. Safe sequence: {seq_str}"
        else:
            unfinished = [p for p, done in finish.items() if not done]
            explanation = (
                f"System is in an UNSAFE state. "
                f"Processes {unfinished} cannot finish with available resources."
            )

        return {
            "safe": is_safe,
            "safe_sequence": safe_sequence,
            "available": available,
            "allocation": self.allocation,
            "maximum": self.maximum,
            "need": need,
            "finished_processes": [p for p, done in finish.items() if done],
            "explanation": explanation,
        }

    def request_resources(
        self, process_id: str, request: dict[str, int]
    ) -> dict[str, Any]:
        """
        Execute Banker's Resource Request Algorithm.

        Steps:
        1. Validate process and request amounts (non-negative, within Need).
        2. Check Request <= Available. Return denial if insufficient.
        3. Tentatively allocate.
        4. Run safety check on tentative state.
        5. If safe — commit. If unsafe — restore and return current state safety.
        """
        if process_id not in self.processes:
            raise ValueError(f"unknown process ID: {process_id}")

        for r, req_val in request.items():
            if r not in self.resources:
                raise ValueError(f"unknown resource ID: {r}")
            if req_val < 0:
                raise ValueError(f"request amount cannot be negative for {r}")

        need = self.calculate_need()
        available = self.calculate_available()

        # Validate Request <= Need
        for r in self.resources:
            req_amt = request.get(r, 0)
            if req_amt > need[process_id][r]:
                return {
                    "granted": False,
                    "waiting": False,
                    "denied_reason": "exceeds_need",
                    "reason": (
                        f"Request[{r}]={req_amt} exceeds "
                        f"Need[{r}]={need[process_id][r]} for {process_id}"
                    ),
                    "safe": self.check_safety()["safe"],
                    "explanation": (
                        f"Request denied: process {process_id} asked for more "
                        f"than its declared maximum need."
                    ),
                }

        # Validate Request <= Available
        for r in self.resources:
            req_amt = request.get(r, 0)
            if req_amt > available[r]:
                return {
                    "granted": False,
                    "waiting": False,
                    "denied_reason": "insufficient_available",
                    "reason": (
                        f"Request[{r}]={req_amt} exceeds "
                        f"currently Available[{r}]={available[r]}"
                    ),
                    "safe": False,
                    "explanation": "Request denied: insufficient resources currently available.",
                }

        # Tentatively allocate
        temp_allocation = {p: dict(alloc) for p, alloc in self.allocation.items()}
        for r in self.resources:
            temp_allocation[process_id][r] += request.get(r, 0)

        temp_banker = BankersAlgorithm(
            processes=self.processes,
            resources=self.resources,
            total_resources=self.total_resources,
            allocation=temp_allocation,
            maximum=self.maximum,
        )
        safety_result = temp_banker.check_safety()

        if safety_result["safe"]:
            # Commit
            self.allocation = temp_allocation
            return {
                "granted": True,
                "waiting": False,
                "safe": True,
                "safe_sequence": safety_result["safe_sequence"],
                "available": temp_banker.calculate_available(),
                "allocation": self.allocation,
                "maximum": self.maximum,
                "need": temp_banker.calculate_need(),
                "explanation": f"Request GRANTED for {process_id}. System remains in a safe state.",
            }
        else:
            # Unsafe — self is completely unchanged (only temp_banker was modified).
            # Report the CURRENT (pre-request) system safety for the caller.
            original_safety = self.check_safety()
            return {
                "granted": False,
                "waiting": False,
                "denied_reason": "unsafe_state",
                "reason": "Granting request leads to an UNSAFE state",
                "safe": False,
                "safe_sequence": [],
                "current_state_safe": original_safety["safe"],
                "current_state_safe_sequence": original_safety["safe_sequence"],
                "available": available,          # unchanged
                "allocation": self.allocation,   # unchanged
                "maximum": self.maximum,
                "need": need,                    # unchanged
                "explanation": (
                    f"Request DENIED for {process_id}: granting {request} would result in "
                    f"an UNSAFE state. No resources were allocated. "
                    f"Current system: {original_safety['explanation']}"
                ),
            }
