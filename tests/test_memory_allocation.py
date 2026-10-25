"""
Unit tests for Memory Management & Allocation Algorithms:
- First Fit
- Best Fit
- Worst Fit
- Deallocation & Free Block Coalescing
- Edge Cases & Input Validation
"""

import pytest
from backend.memory.allocation import (
    MemoryManager,
    allocate_first_fit,
    allocate_best_fit,
    allocate_worst_fit,
    deallocate_process,
    reset_memory,
)


def create_fragmented_memory() -> MemoryManager:
    """
    Helper function to construct a memory layout with free blocks of specific sizes:
    [Allocated P1 (100MB)] -> [Free (100MB)] -> [Allocated P2 (100MB)] ->
    [Free (300MB)] -> [Allocated P3 (100MB)] -> [Free (200MB)] -> [Allocated P4 (100MB)] -> [Free (500MB)]
    Total size = 1500 MB.
    Free blocks available: 100 MB (start 100), 300 MB (start 300), 200 MB (start 700), 500 MB (start 1000).
    """
    mm = MemoryManager(total_memory=1500)
    # 1. Allocate initial setup
    mm.allocate("P1", 100, "first_fit")  # [0..100]
    mm.allocate("P_FREE1", 100, "first_fit")  # [100..200]
    mm.allocate("P2", 100, "first_fit")  # [200..300]
    mm.allocate("P_FREE2", 300, "first_fit")  # [300..600]
    mm.allocate("P3", 100, "first_fit")  # [600..700]
    mm.allocate("P_FREE3", 200, "first_fit")  # [700..900]
    mm.allocate("P4", 100, "first_fit")  # [900..1000]
    mm.allocate("P_FREE4", 500, "first_fit")  # [1000..1500]

    # Free the placeholder blocks to create free holes of 100, 300, 200, 500
    mm.deallocate("P_FREE1")
    mm.deallocate("P_FREE2")
    mm.deallocate("P_FREE3")
    mm.deallocate("P_FREE4")
    return mm


def test_first_fit():
    mm = create_fragmented_memory()
    # Free blocks: 100MB (at 100), 300MB (at 300), 200MB (at 700), 500MB (at 1000)
    # Process P_NEW requests 250 MB. First Fit should select the 300 MB block at start 300.
    res = allocate_first_fit(mm, "P_NEW", 250)
    assert res["success"] is True

    p_new_block = [b for b in res["blocks"] if b["process_id"] == "P_NEW"][0]
    assert p_new_block["start"] == 300
    assert p_new_block["size"] == 250


def test_best_fit():
    # Scenario A: Free blocks 100MB, 300MB, 200MB, 500MB. Request 250MB -> Best fit picks 300MB block (at start 300).
    mm1 = create_fragmented_memory()
    res1 = allocate_best_fit(mm1, "P_NEW", 250)
    assert res1["success"] is True
    p_new1 = [b for b in res1["blocks"] if b["process_id"] == "P_NEW"][0]
    assert p_new1["start"] == 300
    assert p_new1["size"] == 250

    # Scenario B: Free blocks 100MB, 280MB, 300MB, 500MB. Request 250MB -> Best fit picks 280MB block.
    mm2 = MemoryManager(total_memory=1580)
    mm2.allocate("X1", 100, "first_fit")
    mm2.allocate("FREE1", 100, "first_fit")
    mm2.allocate("X2", 100, "first_fit")
    mm2.allocate("FREE2", 280, "first_fit")
    mm2.allocate("X3", 100, "first_fit")
    mm2.allocate("FREE3", 300, "first_fit")
    mm2.allocate("X4", 100, "first_fit")
    mm2.allocate("FREE4", 500, "first_fit")

    mm2.deallocate("FREE1")
    mm2.deallocate("FREE2")
    mm2.deallocate("FREE3")
    mm2.deallocate("FREE4")

    res2 = allocate_best_fit(mm2, "P_TARGET", 250)
    assert res2["success"] is True
    p_target = [b for b in res2["blocks"] if b["process_id"] == "P_TARGET"][0]
    assert p_target["start"] == 300  # FREE2 block starts at 300 (size 280)
    assert p_target["size"] == 250


def test_worst_fit():
    mm = create_fragmented_memory()
    # Free blocks: 100MB, 300MB, 200MB, 500MB.
    # Process P_NEW requests 250 MB. Worst Fit should select the largest (500 MB) block starting at 1000.
    res = allocate_worst_fit(mm, "P_NEW", 250)
    assert res["success"] is True
    p_new_block = [b for b in res["blocks"] if b["process_id"] == "P_NEW"][0]
    assert p_new_block["start"] == 1000
    assert p_new_block["size"] == 250


def test_deallocation_and_coalescing():
    mm = MemoryManager(total_memory=1024)
    mm.allocate("P1", 200, "first_fit")
    mm.allocate("P2", 300, "first_fit")
    mm.allocate("P3", 100, "first_fit")

    assert mm.get_used_memory() == 600
    assert mm.get_free_memory() == 424

    # Deallocate middle process P2
    res = deallocate_process(mm, "P2")
    assert res["success"] is True
    assert mm.get_used_memory() == 300

    # Deallocate P1 and P3 -> should coalesce everything back to a single 1024 MB free block
    deallocate_process(mm, "P1")
    res_final = deallocate_process(mm, "P3")
    assert res_final["success"] is True
    assert len(res_final["blocks"]) == 1
    assert res_final["blocks"][0]["size"] == 1024
    assert res_final["blocks"][0]["is_allocated"] is False


def test_validation_and_edge_cases():
    # Invalid total memory
    with pytest.raises(ValueError):
        MemoryManager(total_memory=0)

    with pytest.raises(ValueError):
        MemoryManager(total_memory=-100)

    mm = MemoryManager(total_memory=500)

    # Negative or zero allocation size
    res = mm.allocate("P1", 0)
    assert res["success"] is False
    assert "greater than 0" in res["message"]

    res = mm.allocate("P1", -50)
    assert res["success"] is False

    # Empty process ID
    res = mm.allocate("", 100)
    assert res["success"] is False

    # Allocation size exceeds total memory
    res = mm.allocate("P1", 600)
    assert res["success"] is False
    assert "exceeds total memory" in res["message"]

    # Duplicate process ID
    mm.allocate("P1", 200)
    res = mm.allocate("P1", 100)
    assert res["success"] is False
    assert "already present" in res["message"]

    # Deallocate non-existent process
    res = deallocate_process(mm, "P999")
    assert res["success"] is False
    assert "not found" in res["message"]

    # Reset memory
    res = reset_memory(mm, 1000)
    assert res["success"] is True
    assert mm.total_memory == 1000
    assert mm.get_free_memory() == 1000


def test_user_partition_allocation_and_fragmentation():
    """
    Tests textbook partition allocation with user-defined blocks:
    Blocks: [100, 500, 200, 300, 600]
    Processes: P1 (212 MB, "Browser"), P2 (417 MB, "Database"), P3 (112 MB, "Terminal"), P4 (426 MB, "Editor")
    """
    mm = MemoryManager()
    mm.set_partitions([100, 500, 200, 300, 600])

    assert mm.is_partitioned is True
    assert mm.total_memory == 1700
    assert len(mm.blocks) == 5
    assert [b.block_name for b in mm.blocks] == ["Block 1", "Block 2", "Block 3", "Block 4", "Block 5"]

    processes = [
        {"pid": "P1", "name": "Browser", "memory_required": 212},
        {"pid": "P2", "name": "Database", "memory_required": 417},
        {"pid": "P3", "name": "Terminal", "memory_required": 112},
        {"pid": "P4", "name": "Editor", "memory_required": 426},
    ]

    # 1. First Fit
    res_ff = mm.allocate_processes(processes, algorithm="first_fit")
    assert res_ff["success"] is True
    # In First Fit:
    # P1 (212) -> Block 2 (500)
    # P2 (417) -> Block 5 (600)
    # P3 (112) -> Block 3 (200)
    # P4 (426) -> Unallocated
    block_map_ff = {b["block_name"]: b for b in res_ff["blocks"]}
    assert block_map_ff["Block 2"]["process_id"] == "P1"
    assert block_map_ff["Block 2"]["process_name"] == "Browser"
    assert block_map_ff["Block 2"]["internal_fragmentation"] == 500 - 212

    assert block_map_ff["Block 5"]["process_id"] == "P2"
    assert block_map_ff["Block 5"]["process_name"] == "Database"
    assert block_map_ff["Block 3"]["process_id"] == "P3"
    assert block_map_ff["Block 3"]["process_name"] == "Terminal"
    assert block_map_ff["Block 1"]["is_allocated"] is False
    assert block_map_ff["Block 4"]["is_allocated"] is False

    # 2. Best Fit
    res_bf = mm.allocate_processes(processes, algorithm="best_fit")
    assert res_bf["success"] is True
    # In Best Fit:
    # P1 (212) -> Block 4 (300)
    # P2 (417) -> Block 2 (500)
    # P3 (112) -> Block 3 (200)
    # P4 (426) -> Block 5 (600)
    # All 4 processes fit!
    block_map_bf = {b["block_name"]: b for b in res_bf["blocks"]}
    assert block_map_bf["Block 4"]["process_id"] == "P1"
    assert block_map_bf["Block 2"]["process_id"] == "P2"
    assert block_map_bf["Block 3"]["process_id"] == "P3"
    assert block_map_bf["Block 5"]["process_id"] == "P4"
    assert res_bf["external_fragmentation"] == 0

    # 3. Worst Fit
    res_wf = mm.allocate_processes(processes, algorithm="worst_fit")
    assert res_wf["success"] is True
    block_map_wf = {b["block_name"]: b for b in res_wf["blocks"]}
    assert block_map_wf["Block 5"]["process_id"] == "P1"  # Picked largest 600MB
    assert block_map_wf["Block 2"]["process_id"] == "P2"  # Picked 500MB
    assert block_map_wf["Block 4"]["process_id"] == "P3"  # Picked 300MB


def test_accurate_external_fragmentation_calculation():
    """
    Test scenario where total free memory >= process required memory,
    but no single block is large enough -> External Fragmentation.
    """
    mm = MemoryManager()
    # Blocks: 100 MB, 500 MB, 200 MB. Total = 800 MB.
    mm.set_partitions([100, 500, 200])

    # P1 takes the 500 MB block
    processes = [
        {"pid": "P1", "name": "HeavyService", "memory_required": 500},
        {"pid": "P2", "name": "WebWorker", "memory_required": 250},
    ]
    res = mm.allocate_processes(processes, algorithm="first_fit")

    # Block 1 (100 MB) is free, Block 3 (200 MB) is free. Total free = 300 MB.
    # P2 needs 250 MB. Total free (300 MB) >= 250 MB, but max free block is 200 MB.
    # Hence External Fragmentation = 300 MB!
    assert res["external_fragmentation"] == 300
    assert "External Fragmentation = 300 MB" in res["external_frag_explanation"]
    assert len(res["unallocated_processes"]) == 1
    assert res["unallocated_processes"][0]["process_id"] == "P2"

