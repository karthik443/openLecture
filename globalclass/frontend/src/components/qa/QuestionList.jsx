// Q&A — Question List (Student view) — owned by: Aayush
import React, { useState } from 'react';
import PropTypes from 'prop-types';
import { useQAWebSocket } from '../../hooks/useWebSocket';
import QuestionInput from './QuestionInput';

export default function QuestionList({ lectureId, token, user }) {
  const [questions, setQuestions] = useState([]);

  const { send } = useQAWebSocket(lectureId, token, (msg) => {
    if (msg.type === 'QUESTIONS_UPDATE') setQuestions(msg.questions);
  });

  function vote(questionId) {
    send({ type: 'VOTE', questionId });
  }

  return (
    <div>
      <QuestionInput send={send} />
      {questions.map(q => (
        <div key={q.id} style={{
          padding: 12,
          marginBottom: 8,
          border: '1px solid #eee',
          borderRadius: 6,
          opacity: q.is_answered ? 0.5 : 1
        }}>
          <p style={{ margin: '0 0 6px' }}>{q.content}</p>
          <button onClick={() => vote(q.id)} style={{ fontSize: 12 }}>
            ▲ {q.vote_count}
          </button>
          {q.is_answered && <span style={{ marginLeft: 8, color: 'green', fontSize: 12 }}>✓ Answered</span>}
        </div>
      ))}
      {questions.length === 0 && <p style={{ color: '#888' }}>No questions yet.</p>}
    </div>
  );
}

QuestionList.propTypes = {
  lectureId: PropTypes.string.isRequired,
  token: PropTypes.string.isRequired,
  user: PropTypes.object,
};
