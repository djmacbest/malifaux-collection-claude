// ===== FILE 1: backend/models/MasterMiniature.js =====
// Copy this content and save as: backend/models/MasterMiniature.js (NEW FILE)

const { dbHelpers } = require('../db/database');

class MasterMiniature {
  constructor(data) {
    this.id = data.id;
    this.model_name = data.model_name;
    this.sculpt_variant = data.sculpt_variant;
    this.variant_name = data.variant_name;
    this.base_size = data.base_size;
    this.station = data.station;
    this.soulstone_cost = data.soulstone_cost;
    this.is_active = data.is_active;
    this.created_at = data.created_at;
    this.updated_at = data.updated_at;

    // Arrays from junction tables (populated by specific queries)
    this.factions = data.factions || [];
    this.keywords = data.keywords || [];
    this.characteristics = data.characteristics || [];
    this.box_names = data.box_names || [];
  }

  // Get all master miniatures with their related data
  static async findAll(filters = {}) {
    let sql = `
      SELECT 
        m.*,
        GROUP_CONCAT(DISTINCT f.faction) as factions,
        GROUP_CONCAT(DISTINCT k.keyword) as keywords,
        GROUP_CONCAT(DISTINCT c.characteristic) as characteristics,
        GROUP_CONCAT(DISTINCT b.box_name) as box_names
      FROM master_miniatures m
      LEFT JOIN miniature_factions f ON m.id = f.master_miniature_id
      LEFT JOIN miniature_keywords k ON m.id = k.master_miniature_id
      LEFT JOIN miniature_characteristics c ON m.id = c.master_miniature_id
      LEFT JOIN miniature_box_names b ON m.id = b.master_miniature_id
      WHERE m.is_active = 1
    `;

    let params = [];

    // Add filters
    if (filters.faction) {
      sql += ` AND EXISTS (SELECT 1 FROM miniature_factions mf WHERE mf.master_miniature_id = m.id AND mf.faction = ?)`;
      params.push(filters.faction);
    }

    if (filters.station) {
      sql += ` AND m.station = ?`;
      params.push(filters.station);
    }

    if (filters.base_size) {
      sql += ` AND m.base_size = ?`;
      params.push(filters.base_size);
    }

    if (filters.keyword) {
      sql += ` AND EXISTS (SELECT 1 FROM miniature_keywords mk WHERE mk.master_miniature_id = m.id AND mk.keyword = ?)`;
      params.push(filters.keyword);
    }

    if (filters.box_name) {
      sql += ` AND EXISTS (SELECT 1 FROM miniature_box_names mb WHERE mb.master_miniature_id = m.id AND mb.box_name = ?)`;
      params.push(filters.box_name);
    }

    if (filters.search) {
      sql += ` AND (m.model_name LIKE ? OR m.variant_name LIKE ?)`;
      params.push(`%${filters.search}%`, `%${filters.search}%`);
    }

    sql += ` GROUP BY m.id ORDER BY m.model_name`;

    try {
      const rows = await dbHelpers.all(sql, params);
      return rows.map(row => {
        row.factions = row.factions ? row.factions.split(',') : [];
        row.keywords = row.keywords ? row.keywords.split(',') : [];
        row.characteristics = row.characteristics ? row.characteristics.split(',') : [];
        row.box_names = row.box_names ? row.box_names.split(',') : [];
        return new MasterMiniature(row);
      });
    } catch (error) {
      throw new Error(`Error finding master miniatures: ${error.message}`);
    }
  }

  // Find master miniature by ID with all related data
  static async findById(id) {
    const sql = `
      SELECT 
        m.*,
        GROUP_CONCAT(DISTINCT f.faction) as factions,
        GROUP_CONCAT(DISTINCT k.keyword) as keywords,
        GROUP_CONCAT(DISTINCT c.characteristic) as characteristics,
        GROUP_CONCAT(DISTINCT b.box_name) as box_names
      FROM master_miniatures m
      LEFT JOIN miniature_factions f ON m.id = f.master_miniature_id
      LEFT JOIN miniature_keywords k ON m.id = k.master_miniature_id
      LEFT JOIN miniature_characteristics c ON m.id = c.master_miniature_id
      LEFT JOIN miniature_box_names b ON m.id = b.master_miniature_id
      WHERE m.id = ?
      GROUP BY m.id
    `;

    try {
      const row = await dbHelpers.get(sql, [id]);
      if (row) {
        row.factions = row.factions ? row.factions.split(',') : [];
        row.keywords = row.keywords ? row.keywords.split(',') : [];
        row.characteristics = row.characteristics ? row.characteristics.split(',') : [];
        row.box_names = row.box_names ? row.box_names.split(',') : [];
        return new MasterMiniature(row);
      }
      return null;
    } catch (error) {
      throw new Error(`Error finding master miniature by ID: ${error.message}`);
    }
  }

  // Get all unique factions
  static async getFactions() {
    const sql = 'SELECT DISTINCT faction FROM miniature_factions ORDER BY faction';
    try {
      const rows = await dbHelpers.all(sql);
      return rows.map(row => row.faction);
    } catch (error) {
      throw new Error(`Error getting factions: ${error.message}`);
    }
  }

  // Get all unique stations
  static async getStations() {
    const sql = 'SELECT DISTINCT station FROM master_miniatures WHERE is_active = 1 ORDER BY station';
    try {
      const rows = await dbHelpers.all(sql);
      return rows.map(row => row.station);
    } catch (error) {
      throw new Error(`Error getting stations: ${error.message}`);
    }
  }

  // Get all unique keywords
  static async getKeywords() {
    const sql = 'SELECT DISTINCT keyword FROM miniature_keywords ORDER BY keyword';
    try {
      const rows = await dbHelpers.all(sql);
      return rows.map(row => row.keyword);
    } catch (error) {
      throw new Error(`Error getting keywords: ${error.message}`);
    }
  }

  // Get all unique box names
  static async getBoxNames() {
    const sql = 'SELECT DISTINCT box_name FROM miniature_box_names ORDER BY box_name';
    try {
      const rows = await dbHelpers.all(sql);
      return rows.map(row => row.box_name);
    } catch (error) {
      throw new Error(`Error getting box names: ${error.message}`);
    }
  }

  // Get statistics for this miniature
  async getStatistics() {
    const sql = `
      SELECT 
        COUNT(DISTINCT uc.user_id) as owners_count,
        COUNT(DISTINCT pm.photo_id) as photos_count,
        SUM(CASE WHEN uc.status = 'Painted' THEN uc.quantity ELSE 0 END) as painted_count,
        SUM(uc.quantity) as total_owned
      FROM master_miniatures m
      LEFT JOIN user_collections uc ON m.id = uc.master_miniature_id
      LEFT JOIN photo_miniatures pm ON m.id = pm.master_miniature_id
      WHERE m.id = ?
    `;

    try {
      const stats = await dbHelpers.get(sql, [this.id]);
      return {
        owners_count: stats.owners_count || 0,
        photos_count: stats.photos_count || 0,
        painted_count: stats.painted_count || 0,
        total_owned: stats.total_owned || 0
      };
    } catch (error) {
      throw new Error(`Error getting miniature statistics: ${error.message}`);
    }
  }

  // Search miniatures with typeahead functionality
  static async search(query, limit = 10) {
    const sql = `
      SELECT 
        m.*,
        GROUP_CONCAT(DISTINCT f.faction) as factions
      FROM master_miniatures m
      LEFT JOIN miniature_factions f ON m.id = f.master_miniature_id
      WHERE m.is_active = 1 
        AND (m.model_name LIKE ? OR m.variant_name LIKE ?)
      GROUP BY m.id
      ORDER BY 
        CASE WHEN m.model_name LIKE ? THEN 1 ELSE 2 END,
        m.model_name
      LIMIT ?
    `;

    const searchTerm = `%${query}%`;
    const exactStart = `${query}%`;

    try {
      const rows = await dbHelpers.all(sql, [searchTerm, searchTerm, exactStart, limit]);
      return rows.map(row => {
        row.factions = row.factions ? row.factions.split(',') : [];
        return new MasterMiniature(row);
      });
    } catch (error) {
      throw new Error(`Error searching miniatures: ${error.message}`);
    }
  }

  // Convert to JSON representation
  toJSON() {
    return {
      id: this.id,
      model_name: this.model_name,
      sculpt_variant: this.sculpt_variant,
      variant_name: this.variant_name,
      display_name: this.variant_name || this.model_name,
      base_size: this.base_size,
      station: this.station,
      soulstone_cost: this.soulstone_cost,
      factions: this.factions,
      keywords: this.keywords,
      characteristics: this.characteristics,
      box_names: this.box_names,
      is_active: this.is_active,
      created_at: this.created_at,
      updated_at: this.updated_at
    };
  }
}

module.exports = MasterMiniature;