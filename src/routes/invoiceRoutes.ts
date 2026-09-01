import express from 'express';
import { authenticate } from '../middleware/auth';
import { 
  getBookingInvoice, 
  payBookingInvoice, 
  getUnpaidInvoices 
} from '../controllers/invoiceController';

const router = express.Router();

// Toutes les routes nécessitent authentification
router.use(authenticate);

// GET /api/invoices/unpaid - Obtenir toutes les factures impayées
router.get('/unpaid', getUnpaidInvoices);

// GET /api/invoices/booking/:bookingId - Obtenir facture détaillée d'une réservation
router.get('/booking/:bookingId', getBookingInvoice);

// POST /api/invoices/booking/:bookingId/pay - Payer une facture
router.post('/booking/:bookingId/pay', payBookingInvoice);

export default router;
