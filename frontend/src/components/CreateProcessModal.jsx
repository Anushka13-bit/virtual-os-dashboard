import React, { useState } from 'react';

export default function CreateProcessModal({ isOpen, onClose, onCreateProcess }) {
  const [formData, setFormData] = useState({
    name: '',
    arrival_time: 0,
    burst_time: 3,
    priority: 1,
    memory_required: 128,
    max_cpu: 4,
    max_printer: 2,
    max_disk: 2,
    max_network: 1,
  });

  if (!isOpen) return null;

  const handleChange = (e) => {
    const { name, value, type } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: type === 'number' ? (parseInt(value, 10) || 0) : value,
    }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    onCreateProcess({
      name: formData.name.trim(),
      arrival_time: formData.arrival_time,
      burst_time: formData.burst_time,
      priority: formData.priority,
      memory_required: formData.memory_required,
      maximum_resources: {
        CPU: formData.max_cpu,
        Printer: formData.max_printer,
        Disk: formData.max_disk,
        Network: formData.max_network,
      },
    });
    // Reset form with standard defaults
    setFormData({
      name: '',
      arrival_time: 0,
      burst_time: 3,
      priority: 1,
      memory_required: 128,
      max_cpu: 4,
      max_printer: 2,
      max_disk: 2,
      max_network: 1,
    });
  };

  return (
    <div className="modal-overlay active" id="createProcessModal">
      <div className="modal-card">
        <div className="modal-header">
          <h3>Create New Process</h3>
          <button className="modal-close" id="btn-close-modal" onClick={onClose}>
            &times;
          </button>
        </div>
        <form id="form-create-process" onSubmit={handleSubmit}>
          <div className="modal-body">
            <div className="form-group">
              <label htmlFor="input-name">Process Name*</label>
              <input
                type="text"
                id="input-name"
                name="name"
                className="form-control"
                placeholder="e.g. Compiler, WebBrowser..."
                value={formData.name}
                onChange={handleChange}
                required
              />
            </div>
            <div className="form-row-2col">
              <div className="form-group">
                <label htmlFor="input-arrival">Arrival Time (ms)*</label>
                <input
                  type="number"
                  id="input-arrival"
                  name="arrival_time"
                  className="form-control"
                  min="0"
                  value={formData.arrival_time}
                  onChange={handleChange}
                  required
                />
              </div>
              <div className="form-group">
                <label htmlFor="input-burst">Burst Time (ms)*</label>
                <input
                  type="number"
                  id="input-burst"
                  name="burst_time"
                  className="form-control"
                  min="1"
                  value={formData.burst_time}
                  onChange={handleChange}
                  required
                />
              </div>
            </div>
            <div className="form-row-2col">
              <div className="form-group">
                <label htmlFor="input-priority">Priority (lower = higher priority)</label>
                <input
                  type="number"
                  id="input-priority"
                  name="priority"
                  className="form-control"
                  min="0"
                  value={formData.priority}
                  onChange={handleChange}
                />
              </div>
              <div className="form-group">
                <label htmlFor="input-memory">Memory Required (MB)</label>
                <input
                  type="number"
                  id="input-memory"
                  name="memory_required"
                  className="form-control"
                  min="0"
                  value={formData.memory_required}
                  onChange={handleChange}
                />
              </div>
            </div>

            <div className="margin-top-sm" style={{ borderTop: '1px solid var(--border-color)', paddingTop: '12px' }}>
              <label style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-muted)' }}>
                Maximum Resource Claims (Banker's Algorithm)
              </label>
              <div className="form-row-4col margin-top-sm">
                <div className="form-group">
                  <label htmlFor="input-max-cpu">CPU</label>
                  <input
                    type="number"
                    id="input-max-cpu"
                    name="max_cpu"
                    className="form-control"
                    min="0"
                    max="10"
                    value={formData.max_cpu}
                    onChange={handleChange}
                  />
                </div>
                <div className="form-group">
                  <label htmlFor="input-max-printer">Printer</label>
                  <input
                    type="number"
                    id="input-max-printer"
                    name="max_printer"
                    className="form-control"
                    min="0"
                    max="5"
                    value={formData.max_printer}
                    onChange={handleChange}
                  />
                </div>
                <div className="form-group">
                  <label htmlFor="input-max-disk">Disk</label>
                  <input
                    type="number"
                    id="input-max-disk"
                    name="max_disk"
                    className="form-control"
                    min="0"
                    max="7"
                    value={formData.max_disk}
                    onChange={handleChange}
                  />
                </div>
                <div className="form-group">
                  <label htmlFor="input-max-network">Network</label>
                  <input
                    type="number"
                    id="input-max-network"
                    name="max_network"
                    className="form-control"
                    min="0"
                    max="4"
                    value={formData.max_network}
                    onChange={handleChange}
                  />
                </div>
              </div>
            </div>
          </div>
          <div className="modal-footer">
            <button type="button" className="btn btn-secondary" id="btn-cancel-modal" onClick={onClose}>
              Cancel
            </button>
            <button type="submit" className="btn btn-primary">
              Create Process
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
