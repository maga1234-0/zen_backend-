import express from 'express';
import { auth } from '../middleware/auth';
import {
  recordRestaurantPayment,
  recordSpaPayment,
  getAllPayments,
  getPaymentStats
} from '../controllers/paymentController';

const router = express.Router();

// Routes pour paiements restaurant
router.post('/restaurant/:orderId', auth, recordRestaurantPayment);

// Routes pour paiements spa
router.post('/spa/:bookingId', auth, recordSpaPayment);

// Routes générales
router.get('/', auth, getAllPayments);
router.get('/stats', auth, getPaymentStats);

export default router;
