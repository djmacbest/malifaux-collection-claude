// ===== FILE 2: backend/models/UserCollection.js =====
// Copy this content and save as: backend/models/UserCollection.js (NEW FILE)

const { dbHelpers } = require('../db/database');

class UserCollection {
  constructor(data) {
    this.id = data.id;
    this.user_id = data.user_id;
    this.master_miniature_id = data.master_miniature_id;
    this.status = data.status;
    this.notes = data.notes;
    this.quantity = data.quantity;
    this.acquired_date = data.acquired_date;
    this.created_at = data.created_at;
    this.updated_at = data.updated_at;

    // Miniature details from joins
    this.miniature = {
      id: data.master_miniature_id,
      model_name: data.model_name,
      sculpt_variant: data.sculpt_variant,
      variant_name: data.variant_name,
      display_name: data.variant_name || data.model_name,
      base_size: data.base_size,
      station: data.station,
      soulstone_cost: data.soulstone_cost,
      factions: data.factions ? data.factions.split(',') : [],
      keywords: data.keywords ? data.keywords.split(',') : [],
      characteristics: data.characteristics ? data.characteristics.split(',') : []
    };
  }

  // Add miniature to user's collection
  static async create(collectionData) {
    const { 
      user_id, 
      master_miniature_id, 
      status = 'Unpainted', 
      notes = null, 
      quantity = 1, 
      acquired_date = null 
    } = collectionData;
    
    const sql = `
      INSERT INTO user_collections (user_id, master_miniature_id, status, notes, quantity, acquired_date)
      VALUES (?, ?, ?, ?, ?, ?)
    `;
    
    try {
      const result = await dbHelpers.run(sql, [user_id, master_miniature_id, status, notes, quantity, acquired_date]);
      return await UserCollection.findById(result.id);
    } catch (error) {
      if (error.message.includes('UNIQUE constraint failed')) {
        throw new Error('You already have this miniature in your collection');
      }
      throw new Error(`Error adding to collection: ${error.message}`);
    }
  }

  // Find collection entry by ID with miniature details
  static async findById(id) {
    const sql = `
      SELECT 
        uc.*,
        m.model_name,
        m.sculpt_variant,
        m.variant_name,
        m.base_size,
        m.station,
        m.soulstone_cost,
        GROUP_CONCAT(DISTINCT f.faction) as factions,
        GROUP_CONCAT(DISTINCT k.keyword) as keywords,
        GROUP_CONCAT(DISTINCT c.characteristic) as characteristics
      FROM user_collections uc
      JOIN master_miniatures m ON uc.master_miniature_id = m.id
      LEFT JOIN miniature_factions f ON m.id = f.master_miniature_id
      LEFT JOIN miniature_keywords k ON m.id = k.master_miniature_id
      LEFT JOIN miniature_characteristics c ON m.id = c.master_miniature_id
      WHERE uc.id = ?
      GROUP BY uc.id
    `;
    
    try {
      const row = await dbHelpers.get(sql, [id]);
      return row ? new UserCollection(row) : null;
    } catch (error) {
      throw new Error(`Error finding collection entry by ID: ${error.message}`);
    }
  }

  // Get user's full collection with miniature details
  static async findByUserId(user_id, filters = {}) {
    let sql = `
      SELECT 
        uc.*,
        m.model_name,
        m.sculpt_variant,
        m.variant_name,
        m.base_size,
        m.station,
        m.soulstone_cost,
        GROUP_CONCAT(DISTINCT f.faction) as factions,
        GROUP_CONCAT(DISTINCT k.keyword) as keywords,
        GROUP_CONCAT(DISTINCT c.characteristic) as characteristics
      FROM user_collections uc
      JOIN master_miniatures m ON uc.master_miniature_id = m.id
      LEFT JOIN miniature_factions f ON m.id = f.master_miniature_id
      LEFT JOIN miniature_keywords k ON m.id = k.master_miniature_id
      LEFT JOIN miniature_characteristics c ON m.id = c.master_miniature_id
      WHERE uc.user_id = ?
    `;

    let params = [user_id];

    // Add filters
    if (filters.status) {
      sql += ` AND uc.status = ?`;
      params.push(filters.status);
    }

    if (filters.faction) {
      sql += ` AND EXISTS (SELECT 1 FROM miniature_factions mf WHERE mf.master_miniature_id = m.id AND mf.faction = ?)`;
      params.push(filters.faction);
    }

    if (filters.station) {
      sql += ` AND m.station = ?`;
      params.push(filters.station);
    }

    sql += ` GROUP BY uc.id ORDER BY m.model_name`;
    
    try {
      const rows = await dbHelpers.all(sql, params);
      return rows.map(row => new UserCollection(row));
    } catch (error) {
      throw new Error(`Error finding collection by user ID: ${error.message}`);
    }
  }

  // Update collection entry
  async update(updateData) {
    const { status, notes, quantity, acquired_date } = updateData;
    
    const sql = `
      UPDATE user_collections 
      SET status = ?, notes = ?, quantity = ?, acquired_date = ?, updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `;
    
    try {
      await dbHelpers.run(sql, [
        status || this.status,
        notes !== undefined ? notes : this.notes,
        quantity || this.quantity,
        acquired_date !== undefined ? acquired_date : this.acquired_date,
        this.id
      ]);
      
      return await UserCollection.findById(this.id);
    } catch (error) {
      throw new Error(`Error updating collection entry: ${error.message}`);
    }
  }

  // Remove from collection
  async delete() {
    const sql = 'DELETE FROM user_collections WHERE id = ?';
    try {
      const result = await dbHelpers.run(sql, [this.id]);
      return result.changes > 0;
    } catch (error) {
      throw new Error(`Error removing from collection: ${error.message}`);
    }
  }

  // Get collection statistics for a user
  static async getCollectionStats(user_id) {
    const sql = `
      SELECT 
        COUNT(*) as unique_models,
        SUM(quantity) as total_quantity,
        SUM(CASE WHEN status = 'Unpainted' THEN quantity ELSE 0 END) as unpainted,
        SUM(CASE WHEN status = 'Unassembled' THEN quantity ELSE 0 END) as unassembled,
        SUM(CASE WHEN status = 'Painting in progress' THEN quantity ELSE 0 END) as in_progress,
        SUM(CASE WHEN status = 'Painted' THEN quantity ELSE 0 END) as painted,
        SUM(CASE WHEN status = 'Wishlist' THEN quantity ELSE 0 END) as wishlist
      FROM user_collections 
      WHERE user_id = ?
    `;
    
    try {
      return await dbHelpers.get(sql, [user_id]);
    } catch (error) {
      throw new Error(`Error getting collection stats: ${error.message}`);
    }
  }

  // Get faction breakdown for a user
  static async getFactionBreakdown(user_id) {
    const sql = `
      SELECT 
        f.faction,
        COUNT(DISTINCT uc.master_miniature_id) as unique_models,
        SUM(uc.quantity) as total_quantity,
        SUM(CASE WHEN uc.status = 'Painted' THEN uc.quantity ELSE 0 END) as painted_count
      FROM user_collections uc
      JOIN master_miniatures m ON uc.master_miniature_id = m.id
      JOIN miniature_factions f ON m.id = f.master_miniature_id
      WHERE uc.user_id = ?
      GROUP BY f.faction
      ORDER BY total_quantity DESC
    `;
    
    try {
      return await dbHelpers.all(sql, [user_id]);
    } catch (error) {
      throw new Error(`Error getting faction breakdown: ${error.message}`);
    }
  }

  // Check if user owns a specific miniature
  static async userOwns(user_id, master_miniature_id) {
    const sql = 'SELECT id FROM user_collections WHERE user_id = ? AND master_miniature_id = ?';
    try {
      const row = await dbHelpers.get(sql, [user_id, master_miniature_id]);
      return !!row;
    } catch (error) {
      throw new Error(`Error checking ownership: ${error.message}`);
    }
  }

  // Convert to JSON representation
  toJSON() {
    return {
      id: this.id,
      user_id: this.user_id,
      master_miniature_id: this.master_miniature_id,
      status: this.status,
      notes: this.notes,
      quantity: this.quantity,
      acquired_date: this.acquired_date,
      created_at: this.created_at,
      updated_at: this.updated_at,
      miniature: this.miniature
    };
  }
}

module.exports = UserCollection;