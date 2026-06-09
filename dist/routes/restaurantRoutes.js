"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const restaurantController_1 = require("../controllers/restaurantController");
const auth_1 = require("../middleware/auth");
const checkPermission_1 = require("../middleware/checkPermission");
const router = (0, express_1.Router)();
// All routes require authentication
router.use(auth_1.authenticate);
// ============================================
// MENU ROUTES
// ============================================
// Everyone can read menu
router.get('/menu/categories', restaurantController_1.getMenuCategories);
router.get('/menu/items', restaurantController_1.getMenuItems);
// Only restaurant_manager and admin can modify menu
router.post('/menu/items', (0, checkPermission_1.checkPermission)('restaurant.menu', 'create'), restaurantController_1.createMenuItem);
router.put('/menu/items/:id', (0, checkPermission_1.checkPermission)('restaurant.menu', 'update'), restaurantController_1.updateMenuItem);
router.delete('/menu/items/:id', (0, checkPermission_1.checkPermission)('restaurant.menu', 'delete'), restaurantController_1.deleteMenuItem);
// ============================================
// TABLES ROUTES
// ============================================
// Anyone with restaurant access can read tables
router.get('/tables', (0, checkPermission_1.checkAnyPermission)([
    ['restaurant.tables', 'read'],
    ['restaurant.orders', 'read']
]), restaurantController_1.getRestaurantTables);
// Only managers can create, update, or delete tables
router.post('/tables', (0, checkPermission_1.checkPermission)('restaurant.tables', 'create'), restaurantController_1.createTable);
router.put('/tables/:id', (0, checkPermission_1.checkPermission)('restaurant.tables', 'update'), restaurantController_1.updateTable);
router.delete('/tables/:id', (0, checkPermission_1.checkPermission)('restaurant.tables', 'delete'), restaurantController_1.deleteTable);
// Only staff can update table status
router.put('/tables/:id/status', (0, checkPermission_1.checkPermission)('restaurant.tables', 'update_status'), restaurantController_1.updateTableStatus);
// ============================================
// ORDERS ROUTES
// ============================================
// Anyone with restaurant access can read orders
router.get('/orders', (0, checkPermission_1.checkPermission)('restaurant.orders', 'read'), restaurantController_1.getOrders);
router.get('/orders/:id', (0, checkPermission_1.checkPermission)('restaurant.orders', 'read'), restaurantController_1.getOrderById);
// Servers, managers, and admin can create orders
router.post('/orders', (0, checkPermission_1.checkPermission)('restaurant.orders', 'create'), restaurantController_1.createOrder);
// Managers can update complete order
router.put('/orders/:id', (0, checkPermission_1.checkPermission)('restaurant.orders', 'update'), restaurantController_1.updateOrder);
// Managers can delete orders
router.delete('/orders/:id', (0, checkPermission_1.checkPermission)('restaurant.orders', 'delete'), restaurantController_1.deleteOrder);
// Chef and managers can update order status (kitchen workflow)
router.put('/orders/:id/status', (0, checkPermission_1.checkAnyPermission)([
    ['restaurant.orders', 'update_status'],
    ['restaurant.orders', 'update']
]), restaurantController_1.updateOrderStatus);
// Only cashiers and managers can update payment
router.put('/orders/:id/payment', (0, checkPermission_1.checkAnyPermission)([
    ['restaurant.orders', 'update_payment'],
    ['restaurant.payments', 'create']
]), restaurantController_1.updateOrderPayment);
// ============================================
// RESERVATIONS ROUTES
// ============================================
// Anyone with restaurant access can read reservations
router.get('/reservations', (0, checkPermission_1.checkAnyPermission)([
    ['restaurant.reservations', 'read'],
    ['restaurant.orders', 'read']
]), restaurantController_1.getTableReservations);
// Only managers can manage reservations
router.post('/reservations', (0, checkPermission_1.checkPermission)('restaurant.reservations', 'create'), restaurantController_1.createTableReservation);
router.put('/reservations/:id/status', (0, checkPermission_1.checkPermission)('restaurant.reservations', 'update'), restaurantController_1.updateReservationStatus);
// Update complete reservation (date, time, guests, status, etc.)
router.put('/reservations/:id', (0, checkPermission_1.checkPermission)('restaurant.reservations', 'update'), restaurantController_1.updateReservation);
// Delete reservation
router.delete('/reservations/:id', (0, checkPermission_1.checkPermission)('restaurant.reservations', 'delete'), restaurantController_1.deleteReservation);
// ============================================
// STATISTICS ROUTES
// ============================================
// Only managers and those with stats permission can view stats
router.get('/stats', (0, checkPermission_1.checkAnyPermission)([
    ['restaurant.stats', 'read'],
    ['restaurant.stats', 'read_production']
]), restaurantController_1.getRestaurantStats);
exports.default = router;
