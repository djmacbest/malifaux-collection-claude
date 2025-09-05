

// ===== FILE 2: backend/routes/miniatures.js =====
// Copy this content and save as: backend/routes/miniatures.js

const express = require('express');
const { body, validationResult, param } = require('express-validator');
const Miniature = require('../models/Miniature');
const { authenticateToken, optionalAuth } = require('../middleware/auth');

const router = express.Router();

// Validation rules
const miniatureValidation = [
  body('name')
    .notEmpty()
    .withMessage('Miniature name is required')
    .isLength({ max: 100 })
    .withMessage('Name must be less than 100 characters'),
  body('faction')
    .notEmpty()
    .withMessage('Faction is required')
    .isLength({ max: 50 })
    .withMessage('Faction must be less than 50 characters'),
  body('status')
    .optional()
    .isIn(['unpainted', 'in_progress', 'painted'])
    .withMessage('Status must be unpainted, in_progress, or painted'),
  body('notes')
    .optional()
    .isLength({ max: 1000 })
    .withMessage('Notes must be less than 1000 characters')
];

// Get all miniatures for authenticated user
router.get('/my-collection', authenticateToken, async (req, res) => {
  try {
    const miniatures = await Miniature.findByUserId(req.user.id);
    res.json({ miniatures });
  } catch (error) {
    console.error('Get collection error:', error);
    res.status(500).json({ error: 'Error retrieving collection' });
  }
});

// Get collection statistics for authenticated user
router.get('/my-collection/stats', authenticateToken, async (req, res) => {
  try {
    const stats = await Miniature.getCollectionStats(req.user.id);
    const factionBreakdown = await Miniature.getFactionBreakdown(req.user.id);
    
    res.json({ 
      stats,
      factionBreakdown 
    });
  } catch (error) {
    console.error('Get collection stats error:', error);
    res.status(500).json({ error: 'Error retrieving collection statistics' });
  }
});

// Get user's collection (public view)
router.get('/user/:userId', optionalAuth, [
  param('userId').isInt().withMessage('User ID must be a valid integer')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { userId } = req.params;
    const miniatures = await Miniature.findByUserId(parseInt(userId));
    const stats = await Miniature.getCollectionStats(parseInt(userId));
    const factionBreakdown = await Miniature.getFactionBreakdown(parseInt(userId));
    
    res.json({ 
      miniatures,
      stats,
      factionBreakdown
    });
  } catch (error) {
    console.error('Get user collection error:', error);
    res.status(500).json({ error: 'Error retrieving user collection' });
  }
});

// Create new miniature
router.post('/', authenticateToken, miniatureValidation, async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { name, faction, status, notes } = req.body;
    const miniatureData = {
      user_id: req.user.id,
      name,
      faction,
      status: status || 'unpainted',
      notes
    };

    const miniature = await Miniature.create(miniatureData);
    
    res.status(201).json({
      message: 'Miniature added to collection',
      miniature
    });
  } catch (error) {
    console.error('Create miniature error:', error);
    res.status(500).json({ error: 'Error adding miniature to collection' });
  }
});

// Update miniature
router.put('/:id', authenticateToken, [
  param('id').isInt().withMessage('Miniature ID must be a valid integer'),
  ...miniatureValidation
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { id } = req.params;
    const miniature = await Miniature.findById(parseInt(id));
    
    if (!miniature) {
      return res.status(404).json({ error: 'Miniature not found' });
    }

    // Check ownership
    if (miniature.user_id !== req.user.id) {
      return res.status(403).json({ error: 'Access denied - not your miniature' });
    }

    const { name, faction, status, notes } = req.body;
    const updatedMiniature = await miniature.update({ name, faction, status, notes });
    
    res.json({
      message: 'Miniature updated successfully',
      miniature: updatedMiniature
    });
  } catch (error) {
    console.error('Update miniature error:', error);
    res.status(500).json({ error: 'Error updating miniature' });
  }
});

// Delete miniature
router.delete('/:id', authenticateToken, [
  param('id').isInt().withMessage('Miniature ID must be a valid integer')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { id } = req.params;
    const miniature = await Miniature.findById(parseInt(id));
    
    if (!miniature) {
      return res.status(404).json({ error: 'Miniature not found' });
    }

    // Check ownership
    if (miniature.user_id !== req.user.id) {
      return res.status(403).json({ error: 'Access denied - not your miniature' });
    }

    const deleted = await miniature.delete();
    
    if (deleted) {
      res.json({ message: 'Miniature removed from collection' });
    } else {
      res.status(500).json({ error: 'Error removing miniature' });
    }
  } catch (error) {
    console.error('Delete miniature error:', error);
    res.status(500).json({ error: 'Error removing miniature from collection' });
  }
});

module.exports = router;