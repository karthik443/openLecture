// Q&A — Question List (Student view)
import React, { useState } from 'react';
import PropTypes from 'prop-types';
import { useQAWebSocket } from '../../hooks/useWebSocket';
import QuestionInput from './QuestionInput';
import './qa.css';

export default function QuestionList({ lectureId, token, user }) {
  const [questions, setQuestions] = useState([]);
  const [voted, setVoted] = useState(new Set());

  const { send } = useQAWebSocket(lectureId, token, (msg) => {
    if (msg.type === 'QUESTIONS_UPDATE') setQuestions(msg.questions);
  });

  function vote(questionId) {
    if (voted.has(questionId)) return;
    send({ type: 'VOTE', questionId });
    setVoted(prev => new Set(prev).add(questionId));
  }

  return (
    <div className="qa-panel">
      <div className="qa-panel-header">
        <h3 className="qa-panel-title">Questions</h3>
        <span className="qa-live-badge">
          <span className="qa-live-dot" />{'Live'}
        </span>
      </div>

      <QuestionInput send={send} />

      <div className="qa-list">
        {questions.length === 0 ? (
          <div className="qa-empty">
            <div className="qa-empty-icon">💬</div>
            No questions yet. Be the first to ask!
          </div>
        ) : (
          questions.map(q => (
            <div key={q.id} className={`qa-card${q.is_answered ? ' is-answered' : ''}`}>
              <button
                className={`qa-vote-btn${voted.has(q.id) ? ' voted' : ''}`}
                onClick={() => vote(q.id)}
                title={voted.has(q.id) ? 'Already voted' : 'Upvote'}
                disabled={voted.has(q.id)}
              >
                <span className="qa-vote-arrow">▲</span>
                <span className="qa-vote-count">{q.vote_count}</span>
              </button>
              <div className="qa-card-body">
                <p className="qa-card-content">{q.content}</p>
                <div className="qa-card-meta">
                  {q.is_answered && (
                    <span className="qa-answered-badge">✓ Answered</span>
                  )}
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

QuestionList.propTypes = {
  lectureId: PropTypes.string.isRequired,
  token: PropTypes.string.isRequired,
  user: PropTypes.object,
};
