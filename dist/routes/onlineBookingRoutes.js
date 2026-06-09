"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const onlineBookingController_1 = require("../controllers/onlineBookingController");
const auth_1 = require("../middleware/auth");
const router = (0, express_1.Router)();
// ============================================
// PUBLIC ROUTES (No authentication required)
// ============================================
// Get available rooms for dates
router.get('/public/availability', onlineBookingController_1.getAvailableRooms);
// Get booking settings
router.get('/public/settings', onlineBookingController_1.getBookingSettings);
// Validate promo code
router.post('/public/validate-promo', onlineBookingController_1.validatePromoCode);
// Create online booking
router.post('/public/bookings', onlineBookingController_1.createOnlineBooking);
// Get booking by reference (requires email for security)
router.get('/public/bookings/:reference', onlineBookingController_1.getBookingByReference);
// Cancel booking
router.post('/public/bookings/:reference/cancel', onlineBookingController_1.cancelOnlineBooking);
// Get public reviews
router.get('/public/reviews', onlineBookingController_1.getPublicReviews);
// Get FAQs
router.get('/public/faqs', onlineBookingController_1.getFAQs);
// ============================================
// ADMIN ROUTES (Authentication required)
// ============================================
// Get all online bookings
router.get('/admin/bookings', auth_1.authenticate, onlineBookingController_1.getAllOnlineBookings);
// Get statistics
router.get('/admin/stats', auth_1.authenticate, onlineBookingController_1.getOnlineBookingStats);
// Convert online booking to internal booking
router.post('/admin/bookings/:id/convert', auth_1.authenticate, onlineBookingController_1.convertToInternalBooking);
exports.default = router;
