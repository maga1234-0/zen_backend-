import { Response } from 'express';
import pool from '../config/database';
import { AuthRequest } from '../middleware/auth';

/**
 * Obtenir TOUS les achats d'un client (Restaurant + Spa + Chambre)
 * Basé sur guest_id au lieu de booking_id
 */
export const getGuestInvoice = async (req: AuthRequest, res: Response) => {
  const { guestId } = req.params;

  try {
    // 1. Récupérer les infos du client
    const guestResult = await pool.query(`
      SELECT 
        id,
        first_name,
        last_name,
        email,
        phone,
        created_at
      FROM guests
      WHERE id = $1
    `, [guestId]);

    if (guestResult.rows.length === 0) {
      return res.status(404).json({ message: 'Client non trouvé' });
    }

    const guest = guestResult.rows[0];

    // 2. Récupérer TOUTES les commandes restaurant du client
    const restaurantResult = await pool.query(`
      SELECT 
        ro.id,
        ro.order_number,
        ro.order_type,
        ro.total_amount,
        ro.payment_status,
        ro.created_at,
        ro.booking_id,
        json_agg(
          json_build_object(
            'item_name', roi.item_name,
            'quantity', roi.quantity,
            'unit_price', roi.unit_price,
            'total', roi.subtotal
          )
        ) as items
      FROM restaurant_orders ro
      LEFT JOIN restaurant_order_items roi ON ro.id = roi.order_id
      WHERE ro.guest_id = $1
      GROUP BY ro.id, ro.order_number, ro.order_type, ro.total_amount, ro.payment_status, ro.created_at, ro.booking_id
      ORDER BY ro.created_at DESC
    `, [guestId]);

    // 3. Récupérer TOUTES les réservations spa du client
    const spaResult = await pool.query(`
      SELECT 
        sb.id,
        sb.booking_reference,
        sb.booking_date,
        sb.start_time,
        sb.end_time,
        sb.total_amount,
        sb.payment_status,
        sb.status,
        COALESCE(ss.name, sp.name) as service_name,
        t.first_name || ' ' || t.last_name as therapist_name,
        sb.booking_id
      FROM spa_bookings sb
      LEFT JOIN spa_services ss ON sb.treatment_id = ss.id
      LEFT JOIN spa_packages sp ON sb.package_id = sp.id
      LEFT JOIN spa_therapists t ON sb.therapist_id = t.id
      WHERE sb.guest_id = $1
      ORDER BY sb.booking_date DESC, sb.start_time DESC
    `, [guestId]);

    // 4. Récupérer TOUTES les réservations de chambre du client
    const bookingsResult = await pool.query(`
      SELECT 
        b.id,
        b.check_in_date,
        b.check_out_date,
        b.total_amount,
        b.status,
        r.room_number,
        rt.name as room_type,
        rt.price_per_night
      FROM bookings b
      JOIN rooms r ON b.room_id = r.id
      JOIN room_types rt ON r.room_type_id = rt.id
      WHERE b.guest_id = $1
      ORDER BY b.check_in_date DESC
    `, [guestId]);

    // 5. Calculer les totaux
    const restaurantTotal = restaurantResult.rows.reduce((sum, order) => 
      sum + parseFloat(order.total_amount || 0), 0
    );

    const spaTotal = spaResult.rows.reduce((sum, booking) => 
      sum + parseFloat(booking.total_amount || 0), 0
    );

    const roomTotal = bookingsResult.rows.reduce((sum, booking) => 
      sum + parseFloat(booking.total_amount || 0), 0
    );

    const grandTotal = restaurantTotal + spaTotal + roomTotal;

    // 6. Vérifier les paiements déjà effectués (tous les paiements du client)
    const paymentResult = await pool.query(`
      SELECT 
        p.id,
        p.amount,
        p.payment_method,
        p.payment_date,
        p.transaction_id,
        p.notes,
        p.booking_id,
        'room' as payment_for
      FROM payments p
      WHERE p.booking_id IN (
        SELECT id FROM bookings WHERE guest_id = $1
      ) AND p.payment_status = 'completed'
      UNION ALL
      SELECT 
        NULL as id,
        0 as amount,
        NULL as payment_method,
        NULL as payment_date,
        NULL as transaction_id,
        NULL as notes,
        NULL as booking_id,
        'other' as payment_for
      WHERE FALSE
    `, [guestId]);

    const totalPaid = paymentResult.rows.reduce((sum, payment) => 
      sum + parseFloat(payment.amount || 0), 0
    );

    const balance = grandTotal - totalPaid;

    // 7. Construire la facture consolidée
    const invoice = {
      guest: {
        id: guest.id,
        name: `${guest.first_name} ${guest.last_name}`,
        email: guest.email,
        phone: guest.phone,
        member_since: guest.created_at,
      },
      charges: {
        restaurant: {
          total: restaurantTotal,
          orders: restaurantResult.rows.map(order => ({
            id: order.id,
            order_number: order.order_number,
            order_type: order.order_type,
            amount: parseFloat(order.total_amount || 0),
            payment_status: order.payment_status,
            date: order.created_at,
            booking_id: order.booking_id,
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
            time: `${booking.start_time} - ${booking.end_time}`,
            amount: parseFloat(booking.total_amount || 0),
            payment_status: booking.payment_status,
            status: booking.status,
            booking_id: booking.booking_id,
          }))
        },
        room: {
          total: roomTotal,
          bookings: bookingsResult.rows.map(booking => ({
            id: booking.id,
            room_number: booking.room_number,
            room_type: booking.room_type,
            check_in: booking.check_in_date,
            check_out: booking.check_out_date,
            amount: parseFloat(booking.total_amount || 0),
            status: booking.status,
          }))
        }
      },
      payments: paymentResult.rows.map(payment => ({
        id: payment.id,
        amount: parseFloat(payment.amount || 0),
        method: payment.payment_method,
        date: payment.payment_date,
        transaction_id: payment.transaction_id,
        notes: payment.notes,
      })),
      summary: {
        restaurant_charges: restaurantTotal,
        spa_charges: spaTotal,
        room_charges: roomTotal,
        subtotal: grandTotal,
        tax: 0,
        grand_total: grandTotal,
        total_paid: totalPaid,
        balance: balance,
      }
    };

    res.json(invoice);
  } catch (error) {
    console.error('Error fetching guest invoice:', error);
    res.status(500).json({ message: 'Erreur serveur', error: String(error) });
  }
};

/**
 * Payer la facture d'un client (enregistre un paiement général)
 */
export const payGuestInvoice = async (req: AuthRequest, res: Response) => {
  const { guestId } = req.params;
  const { amount, payment_method, notes, booking_id } = req.body;

  try {
    // Vérifier que le client existe
    const guestResult = await pool.query(
      'SELECT id, first_name, last_name FROM guests WHERE id = $1',
      [guestId]
    );

    if (guestResult.rows.length === 0) {
      return res.status(404).json({ message: 'Client non trouvé' });
    }

    const guest = guestResult.rows[0];

    // Si un booking_id est fourni, l'utiliser, sinon trouver la réservation active ou la plus récente
    let finalBookingId = booking_id;

    if (!finalBookingId) {
      const bookingResult = await pool.query(`
        SELECT id FROM bookings 
        WHERE guest_id = $1 
        AND status IN ('checked_in', 'checked_out')
        ORDER BY check_in_date DESC 
        LIMIT 1
      `, [guestId]);

      if (bookingResult.rows.length > 0) {
        finalBookingId = bookingResult.rows[0].id;
      }
    }

    if (!finalBookingId) {
      return res.status(400).json({ 
        message: 'Aucune réservation trouvée pour ce client. Un booking_id est requis pour enregistrer le paiement.' 
      });
    }

    // Créer le paiement
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
      finalBookingId,
      amount,
      payment_method || 'cash',
      'completed',
      `PAY-${Date.now()}`,
      notes || `Paiement pour ${guest.first_name} ${guest.last_name}`
    ]);

    res.status(201).json({
      message: 'Paiement enregistré avec succès',
      payment: paymentResult.rows[0],
    });
  } catch (error) {
    console.error('Error paying guest invoice:', error);
    res.status(500).json({ message: 'Erreur serveur', error: String(error) });
  }
};

/**
 * Obtenir tous les clients avec des achats impayés
 */
export const getGuestsWithUnpaidCharges = async (req: AuthRequest, res: Response) => {
  try {
    const result = await pool.query(`
      SELECT DISTINCT
        g.id as guest_id,
        g.first_name || ' ' || g.last_name as guest_name,
        g.email,
        g.phone,
        (
          SELECT COALESCE(SUM(b.total_amount), 0)
          FROM bookings b
          WHERE b.guest_id = g.id
        ) as room_total,
        (
          SELECT COALESCE(SUM(ro.total_amount), 0)
          FROM restaurant_orders ro
          WHERE ro.guest_id = g.id
        ) as restaurant_total,
        (
          SELECT COALESCE(SUM(sb.total_amount), 0)
          FROM spa_bookings sb
          WHERE sb.guest_id = g.id
        ) as spa_total,
        (
          SELECT COALESCE(SUM(p.amount), 0)
          FROM payments p
          JOIN bookings b ON p.booking_id = b.id
          WHERE b.guest_id = g.id AND p.payment_status = 'completed'
        ) as total_paid
      FROM guests g
      WHERE EXISTS (
        SELECT 1 FROM bookings b WHERE b.guest_id = g.id
      ) OR EXISTS (
        SELECT 1 FROM restaurant_orders ro WHERE ro.guest_id = g.id
      ) OR EXISTS (
        SELECT 1 FROM spa_bookings sb WHERE sb.guest_id = g.id
      )
      ORDER BY g.last_name, g.first_name
    `);

    const guestsWithBalance = result.rows.map(row => {
      const roomTotal = parseFloat(row.room_total || 0);
      const restaurantTotal = parseFloat(row.restaurant_total || 0);
      const spaTotal = parseFloat(row.spa_total || 0);
      const totalPaid = parseFloat(row.total_paid || 0);
      const grandTotal = roomTotal + restaurantTotal + spaTotal;
      const balance = grandTotal - totalPaid;

      return {
        guest_id: row.guest_id,
        guest_name: row.guest_name,
        email: row.email,
        phone: row.phone,
        charges: {
          room: roomTotal,
          restaurant: restaurantTotal,
          spa: spaTotal,
        },
        grand_total: grandTotal,
        total_paid: totalPaid,
        balance: balance,
        has_unpaid: balance > 0,
      };
    }).filter(guest => guest.balance > 0); // Seulement ceux avec un solde

    res.json(guestsWithBalance);
  } catch (error) {
    console.error('Error fetching guests with unpaid charges:', error);
    res.status(500).json({ message: 'Erreur serveur', error: String(error) });
  }
};
