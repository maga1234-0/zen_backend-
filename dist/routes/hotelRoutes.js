"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const auth_1 = require("../middleware/auth");
const database_1 = __importDefault(require("../config/database"));
const router = (0, express_1.Router)();
router.use(auth_1.authenticate);
// Get all hotels
router.get('/', async (req, res) => {
    try {
        const result = await database_1.default.query(`SELECT id, name, address, city, country, phone, email, created_at 
       FROM hotels 
       ORDER BY created_at DESC`);
        res.json(result.rows);
    }
    catch (error) {
        console.error('Get hotels error:', error);
        res.status(500).json({ message: 'Server error' });
    }
});
exports.default = router;
