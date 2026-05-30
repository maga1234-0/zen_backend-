import { Router } from 'express';
import {
  // Services
  getSpaServices,
  getServiceCategories,
  createSpaService,
  updateSpaService,
  deleteSpaService,
  // Therapists
  getTherapists,
  createTherapist,
  updateTherapist,
  // Bookings
  getSpaBookings,
  createSpaBooking,
  updateSpaBooking,
  cancelSpaBooking,
  // Products
  getSpaProducts,
  createProductSale,
  // Packages
  getSpaPackages,
  // Statistics
  getSpaStatistics,
  getAvailableTimeSlots
} from '../controllers/spaController';
import { authenticate } from '../middleware/auth';

const router = Router();

// All routes require authentication
router.use(authenticate);

// ============================================
// SERVICE ROUTES
// ============================================

// Get all services
router.get('/services', getSpaServices);

// Get service categories
router.get('/categories', getServiceCategories);

// Create service
router.post('/services', createSpaService);

// Update service
router.put('/services/:id', updateSpaService);

// Delete service
router.delete('/services/:id', deleteSpaService);

// ============================================
// THERAPIST ROUTES
// ============================================

// Get all therapists
router.get('/therapists', getTherapists);

// Create therapist
router.post('/therapists', createTherapist);

// Update therapist
router.put('/therapists/:id', updateTherapist);

// ============================================
// BOOKING ROUTES
// ============================================

// Get all bookings
router.get('/bookings', getSpaBookings);

// Create booking
router.post('/bookings', createSpaBooking);

// Update booking
router.put('/bookings/:id', updateSpaBooking);

// Cancel booking
router.post('/bookings/:id/cancel', cancelSpaBooking);

// Get available time slots
router.get('/available-slots', getAvailableTimeSlots);

// ============================================
// PRODUCT ROUTES
// ============================================

// Get all products
router.get('/products', getSpaProducts);

// Create product sale
router.post('/product-sales', createProductSale);

// ============================================
// PACKAGE ROUTES
// ============================================

// Get all packages
router.get('/packages', getSpaPackages);

// ============================================
// STATISTICS ROUTES
// ============================================

// Get statistics
router.get('/statistics', getSpaStatistics);

export default router;
