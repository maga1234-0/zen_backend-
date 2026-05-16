import { Response } from 'express';
import pool from '../config/database';
import { AuthRequest } from '../middleware/auth';
import * as notificationService from '../services/notificationService';

export const getAllPayments = async (req: AuthRequest, res: Response) => {
  try {
    const result = await pool.query(`
      SELECT 
        p.id,
        p.booking_id,
        p.amount,
        p.payment_method,
        p.payment_status,
        p.transaction_id,
        p.payment_date,
        COALESCE(g.first_name || ' ' || g.last_name, 'Unknown Guest') as guest_name,
        COALESCE(r.room_number, 'N/A') as room_number
      FROM payments p
      LEFT JOIN bookings b ON p.booking_id = b.id
      LEFT JOIN guests g ON b.guest_id = g.id
      LEFT JOIN rooms r ON b.room_id = r.id
      ORDER BY p.payment_date DESC
    `);

    console.log(`📊 Retrieved ${result.rows.length} payments`);
    res.json(result.rows);
  } catch (error) {
    console.error('Get payments error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

export const createPayment = async (req: AuthRequest, res: Response) => {
  try {
    const { bookingId, amount, paymentMethod, transactionId } = req.body;

    // Check if payment already exists for this booking
    const existingPayment = await pool.query(
      `SELECT id, payment_status FROM payments WHERE booking_id = $1 AND payment_status = 'completed'`,
      [bookingId]
    );

    if (existingPayment.rows.length > 0) {
      return res.status(400).json({ 
        message: 'Payment already exists for this booking',
        error: 'This booking has already been paid'
      });
    }

    const result = await pool.query(
      `INSERT INTO payments (booking_id, amount, payment_method, payment_status, transaction_id) 
       VALUES ($1, $2, $3, $4, $5) 
       RETURNING *`,
      [bookingId, amount, paymentMethod, 'completed', transactionId || `TXN${Date.now()}`]
    );

    console.log('✅ Payment created:', result.rows[0].id);

    // Get booking and guest info for notification
    const bookingInfo = await pool.query(
      `SELECT 
        g.first_name || ' ' || g.last_name as guest_name,
        r.room_number
       FROM bookings b
       JOIN guests g ON b.guest_id = g.id
       JOIN rooms r ON b.room_id = r.id
       WHERE b.id = $1`,
      [bookingId]
    );

    if (bookingInfo.rows.length > 0) {
      const { guest_name, room_number } = bookingInfo.rows[0];
      await notificationService.notifyPaymentReceived(guest_name, amount, room_number);
      console.log(`📧 Payment notification sent for ${guest_name} - Room ${room_number}`);
    }

    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Create payment error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};
