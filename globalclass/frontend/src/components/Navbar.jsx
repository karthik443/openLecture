import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';

export default function Navbar() {
  const navigate = useNavigate();
  const location = useLocation();
  const user = JSON.parse(localStorage.getItem('user') || '{}');

  if (location.pathname === '/login') return null;

  function logout() {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    navigate('/login');
  }

  return (
    <nav style={{
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      padding: '12px 24px',
      background: '#1a1a2e',
      color: '#fff',
    }}>
      <span
        onClick={() => navigate('/catalog')}
        style={{ fontWeight: 700, fontSize: 18, cursor: 'pointer' }}
      >
        GlobalClass
      </span>
      <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
        <span style={{ fontSize: 14, color: '#ccc' }}>
          {user.name} · <span style={{ textTransform: 'capitalize' }}>{user.role}</span>
        </span>
        <button
          onClick={logout}
          style={{
            padding: '6px 14px',
            background: '#e63946',
            color: '#fff',
            border: 'none',
            borderRadius: 4,
            cursor: 'pointer',
            fontSize: 13,
          }}
        >
          Logout
        </button>
      </div>
    </nav>
  );
}
