import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import pool from '../config/database';
import { AuthRequest } from '../middleware/auth';

export const login = async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;
    console.log('🔐 Login attempt for:', email);

    const result = await pool.query(
      'SELECT id, email, password_hash, first_name, last_name, role, is_active FROM users WHERE email = $1',
      [email]
    );

    if (result.rows.length === 0) {
      console.log('❌ User not found:', email);
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    const user = result.rows[0];
    console.log('✅ User found:', user.email, '- Role:', user.role, '- Active:', user.is_active);

    if (!user.is_active) {
      console.log('❌ Account deactivated:', email);
      return res.status(403).json({ message: 'Account is deactivated' });
    }

    const isValidPassword = await bcrypt.compare(password, user.password_hash);
    console.log('🔑 Password valid:', isValidPassword);

    if (!isValidPassword) {
      console.log('❌ Invalid password for:', email);
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    const jwtSecret = process.env.JWT_SECRET || 'default-secret-key-change-in-production';
    
    const token = jwt.sign(
      { id: user.id, email: user.email, role: user.role },
      jwtSecret,
      { expiresIn: '7d' }
    );

    const responseData = {
      token,
      user: {
        id: user.id,
        email: user.email,
        firstName: user.first_name,
        lastName: user.last_name,
        role: user.role,
      },
    };

    console.log('✅ Login successful for:', email, '- Sending response');
    res.json(responseData);
  } catch (error) {
    console.error('❌ Login error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

export const getProfile = async (req: AuthRequest, res: Response) => {
  try {
    const result = await pool.query(
      'SELECT id, email, first_name, last_name, phone, role FROM users WHERE id = $1',
      [req.user?.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'User not found' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Get profile error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};
