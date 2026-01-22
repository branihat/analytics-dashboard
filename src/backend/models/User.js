const database = require('../utils/databaseHybrid');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

class UserModel {
  async createUser(userData) {
    const { username, email, password } = userData;

    // Check if user already exists
    const existingUser = await database.get(
      'SELECT id FROM users WHERE email = ? OR username = ?',
      [email, username]
    );

    if (existingUser) {
      throw new Error('User with this email or username already exists');
    }

    // Hash password
    const saltRounds = 10;
    const hashedPassword = await bcrypt.hash(password, saltRounds);

    try {
      const result = await database.run(
        'INSERT INTO users (username, email, password_hash, role, created_at) VALUES (?, ?, ?, ?, ?)',
        [username, email, hashedPassword, 'user', new Date().toISOString()]
      );

      return {
        id: result.id,
        username,
        email,
        role: 'user',
        created_at: new Date().toISOString()
      };
    } catch (err) {
      throw new Error(`Database error: ${err.message}`);
    }
  }

  async authenticateUser(email, password, selectedRole = null) {
    try {
      let user = null;
      let userType = null;

      // If role is specified, search only in that specific table
      if (selectedRole === 'admin') {
        user = await database.get(
          'SELECT id, username, email, password_hash, full_name, permissions, created_at FROM admin WHERE email = ?',
          [email]
        );
        userType = user ? 'admin' : null;
      } else if (selectedRole === 'user') {
        user = await database.get(
          'SELECT id, username, email, password_hash, full_name, department, access_level, created_at FROM "user" WHERE email = ?',
          [email]
        );
        userType = user ? 'user' : null;
      } else {
        // Fallback: search all tables if no role specified (backward compatibility)
        user = await database.get(
          'SELECT id, username, email, password_hash, full_name, permissions, created_at FROM admin WHERE email = ?',
          [email]
        );

        if (user) {
          userType = 'admin';
        } else {
          user = await database.get(
            'SELECT id, username, email, password_hash, full_name, department, access_level, created_at FROM "user" WHERE email = ?',
            [email]
          );

          if (user) {
            userType = 'user';
          } else {
            user = await database.get(
              'SELECT id, username, email, password_hash, role, created_at FROM users WHERE email = ?',
              [email]
            );

            if (user) {
              userType = user.role || 'user';
            }
          }
        }
      }

      if (!user) {
        if (selectedRole) {
          throw new Error(`No ${selectedRole} account found with this email`);
        } else {
          throw new Error('Invalid email or password');
        }
      }

      const isValidPassword = await bcrypt.compare(password, user.password_hash);

      if (!isValidPassword) {
        throw new Error('Invalid email or password');
      }

      // Determine role and permissions based on table
      let role = userType;
      let permissions = 'basic';
      let department = null;
      let fullName = user.full_name || user.username;

      if (userType === 'admin') {
        role = 'admin';
        permissions = user.permissions || 'all';
      } else if (userType === 'user') {
        role = 'user';
        permissions = user.access_level || 'basic';
        department = user.department;
      }

      // Generate JWT token
      const token = jwt.sign(
        {
          userId: user.id,
          email: user.email,
          username: user.username,
          role: role,
          userType: userType,
          permissions: permissions,
          department: department
        },
        process.env.JWT_SECRET || 'your-secret-key',
        { expiresIn: '24h' }
      );

      return {
        user: {
          id: user.id,
          username: user.username,
          email: user.email,
          fullName: fullName,
          role: role,
          userType: userType,
          permissions: permissions,
          department: department,
          accessLevel: user.access_level || 'basic'
        },
        token
      };
    } catch (err) {
      throw new Error(err.message);
    }
  }

  async getUserById(userId, userType = null) {
    try {
      let user = null;

      if (userType === 'admin') {
        user = await database.get(
          'SELECT id, username, email, full_name, permissions, created_at FROM admin WHERE id = ?',
          [userId]
        );
        if (user) user.user_type = 'admin';
      } else if (userType === 'user') {
        user = await database.get(
          'SELECT id, username, email, full_name, department, access_level, created_at FROM "user" WHERE id = ?',
          [userId]
        );
        if (user) user.user_type = 'user';
      } else {
        // Check all tables if userType not specified
        user = await database.get(
          'SELECT id, username, email, full_name, permissions, created_at FROM admin WHERE id = ?',
          [userId]
        );
        if (user) user.user_type = 'admin';

        if (!user) {
          user = await database.get(
            'SELECT id, username, email, full_name, department, access_level, created_at FROM "user" WHERE id = ?',
            [userId]
          );
          if (user) user.user_type = 'user';
        }

        if (!user) {
          user = await database.get(
            'SELECT id, username, email, role, created_at FROM users WHERE id = ?',
            [userId]
          );
          if (user) user.user_type = user.role || 'user';
        }
      }

      if (!user) {
        throw new Error('User not found');
      }

      return {
        id: user.id,
        username: user.username,
        email: user.email,
        fullName: user.full_name || user.username,
        role: user.user_type === 'admin' ? 'admin' : 'user',
        userType: user.user_type,
        permissions: user.permissions || user.access_level || 'basic',
        department: user.department || null,
        created_at: user.created_at
      };
    } catch (err) {
      throw new Error(`Database error: ${err.message}`);
    }
  }

  async updateUser(userId, updateData) {
    const { username, email } = updateData;

    try {
      await database.run(
        'UPDATE users SET username = ?, email = ?, updated_at = ? WHERE id = ?',
        [username, email, new Date().toISOString(), userId]
      );

      return await this.getUserById(userId);
    } catch (err) {
      throw new Error(`Database error: ${err.message}`);
    }
  }

  // Alias for getUserById (used by routes)
  async findById(userId, userType = null) {
    return await this.getUserById(userId, userType);
  }

  // Find all users (only regular users, not admins)
  async findAll() {
    try {
      const users = [];

      // Get only regular users (not admins)
      const regularUsers = await database.all(
        'SELECT id, username, email, full_name, department, access_level, created_at FROM "user"'
      );
      regularUsers.forEach(u => {
        users.push({
          id: u.id,
          username: u.username,
          email: u.email,
          fullName: u.full_name || u.username,
          role: 'user',
          userType: 'user',
          permissions: u.access_level || 'basic',
          department: u.department,
          created_at: u.created_at
        });
      });

      return users;
    } catch (err) {
      throw new Error(`Database error: ${err.message}`);
    }
  }

  // Find user by username
  async findByUsername(username) {
    try {
      // Check admin table
      let user = await database.get(
        'SELECT id, username, email, full_name, permissions, created_at FROM admin WHERE username = ?',
        [username]
      );
      if (user) {
        return {
          id: user.id,
          username: user.username,
          email: user.email,
          fullName: user.full_name || user.username,
          role: 'admin',
          userType: 'admin',
          permissions: user.permissions || 'all',
          department: null,
          created_at: user.created_at
        };
      }

      // Check user table
      user = await database.get(
        'SELECT id, username, email, full_name, department, access_level, created_at FROM "user" WHERE username = ?',
        [username]
      );
      if (user) {
        return {
          id: user.id,
          username: user.username,
          email: user.email,
          fullName: user.full_name || user.username,
          role: 'user',
          userType: 'user',
          permissions: user.access_level || 'basic',
          department: user.department,
          created_at: user.created_at
        };
      }

      return null;
    } catch (err) {
      throw new Error(`Database error: ${err.message}`);
    }
  }

  // Update username in appropriate table
  async updateUsername(userId, username) {
    try {
      // Try to find user in admin table first
      const adminUser = await database.get(
        'SELECT id FROM admin WHERE id = ?',
        [userId]
      );

      if (adminUser) {
        await database.run(
          'UPDATE admin SET username = ? WHERE id = ?',
          [username, userId]
        );
        return;
      }

      // Try user table
      const regularUser = await database.get(
        'SELECT id FROM "user" WHERE id = ?',
        [userId]
      );

      if (regularUser) {
        await database.run(
          'UPDATE "user" SET username = ? WHERE id = ?',
          [username, userId]
        );
        return;
      }

      throw new Error('User not found');
    } catch (err) {
      throw new Error(`Database error: ${err.message}`);
    }
  }
}

module.exports = new UserModel();