// ===== FILE 3: backend/models/Photo.js =====
// REPLACE your existing Photo.js with this updated version

const { dbHelpers } = require('../db/database');

class Photo {
  constructor(data) {
    this.id = data.id;
    this.user_id = data.user_id;
    this.image_url = data.image_url;
    this.caption = data.caption;
    this.painting_status = data.painting_status;
    this.is_crew_picture = data.is_crew_picture;
    this.created_at = data.created_at;
    
    // User details from joins
    this.username = data.username;
    this.avatar_url = data.avatar_url;
    
    // Engagement metrics
    this.likes_count = data.likes_count || 0;
    this.comments_count = data.comments_count || 0;
    this.user_liked = data.user_liked || false;

    // Miniatures in this photo (array)
    this.miniatures = data.miniatures || [];
  }

  // Create a new photo with associated miniatures
  static async create(photoData) {
    const { user_id, miniature_ids, image_url, caption = null, painting_status = 'Painted' } = photoData;
    
    // Determine if it's a crew picture (multiple miniatures)
    const is_crew_picture = Array.isArray(miniature_ids) && miniature_ids.length > 1;
    
    const sql = `
      INSERT INTO photos (user_id, image_url, caption, painting_status, is_crew_picture)
      VALUES (?, ?, ?, ?, ?)
    `;
    
    try {
      const result = await dbHelpers.run(sql, [user_id, image_url, caption, painting_status, is_crew_picture]);
      const photoId = result.id;

      // Associate miniatures with the photo
      const miniatureIdsArray = Array.isArray(miniature_ids) ? miniature_ids : [miniature_ids];
      for (const miniatureId of miniatureIdsArray) {
        await dbHelpers.run(
          'INSERT INTO photo_miniatures (photo_id, master_miniature_id) VALUES (?, ?)',
          [photoId, miniatureId]
        );
      }

      return await Photo.findById(photoId);
    } catch (error) {
      throw new Error(`Error creating photo: ${error.message}`);
    }
  }

  // Find photo by ID with all related data
  static async findById(id, viewer_user_id = null) {
    const sql = `
      SELECT 
        p.*,
        u.username,
        u.avatar_url,
        COUNT(DISTINCT l.id) as likes_count,
        COUNT(DISTINCT c.id) as comments_count,
        CASE WHEN ul.id IS NOT NULL THEN 1 ELSE 0 END as user_liked
      FROM photos p
      JOIN users u ON p.user_id = u.id
      LEFT JOIN likes l ON p.id = l.photo_id
      LEFT JOIN comments c ON p.id = c.photo_id
      LEFT JOIN likes ul ON p.id = ul.photo_id AND ul.user_id = ?
      WHERE p.id = ?
      GROUP BY p.id
    `;
    
    try {
      const row = await dbHelpers.get(sql, [viewer_user_id, id]);
      if (!row) return null;

      // Get associated miniatures
      const miniaturesSQL = `
        SELECT 
          m.id,
          m.model_name,
          m.sculpt_variant,
          m.variant_name,
          m.base_size,
          m.station,
          GROUP_CONCAT(DISTINCT f.faction) as factions
        FROM photo_miniatures pm
        JOIN master_miniatures m ON pm.master_miniature_id = m.id
        LEFT JOIN miniature_factions f ON m.id = f.master_miniature_id
        WHERE pm.photo_id = ?
        GROUP BY m.id
        ORDER BY m.model_name
      `;

      const miniatures = await dbHelpers.all(miniaturesSQL, [id]);
      row.miniatures = miniatures.map(mini => ({
        ...mini,
        display_name: mini.variant_name || mini.model_name,
        factions: mini.factions ? mini.factions.split(',') : []
      }));

      return new Photo(row);
    } catch (error) {
      throw new Error(`Error finding photo by ID: ${error.message}`);
    }
  }

  // Get photos for gallery with filtering
  static async getGallery(limit = 20, offset = 0, viewer_user_id = null, filters = {}) {
    let sql = `
      SELECT 
        p.*,
        u.username,
        u.avatar_url,
        COUNT(DISTINCT l.id) as likes_count,
        COUNT(DISTINCT c.id) as comments_count,
        CASE WHEN ul.id IS NOT NULL THEN 1 ELSE 0 END as user_liked
      FROM photos p
      JOIN users u ON p.user_id = u.id
      LEFT JOIN likes l ON p.id = l.photo_id
      LEFT JOIN comments c ON p.id = c.photo_id
      LEFT JOIN likes ul ON p.id = ul.photo_id AND ul.user_id = ?
    `;

    let params = [viewer_user_id];
    let whereConditions = [];

    // Add filters
    if (filters.painting_status) {
      whereConditions.push('p.painting_status = ?');
      params.push(filters.painting_status);
    }

    if (filters.is_crew_picture !== undefined) {
      whereConditions.push('p.is_crew_picture = ?');
      params.push(filters.is_crew_picture ? 1 : 0);
    }

    if (filters.faction) {
      whereConditions.push(`EXISTS (
        SELECT 1 FROM photo_miniatures pm 
        JOIN miniature_factions mf ON pm.master_miniature_id = mf.master_miniature_id 
        WHERE pm.photo_id = p.id AND mf.faction = ?
      )`);
      params.push(filters.faction);
    }

    if (filters.master_miniature_id) {
      whereConditions.push(`EXISTS (
        SELECT 1 FROM photo_miniatures pm 
        WHERE pm.photo_id = p.id AND pm.master_miniature_id = ?
      )`);
      params.push(filters.master_miniature_id);
    }

    if (whereConditions.length > 0) {
      sql += ` WHERE ${whereConditions.join(' AND ')}`;
    }

    sql += `
      GROUP BY p.id
      ORDER BY p.created_at DESC
      LIMIT ? OFFSET ?
    `;

    params.push(limit, offset);
    
    try {
      const rows = await dbHelpers.all(sql, params);
      
      // Get miniatures for each photo
      const photos = await Promise.all(rows.map(async (row) => {
        const miniaturesSQL = `
          SELECT 
            m.id,
            m.model_name,
            m.variant_name,
            GROUP_CONCAT(DISTINCT f.faction) as factions
          FROM photo_miniatures pm
          JOIN master_miniatures m ON pm.master_miniature_id = m.id
          LEFT JOIN miniature_factions f ON m.id = f.master_miniature_id
          WHERE pm.photo_id = ?
          GROUP BY m.id
        `;

        const miniatures = await dbHelpers.all(miniaturesSQL, [row.id]);
        row.miniatures = miniatures.map(mini => ({
          ...mini,
          display_name: mini.variant_name || mini.model_name,
          factions: mini.factions ? mini.factions.split(',') : []
        }));

        return new Photo(row);
      }));

      return photos;
    } catch (error) {
      throw new Error(`Error getting gallery photos: ${error.message}`);
    }
  }

  // Get photos by user ID
  static async findByUserId(user_id, viewer_user_id = null) {
    return await Photo.getGallery(100, 0, viewer_user_id, { user_id });
  }

  // Get photos featuring a specific master miniature
  static async findByMasterMiniatureId(master_miniature_id, viewer_user_id = null, filters = {}) {
    return await Photo.getGallery(100, 0, viewer_user_id, { 
      master_miniature_id, 
      ...filters 
    });
  }

  // Toggle like on photo
  static async toggleLike(photo_id, user_id) {
    try {
      const existingLike = await dbHelpers.get(
        'SELECT id FROM likes WHERE photo_id = ? AND user_id = ?',
        [photo_id, user_id]
      );

      if (existingLike) {
        await dbHelpers.run(
          'DELETE FROM likes WHERE photo_id = ? AND user_id = ?',
          [photo_id, user_id]
        );
        return { liked: false };
      } else {
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

  // Delete photo and its associations
  async delete() {
    try {
      // Delete photo-miniature associations first
      await dbHelpers.run('DELETE FROM photo_miniatures WHERE photo_id = ?', [this.id]);
      
      // Delete the photo itself (comments and likes will cascade)
      const result = await dbHelpers.run('DELETE FROM photos WHERE id = ?', [this.id]);
      return result.changes > 0;
    } catch (error) {
      throw new Error(`Error deleting photo: ${error.message}`);
    }
  }

  // Convert to JSON representation
  toJSON() {
    return {
      id: this.id,
      user_id: this.user_id,
      image_url: this.image_url,
      caption: this.caption,
      painting_status: this.painting_status,
      is_crew_picture: this.is_crew_picture,
      created_at: this.created_at,
      username: this.username,
      avatar_url: this.avatar_url,
      miniatures: this.miniatures,
      likes_count: this.likes_count,
      comments_count: this.comments_count,
      user_liked: this.user_liked
    };
  }
}

module.exports = Photo;