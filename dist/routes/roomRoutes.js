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
const express_1 = require("express");
const auth_1 = require("../middleware/auth");
const database_1 = __importDefault(require("../config/database"));
const notificationService = __importStar(require("../services/notificationService"));
const router = (0, express_1.Router)();
router.use(auth_1.authenticate);
// Get all room types
router.get('/types', async (req, res) => {
    try {
        const result = await database_1.default.query(`SELECT * FROM room_types ORDER BY name`);
        res.json(result.rows);
    }
    catch (error) {
        console.error('Get room types error:', error);
        res.status(500).json({ message: 'Server error' });
    }
});
// Get all rooms
router.get('/', async (req, res) => {
    try {
        const result = await database_1.default.query(`SELECT r.*, rt.name as type_name, 
        COALESCE(r.custom_price, rt.base_price) as base_price
       FROM rooms r
       LEFT JOIN room_types rt ON r.room_type_id = rt.id
       ORDER BY r.room_number`);
        res.json(result.rows);
    }
    catch (error) {
        console.error('Get rooms error:', error);
        res.status(500).json({ message: 'Server error' });
    }
});
// Create room (Admin and Manager only)
router.post('/', (0, auth_1.authorize)('admin', 'manager'), async (req, res) => {
    try {
        const { hotelId, roomTypeId, roomNumber, floor, status, customPrice } = req.body;
        // Check if room number already exists for this hotel
        const existingRoom = await database_1.default.query('SELECT id FROM rooms WHERE hotel_id = $1 AND room_number = $2', [hotelId, roomNumber]);
        if (existingRoom.rows.length > 0) {
            return res.status(400).json({ message: 'Room number already exists' });
        }
        const result = await database_1.default.query(`INSERT INTO rooms (hotel_id, room_type_id, room_number, floor, status, custom_price)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING *`, [hotelId, roomTypeId, roomNumber, floor, status || 'available', customPrice || null]);
        res.status(201).json(result.rows[0]);
    }
    catch (error) {
        console.error('Create room error:', error);
        res.status(500).json({ message: 'Server error', error: error.message });
    }
});
// Update room
router.put('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const { room_number, floor, status, maintenanceReason, isUrgent } = req.body;
        const userId = req.user?.id;
        // Get old status for notification
        const oldRoom = await database_1.default.query('SELECT status, room_number FROM rooms WHERE id = $1', [id]);
        const oldStatus = oldRoom.rows[0]?.status;
        const roomNumber = oldRoom.rows[0]?.room_number || room_number;
        // Build update query based on status
        let updateQuery;
        let updateParams;
        if (status === 'maintenance') {
            // Validate maintenance reason
            if (!maintenanceReason || !maintenanceReason.trim()) {
                return res.status(400).json({ message: 'Maintenance reason is required' });
            }
            updateQuery = `UPDATE rooms 
       SET room_number = $1, floor = $2, status = $3, 
           maintenance_reason = $4, is_urgent = $5, 
           maintenance_reported_at = NOW(), maintenance_reported_by = $6,
           updated_at = NOW()
       WHERE id = $7
       RETURNING *`;
            updateParams = [room_number, floor, status, maintenanceReason, isUrgent || false, userId, id];
        }
        else {
            // Clear maintenance fields when status is not maintenance
            updateQuery = `UPDATE rooms 
       SET room_number = $1, floor = $2, status = $3,
           maintenance_reason = NULL, is_urgent = false,
           maintenance_reported_at = NULL, maintenance_reported_by = NULL,
           updated_at = NOW()
       WHERE id = $4
       RETURNING *`;
            updateParams = [room_number, floor, status, id];
        }
        const result = await database_1.default.query(updateQuery, updateParams);
        if (result.rows.length === 0) {
            return res.status(404).json({ message: 'Room not found' });
        }
        // Send notification if status changed
        if (oldStatus && oldStatus !== status) {
            await notificationService.notifyRoomStatusChange(roomNumber, oldStatus, status);
            // Special notification for maintenance with reason and urgency
            if (status === 'maintenance') {
                await notificationService.notifyRoomMaintenance(roomNumber, maintenanceReason, isUrgent);
            }
            // Special notification when room is cleaned
            if (status === 'clean' && oldStatus === 'cleaning') {
                await notificationService.notifyRoomCleaned(roomNumber);
            }
        }
        res.json(result.rows[0]);
    }
    catch (error) {
        console.error('Update room error:', error);
        res.status(500).json({ message: 'Server error' });
    }
});
// Delete room (Admin and Manager only)
router.delete('/:id', (0, auth_1.authorize)('admin', 'manager'), async (req, res) => {
    try {
        const { id } = req.params;
        // Check if room has any associated bookings
        const bookingsCheck = await database_1.default.query('SELECT COUNT(*) as booking_count FROM bookings WHERE room_id = $1', [id]);
        const bookingCount = parseInt(bookingsCheck.rows[0].booking_count);
        if (bookingCount > 0) {
            return res.status(400).json({
                message: `Cannot delete room with ${bookingCount} associated booking(s). Please delete or update the bookings first.`
            });
        }
        const result = await database_1.default.query('DELETE FROM rooms WHERE id = $1 RETURNING *', [id]);
        if (result.rows.length === 0) {
            return res.status(404).json({ message: 'Room not found' });
        }
        res.json({ message: 'Room deleted successfully' });
    }
    catch (error) {
        console.error('Delete room error:', error);
        // Check for foreign key constraint violation
        if (error.code === '23503') { // PostgreSQL foreign key violation
            return res.status(400).json({
                message: 'Cannot delete room with associated bookings. Please delete or update the bookings first.'
            });
        }
        res.status(500).json({ message: 'Server error', error: error.message });
    }
});
exports.default = router;
