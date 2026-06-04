import pool from '../config/database';

export type NotificationType = 'booking' | 'room' | 'housekeeping' | 'payment' | 'maintenance' | 'system';

interface CreateNotificationParams {
  userId?: string;
  type: NotificationType;
  title: string;
  message: string;
  priority?: 'low' | 'medium' | 'high';
}

/**
 * Create a notification for a specific user or all users
 */
export const createNotification = async (params: CreateNotificationParams) => {
  const { userId, type, title, message, priority = 'medium' } = params;

  try {
    if (userId) {
      // Create notification for specific user
      await pool.query(
        `INSERT INTO notifications (user_id, type, title, message, priority, is_read)
         VALUES ($1, $2, $3, $4, $5, false)`,
        [userId, type, title, message, priority]
      );
      console.log(`✅ Notification created for user ${userId}: ${title}`);
    } else {
      // Create notification for all users
      const users = await pool.query('SELECT id FROM users WHERE is_active = true');
      
      for (const user of users.rows) {
        await pool.query(
          `INSERT INTO notifications (user_id, type, title, message, priority, is_read)
           VALUES ($1, $2, $3, $4, $5, false)`,
          [user.id, type, title, message, priority]
        );
      }
      console.log(`✅ Notification created for all users: ${title}`);
    }
  } catch (error: any) {
    console.error('❌ Error creating notification:', error.message);
    // Try without priority if column doesn't exist
    if (error.message?.includes('priority')) {
      try {
        if (userId) {
          await pool.query(
            `INSERT INTO notifications (user_id, type, title, message, is_read)
             VALUES ($1, $2, $3, $4, false)`,
            [userId, type, title, message]
          );
        } else {
          const users = await pool.query('SELECT id FROM users WHERE is_active = true');
          for (const user of users.rows) {
            await pool.query(
              `INSERT INTO notifications (user_id, type, title, message, is_read)
               VALUES ($1, $2, $3, $4, false)`,
              [user.id, type, title, message]
            );
          }
        }
        console.log(`✅ Notification created (without priority): ${title}`);
      } catch (retryError) {
        console.error('❌ Retry failed:', retryError);
      }
    }
  }
};

/**
 * Create notification for users with specific roles
 */
export const createNotificationForRoles = async (
  roles: string[],
  params: Omit<CreateNotificationParams, 'userId'>
) => {
  const { type, title, message, priority = 'medium' } = params;

  try {
    const users = await pool.query(
      'SELECT id FROM users WHERE role = ANY($1) AND is_active = true',
      [roles]
    );

    for (const user of users.rows) {
      await pool.query(
        `INSERT INTO notifications (user_id, type, title, message, priority, is_read)
         VALUES ($1, $2, $3, $4, $5, false)`,
        [user.id, type, title, message, priority]
      );
    }
    
    console.log(`✅ Notification created for roles ${roles.join(', ')}: ${title}`);
  } catch (error: any) {
    console.error('❌ Error creating notification for roles:', error.message);
    // Try without priority if column doesn't exist
    if (error.message?.includes('priority')) {
      try {
        const users = await pool.query(
          'SELECT id FROM users WHERE role = ANY($1) AND is_active = true',
          [roles]
        );
        for (const user of users.rows) {
          await pool.query(
            `INSERT INTO notifications (user_id, type, title, message, is_read)
             VALUES ($1, $2, $3, $4, false)`,
            [user.id, type, title, message]
          );
        }
        console.log(`✅ Notification created for roles (without priority): ${title}`);
      } catch (retryError) {
        console.error('❌ Retry failed:', retryError);
      }
    }
  }
};

// Booking notifications
export const notifyNewBooking = async (guestName: string, roomNumber: string, checkInDate: string) => {
  await createNotificationForRoles(['admin', 'manager', 'receptionist'], {
    type: 'booking',
    title: 'New Booking Created',
    message: `New booking for ${guestName} in Room ${roomNumber}. Check-in: ${new Date(checkInDate).toLocaleDateString()}`,
    priority: 'medium',
  });
};

export const notifyBookingCancelled = async (guestName: string, roomNumber: string) => {
  await createNotificationForRoles(['admin', 'manager', 'receptionist'], {
    type: 'booking',
    title: 'Booking Cancelled',
    message: `Booking cancelled for ${guestName} in Room ${roomNumber}`,
    priority: 'medium',
  });
};

export const notifyCheckIn = async (guestName: string, roomNumber: string) => {
  await createNotificationForRoles(['admin', 'manager', 'receptionist', 'housekeeping'], {
    type: 'booking',
    title: 'Guest Checked In',
    message: `${guestName} has checked into Room ${roomNumber}`,
    priority: 'medium',
  });
};

export const notifyCheckOut = async (guestName: string, roomNumber: string) => {
  await createNotificationForRoles(['admin', 'manager', 'receptionist', 'housekeeping'], {
    type: 'booking',
    title: 'Guest Checked Out',
    message: `${guestName} has checked out of Room ${roomNumber}. Room needs cleaning.`,
    priority: 'high',
  });
};

// Room notifications
export const notifyRoomStatusChange = async (roomNumber: string, oldStatus: string, newStatus: string) => {
  const roles = newStatus === 'dirty' 
    ? ['admin', 'manager', 'housekeeping']
    : ['admin', 'manager', 'receptionist'];

  await createNotificationForRoles(roles, {
    type: 'room',
    title: 'Room Status Updated',
    message: `Room ${roomNumber} status changed from ${oldStatus} to ${newStatus}`,
    priority: newStatus === 'dirty' ? 'high' : 'medium',
  });
};

export const notifyRoomMaintenance = async (roomNumber: string, reason?: string, isUrgent?: boolean) => {
  const urgencyText = isUrgent ? '🚨 URGENT' : '';
  const reasonText = reason ? `: ${reason}` : '';
  
  await createNotificationForRoles(['admin', 'manager', 'maintenance'], {
    type: 'maintenance',
    title: `${urgencyText} Room Needs Maintenance`.trim(),
    message: `Room ${roomNumber} has been marked for maintenance${reasonText}`,
    priority: isUrgent ? 'high' : 'medium',
  });
};

// Housekeeping notifications
export const notifyRoomCleaned = async (roomNumber: string) => {
  await createNotificationForRoles(['admin', 'manager', 'receptionist'], {
    type: 'housekeeping',
    title: 'Room Cleaned',
    message: `Room ${roomNumber} has been cleaned and is ready for guests`,
    priority: 'low',
  });
};

export const notifyDirtyRoomsAlert = async (count: number) => {
  if (count > 5) {
    await createNotificationForRoles(['admin', 'manager', 'housekeeping'], {
      type: 'housekeeping',
      title: 'High Number of Dirty Rooms',
      message: `There are ${count} dirty rooms that need cleaning`,
      priority: 'high',
    });
  }
};

// Payment notifications
export const notifyPaymentReceived = async (guestName: string, amount: number, roomNumber: string) => {
  await createNotificationForRoles(['admin', 'manager', 'accountant'], {
    type: 'payment',
    title: 'Payment Received',
    message: `Payment of $${amount} received from ${guestName} for Room ${roomNumber}`,
    priority: 'low',
  });
};

// ============================================
// RESTAURANT NOTIFICATIONS
// ============================================

// New order notification - notify kitchen staff
export const notifyNewRestaurantOrder = async (orderNumber: string, orderType: string, tableNumber?: string) => {
  const location = orderType === 'dine_in' && tableNumber ? ` for Table ${tableNumber}` : '';
  
  await createNotificationForRoles(['admin', 'manager', 'restaurant_manager', 'restaurant_chef'], {
    type: 'system',
    title: 'Nouvelle Commande Restaurant',
    message: `Nouvelle commande ${orderNumber}${location} - Type: ${orderType}`,
    priority: 'high',
  });
};

// Order status change - notify relevant staff
export const notifyOrderStatusChange = async (orderNumber: string, oldStatus: string, newStatus: string) => {
  let roles: string[] = [];
  let priority: 'low' | 'medium' | 'high' = 'medium';

  // Notify different roles based on status
  if (newStatus === 'ready') {
    // Kitchen finished, notify servers
    roles = ['admin', 'manager', 'restaurant_manager', 'restaurant_server'];
    priority = 'high';
  } else if (newStatus === 'completed') {
    // Order completed, notify cashier for payment
    roles = ['admin', 'manager', 'restaurant_manager', 'restaurant_cashier'];
    priority = 'medium';
  } else {
    // Other status changes, notify managers only
    roles = ['admin', 'manager', 'restaurant_manager'];
    priority = 'low';
  }

  await createNotificationForRoles(roles, {
    type: 'system',
    title: 'Statut Commande Mis à Jour',
    message: `Commande ${orderNumber}: ${oldStatus} → ${newStatus}`,
    priority,
  });
};

// Table reservation notification
export const notifyNewTableReservation = async (guestName: string, tableNumber: string, date: string, time: string) => {
  await createNotificationForRoles(['admin', 'manager', 'restaurant_manager', 'restaurant_server'], {
    type: 'system',
    title: 'Nouvelle Réservation Table',
    message: `Réservation pour ${guestName} - Table ${tableNumber} le ${new Date(date).toLocaleDateString()} à ${time}`,
    priority: 'medium',
  });
};

// Reservation cancellation
export const notifyReservationCancelled = async (guestName: string, tableNumber: string, date: string) => {
  await createNotificationForRoles(['admin', 'manager', 'restaurant_manager'], {
    type: 'system',
    title: 'Réservation Annulée',
    message: `Réservation de ${guestName} pour la Table ${tableNumber} le ${new Date(date).toLocaleDateString()} a été annulée`,
    priority: 'low',
  });
};

// Low stock alert (future feature)
export const notifyLowStock = async (itemName: string, currentStock: number) => {
  await createNotificationForRoles(['admin', 'manager', 'restaurant_manager'], {
    type: 'system',
    title: '⚠️ Stock Faible',
    message: `${itemName} - Stock restant: ${currentStock}`,
    priority: 'high',
  });
};
