"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getRecentActivities = exports.getRevenueAnalytics = exports.getBookingTrends = exports.getDashboardStats = void 0;
const database_1 = __importDefault(require("../config/database"));
const getDashboardStats = async (req, res) => {
    try {
        // Get the first available hotel dynamically
        const hotelResult = await database_1.default.query('SELECT id FROM hotels LIMIT 1');
        if (hotelResult.rows.length === 0) {
            return res.status(404).json({
                message: 'No hotel found. Please create a hotel first.',
                error: 'NO_HOTEL_FOUND'
            });
        }
        const hotelId = hotelResult.rows[0].id;
        // Total bookings
        const bookingsResult = await database_1.default.query('SELECT COUNT(*) as total FROM bookings WHERE hotel_id = $1', [hotelId]);
        // Revenue (last 30 days) - Only count checked-in or checked-out bookings
        const revenueResult = await database_1.default.query(`SELECT COALESCE(SUM(total_amount), 0) as revenue 
       FROM bookings 
       WHERE hotel_id = $1 
       AND created_at >= NOW() - INTERVAL '30 days'
       AND status IN ('checked_in', 'checked_out')`, [hotelId]);
        // Occupancy rate
        const roomsResult = await database_1.default.query(`SELECT 
        COUNT(*) as total_rooms,
        COUNT(*) FILTER (WHERE status = 'occupied') as occupied_rooms
       FROM rooms WHERE hotel_id = $1`, [hotelId]);
        const totalRooms = parseInt(roomsResult.rows[0].total_rooms);
        const occupiedRooms = parseInt(roomsResult.rows[0].occupied_rooms);
        const occupancyRate = totalRooms > 0 ? (occupiedRooms / totalRooms) * 100 : 0;
        // Available rooms
        const availableRooms = await database_1.default.query(`SELECT COUNT(*) as available FROM rooms WHERE hotel_id = $1 AND status = 'available'`, [hotelId]);
        res.json({
            totalBookings: parseInt(bookingsResult.rows[0].total),
            revenue: parseFloat(revenueResult.rows[0].revenue),
            occupancyRate: Math.round(occupancyRate),
            availableRooms: parseInt(availableRooms.rows[0].available),
        });
    }
    catch (error) {
        console.error('Dashboard stats error:', error);
        res.status(500).json({ message: 'Server error' });
    }
};
exports.getDashboardStats = getDashboardStats;
const getBookingTrends = async (req, res) => {
    try {
        // Get the first available hotel dynamically
        const hotelResult = await database_1.default.query('SELECT id FROM hotels LIMIT 1');
        if (hotelResult.rows.length === 0) {
            return res.json([]); // Return empty array if no hotel
        }
        const hotelId = hotelResult.rows[0].id;
        const result = await database_1.default.query(`SELECT 
        DATE(created_at) as date,
        COUNT(*) as bookings
       FROM bookings
       WHERE hotel_id = $1 AND created_at >= NOW() - INTERVAL '30 days'
       GROUP BY DATE(created_at)
       ORDER BY date`, [hotelId]);
        res.json(result.rows);
    }
    catch (error) {
        console.error('Booking trends error:', error);
        res.status(500).json({ message: 'Server error' });
    }
};
exports.getBookingTrends = getBookingTrends;
const getRevenueAnalytics = async (req, res) => {
    try {
        // Get the first available hotel dynamically
        const hotelResult = await database_1.default.query('SELECT id FROM hotels LIMIT 1');
        if (hotelResult.rows.length === 0) {
            return res.json([]); // Return empty array if no hotel
        }
        const hotelId = hotelResult.rows[0].id;
        const result = await database_1.default.query(`SELECT 
        TO_CHAR(created_at, 'Mon') as month,
        COALESCE(SUM(total_amount), 0) as revenue
       FROM bookings
       WHERE hotel_id = $1 
       AND created_at >= NOW() - INTERVAL '6 months'
       AND status IN ('checked_in', 'checked_out')
       GROUP BY TO_CHAR(created_at, 'Mon'), EXTRACT(MONTH FROM created_at)
       ORDER BY EXTRACT(MONTH FROM created_at)`, [hotelId]);
        res.json(result.rows);
    }
    catch (error) {
        console.error('Revenue analytics error:', error);
        res.status(500).json({ message: 'Server error' });
    }
};
exports.getRevenueAnalytics = getRevenueAnalytics;
const getRecentActivities = async (req, res) => {
    try {
        // Get the first available hotel dynamically
        const hotelResult = await database_1.default.query('SELECT id FROM hotels LIMIT 1');
        if (hotelResult.rows.length === 0) {
            return res.json([]); // Return empty array if no hotel
        }
        const hotelId = hotelResult.rows[0].id;
        const result = await database_1.default.query(`SELECT 
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
       LIMIT 10`, [hotelId]);
        res.json(result.rows);
    }
    catch (error) {
        console.error('Recent activities error:', error);
        res.status(500).json({ message: 'Server error' });
    }
};
exports.getRecentActivities = getRecentActivities;
