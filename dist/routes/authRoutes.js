"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const authController_1 = require("../controllers/authController");
const auth_1 = require("../middleware/auth");
const router = (0, express_1.Router)();
router.post('/login', authController_1.login);
router.get('/profile', auth_1.authenticate, authController_1.getProfile);
router.get('/roles', authController_1.getRoles); // Public route - no authentication needed
// Password reset routes (public - no authentication needed)
router.post('/forgot-password', authController_1.forgotPassword);
router.post('/verify-reset-code', authController_1.verifyResetCode);
router.post('/reset-password', authController_1.resetPassword);
exports.default = router;
