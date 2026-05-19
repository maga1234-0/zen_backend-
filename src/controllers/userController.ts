import { Response } from 'express';
import bcrypt from 'bcryptjs';
import pool from '../config/database';
import { AuthRequest } from '../middleware/auth';

export const getAllUsers = async (req: AuthRequest, res: Response) => {
  try {
    const result = await pool.query(
      'SELECT id, email, first_name, last_name, phone, role, is_active, created_at FROM users ORDER BY created_at DESC'
    );

    res.json(result.rows);
  } catch (error) {
    console.error('Get users error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

export const createUser = async (req: AuthRequest, res: Response) => {
  try {
    const { email, password, firstName, lastName, phone, role } = req.body;

    // Check if user already exists
    const existingUser = await pool.query(
      'SELECT id FROM users WHERE email = $1',
      [email]
    );

    if (existingUser.rows.length > 0) {
      return res.status(400).json({ message: 'User with this email already exists' });
    }

    // Hash password
    const passwordHash = await bcrypt.hash(password, 10);

    // Create user
    const result = await pool.query(
      `INSERT INTO users (email, password_hash, first_name, last_name, phone, role) 
       VALUES ($1, $2, $3, $4, $5, $6) 
       RETURNING id, email, first_name, last_name, phone, role, is_active, created_at`,
      [email, passwordHash, firstName, lastName, phone, role]
    );

    console.log('✅ User created:', result.rows[0].email);
    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Create user error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

export const updateUser = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { firstName, lastName, phone, role, isActive } = req.body;

    const result = await pool.query(
      `UPDATE users 
       SET first_name = $1, last_name = $2, phone = $3, role = $4, is_active = $5, updated_at = CURRENT_TIMESTAMP
       WHERE id = $6
       RETURNING id, email, first_name, last_name, phone, role, is_active`,
      [firstName, lastName, phone, role, isActive, id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'User not found' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Update user error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

export const deleteUser = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;

    // Check if user has any associated bookings (created_by)
    const bookingsCheck = await pool.query(
      'SELECT COUNT(*) as booking_count FROM bookings WHERE created_by = $1',
      [id]
    );

    const bookingCount = parseInt(bookingsCheck.rows[0].booking_count);
    
    if (bookingCount > 0) {
      return res.status(400).json({ 
        message: `Cannot delete user with ${bookingCount} associated booking(s). Please reassign or delete the bookings first.` 
      });
    }

    // Check if user has any associated maintenance reports
    const maintenanceCheck = await pool.query(
      'SELECT COUNT(*) as maintenance_count FROM rooms WHERE maintenance_reported_by = $1',
      [id]
    );

    const maintenanceCount = parseInt(maintenanceCheck.rows[0].maintenance_count);
    
    if (maintenanceCount > 0) {
      return res.status(400).json({ 
        message: `Cannot delete user with ${maintenanceCount} associated maintenance report(s). Please reassign or update the maintenance reports first.` 
      });
    }

    // Check if user has any audit logs
    const auditLogsCheck = await pool.query(
      'SELECT COUNT(*) as audit_logs_count FROM audit_logs WHERE user_id = $1',
      [id]
    );

    const auditLogsCount = parseInt(auditLogsCheck.rows[0].audit_logs_count);
    
    if (auditLogsCount > 0) {
      return res.status(400).json({ 
        message: `Cannot delete user with ${auditLogsCount} associated audit log(s). Please delete the audit logs first.` 
      });
    }

    const result = await pool.query(
      'DELETE FROM users WHERE id = $1 RETURNING id',
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'User not found' });
    }

    res.json({ message: 'User deleted successfully' });
  } catch (error: any) {
    console.error('Delete user error:', error);
    
    // Check for foreign key constraint violation
    if (error.code === '23503') { // PostgreSQL foreign key violation
      return res.status(400).json({ 
        message: 'Cannot delete user with associated records. Please check and update associated bookings, maintenance reports, or audit logs first.' 
      });
    }
    
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};
