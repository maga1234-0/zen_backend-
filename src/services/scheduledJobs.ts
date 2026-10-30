import cron from 'node-cron';
import pool from '../config/database';
import * as notificationService from './notificationService';

// Auto checkout guests when checkout date arrives
export const startAutoCheckout = () => {
  // Run every hour at minute 0
  cron.schedule('0 * * * *', async () => {
    try {
      console.log('🔄 Running auto-checkout job...');

      // Find bookings that should be checked out (checkout date is today or past, and status is checked_in)
      const result = await pool.query(`
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
        await pool.query('BEGIN');

        try {
          // Update booking status to checked_out
          await pool.query(
            'UPDATE bookings SET status = $1, updated_at = NOW() WHERE id = $2',
            ['checked_out', booking.id]
          );

          // Update room status to dirty (needs cleaning)
          await pool.query(
            'UPDATE rooms SET status = $1 WHERE id = $2',
            ['dirty', booking.room_id]
          );

          await pool.query('COMMIT');
          
          // Send notification
          await notificationService.notifyCheckOut(booking.guest_name, booking.room_number);
          
          console.log(`✅ Auto checked-out: ${booking.guest_name} from Room ${booking.room_number}`);
        } catch (error) {
          await pool.query('ROLLBACK');
          console.error(`❌ Failed to checkout booking ${booking.id}:`, error);
        }
      }

      console.log('✅ Auto-checkout job completed');
    } catch (error) {
      console.error('❌ Auto-checkout job error:', error);
    }
  });

  console.log('⏰ Auto-checkout scheduler started (runs every hour)');
};

// Auto check-in guests when check-in date arrives (optional)
export const startAutoCheckin = () => {
  // Run every hour at minute 0
  cron.schedule('0 * * * *', async () => {
    try {
      console.log('🔄 Running auto-checkin notification job...');

      // Find bookings that are ready for check-in (check-in date is today, status is confirmed)
      const result = await pool.query(`
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
    } catch (error) {
      console.error('❌ Auto-checkin notification job error:', error);
    }
  });

  console.log('⏰ Auto-checkin notification scheduler started (runs every hour)');
};

// Monitor dirty rooms and alert housekeeping
export const startDirtyRoomsMonitor = () => {
  // Run every 2 hours
  cron.schedule('0 */2 * * *', async () => {
    try {
      console.log('🔄 Running dirty rooms monitor...');

      const result = await pool.query(
        `SELECT COUNT(*) as count FROM rooms WHERE status = 'dirty'`
      );

      const dirtyCount = parseInt(result.rows[0].count);
      
      if (dirtyCount > 0) {
        console.log(`📋 Found ${dirtyCount} dirty room(s)`);
        await notificationService.notifyDirtyRoomsAlert(dirtyCount);
      }
    } catch (error) {
      console.error('❌ Dirty rooms monitor error:', error);
    }
  });

  console.log('⏰ Dirty rooms monitor started (runs every 2 hours)');
};

// Monitor rooms that have been dirty for more than 2 hours
export const startOverdueRoomsAlert = () => {
  // Run every 30 minutes
  cron.schedule('*/30 * * * *', async () => {
    try {
      console.log('🔄 Running overdue dirty rooms check...');

      // Get rooms that have been dirty/cleaning for more than 2 hours
      const result = await pool.query(`
        SELECT 
          r.id,
          r.room_number,
          r.room_type,
          r.status,
          r.status_changed_at,
          ROUND(CAST(EXTRACT(EPOCH FROM (NOW() - r.status_changed_at))/3600 AS NUMERIC), 2) as hours_overdue
        FROM rooms r
        WHERE r.status IN ('dirty', 'cleaning')
          AND r.status_changed_at IS NOT NULL
          AND EXTRACT(EPOCH FROM (NOW() - r.status_changed_at))/3600 >= 2.0
        ORDER BY hours_overdue DESC
      `);

      if (result.rows.length === 0) {
        console.log('✅ No overdue dirty rooms');
        return;
      }

      console.log(`🚨 Found ${result.rows.length} overdue dirty room(s)`);

      // Send alert for each overdue room
      for (const room of result.rows) {
        const hoursText = room.hours_overdue >= 3 
          ? `${Math.floor(room.hours_overdue)} heures` 
          : `${room.hours_overdue} heures`;
        
        await notificationService.createNotificationForRoles(
          ['housekeeping', 'manager', 'admin'],
          {
            type: 'room_alert',
            title: `🚨 Chambre ${room.room_number} - Nettoyage en retard`,
            message: `La chambre ${room.room_number} (${room.room_type}) est ${room.status === 'dirty' ? 'sale' : 'en cours de nettoyage'} depuis ${hoursText}. Veuillez la traiter immédiatement.`,
            priority: room.hours_overdue >= 3 ? 'high' : 'medium',
          }
        );

        console.log(`📬 Alert sent for room ${room.room_number} (${hoursText} overdue)`);
      }

      console.log('✅ Overdue rooms alert job completed');
    } catch (error) {
      console.error('❌ Overdue rooms alert job error:', error);
    }
  });

  console.log('⏰ Overdue dirty rooms alert started (runs every 30 minutes)');
};

// Start all scheduled jobs
export const startScheduledJobs = () => {
  startAutoCheckout();
  startAutoCheckin();
  startDirtyRoomsMonitor();
  startOverdueRoomsAlert(); // NEW: Alert for rooms dirty > 2 hours
  console.log('✅ All scheduled jobs initialized');
};
