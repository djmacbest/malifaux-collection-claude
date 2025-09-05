

// ===== FILE 3: backend/models/Photo.js =====
// Copy this content and save as: backend/models/Photo.js

const { dbHelpers } = require('../db/database');

class Photo {
  constructor(data) {
    this.id = data.id;
    this.user_id = data.user_id;
    this.miniature_id = data.miniature_id;
    this.image_url = data.image_url;
    this.caption = data.caption;
    this.created_at = data.created_at;
    
    // Additional fields from joins
    this.username = data.username;
    this.avatar_url = data.avatar_url;
    this.miniature_name = data.miniature_name;
    this.likes_count = data.likes_count || 0;
    this.comments_count = data.comments_count || 0;
    this.user_liked = data.user_liked || false;
  }

  // Create a new photo
  static async create(photoData) {
    const { user_id, miniature_id, image_url, caption = null } = photoData;
    
    const sql = `
      INSERT INTO photos (user_id, miniature_id, image_url, caption)
      VALUES (?, ?, ?, ?)
    `;
    
    try {
      const result = await dbHelpers.run(sql, [user_id, miniature_id, image_url, caption]);
      return await Photo.findById(result.id);
    } catch (error) {
      throw new Error(`Error creating photo: ${error.message}`);
    }
  }

  // Find photo by ID with user details
  static async findById(id, viewer_user_id = null) {
    const sql = `
      SELECT 
        p.*,
        u.username,
        u.avatar_url,
        m.name as miniature_name,
        COUNT(DISTINCT l.id) as likes_count,
        COUNT(DISTINCT c.id) as comments_count,
        CASE WHEN ul.id IS NOT NULL THEN 1 ELSE 0 END as user_liked
      FROM photos p
      JOIN users u ON p.user_id = u.id
      LEFT JOIN miniatures m ON p.miniature_id = m.id
      LEFT JOIN likes l ON p.id = l.photo_id
      LEFT JOIN comments c ON p.id = c.photo_id
      LEFT JOIN likes ul ON p.id = ul.photo_id AND ul.user_id = ?
      WHERE p.id = ?
      GROUP BY p.id
    `;
    
    try {
      const row = await dbHelpers.get(sql, [viewer_user_id, id]);
      return row ? new Photo(row) : null;
    } catch (error) {
      throw new Error(`Error finding photo by ID: ${error.message}`);
    }
  }

  // Get all photos for gallery
  static async getGallery(limit = 20, offset = 0, viewer_user_id = null) {
    const sql = `
      SELECT 
        p.*,
        u.username,
        u.avatar_url,
        m.name as miniature_name,
        COUNT(DISTINCT l.id) as likes_count,
        COUNT(DISTINCT c.id) as comments_count,
        CASE WHEN ul.id IS NOT NULL THEN 1 ELSE 0 END as user_liked
      FROM photos p
      JOIN users u ON p.user_id = u.id
      LEFT JOIN miniatures m ON p.miniature_id = m.id
      LEFT JOIN likes l ON p.id = l.photo_id
      LEFT JOIN comments c ON p.id = c.photo_id
      LEFT JOIN likes ul ON p.id = ul.photo_id AND ul.user_id = ?
      GROUP BY p.id
      ORDER BY p.created_at DESC
      LIMIT ? OFFSET ?
    `;
    
    try {
      const rows = await dbHelpers.all(sql, [viewer_user_id, limit, offset]);
      return rows.map(row => new Photo(row));
    } catch (error) {
      throw new Error(`Error getting gallery photos: ${error.message}`);
    }
  }

  // Get photos by user ID
  static async findByUserId(user_id, viewer_user_id = null) {
    const sql = `
      SELECT 
        p.*,
        u.username,
        u.avatar_url,
        m.name as miniature_name,
        COUNT(DISTINCT l.id) as likes_count,
        COUNT(DISTINCT c.id) as comments_count,
        CASE WHEN ul.id IS NOT NULL THEN 1 ELSE 0 END as user_liked
      FROM photos p
      JOIN users u ON p.user_id = u.id
      LEFT JOIN miniatures m ON p.miniature_id = m.id
      LEFT JOIN likes l ON p.id = l.photo_id
      LEFT JOIN comments c ON p.id = c.photo_id
      LEFT JOIN likes ul ON p.id = ul.photo_id AND ul.user_id = ?
      WHERE p.user_id = ?
      GROUP BY p.id
      ORDER BY p.created_at DESC
    `;
    
    try {
      const rows = await dbHelpers.all(sql, [viewer_user_id, user_id]);
      return rows.map(row => new Photo(row));
    } catch (error) {
      throw new Error(`Error finding photos by user ID: ${error.message}`);
    }
  }

  // Toggle like on photo
  static async toggleLike(photo_id, user_id) {
    try {
      // Check if like exists
      const existingLike = await dbHelpers.get(
        'SELECT id FROM likes WHERE photo_id = ? AND user_id = ?',
        [photo_id, user_id]
      );

      if (existingLike) {
        // Remove like
        await dbHelpers.run(
          'DELETE FROM likes WHERE photo_id = ? AND user_id = ?',
          [photo_id, user_id]
        );
        return { liked: false };
      } else {
        // Add like
        await dbHelpers.run(
          'INSERT INTO likes (photo_id, user_id) VALUES (?, ?)',
          [photo_id, user_id]
        );
        return { liked: true };
      }
    } catch (error) {
      throw new Error(`Error toggling like: ${error.message}`);
    }
  }

  // Delete photo
  async delete() {
    const sql = 'DELETE FROM photos WHERE id = ?';
    try {
      const result = await dbHelpers.run(sql, [this.id]);
      return result.changes > 0;
    } catch (error) {
      throw new Error(`Error deleting photo: ${error.message}`);
    }
  }
}

module.exports = Photo;