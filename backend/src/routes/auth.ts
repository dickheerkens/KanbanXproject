import express from 'express';
import { authenticateHuman, requireRole, AuthService } from '../middleware/auth';
import { AuthenticatedRequest, ApiResponse, User } from '../types';
import { getDatabase } from '../config/database';
import { v4 as uuidv4 } from 'uuid';

interface UserRecord {
  id: string;
  username: string;
  display_name: string;
  password_hash: string;
  role: 'user' | 'admin';
  created_at: string;
  updated_at: string;
}

const router = express.Router();

// Login endpoint
router.post('/login', async (req, res) => {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      res.status(400).json({ 
        success: false, 
        error: 'Username and password are required' 
      });
      return;
    }

    const db = getDatabase();
    const authService = AuthService.getInstance();

    // Get user by username
    const user = await db.get<UserRecord>(
      'SELECT id, username, display_name, password_hash, role, created_at, updated_at FROM users WHERE username = ?',
      [username]
    );

    if (!user) {
      res.status(401).json({ 
        success: false, 
        error: 'Invalid credentials' 
      });
      return;
    }

    // Verify password
    const isValidPassword = await authService.verifyPassword(password, user.password_hash);
    
    if (!isValidPassword) {
      res.status(401).json({ 
        success: false, 
        error: 'Invalid credentials' 
      });
      return;
    }

    // Generate JWT token
    const token = authService.generateHumanToken({
      id: user.id,
      username: user.username,
      role: user.role
    });

    const response: ApiResponse<{ token: string; user: Omit<User, 'password_hash'> }> = {
      success: true,
      data: {
        token,
        user: {
          id: user.id,
          username: user.username,
          display_name: user.display_name,
          role: user.role,
          created_at: user.created_at,
          updated_at: user.updated_at
        }
      }
    };

    res.json(response);
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Internal server error' 
    });
  }
});

// User registration endpoint (admin only)
router.post('/register', authenticateHuman, requireRole(['admin']), async (req, res) => {
  try {
    const { username, password, display_name, role = 'user' } = req.body;

    if (!username || !password) {
      res.status(400).json({ 
        success: false, 
        error: 'Username and password are required' 
      });
      return;
    }

    if (!['user', 'admin'].includes(role)) {
      res.status(400).json({ 
        success: false, 
        error: 'Invalid role. Must be user or admin' 
      });
      return;
    }

    const db = getDatabase();
    const authService = AuthService.getInstance();

    // Check if username already exists
    const existingUser = await db.get(
      'SELECT id FROM users WHERE username = ?',
      [username]
    );

    if (existingUser) {
      res.status(409).json({ 
        success: false, 
        error: 'Username already exists' 
      });
      return;
    }

    // Hash password
    const passwordHash = await authService.hashPassword(password);
    const userId = uuidv4();
    const now = new Date().toISOString();

    // Create user
    await db.run(
      `INSERT INTO users (id, username, display_name, password_hash, role, created_at, updated_at) 
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [userId, username, display_name || username, passwordHash, role, now, now]
    );

    const response: ApiResponse<{ message: string }> = {
      success: true,
      message: 'User created successfully'
    };

    res.status(201).json(response);
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Internal server error' 
    });
  }
});

// Get current user profile
router.get('/profile', authenticateHuman, async (req, res) => {
  try {
    const authReq = req as AuthenticatedRequest;
    const user = authReq.user!;

    const response: ApiResponse<Omit<User, 'password_hash'>> = {
      success: true,
      data: {
        id: user.id,
        username: user.username,
        display_name: user.display_name,
        role: user.role,
        created_at: user.created_at,
        updated_at: user.updated_at
      }
    };

    res.json(response);
  } catch (error) {
    console.error('Profile error:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Internal server error' 
    });
  }
});

// Update user profile
router.put('/profile', authenticateHuman, async (req, res) => {
  try {
    const authReq = req as AuthenticatedRequest;
    const user = authReq.user!;
    const { display_name, current_password, new_password } = req.body;

    const db = getDatabase();
    const authService = AuthService.getInstance();

    const updates: string[] = [];
    const values: unknown[] = [];

    // Update display name if provided
    if (display_name !== undefined) {
      updates.push('display_name = ?');
      values.push(display_name);
    }

    // Update password if provided
    if (new_password) {
      if (!current_password) {
        res.status(400).json({ 
          success: false, 
          error: 'Current password required to change password' 
        });
        return;
      }

      // Get current password hash
      const currentUser = await db.get<{ password_hash: string }>(
        'SELECT password_hash FROM users WHERE id = ?',
        [user.id]
      );

      if (!currentUser) {
        res.status(404).json({ 
          success: false, 
          error: 'User not found' 
        });
        return;
      }

      // Verify current password
      const isValidPassword = await authService.verifyPassword(current_password, currentUser.password_hash);
      
      if (!isValidPassword) {
        res.status(401).json({ 
          success: false, 
          error: 'Current password is incorrect' 
        });
        return;
      }

      // Hash new password
      const newPasswordHash = await authService.hashPassword(new_password);
      updates.push('password_hash = ?');
      values.push(newPasswordHash);
    }

    if (updates.length === 0) {
      res.status(400).json({ 
        success: false, 
        error: 'No updates provided' 
      });
      return;
    }

    // Add updated_at timestamp
    updates.push('updated_at = ?');
    values.push(new Date().toISOString());
    values.push(user.id);

    // Update user
    await db.run(
      `UPDATE users SET ${updates.join(', ')} WHERE id = ?`,
      values
    );

    const response: ApiResponse<{ message: string }> = {
      success: true,
      message: 'Profile updated successfully'
    };

    res.json(response);
  } catch (error) {
    console.error('Profile update error:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Internal server error' 
    });
  }
});

export default router;