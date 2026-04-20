// Q&A — Instructor View — owned by: Aayush
import React, { useState } from 'react';
import { useQAWebSocket } from '../../hooks/useWebSocket';

export default function InstructorQAView({ lectureId, token }) {
  const [questions, setQuestions] = useState([]);

  const { send } = useQAWebSocket(lectureId, token, (msg) => {
    if (msg.type === 'QUESTIONS_UPDATE') setQuestions(msg.questions);
  });

  function markAnswered(questionId) {
    send({ type: 'MARK_ANSWERED', questionId });
  }

  const unanswered = questions.filter(q => !q.is_answered);

  return (
    <div>
      <p style={{ color: '#666', fontSize: 13 }}>{unanswered.length} unanswered question(s)</p>
      {questions.map(q => (
        <div key={q.id} style={{
          padding: 12,
          marginBottom: 8,
          border: `1px solid ${q.is_answered ? '#c3e6cb' : '#eee'}`,
          borderRadius: 6,
          background: q.is_answered ? '#f0fff4' : '#fff'
        }}>
          <p style={{ margin: '0 0 6px', fontWeight: 500 }}>{q.content}</p>
          <span style={{ fontSize: 12, color: '#666' }}>▲ {q.vote_count} votes</span>
          {!q.is_answered && (
            <button onClick={() => markAnswered(q.id)} style={{ marginLeft: 12, fontSize: 12 }}>
              Mark Answered
            </button>
          )}
          {q.is_answered && <span style={{ marginLeft: 8, color: 'green', fontSize: 12 }}>✓ Answered</span>}
        </div>
      ))}
      {questions.length === 0 && <p style={{ color: '#888' }}>No questions yet.</p>}
    </div>
  );
}
