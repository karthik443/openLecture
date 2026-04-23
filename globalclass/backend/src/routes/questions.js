// Q&A Routes
import express from 'express';
import { authenticate } from '../middleware/auth.js';
import qaService from '../services/qaService.js';

const router = express.Router({ mergeParams: true });

// GET /api/lectures/:id/questions — get ranked questions for a lecture
router.get('/:id/questions', authenticate, async (req, res) => {
  try {
    const questions = await qaService.getRankedQuestions(req.params.id);
    res.json(questions);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/lectures/:id/questions — submit a question
router.post('/:id/questions', authenticate, async (req, res) => {
  try {
    const question = await qaService.submitQuestion(
      req.params.id,
      req.user.id,
      req.body.content
    );
    res.status(201).json(question);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/lectures/:id/questions/:qid/vote — upvote a question
router.post('/:id/questions/:qid/vote', authenticate, async (req, res) => {
  try {
    const result = await qaService.voteQuestion(req.params.qid, req.user.id, req.params.id);
    res.json(result);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// PATCH /api/lectures/:id/questions/:qid/answer — mark as answered (instructor)
router.patch('/:id/questions/:qid/answer', authenticate, async (req, res) => {
  try {
    const result = await qaService.markAnswered(req.params.qid, req.params.id);
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
