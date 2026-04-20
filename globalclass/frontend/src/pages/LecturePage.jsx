import React from 'react';
import { useParams } from 'react-router-dom';
import VideoPlayer from '../components/lecture/VideoPlayer';
import InstructorStream from '../components/lecture/InstructorStream';
import QuestionList from '../components/qa/QuestionList';
import InstructorQAView from '../components/qa/InstructorQAView';

export default function LecturePage() {
  const { id: lectureId } = useParams();
  const user = JSON.parse(localStorage.getItem('user') || '{}');
  const token = localStorage.getItem('token');

  return (
    <div style={{ display: 'flex', gap: 24, padding: 24, maxWidth: 1200, margin: '0 auto' }}>

      {/* Left: Video Panel — owned by: Team (streaming) */}
      <div style={{ flex: 2 }}>
        {user.role === 'instructor'
          ? <InstructorStream lectureId={lectureId} token={token} />
          : <VideoPlayer lectureId={lectureId} token={token} />
        }
      </div>

      {/* Right: Q&A Panel — owned by: Aayush */}
      <div style={{ flex: 1, borderLeft: '1px solid #eee', paddingLeft: 24 }}>
        <h3>Q&amp;A</h3>
        {user.role === 'instructor'
          ? <InstructorQAView lectureId={lectureId} token={token} />
          : <QuestionList lectureId={lectureId} token={token} user={user} />
        }
      </div>
    </div>
  );
}
