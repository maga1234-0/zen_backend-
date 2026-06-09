import { Router } from 'express';
import { 
  login, 
  getProfile, 
  getRoles,
  forgotPassword,
  verifyResetCode,
  resetPassword 
} from '../controllers/authController';
import { authenticate } from '../middleware/auth';

const router = Router();

router.post('/login', login);
router.get('/profile', authenticate, getProfile);
router.get('/roles', getRoles); // Public route - no authentication needed

// Password reset routes (public - no authentication needed)
router.post('/forgot-password', forgotPassword);
router.post('/verify-reset-code', verifyResetCode);
router.post('/reset-password', resetPassword);

export default router;
