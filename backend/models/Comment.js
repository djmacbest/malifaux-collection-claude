

// ===== FILE 4: backend/models/Comment.js =====
// Copy this content and save as: backend/models/Comment.js

const { dbHelpers } = require('../db/database');

class Comment {
  constructor(data) {
    this.id = data.id;
    this.user_id = data.user_id;
    this.photo_id = data.photo_id;
    this.content = data.content;
    this.created_at = data.created_at;
    
    // Additional fields from joins
    this.username = data.username;
    this.avatar_url = data.avatar_url;
  }

  // Create a new comment
  static async create(commentData) {
    const { user_id, photo_id, content } = commentData;
    
    const sql = `
      INSERT INTO comments (user_id, photo_id, content)
      VALUES (?, ?, ?)
    `;
    
    try {
      const result = await dbHelpers.run(sql, [user_id, photo_id, content]);
      return await Comment.findById(result.id);
    } catch (error) {
      throw new Error(`Error creating comment: ${error.message}`);
    }
  }

  // Find comment by ID with user details
  static async findById(id) {
    const sql = `
      SELECT 
        c.*,
        u.username,
        u.avatar_url
      FROM comments c
      JOIN users u ON c.user_id = u.id
      WHERE c.id = ?
    `;
    
    try {
      const row = await dbHelpers.get(sql, [id]);
      return row ? new Comment(row) : null;
    } catch (error) {
      throw new Error(`Error finding comment by ID: ${error.message}`);
    }
  }

  // Get all comments for a photo
  static async findByPhotoId(photo_id) {
    const sql = `
      SELECT 
        c.*,
        u.username,
        u.avatar_url
      FROM comments c
      JOIN users u ON c.user_id = u.id
      WHERE c.photo_id = ?
      ORDER BY c.created_at ASC
    `;
    
    try {
      const rows = await dbHelpers.all(sql, [photo_id]);
      return rows.map(row => new Comment(row));
    } catch (error) {
      throw new Error(`Error finding comments by photo ID: ${error.message}`);
    }
  }

  // Delete comment
  async delete() {
    const sql = 'DELETE FROM comments WHERE id = ?';
    try {
      const result = await dbHelpers.run(sql, [this.id]);
      return result.changes > 0;
    } catch (error) {
      throw new Error(`Error deleting comment: ${error.message}`);
    }
  }
}

module.exports = Comment;