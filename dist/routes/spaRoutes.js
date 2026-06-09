"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const spaController_1 = require("../controllers/spaController");
const auth_1 = require("../middleware/auth");
const router = (0, express_1.Router)();
// All routes require authentication
router.use(auth_1.authenticate);
// ============================================
// SERVICE ROUTES
// ============================================
// Get all services
router.get('/services', spaController_1.getSpaServices);
// Get service categories
router.get('/categories', spaController_1.getServiceCategories);
// Create service
router.post('/services', spaController_1.createSpaService);
// Update service
router.put('/services/:id', spaController_1.updateSpaService);
// Delete service
router.delete('/services/:id', spaController_1.deleteSpaService);
// ============================================
// THERAPIST ROUTES
// ============================================
// Get all therapists
router.get('/therapists', spaController_1.getTherapists);
// Create therapist
router.post('/therapists', spaController_1.createTherapist);
// Update therapist
router.put('/therapists/:id', spaController_1.updateTherapist);
// ============================================
// BOOKING ROUTES
// ============================================
// Get all bookings
router.get('/bookings', spaController_1.getSpaBookings);
// Create booking
router.post('/bookings', spaController_1.createSpaBooking);
// Update booking
router.put('/bookings/:id', spaController_1.updateSpaBooking);
// Cancel booking
router.post('/bookings/:id/cancel', spaController_1.cancelSpaBooking);
// Get available time slots
router.get('/available-slots', spaController_1.getAvailableTimeSlots);
// ============================================
// PRODUCT ROUTES
// ============================================
// Get all products
router.get('/products', spaController_1.getSpaProducts);
// Create product sale
router.post('/product-sales', spaController_1.createProductSale);
// ============================================
// PACKAGE ROUTES
// ============================================
// Get all packages
router.get('/packages', spaController_1.getSpaPackages);
// ============================================
// STATISTICS ROUTES
// ============================================
// Get statistics
router.get('/statistics', spaController_1.getSpaStatistics);
exports.default = router;
