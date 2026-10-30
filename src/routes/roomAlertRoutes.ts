import express from 'express';
import * as roomAlertController from '../controllers/roomAlertController';
import { authenticate, authorize } from '../middleware/auth';

const router = express.Router();

// All routes require authentication
router.use(authenticate);

// Get overdue dirty rooms (rooms dirty > 2 hours)
// Accessible by: admin, manager, housekeeping
router.get(
  '/overdue',
  authorize('admin', 'manager', 'housekeeping'),
  roomAlertController.getOverdueRooms
);

// Get room status duration (how long a room has been in current status)
// Accessible by: admin, manager, housekeeping
router.get(
  '/:roomId/status-duration',
  authorize('admin', 'manager', 'housekeeping'),
  roomAlertController.getRoomStatusDuration
);

// Get room cleaning statistics
// Accessible by: admin, manager, housekeeping
router.get(
  '/stats/cleaning',
  authorize('admin', 'manager', 'housekeeping'),
  roomAlertController.getRoomCleaningStats
);

// Manually trigger overdue room alerts (for testing)
// Accessible by: admin, manager only
router.post(
  '/trigger-alerts',
  authorize('admin', 'manager'),
  roomAlertController.triggerOverdueRoomAlerts
);

export default router;
