import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';
import CreateLectureModal from '../components/lecture/CreateLectureModal';

const STATUS_COLORS = { scheduled: '#f4a261', live: '#2a9d8f', ended: '#aaa' };

export default function CourseCatalog() {
  const [lectures, setLectures] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const navigate = useNavigate();
  const user = JSON.parse(localStorage.getItem('user') || '{}');

  useEffect(() => {
    api.get('/lectures').then(r => setLectures(r.data));
  }, []);

  async function enroll(lectureId) {
    try {
      await api.post(`/lectures/${lectureId}/enroll`);
      alert('Enrolled successfully!');
      setLectures(prev => prev.map(l => l.id === lectureId ? { ...l, is_enrolled: true } : l));
    } catch (err) {
      alert(err.response?.data?.error || 'Enrollment failed');
    }
  }

  async function goLive(lectureId) {
    await api.patch(`/lectures/${lectureId}/status`, { status: 'live' });
    setLectures(prev => prev.map(l => l.id === lectureId ? { ...l, status: 'live' } : l));
  }

  async function endLecture(lectureId) {
    // Update lecture status in core-api
    await api.patch(`/lectures/${lectureId}/status`, { status: 'ended' });
    // Tell streaming-engine to close the LiveKit room (best effort)
    try { await api.post(`/stream/end/${lectureId}`); } catch { /* ignore */ }
    setLectures(prev => prev.map(l => l.id === lectureId ? { ...l, status: 'ended' } : l));
  }

  function handleCreated(newLecture) {
    setLectures(prev => [newLecture, ...prev]);
  }

  return (
    <div style={{ maxWidth: 800, margin: '40px auto', padding: 24 }}>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <h2 style={{ margin: 0 }}>Course Catalog</h2>
        {user.role === 'instructor' && (
          <button
            onClick={() => setShowModal(true)}
            style={{
              padding: '10px 20px', background: '#1a1a2e',
              color: '#fff', border: 'none', borderRadius: 4,
              cursor: 'pointer', fontSize: 14,
            }}
          >
            + Create Lecture
          </button>
        )}
      </div>

      {lectures.length === 0 && (
        <p style={{ color: '#888', textAlign: 'center', marginTop: 60 }}>
          No lectures yet.{user.role === 'instructor' ? ' Create one above.' : ''}
        </p>
      )}

      {lectures.map(l => (
        <div key={l.id} style={{
          border: '1px solid #e0e0e0', padding: 20,
          marginBottom: 12, borderRadius: 8,
          boxShadow: '0 1px 4px rgba(0,0,0,0.06)',
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <h3 style={{ margin: '0 0 6px' }}>{l.title}</h3>
            <span style={{
              padding: '3px 10px', borderRadius: 12, fontSize: 12,
              background: STATUS_COLORS[l.status] + '22',
              color: STATUS_COLORS[l.status],
              fontWeight: 600, textTransform: 'capitalize',
            }}>
              {l.status}
            </span>
          </div>
          <p style={{ margin: '0 0 8px', color: '#555', fontSize: 14 }}>{l.description}</p>
          <p style={{ margin: '0 0 12px', fontSize: 13, color: '#888' }}>
            <strong>Instructor:</strong> {l.instructor_name} — {l.institution}
            {l.scheduled_at && (
              <> &nbsp;·&nbsp; <strong>Scheduled:</strong> {new Date(l.scheduled_at).toLocaleString()}</>
            )}
          </p>

          <div style={{ display: 'flex', gap: 8 }}>
            {user.role === 'student' && l.status !== 'ended' && !l.is_enrolled && (
              <button onClick={() => enroll(l.id)} style={btnStyle('#457b9d')}>Enroll</button>
            )}
            {user.role === 'student' && l.is_enrolled && l.status !== 'live' && l.status !== 'ended' && (
              <span style={{ padding: '6px 14px', background: '#e0e0e0', color: '#555', borderRadius: 4, fontSize: 13, border: 'none' }}>Enrolled</span>
            )}
            {l.status === 'live' && (user.role === 'instructor' || l.is_enrolled) && (
              <button onClick={() => navigate(`/lecture/${l.id}`)} style={btnStyle('#2a9d8f')}>Join Live</button>
            )}
            {user.role === 'instructor' && l.status === 'scheduled' && (
              <button onClick={() => goLive(l.id)} style={btnStyle('#2a9d8f')}>Go Live</button>
            )}
            {user.role === 'instructor' && l.status === 'live' && (
              <>
                <button onClick={() => navigate(`/lecture/${l.id}`)} style={btnStyle('#457b9d')}>Open Room</button>
                <button onClick={() => endLecture(l.id)} style={btnStyle('#e63946')}>End Lecture</button>
              </>
            )}
          </div>
        </div>
      ))}

      {showModal && (
        <CreateLectureModal
          onClose={() => setShowModal(false)}
          onCreated={handleCreated}
        />
      )}
    </div>
  );
}

const btnStyle = (bg) => ({
  padding: '6px 14px', background: bg, color: '#fff',
  border: 'none', borderRadius: 4, cursor: 'pointer', fontSize: 13,
});
