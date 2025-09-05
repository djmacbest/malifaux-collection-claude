
// ===== FILE 2: backend/models/Miniature.js =====
// Copy this content and save as: backend/models/Miniature.js

const { dbHelpers } = require('../db/database');

class Miniature {
  constructor(data) {
    this.id = data.id;
    this.user_id = data.user_id;
    this.name = data.name;
    this.faction = data.faction;
    this.status = data.status;
    this.notes = data.notes;
    this.created_at = data.created_at;
  }

  // Create a new miniature
  static async create(miniatureData) {
    const { user_id, name, faction, status = 'unpainted', notes = null } = miniatureData;
    
    const sql = `
      INSERT INTO miniatures (user_id, name, faction, status, notes)
      VALUES (?, ?, ?, ?, ?)
    `;
    
    try {
      const result = await dbHelpers.run(sql, [user_id, name, faction, status, notes]);
      return await Miniature.findById(result.id);
    } catch (error) {
      throw new Error(`Error creating miniature: ${error.message}`);
    }
  }

  // Find miniature by ID
  static async findById(id) {
    const sql = 'SELECT * FROM miniatures WHERE id = ?';
    try {
      const row = await dbHelpers.get(sql, [id]);
      return row ? new Miniature(row) : null;
    } catch (error) {
      throw new Error(`Error finding miniature by ID: ${error.message}`);
    }
  }

  // Get all miniatures for a user
  static async findByUserId(user_id) {
    const sql = `
      SELECT * FROM miniatures 
      WHERE user_id = ? 
      ORDER BY created_at DESC
    `;
    
    try {
      const rows = await dbHelpers.all(sql, [user_id]);
      return rows.map(row => new Miniature(row));
    } catch (error) {
      throw new Error(`Error finding miniatures by user ID: ${error.message}`);
    }
  }

  // Update miniature
  async update(updateData) {
    const { name, faction, status, notes } = updateData;
    
    const sql = `
      UPDATE miniatures 
      SET name = ?, faction = ?, status = ?, notes = ?
      WHERE id = ?
    `;
    
    try {
      await dbHelpers.run(sql, [
        name || this.name,
        faction || this.faction,
        status || this.status,
        notes !== undefined ? notes : this.notes,
        this.id
      ]);
      
      return await Miniature.findById(this.id);
    } catch (error) {
      throw new Error(`Error updating miniature: ${error.message}`);
    }
  }

  // Delete miniature
  async delete() {
    const sql = 'DELETE FROM miniatures WHERE id = ?';
    try {
      const result = await dbHelpers.run(sql, [this.id]);
      return result.changes > 0;
    } catch (error) {
      throw new Error(`Error deleting miniature: ${error.message}`);
    }
  }

  // Get collection statistics for a user
  static async getCollectionStats(user_id) {
    const sql = `
      SELECT 
        COUNT(*) as total,
        SUM(CASE WHEN status = 'unpainted' THEN 1 ELSE 0 END) as unpainted,
        SUM(CASE WHEN status = 'in_progress' THEN 1 ELSE 0 END) as in_progress,
        SUM(CASE WHEN status = 'painted' THEN 1 ELSE 0 END) as painted
      FROM miniatures 
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
        faction,
        COUNT(*) as count,
        SUM(CASE WHEN status = 'painted' THEN 1 ELSE 0 END) as painted_count
      FROM miniatures 
      WHERE user_id = ?
      GROUP BY faction
      ORDER BY count DESC
    `;
    
    try {
      return await dbHelpers.all(sql, [user_id]);
    } catch (error) {
      throw new Error(`Error getting faction breakdown: ${error.message}`);
    }
  }
}

module.exports = Miniature;