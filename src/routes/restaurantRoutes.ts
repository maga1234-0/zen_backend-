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
import { checkPermission, checkAnyPermission } from '../middleware/checkPermission';

const router = Router();

// All routes require authentication
router.use(authenticate);

// ============================================
// MENU ROUTES
// ============================================
// Everyone can read menu
router.get('/menu/categories', getMenuCategories);
router.get('/menu/items', getMenuItems);

// Only restaurant_manager and admin can modify menu
router.post('/menu/items', checkPermission('restaurant.menu', 'create'), createMenuItem);
router.put('/menu/items/:id', checkPermission('restaurant.menu', 'update'), updateMenuItem);
router.delete('/menu/items/:id', checkPermission('restaurant.menu', 'delete'), deleteMenuItem);

// ============================================
// TABLES ROUTES
// ============================================
// Anyone with restaurant access can read tables
router.get('/tables', checkAnyPermission([
  ['restaurant.tables', 'read'],
  ['restaurant.orders', 'read']
]), getRestaurantTables);

// Only staff can update table status
router.put('/tables/:id/status', checkPermission('restaurant.tables', 'update_status'), updateTableStatus);

// ============================================
// ORDERS ROUTES
// ============================================
// Anyone with restaurant access can read orders
router.get('/orders', checkPermission('restaurant.orders', 'read'), getOrders);
router.get('/orders/:id', checkPermission('restaurant.orders', 'read'), getOrderById);

// Servers, managers, and admin can create orders
router.post('/orders', checkPermission('restaurant.orders', 'create'), createOrder);

// Chef and managers can update order status (kitchen workflow)
router.put('/orders/:id/status', checkAnyPermission([
  ['restaurant.orders', 'update_status'],
  ['restaurant.orders', 'update']
]), updateOrderStatus);

// Only cashiers and managers can update payment
router.put('/orders/:id/payment', checkAnyPermission([
  ['restaurant.orders', 'update_payment'],
  ['restaurant.payments', 'create']
]), updateOrderPayment);

// ============================================
// RESERVATIONS ROUTES
// ============================================
// Anyone with restaurant access can read reservations
router.get('/reservations', checkAnyPermission([
  ['restaurant.reservations', 'read'],
  ['restaurant.orders', 'read']
]), getTableReservations);

// Only managers can manage reservations
router.post('/reservations', checkPermission('restaurant.reservations', 'create'), createTableReservation);
router.put('/reservations/:id/status', checkPermission('restaurant.reservations', 'update'), updateReservationStatus);

// ============================================
// STATISTICS ROUTES
// ============================================
// Only managers and those with stats permission can view stats
router.get('/stats', checkAnyPermission([
  ['restaurant.stats', 'read'],
  ['restaurant.stats', 'read_production']
]), getRestaurantStats);

export default router;
