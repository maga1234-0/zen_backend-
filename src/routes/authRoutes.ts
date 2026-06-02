import { Router } from 'express';
import { login, getProfile, getRoles } from '../controllers/authController';
import { authenticate } from '../middleware/auth';

const router = Router();

router.post('/login', login);
router.get('/profile', authenticate, getProfile);
router.get('/roles', getRoles); // Public route - no authentication needed

export default router;
