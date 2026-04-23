import React from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import VideoPlayer from '../components/lecture/VideoPlayer';
import InstructorStream from '../components/lecture/InstructorStream';
import QuestionList from '../components/qa/QuestionList';
import InstructorQAView from '../components/qa/InstructorQAView';

export default function LecturePage() {
  const { id: lectureId } = useParams();
  const navigate = useNavigate();
  const user = JSON.parse(localStorage.getItem('user') || '{}');
  const token = localStorage.getItem('token');

  return (
    <div style={{ maxWidth: 1200, margin: '0 auto', padding: 24 }}>
      <button
        onClick={() => navigate('/catalog')}
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: 6,
          background: 'none',
          border: '1px solid #e5e7eb',
          borderRadius: 7,
          padding: '6px 14px',
          fontSize: 13,
          fontWeight: 500,
          color: '#374151',
          cursor: 'pointer',
          marginBottom: 20,
        }}
      >
        &#8592; Back to Catalog
      </button>
      <div style={{ display: 'flex', gap: 24 }}>

      {/* Left: Video Panel */}
      <div style={{ flex: 2 }}>
        {user.role === 'instructor'
          ? <InstructorStream lectureId={lectureId} token={token} />
          : <VideoPlayer lectureId={lectureId} token={token} />
        }
      </div>

      {/* Right: Q&A Panel */}
      <div style={{ flex: 1, borderLeft: '1px solid #eee', paddingLeft: 24 }}>
        <h3>Q&amp;A</h3>
        {user.role === 'instructor'
          ? <InstructorQAView lectureId={lectureId} token={token} />
          : <QuestionList lectureId={lectureId} token={token} user={user} />
        }
      </div>
      </div>
    </div>
  );
}
