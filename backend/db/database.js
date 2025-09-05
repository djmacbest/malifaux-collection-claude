// backend/db/database_v2.js - REPLACE your existing database.js file
const sqlite3 = require('sqlite3').verbose();
const path = require('path');

// Create database connection
const dbPath = path.join(__dirname, 'malifaux_collection_v2.db');
const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    console.error('Error opening database:', err.message);
  } else {
    console.log('Connected to SQLite database (v2 - Master Miniature System).');
    initializeDatabase();
  }
});

// Initialize database tables
function initializeDatabase() {
  db.serialize(() => {
    // Users table (unchanged)
    db.run(`
      CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        username TEXT UNIQUE NOT NULL,
        email TEXT UNIQUE NOT NULL,
        password_hash TEXT NOT NULL,
        avatar_url TEXT,
        bio TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Master miniatures table (core miniature data)
    db.run(`
      CREATE TABLE IF NOT EXISTS master_miniatures (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        model_name TEXT NOT NULL,
        sculpt_variant TEXT NOT NULL DEFAULT 'M3E',
        variant_name TEXT, -- Optional, can be NULL
        base_size TEXT NOT NULL CHECK(base_size IN ('30mm', '32mm', '40mm', '50mm')),
        station TEXT NOT NULL CHECK(station IN ('Master', 'Totem', 'Unique', 'Minion', 'Peon')),
        soulstone_cost INTEGER CHECK(soulstone_cost BETWEEN 1 AND 15), -- Optional for Masters/Totems
        is_active BOOLEAN DEFAULT 1,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Junction table: Master miniature factions (many-to-many)
    db.run(`
      CREATE TABLE IF NOT EXISTS miniature_factions (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        master_miniature_id INTEGER NOT NULL,
        faction TEXT NOT NULL,
        FOREIGN KEY (master_miniature_id) REFERENCES master_miniatures (id) ON DELETE CASCADE,
        UNIQUE(master_miniature_id, faction)
      )
    `);

    // Junction table: Master miniature keywords (many-to-many)
    db.run(`
      CREATE TABLE IF NOT EXISTS miniature_keywords (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        master_miniature_id INTEGER NOT NULL,
        keyword TEXT NOT NULL,
        FOREIGN KEY (master_miniature_id) REFERENCES master_miniatures (id) ON DELETE CASCADE,
        UNIQUE(master_miniature_id, keyword)
      )
    `);

    // Junction table: Master miniature characteristics (many-to-many)
    db.run(`
      CREATE TABLE IF NOT EXISTS miniature_characteristics (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        master_miniature_id INTEGER NOT NULL,
        characteristic TEXT NOT NULL,
        FOREIGN KEY (master_miniature_id) REFERENCES master_miniatures (id) ON DELETE CASCADE,
        UNIQUE(master_miniature_id, characteristic)
      )
    `);

    // Junction table: Master miniature box names (many-to-many)
    db.run(`
      CREATE TABLE IF NOT EXISTS miniature_box_names (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        master_miniature_id INTEGER NOT NULL,
        box_name TEXT NOT NULL,
        FOREIGN KEY (master_miniature_id) REFERENCES master_miniatures (id) ON DELETE CASCADE,
        UNIQUE(master_miniature_id, box_name)
      )
    `);

    // User collections (many-to-many between users and master miniatures)
    db.run(`
      CREATE TABLE IF NOT EXISTS user_collections (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        master_miniature_id INTEGER NOT NULL,
        status TEXT CHECK(status IN ('Painted', 'Painting in progress', 'Unpainted', 'Unassembled', 'Wishlist')) DEFAULT 'Unpainted',
        notes TEXT,
        quantity INTEGER DEFAULT 1,
        acquired_date DATE,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE,
        FOREIGN KEY (master_miniature_id) REFERENCES master_miniatures (id) ON DELETE CASCADE,
        UNIQUE(user_id, master_miniature_id) -- User can only have one collection entry per miniature
      )
    `);

    // Photos table (now supports multiple miniatures per photo for crew pictures)
    db.run(`
      CREATE TABLE IF NOT EXISTS photos (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        image_url TEXT NOT NULL,
        caption TEXT,
        painting_status TEXT CHECK(painting_status IN ('Painted', 'Painting progress')) DEFAULT 'Painted',
        is_crew_picture BOOLEAN DEFAULT 0, -- Auto-set when multiple miniatures
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
      )
    `);

    // Junction table: Photos to miniatures (many-to-many for crew pictures)
    db.run(`
      CREATE TABLE IF NOT EXISTS photo_miniatures (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        photo_id INTEGER NOT NULL,
        master_miniature_id INTEGER NOT NULL,
        FOREIGN KEY (photo_id) REFERENCES photos (id) ON DELETE CASCADE,
        FOREIGN KEY (master_miniature_id) REFERENCES master_miniatures (id) ON DELETE CASCADE,
        UNIQUE(photo_id, master_miniature_id)
      )
    `);

    // Comments table (unchanged)
    db.run(`
      CREATE TABLE IF NOT EXISTS comments (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        photo_id INTEGER NOT NULL,
        content TEXT NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE,
        FOREIGN KEY (photo_id) REFERENCES photos (id) ON DELETE CASCADE
      )
    `);

    // Likes table (unchanged)
    db.run(`
      CREATE TABLE IF NOT EXISTS likes (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        photo_id INTEGER NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE,
        FOREIGN KEY (photo_id) REFERENCES photos (id) ON DELETE CASCADE,
        UNIQUE(user_id, photo_id)
      )
    `);

    // Create indexes for performance
    db.run(`CREATE INDEX IF NOT EXISTS idx_miniature_factions ON miniature_factions (faction)`);
    db.run(`CREATE INDEX IF NOT EXISTS idx_miniature_keywords ON miniature_keywords (keyword)`);
    db.run(`CREATE INDEX IF NOT EXISTS idx_miniature_characteristics ON miniature_characteristics (characteristic)`);
    db.run(`CREATE INDEX IF NOT EXISTS idx_miniature_box_names ON miniature_box_names (box_name)`);
    db.run(`CREATE INDEX IF NOT EXISTS idx_master_miniature_images ON master_miniature_images (master_miniature_id)`);
    db.run(`CREATE INDEX IF NOT EXISTS idx_user_collections_user ON user_collections (user_id)`);
    db.run(`CREATE INDEX IF NOT EXISTS idx_user_collections_miniature ON user_collections (master_miniature_id)`);
    db.run(`CREATE INDEX IF NOT EXISTS idx_photo_miniatures_photo ON photo_miniatures (photo_id)`);
    db.run(`CREATE INDEX IF NOT EXISTS idx_photo_miniatures_miniature ON photo_miniatures (master_miniature_id)`);

    console.log('Database v2 tables and indexes created successfully.');
    
    // Seed with sample miniatures
    // seedSampleMiniatures();
  });
}

// Database helper functions (same as before)
const dbHelpers = {
  run: (sql, params = []) => {
    return new Promise((resolve, reject) => {
      db.run(sql, params, function(err) {
        if (err) {
          reject(err);
        } else {
          resolve({ id: this.lastID, changes: this.changes });
        }
      });
    });
  },

  get: (sql, params = []) => {
    return new Promise((resolve, reject) => {
      db.get(sql, params, (err, row) => {
        if (err) {
          reject(err);
        } else {
          resolve(row);
        }
      });
    });
  },

  all: (sql, params = []) => {
    return new Promise((resolve, reject) => {
      db.all(sql, params, (err, rows) => {
        if (err) {
          reject(err);
        } else {
          resolve(rows);
        }
      });
    });
  },

  close: () => {
    return new Promise((resolve, reject) => {
      db.close((err) => {
        if (err) {
          reject(err);
        } else {
          console.log('Database connection closed.');
          resolve();
        }
      });
    });
  }
};

module.exports = { db, dbHelpers };