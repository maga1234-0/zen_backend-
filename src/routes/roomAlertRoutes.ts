import express from 'express';
import * as roomAlertController from '../controllers/roomAlertController';
import { authenticateToken, requireRole } from '../middleware/auth';

const router = express.Router();

// All routes require authentication
router.use(authenticateToken);

// Get overdue dirty rooms (rooms dirty > 2 hours)
// Accessible by: admin, manager, housekeeping
router.get(
  '/overdue',
  requireRole(['admin', 'manager', 'housekeeping']),
  roomAlertController.getOverdueRooms
);

// Get room status duration (how long a room has been in current status)
// Accessible by: admin, manager, housekeeping
router.get(
  '/:roomId/status-duration',
  requireRole(['admin', 'manager', 'housekeeping']),
  roomAlertController.getRoomStatusDuration
);

// Get room cleaning statistics
// Accessible by: admin, manager, housekeeping
router.get(
  '/stats/cleaning',
  requireRole(['admin', 'manager', 'housekeeping']),
  roomAlertController.getRoomCleaningStats
);

// Manually trigger overdue room alerts (for testing)
// Accessible by: admin, manager only
router.post(
  '/trigger-alerts',
  requireRole(['admin', 'manager']),
  roomAlertController.triggerOverdueRoomAlerts
);

export default router;
