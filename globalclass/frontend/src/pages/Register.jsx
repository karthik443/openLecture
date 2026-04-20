import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import api from '../services/api';

export default function Register() {
  const [form, setForm] = useState({ name: '', email: '', password: '', role: 'student', institution: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  function handleChange(e) {
    setForm({ ...form, [e.target.name]: e.target.value });
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      await api.post('/auth/register', form);
      navigate('/login');
    } catch (err) {
      setError(err.response?.data?.error || 'Registration failed');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f8f9fa' }}>
      <div style={{ background: '#fff', padding: 36, borderRadius: 10, width: 420, boxShadow: '0 4px 20px rgba(0,0,0,0.1)' }}>
        <h2 style={{ margin: '0 0 6px', color: '#1a1a2e' }}>Create Account</h2>
        <p style={{ margin: '0 0 24px', color: '#888', fontSize: 14 }}>Join GlobalClass today</p>

        <form onSubmit={handleSubmit}>
          <label style={labelStyle}>Full Name</label>
          <input
            name="name"
            value={form.name}
            onChange={handleChange}
            placeholder="Your full name"
            required
            style={inputStyle}
          />

          <label style={labelStyle}>Email</label>
          <input
            name="email"
            type="email"
            value={form.email}
            onChange={handleChange}
            placeholder="you@university.edu"
            required
            style={inputStyle}
          />

          <label style={labelStyle}>Password</label>
          <input
            name="password"
            type="password"
            value={form.password}
            onChange={handleChange}
            placeholder="Min 6 characters"
            minLength={6}
            required
            style={inputStyle}
          />

          <label style={labelStyle}>Institution</label>
          <input
            name="institution"
            value={form.institution}
            onChange={handleChange}
            placeholder="e.g. MIT, Stanford, IIT Delhi"
            required
            style={inputStyle}
          />

          <label style={labelStyle}>I am joining as</label>
          <div style={{ display: 'flex', gap: 12, marginBottom: 20 }}>
            {['student', 'instructor'].map(role => (
              <button
                key={role}
                type="button"
                onClick={() => setForm({ ...form, role })}
                style={{
                  flex: 1, padding: '10px 0',
                  borderRadius: 6,
                  border: `2px solid ${form.role === role ? '#1a1a2e' : '#ddd'}`,
                  background: form.role === role ? '#1a1a2e' : '#fff',
                  color: form.role === role ? '#fff' : '#555',
                  cursor: 'pointer', fontSize: 14, fontWeight: 600,
                  textTransform: 'capitalize', transition: 'all 0.15s',
                }}
              >
                {role === 'student' ? '🎓 Student' : '🏫 Instructor'}
              </button>
            ))}
          </div>

          {error && <p style={{ color: '#e63946', fontSize: 13, margin: '0 0 12px' }}>{error}</p>}

          <button
            type="submit"
            disabled={loading}
            style={{
              width: '100%', padding: '11px 0',
              background: '#1a1a2e', color: '#fff',
              border: 'none', borderRadius: 6,
              cursor: 'pointer', fontSize: 15, fontWeight: 600,
            }}
          >
            {loading ? 'Creating account...' : 'Register'}
          </button>
        </form>

        <p style={{ textAlign: 'center', marginTop: 20, fontSize: 14, color: '#666' }}>
          Already have an account?{' '}
          <Link to="/login" style={{ color: '#1a1a2e', fontWeight: 600 }}>Login</Link>
        </p>
      </div>
    </div>
  );
}

const labelStyle = { display: 'block', fontSize: 13, fontWeight: 600, marginBottom: 4, color: '#444' };
const inputStyle = {
  display: 'block', width: '100%', padding: '9px 10px',
  marginBottom: 16, borderRadius: 6, border: '1px solid #ddd',
  fontSize: 14, boxSizing: 'border-box', outline: 'none',
};
