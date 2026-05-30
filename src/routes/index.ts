import { Router } from 'express';
import authRoutes from './authRoutes';
import dashboardRoutes from './dashboardRoutes';
import roomRoutes from './roomRoutes';
import bookingRoutes from './bookingRoutes';
import guestRoutes from './guestRoutes';
import userRoutes from './userRoutes';
import paymentRoutes from './paymentRoutes';
import notificationRoutes from './notificationRoutes';
import aiRoutes from './aiRoutes';
import restaurantRoutes from './restaurantRoutes';
import onlineBookingRoutes from './onlineBookingRoutes';
import spaRoutes from './spaRoutes';

const router = Router();

router.use('/auth', authRoutes);
router.use('/dashboard', dashboardRoutes);
router.use('/rooms', roomRoutes);
router.use('/bookings', bookingRoutes);
router.use('/guests', guestRoutes);
router.use('/users', userRoutes);
router.use('/payments', paymentRoutes);
router.use('/notifications', notificationRoutes);
router.use('/ai', aiRoutes);
router.use('/restaurant', restaurantRoutes);
router.use('/online-booking', onlineBookingRoutes);
router.use('/spa', spaRoutes);

export default router;
