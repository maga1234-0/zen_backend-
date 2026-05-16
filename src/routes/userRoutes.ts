import { Router } from 'express';
import { getAllUsers, createUser, updateUser, deleteUser } from '../controllers/userController';
import { authenticate } from '../middleware/auth';
import pool from '../config/database';

const router = Router();

// All routes require authentication
router.use(authenticate);

// Settings routes (must come before /:id routes)
router.get('/settings', async (req, res) => {
  try {
    const userId = (req as any).user.id;
    
    const result = await pool.query(
      'SELECT * FROM user_settings WHERE user_id = $1',
      [userId]
    );

    if (result.rows.length === 0) {
      // Return default settings if none exist
      return res.json({
        hotel_name: 'Grand Seafoam Hotel',
        hotel_address: '123 Luxury Avenue',
        hotel_city: 'Paradise City, PC 12345',
        hotel_phone: '+1 (555) 123-4567',
        hotel_email: 'info@grandhotel.com',
        time_zone: 'UTC-5 (Eastern Time)',
        email_notifications: true,
        booking_alerts: true,
        payment_notifications: true,
        theme: 'Dark',
        language: 'English',
        signature: '',
      });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Get settings error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

router.put('/settings', async (req, res) => {
  try {
    const userId = (req as any).user.id;
    const {
      hotel_name,
      hotel_address,
      hotel_city,
      hotel_phone,
      hotel_email,
      time_zone,
      email_notifications,
      booking_alerts,
      payment_notifications,
      theme,
      language,
      signature,
    } = req.body;

    console.log('💾 Saving settings for user:', userId);
    console.log('Signature length:', signature ? signature.length : 0);

    // Check if settings exist
    const existing = await pool.query(
      'SELECT id FROM user_settings WHERE user_id = $1',
      [userId]
    );

    if (existing.rows.length === 0) {
      // Insert new settings
      const result = await pool.query(
        `INSERT INTO user_settings 
         (user_id, hotel_name, hotel_address, hotel_city, hotel_phone, hotel_email, 
          time_zone, email_notifications, booking_alerts, payment_notifications, theme, language, signature)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
         RETURNING *`,
        [userId, hotel_name, hotel_address, hotel_city, hotel_phone, hotel_email,
         time_zone, email_notifications, booking_alerts, payment_notifications, theme, language, signature || '']
      );
      console.log('✅ Settings created');
      return res.json(result.rows[0]);
    }

    // Update existing settings
    const result = await pool.query(
      `UPDATE user_settings 
       SET hotel_name = $1, hotel_address = $2, hotel_city = $3, hotel_phone = $4, hotel_email = $5,
           time_zone = $6, email_notifications = $7, booking_alerts = $8, 
           payment_notifications = $9, theme = $10, language = $11, signature = $12,
           updated_at = CURRENT_TIMESTAMP
       WHERE user_id = $13
       RETURNING *`,
      [hotel_name, hotel_address, hotel_city, hotel_phone, hotel_email,
       time_zone, email_notifications, booking_alerts, payment_notifications, theme, language, signature || '', userId]
    );

    console.log('✅ Settings updated');
    res.json(result.rows[0]);
  } catch (error: any) {
    console.error('❌ Update settings error:', error);
    console.error('Error details:', error.message);
    res.status(500).json({ message: 'Server error: ' + error.message });
  }
});

// Change password endpoint
router.put('/change-password', async (req, res) => {
  try {
    const userId = (req as any).user.id;
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      return res.status(400).json({ message: 'Current password and new password are required' });
    }

    // Get user's current password
    const userResult = await pool.query(
      'SELECT password FROM users WHERE id = $1',
      [userId]
    );

    if (userResult.rows.length === 0) {
      return res.status(404).json({ message: 'User not found' });
    }

    const user = userResult.rows[0];

    // Verify current password (plain text comparison for now)
    if (user.password !== currentPassword) {
      return res.status(401).json({ message: 'Current password is incorrect' });
    }

    // Update password
    await pool.query(
      'UPDATE users SET password = $1, updated_at = NOW() WHERE id = $2',
      [newPassword, userId]
    );

    console.log(`✅ Password changed for user ${userId}`);
    res.json({ message: 'Password changed successfully' });
  } catch (error: any) {
    console.error('❌ Change password error:', error);
    res.status(500).json({ message: 'Server error: ' + error.message });
  }
});

// Upload profile picture endpoint
router.put('/profile-picture', async (req, res) => {
  try {
    const userId = (req as any).user.id;
    const { profilePicture } = req.body;

    if (!profilePicture) {
      return res.status(400).json({ message: 'Profile picture is required' });
    }

    // Update profile picture
    await pool.query(
      'UPDATE users SET profile_picture = $1, updated_at = NOW() WHERE id = $2',
      [profilePicture, userId]
    );

    console.log(`✅ Profile picture updated for user ${userId}`);
    res.json({ message: 'Profile picture updated successfully', profilePicture });
  } catch (error: any) {
    console.error('❌ Upload profile picture error:', error);
    res.status(500).json({ message: 'Server error: ' + error.message });
  }
});

// User CRUD routes
router.get('/', getAllUsers);
router.post('/', createUser);
router.put('/:id', updateUser);
router.delete('/:id', deleteUser);

export default router;
