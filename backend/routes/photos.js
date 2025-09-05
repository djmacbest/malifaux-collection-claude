

// ===== FILE 3: backend/routes/photos.js =====
// Copy this content and save as: backend/routes/photos.js

const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { body, validationResult, param, query } = require('express-validator');
const Photo = require('../models/Photo');
const Comment = require('../models/Comment');
const { authenticateToken, optionalAuth } = require('../middleware/auth');

const router = express.Router();

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = 'uploads/photos';
    
    // Create directory if it doesn't exist
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    // Create unique filename
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const ext = path.extname(file.originalname);
    cb(null, file.fieldname + '-' + uniqueSuffix + ext);
  }
});

// File filter for images only
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
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB limit
  },
  fileFilter: fileFilter
});

// Get gallery photos (paginated, public)
router.get('/gallery', optionalAuth, [
  query('page').optional().isInt({ min: 1 }),
  query('limit').optional().isInt({ min: 1, max: 50 })
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

    const photos = await Photo.getGallery(limit, offset, viewer_user_id);
    
    res.json({
      photos,
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
      photo,
      comments 
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
    
    res.json({ photos });
  } catch (error) {
    console.error('Get user photos error:', error);
    res.status(500).json({ error: 'Error retrieving user photos' });
  }
});

// Upload new photo
router.post('/', authenticateToken, upload.single('image'), [
  body('caption')
    .optional()
    .isLength({ max: 500 })
    .withMessage('Caption must be less than 500 characters'),
  body('miniature_id')
    .optional()
    .isInt()
    .withMessage('Miniature ID must be a valid integer')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    if (!req.file) {
      return res.status(400).json({ error: 'Image file is required' });
    }

    const { caption, miniature_id } = req.body;
    const image_url = `/uploads/photos/${req.file.filename}`;

    const photoData = {
      user_id: req.user.id,
      miniature_id: miniature_id ? parseInt(miniature_id) : null,
      image_url,
      caption
    };

    const photo = await Photo.create(photoData);
    const fullPhoto = await Photo.findById(photo.id, req.user.id);
    
    res.status(201).json({
      message: 'Photo uploaded successfully',
      photo: fullPhoto
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
      comment
    });
  } catch (error) {
    console.error('Add comment error:', error);
    res.status(500).json({ error: 'Error adding comment' });
  }
});

// Get comments for a photo
router.get('/:id/comments', optionalAuth, [
  param('id').isInt().withMessage('Photo ID must be a valid integer')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { id } = req.params;
    const comments = await Comment.findByPhotoId(parseInt(id));
    
    res.json({ comments });
  } catch (error) {
    console.error('Get comments error:', error);
    res.status(500).json({ error: 'Error retrieving comments' });
  }
});

module.exports = router;