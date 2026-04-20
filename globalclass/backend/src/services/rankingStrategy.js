// Strategy Pattern — pluggable question ranking algorithms

const byVotes = (questions) =>
  [...questions].sort((a, b) => b.vote_count - a.vote_count);

const byRecency = (questions) =>
  [...questions].sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

const byVotesThenRecency = (questions) =>
  [...questions].sort((a, b) => {
    if (b.vote_count !== a.vote_count) return b.vote_count - a.vote_count;
    return new Date(b.created_at) - new Date(a.created_at);
  });

const strategies = {
  votes: byVotes,
  recency: byRecency,
  default: byVotesThenRecency,
};

function rank(questions, strategy = 'default') {
  const fn = strategies[strategy] || strategies.default;
  return fn(questions);
}

module.exports = { rank };
