import express from 'express';
import { authenticate } from '../middleware/auth';
import {
  recordBookingPayment,
  recordRestaurantPayment,
  recordSpaPayment,
  getAllPayments,
  getPaymentStats
} from '../controllers/paymentController';

const router = express.Router();

// Route pour paiements de réservations (chambres)
router.post('/', authenticate, recordBookingPayment);

// Routes pour paiements restaurant
router.post('/restaurant/:orderId', authenticate, recordRestaurantPayment);

// Routes pour paiements spa
router.post('/spa/:bookingId', authenticate, recordSpaPayment);

// Routes générales
router.get('/', authenticate, getAllPayments);
router.get('/stats', authenticate, getPaymentStats);

export default router;
