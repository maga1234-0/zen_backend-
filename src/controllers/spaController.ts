import { Request, Response } from 'express';
import pool from '../config/database';

// ============================================
// SERVICES SPA
// ============================================

// Get all spa services
export const getSpaServices = async (req: Request, res: Response) => {
  try {
    const { category_id, is_active } = req.query;

    let query = `
      SELECT 
        ss.*,
        ssc.name as category_name,
        ssc.icon as category_icon
      FROM spa_services ss
      LEFT JOIN spa_service_categories ssc ON ss.category_id = ssc.id
      WHERE 1=1
    `;
    const params: any[] = [];

    if (category_id) {
      params.push(category_id);
      query += ` AND ss.category_id = $${params.length}`;
    }

    if (is_active !== undefined) {
      params.push(is_active === 'true');
      query += ` AND ss.is_active = $${params.length}`;
    }

    query += ' ORDER BY ssc.display_order, ss.name';

    const result = await pool.query(query, params);
    res.json(result.rows);
  } catch (error) {
    console.error('Get spa services error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Get service categories
export const getServiceCategories = async (req: Request, res: Response) => {
  try {
    const result = await pool.query(
      `SELECT * FROM spa_service_categories 
       WHERE is_active = true 
       ORDER BY display_order`
    );
    res.json(result.rows);
  } catch (error) {
    console.error('Get service categories error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Create spa service
export const createSpaService = async (req: Request, res: Response) => {
  try {
    const {
      category_id, name, name_fr, name_en, name_es,
      description, description_fr, description_en, description_es,
      duration, price, benefits, requires_therapist, max_persons
    } = req.body;

    const result = await pool.query(
      `INSERT INTO spa_services (
        category_id, name, name_fr, name_en, name_es,
        description, description_fr, description_en, description_es,
        duration, price, benefits, requires_therapist, max_persons
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
      RETURNING *`,
      [category_id, name, name_fr, name_en, name_es,
       description, description_fr, description_en, description_es,
       duration, price, benefits, requires_therapist, max_persons]
    );

    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Create spa service error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};


// Update spa service
export const updateSpaService = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const {
      category_id, name, name_fr, name_en, name_es,
      description, description_fr, description_en, description_es,
      duration, price, benefits, is_active, requires_therapist, max_persons
    } = req.body;

    const result = await pool.query(
      `UPDATE spa_services SET
        category_id = $1, name = $2, name_fr = $3, name_en = $4, name_es = $5,
        description = $6, description_fr = $7, description_en = $8, description_es = $9,
        duration = $10, price = $11, benefits = $12, is_active = $13,
        requires_therapist = $14, max_persons = $15,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = $16
      RETURNING *`,
      [category_id, name, name_fr, name_en, name_es,
       description, description_fr, description_en, description_es,
       duration, price, benefits, is_active, requires_therapist, max_persons, id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Service not found' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Update spa service error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Delete spa service
export const deleteSpaService = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const result = await pool.query(
      'DELETE FROM spa_services WHERE id = $1 RETURNING id',
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Service not found' });
    }

    res.json({ message: 'Service deleted successfully' });
  } catch (error) {
    console.error('Delete spa service error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// ============================================
// THERAPISTS
// ============================================

// Get all therapists
export const getTherapists = async (req: Request, res: Response) => {
  try {
    const { is_active } = req.query;

    let query = 'SELECT * FROM spa_therapists WHERE 1=1';
    const params: any[] = [];

    if (is_active !== undefined) {
      params.push(is_active === 'true');
      query += ` AND is_active = $${params.length}`;
    }

    query += ' ORDER BY first_name, last_name';

    const result = await pool.query(query, params);
    res.json(result.rows);
  } catch (error) {
    console.error('Get therapists error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Create therapist
export const createTherapist = async (req: Request, res: Response) => {
  try {
    const {
      first_name, last_name, email, phone, specialties, bio, hire_date
    } = req.body;

    const result = await pool.query(
      `INSERT INTO spa_therapists (
        first_name, last_name, email, phone, specialties, bio, hire_date
      ) VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING *`,
      [first_name, last_name, email, phone, specialties, bio, hire_date]
    );

    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Create therapist error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Update therapist
export const updateTherapist = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const {
      first_name, last_name, email, phone, specialties, bio, is_active
    } = req.body;

    const result = await pool.query(
      `UPDATE spa_therapists SET
        first_name = $1, last_name = $2, email = $3, phone = $4,
        specialties = $5, bio = $6, is_active = $7,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = $8
      RETURNING *`,
      [first_name, last_name, email, phone, specialties, bio, is_active, id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Therapist not found' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Update therapist error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};


// ============================================
// BOOKINGS
// ============================================

// Get all spa bookings
export const getSpaBookings = async (req: Request, res: Response) => {
  try {
    const { status, date_from, date_to, therapist_id } = req.query;

    let query = 'SELECT * FROM v_spa_bookings_details WHERE 1=1';
    const params: any[] = [];

    if (status) {
      params.push(status);
      query += ` AND status = $${params.length}`;
    }

    if (date_from) {
      params.push(date_from);
      query += ` AND booking_date >= $${params.length}`;
    }

    if (date_to) {
      params.push(date_to);
      query += ` AND booking_date <= $${params.length}`;
    }

    if (therapist_id) {
      params.push(therapist_id);
      query += ` AND therapist_id = $${params.length}`;
    }

    query += ' ORDER BY booking_date DESC, start_time DESC';

    const result = await pool.query(query, params);
    res.json(result.rows);
  } catch (error) {
    console.error('Get spa bookings error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Create spa booking
export const createSpaBooking = async (req: Request, res: Response) => {
  const client = await pool.connect();
  try {
    const {
      guest_id, guest_name, guest_email, guest_phone,
      service_id, therapist_id, treatment_room_id,
      booking_date, start_time, end_time,
      special_requests
    } = req.body;

    const userId = (req as any).user?.id;

    await client.query('BEGIN');

    // Get service details
    const serviceResult = await client.query(
      'SELECT * FROM spa_services WHERE id = $1',
      [service_id]
    );

    if (serviceResult.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ message: 'Service not found' });
    }

    const service = serviceResult.rows[0];

    // Check therapist availability if therapist is assigned
    if (therapist_id) {
      const availabilityResult = await client.query(
        'SELECT check_therapist_availability($1, $2, $3, $4) as available',
        [therapist_id, booking_date, start_time, end_time]
      );

      if (!availabilityResult.rows[0].available) {
        await client.query('ROLLBACK');
        return res.status(400).json({ message: 'Therapist not available at this time' });
      }
    }

    // Calculate pricing
    const basePrice = parseFloat(service.price);
    const taxAmount = basePrice * 0.10;
    const totalAmount = basePrice + taxAmount;

    // Generate booking reference
    const refResult = await client.query('SELECT generate_spa_booking_reference() as ref');
    const bookingReference = refResult.rows[0].ref;

    // Create booking
    const bookingResult = await client.query(
      `INSERT INTO spa_bookings (
        booking_reference, guest_id, guest_name, guest_email, guest_phone,
        service_id, therapist_id, treatment_room_id,
        booking_date, start_time, end_time, duration,
        base_price, tax_amount, total_amount,
        special_requests, created_by
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17)
      RETURNING *`,
      [bookingReference, guest_id, guest_name, guest_email, guest_phone,
       service_id, therapist_id, treatment_room_id,
       booking_date, start_time, end_time, service.duration,
       basePrice, taxAmount, totalAmount,
       special_requests, userId]
    );

    await client.query('COMMIT');

    res.status(201).json(bookingResult.rows[0]);
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Create spa booking error:', error);
    res.status(500).json({ message: 'Server error' });
  } finally {
    client.release();
  }
};

// Update spa booking
export const updateSpaBooking = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const {
      therapist_id, treatment_room_id, booking_date, start_time, end_time,
      status, payment_status, special_requests, notes
    } = req.body;

    const result = await pool.query(
      `UPDATE spa_bookings SET
        therapist_id = $1, treatment_room_id = $2,
        booking_date = $3, start_time = $4, end_time = $5,
        status = $6, payment_status = $7,
        special_requests = $8, notes = $9,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = $10
      RETURNING *`,
      [therapist_id, treatment_room_id, booking_date, start_time, end_time,
       status, payment_status, special_requests, notes, id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Booking not found' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Update spa booking error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Cancel spa booking
export const cancelSpaBooking = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { cancellation_reason } = req.body;

    const result = await pool.query(
      `UPDATE spa_bookings SET
        status = 'cancelled',
        cancellation_reason = $1,
        cancelled_at = CURRENT_TIMESTAMP,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = $2
      RETURNING *`,
      [cancellation_reason, id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Booking not found' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Cancel spa booking error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};


// ============================================
// PRODUCTS
// ============================================

// Get all spa products
export const getSpaProducts = async (req: Request, res: Response) => {
  try {
    const { category, is_active } = req.query;

    let query = 'SELECT * FROM spa_products WHERE 1=1';
    const params: any[] = [];

    if (category) {
      params.push(category);
      query += ` AND category = $${params.length}`;
    }

    if (is_active !== undefined) {
      params.push(is_active === 'true');
      query += ` AND is_active = $${params.length}`;
    }

    query += ' ORDER BY name';

    const result = await pool.query(query, params);
    res.json(result.rows);
  } catch (error) {
    console.error('Get spa products error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Create product sale
export const createProductSale = async (req: Request, res: Response) => {
  const client = await pool.connect();
  try {
    const {
      product_id, spa_booking_id, guest_id, quantity
    } = req.body;

    const userId = (req as any).user?.id;

    await client.query('BEGIN');

    // Get product details
    const productResult = await client.query(
      'SELECT * FROM spa_products WHERE id = $1 AND is_active = true',
      [product_id]
    );

    if (productResult.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ message: 'Product not found' });
    }

    const product = productResult.rows[0];

    // Check stock
    if (product.stock_quantity < quantity) {
      await client.query('ROLLBACK');
      return res.status(400).json({ message: 'Insufficient stock' });
    }

    // Calculate total
    const unitPrice = parseFloat(product.price);
    const totalAmount = unitPrice * quantity;

    // Create sale
    const saleResult = await client.query(
      `INSERT INTO spa_product_sales (
        product_id, spa_booking_id, guest_id, quantity,
        unit_price, total_amount, sold_by
      ) VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING *`,
      [product_id, spa_booking_id, guest_id, quantity, unitPrice, totalAmount, userId]
    );

    // Update stock
    await client.query(
      'UPDATE spa_products SET stock_quantity = stock_quantity - $1 WHERE id = $2',
      [quantity, product_id]
    );

    await client.query('COMMIT');

    res.status(201).json(saleResult.rows[0]);
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Create product sale error:', error);
    res.status(500).json({ message: 'Server error' });
  } finally {
    client.release();
  }
};

// ============================================
// PACKAGES
// ============================================

// Get all spa packages
export const getSpaPackages = async (req: Request, res: Response) => {
  try {
    const result = await pool.query(
      `SELECT 
        sp.*,
        json_agg(
          json_build_object(
            'id', ss.id,
            'name', ss.name,
            'duration', ss.duration,
            'order', sps.service_order
          ) ORDER BY sps.service_order
        ) as services
       FROM spa_packages sp
       LEFT JOIN spa_package_services sps ON sp.id = sps.package_id
       LEFT JOIN spa_services ss ON sps.service_id = ss.id
       WHERE sp.is_active = true
       GROUP BY sp.id
       ORDER BY sp.name`
    );

    res.json(result.rows);
  } catch (error) {
    console.error('Get spa packages error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// ============================================
// STATISTICS
// ============================================

// Get spa statistics
export const getSpaStatistics = async (req: Request, res: Response) => {
  try {
    const { start_date, end_date } = req.query;

    // Get general statistics
    const statsResult = await pool.query('SELECT * FROM v_spa_statistics');

    // Get revenue for period
    const revenueResult = await pool.query(
      'SELECT * FROM get_spa_revenue($1, $2)',
      [start_date || new Date(), end_date || new Date()]
    );

    // Get top services
    const topServicesResult = await pool.query(
      `SELECT 
        ss.name,
        COUNT(sb.id) as booking_count,
        SUM(sb.total_amount) as revenue
       FROM spa_bookings sb
       JOIN spa_services ss ON sb.service_id = ss.id
       WHERE sb.status IN ('completed', 'in_progress')
       AND sb.booking_date >= CURRENT_DATE - INTERVAL '30 days'
       GROUP BY ss.id, ss.name
       ORDER BY booking_count DESC
       LIMIT 5`
    );

    // Get therapist performance
    const therapistPerformanceResult = await pool.query(
      `SELECT 
        st.first_name || ' ' || st.last_name as therapist_name,
        COUNT(sb.id) as booking_count,
        SUM(sb.total_amount) as revenue,
        AVG(sr.rating) as average_rating
       FROM spa_therapists st
       LEFT JOIN spa_bookings sb ON st.id = sb.therapist_id 
         AND sb.status IN ('completed', 'in_progress')
         AND sb.booking_date >= CURRENT_DATE - INTERVAL '30 days'
       LEFT JOIN spa_reviews sr ON st.id = sr.therapist_id
       WHERE st.is_active = true
       GROUP BY st.id, st.first_name, st.last_name
       ORDER BY booking_count DESC`
    );

    res.json({
      general: statsResult.rows[0],
      revenue: revenueResult.rows[0],
      topServices: topServicesResult.rows,
      therapistPerformance: therapistPerformanceResult.rows
    });
  } catch (error) {
    console.error('Get spa statistics error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Get available time slots
export const getAvailableTimeSlots = async (req: Request, res: Response) => {
  try {
    const { therapist_id, date, service_id } = req.query;

    if (!therapist_id || !date || !service_id) {
      return res.status(400).json({ message: 'Missing required parameters' });
    }

    // Get service duration
    const serviceResult = await pool.query(
      'SELECT duration, preparation_time, cleanup_time FROM spa_services WHERE id = $1',
      [service_id]
    );

    if (serviceResult.rows.length === 0) {
      return res.status(404).json({ message: 'Service not found' });
    }

    const service = serviceResult.rows[0];
    const totalDuration = service.duration + service.preparation_time + service.cleanup_time;

    // Get therapist schedule for the day
    const dayOfWeek = new Date(date as string).getDay();
    const scheduleResult = await pool.query(
      `SELECT start_time, end_time FROM spa_therapist_schedules 
       WHERE therapist_id = $1 AND day_of_week = $2 AND is_active = true`,
      [therapist_id, dayOfWeek]
    );

    if (scheduleResult.rows.length === 0) {
      return res.json({ availableSlots: [] });
    }

    const schedule = scheduleResult.rows[0];

    // Get existing bookings for the day
    const bookingsResult = await pool.query(
      `SELECT start_time, end_time FROM spa_bookings 
       WHERE therapist_id = $1 AND booking_date = $2 
       AND status IN ('confirmed', 'in_progress')
       ORDER BY start_time`,
      [therapist_id, date]
    );

    // Generate available time slots (every 30 minutes)
    const availableSlots: string[] = [];
    const startHour = parseInt(schedule.start_time.split(':')[0]);
    const endHour = parseInt(schedule.end_time.split(':')[0]);

    for (let hour = startHour; hour < endHour; hour++) {
      for (let minute = 0; minute < 60; minute += 30) {
        const slotStart = `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;
        const slotEndTime = new Date(`2000-01-01 ${slotStart}`);
        slotEndTime.setMinutes(slotEndTime.getMinutes() + totalDuration);
        const slotEnd = `${slotEndTime.getHours().toString().padStart(2, '0')}:${slotEndTime.getMinutes().toString().padStart(2, '0')}`;

        // Check if slot is within working hours
        if (slotEnd > schedule.end_time) continue;

        // Check if slot conflicts with existing bookings
        let hasConflict = false;
        for (const booking of bookingsResult.rows) {
          if (slotStart < booking.end_time && slotEnd > booking.start_time) {
            hasConflict = true;
            break;
          }
        }

        if (!hasConflict) {
          availableSlots.push(slotStart);
        }
      }
    }

    res.json({ availableSlots });
  } catch (error) {
    console.error('Get available time slots error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};
