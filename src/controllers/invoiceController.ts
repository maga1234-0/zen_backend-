import { Response } from 'express';
import pool from '../config/database';
import { AuthRequest } from '../middleware/auth';

/**
 * Obtenir la facture consolidée d'une réservation
 * Inclut: Chambre + Room Service + Spa
 */
export const getBookingInvoice = async (req: AuthRequest, res: Response) => {
  const { bookingId } = req.params;

  try {
    // 1. Récupérer les infos de la réservation
    const bookingResult = await pool.query(`
      SELECT 
        b.id,
        b.check_in_date,
        b.check_out_date,
        b.total_amount as room_total,
        b.status,
        g.first_name || ' ' || g.last_name as guest_name,
        g.email as guest_email,
        g.phone as guest_phone,
        r.room_number,
        rt.name as room_type,
        rt.price_per_night
      FROM bookings b
      JOIN guests g ON b.guest_id = g.id
      JOIN rooms r ON b.room_id = r.id
      JOIN room_types rt ON r.room_type_id = rt.id
      WHERE b.id = $1
    `, [bookingId]);

    if (bookingResult.rows.length === 0) {
      return res.status(404).json({ message: 'Réservation non trouvée' });
    }

    const booking = bookingResult.rows[0];

    // 2. Récupérer les commandes restaurant (room service) pour cette réservation
    const restaurantResult = await pool.query(`
      SELECT 
        ro.id,
        ro.order_number,
        ro.order_type,
        ro.total_amount,
        ro.payment_status,
        ro.created_at,
        json_agg(
          json_build_object(
            'item_name', roi.item_name,
            'quantity', roi.quantity,
            'unit_price', roi.unit_price,
            'total', roi.quantity * roi.unit_price
          )
        ) as items
      FROM restaurant_orders ro
      LEFT JOIN restaurant_order_items roi ON ro.id = roi.order_id
      WHERE ro.booking_id = $1
      GROUP BY ro.id, ro.order_number, ro.order_type, ro.total_amount, ro.payment_status, ro.created_at
      ORDER BY ro.created_at
    `, [bookingId]);

    // 3. Récupérer les réservations spa pour cette réservation
    const spaResult = await pool.query(`
      SELECT 
        sb.id,
        sb.booking_reference,
        sb.booking_date,
        sb.start_time,
        sb.total_amount,
        sb.payment_status,
        COALESCE(ss.name, sp.name) as service_name,
        t.first_name || ' ' || t.last_name as therapist_name
      FROM spa_bookings sb
      LEFT JOIN spa_services ss ON sb.treatment_id = ss.id
      LEFT JOIN spa_packages sp ON sb.package_id = sp.id
      LEFT JOIN spa_therapists t ON sb.therapist_id = t.id
      WHERE sb.booking_id = $1
      ORDER BY sb.booking_date, sb.start_time
    `, [bookingId]);

    // 4. Calculer les totaux
    const restaurantTotal = restaurantResult.rows.reduce((sum, order) => 
      sum + parseFloat(order.total_amount || 0), 0
    );

    const spaTotal = spaResult.rows.reduce((sum, booking) => 
      sum + parseFloat(booking.total_amount || 0), 0
    );

    const grandTotal = parseFloat(booking.room_total || 0) + restaurantTotal + spaTotal;

    // 5. Vérifier si déjà payé
    const paymentResult = await pool.query(`
      SELECT 
        SUM(amount) as total_paid
      FROM payments
      WHERE booking_id = $1 AND payment_status = 'completed'
    `, [bookingId]);

    const totalPaid = parseFloat(paymentResult.rows[0]?.total_paid || 0);
    const balance = grandTotal - totalPaid;

    // 6. Construire la facture
    const invoice = {
      booking: {
        id: booking.id,
        check_in_date: booking.check_in_date,
        check_out_date: booking.check_out_date,
        guest_name: booking.guest_name,
        guest_email: booking.guest_email,
        guest_phone: booking.guest_phone,
        room_number: booking.room_number,
        room_type: booking.room_type,
        price_per_night: booking.price_per_night,
        status: booking.status,
      },
      charges: {
        room: {
          description: `Chambre ${booking.room_number} - ${booking.room_type}`,
          amount: parseFloat(booking.room_total || 0),
          details: {
            check_in: booking.check_in_date,
            check_out: booking.check_out_date,
            price_per_night: parseFloat(booking.price_per_night || 0),
          }
        },
        restaurant: {
          total: restaurantTotal,
          orders: restaurantResult.rows.map(order => ({
            id: order.id,
            order_number: order.order_number,
            order_type: order.order_type,
            amount: parseFloat(order.total_amount || 0),
            payment_status: order.payment_status,
            date: order.created_at,
            items: order.items || [],
          }))
        },
        spa: {
          total: spaTotal,
          bookings: spaResult.rows.map(booking => ({
            id: booking.id,
            reference: booking.booking_reference,
            service_name: booking.service_name,
            therapist: booking.therapist_name,
            date: booking.booking_date,
            time: booking.start_time,
            amount: parseFloat(booking.total_amount || 0),
            payment_status: booking.payment_status,
          }))
        }
      },
      summary: {
        room_charges: parseFloat(booking.room_total || 0),
        restaurant_charges: restaurantTotal,
        spa_charges: spaTotal,
        subtotal: grandTotal,
        tax: 0,
        grand_total: grandTotal,
        total_paid: totalPaid,
        balance: balance,
      }
    };

    res.json(invoice);
  } catch (error) {
    console.error('Error fetching booking invoice:', error);
    res.status(500).json({ message: 'Erreur serveur' });
  }
};

export const payBookingInvoice = async (req: AuthRequest, res: Response) => {
  const { bookingId } = req.params;
  const { amount, payment_method, notes } = req.body;

  try {
    const bookingResult = await pool.query(
      'SELECT id, total_amount FROM bookings WHERE id = $1',
      [bookingId]
    );

    if (bookingResult.rows.length === 0) {
      return res.status(404).json({ message: 'Réservation non trouvée' });
    }

    const paymentResult = await pool.query(`
      INSERT INTO payments (
        booking_id,
        amount,
        payment_method,
        payment_status,
        payment_date,
        transaction_id,
        notes
      ) VALUES ($1, $2, $3, $4, NOW(), $5, $6)
      RETURNING *
    `, [
      bookingId,
      amount,
      payment_method || 'cash',
      'completed',
      `INV-${Date.now()}`,
      notes || null
    ]);

    const totalPaidResult = await pool.query(`
      SELECT SUM(amount) as total_paid
      FROM payments
      WHERE booking_id = $1 AND payment_status = 'completed'
    `, [bookingId]);

    const totalPaid = parseFloat(totalPaidResult.rows[0]?.total_paid || 0);
    
    res.status(201).json({
      message: 'Paiement enregistré avec succès',
      payment: paymentResult.rows[0],
      total_paid: totalPaid,
    });
  } catch (error) {
    console.error('Error paying invoice:', error);
    res.status(500).json({ message: 'Erreur serveur' });
  }
};

export const getUnpaidInvoices = async (req: AuthRequest, res: Response) => {
  try {
    const result = await pool.query(`
      SELECT 
        b.id as booking_id,
        b.check_in_date,
        b.check_out_date,
        b.total_amount as room_total,
        b.status,
        g.first_name || ' ' || g.last_name as guest_name,
        r.room_number,
        rt.name as room_type,
        (
          SELECT COALESCE(SUM(ro.total_amount), 0)
          FROM restaurant_orders ro
          WHERE ro.booking_id = b.id
        ) as restaurant_total,
        (
          SELECT COALESCE(SUM(sb.total_amount), 0)
          FROM spa_bookings sb
          WHERE sb.booking_id = b.id
        ) as spa_total,
        (
          SELECT COALESCE(SUM(p.amount), 0)
          FROM payments p
          WHERE p.booking_id = b.id AND p.payment_status = 'completed'
        ) as total_paid
      FROM bookings b
      JOIN guests g ON b.guest_id = g.id
      JOIN rooms r ON b.room_id = r.id
      JOIN room_types rt ON r.room_type_id = rt.id
      WHERE b.status IN ('checked_in', 'checked_out')
      ORDER BY b.check_out_date DESC
    `);

    const invoices = result.rows.map(row => {
      const roomTotal = parseFloat(row.room_total || 0);
      const restaurantTotal = parseFloat(row.restaurant_total || 0);
      const spaTotal = parseFloat(row.spa_total || 0);
      const totalPaid = parseFloat(row.total_paid || 0);
      const grandTotal = roomTotal + restaurantTotal + spaTotal;
      const balance = grandTotal - totalPaid;

      return {
        booking_id: row.booking_id,
        guest_name: row.guest_name,
        room_number: row.room_number,
        room_type: row.room_type,
        check_in_date: row.check_in_date,
        check_out_date: row.check_out_date,
        status: row.status,
        charges: {
          room: roomTotal,
          restaurant: restaurantTotal,
          spa: spaTotal,
        },
        grand_total: grandTotal,
        total_paid: totalPaid,
        balance: balance,
        is_paid: balance <= 0,
      };
    }).filter(invoice => invoice.balance > 0);

    res.json(invoices);
  } catch (error) {
    console.error('Error fetching unpaid invoices:', error);
    res.status(500).json({ message: 'Erreur serveur' });
  }
};
