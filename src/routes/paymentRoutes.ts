import { Router } from 'express';
import { getAllPayments, createPayment } from '../controllers/paymentController';
import { authenticate } from '../middleware/auth';

const router = Router();

router.use(authenticate);

router.get('/', getAllPayments);
router.post('/', createPayment);

export default router;
