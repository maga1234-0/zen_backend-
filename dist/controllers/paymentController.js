"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getPaymentStats = exports.getAllPayments = exports.recordSpaPayment = exports.recordRestaurantPayment = exports.recordBookingPayment = void 0;
const database_1 = __importDefault(require("../config/database"));
/**
 * Enregistrer un paiement pour une réservation de chambre
 */
const recordBookingPayment = async (req, res) => {
    const { bookingId, amount, paymentMethod, transactionId, notes } = req.body;
    try {
        // Vérifier que la réservation existe
        const bookingResult = await database_1.default.query('SELECT id, total_amount, payment_status FROM bookings WHERE id = $1', [bookingId]);
        if (bookingResult.rows.length === 0) {
            return res.status(404).json({ message: 'Réservation non trouvée' });
        }
        const booking = bookingResult.rows[0];
        // Créer le paiement
        const paymentResult = await database_1.default.query(`INSERT INTO payments (
        payment_type,
        booking_id,
        amount,
        payment_method,
        payment_status,
        payment_date,
        transaction_id,
        notes
      ) VALUES ($1, $2, $3, $4, $5, NOW(), $6, $7)
      RETURNING *`, [
            'room',
            bookingId,
            amount || booking.total_amount,
            paymentMethod || 'cash',
            'completed',
            transactionId || `TXN-${Date.now()}`,
            notes || null
        ]);
        // Vérifier si la réservation est entièrement payée
        const totalPaidResult = await database_1.default.query(`SELECT COALESCE(SUM(amount), 0) as total_paid
       FROM payments
       WHERE booking_id = $1 AND payment_status = 'completed'`, [bookingId]);
        const totalPaid = parseFloat(totalPaidResult.rows[0].total_paid);
        const bookingAmount = parseFloat(booking.total_amount);
        // Mettre à jour le statut de paiement de la réservation si entièrement payé
        if (totalPaid >= bookingAmount) {
            await database_1.default.query(`UPDATE bookings 
         SET payment_status = 'paid', 
             updated_at = NOW()
         WHERE id = $1`, [bookingId]);
        }
        else {
            await database_1.default.query(`UPDATE bookings 
         SET payment_status = 'partial', 
             updated_at = NOW()
         WHERE id = $1`, [bookingId]);
        }
        res.status(201).json({
            message: 'Paiement enregistré avec succès',
            payment: paymentResult.rows[0],
            total_paid: totalPaid
        });
    }
    catch (error) {
        console.error('Error recording booking payment:', error);
        res.status(500).json({ message: 'Erreur serveur lors de l\'enregistrement du paiement' });
    }
};
exports.recordBookingPayment = recordBookingPayment;
/**
 * Enregistrer un paiement pour une commande restaurant
 */
const recordRestaurantPayment = async (req, res) => {
    const { orderId } = req.params;
    const { amount, payment_method, notes } = req.body;
    try {
        // Vérifier que la commande existe
        const orderResult = await database_1.default.query('SELECT id, total_amount, payment_status FROM restaurant_orders WHERE id = $1', [orderId]);
        if (orderResult.rows.length === 0) {
            return res.status(404).json({ message: 'Commande restaurant non trouvée' });
        }
        const order = orderResult.rows[0];
        // Créer le paiement
        const paymentResult = await database_1.default.query(`INSERT INTO payments (
        payment_type,
        restaurant_order_id,
        amount,
        payment_method,
        payment_status,
        payment_date,
        transaction_id,
        notes
      ) VALUES ($1, $2, $3, $4, $5, NOW(), $6, $7)
      RETURNING *`, [
            'restaurant',
            orderId,
            amount || order.total_amount,
            payment_method || 'cash',
            'completed',
            `REST-${Date.now()}`,
            notes || null
        ]);
        // Mettre à jour le statut de paiement de la commande
        await database_1.default.query(`UPDATE restaurant_orders 
       SET payment_status = 'paid', 
           updated_at = NOW()
       WHERE id = $1`, [orderId]);
        res.status(201).json({
            message: 'Paiement enregistré avec succès',
            payment: paymentResult.rows[0]
        });
    }
    catch (error) {
        console.error('Error recording restaurant payment:', error);
        res.status(500).json({ message: 'Erreur serveur lors de l\'enregistrement du paiement' });
    }
};
exports.recordRestaurantPayment = recordRestaurantPayment;
/**
 * Enregistrer un paiement pour une réservation spa
 */
const recordSpaPayment = async (req, res) => {
    const { bookingId } = req.params;
    const { amount, payment_method, notes } = req.body;
    try {
        // Vérifier que la réservation spa existe
        const bookingResult = await database_1.default.query('SELECT id, total_price, payment_status FROM spa_bookings WHERE id = $1', [bookingId]);
        if (bookingResult.rows.length === 0) {
            return res.status(404).json({ message: 'Réservation spa non trouvée' });
        }
        const booking = bookingResult.rows[0];
        // Créer le paiement
        const paymentResult = await database_1.default.query(`INSERT INTO payments (
        payment_type,
        spa_booking_id,
        amount,
        payment_method,
        payment_status,
        payment_date,
        transaction_id,
        notes
      ) VALUES ($1, $2, $3, $4, $5, NOW(), $6, $7)
      RETURNING *`, [
            'spa',
            bookingId,
            amount || booking.total_price,
            payment_method || 'cash',
            'completed',
            `SPA-${Date.now()}`,
            notes || null
        ]);
        // Mettre à jour le statut de paiement de la réservation spa
        await database_1.default.query(`UPDATE spa_bookings 
       SET payment_status = 'paid', 
           updated_at = NOW()
       WHERE id = $1`, [bookingId]);
        res.status(201).json({
            message: 'Paiement enregistré avec succès',
            payment: paymentResult.rows[0]
        });
    }
    catch (error) {
        console.error('Error recording spa payment:', error);
        res.status(500).json({ message: 'Erreur serveur lors de l\'enregistrement du paiement' });
    }
};
exports.recordSpaPayment = recordSpaPayment;
/**
 * Obtenir tous les paiements (room, restaurant, spa)
 */
const getAllPayments = async (req, res) => {
    const { type } = req.query; // type: 'all', 'room', 'restaurant', 'spa'
    try {
        let query = `
      SELECT 
        p.*,
        CASE 
          WHEN p.payment_type = 'room' THEN 
            (SELECT g.first_name || ' ' || g.last_name 
             FROM bookings b 
             JOIN guests g ON b.guest_id = g.id 
             WHERE b.id = p.booking_id)
          WHEN p.payment_type = 'restaurant' THEN 
            (SELECT ro.order_number 
             FROM restaurant_orders ro 
             WHERE ro.id = p.restaurant_order_id)
          WHEN p.payment_type = 'spa' THEN 
            (SELECT sb.guest_name 
             FROM spa_bookings sb 
             WHERE sb.id = p.spa_booking_id)
        END as guest_name,
        CASE 
          WHEN p.payment_type = 'room' THEN 
            (SELECT r.room_number 
             FROM bookings b 
             JOIN rooms r ON b.room_id = r.id 
             WHERE b.id = p.booking_id)
          WHEN p.payment_type = 'restaurant' THEN 
            (SELECT 
              CASE ro.order_type
                WHEN 'room_service' THEN 'Room ' || ro.room_number::text
                WHEN 'dine_in' THEN 'Table ' || ro.table_number::text
                WHEN 'takeaway' THEN 'Take Away'
                WHEN 'bar' THEN 'Bar'
                ELSE 'Restaurant'
              END
             FROM restaurant_orders ro 
             WHERE ro.id = p.restaurant_order_id)
          WHEN p.payment_type = 'spa' THEN 
            (SELECT s.name 
             FROM spa_bookings sb
             JOIN spa_services s ON sb.service_id = s.id 
             WHERE sb.id = p.spa_booking_id)
        END as room_number
      FROM payments p
    `;
        const params = [];
        if (type && type !== 'all') {
            query += ' WHERE p.payment_type = $1';
            params.push(type);
        }
        query += ' ORDER BY p.payment_date DESC';
        const result = await database_1.default.query(query, params);
        res.json(result.rows);
    }
    catch (error) {
        console.error('Error fetching payments:', error);
        res.status(500).json({ message: 'Erreur serveur' });
    }
};
exports.getAllPayments = getAllPayments;
/**
 * Obtenir les statistiques de paiements
 */
const getPaymentStats = async (req, res) => {
    try {
        const statsResult = await database_1.default.query(`
      SELECT 
        payment_type,
        COUNT(*) as count,
        COALESCE(SUM(amount), 0) as total_amount
      FROM payments
      WHERE payment_status = 'completed'
      AND payment_date >= NOW() - INTERVAL '30 days'
      GROUP BY payment_type
    `);
        const stats = {
            room: { count: 0, total: 0 },
            restaurant: { count: 0, total: 0 },
            spa: { count: 0, total: 0 },
            total: 0
        };
        statsResult.rows.forEach(row => {
            const paymentType = row.payment_type;
            if (paymentType === 'room' || paymentType === 'restaurant' || paymentType === 'spa') {
                stats[paymentType] = {
                    count: parseInt(row.count),
                    total: parseFloat(row.total_amount)
                };
                stats.total += parseFloat(row.total_amount);
            }
        });
        res.json(stats);
    }
    catch (error) {
        console.error('Error fetching payment stats:', error);
        res.status(500).json({ message: 'Erreur serveur' });
    }
};
exports.getPaymentStats = getPaymentStats;
