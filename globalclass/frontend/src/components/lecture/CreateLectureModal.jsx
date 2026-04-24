import React, { useState } from 'react';
import api from '../../services/api';

export default function CreateLectureModal({ onClose, onCreated }) {
  const [form, setForm] = useState({ title: '', description: '', scheduled_at: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  function handleChange(e) {
    setForm({ ...form, [e.target.name]: e.target.value });
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const { data } = await api.post('/lectures', form);
      onCreated(data);
      onClose();
    } catch (err) {
      const data = err.response?.data;
      const msg = data?.hint
        ? `${data.error} — ${data.hint} (token role: "${data.actual}")`
        : data?.error || 'Failed to create lecture';
      setError(msg);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{
      position: 'fixed', inset: 0,
      background: 'rgba(0,0,0,0.5)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      zIndex: 1000,
    }}>
      <div style={{
        background: '#fff', borderRadius: 8,
        padding: 32, width: 480, maxWidth: '90vw',
        boxShadow: '0 8px 32px rgba(0,0,0,0.2)',
      }}>
        <h3 style={{ marginTop: 0 }}>Create New Lecture</h3>
        <form onSubmit={handleSubmit}>
          <label style={labelStyle}>Title</label>
          <input
            name="title"
            value={form.title}
            onChange={handleChange}
            placeholder="e.g. Introduction to Distributed Systems"
            required
            style={inputStyle}
          />

          <label style={labelStyle}>Description</label>
          <textarea
            name="description"
            value={form.description}
            onChange={handleChange}
            placeholder="Brief description of the lecture..."
            rows={3}
            style={{ ...inputStyle, resize: 'vertical' }}
          />

          <label style={labelStyle}>Scheduled At</label>
          <input
            name="scheduled_at"
            type="datetime-local"
            value={form.scheduled_at}
            onChange={handleChange}
            required
            style={inputStyle}
          />

          {error && <p style={{ color: '#e63946', margin: '8px 0' }}>{error}</p>}

          <div style={{ display: 'flex', gap: 12, marginTop: 20 }}>
            <button
              type="submit"
              disabled={loading}
              style={{
                flex: 1, padding: '10px 0',
                background: '#1a1a2e', color: '#fff',
                border: 'none', borderRadius: 4, cursor: 'pointer', fontSize: 14,
              }}
            >
              {loading ? 'Creating...' : 'Create Lecture'}
            </button>
            <button
              type="button"
              onClick={onClose}
              style={{
                flex: 1, padding: '10px 0',
                background: '#f1f1f1', color: '#333',
                border: 'none', borderRadius: 4, cursor: 'pointer', fontSize: 14,
              }}
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

const labelStyle = { display: 'block', fontSize: 13, fontWeight: 600, marginBottom: 4, color: '#444' };
const inputStyle = { display: 'block', width: '100%', padding: 8, marginBottom: 16, borderRadius: 4, border: '1px solid #ccc', fontSize: 14, boxSizing: 'border-box' };
