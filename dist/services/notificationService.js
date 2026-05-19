"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.notifyPaymentReceived = exports.notifyDirtyRoomsAlert = exports.notifyRoomCleaned = exports.notifyRoomMaintenance = exports.notifyRoomStatusChange = exports.notifyCheckOut = exports.notifyCheckIn = exports.notifyBookingCancelled = exports.notifyNewBooking = exports.createNotificationForRoles = exports.createNotification = void 0;
const database_1 = __importDefault(require("../config/database"));
/**
 * Create a notification for a specific user or all users
 */
const createNotification = async (params) => {
    const { userId, type, title, message, priority = 'medium' } = params;
    try {
        if (userId) {
            // Create notification for specific user
            await database_1.default.query(`INSERT INTO notifications (user_id, type, title, message, priority, is_read)
         VALUES ($1, $2, $3, $4, $5, false)`, [userId, type, title, message, priority]);
            console.log(`✅ Notification created for user ${userId}: ${title}`);
        }
        else {
            // Create notification for all users
            const users = await database_1.default.query('SELECT id FROM users WHERE is_active = true');
            for (const user of users.rows) {
                await database_1.default.query(`INSERT INTO notifications (user_id, type, title, message, priority, is_read)
           VALUES ($1, $2, $3, $4, $5, false)`, [user.id, type, title, message, priority]);
            }
            console.log(`✅ Notification created for all users: ${title}`);
        }
    }
    catch (error) {
        console.error('❌ Error creating notification:', error.message);
        // Try without priority if column doesn't exist
        if (error.message?.includes('priority')) {
            try {
                if (userId) {
                    await database_1.default.query(`INSERT INTO notifications (user_id, type, title, message, is_read)
             VALUES ($1, $2, $3, $4, false)`, [userId, type, title, message]);
                }
                else {
                    const users = await database_1.default.query('SELECT id FROM users WHERE is_active = true');
                    for (const user of users.rows) {
                        await database_1.default.query(`INSERT INTO notifications (user_id, type, title, message, is_read)
               VALUES ($1, $2, $3, $4, false)`, [user.id, type, title, message]);
                    }
                }
                console.log(`✅ Notification created (without priority): ${title}`);
            }
            catch (retryError) {
                console.error('❌ Retry failed:', retryError);
            }
        }
    }
};
exports.createNotification = createNotification;
/**
 * Create notification for users with specific roles
 */
const createNotificationForRoles = async (roles, params) => {
    const { type, title, message, priority = 'medium' } = params;
    try {
        const users = await database_1.default.query('SELECT id FROM users WHERE role = ANY($1) AND is_active = true', [roles]);
        for (const user of users.rows) {
            await database_1.default.query(`INSERT INTO notifications (user_id, type, title, message, priority, is_read)
         VALUES ($1, $2, $3, $4, $5, false)`, [user.id, type, title, message, priority]);
        }
        console.log(`✅ Notification created for roles ${roles.join(', ')}: ${title}`);
    }
    catch (error) {
        console.error('❌ Error creating notification for roles:', error.message);
        // Try without priority if column doesn't exist
        if (error.message?.includes('priority')) {
            try {
                const users = await database_1.default.query('SELECT id FROM users WHERE role = ANY($1) AND is_active = true', [roles]);
                for (const user of users.rows) {
                    await database_1.default.query(`INSERT INTO notifications (user_id, type, title, message, is_read)
             VALUES ($1, $2, $3, $4, false)`, [user.id, type, title, message]);
                }
                console.log(`✅ Notification created for roles (without priority): ${title}`);
            }
            catch (retryError) {
                console.error('❌ Retry failed:', retryError);
            }
        }
    }
};
exports.createNotificationForRoles = createNotificationForRoles;
// Booking notifications
const notifyNewBooking = async (guestName, roomNumber, checkInDate) => {
    await (0, exports.createNotificationForRoles)(['admin', 'manager', 'receptionist'], {
        type: 'booking',
        title: 'New Booking Created',
        message: `New booking for ${guestName} in Room ${roomNumber}. Check-in: ${new Date(checkInDate).toLocaleDateString()}`,
        priority: 'medium',
    });
};
exports.notifyNewBooking = notifyNewBooking;
const notifyBookingCancelled = async (guestName, roomNumber) => {
    await (0, exports.createNotificationForRoles)(['admin', 'manager', 'receptionist'], {
        type: 'booking',
        title: 'Booking Cancelled',
        message: `Booking cancelled for ${guestName} in Room ${roomNumber}`,
        priority: 'medium',
    });
};
exports.notifyBookingCancelled = notifyBookingCancelled;
const notifyCheckIn = async (guestName, roomNumber) => {
    await (0, exports.createNotificationForRoles)(['admin', 'manager', 'receptionist', 'housekeeping'], {
        type: 'booking',
        title: 'Guest Checked In',
        message: `${guestName} has checked into Room ${roomNumber}`,
        priority: 'medium',
    });
};
exports.notifyCheckIn = notifyCheckIn;
const notifyCheckOut = async (guestName, roomNumber) => {
    await (0, exports.createNotificationForRoles)(['admin', 'manager', 'receptionist', 'housekeeping'], {
        type: 'booking',
        title: 'Guest Checked Out',
        message: `${guestName} has checked out of Room ${roomNumber}. Room needs cleaning.`,
        priority: 'high',
    });
};
exports.notifyCheckOut = notifyCheckOut;
// Room notifications
const notifyRoomStatusChange = async (roomNumber, oldStatus, newStatus) => {
    const roles = newStatus === 'dirty'
        ? ['admin', 'manager', 'housekeeping']
        : ['admin', 'manager', 'receptionist'];
    await (0, exports.createNotificationForRoles)(roles, {
        type: 'room',
        title: 'Room Status Updated',
        message: `Room ${roomNumber} status changed from ${oldStatus} to ${newStatus}`,
        priority: newStatus === 'dirty' ? 'high' : 'medium',
    });
};
exports.notifyRoomStatusChange = notifyRoomStatusChange;
const notifyRoomMaintenance = async (roomNumber, reason, isUrgent) => {
    const urgencyText = isUrgent ? '🚨 URGENT' : '';
    const reasonText = reason ? `: ${reason}` : '';
    await (0, exports.createNotificationForRoles)(['admin', 'manager', 'maintenance'], {
        type: 'maintenance',
        title: `${urgencyText} Room Needs Maintenance`.trim(),
        message: `Room ${roomNumber} has been marked for maintenance${reasonText}`,
        priority: isUrgent ? 'high' : 'medium',
    });
};
exports.notifyRoomMaintenance = notifyRoomMaintenance;
// Housekeeping notifications
const notifyRoomCleaned = async (roomNumber) => {
    await (0, exports.createNotificationForRoles)(['admin', 'manager', 'receptionist'], {
        type: 'housekeeping',
        title: 'Room Cleaned',
        message: `Room ${roomNumber} has been cleaned and is ready for guests`,
        priority: 'low',
    });
};
exports.notifyRoomCleaned = notifyRoomCleaned;
const notifyDirtyRoomsAlert = async (count) => {
    if (count > 5) {
        await (0, exports.createNotificationForRoles)(['admin', 'manager', 'housekeeping'], {
            type: 'housekeeping',
            title: 'High Number of Dirty Rooms',
            message: `There are ${count} dirty rooms that need cleaning`,
            priority: 'high',
        });
    }
};
exports.notifyDirtyRoomsAlert = notifyDirtyRoomsAlert;
// Payment notifications
const notifyPaymentReceived = async (guestName, amount, roomNumber) => {
    await (0, exports.createNotificationForRoles)(['admin', 'manager', 'accountant'], {
        type: 'payment',
        title: 'Payment Received',
        message: `Payment of $${amount} received from ${guestName} for Room ${roomNumber}`,
        priority: 'low',
    });
};
exports.notifyPaymentReceived = notifyPaymentReceived;
