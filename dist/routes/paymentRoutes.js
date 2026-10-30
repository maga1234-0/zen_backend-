"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const auth_1 = require("../middleware/auth");
const paymentController_1 = require("../controllers/paymentController");
const router = express_1.default.Router();
// Route pour paiements de réservations (chambres)
router.post('/', auth_1.authenticate, paymentController_1.recordBookingPayment);
// Routes pour paiements restaurant
router.post('/restaurant/:orderId', auth_1.authenticate, paymentController_1.recordRestaurantPayment);
// Routes pour paiements spa
router.post('/spa/:bookingId', auth_1.authenticate, paymentController_1.recordSpaPayment);
// Routes générales
router.get('/', auth_1.authenticate, paymentController_1.getAllPayments);
router.get('/stats', auth_1.authenticate, paymentController_1.getPaymentStats);
exports.default = router;
