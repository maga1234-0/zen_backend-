import express from 'express';
import { authenticate } from '../middleware/auth';
import { 
  getGuestInvoice, 
  payGuestInvoice, 
  getGuestsWithUnpaidCharges 
} from '../controllers/guestInvoiceController';

const router = express.Router();

// Toutes les routes nécessitent authentification
router.use(authenticate);

// GET /api/guest-invoices/unpaid - Obtenir tous les clients avec des achats impayés
router.get('/unpaid', getGuestsWithUnpaidCharges);

// GET /api/guest-invoices/:guestId - Obtenir facture complète d'un client (tous ses achats)
router.get('/:guestId', getGuestInvoice);

// POST /api/guest-invoices/:guestId/pay - Payer la facture d'un client
router.post('/:guestId/pay', payGuestInvoice);

export default router;
