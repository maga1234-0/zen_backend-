import { Router } from 'express';
import { authenticate } from '../middleware/auth';
import pool from '../config/database';

const router = Router();

router.use(authenticate);

// Get all notifications for current user
router.get('/', async (req, res) => {
  try {
    const userId = (req as any).user.id;
    
    const result = await pool.query(
      `SELECT * FROM notifications 
       WHERE user_id = $1 
       ORDER BY created_at DESC`,
      [userId]
    );

    res.json(result.rows);
  } catch (error) {
    console.error('Get notifications error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Mark notification as read
router.put('/:id/read', async (req, res) => {
  try {
    const { id } = req.params;
    
    const result = await pool.query(
      'UPDATE notifications SET is_read = true WHERE id = $1 RETURNING *',
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Notification not found' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Mark notification as read error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Mark all notifications as read
router.put('/read-all', async (req, res) => {
  try {
    const userId = (req as any).user.id;
    
    await pool.query(
      'UPDATE notifications SET is_read = true WHERE user_id = $1',
      [userId]
    );

    res.json({ message: 'All notifications marked as read' });
  } catch (error) {
    console.error('Mark all as read error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Delete all notifications for current user (MUST be before /:id route)
router.delete('/all', async (req, res) => {
  try {
    const userId = (req as any).user.id;
    
    const result = await pool.query(
      'DELETE FROM notifications WHERE user_id = $1',
      [userId]
    );

    console.log(`🗑️ Deleted ${result.rowCount} notifications for user ${userId}`);
    res.json({ message: 'All notifications deleted', count: result.rowCount });
  } catch (error) {
    console.error('Delete all notifications error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Delete a single notification
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const userId = (req as any).user.id;
    
    const result = await pool.query(
      'DELETE FROM notifications WHERE id = $1 AND user_id = $2 RETURNING *',
      [id, userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Notification not found' });
    }

    res.json({ message: 'Notification deleted' });
  } catch (error) {
    console.error('Delete notification error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

export default router;
