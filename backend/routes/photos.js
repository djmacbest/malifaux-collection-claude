// ===== FILE 3: backend/routes/photos.js =====
// REPLACE your existing photos.js with this updated version

const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { body, validationResult, param, query } = require('express-validator');
const Photo = require('../models/Photo');
const Comment = require('../models/Comment');
const MasterMiniature = require('../models/MasterMiniature');
const { authenticateToken, optionalAuth } = require('../middleware/auth');

const router = express.Router();

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = 'uploads/photos';
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const ext = path.extname(file.originalname);
    cb(null, file.fieldname + '-' + uniqueSuffix + ext);
  }
});

const fileFilter = (req, file, cb) => {
  const allowedTypes = /jpeg|jpg|png|webp/;
  const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
  const mimetype = allowedTypes.test(file.mimetype);
  
  if (mimetype && extname) {
    return cb(null, true);
  } else {
    cb(new Error('Only image files (JPEG, PNG, WebP) are allowed'));
  }
};

const upload = multer({
  storage: storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
  fileFilter: fileFilter
});

// Get gallery photos (paginated, public)
router.get('/gallery', optionalAuth, [
  query('page').optional().isInt({ min: 1 }),
  query('limit').optional().isInt({ min: 1, max: 50 }),
  query('painting_status').optional().isIn(['Painted', 'Painting progress']),
  query('is_crew_picture').optional().isBoolean(),
  query('faction').optional().isString(),
  query('master_miniature_id').optional().isInt()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const offset = (page - 1) * limit;
    const viewer_user_id = req.user ? req.user.id : null;

    const filters = {};
    if (req.query.painting_status) filters.painting_status = req.query.painting_status;
    if (req.query.is_crew_picture !== undefined) filters.is_crew_picture = req.query.is_crew_picture === 'true';
    if (req.query.faction) filters.faction = req.query.faction;
    if (req.query.master_miniature_id) filters.master_miniature_id = parseInt(req.query.master_miniature_id);

    const photos = await Photo.getGallery(limit, offset, viewer_user_id, filters);
    
    res.json({
      photos: photos.map(p => p.toJSON()),
      pagination: {
        page,
        limit,
        hasMore: photos.length === limit
      }
    });
  } catch (error) {
    console.error('Get gallery error:', error);
    res.status(500).json({ error: 'Error retrieving gallery photos' });
  }
});

// Get single photo by ID
router.get('/:id', optionalAuth, [
  param('id').isInt().withMessage('Photo ID must be a valid integer')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { id } = req.params;
    const viewer_user_id = req.user ? req.user.id : null;
    const photo = await Photo.findById(parseInt(id), viewer_user_id);
    
    if (!photo) {
      return res.status(404).json({ error: 'Photo not found' });
    }

    // Get comments for this photo
    const comments = await Comment.findByPhotoId(parseInt(id));

    res.json({ 
      photo: photo.toJSON(),
      comments: comments.map(c => c.toJSON())
    });
  } catch (error) {
    console.error('Get photo error:', error);
    res.status(500).json({ error: 'Error retrieving photo' });
  }
});

// Get photos by user ID
router.get('/user/:userId', optionalAuth, [
  param('userId').isInt().withMessage('User ID must be a valid integer')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { userId } = req.params;
    const viewer_user_id = req.user ? req.user.id : null;
    const photos = await Photo.findByUserId(parseInt(userId), viewer_user_id);
    
    res.json({ photos: photos.map(p => p.toJSON()) });
  } catch (error) {
    console.error('Get user photos error:', error);
    res.status(500).json({ error: 'Error retrieving user photos' });
  }
});

// Get photos by master miniature ID
router.get('/miniature/:miniatureId', optionalAuth, [
  param('miniatureId').isInt().withMessage('Miniature ID must be a valid integer'),
  query('painting_status').optional().isIn(['Painted', 'Painting progress']),
  query('individual_only').optional().isBoolean()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { miniatureId } = req.params;
    const viewer_user_id = req.user ? req.user.id : null;
    
    const filters = {};
    if (req.query.painting_status) filters.painting_status = req.query.painting_status;
    if (req.query.individual_only === 'true') filters.is_crew_picture = false;

    const photos = await Photo.findByMasterMiniatureId(parseInt(miniatureId), viewer_user_id, filters);
    
    res.json({ photos: photos.map(p => p.toJSON()) });
  } catch (error) {
    console.error('Get miniature photos error:', error);
    res.status(500).json({ error: 'Error retrieving miniature photos' });
  }
});

// Upload new photo
router.post('/', authenticateToken, upload.single('image'), [
  body('miniature_ids')
    .notEmpty()
    .withMessage('At least one miniature ID is required')
    .custom((value) => {
      const ids = Array.isArray(value) ? value : [value];
      return ids.every(id => Number.isInteger(parseInt(id)));
    })
    .withMessage('All miniature IDs must be valid integers'),
  body('caption')
    .optional()
    .isLength({ max: 500 })
    .withMessage('Caption must be less than 500 characters'),
  body('painting_status')
    .optional()
    .isIn(['Painted', 'Painting progress'])
    .withMessage('Painting status must be Painted or Painting progress')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    if (!req.file) {
      return res.status(400).json({ error: 'Image file is required' });
    }

    const { caption, painting_status } = req.body;
    let miniature_ids = req.body.miniature_ids;

    // Handle both single ID and array of IDs
    if (!Array.isArray(miniature_ids)) {
      miniature_ids = [miniature_ids];
    }
    miniature_ids = miniature_ids.map(id => parseInt(id));

    // Verify all miniatures exist
    for (const id of miniature_ids) {
      const miniature = await MasterMiniature.findById(id);
      if (!miniature) {
        return res.status(404).json({ error: `Miniature with ID ${id} not found` });
      }
    }

    const image_url = `/uploads/photos/${req.file.filename}`;

    const photoData = {
      user_id: req.user.id,
      miniature_ids,
      image_url,
      caption,
      painting_status: painting_status || 'Painted'
    };

    const photo = await Photo.create(photoData);
    
    res.status(201).json({
      message: 'Photo uploaded successfully',
      photo: photo.toJSON()
    });
  } catch (error) {
    console.error('Upload photo error:', error);
    
    // Clean up uploaded file if database operation failed
    if (req.file) {
      try {
        fs.unlinkSync(req.file.path);
      } catch (unlinkError) {
        console.error('Error cleaning up file:', unlinkError);
      }
    }
    
    res.status(500).json({ error: 'Error uploading photo' });
  }
});

// Like/unlike photo
router.post('/:id/like', authenticateToken, [
  param('id').isInt().withMessage('Photo ID must be a valid integer')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { id } = req.params;
    const photo = await Photo.findById(parseInt(id));
    
    if (!photo) {
      return res.status(404).json({ error: 'Photo not found' });
    }

    const result = await Photo.toggleLike(parseInt(id), req.user.id);
    
    res.json({
      message: result.liked ? 'Photo liked' : 'Photo unliked',
      liked: result.liked
    });
  } catch (error) {
    console.error('Toggle like error:', error);
    res.status(500).json({ error: 'Error toggling like' });
  }
});

// Add comment to photo
router.post('/:id/comments', authenticateToken, [
  param('id').isInt().withMessage('Photo ID must be a valid integer'),
  body('content')
    .notEmpty()
    .withMessage('Comment content is required')
    .isLength({ max: 1000 })
    .withMessage('Comment must be less than 1000 characters')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { id } = req.params;
    const { content } = req.body;
    
    const photo = await Photo.findById(parseInt(id));
    if (!photo) {
      return res.status(404).json({ error: 'Photo not found' });
    }

    const comment = await Comment.create({
      user_id: req.user.id,
      photo_id: parseInt(id),
      content
    });
    
    res.status(201).json({
      message: 'Comment added successfully',
      comment: comment.toJSON()
    });
  } catch (error) {
    console.error('Add comment error:', error);
    res.status(500).json({ error: 'Error adding comment' });
  }
});

// Delete photo (owner only)
router.delete('/:id', authenticateToken, [
  param('id').isInt().withMessage('Photo ID must be a valid integer')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { id } = req.params;
    const photo = await Photo.findById(parseInt(id));
    
    if (!photo) {
      return res.status(404).json({ error: 'Photo not found' });
    }

    // Check ownership
    if (photo.user_id !== req.user.id) {
      return res.status(403).json({ error: 'Access denied - not your photo' });
    }

    // Delete the actual file
    const filePath = path.join(__dirname, '..', photo.image_url);
    try {
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
    } catch (fileError) {
      console.error('Error deleting file:', fileError);
    }

    const deleted = await photo.delete();
    
    if (deleted) {
      res.json({ message: 'Photo deleted successfully' });
    } else {
      res.status(500).json({ error: 'Error deleting photo' });
    }
  } catch (error) {
    console.error('Delete photo error:', error);
    res.status(500).json({ error: 'Error deleting photo' });
  }
});

module.exports = router;