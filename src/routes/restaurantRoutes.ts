import { Router } from 'express';
import {
  // Menu
  getMenuCategories,
  getMenuItems,
  createMenuItem,
  updateMenuItem,
  deleteMenuItem,
  // Tables
  getRestaurantTables,
  updateTableStatus,
  // Orders
  getOrders,
  getOrderById,
  createOrder,
  updateOrderStatus,
  updateOrderPayment,
  // Reservations
  getTableReservations,
  createTableReservation,
  updateReservationStatus,
  // Stats
  getRestaurantStats
} from '../controllers/restaurantController';
import { authenticate } from '../middleware/auth';

const router = Router();

// All routes require authentication
router.use(authenticate);

// ============================================
// MENU ROUTES
// ============================================
router.get('/menu/categories', getMenuCategories);
router.get('/menu/items', getMenuItems);
router.post('/menu/items', createMenuItem);
router.put('/menu/items/:id', updateMenuItem);
router.delete('/menu/items/:id', deleteMenuItem);

// ============================================
// TABLES ROUTES
// ============================================
router.get('/tables', getRestaurantTables);
router.put('/tables/:id/status', updateTableStatus);

// ============================================
// ORDERS ROUTES
// ============================================
router.get('/orders', getOrders);
router.get('/orders/:id', getOrderById);
router.post('/orders', createOrder);
router.put('/orders/:id/status', updateOrderStatus);
router.put('/orders/:id/payment', updateOrderPayment);

// ============================================
// RESERVATIONS ROUTES
// ============================================
router.get('/reservations', getTableReservations);
router.post('/reservations', createTableReservation);
router.put('/reservations/:id/status', updateReservationStatus);

// ============================================
// STATISTICS ROUTES
// ============================================
router.get('/stats', getRestaurantStats);

export default router;
