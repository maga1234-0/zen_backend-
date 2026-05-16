import { Router } from 'express';
import { authenticate, authorize, AuthRequest } from '../middleware/auth';
import pool from '../config/database';
import * as notificationService from '../services/notificationService';

const router = Router();

router.use(authenticate);

// Get all bookings
router.get('/', async (req: AuthRequest, res) => {
  try {
    const result = await pool.query(
      `SELECT b.*, 
        g.first_name || ' ' || g.last_name as guest_name,
        g.phone as guest_phone,
        r.room_number,
        r.status as room_status
       FROM bookings b
       JOIN guests g ON b.guest_id = g.id
       JOIN rooms r ON b.room_id = r.id
       ORDER BY b.created_at DESC`
    );
    res.json(result.rows);
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

// Get today's check-ins (guests currently checked in)
router.get('/today/checkins', async (req: AuthRequest, res) => {
  try {
    const result = await pool.query(
      `SELECT b.*, 
        g.first_name || ' ' || g.last_name as guest_name,
        g.phone as guest_phone,
        r.room_number,
        r.status as room_status
       FROM bookings b
       JOIN guests g ON b.guest_id = g.id
       JOIN rooms r ON b.room_id = r.id
       WHERE b.status = 'checked_in'
       AND b.check_out_date >= CURRENT_DATE
       ORDER BY b.check_in_date ASC`
    );
    console.log('Today\'s check-ins (currently checked in guests):', result.rows);
    res.json(result.rows);
  } catch (error) {
    console.error('Get today\'s check-ins error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get today's check-outs (guests checking out today)
router.get('/today/checkouts', async (req: AuthRequest, res) => {
  try {
    const result = await pool.query(
      `SELECT b.*, 
        g.first_name || ' ' || g.last_name as guest_name,
        g.phone as guest_phone,
        r.room_number,
        r.status as room_status
       FROM bookings b
       JOIN guests g ON b.guest_id = g.id
       JOIN rooms r ON b.room_id = r.id
       WHERE DATE(b.check_out_date) = CURRENT_DATE
       AND b.status = 'checked_in'
       ORDER BY b.check_out_date ASC`
    );
    console.log('Today\'s check-outs (checking out today):', result.rows);
    res.json(result.rows);
  } catch (error) {
    console.error('Get today\'s check-outs error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get unpaid bookings (for payment modal)
router.get('/unpaid', async (req: AuthRequest, res) => {
  try {
    const result = await pool.query(
      `SELECT b.*, 
        g.first_name || ' ' || g.last_name as guest_name,
        g.phone as guest_phone,
        r.room_number
       FROM bookings b
       JOIN guests g ON b.guest_id = g.id
       JOIN rooms r ON b.room_id = r.id
       LEFT JOIN payments p ON b.id = p.booking_id AND p.payment_status = 'completed'
       WHERE p.id IS NULL
       AND b.status NOT IN ('cancelled')
       ORDER BY b.created_at DESC`
    );
    res.json(result.rows);
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

// Create booking
router.post('/', async (req: AuthRequest, res) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const { hotelId, guestId, roomId, checkInDate, checkOutDate, numberOfGuests, totalAmount, specialRequests, status } = req.body;

    console.log('Creating booking:', { hotelId, guestId, roomId, checkInDate, checkOutDate, numberOfGuests, totalAmount, status });

    // Check if room has any overlapping bookings
    const overlapCheck = await client.query(
      `SELECT id FROM bookings 
       WHERE room_id = $1 
       AND status NOT IN ('cancelled', 'checked_out')
       AND (
         (check_in_date <= $2 AND check_out_date >= $2) OR
         (check_in_date <= $3 AND check_out_date >= $3) OR
         (check_in_date >= $2 AND check_out_date <= $3)
       )`,
      [roomId, checkInDate, checkOutDate]
    );

    if (overlapCheck.rows.length > 0) {
      await client.query('ROLLBACK');
      return res.status(400).json({ message: 'Room is already booked for these dates' });
    }

    // Create booking with status
    const bookingResult = await client.query(
      `INSERT INTO bookings (hotel_id, guest_id, room_id, check_in_date, check_out_date, 
        number_of_guests, total_amount, special_requests, created_by, status)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10) RETURNING *`,
      [hotelId, guestId, roomId, checkInDate, checkOutDate, numberOfGuests, totalAmount, specialRequests, req.user?.id, status || 'confirmed']
    );

    console.log('Booking created:', bookingResult.rows[0]);

    // Update room status based on booking status
    if (status === 'checked_in') {
      await client.query(
        'UPDATE rooms SET status = $1 WHERE id = $2',
        ['occupied', roomId]
      );
    } else if (status === 'confirmed' || status === 'pending') {
      // Mark room as occupied for confirmed/pending bookings too
      await client.query(
        'UPDATE rooms SET status = $1 WHERE id = $2',
        ['occupied', roomId]
      );
    }

    await client.query('COMMIT');
    
    // Send notification about new booking
    const room = await pool.query('SELECT room_number FROM rooms WHERE id = $1', [roomId]);
    const guest = await pool.query('SELECT first_name, last_name FROM guests WHERE id = $1', [guestId]);
    const guestName = `${guest.rows[0].first_name} ${guest.rows[0].last_name}`;
    const roomNumber = room.rows[0].room_number;
    
    await notificationService.notifyNewBooking(guestName, roomNumber, checkInDate);
    
    res.status(201).json(bookingResult.rows[0]);
  } catch (error: any) {
    await client.query('ROLLBACK');
    console.error('Create booking error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  } finally {
    client.release();
  }
});

// Update booking status
router.patch('/:id/status', async (req: AuthRequest, res) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    
    const { id } = req.params;
    const { status } = req.body;

    // Get the booking to find the room_id
    const bookingResult = await client.query(
      'SELECT room_id FROM bookings WHERE id = $1',
      [id]
    );

    if (bookingResult.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ message: 'Booking not found' });
    }

    const roomId = bookingResult.rows[0].room_id;

    // Update booking status
    const result = await client.query(
      'UPDATE bookings SET status = $1, updated_at = NOW() WHERE id = $2 RETURNING *',
      [status, id]
    );

    // If checking out, set room to dirty
    if (status === 'checked_out') {
      await client.query(
        'UPDATE rooms SET status = $1 WHERE id = $2',
        ['dirty', roomId]
      );
      console.log(`✅ Room ${roomId} set to dirty after checkout`);
      
      // Get room and guest info for notification
      const roomInfo = await client.query('SELECT room_number FROM rooms WHERE id = $1', [roomId]);
      const bookingInfo = await client.query(
        `SELECT g.first_name, g.last_name 
         FROM bookings b 
         JOIN guests g ON b.guest_id = g.id 
         WHERE b.id = $1`,
        [id]
      );
      
      if (roomInfo.rows.length > 0 && bookingInfo.rows.length > 0) {
        const guestName = `${bookingInfo.rows[0].first_name} ${bookingInfo.rows[0].last_name}`;
        await notificationService.notifyCheckOut(guestName, roomInfo.rows[0].room_number);
      }
    }
    
    // If checking in, set room to occupied
    if (status === 'checked_in') {
      await client.query(
        'UPDATE rooms SET status = $1 WHERE id = $2',
        ['occupied', roomId]
      );
      console.log(`✅ Room ${roomId} set to occupied after check-in`);
      
      // Get room and guest info for notification
      const roomInfo = await client.query('SELECT room_number FROM rooms WHERE id = $1', [roomId]);
      const bookingInfo = await client.query(
        `SELECT g.first_name, g.last_name 
         FROM bookings b 
         JOIN guests g ON b.guest_id = g.id 
         WHERE b.id = $1`,
        [id]
      );
      
      if (roomInfo.rows.length > 0 && bookingInfo.rows.length > 0) {
        const guestName = `${bookingInfo.rows[0].first_name} ${bookingInfo.rows[0].last_name}`;
        await notificationService.notifyCheckIn(guestName, roomInfo.rows[0].room_number);
      }
    }

    // If cancelled, check if there are other active bookings for this room
    if (status === 'cancelled') {
      const activeBookings = await client.query(
        `SELECT id FROM bookings 
         WHERE room_id = $1 
         AND status NOT IN ('cancelled', 'checked_out')
         AND check_out_date >= CURRENT_DATE`,
        [roomId]
      );

      // If no active bookings, mark room as available
      if (activeBookings.rows.length === 0) {
        await client.query(
          'UPDATE rooms SET status = $1 WHERE id = $2',
          ['available', roomId]
        );
        console.log(`✅ Room ${roomId} set to available after cancellation`);
      }
      
      // Send cancellation notification
      const roomInfo = await client.query('SELECT room_number FROM rooms WHERE id = $1', [roomId]);
      const bookingInfo = await client.query(
        `SELECT g.first_name, g.last_name 
         FROM bookings b 
         JOIN guests g ON b.guest_id = g.id 
         WHERE b.id = $1`,
        [id]
      );
      
      if (roomInfo.rows.length > 0 && bookingInfo.rows.length > 0) {
        const guestName = `${bookingInfo.rows[0].first_name} ${bookingInfo.rows[0].last_name}`;
        await notificationService.notifyBookingCancelled(guestName, roomInfo.rows[0].room_number);
      }
    }

    await client.query('COMMIT');
    res.json(result.rows[0]);
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Update booking status error:', error);
    res.status(500).json({ message: 'Server error' });
  } finally {
    client.release();
  }
});

// Update booking
router.patch('/:id', async (req: AuthRequest, res) => {
  try {
    const { id } = req.params;
    const { checkInDate, checkOutDate, numberOfGuests, status, totalAmount, specialRequests } = req.body;

    const result = await pool.query(
      `UPDATE bookings 
       SET check_in_date = $1, check_out_date = $2, number_of_guests = $3, 
           status = $4, total_amount = $5, special_requests = $6, updated_at = NOW()
       WHERE id = $7 
       RETURNING *`,
      [checkInDate, checkOutDate, numberOfGuests, status, totalAmount, specialRequests, id]
    );

    res.json(result.rows[0]);
  } catch (error: any) {
    console.error('Update booking error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Delete booking
router.delete('/:id', async (req: AuthRequest, res) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    
    const { id } = req.params;

    // Get the room_id and booking info before deleting
    const bookingResult = await client.query(
      `SELECT b.room_id, r.room_number, g.first_name, g.last_name
       FROM bookings b
       JOIN rooms r ON b.room_id = r.id
       JOIN guests g ON b.guest_id = g.id
       WHERE b.id = $1`,
      [id]
    );

    if (bookingResult.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ message: 'Booking not found' });
    }

    const roomId = bookingResult.rows[0].room_id;
    const roomNumber = bookingResult.rows[0].room_number;
    const guestName = `${bookingResult.rows[0].first_name} ${bookingResult.rows[0].last_name}`;

    // Delete the booking
    await client.query('DELETE FROM bookings WHERE id = $1', [id]);
    console.log(`🗑️ Booking deleted for ${guestName} in Room ${roomNumber}`);

    // Check if there are any other active bookings for this room
    const activeBookings = await client.query(
      `SELECT id FROM bookings 
       WHERE room_id = $1 
       AND status NOT IN ('cancelled', 'checked_out')
       AND check_out_date >= CURRENT_DATE`,
      [roomId]
    );

    console.log(`📊 Active bookings for room ${roomNumber}: ${activeBookings.rows.length}`);

    // If no active bookings, mark room as available
    if (activeBookings.rows.length === 0) {
      await client.query(
        'UPDATE rooms SET status = $1 WHERE id = $2',
        ['available', roomId]
      );
      console.log(`✅ Room ${roomNumber} set to available after booking deletion`);
      
      // Send notification
      await notificationService.notifyBookingCancelled(guestName, roomNumber);
    } else {
      console.log(`⚠️ Room ${roomNumber} still has ${activeBookings.rows.length} active booking(s)`);
    }

    await client.query('COMMIT');
    res.json({ message: 'Booking deleted successfully' });
  } catch (error: any) {
    await client.query('ROLLBACK');
    console.error('Delete booking error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  } finally {
    client.release();
  }
});

export default router;
