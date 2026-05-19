"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.createPayment = exports.getAllPayments = void 0;
const database_1 = __importDefault(require("../config/database"));
const notificationService = __importStar(require("../services/notificationService"));
const getAllPayments = async (req, res) => {
    try {
        const result = await database_1.default.query(`
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
    }
    catch (error) {
        console.error('Get payments error:', error);
        res.status(500).json({ message: 'Server error' });
    }
};
exports.getAllPayments = getAllPayments;
const createPayment = async (req, res) => {
    try {
        const { bookingId, amount, paymentMethod, transactionId } = req.body;
        // Check if payment already exists for this booking
        const existingPayment = await database_1.default.query(`SELECT id, payment_status FROM payments WHERE booking_id = $1 AND payment_status = 'completed'`, [bookingId]);
        if (existingPayment.rows.length > 0) {
            return res.status(400).json({
                message: 'Payment already exists for this booking',
                error: 'This booking has already been paid'
            });
        }
        const result = await database_1.default.query(`INSERT INTO payments (booking_id, amount, payment_method, payment_status, transaction_id) 
       VALUES ($1, $2, $3, $4, $5) 
       RETURNING *`, [bookingId, amount, paymentMethod, 'completed', transactionId || `TXN${Date.now()}`]);
        console.log('✅ Payment created:', result.rows[0].id);
        // Get booking and guest info for notification
        const bookingInfo = await database_1.default.query(`SELECT 
        g.first_name || ' ' || g.last_name as guest_name,
        r.room_number
       FROM bookings b
       JOIN guests g ON b.guest_id = g.id
       JOIN rooms r ON b.room_id = r.id
       WHERE b.id = $1`, [bookingId]);
        if (bookingInfo.rows.length > 0) {
            const { guest_name, room_number } = bookingInfo.rows[0];
            await notificationService.notifyPaymentReceived(guest_name, amount, room_number);
            console.log(`📧 Payment notification sent for ${guest_name} - Room ${room_number}`);
        }
        res.status(201).json(result.rows[0]);
    }
    catch (error) {
        console.error('Create payment error:', error);
        res.status(500).json({ message: 'Server error' });
    }
};
exports.createPayment = createPayment;
