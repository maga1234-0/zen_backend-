import { Router } from 'express';
import {
  getDashboardStats,
  getBookingTrends,
  getRevenueAnalytics,
  getRecentActivities,
} from '../controllers/dashboardController';
import { authenticate } from '../middleware/auth';

const router = Router();

router.use(authenticate);

router.get('/stats', getDashboardStats);
router.get('/booking-trends', getBookingTrends);
router.get('/revenue-analytics', getRevenueAnalytics);
router.get('/recent-activities', getRecentActivities);

export default router;
