import { Router } from 'express';
import { login, getProfile, getRoles } from '../controllers/authController';
import { authenticate } from '../middleware/auth';

const router = Router();

router.post('/login', login);
router.get('/profile', authenticate, getProfile);
router.get('/roles', authenticate, getRoles);

export default router;
