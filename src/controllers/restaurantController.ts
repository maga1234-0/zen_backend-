import { Response } from 'express';
import pool from '../config/database';
import { AuthRequest } from '../middleware/auth';

// ============================================
// MENU MANAGEMENT
// ============================================

export const getMenuCategories = async (req: AuthRequest, res: Response) => {
  try {
    const result = await pool.query(
      'SELECT * FROM menu_categories WHERE is_active = true ORDER BY display_order, name'
    );
    res.json(result.rows);
  } catch (error) {
    console.error('Get menu categories error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

export const getMenuItems = async (req: AuthRequest, res: Response) => {
  try {
    const { category_id, available_only } = req.query;
    
    let query = `
      SELECT mi.*, mc.name as category_name, mc.type as category_type
      FROM menu_items mi
      LEFT JOIN menu_categories mc ON mi.category_id = mc.id
      WHERE 1=1
    `;
    const params: any[] = [];
    
    if (category_id) {
      params.push(category_id);
      query += ` AND mi.category_id = $${params.length}`;
    }
    
    if (available_only === 'true') {
      query += ' AND mi.is_available = true';
    }
    
    query += ' ORDER BY mc.display_order, mi.display_order, mi.name';
    
    const result = await pool.query(query, params);
    res.json(result.rows);
  } catch (error) {
    console.error('Get menu items error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

export const createMenuItem = async (req: AuthRequest, res: Response) => {
  try {
    const {
      category_id, name, name_fr, name_en, name_es,
      description, description_fr, description_en, description_es,
      price, cost, is_vegetarian, is_vegan, is_gluten_free,
      allergens, preparation_time, calories
    } = req.body;

    const result = await pool.query(
      `INSERT INTO menu_items 
       (category_id, name, name_fr, name_en, name_es, description, description_fr, 
        description_en, description_es, price, cost, is_vegetarian, is_vegan, 
        is_gluten_free, allergens, preparation_time, calories)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17)
       RETURNING *`,
      [category_id, name, name_fr, name_en, name_es, description, description_fr,
       description_en, description_es, price, cost, is_vegetarian, is_vegan,
       is_gluten_free, allergens, preparation_time, calories]
    );

    console.log('✅ Menu item created:', result.rows[0].name);
    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Create menu item error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};


export const updateMenuItem = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const {
      category_id, name, name_fr, name_en, name_es,
      description, description_fr, description_en, description_es,
      price, cost, is_available, is_vegetarian, is_vegan, is_gluten_free,
      allergens, preparation_time, calories
    } = req.body;

    const result = await pool.query(
      `UPDATE menu_items 
       SET category_id = $1, name = $2, name_fr = $3, name_en = $4, name_es = $5,
           description = $6, description_fr = $7, description_en = $8, description_es = $9,
           price = $10, cost = $11, is_available = $12, is_vegetarian = $13, is_vegan = $14,
           is_gluten_free = $15, allergens = $16, preparation_time = $17, calories = $18,
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $19
       RETURNING *`,
      [category_id, name, name_fr, name_en, name_es, description, description_fr,
       description_en, description_es, price, cost, is_available, is_vegetarian, is_vegan,
       is_gluten_free, allergens, preparation_time, calories, id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Menu item not found' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Update menu item error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

export const deleteMenuItem = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;

    const result = await pool.query(
      'DELETE FROM menu_items WHERE id = $1 RETURNING *',
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Menu item not found' });
    }

    res.json({ message: 'Menu item deleted successfully' });
  } catch (error) {
    console.error('Delete menu item error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// ============================================
// TABLES MANAGEMENT
// ============================================

export const getRestaurantTables = async (req: AuthRequest, res: Response) => {
  try {
    const { status, location } = req.query;
    
    let query = 'SELECT * FROM restaurant_tables WHERE 1=1';
    const params: any[] = [];
    
    if (status) {
      params.push(status);
      query += ` AND status = $${params.length}`;
    }
    
    if (location) {
      params.push(location);
      query += ` AND location = $${params.length}`;
    }
    
    query += ' ORDER BY table_number';
    
    const result = await pool.query(query, params);
    res.json(result.rows);
  } catch (error) {
    console.error('Get restaurant tables error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

export const updateTableStatus = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    const result = await pool.query(
      'UPDATE restaurant_tables SET status = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2 RETURNING *',
      [status, id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Table not found' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Update table status error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};


// ============================================
// ORDERS MANAGEMENT
// ============================================

export const getOrders = async (req: AuthRequest, res: Response) => {
  try {
    const { status, order_type, date } = req.query;
    
    let query = `
      SELECT o.*, 
             t.table_number, t.location as table_location,
             r.room_number,
             g.first_name || ' ' || g.last_name as guest_name,
             u.first_name || ' ' || u.last_name as server_name
      FROM restaurant_orders o
      LEFT JOIN restaurant_tables t ON o.table_id = t.id
      LEFT JOIN rooms r ON o.room_id = r.id
      LEFT JOIN guests g ON o.guest_id = g.id
      LEFT JOIN users u ON o.server_id = u.id
      WHERE 1=1
    `;
    const params: any[] = [];
    
    if (status) {
      params.push(status);
      query += ` AND o.status = $${params.length}`;
    }
    
    if (order_type) {
      params.push(order_type);
      query += ` AND o.order_type = $${params.length}`;
    }
    
    if (date) {
      params.push(date);
      query += ` AND DATE(o.created_at) = $${params.length}`;
    }
    
    query += ' ORDER BY o.created_at DESC';
    
    const result = await pool.query(query, params);
    res.json(result.rows);
  } catch (error) {
    console.error('Get orders error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

export const getOrderById = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    
    const orderResult = await pool.query(
      `SELECT o.*, 
              t.table_number, t.location as table_location,
              r.room_number,
              g.first_name || ' ' || g.last_name as guest_name,
              u.first_name || ' ' || u.last_name as server_name
       FROM restaurant_orders o
       LEFT JOIN restaurant_tables t ON o.table_id = t.id
       LEFT JOIN rooms r ON o.room_id = r.id
       LEFT JOIN guests g ON o.guest_id = g.id
       LEFT JOIN users u ON o.server_id = u.id
       WHERE o.id = $1`,
      [id]
    );

    if (orderResult.rows.length === 0) {
      return res.status(404).json({ message: 'Order not found' });
    }

    const itemsResult = await pool.query(
      'SELECT * FROM restaurant_order_items WHERE order_id = $1 ORDER BY created_at',
      [id]
    );

    res.json({
      ...orderResult.rows[0],
      items: itemsResult.rows
    });
  } catch (error) {
    console.error('Get order by ID error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};


export const createOrder = async (req: AuthRequest, res: Response) => {
  const client = await pool.connect();
  try {
    const {
      table_id, guest_id, room_id, booking_id, order_type,
      items, special_instructions, payment_method
    } = req.body;

    await client.query('BEGIN');

    // Generate order number
    const orderNumberResult = await client.query(
      "SELECT 'ORD-' || TO_CHAR(CURRENT_DATE, 'YYYYMMDD') || '-' || LPAD(CAST(COUNT(*) + 1 AS TEXT), 4, '0') as order_number FROM restaurant_orders WHERE DATE(created_at) = CURRENT_DATE"
    );
    const order_number = orderNumberResult.rows[0].order_number;

    // Calculate totals
    let subtotal = 0;
    for (const item of items) {
      subtotal += item.unit_price * item.quantity;
    }
    
    const tax = subtotal * 0.10; // 10% tax
    const service_charge = order_type === 'room_service' ? subtotal * 0.05 : 0; // 5% for room service
    const total_amount = subtotal + tax + service_charge;

    // Create order
    const orderResult = await client.query(
      `INSERT INTO restaurant_orders 
       (order_number, table_id, guest_id, room_id, booking_id, order_type, 
        subtotal, tax, service_charge, total_amount, special_instructions,
        payment_method, payment_status, server_id, created_by)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)
       RETURNING *`,
      [order_number, table_id, guest_id, room_id, booking_id, order_type,
       subtotal, tax, service_charge, total_amount, special_instructions,
       payment_method, payment_method === 'room_charge' ? 'charged_to_room' : 'unpaid',
       req.user?.id, req.user?.id]
    );

    const order = orderResult.rows[0];

    // Create order items
    for (const item of items) {
      await client.query(
        `INSERT INTO restaurant_order_items 
         (order_id, menu_item_id, item_name, quantity, unit_price, subtotal, special_instructions)
         VALUES ($1, $2, $3, $4, $5, $6, $7)`,
        [order.id, item.menu_item_id, item.item_name, item.quantity,
         item.unit_price, item.unit_price * item.quantity, item.special_instructions]
      );
    }

    // Update table status if dine-in
    if (order_type === 'dine_in' && table_id) {
      await client.query(
        'UPDATE restaurant_tables SET status = $1 WHERE id = $2',
        ['occupied', table_id]
      );
    }

    await client.query('COMMIT');

    console.log('✅ Order created:', order_number);
    res.status(201).json(order);
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Create order error:', error);
    res.status(500).json({ message: 'Server error' });
  } finally {
    client.release();
  }
};

export const updateOrderStatus = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    const result = await pool.query(
      `UPDATE restaurant_orders 
       SET status = $1, 
           completed_at = CASE WHEN $1 = 'completed' THEN CURRENT_TIMESTAMP ELSE completed_at END,
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $2
       RETURNING *`,
      [status, id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Order not found' });
    }

    // If order is completed, free the table
    if (status === 'completed' && result.rows[0].table_id) {
      await pool.query(
        'UPDATE restaurant_tables SET status = $1 WHERE id = $2',
        ['available', result.rows[0].table_id]
      );
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Update order status error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

export const updateOrderPayment = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { payment_status, payment_method } = req.body;

    const result = await pool.query(
      `UPDATE restaurant_orders 
       SET payment_status = $1, payment_method = $2, updated_at = CURRENT_TIMESTAMP
       WHERE id = $3
       RETURNING *`,
      [payment_status, payment_method, id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Order not found' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Update order payment error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};


// ============================================
// TABLE RESERVATIONS
// ============================================

export const getTableReservations = async (req: AuthRequest, res: Response) => {
  try {
    const { date, status } = req.query;
    
    let query = `
      SELECT tr.*, 
             rt.table_number, rt.capacity, rt.location,
             g.first_name || ' ' || g.last_name as guest_full_name
      FROM table_reservations tr
      LEFT JOIN restaurant_tables rt ON tr.table_id = rt.id
      LEFT JOIN guests g ON tr.guest_id = g.id
      WHERE 1=1
    `;
    const params: any[] = [];
    
    if (date) {
      params.push(date);
      query += ` AND tr.reservation_date = $${params.length}`;
    }
    
    if (status) {
      params.push(status);
      query += ` AND tr.status = $${params.length}`;
    }
    
    query += ' ORDER BY tr.reservation_date, tr.reservation_time';
    
    const result = await pool.query(query, params);
    res.json(result.rows);
  } catch (error) {
    console.error('Get table reservations error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

export const createTableReservation = async (req: AuthRequest, res: Response) => {
  try {
    const {
      table_id, guest_id, guest_name, guest_phone, guest_email,
      number_of_guests, reservation_date, reservation_time,
      duration_minutes, special_requests
    } = req.body;

    // Check if table is available
    const conflictCheck = await pool.query(
      `SELECT * FROM table_reservations 
       WHERE table_id = $1 
       AND reservation_date = $2 
       AND status NOT IN ('cancelled', 'completed', 'no_show')
       AND (
         (reservation_time <= $3 AND reservation_time + (duration_minutes || ' minutes')::INTERVAL > $3)
         OR
         (reservation_time < $3 + ($4 || ' minutes')::INTERVAL AND reservation_time >= $3)
       )`,
      [table_id, reservation_date, reservation_time, duration_minutes || 120]
    );

    if (conflictCheck.rows.length > 0) {
      return res.status(400).json({ message: 'Table is not available at this time' });
    }

    const result = await pool.query(
      `INSERT INTO table_reservations 
       (table_id, guest_id, guest_name, guest_phone, guest_email, number_of_guests,
        reservation_date, reservation_time, duration_minutes, special_requests, created_by)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
       RETURNING *`,
      [table_id, guest_id, guest_name, guest_phone, guest_email, number_of_guests,
       reservation_date, reservation_time, duration_minutes, special_requests, req.user?.id]
    );

    console.log('✅ Table reservation created:', result.rows[0].guest_name);
    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Create table reservation error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

export const updateReservationStatus = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    const result = await pool.query(
      'UPDATE table_reservations SET status = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2 RETURNING *',
      [status, id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Reservation not found' });
    }

    // Update table status
    if (status === 'seated') {
      await pool.query(
        'UPDATE restaurant_tables SET status = $1 WHERE id = $2',
        ['occupied', result.rows[0].table_id]
      );
    } else if (status === 'completed' || status === 'cancelled' || status === 'no_show') {
      await pool.query(
        'UPDATE restaurant_tables SET status = $1 WHERE id = $2',
        ['available', result.rows[0].table_id]
      );
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Update reservation status error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// ============================================
// STATISTICS
// ============================================

export const getRestaurantStats = async (req: AuthRequest, res: Response) => {
  try {
    const { date } = req.query;
    const targetDate = date || new Date().toISOString().split('T')[0];

    const stats = await pool.query(
      `SELECT 
         COUNT(*) FILTER (WHERE status NOT IN ('cancelled')) as total_orders,
         COUNT(*) FILTER (WHERE status = 'completed') as completed_orders,
         COUNT(*) FILTER (WHERE status IN ('pending', 'confirmed', 'preparing')) as active_orders,
         COALESCE(SUM(total_amount) FILTER (WHERE status = 'completed'), 0) as total_revenue,
         COALESCE(AVG(total_amount) FILTER (WHERE status = 'completed'), 0) as average_order_value,
         COUNT(DISTINCT guest_id) as unique_customers
       FROM restaurant_orders
       WHERE DATE(created_at) = $1`,
      [targetDate]
    );

    const tableStats = await pool.query(
      `SELECT 
         COUNT(*) as total_tables,
         COUNT(*) FILTER (WHERE status = 'available') as available_tables,
         COUNT(*) FILTER (WHERE status = 'occupied') as occupied_tables,
         COUNT(*) FILTER (WHERE status = 'reserved') as reserved_tables
       FROM restaurant_tables`
    );

    res.json({
      orders: stats.rows[0],
      tables: tableStats.rows[0]
    });
  } catch (error) {
    console.error('Get restaurant stats error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};
