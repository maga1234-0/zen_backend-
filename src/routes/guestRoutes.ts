import { Router } from 'express';
import { authenticate } from '../middleware/auth';
import pool from '../config/database';

const router = Router();

router.use(authenticate);

// Get all guests
router.get('/', async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT * FROM guests ORDER BY created_at DESC`
    );
    res.json(result.rows);
  } catch (error) {
    console.error('Get guests error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Create guest
router.post('/', async (req, res) => {
  try {
    const { firstName, lastName, email, phone, idType, idNumber, address, city, country } = req.body;
    
    console.log('Creating guest:', { firstName, lastName, email, phone });
    
    // Check if guest with same name already exists (case-insensitive)
    const existingGuest = await pool.query(
      `SELECT * FROM guests 
       WHERE LOWER(TRIM(first_name)) = LOWER(TRIM($1)) 
       AND LOWER(TRIM(last_name)) = LOWER(TRIM($2))`,
      [firstName, lastName]
    );

    if (existingGuest.rows.length > 0) {
      console.log('⚠️ Guest already exists:', existingGuest.rows[0]);
      return res.status(200).json(existingGuest.rows[0]); // Return existing guest instead of error
    }
    
    const result = await pool.query(
      `INSERT INTO guests (first_name, last_name, email, phone, id_type, id_number, address, city, country)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
       RETURNING *`,
      [
        firstName?.trim() || '', 
        lastName?.trim() || '', 
        email?.trim() || null, 
        phone?.trim() || null,  // Allow NULL for phone
        idType?.trim() || null, 
        idNumber?.trim() || null, 
        address?.trim() || null, 
        city?.trim() || null, 
        country?.trim() || null
      ]
    );
    
    console.log('✅ Guest created:', result.rows[0]);
    res.status(201).json(result.rows[0]);
  } catch (error: any) {
    console.error('❌ Create guest error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Update guest
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { firstName, lastName, email, phone, idType, idNumber, address, city, country } = req.body;

    const result = await pool.query(
      `UPDATE guests 
       SET first_name = $1, last_name = $2, email = $3, phone = $4, 
           id_type = $5, id_number = $6, address = $7, city = $8, country = $9,
           updated_at = NOW()
       WHERE id = $10
       RETURNING *`,
      [firstName, lastName, email, phone, idType, idNumber, address, city, country, id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Guest not found' });
    }

    res.json(result.rows[0]);
  } catch (error: any) {
    console.error('Update guest error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Delete guest
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const result = await pool.query(
      'DELETE FROM guests WHERE id = $1 RETURNING *',
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Guest not found' });
    }

    res.json({ message: 'Guest deleted successfully' });
  } catch (error: any) {
    console.error('Delete guest error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

export default router;
