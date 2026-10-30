import { Request, Response } from 'express';
import pool from '../config/database';

// Get all overdue dirty rooms (rooms that have been dirty/cleaning for more than specified hours)
export const getOverdueRooms = async (req: Request, res: Response) => {
  try {
    const hoursThreshold = parseFloat(req.query.hours as string) || 2.0;

    const result = await pool.query(`
      SELECT 
        r.id,
        r.room_number,
        rt.name as room_type,
        r.floor,
        r.status,
        r.status_changed_at,
        ROUND(CAST(EXTRACT(EPOCH FROM (NOW() - r.status_changed_at))/3600 AS NUMERIC), 2) as hours_overdue,
        CASE 
          WHEN EXTRACT(EPOCH FROM (NOW() - r.status_changed_at))/3600 >= $1 THEN 'URGENT'
          WHEN EXTRACT(EPOCH FROM (NOW() - r.status_changed_at))/3600 >= ($1 - 0.5) THEN 'WARNING'
          ELSE 'NORMAL'
        END AS alert_level
      FROM rooms r
      LEFT JOIN room_types rt ON r.room_type_id = rt.id
      WHERE r.status IN ('dirty', 'cleaning')
        AND r.status_changed_at IS NOT NULL
        AND EXTRACT(EPOCH FROM (NOW() - r.status_changed_at))/3600 >= ($1 - 0.5)
      ORDER BY hours_overdue DESC
    `, [hoursThreshold]);

    res.json({
      count: result.rows.length,
      threshold_hours: hoursThreshold,
      rooms: result.rows
    });
  } catch (error) {
    console.error('Error getting overdue rooms:', error);
    res.status(500).json({ error: 'Failed to get overdue rooms' });
  }
};

// Get room status history (how long a room has been in current status)
export const getRoomStatusDuration = async (req: Request, res: Response) => {
  try {
    const { roomId } = req.params;

    const result = await pool.query(`
      SELECT 
        r.id,
        r.room_number,
        rt.name as room_type,
        r.status,
        r.status_changed_at,
        r.updated_at,
        ROUND(CAST(EXTRACT(EPOCH FROM (NOW() - r.status_changed_at))/3600 AS NUMERIC), 2) as hours_in_current_status,
        ROUND(CAST(EXTRACT(EPOCH FROM (NOW() - r.status_changed_at))/60 AS NUMERIC), 0) as minutes_in_current_status
      FROM rooms r
      LEFT JOIN room_types rt ON r.room_type_id = rt.id
      WHERE r.id = $1
    `, [roomId]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Room not found' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error getting room status duration:', error);
    res.status(500).json({ error: 'Failed to get room status duration' });
  }
};

// Get statistics about room cleaning times
export const getRoomCleaningStats = async (req: Request, res: Response) => {
  try {
    const result = await pool.query(`
      SELECT 
        COUNT(*) FILTER (WHERE status = 'dirty') as dirty_rooms,
        COUNT(*) FILTER (WHERE status = 'cleaning') as cleaning_rooms,
        COUNT(*) FILTER (
          WHERE status IN ('dirty', 'cleaning') 
          AND EXTRACT(EPOCH FROM (NOW() - status_changed_at))/3600 >= 2.0
        ) as overdue_rooms,
        COUNT(*) FILTER (
          WHERE status IN ('dirty', 'cleaning') 
          AND EXTRACT(EPOCH FROM (NOW() - status_changed_at))/3600 >= 1.5 
          AND EXTRACT(EPOCH FROM (NOW() - status_changed_at))/3600 < 2.0
        ) as warning_rooms,
        AVG(
          CASE 
            WHEN status IN ('dirty', 'cleaning') 
            THEN EXTRACT(EPOCH FROM (NOW() - status_changed_at))/3600 
          END
        ) as avg_hours_dirty,
        MAX(
          CASE 
            WHEN status IN ('dirty', 'cleaning') 
            THEN EXTRACT(EPOCH FROM (NOW() - status_changed_at))/3600 
          END
        ) as max_hours_dirty
      FROM rooms
      WHERE status_changed_at IS NOT NULL
    `);

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error getting room cleaning stats:', error);
    res.status(500).json({ error: 'Failed to get room cleaning stats' });
  }
};

// Manually trigger overdue room alerts (for testing or manual check)
export const triggerOverdueRoomAlerts = async (req: Request, res: Response) => {
  try {
    const result = await pool.query(`
      SELECT * FROM send_overdue_room_alerts()
    `);

    res.json({
      success: true,
      notifications_sent: result.rows[0].notifications_sent,
      rooms_alerted: result.rows[0].rooms_alerted
    });
  } catch (error) {
    console.error('Error triggering overdue room alerts:', error);
    res.status(500).json({ error: 'Failed to trigger overdue room alerts' });
  }
};
