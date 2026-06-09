"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getRestaurantStats = exports.deleteReservation = exports.updateReservation = exports.updateReservationStatus = exports.createTableReservation = exports.getTableReservations = exports.deleteOrder = exports.updateOrder = exports.updateOrderPayment = exports.updateOrderStatus = exports.createOrder = exports.getOrderById = exports.getOrders = exports.deleteTable = exports.updateTable = exports.createTable = exports.updateTableStatus = exports.getRestaurantTables = exports.deleteMenuItem = exports.updateMenuItem = exports.createMenuItem = exports.getMenuItems = exports.getMenuCategories = void 0;
const database_1 = __importDefault(require("../config/database"));
// ============================================
// MENU MANAGEMENT
// ============================================
const getMenuCategories = async (req, res) => {
    try {
        const result = await database_1.default.query('SELECT * FROM menu_categories WHERE is_active = true ORDER BY display_order, name');
        res.json(result.rows);
    }
    catch (error) {
        console.error('Get menu categories error:', error);
        res.status(500).json({ message: 'Server error' });
    }
};
exports.getMenuCategories = getMenuCategories;
const getMenuItems = async (req, res) => {
    try {
        const { category_id, available_only } = req.query;
        let query = `
      SELECT mi.*, mc.name as category_name, mc.type as category_type
      FROM menu_items mi
      LEFT JOIN menu_categories mc ON mi.category_id = mc.id
      WHERE 1=1
    `;
        const params = [];
        if (category_id) {
            params.push(category_id);
            query += ` AND mi.category_id = $${params.length}`;
        }
        if (available_only === 'true') {
            query += ' AND mi.is_available = true';
        }
        query += ' ORDER BY mc.display_order, mi.display_order, mi.name';
        const result = await database_1.default.query(query, params);
        res.json(result.rows);
    }
    catch (error) {
        console.error('Get menu items error:', error);
        res.status(500).json({ message: 'Server error' });
    }
};
exports.getMenuItems = getMenuItems;
const createMenuItem = async (req, res) => {
    try {
        const { category_id, name, name_fr, name_en, name_es, description, description_fr, description_en, description_es, price, cost, is_vegetarian, is_vegan, is_gluten_free, allergens, preparation_time, calories } = req.body;
        const result = await database_1.default.query(`INSERT INTO menu_items 
       (category_id, name, name_fr, name_en, name_es, description, description_fr, 
        description_en, description_es, price, cost, is_vegetarian, is_vegan, 
        is_gluten_free, allergens, preparation_time, calories)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17)
       RETURNING *`, [category_id, name, name_fr, name_en, name_es, description, description_fr,
            description_en, description_es, price, cost, is_vegetarian, is_vegan,
            is_gluten_free, allergens, preparation_time, calories]);
        console.log('✅ Menu item created:', result.rows[0].name);
        res.status(201).json(result.rows[0]);
    }
    catch (error) {
        console.error('Create menu item error:', error);
        res.status(500).json({ message: 'Server error' });
    }
};
exports.createMenuItem = createMenuItem;
const updateMenuItem = async (req, res) => {
    try {
        const { id } = req.params;
        const { category_id, name, name_fr, name_en, name_es, description, description_fr, description_en, description_es, price, cost, is_available, is_vegetarian, is_vegan, is_gluten_free, allergens, preparation_time, calories } = req.body;
        const result = await database_1.default.query(`UPDATE menu_items 
       SET category_id = $1, name = $2, name_fr = $3, name_en = $4, name_es = $5,
           description = $6, description_fr = $7, description_en = $8, description_es = $9,
           price = $10, cost = $11, is_available = $12, is_vegetarian = $13, is_vegan = $14,
           is_gluten_free = $15, allergens = $16, preparation_time = $17, calories = $18,
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $19
       RETURNING *`, [category_id, name, name_fr, name_en, name_es, description, description_fr,
            description_en, description_es, price, cost, is_available, is_vegetarian, is_vegan,
            is_gluten_free, allergens, preparation_time, calories, id]);
        if (result.rows.length === 0) {
            return res.status(404).json({ message: 'Menu item not found' });
        }
        res.json(result.rows[0]);
    }
    catch (error) {
        console.error('Update menu item error:', error);
        res.status(500).json({ message: 'Server error' });
    }
};
exports.updateMenuItem = updateMenuItem;
const deleteMenuItem = async (req, res) => {
    try {
        const { id } = req.params;
        const result = await database_1.default.query('DELETE FROM menu_items WHERE id = $1 RETURNING *', [id]);
        if (result.rows.length === 0) {
            return res.status(404).json({ message: 'Menu item not found' });
        }
        res.json({ message: 'Menu item deleted successfully' });
    }
    catch (error) {
        console.error('Delete menu item error:', error);
        res.status(500).json({ message: 'Server error' });
    }
};
exports.deleteMenuItem = deleteMenuItem;
// ============================================
// TABLES MANAGEMENT
// ============================================
const getRestaurantTables = async (req, res) => {
    try {
        const { status, location } = req.query;
        let query = 'SELECT * FROM restaurant_tables WHERE 1=1';
        const params = [];
        if (status) {
            params.push(status);
            query += ` AND status = $${params.length}`;
        }
        if (location) {
            params.push(location);
            query += ` AND location = $${params.length}`;
        }
        query += ' ORDER BY table_number';
        const result = await database_1.default.query(query, params);
        res.json(result.rows);
    }
    catch (error) {
        console.error('Get restaurant tables error:', error);
        res.status(500).json({ message: 'Server error' });
    }
};
exports.getRestaurantTables = getRestaurantTables;
const updateTableStatus = async (req, res) => {
    try {
        const { id } = req.params;
        const { status } = req.body;
        const result = await database_1.default.query('UPDATE restaurant_tables SET status = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2 RETURNING *', [status, id]);
        if (result.rows.length === 0) {
            return res.status(404).json({ message: 'Table not found' });
        }
        res.json(result.rows[0]);
    }
    catch (error) {
        console.error('Update table status error:', error);
        res.status(500).json({ message: 'Server error' });
    }
};
exports.updateTableStatus = updateTableStatus;
const createTable = async (req, res) => {
    try {
        const { table_number, capacity, location, notes } = req.body;
        // Check if table number already exists
        const existingTable = await database_1.default.query('SELECT id FROM restaurant_tables WHERE table_number = $1', [table_number]);
        if (existingTable.rows.length > 0) {
            return res.status(400).json({ message: 'Table number already exists' });
        }
        const result = await database_1.default.query(`INSERT INTO restaurant_tables (table_number, capacity, location, notes, status)
       VALUES ($1, $2, $3, $4, 'available')
       RETURNING *`, [table_number, capacity, location, notes || null]);
        res.status(201).json(result.rows[0]);
    }
    catch (error) {
        console.error('Create table error:', error);
        res.status(500).json({ message: 'Server error' });
    }
};
exports.createTable = createTable;
const updateTable = async (req, res) => {
    try {
        const { id } = req.params;
        const { table_number, capacity, location, notes } = req.body;
        // Check if new table number already exists (excluding current table)
        const existingTable = await database_1.default.query('SELECT id FROM restaurant_tables WHERE table_number = $1 AND id != $2', [table_number, id]);
        if (existingTable.rows.length > 0) {
            return res.status(400).json({ message: 'Table number already exists' });
        }
        const result = await database_1.default.query(`UPDATE restaurant_tables 
       SET table_number = $1, capacity = $2, location = $3, notes = $4, updated_at = CURRENT_TIMESTAMP
       WHERE id = $5
       RETURNING *`, [table_number, capacity, location, notes || null, id]);
        if (result.rows.length === 0) {
            return res.status(404).json({ message: 'Table not found' });
        }
        res.json(result.rows[0]);
    }
    catch (error) {
        console.error('Update table error:', error);
        res.status(500).json({ message: 'Server error' });
    }
};
exports.updateTable = updateTable;
const deleteTable = async (req, res) => {
    try {
        const { id } = req.params;
        // Check if table has active reservations or orders
        const activeReservations = await database_1.default.query(`SELECT id FROM table_reservations 
       WHERE table_id = $1 AND status IN ('pending', 'confirmed', 'seated')`, [id]);
        if (activeReservations.rows.length > 0) {
            return res.status(400).json({
                message: 'Cannot delete table with active reservations. Please cancel reservations first.'
            });
        }
        const activeOrders = await database_1.default.query(`SELECT id FROM restaurant_orders 
       WHERE table_id = $1 AND status NOT IN ('completed', 'cancelled')`, [id]);
        if (activeOrders.rows.length > 0) {
            return res.status(400).json({
                message: 'Cannot delete table with active orders. Please complete orders first.'
            });
        }
        const result = await database_1.default.query('DELETE FROM restaurant_tables WHERE id = $1 RETURNING *', [id]);
        if (result.rows.length === 0) {
            return res.status(404).json({ message: 'Table not found' });
        }
        res.json({ message: 'Table deleted successfully', table: result.rows[0] });
    }
    catch (error) {
        console.error('Delete table error:', error);
        res.status(500).json({ message: 'Server error' });
    }
};
exports.deleteTable = deleteTable;
// ============================================
// ORDERS MANAGEMENT
// ============================================
const getOrders = async (req, res) => {
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
        const params = [];
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
        const result = await database_1.default.query(query, params);
        res.json(result.rows);
    }
    catch (error) {
        console.error('Get orders error:', error);
        res.status(500).json({ message: 'Server error' });
    }
};
exports.getOrders = getOrders;
const getOrderById = async (req, res) => {
    try {
        const { id } = req.params;
        const orderResult = await database_1.default.query(`SELECT o.*, 
              t.table_number, t.location as table_location,
              r.room_number,
              g.first_name || ' ' || g.last_name as guest_name,
              u.first_name || ' ' || u.last_name as server_name
       FROM restaurant_orders o
       LEFT JOIN restaurant_tables t ON o.table_id = t.id
       LEFT JOIN rooms r ON o.room_id = r.id
       LEFT JOIN guests g ON o.guest_id = g.id
       LEFT JOIN users u ON o.server_id = u.id
       WHERE o.id = $1`, [id]);
        if (orderResult.rows.length === 0) {
            return res.status(404).json({ message: 'Order not found' });
        }
        const itemsResult = await database_1.default.query('SELECT * FROM restaurant_order_items WHERE order_id = $1 ORDER BY created_at', [id]);
        res.json({
            ...orderResult.rows[0],
            items: itemsResult.rows
        });
    }
    catch (error) {
        console.error('Get order by ID error:', error);
        res.status(500).json({ message: 'Server error' });
    }
};
exports.getOrderById = getOrderById;
const createOrder = async (req, res) => {
    const client = await database_1.default.connect();
    try {
        const { table_id, guest_id, room_id, booking_id, order_type, items, special_instructions, payment_method } = req.body;
        await client.query('BEGIN');
        // Generate order number
        const orderNumberResult = await client.query("SELECT 'ORD-' || TO_CHAR(CURRENT_DATE, 'YYYYMMDD') || '-' || LPAD(CAST(COUNT(*) + 1 AS TEXT), 4, '0') as order_number FROM restaurant_orders WHERE DATE(created_at) = CURRENT_DATE");
        const order_number = orderNumberResult.rows[0].order_number;
        // Calculate totals
        let subtotal = 0;
        for (const item of items) {
            subtotal += item.unit_price * item.quantity;
        }
        const tax = subtotal * 0.10; // 10% tax
        const service_charge = order_type === 'room_service' ? subtotal * 0.15 : 0; // 15% for room service
        const total_amount = subtotal + tax + service_charge;
        // Determine payment method and status
        const finalPaymentMethod = payment_method || (order_type === 'room_service' ? 'room_charge' : null);
        const paymentStatus = order_type === 'room_service' ? 'charged_to_room' : 'unpaid';
        // Convert empty strings to null for UUID fields
        const cleanTableId = table_id && table_id.trim() !== '' ? table_id : null;
        const cleanGuestId = guest_id && guest_id.trim() !== '' ? guest_id : null;
        const cleanRoomId = room_id && room_id.trim() !== '' ? room_id : null;
        const cleanBookingId = booking_id && booking_id.trim() !== '' ? booking_id : null;
        // Create order
        const orderResult = await client.query(`INSERT INTO restaurant_orders 
       (order_number, table_id, guest_id, room_id, booking_id, order_type, 
        subtotal, tax, service_charge, total_amount, special_instructions,
        payment_method, payment_status, server_id, created_by)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)
       RETURNING *`, [order_number, cleanTableId, cleanGuestId, cleanRoomId, cleanBookingId, order_type,
            subtotal, tax, service_charge, total_amount, special_instructions,
            finalPaymentMethod, paymentStatus,
            req.user?.id, req.user?.id]);
        const order = orderResult.rows[0];
        // Create order items
        for (const item of items) {
            await client.query(`INSERT INTO restaurant_order_items 
         (order_id, menu_item_id, item_name, quantity, unit_price, subtotal, special_instructions)
         VALUES ($1, $2, $3, $4, $5, $6, $7)`, [order.id, item.menu_item_id, item.item_name, item.quantity,
                item.unit_price, item.unit_price * item.quantity, item.special_instructions || '']);
        }
        // Update table status if dine-in
        if (order_type === 'dine_in' && table_id) {
            await client.query('UPDATE restaurant_tables SET status = $1 WHERE id = $2', ['occupied', table_id]);
        }
        await client.query('COMMIT');
        console.log('✅ Order created:', order_number);
        res.status(201).json(order);
    }
    catch (error) {
        await client.query('ROLLBACK');
        console.error('Create order error:', error);
        console.error('Error details:', error);
        res.status(500).json({ message: 'Server error', error: error instanceof Error ? error.message : 'Unknown error' });
    }
    finally {
        client.release();
    }
};
exports.createOrder = createOrder;
const updateOrderStatus = async (req, res) => {
    try {
        const { id } = req.params;
        const { status } = req.body;
        const result = await database_1.default.query(`UPDATE restaurant_orders 
       SET status = $1, 
           completed_at = CASE WHEN $1 = 'completed' THEN CURRENT_TIMESTAMP ELSE completed_at END,
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $2
       RETURNING *`, [status, id]);
        if (result.rows.length === 0) {
            return res.status(404).json({ message: 'Order not found' });
        }
        // If order is completed, free the table
        if (status === 'completed' && result.rows[0].table_id) {
            await database_1.default.query('UPDATE restaurant_tables SET status = $1 WHERE id = $2', ['available', result.rows[0].table_id]);
        }
        res.json(result.rows[0]);
    }
    catch (error) {
        console.error('Update order status error:', error);
        res.status(500).json({ message: 'Server error' });
    }
};
exports.updateOrderStatus = updateOrderStatus;
const updateOrderPayment = async (req, res) => {
    try {
        const { id } = req.params;
        const { payment_status, payment_method } = req.body;
        const result = await database_1.default.query(`UPDATE restaurant_orders 
       SET payment_status = $1, payment_method = $2, updated_at = CURRENT_TIMESTAMP
       WHERE id = $3
       RETURNING *`, [payment_status, payment_method, id]);
        if (result.rows.length === 0) {
            return res.status(404).json({ message: 'Order not found' });
        }
        res.json(result.rows[0]);
    }
    catch (error) {
        console.error('Update order payment error:', error);
        res.status(500).json({ message: 'Server error' });
    }
};
exports.updateOrderPayment = updateOrderPayment;
/**
 * Update order details (table, special instructions, etc.)
 */
const updateOrder = async (req, res) => {
    const client = await database_1.default.connect();
    try {
        const { id } = req.params;
        const { table_id, special_instructions, items } = req.body;
        await client.query('BEGIN');
        // Get current order
        const currentOrder = await client.query('SELECT * FROM restaurant_orders WHERE id = $1', [id]);
        if (currentOrder.rows.length === 0) {
            await client.query('ROLLBACK');
            return res.status(404).json({ message: 'Order not found' });
        }
        const order = currentOrder.rows[0];
        // Update order basic info
        const cleanTableId = table_id && table_id.trim() !== '' ? table_id : null;
        await client.query(`UPDATE restaurant_orders 
       SET table_id = COALESCE($1, table_id),
           special_instructions = COALESCE($2, special_instructions),
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $3`, [cleanTableId, special_instructions, id]);
        // If items are provided, update them
        if (items && items.length > 0) {
            // Delete old items
            await client.query('DELETE FROM restaurant_order_items WHERE order_id = $1', [id]);
            // Calculate new totals
            let subtotal = 0;
            for (const item of items) {
                subtotal += item.unit_price * item.quantity;
                // Insert new items
                await client.query(`INSERT INTO restaurant_order_items 
           (order_id, menu_item_id, item_name, quantity, unit_price, subtotal, special_instructions)
           VALUES ($1, $2, $3, $4, $5, $6, $7)`, [id, item.menu_item_id, item.item_name, item.quantity,
                    item.unit_price, item.unit_price * item.quantity, item.special_instructions || '']);
            }
            // Update order totals
            const tax = subtotal * 0.10;
            const service_charge = order.order_type === 'room_service' ? subtotal * 0.15 : 0;
            const total_amount = subtotal + tax + service_charge;
            await client.query(`UPDATE restaurant_orders 
         SET subtotal = $1, tax = $2, service_charge = $3, total_amount = $4
         WHERE id = $5`, [subtotal, tax, service_charge, total_amount, id]);
        }
        // Update table status if table changed
        if (table_id && table_id !== order.table_id) {
            // Free old table
            if (order.table_id) {
                await client.query('UPDATE restaurant_tables SET status = $1 WHERE id = $2', ['available', order.table_id]);
            }
            // Occupy new table
            if (order.order_type === 'dine_in' && table_id) {
                await client.query('UPDATE restaurant_tables SET status = $1 WHERE id = $2', ['occupied', table_id]);
            }
        }
        await client.query('COMMIT');
        // Fetch updated order with all details
        const updatedOrder = await client.query(`SELECT o.*, 
              t.table_number, t.location as table_location,
              u.first_name || ' ' || u.last_name as server_name
       FROM restaurant_orders o
       LEFT JOIN restaurant_tables t ON o.table_id = t.id
       LEFT JOIN users u ON o.server_id = u.id
       WHERE o.id = $1`, [id]);
        console.log('✅ Order updated:', updatedOrder.rows[0].order_number);
        res.json(updatedOrder.rows[0]);
    }
    catch (error) {
        await client.query('ROLLBACK');
        console.error('Update order error:', error);
        res.status(500).json({ message: 'Server error', error: error instanceof Error ? error.message : 'Unknown error' });
    }
    finally {
        client.release();
    }
};
exports.updateOrder = updateOrder;
/**
 * Delete an order
 */
const deleteOrder = async (req, res) => {
    const client = await database_1.default.connect();
    try {
        const { id } = req.params;
        await client.query('BEGIN');
        // Get order details before deletion
        const order = await client.query('SELECT table_id, order_number, order_type FROM restaurant_orders WHERE id = $1', [id]);
        if (order.rows.length === 0) {
            await client.query('ROLLBACK');
            return res.status(404).json({ message: 'Order not found' });
        }
        const { table_id, order_number, order_type } = order.rows[0];
        // Delete order items first (foreign key constraint)
        await client.query('DELETE FROM restaurant_order_items WHERE order_id = $1', [id]);
        // Delete the order
        await client.query('DELETE FROM restaurant_orders WHERE id = $1', [id]);
        // Free the table if it was occupied
        if (table_id && order_type === 'dine_in') {
            await client.query('UPDATE restaurant_tables SET status = $1 WHERE id = $2', ['available', table_id]);
        }
        await client.query('COMMIT');
        console.log('✅ Order deleted:', order_number);
        res.json({
            message: 'Order deleted successfully',
            order_number,
            table_freed: !!table_id
        });
    }
    catch (error) {
        await client.query('ROLLBACK');
        console.error('Delete order error:', error);
        res.status(500).json({ message: 'Server error', error: error instanceof Error ? error.message : 'Unknown error' });
    }
    finally {
        client.release();
    }
};
exports.deleteOrder = deleteOrder;
// ============================================
// TABLE RESERVATIONS
// ============================================
const getTableReservations = async (req, res) => {
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
        const params = [];
        if (date) {
            params.push(date);
            query += ` AND tr.reservation_date = $${params.length}`;
        }
        if (status) {
            params.push(status);
            query += ` AND tr.status = $${params.length}`;
        }
        query += ' ORDER BY tr.reservation_date, tr.reservation_time';
        const result = await database_1.default.query(query, params);
        res.json(result.rows);
    }
    catch (error) {
        console.error('Get table reservations error:', error);
        res.status(500).json({ message: 'Server error' });
    }
};
exports.getTableReservations = getTableReservations;
const createTableReservation = async (req, res) => {
    try {
        const { table_id, guest_id, guest_name, guest_phone, guest_email, number_of_guests, reservation_date, reservation_time, duration_minutes, special_requests } = req.body;
        // Check if table is available
        const conflictCheck = await database_1.default.query(`SELECT * FROM table_reservations 
       WHERE table_id = $1 
       AND reservation_date = $2 
       AND status NOT IN ('cancelled', 'completed', 'no_show')
       AND (
         (reservation_time <= $3 AND reservation_time + (duration_minutes || ' minutes')::INTERVAL > $3)
         OR
         (reservation_time < $3 + ($4 || ' minutes')::INTERVAL AND reservation_time >= $3)
       )`, [table_id, reservation_date, reservation_time, duration_minutes || 120]);
        if (conflictCheck.rows.length > 0) {
            return res.status(400).json({ message: 'Table is not available at this time' });
        }
        const result = await database_1.default.query(`INSERT INTO table_reservations 
       (table_id, guest_id, guest_name, guest_phone, guest_email, number_of_guests,
        reservation_date, reservation_time, duration_minutes, special_requests, created_by)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
       RETURNING *`, [table_id, guest_id, guest_name, guest_phone, guest_email, number_of_guests,
            reservation_date, reservation_time, duration_minutes, special_requests, req.user?.id]);
        console.log('✅ Table reservation created:', result.rows[0].guest_name);
        res.status(201).json(result.rows[0]);
    }
    catch (error) {
        console.error('Create table reservation error:', error);
        res.status(500).json({ message: 'Server error' });
    }
};
exports.createTableReservation = createTableReservation;
const updateReservationStatus = async (req, res) => {
    try {
        const { id } = req.params;
        const { status } = req.body;
        const result = await database_1.default.query('UPDATE table_reservations SET status = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2 RETURNING *', [status, id]);
        if (result.rows.length === 0) {
            return res.status(404).json({ message: 'Reservation not found' });
        }
        // Update table status
        if (status === 'seated') {
            await database_1.default.query('UPDATE restaurant_tables SET status = $1 WHERE id = $2', ['occupied', result.rows[0].table_id]);
        }
        else if (status === 'completed' || status === 'cancelled' || status === 'no_show') {
            await database_1.default.query('UPDATE restaurant_tables SET status = $1 WHERE id = $2', ['available', result.rows[0].table_id]);
        }
        res.json(result.rows[0]);
    }
    catch (error) {
        console.error('Update reservation status error:', error);
        res.status(500).json({ message: 'Server error' });
    }
};
exports.updateReservationStatus = updateReservationStatus;
/**
 * Update a complete reservation (status, date/time, guests, etc.)
 */
const updateReservation = async (req, res) => {
    try {
        const { id } = req.params;
        const { table_id, guest_name, guest_phone, guest_email, number_of_guests, reservation_date, reservation_time, duration_minutes, status, special_requests, arrived_at } = req.body;
        // Get current reservation to check table_id changes
        const currentReservation = await database_1.default.query('SELECT table_id, reservation_date, reservation_time, duration_minutes, status FROM table_reservations WHERE id = $1', [id]);
        if (currentReservation.rows.length === 0) {
            return res.status(404).json({ message: 'Reservation not found' });
        }
        const oldTableId = currentReservation.rows[0].table_id;
        const oldStatus = currentReservation.rows[0].status;
        // If table_id, date, or time is changing, check for conflicts
        if (table_id && (table_id !== oldTableId ||
            reservation_date !== currentReservation.rows[0].reservation_date ||
            reservation_time !== currentReservation.rows[0].reservation_time)) {
            const conflictCheck = await database_1.default.query(`SELECT id FROM table_reservations 
         WHERE table_id = $1 
         AND id != $2
         AND reservation_date = $3 
         AND status NOT IN ('cancelled', 'completed', 'no_show')
         AND (
           (reservation_time <= $4 AND reservation_time + (duration_minutes || ' minutes')::INTERVAL > $4)
           OR
           (reservation_time < $4 + ($5 || ' minutes')::INTERVAL AND reservation_time >= $4)
         )`, [table_id, id, reservation_date, reservation_time, duration_minutes || 120]);
            if (conflictCheck.rows.length > 0) {
                return res.status(400).json({ message: 'Table is not available at this time' });
            }
        }
        // Set arrived_at to now if status is being changed to 'seated' and arrived_at is not provided
        let finalArrivedAt = arrived_at;
        if (status === 'seated' && !arrived_at && oldStatus !== 'seated') {
            finalArrivedAt = new Date().toISOString();
        }
        // Update reservation
        const result = await database_1.default.query(`UPDATE table_reservations 
       SET table_id = COALESCE($1, table_id),
           guest_name = COALESCE($2, guest_name),
           guest_phone = COALESCE($3, guest_phone),
           guest_email = COALESCE($4, guest_email),
           number_of_guests = COALESCE($5, number_of_guests),
           reservation_date = COALESCE($6, reservation_date),
           reservation_time = COALESCE($7, reservation_time),
           duration_minutes = COALESCE($8, duration_minutes),
           status = COALESCE($9, status),
           special_requests = COALESCE($10, special_requests),
           arrived_at = COALESCE($11, arrived_at),
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $12
       RETURNING *`, [
            table_id, guest_name, guest_phone, guest_email, number_of_guests,
            reservation_date, reservation_time, duration_minutes, status, special_requests,
            finalArrivedAt, id
        ]);
        console.log('✅ Reservation updated:', result.rows[0].guest_name);
        res.json(result.rows[0]);
    }
    catch (error) {
        console.error('Update reservation error:', error);
        res.status(500).json({ message: 'Server error' });
    }
};
exports.updateReservation = updateReservation;
/**
 * Delete a reservation and free the table
 */
const deleteReservation = async (req, res) => {
    const client = await database_1.default.connect();
    try {
        const { id } = req.params;
        await client.query('BEGIN');
        // Get reservation details before deletion
        const reservation = await client.query('SELECT table_id, guest_name FROM table_reservations WHERE id = $1', [id]);
        if (reservation.rows.length === 0) {
            await client.query('ROLLBACK');
            return res.status(404).json({ message: 'Reservation not found' });
        }
        const { table_id, guest_name } = reservation.rows[0];
        // Delete the reservation
        await client.query('DELETE FROM table_reservations WHERE id = $1', [id]);
        // Free the table if it was reserved
        if (table_id) {
            await client.query(`UPDATE restaurant_tables 
         SET status = 'available', updated_at = CURRENT_TIMESTAMP 
         WHERE id = $1`, [table_id]);
        }
        await client.query('COMMIT');
        console.log('✅ Reservation deleted:', guest_name);
        res.json({
            message: 'Reservation deleted successfully',
            guest_name,
            table_freed: !!table_id
        });
    }
    catch (error) {
        await client.query('ROLLBACK');
        console.error('Delete reservation error:', error);
        res.status(500).json({ message: 'Server error' });
    }
    finally {
        client.release();
    }
};
exports.deleteReservation = deleteReservation;
// ============================================
// STATISTICS
// ============================================
const getRestaurantStats = async (req, res) => {
    try {
        const { date } = req.query;
        const targetDate = date || new Date().toISOString().split('T')[0];
        const stats = await database_1.default.query(`SELECT 
         COUNT(*) FILTER (WHERE status NOT IN ('cancelled')) as total_orders,
         COUNT(*) FILTER (WHERE status = 'completed') as completed_orders,
         COUNT(*) FILTER (WHERE status IN ('pending', 'confirmed', 'preparing')) as active_orders,
         COALESCE(SUM(total_amount) FILTER (WHERE status = 'completed'), 0) as total_revenue,
         COALESCE(AVG(total_amount) FILTER (WHERE status = 'completed'), 0) as average_order_value,
         COUNT(DISTINCT guest_id) as unique_customers
       FROM restaurant_orders
       WHERE DATE(created_at) = $1`, [targetDate]);
        const tableStats = await database_1.default.query(`SELECT 
         COUNT(*) as total_tables,
         COUNT(*) FILTER (WHERE status = 'available') as available_tables,
         COUNT(*) FILTER (WHERE status = 'occupied') as occupied_tables,
         COUNT(*) FILTER (WHERE status = 'reserved') as reserved_tables
       FROM restaurant_tables`);
        res.json({
            orders: stats.rows[0],
            tables: tableStats.rows[0]
        });
    }
    catch (error) {
        console.error('Get restaurant stats error:', error);
        res.status(500).json({ message: 'Server error' });
    }
};
exports.getRestaurantStats = getRestaurantStats;
