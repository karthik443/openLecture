// Q&A — Question Input (Student) — owned by: Aayush
import React, { useState } from 'react';

export default function QuestionInput({ send }) {
  const [content, setContent] = useState('');

  function handleSubmit(e) {
    e.preventDefault();
    if (!content.trim()) return;
    send({ type: 'SUBMIT_QUESTION', content });
    setContent('');
  }

  return (
    <form onSubmit={handleSubmit} style={{ marginBottom: 16 }}>
      <input
        value={content}
        onChange={e => setContent(e.target.value)}
        placeholder="Ask a question..."
        style={{ width: '100%', padding: 8, marginBottom: 8 }}
      />
      <button type="submit" style={{ width: '100%' }}>Submit Question</button>
    </form>
  );
}
