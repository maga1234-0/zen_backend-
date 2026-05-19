"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.pool = void 0;
const pg_1 = require("pg");
const dotenv_1 = __importDefault(require("dotenv"));
dotenv_1.default.config();
exports.pool = new pg_1.Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: {
        rejectUnauthorized: false,
    },
    max: 5,
    connectionTimeoutMillis: 10000,
});
exports.pool.on('connect', () => {
    console.log('✅ Database connected successfully');
});
exports.pool.on('error', (err) => {
    console.error('❌ Unexpected database error:', err);
    process.exit(-1);
});
exports.default = exports.pool;
