import { Router } from 'express';
import { authenticate } from '../middleware/auth';
import pool from '../config/database';

const router = Router();

router.use(authenticate);

// Get all hotels
router.get('/', async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT id, name, address, city, country, phone, email, created_at 
       FROM hotels 
       ORDER BY created_at DESC`
    );
    res.json(result.rows);
  } catch (error) {
    console.error('Get hotels error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

export default router;
