import { Request, Response } from 'express';
import pool from '../config/database';

// ============================================
// PUBLIC ENDPOINTS (No authentication required)
// ============================================

// Get available room types with pricing
export const getAvailableRooms = async (req: Request, res: Response) => {
  try {
    const { check_in, check_out } = req.query;

    if (!check_in || !check_out) {
      return res.status(400).json({ message: 'Check-in and check-out dates are required' });
    }

    // Get all room types with their base prices
    const roomTypes = await pool.query(
      `SELECT DISTINCT 
        type,
        price,
        COUNT(*) as total_rooms,
        MIN(capacity) as min_capacity,
        MAX(capacity) as max_capacity
       FROM rooms
       WHERE status != 'maintenance'
       GROUP BY type, price
       ORDER BY price`
    );

    // For each room type, calculate availability
    const availability = await Promise.all(
      roomTypes.rows.map(async (room) => {
        const availResult = await pool.query(
          'SELECT get_room_availability($1, $2, $3) as available',
          [room.type, check_in, check_out]
        );

        return {
          type: room.type,
          price: parseFloat(room.price),
          available: availResult.rows[0].available,
          total_rooms: room.total_rooms,
          capacity: {
            min: room.min_capacity,
            max: room.max_capacity
          }
        };
      })
    );

    res.json(availability);
  } catch (error) {
    console.error('Get available rooms error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Get booking settings
export const getBookingSettings = async (req: Request, res: Response) => {
  try {
    const result = await pool.query(
      'SELECT * FROM online_booking_settings LIMIT 1'
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Booking settings not found' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Get booking settings error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Validate promo code
export const validatePromoCode = async (req: Request, res: Response) => {
  try {
    const { code, room_type, check_in, check_out, total_amount } = req.body;

    const result = await pool.query(
      `SELECT * FROM promo_codes 
       WHERE code = $1 
       AND is_active = true
       AND valid_from <= CURRENT_DATE
       AND valid_until >= CURRENT_DATE
       AND (max_uses IS NULL OR current_uses < max_uses)`,
      [code.toUpperCase()]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Invalid or expired promo code' });
    }

    const promo = result.rows[0];

    // Check minimum nights
    const nights = Math.ceil((new Date(check_out).getTime() - new Date(check_in).getTime()) / (1000 * 60 * 60 * 24));
    if (nights < promo.min_nights) {
      return res.status(400).json({ 
        message: `This promo code requires a minimum of ${promo.min_nights} nights` 
      });
    }

    // Check minimum amount
    if (promo.min_amount && total_amount < promo.min_amount) {
      return res.status(400).json({ 
        message: `This promo code requires a minimum booking amount of ${promo.min_amount}` 
      });
    }

    // Check applicable room types
    if (promo.applicable_room_types && promo.applicable_room_types.length > 0) {
      if (!promo.applicable_room_types.includes(room_type)) {
        return res.status(400).json({ 
          message: 'This promo code is not applicable to the selected room type' 
        });
      }
    }

    // Calculate discount
    let discount = 0;
    if (promo.discount_type === 'percentage') {
      discount = (total_amount * promo.discount_value) / 100;
    } else {
      discount = promo.discount_value;
    }

    res.json({
      valid: true,
      code: promo.code,
      description: promo.description,
      discount_type: promo.discount_type,
      discount_value: promo.discount_value,
      discount_amount: discount,
      new_total: total_amount - discount
    });
  } catch (error) {
    console.error('Validate promo code error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};


// Create online booking
export const createOnlineBooking = async (req: Request, res: Response) => {
  const client = await pool.connect();
  try {
    const {
      guest_first_name, guest_last_name, guest_email, guest_phone,
      guest_country, guest_address, guest_city, guest_postal_code,
      room_type, check_in_date, check_out_date, number_of_guests,
      special_requests, arrival_time, promo_code
    } = req.body;

    await client.query('BEGIN');

    // Calculate nights
    const checkIn = new Date(check_in_date);
    const checkOut = new Date(check_out_date);
    const nights = Math.ceil((checkOut.getTime() - checkIn.getTime()) / (1000 * 60 * 60 * 24));

    // Get room price
    const roomResult = await client.query(
      'SELECT price FROM rooms WHERE type = $1 LIMIT 1',
      [room_type]
    );

    if (roomResult.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ message: 'Room type not found' });
    }

    const roomRate = parseFloat(roomResult.rows[0].price);
    let subtotal = roomRate * nights;

    // Apply promo code if provided
    let discount = 0;
    if (promo_code) {
      const promoResult = await client.query(
        `SELECT * FROM promo_codes 
         WHERE code = $1 AND is_active = true
         AND valid_from <= CURRENT_DATE AND valid_until >= CURRENT_DATE`,
        [promo_code.toUpperCase()]
      );

      if (promoResult.rows.length > 0) {
        const promo = promoResult.rows[0];
        if (promo.discount_type === 'percentage') {
          discount = (subtotal * promo.discount_value) / 100;
        } else {
          discount = promo.discount_value;
        }
        subtotal -= discount;

        // Increment promo code usage
        await client.query(
          'UPDATE promo_codes SET current_uses = current_uses + 1 WHERE id = $1',
          [promo.id]
        );
      }
    }

    // Calculate tax (10%)
    const taxAmount = subtotal * 0.10;
    const totalAmount = subtotal + taxAmount;

    // Get deposit settings
    const settingsResult = await client.query(
      'SELECT deposit_percentage, require_deposit FROM online_booking_settings LIMIT 1'
    );
    const settings = settingsResult.rows[0];
    const depositAmount = settings.require_deposit 
      ? (totalAmount * settings.deposit_percentage) / 100 
      : 0;

    // Generate booking reference
    const refResult = await client.query('SELECT generate_booking_reference() as ref');
    const bookingReference = refResult.rows[0].ref;

    // Create online booking
    const bookingResult = await client.query(
      `INSERT INTO online_bookings (
        booking_reference, guest_first_name, guest_last_name, guest_email, guest_phone,
        guest_country, guest_address, guest_city, guest_postal_code,
        room_type, check_in_date, check_out_date, number_of_guests, number_of_nights,
        room_rate, subtotal, tax_amount, total_amount, deposit_amount,
        special_requests, arrival_time, ip_address, user_agent,
        expires_at
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14,
        $15, $16, $17, $18, $19, $20, $21, $22, $23, $24
      ) RETURNING *`,
      [
        bookingReference, guest_first_name, guest_last_name, guest_email, guest_phone,
        guest_country, guest_address, guest_city, guest_postal_code,
        room_type, check_in_date, check_out_date, number_of_guests, nights,
        roomRate, subtotal, taxAmount, totalAmount, depositAmount,
        special_requests, arrival_time, 
        req.ip, req.get('user-agent'),
        new Date(Date.now() + 30 * 60 * 1000) // Expires in 30 minutes
      ]
    );

    await client.query('COMMIT');

    console.log('✅ Online booking created:', bookingReference);
    res.status(201).json(bookingResult.rows[0]);
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Create online booking error:', error);
    res.status(500).json({ message: 'Server error' });
  } finally {
    client.release();
  }
};

// Get booking by reference (for customer to check status)
export const getBookingByReference = async (req: Request, res: Response) => {
  try {
    const { reference } = req.params;
    const { email } = req.query;

    const result = await pool.query(
      'SELECT * FROM online_bookings WHERE booking_reference = $1 AND guest_email = $2',
      [reference, email]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Booking not found' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Get booking by reference error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Cancel online booking
export const cancelOnlineBooking = async (req: Request, res: Response) => {
  try {
    const { reference } = req.params;
    const { email, reason } = req.body;

    const result = await pool.query(
      `UPDATE online_bookings 
       SET status = 'cancelled', 
           cancelled_at = CURRENT_TIMESTAMP,
           cancellation_reason = $1,
           updated_at = CURRENT_TIMESTAMP
       WHERE booking_reference = $2 
       AND guest_email = $3
       AND status IN ('pending', 'confirmed')
       RETURNING *`,
      [reason, reference, email]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Booking not found or cannot be cancelled' });
    }

    res.json({ message: 'Booking cancelled successfully', booking: result.rows[0] });
  } catch (error) {
    console.error('Cancel online booking error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Get public reviews
export const getPublicReviews = async (req: Request, res: Response) => {
  try {
    const { limit = 10 } = req.query;

    const result = await pool.query(
      `SELECT guest_name, rating, comment, room_type, stay_date, response, responded_at
       FROM public_reviews
       WHERE is_published = true
       ORDER BY created_at DESC
       LIMIT $1`,
      [limit]
    );

    res.json(result.rows);
  } catch (error) {
    console.error('Get public reviews error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Get FAQs
export const getFAQs = async (req: Request, res: Response) => {
  try {
    const { language = 'fr', category } = req.query;

    let query = `
      SELECT 
        id,
        CASE 
          WHEN $1 = 'fr' THEN COALESCE(question_fr, question)
          WHEN $1 = 'en' THEN COALESCE(question_en, question)
          WHEN $1 = 'es' THEN COALESCE(question_es, question)
          ELSE question
        END as question,
        CASE 
          WHEN $1 = 'fr' THEN COALESCE(answer_fr, answer)
          WHEN $1 = 'en' THEN COALESCE(answer_en, answer)
          WHEN $1 = 'es' THEN COALESCE(answer_es, answer)
          ELSE answer
        END as answer,
        category
      FROM booking_faqs
      WHERE is_published = true
    `;

    const params: any[] = [language];

    if (category) {
      query += ' AND category = $2';
      params.push(category);
    }

    query += ' ORDER BY display_order, created_at';

    const result = await pool.query(query, params);
    res.json(result.rows);
  } catch (error) {
    console.error('Get FAQs error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// ============================================
// ADMIN ENDPOINTS (Require authentication)
// ============================================

// Get all online bookings (admin)
export const getAllOnlineBookings = async (req: Request, res: Response) => {
  try {
    const { status, date_from, date_to } = req.query;

    let query = 'SELECT * FROM v_online_bookings_summary WHERE 1=1';
    const params: any[] = [];

    if (status) {
      params.push(status);
      query += ` AND status = $${params.length}`;
    }

    if (date_from) {
      params.push(date_from);
      query += ` AND check_in_date >= $${params.length}`;
    }

    if (date_to) {
      params.push(date_to);
      query += ` AND check_in_date <= $${params.length}`;
    }

    query += ' ORDER BY created_at DESC';

    const result = await pool.query(query, params);
    res.json(result.rows);
  } catch (error) {
    console.error('Get all online bookings error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Get online booking statistics (admin)
export const getOnlineBookingStats = async (req: Request, res: Response) => {
  try {
    const result = await pool.query('SELECT * FROM v_online_booking_stats');
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Get online booking stats error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Convert online booking to internal booking (admin)
export const convertToInternalBooking = async (req: Request, res: Response) => {
  const client = await pool.connect();
  try {
    const { id } = req.params;
    const userId = (req as any).user?.id;

    await client.query('BEGIN');

    // Get online booking
    const onlineBooking = await client.query(
      'SELECT * FROM online_bookings WHERE id = $1',
      [id]
    );

    if (onlineBooking.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ message: 'Online booking not found' });
    }

    const ob = onlineBooking.rows[0];

    // Create or get guest
    let guestResult = await client.query(
      'SELECT id FROM guests WHERE email = $1 OR phone = $2',
      [ob.guest_email, ob.guest_phone]
    );

    let guestId;
    if (guestResult.rows.length === 0) {
      // Create new guest
      guestResult = await client.query(
        `INSERT INTO guests (first_name, last_name, email, phone, address, city, country)
         VALUES ($1, $2, $3, $4, $5, $6, $7)
         RETURNING id`,
        [ob.guest_first_name, ob.guest_last_name, ob.guest_email, ob.guest_phone,
         ob.guest_address, ob.guest_city, ob.guest_country]
      );
      guestId = guestResult.rows[0].id;
    } else {
      guestId = guestResult.rows[0].id;
    }

    // Find available room of the requested type
    const roomResult = await client.query(
      `SELECT id FROM rooms 
       WHERE type = $1 
       AND status = 'available'
       AND id NOT IN (
         SELECT room_id FROM bookings 
         WHERE status IN ('confirmed', 'checked_in')
         AND (
           (check_in_date <= $2 AND check_out_date > $2)
           OR (check_in_date < $3 AND check_out_date >= $3)
         )
       )
       LIMIT 1`,
      [ob.room_type, ob.check_in_date, ob.check_out_date]
    );

    if (roomResult.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(400).json({ message: 'No available room of this type' });
    }

    const roomId = roomResult.rows[0].id;

    // Create internal booking
    const bookingResult = await client.query(
      `INSERT INTO bookings (
        guest_id, room_id, check_in_date, check_out_date, number_of_guests,
        status, total_amount, special_requests, created_by
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      RETURNING *`,
      [guestId, roomId, ob.check_in_date, ob.check_out_date, ob.number_of_guests,
       'confirmed', ob.total_amount, ob.special_requests, userId]
    );

    // Update online booking
    await client.query(
      `UPDATE online_bookings 
       SET status = 'converted',
           converted_to_booking_id = $1,
           converted_at = CURRENT_TIMESTAMP,
           converted_by = $2
       WHERE id = $3`,
      [bookingResult.rows[0].id, userId, id]
    );

    await client.query('COMMIT');

    res.json({
      message: 'Online booking converted successfully',
      booking: bookingResult.rows[0]
    });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Convert to internal booking error:', error);
    res.status(500).json({ message: 'Server error' });
  } finally {
    client.release();
  }
};
