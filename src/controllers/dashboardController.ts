import { Response } from 'express';
import pool from '../config/database';
import { AuthRequest } from '../middleware/auth';

export const getDashboardStats = async (req: AuthRequest, res: Response) => {
  try {
    const hotelId = '550e8400-e29b-41d4-a716-446655440000'; // Default hotel

    // Total bookings
    const bookingsResult = await pool.query(
      'SELECT COUNT(*) as total FROM bookings WHERE hotel_id = $1',
      [hotelId]
    );

    // Revenue (last 30 days) - Only count checked-in or checked-out bookings
    const revenueResult = await pool.query(
      `SELECT COALESCE(SUM(total_amount), 0) as revenue 
       FROM bookings 
       WHERE hotel_id = $1 
       AND created_at >= NOW() - INTERVAL '30 days'
       AND status IN ('checked_in', 'checked_out')`,
      [hotelId]
    );

    // Occupancy rate
    const roomsResult = await pool.query(
      `SELECT 
        COUNT(*) as total_rooms,
        COUNT(*) FILTER (WHERE status = 'occupied') as occupied_rooms
       FROM rooms WHERE hotel_id = $1`,
      [hotelId]
    );

    const totalRooms = parseInt(roomsResult.rows[0].total_rooms);
    const occupiedRooms = parseInt(roomsResult.rows[0].occupied_rooms);
    const occupancyRate = totalRooms > 0 ? (occupiedRooms / totalRooms) * 100 : 0;

    // Available rooms
    const availableRooms = await pool.query(
      `SELECT COUNT(*) as available FROM rooms WHERE hotel_id = $1 AND status = 'available'`,
      [hotelId]
    );

    res.json({
      totalBookings: parseInt(bookingsResult.rows[0].total),
      revenue: parseFloat(revenueResult.rows[0].revenue),
      occupancyRate: Math.round(occupancyRate),
      availableRooms: parseInt(availableRooms.rows[0].available),
    });
  } catch (error) {
    console.error('Dashboard stats error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

export const getBookingTrends = async (req: AuthRequest, res: Response) => {
  try {
    const hotelId = '550e8400-e29b-41d4-a716-446655440000';

    const result = await pool.query(
      `SELECT 
        DATE(created_at) as date,
        COUNT(*) as bookings
       FROM bookings
       WHERE hotel_id = $1 AND created_at >= NOW() - INTERVAL '30 days'
       GROUP BY DATE(created_at)
       ORDER BY date`,
      [hotelId]
    );

    res.json(result.rows);
  } catch (error) {
    console.error('Booking trends error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

export const getRevenueAnalytics = async (req: AuthRequest, res: Response) => {
  try {
    const hotelId = '550e8400-e29b-41d4-a716-446655440000';

    const result = await pool.query(
      `SELECT 
        TO_CHAR(created_at, 'Mon') as month,
        COALESCE(SUM(total_amount), 0) as revenue
       FROM bookings
       WHERE hotel_id = $1 
       AND created_at >= NOW() - INTERVAL '6 months'
       AND status IN ('checked_in', 'checked_out')
       GROUP BY TO_CHAR(created_at, 'Mon'), EXTRACT(MONTH FROM created_at)
       ORDER BY EXTRACT(MONTH FROM created_at)`,
      [hotelId]
    );

    res.json(result.rows);
  } catch (error) {
    console.error('Revenue analytics error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

export const getRecentActivities = async (req: AuthRequest, res: Response) => {
  try {
    const hotelId = '550e8400-e29b-41d4-a716-446655440000';

    const result = await pool.query(
      `SELECT 
        b.id,
        b.status,
        b.check_in_date,
        b.check_out_date,
        b.created_at,
        g.first_name || ' ' || g.last_name as guest_name,
        r.room_number
       FROM bookings b
       JOIN guests g ON b.guest_id = g.id
       JOIN rooms r ON b.room_id = r.id
       WHERE b.hotel_id = $1
       ORDER BY b.created_at DESC
       LIMIT 10`,
      [hotelId]
    );

    res.json(result.rows);
  } catch (error) {
    console.error('Recent activities error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};
