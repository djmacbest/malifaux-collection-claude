// ===== FILE 1: backend/routes/masterMiniatures.js =====
// Copy this content and save as: backend/routes/masterMiniatures.js (NEW FILE)

const express = require('express');
const { query, param, validationResult } = require('express-validator');
const MasterMiniature = require('../models/MasterMiniature');
const { optionalAuth } = require('../middleware/auth');

const router = express.Router();

// Get all master miniatures with filtering
router.get('/', optionalAuth, [
  query('faction').optional().isString(),
  query('station').optional().isString(),
  query('base_size').optional().isString(),
  query('keyword').optional().isString(),
  query('box_name').optional().isString(),
  query('search').optional().isString()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const filters = {
      faction: req.query.faction,
      station: req.query.station,
      base_size: req.query.base_size,
      keyword: req.query.keyword,
      box_name: req.query.box_name,
      search: req.query.search
    };

    // Remove empty filters
    Object.keys(filters).forEach(key => {
      if (!filters[key]) delete filters[key];
    });

    const miniatures = await MasterMiniature.findAll(filters);
    
    res.json({ 
      miniatures: miniatures.map(m => m.toJSON()),
      count: miniatures.length 
    });
  } catch (error) {
    console.error('Get master miniatures error:', error);
    res.status(500).json({ error: 'Error retrieving miniatures' });
  }
});

// Search miniatures (for typeahead)
router.get('/search', optionalAuth, [
  query('q').notEmpty().withMessage('Search query is required'),
  query('limit').optional().isInt({ min: 1, max: 50 }).withMessage('Limit must be between 1 and 50')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const query = req.query.q;
    const limit = parseInt(req.query.limit) || 10;

    const miniatures = await MasterMiniature.search(query, limit);
    
    res.json({ 
      miniatures: miniatures.map(m => ({
        id: m.id,
        model_name: m.model_name,
        variant_name: m.variant_name,
        display_name: m.variant_name || m.model_name,
        factions: m.factions,
        station: m.station,
        primary_image: m.official_images.find(img => img.is_primary) || null
      }))
    });
  } catch (error) {
    console.error('Search miniatures error:', error);
    res.status(500).json({ error: 'Error searching miniatures' });
  }
});

// Get single master miniature by ID
router.get('/:id', optionalAuth, [
  param('id').isInt().withMessage('Miniature ID must be a valid integer')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { id } = req.params;
    const miniature = await MasterMiniature.findById(parseInt(id));
    
    if (!miniature) {
      return res.status(404).json({ error: 'Miniature not found' });
    }

    // Get statistics
    const statistics = await miniature.getStatistics();

    res.json({ 
      miniature: miniature.toJSON(),
      statistics
    });
  } catch (error) {
    console.error('Get miniature error:', error);
    res.status(500).json({ error: 'Error retrieving miniature' });
  }
});

// Get filter options (factions, stations, keywords, etc.)
router.get('/filters/options', async (req, res) => {
  try {
    const [factions, stations, keywords, boxNames] = await Promise.all([
      MasterMiniature.getFactions(),
      MasterMiniature.getStations(),
      MasterMiniature.getKeywords(),
      MasterMiniature.getBoxNames()
    ]);

    res.json({
      factions,
      stations,
      keywords,
      box_names: boxNames,
      base_sizes: ['30mm', '40mm', '50mm']
    });
  } catch (error) {
    console.error('Get filter options error:', error);
    res.status(500).json({ error: 'Error retrieving filter options' });
  }
});

module.exports = router;