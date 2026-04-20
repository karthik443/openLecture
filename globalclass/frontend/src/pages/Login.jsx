import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import api from '../services/api';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const navigate = useNavigate();

  async function handleSubmit(e) {
    e.preventDefault();
    try {
      const { data } = await api.post('/auth/login', { email, password });
      localStorage.setItem('token', data.token);
      localStorage.setItem('user', JSON.stringify(data.user));
      navigate('/catalog');
    } catch {
      setError('Invalid email or password');
    }
  }

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f8f9fa' }}>
      <div style={{ background: '#fff', padding: 36, borderRadius: 10, width: 400, boxShadow: '0 4px 20px rgba(0,0,0,0.1)' }}>
        <h2 style={{ margin: '0 0 6px', color: '#1a1a2e' }}>Welcome Back</h2>
        <p style={{ margin: '0 0 24px', color: '#888', fontSize: 14 }}>Login to GlobalClass</p>

        <form onSubmit={handleSubmit}>
          <label style={labelStyle}>Email</label>
          <input
            type="email"
            placeholder="you@university.edu"
            value={email}
            onChange={e => setEmail(e.target.value)}
            required
            style={inputStyle}
          />
          <label style={labelStyle}>Password</label>
          <input
            type="password"
            placeholder="Your password"
            value={password}
            onChange={e => setPassword(e.target.value)}
            required
            style={inputStyle}
          />
          {error && <p style={{ color: '#e63946', fontSize: 13, margin: '0 0 12px' }}>{error}</p>}
          <button
            type="submit"
            style={{
              width: '100%', padding: '11px 0',
              background: '#1a1a2e', color: '#fff',
              border: 'none', borderRadius: 6,
              cursor: 'pointer', fontSize: 15, fontWeight: 600,
            }}
          >
            Login
          </button>
        </form>

        <p style={{ textAlign: 'center', marginTop: 20, fontSize: 14, color: '#666' }}>
          Don't have an account?{' '}
          <Link to="/register" style={{ color: '#1a1a2e', fontWeight: 600 }}>Register</Link>
        </p>
      </div>
    </div>
  );
}

const labelStyle = { display: 'block', fontSize: 13, fontWeight: 600, marginBottom: 4, color: '#444' };
const inputStyle = {
  display: 'block', width: '100%', padding: '9px 10px',
  marginBottom: 16, borderRadius: 6, border: '1px solid #ddd',
  fontSize: 14, boxSizing: 'border-box',
};
