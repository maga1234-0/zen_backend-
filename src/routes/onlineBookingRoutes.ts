import { Router } from 'express';
import {
  // Public endpoints
  getAvailableRooms,
  getBookingSettings,
  validatePromoCode,
  createOnlineBooking,
  getBookingByReference,
  cancelOnlineBooking,
  getPublicReviews,
  getFAQs,
  // Admin endpoints
  getAllOnlineBookings,
  getOnlineBookingStats,
  convertToInternalBooking
} from '../controllers/onlineBookingController';
import { authenticate } from '../middleware/auth';

const router = Router();

// ============================================
// PUBLIC ROUTES (No authentication required)
// ============================================

// Get available rooms for dates
router.get('/public/availability', getAvailableRooms);

// Get booking settings
router.get('/public/settings', getBookingSettings);

// Validate promo code
router.post('/public/validate-promo', validatePromoCode);

// Create online booking
router.post('/public/bookings', createOnlineBooking);

// Get booking by reference (requires email for security)
router.get('/public/bookings/:reference', getBookingByReference);

// Cancel booking
router.post('/public/bookings/:reference/cancel', cancelOnlineBooking);

// Get public reviews
router.get('/public/reviews', getPublicReviews);

// Get FAQs
router.get('/public/faqs', getFAQs);

// ============================================
// ADMIN ROUTES (Authentication required)
// ============================================

// Get all online bookings
router.get('/admin/bookings', authenticate, getAllOnlineBookings);

// Get statistics
router.get('/admin/stats', authenticate, getOnlineBookingStats);

// Convert online booking to internal booking
router.post('/admin/bookings/:id/convert', authenticate, convertToInternalBooking);

export default router;
