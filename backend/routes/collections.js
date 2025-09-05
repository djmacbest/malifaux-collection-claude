// ===== FILE 2: backend/routes/collections.js =====
// Copy this content and save as: backend/routes/collections.js (NEW FILE - replaces miniatures.js)

const express = require('express');
const { body, validationResult, param } = require('express-validator');
const UserCollection = require('../models/UserCollection');
const MasterMiniature = require('../models/MasterMiniature');
const { authenticateToken, optionalAuth } = require('../middleware/auth');

const router = express.Router();

// Validation rules
const collectionValidation = [
  body('master_miniature_id')
    .isInt()
    .withMessage('Master miniature ID must be a valid integer'),
  body('status')
    .optional()
    .isIn(['Painted', 'Painting in progress', 'Unpainted', 'Unassembled', 'Wishlist'])
    .withMessage('Status must be one of the valid options'),
  body('quantity')
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage('Quantity must be between 1 and 100'),
  body('notes')
    .optional()
    .isLength({ max: 1000 })
    .withMessage('Notes must be less than 1000 characters')
];

// Get authenticated user's collection
router.get('/my-collection', authenticateToken, async (req, res) => {
  try {
    const { status, faction, station } = req.query;
    
    const filters = {};
    if (status) filters.status = status;
    if (faction) filters.faction = faction;
    if (station) filters.station = station;

    const collection = await UserCollection.findByUserId(req.user.id, filters);
    res.json({ collection: collection.map(c => c.toJSON()) });
  } catch (error) {
    console.error('Get collection error:', error);
    res.status(500).json({ error: 'Error retrieving collection' });
  }
});

// Get collection statistics for authenticated user
router.get('/my-collection/stats', authenticateToken, async (req, res) => {
  try {
    const stats = await UserCollection.getCollectionStats(req.user.id);
    const factionBreakdown = await UserCollection.getFactionBreakdown(req.user.id);
    
    res.json({ 
      stats,
      faction_breakdown: factionBreakdown 
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
    const { status, faction, station } = req.query;
    
    const filters = {};
    if (status) filters.status = status;
    if (faction) filters.faction = faction;
    if (station) filters.station = station;

    const collection = await UserCollection.findByUserId(parseInt(userId), filters);
    const stats = await UserCollection.getCollectionStats(parseInt(userId));
    const factionBreakdown = await UserCollection.getFactionBreakdown(parseInt(userId));
    
    res.json({ 
      collection: collection.map(c => c.toJSON()),
      stats,
      faction_breakdown: factionBreakdown
    });
  } catch (error) {
    console.error('Get user collection error:', error);
    res.status(500).json({ error: 'Error retrieving user collection' });
  }
});

// Add miniature to collection
router.post('/', authenticateToken, collectionValidation, async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { master_miniature_id, status, quantity, notes, acquired_date } = req.body;

    // Check if miniature exists
    const miniature = await MasterMiniature.findById(master_miniature_id);
    if (!miniature) {
      return res.status(404).json({ error: 'Miniature not found' });
    }

    // Check if user already owns this miniature
    const alreadyOwns = await UserCollection.userOwns(req.user.id, master_miniature_id);
    if (alreadyOwns) {
      return res.status(409).json({ 
        error: 'You already have this miniature in your collection',
        suggestion: 'Would you like to update the existing entry instead?'
      });
    }

    const collectionData = {
      user_id: req.user.id,
      master_miniature_id,
      status: status || 'Unpainted',
      quantity: quantity || 1,
      notes,
      acquired_date
    };

    const collectionEntry = await UserCollection.create(collectionData);
    
    res.status(201).json({
      message: 'Miniature added to collection',
      collection_entry: collectionEntry.toJSON()
    });
  } catch (error) {
    console.error('Add to collection error:', error);
    if (error.message.includes('already have this miniature')) {
      res.status(409).json({ error: error.message });
    } else {
      res.status(500).json({ error: 'Error adding miniature to collection' });
    }
  }
});

// Update collection entry
router.put('/:id', authenticateToken, [
  param('id').isInt().withMessage('Collection ID must be a valid integer'),
  ...collectionValidation.slice(1) // Skip master_miniature_id validation for updates
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { id } = req.params;
    const collectionEntry = await UserCollection.findById(parseInt(id));
    
    if (!collectionEntry) {
      return res.status(404).json({ error: 'Collection entry not found' });
    }

    // Check ownership
    if (collectionEntry.user_id !== req.user.id) {
      return res.status(403).json({ error: 'Access denied - not your collection entry' });
    }

    const { status, quantity, notes, acquired_date } = req.body;
    const updatedEntry = await collectionEntry.update({ status, quantity, notes, acquired_date });
    
    res.json({
      message: 'Collection entry updated successfully',
      collection_entry: updatedEntry.toJSON()
    });
  } catch (error) {
    console.error('Update collection error:', error);
    res.status(500).json({ error: 'Error updating collection entry' });
  }
});

// Remove from collection
router.delete('/:id', authenticateToken, [
  param('id').isInt().withMessage('Collection ID must be a valid integer')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { id } = req.params;
    const collectionEntry = await UserCollection.findById(parseInt(id));
    
    if (!collectionEntry) {
      return res.status(404).json({ error: 'Collection entry not found' });
    }

    // Check ownership
    if (collectionEntry.user_id !== req.user.id) {
      return res.status(403).json({ error: 'Access denied - not your collection entry' });
    }

    const deleted = await collectionEntry.delete();
    
    if (deleted) {
      res.json({ message: 'Miniature removed from collection' });
    } else {
      res.status(500).json({ error: 'Error removing miniature' });
    }
  } catch (error) {
    console.error('Delete from collection error:', error);
    res.status(500).json({ error: 'Error removing miniature from collection' });
  }
});

module.exports = router;