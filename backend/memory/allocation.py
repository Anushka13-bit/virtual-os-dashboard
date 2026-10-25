"""
Memory Allocation Module.

Simulates dynamic memory allocation algorithms used by operating systems:
- First Fit
- Best Fit
- Worst Fit
- Process Deallocation & Free Block Coalescing
"""

from typing import Dict, List, Optional, Any


class MemoryBlock:
    """
    Represents a contiguous block of physical memory (dynamic or fixed partition).
    """

    def __init__(
        self,
        start: int,
        size: int,
        is_allocated: bool = False,
        process_id: Optional[str] = None,
        process_name: Optional[str] = None,
        block_name: Optional[str] = None,
        allocated_size: Optional[int] = None,
    ):
        self.start = start
        self.size = size
        self.end = start + size
        self.is_allocated = is_allocated
        self.process_id = process_id if is_allocated else None
        self.process_name = process_name if is_allocated else None
        self.block_name = block_name or ""
        self.allocated_size = (
            allocated_size if is_allocated and allocated_size is not None else (size if is_allocated else 0)
        )
        self.internal_fragmentation = (self.size - self.allocated_size) if is_allocated else 0

    def to_dict(self) -> Dict[str, Any]:
        """Returns JSON-serializable dictionary representation of the block."""
        return {
            "start": self.start,
            "end": self.end,
            "size": self.size,
            "is_allocated": self.is_allocated,
            "process_id": self.process_id,
            "process_name": self.process_name,
            "block_name": self.block_name,
            "allocated_size": self.allocated_size,
            "internal_fragmentation": self.internal_fragmentation,
        }

    def __repr__(self) -> str:
        name_info = f" ({self.process_name})" if self.process_name else ""
        bname = f"[{self.block_name}] " if self.block_name else ""
        status = f"Allocated({self.process_id}{name_info})" if self.is_allocated else "Free"
        return f"<{bname}Block [{self.start}:{self.end}] {self.size}MB {status}>"


class MemoryManager:
    """
    Manages physical memory partitioning, process allocation, and deallocation.
    Supports both dynamic variable partitioning and user-defined partition blocks.
    """

    def __init__(self, total_memory: int = 1024, partition_sizes: Optional[List[int]] = None):
        if total_memory <= 0:
            raise ValueError("Total memory must be greater than 0.")
        self.total_memory = total_memory
        self.is_partitioned: bool = False
        self.partition_sizes: List[int] = []
        self.allocation_log: List[Dict[str, Any]] = []
        self.unallocated_processes: List[Dict[str, Any]] = []
        self.external_frag_explanation: str = ""
        self.external_frag_amount: int = 0

        if partition_sizes:
            self.set_partitions(partition_sizes)
        else:
            self.blocks: List[MemoryBlock] = [
                MemoryBlock(start=0, size=total_memory, is_allocated=False, block_name="Block 1")
            ]

    def set_partitions(self, partition_sizes: List[int]) -> Dict[str, Any]:
        """
        Initializes memory with user-defined partition block sizes (e.g. [100, 500, 200, 300, 600]).
        """
        if not partition_sizes:
            raise ValueError("Partition sizes list cannot be empty.")
        for sz in partition_sizes:
            if not isinstance(sz, (int, float)) or int(sz) <= 0:
                raise ValueError("All partition sizes must be positive integers greater than 0.")

        clean_sizes = [int(sz) for sz in partition_sizes]
        self.partition_sizes = clean_sizes
        self.total_memory = sum(clean_sizes)
        self.is_partitioned = True

        blocks = []
        cur_addr = 0
        for idx, sz in enumerate(clean_sizes, start=1):
            blocks.append(
                MemoryBlock(
                    start=cur_addr,
                    size=sz,
                    is_allocated=False,
                    block_name=f"Block {idx}",
                )
            )
            cur_addr += sz

        self.blocks = blocks
        self.allocation_log = []
        self.unallocated_processes = []
        self.external_frag_amount = 0
        self.external_frag_explanation = (
            f"Configured {len(clean_sizes)} memory blocks (Total: {self.total_memory} MB). Ready for process allocation."
        )
        return self.get_state_dict(success=True, message="Memory partitions configured successfully.")

    def reset(self, total_memory: Optional[int] = None) -> None:
        """Resets the memory manager to an empty initial state."""
        if total_memory is not None:
            if total_memory <= 0:
                raise ValueError("Total memory must be greater than 0.")
            self.total_memory = total_memory

        if self.is_partitioned and self.partition_sizes:
            # Re-initialize the same partitions
            self.set_partitions(self.partition_sizes)
        else:
            self.is_partitioned = False
            self.partition_sizes = []
            self.blocks = [MemoryBlock(start=0, size=self.total_memory, is_allocated=False, block_name="Block 1")]
            self.allocation_log = []
            self.unallocated_processes = []
            self.external_frag_amount = 0
            self.external_frag_explanation = ""

    def get_allocated_processes(self) -> Dict[str, int]:
        """Returns a mapping of process_id -> total allocated memory size."""
        allocated: Dict[str, int] = {}
        for block in self.blocks:
            if block.is_allocated and block.process_id:
                allocated[block.process_id] = allocated.get(block.process_id, 0) + (
                    block.allocated_size if block.allocated_size > 0 else block.size
                )
        return allocated

    def get_used_memory(self) -> int:
        """Calculates total used memory in MB."""
        return sum(
            (block.allocated_size if block.allocated_size > 0 else block.size)
            for block in self.blocks
            if block.is_allocated
        )

    def get_free_memory(self) -> int:
        """Calculates total unallocated memory in MB."""
        if self.is_partitioned:
            return sum(block.size for block in self.blocks if not block.is_allocated)
        return sum(block.size for block in self.blocks if not block.is_allocated)

    def get_external_fragmentation(self, requested_size: int = 0) -> int:
        """
        Calculates external fragmentation.
        In partitioned mode: Returns total free memory across unallocated blocks when unallocated processes exist
        that cannot fit into any single contiguous free partition block.
        In dynamic mode: Retains classical contiguous calculation for backward compatibility.
        """
        if self.is_partitioned:
            return self.external_frag_amount

        free_blocks = [b.size for b in self.blocks if not b.is_allocated]
        if not free_blocks:
            return 0
        max_free_block = max(free_blocks)
        total_free = sum(free_blocks)
        if requested_size > 0:
            if requested_size <= total_free and requested_size > max_free_block:
                return total_free
            return 0
        return total_free - max_free_block if len(free_blocks) > 1 else 0

    def allocate_processes(self, processes: List[Any], algorithm: str = "first_fit") -> Dict[str, Any]:
        """
        Allocates a list of processes into the configured partition blocks using First Fit, Best Fit, or Worst Fit.
        Generates detailed allocation mapping showing where each process is placed, block names, process names,
        internal fragmentation, and calculates external fragmentation correctly.
        """
        algo = algorithm.lower().strip()
        if algo not in ("first_fit", "best_fit", "worst_fit", "firstfit", "bestfit", "worstfit", "first fit", "best fit", "worst fit"):
            raise ValueError(f"Unknown allocation algorithm: '{algorithm}'. Choose from 'first_fit', 'best_fit', or 'worst_fit'.")

        # Standardize algorithm key
        if "first" in algo:
            algo_key = "first_fit"
            algo_name = "First Fit"
        elif "best" in algo:
            algo_key = "best_fit"
            algo_name = "Best Fit"
        else:
            algo_key = "worst_fit"
            algo_name = "Worst Fit"

        # If not partitioned yet, create default partitions or single block
        if not self.is_partitioned or not self.blocks:
            self.set_partitions([100, 500, 200, 300, 600])

        # Reset all blocks to unallocated state before fresh placement
        for b in self.blocks:
            b.is_allocated = False
            b.process_id = None
            b.process_name = None
            b.allocated_size = 0
            b.internal_fragmentation = 0

        self.allocation_log = []
        self.unallocated_processes = []

        for p in processes:
            pid = getattr(p, "pid", None) or (p.get("pid") if isinstance(p, dict) else "")
            pname = getattr(p, "name", None) or (p.get("name") if isinstance(p, dict) else pid) or pid
            req = getattr(p, "memory_required", None) or (p.get("memory_required") if isinstance(p, dict) else 0)

            try:
                req = int(req)
            except (ValueError, TypeError):
                req = 0

            if req <= 0:
                continue

            # Find unallocated candidate blocks large enough to hold the process
            candidates = [
                (idx, b) for idx, b in enumerate(self.blocks) if not b.is_allocated and b.size >= req
            ]

            if not candidates:
                # Process cannot fit into any free block
                self.unallocated_processes.append({
                    "process_id": pid,
                    "process_name": pname,
                    "requested_size": req,
                })
                self.allocation_log.append({
                    "process_id": pid,
                    "process_name": pname,
                    "requested_size": req,
                    "allocated": False,
                    "block_name": None,
                    "block_size": None,
                    "internal_fragmentation": 0,
                    "status": "Not Allocated",
                    "reason": f"No single free block >= {req} MB available",
                })
                continue

            # Choose block according to strategy
            if algo_key == "first_fit":
                # First available candidate block
                chosen_idx, chosen_block = candidates[0]
                reason = f"First free partition large enough (>= {req} MB)"

            elif algo_key == "best_fit":
                # Smallest candidate block (minimizes leftover space)
                chosen_idx, chosen_block = min(candidates, key=lambda item: (item[1].size - req, item[0]))
                waste = chosen_block.size - req
                reason = f"Smallest partition that fits (leaves minimal waste: {waste} MB)"

            else:  # worst_fit
                # Largest candidate block (leaves largest leftover space)
                chosen_idx, chosen_block = max(candidates, key=lambda item: (item[1].size - req, -item[0]))
                waste = chosen_block.size - req
                reason = f"Largest available partition (leaves maximum leftover: {waste} MB)"

            # Allocate process to the chosen block
            chosen_block.is_allocated = True
            chosen_block.process_id = pid
            chosen_block.process_name = pname
            chosen_block.allocated_size = req
            chosen_block.internal_fragmentation = chosen_block.size - req

            self.allocation_log.append({
                "process_id": pid,
                "process_name": pname,
                "requested_size": req,
                "allocated": True,
                "block_name": chosen_block.block_name,
                "block_size": chosen_block.size,
                "internal_fragmentation": chosen_block.internal_fragmentation,
                "status": "Allocated",
                "reason": f"{reason} -> Allocated to {chosen_block.block_name} ({chosen_block.size} MB)",
            })

        # Calculate External Fragmentation
        free_blocks = [b for b in self.blocks if not b.is_allocated]
        total_free = sum(b.size for b in free_blocks)
        max_free_block = max([b.size for b in free_blocks], default=0)

        if self.unallocated_processes:
            # Check if any unallocated process could fit if free memory were contiguous
            unallocated_fit_in_total = [
                up for up in self.unallocated_processes
                if up["requested_size"] <= total_free and up["requested_size"] > max_free_block
            ]

            if unallocated_fit_in_total:
                up_example = unallocated_fit_in_total[0]
                self.external_frag_amount = total_free
                free_details = ", ".join(f"{b.block_name}: {b.size} MB" for b in free_blocks)
                self.external_frag_explanation = (
                    f"External Fragmentation = {total_free} MB. Process '{up_example['process_name']} ({up_example['process_id']})' "
                    f"requires {up_example['requested_size']} MB. Total free memory across unallocated blocks ({free_details}) "
                    f"is {total_free} MB, which is sufficient, but no individual partition is large enough (max free is {max_free_block} MB)."
                )
            elif total_free > 0:
                self.external_frag_amount = total_free
                up_example = self.unallocated_processes[0]
                self.external_frag_explanation = (
                    f"External Fragmentation = {total_free} MB. {len(self.unallocated_processes)} process(es) could not be allocated. "
                    f"Remaining free memory ({total_free} MB across {len(free_blocks)} blocks) cannot satisfy the requests."
                )
            else:
                self.external_frag_amount = 0
                self.external_frag_explanation = "Memory completely saturated: 0 MB free remaining in partitions."
        else:
            self.external_frag_amount = 0
            self.external_frag_explanation = (
                f"No External Fragmentation (0 MB): All {len(self.allocation_log)} processes were successfully allocated. "
                f"{total_free} MB remains free across {len(free_blocks)} partition(s)."
            )

        return self.get_state_dict(
            success=True,
            message=f"Allocated processes using {algo_name}. {len(self.unallocated_processes)} unallocated.",
        )

    def get_state_dict(self, success: bool = True, message: str = "") -> Dict[str, Any]:
        """Builds a structured dictionary representation of the current memory state."""
        used = self.get_used_memory()
        free = self.get_free_memory()
        utilization = round((used / self.total_memory) * 100, 2) if self.total_memory > 0 else 0.0

        return {
            "success": success,
            "message": message,
            "total_memory": self.total_memory,
            "used_memory": used,
            "free_memory": free,
            "utilization_percentage": utilization,
            "external_fragmentation": self.get_external_fragmentation(),
            "external_frag_explanation": self.external_frag_explanation,
            "allocated_processes": self.get_allocated_processes(),
            "blocks": [block.to_dict() for block in self.blocks],
            "is_partitioned": self.is_partitioned,
            "partition_sizes": self.partition_sizes,
            "allocation_log": self.allocation_log,
            "unallocated_processes": self.unallocated_processes,
        }

    def _find_target_block(self, size: int, algorithm: str) -> Optional[int]:
        """
        Finds the index of the target free block based on the selected allocation strategy.
        Algorithms: 'first_fit', 'best_fit', 'worst_fit'.
        """
        algo = algorithm.lower().strip()
        candidate_indices = [
            idx for idx, block in enumerate(self.blocks) if not block.is_allocated and block.size >= size
        ]

        if not candidate_indices:
            return None

        if algo in ("first_fit", "firstfit", "first fit"):
            return candidate_indices[0]

        elif algo in ("best_fit", "bestfit", "best fit"):
            # Select free block with minimum size >= requested size
            return min(candidate_indices, key=lambda idx: (self.blocks[idx].size, idx))

        elif algo in ("worst_fit", "worstfit", "worst fit"):
            # Select free block with maximum size >= requested size
            return max(candidate_indices, key=lambda idx: (self.blocks[idx].size, -idx))

        else:
            raise ValueError(f"Unknown allocation algorithm: '{algorithm}'. Choose from 'first_fit', 'best_fit', or 'worst_fit'.")

    def allocate(self, process_id: str, size: int, algorithm: str = "first_fit") -> Dict[str, Any]:
        """
        Allocates memory to a process using First Fit, Best Fit, or Worst Fit.
        Returns a structured dictionary of the outcome and updated memory state.
        """
        # Input Validations
        if not process_id or not str(process_id).strip():
            return self.get_state_dict(success=False, message="Process ID must not be empty.")

        process_id = str(process_id).strip()

        if size <= 0:
            return self.get_state_dict(success=False, message=f"Memory size requested must be greater than 0 MB (got {size} MB).")

        if size > self.total_memory:
            return self.get_state_dict(
                success=False,
                message=f"Process {process_id} requested {size} MB, which exceeds total memory ({self.total_memory} MB).",
            )

        # Check if process_id is already allocated
        if process_id in self.get_allocated_processes():
            return self.get_state_dict(
                success=False,
                message=f"Process ID '{process_id}' is already present in memory.",
            )

        try:
            target_idx = self._find_target_block(size, algorithm)
        except ValueError as err:
            return self.get_state_dict(success=False, message=str(err))

        if target_idx is None:
            total_free = self.get_free_memory()
            if total_free >= size:
                msg = f"Allocation failed for process {process_id} ({size} MB). External fragmentation detected: {total_free} MB free but no single block is large enough."
            else:
                msg = f"Allocation failed for process {process_id} ({size} MB). Insufficient free memory ({total_free} MB available)."
            return self.get_state_dict(success=False, message=msg)

        target_block = self.blocks[target_idx]

        if target_block.size == size:
            target_block.is_allocated = True
            target_block.process_id = process_id
        else:
            # Split block into allocated segment and remaining free segment
            allocated_block = MemoryBlock(
                start=target_block.start, size=size, is_allocated=True, process_id=process_id
            )
            remaining_block = MemoryBlock(
                start=target_block.start + size,
                size=target_block.size - size,
                is_allocated=False,
            )
            self.blocks[target_idx] = allocated_block
            self.blocks.insert(target_idx + 1, remaining_block)

        algo_formatted = algorithm.replace("_", " ").title()
        return self.get_state_dict(
            success=True,
            message=f"Process {process_id} ({size} MB) successfully allocated using {algo_formatted}.",
        )

    def deallocate(self, process_id: str) -> Dict[str, Any]:
        """
        Deallocates memory for a specified process ID and merges adjacent free blocks (coalescing).
        """
        if not process_id or not str(process_id).strip():
            return self.get_state_dict(success=False, message="Process ID must not be empty.")

        process_id = str(process_id).strip()
        found = False

        for block in self.blocks:
            if block.is_allocated and block.process_id == process_id:
                block.is_allocated = False
                block.process_id = None
                found = True

        if not found:
            return self.get_state_dict(
                success=False, message=f"Deallocation failed. Process '{process_id}' not found in memory."
            )

        self._coalesce()
        return self.get_state_dict(
            success=True, message=f"Process '{process_id}' successfully deallocated and adjacent free blocks merged."
        )

    def _coalesce(self) -> None:
        """Merges contiguous unallocated blocks into single larger free blocks."""
        if not self.blocks:
            return

        coalesced: List[MemoryBlock] = []
        current = self.blocks[0]

        for next_block in self.blocks[1:]:
            if not current.is_allocated and not next_block.is_allocated:
                # Merge next_block into current
                current = MemoryBlock(
                    start=current.start,
                    size=current.size + next_block.size,
                    is_allocated=False,
                )
            else:
                coalesced.append(current)
                current = next_block

        coalesced.append(current)
        self.blocks = coalesced


# Standalone function interfaces for modular import
def allocate_first_fit(memory_manager: MemoryManager, process_id: str, size: int) -> Dict[str, Any]:
    """Allocates memory using First Fit algorithm."""
    return memory_manager.allocate(process_id, size, algorithm="first_fit")


def allocate_best_fit(memory_manager: MemoryManager, process_id: str, size: int) -> Dict[str, Any]:
    """Allocates memory using Best Fit algorithm."""
    return memory_manager.allocate(process_id, size, algorithm="best_fit")


def allocate_worst_fit(memory_manager: MemoryManager, process_id: str, size: int) -> Dict[str, Any]:
    """Allocates memory using Worst Fit algorithm."""
    return memory_manager.allocate(process_id, size, algorithm="worst_fit")


def deallocate_process(memory_manager: MemoryManager, process_id: str) -> Dict[str, Any]:
    """Deallocates memory for the given process ID."""
    return memory_manager.deallocate(process_id)


def reset_memory(memory_manager: MemoryManager, total_size: Optional[int] = None) -> Dict[str, Any]:
    """Resets memory manager to an initial unallocated state."""
    memory_manager.reset(total_size)
    return memory_manager.get_state_dict(success=True, message="Memory reset successfully.")
