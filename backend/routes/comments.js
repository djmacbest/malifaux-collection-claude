

// ===== FILE 4: backend/routes/comments.js =====
// Copy this content and save as: backend/routes/comments.js

const express = require('express');
const { body, validationResult, param } = require('express-validator');
const Comment = require('../models/Comment');
const { authenticateToken, optionalAuth } = require('../middleware/auth');

const router = express.Router();

// Get single comment by ID
router.get('/:id', optionalAuth, [
  param('id').isInt().withMessage('Comment ID must be a valid integer')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { id } = req.params;
    const comment = await Comment.findById(parseInt(id));
    
    if (!comment) {
      return res.status(404).json({ error: 'Comment not found' });
    }

    res.json({ comment });
  } catch (error) {
    console.error('Get comment error:', error);
    res.status(500).json({ error: 'Error retrieving comment' });
  }
});

// Delete comment (owner only)
router.delete('/:id', authenticateToken, [
  param('id').isInt().withMessage('Comment ID must be a valid integer')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { id } = req.params;
    const comment = await Comment.findById(parseInt(id));
    
    if (!comment) {
      return res.status(404).json({ error: 'Comment not found' });
    }

    // Check ownership
    if (comment.user_id !== req.user.id) {
      return res.status(403).json({ error: 'Access denied - not your comment' });
    }

    const deleted = await comment.delete();
    
    if (deleted) {
      res.json({ message: 'Comment deleted successfully' });
    } else {
      res.status(500).json({ error: 'Error deleting comment' });
    }
  } catch (error) {
    console.error('Delete comment error:', error);
    res.status(500).json({ error: 'Error deleting comment' });
  }
});

module.exports = router;