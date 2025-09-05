// ===== FILE 1: backend/models/User.js =====
// Copy this content and save as: backend/models/User.js

const { dbHelpers } = require('../db/database');
const bcrypt = require('bcryptjs');

class User {
  constructor(data) {
    this.id = data.id;
    this.username = data.username;
    this.email = data.email;
    this.password_hash = data.password_hash;
    this.avatar_url = data.avatar_url;
    this.bio = data.bio;
    this.created_at = data.created_at;
  }

  // Create a new user
  static async create(userData) {
    const { username, email, password, avatar_url = null, bio = null } = userData;
    
    // Hash password
    const saltRounds = 12;
    const password_hash = await bcrypt.hash(password, saltRounds);
    
    const sql = `
      INSERT INTO users (username, email, password_hash, avatar_url, bio)
      VALUES (?, ?, ?, ?, ?)
    `;
    
    try {
      const result = await dbHelpers.run(sql, [username, email, password_hash, avatar_url, bio]);
      return await User.findById(result.id);
    } catch (error) {
      throw new Error(`Error creating user: ${error.message}`);
    }
  }

  // Find user by ID
  static async findById(id) {
    const sql = 'SELECT * FROM users WHERE id = ?';
    try {
      const row = await dbHelpers.get(sql, [id]);
      return row ? new User(row) : null;
    } catch (error) {
      throw new Error(`Error finding user by ID: ${error.message}`);
    }
  }

  // Find user by username
  static async findByUsername(username) {
    const sql = 'SELECT * FROM users WHERE username = ?';
    try {
      const row = await dbHelpers.get(sql, [username]);
      return row ? new User(row) : null;
    } catch (error) {
      throw new Error(`Error finding user by username: ${error.message}`);
    }
  }

  // Find user by email
  static async findByEmail(email) {
    const sql = 'SELECT * FROM users WHERE email = ?';
    try {
      const row = await dbHelpers.get(sql, [email]);
      return row ? new User(row) : null;
    } catch (error) {
      throw new Error(`Error finding user by email: ${error.message}`);
    }
  }

  // Validate password
  async validatePassword(password) {
    return await bcrypt.compare(password, this.password_hash);
  }

  // Update user profile
  async update(updateData) {
    const { username, email, avatar_url, bio } = updateData;
    
    const sql = `
      UPDATE users 
      SET username = ?, email = ?, avatar_url = ?, bio = ?
      WHERE id = ?
    `;
    
    try {
      await dbHelpers.run(sql, [
        username || this.username,
        email || this.email,
        avatar_url !== undefined ? avatar_url : this.avatar_url,
        bio !== undefined ? bio : this.bio,
        this.id
      ]);
      
      return await User.findById(this.id);
    } catch (error) {
      throw new Error(`Error updating user: ${error.message}`);
    }
  }

  // Get user's public profile
  toPublicProfile() {
    return {
      id: this.id,
      username: this.username,
      avatar_url: this.avatar_url,
      bio: this.bio,
      created_at: this.created_at
    };
  }

  // Get user's full profile
  toFullProfile() {
    return {
      id: this.id,
      username: this.username,
      email: this.email,
      avatar_url: this.avatar_url,
      bio: this.bio,
      created_at: this.created_at
    };
  }
}

module.exports = User;
