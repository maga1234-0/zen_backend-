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
exports.startScheduledJobs = exports.startDirtyRoomsMonitor = exports.startAutoCheckin = exports.startAutoCheckout = void 0;
const node_cron_1 = __importDefault(require("node-cron"));
const database_1 = __importDefault(require("../config/database"));
const notificationService = __importStar(require("./notificationService"));
// Auto checkout guests when checkout date arrives
const startAutoCheckout = () => {
    // Run every hour at minute 0
    node_cron_1.default.schedule('0 * * * *', async () => {
        try {
            console.log('🔄 Running auto-checkout job...');
            // Find bookings that should be checked out (checkout date is today or past, and status is checked_in)
            const result = await database_1.default.query(`
        SELECT b.id, b.room_id, r.room_number, g.first_name || ' ' || g.last_name as guest_name
        FROM bookings b
        JOIN rooms r ON b.room_id = r.id
        JOIN guests g ON b.guest_id = g.id
        WHERE b.status = 'checked_in' 
        AND b.check_out_date <= CURRENT_DATE
      `);
            if (result.rows.length === 0) {
                console.log('✅ No bookings to auto-checkout');
                return;
            }
            console.log(`📋 Found ${result.rows.length} booking(s) to checkout`);
            // Update each booking to checked_out and free up the room
            for (const booking of result.rows) {
                await database_1.default.query('BEGIN');
                try {
                    // Update booking status to checked_out
                    await database_1.default.query('UPDATE bookings SET status = $1, updated_at = NOW() WHERE id = $2', ['checked_out', booking.id]);
                    // Update room status to dirty (needs cleaning)
                    await database_1.default.query('UPDATE rooms SET status = $1 WHERE id = $2', ['dirty', booking.room_id]);
                    await database_1.default.query('COMMIT');
                    // Send notification
                    await notificationService.notifyCheckOut(booking.guest_name, booking.room_number);
                    console.log(`✅ Auto checked-out: ${booking.guest_name} from Room ${booking.room_number}`);
                }
                catch (error) {
                    await database_1.default.query('ROLLBACK');
                    console.error(`❌ Failed to checkout booking ${booking.id}:`, error);
                }
            }
            console.log('✅ Auto-checkout job completed');
        }
        catch (error) {
            console.error('❌ Auto-checkout job error:', error);
        }
    });
    console.log('⏰ Auto-checkout scheduler started (runs every hour)');
};
exports.startAutoCheckout = startAutoCheckout;
// Auto check-in guests when check-in date arrives (optional)
const startAutoCheckin = () => {
    // Run every hour at minute 0
    node_cron_1.default.schedule('0 * * * *', async () => {
        try {
            console.log('🔄 Running auto-checkin notification job...');
            // Find bookings that are ready for check-in (check-in date is today, status is confirmed)
            const result = await database_1.default.query(`
        SELECT b.id, r.room_number, g.first_name || ' ' || g.last_name as guest_name
        FROM bookings b
        JOIN rooms r ON b.room_id = r.id
        JOIN guests g ON b.guest_id = g.id
        WHERE b.status = 'confirmed' 
        AND b.check_in_date = CURRENT_DATE
      `);
            if (result.rows.length > 0) {
                console.log(`📋 ${result.rows.length} booking(s) ready for check-in today`);
                // Create notification for front desk staff
                await notificationService.createNotificationForRoles(['admin', 'manager', 'receptionist'], {
                    type: 'booking',
                    title: 'Check-ins Today',
                    message: `${result.rows.length} guest(s) are scheduled to check in today`,
                    priority: 'medium',
                });
            }
        }
        catch (error) {
            console.error('❌ Auto-checkin notification job error:', error);
        }
    });
    console.log('⏰ Auto-checkin notification scheduler started (runs every hour)');
};
exports.startAutoCheckin = startAutoCheckin;
// Monitor dirty rooms and alert housekeeping
const startDirtyRoomsMonitor = () => {
    // Run every 2 hours
    node_cron_1.default.schedule('0 */2 * * *', async () => {
        try {
            console.log('🔄 Running dirty rooms monitor...');
            const result = await database_1.default.query(`SELECT COUNT(*) as count FROM rooms WHERE status = 'dirty'`);
            const dirtyCount = parseInt(result.rows[0].count);
            if (dirtyCount > 0) {
                console.log(`📋 Found ${dirtyCount} dirty room(s)`);
                await notificationService.notifyDirtyRoomsAlert(dirtyCount);
            }
        }
        catch (error) {
            console.error('❌ Dirty rooms monitor error:', error);
        }
    });
    console.log('⏰ Dirty rooms monitor started (runs every 2 hours)');
};
exports.startDirtyRoomsMonitor = startDirtyRoomsMonitor;
// Start all scheduled jobs
const startScheduledJobs = () => {
    (0, exports.startAutoCheckout)();
    (0, exports.startAutoCheckin)();
    (0, exports.startDirtyRoomsMonitor)();
    console.log('✅ All scheduled jobs initialized');
};
exports.startScheduledJobs = startScheduledJobs;
