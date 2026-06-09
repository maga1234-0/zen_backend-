"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const helmet_1 = __importDefault(require("helmet"));
const morgan_1 = __importDefault(require("morgan"));
const dotenv_1 = __importDefault(require("dotenv"));
const path_1 = __importDefault(require("path"));
const scheduledJobs_1 = require("./services/scheduledJobs");
// IMPORTANT: Load environment variables FIRST before any other imports
// Load from the root of zen_backend folder
dotenv_1.default.config({ path: path_1.default.join(__dirname, '../.env') });
console.log('📝 Environment loaded:');
console.log('- DATABASE_URL:', process.env.DATABASE_URL ? '✅ Set' : '❌ Not set');
console.log('- SMTP_USER:', process.env.SMTP_USER ? '✅ Set' : '❌ Not set');
console.log('- PORT:', process.env.PORT || '5000');
// Try to import routes with error handling
let routes;
try {
    routes = require('./routes').default;
    console.log('✅ Routes imported successfully');
}
catch (error) {
    console.error('❌ Failed to import routes:', error.message);
    console.error('Stack:', error.stack);
    // Create empty router as fallback
    const { Router } = require('express');
    routes = Router();
    routes.get('/', (req, res) => {
        res.json({ error: 'Routes failed to load', message: error.message });
    });
}
const app = (0, express_1.default)();
const PORT = process.env.PORT || 5000;
// Middleware
app.use((0, helmet_1.default)());
// CORS configuration
const corsOptions = {
    origin: (origin, callback) => {
        // Allow requests with no origin (like mobile apps or curl requests)
        if (!origin)
            return callback(null, true);
        const allowedOrigins = process.env.CORS_ORIGIN ?
            process.env.CORS_ORIGIN.split(',') :
            [
                'http://localhost:5173',
                'http://localhost:5174',
                'https://zen-lyart.vercel.app'
            ];
        if (allowedOrigins.indexOf(origin) !== -1 || allowedOrigins.includes('*')) {
            callback(null, true);
        }
        else {
            console.log(`❌ CORS blocked: ${origin} not in ${allowedOrigins.join(', ')}`);
            callback(new Error('Not allowed by CORS'));
        }
    },
    credentials: true,
    optionsSuccessStatus: 200
};
app.use((0, cors_1.default)(corsOptions));
app.use((0, morgan_1.default)('dev'));
app.use(express_1.default.json());
app.use(express_1.default.urlencoded({ extended: true }));
// Add a root endpoint
app.get('/', (req, res) => {
    res.json({
        message: 'Hotel PMS Backend API',
        version: '1.0.0',
        timestamp: new Date().toISOString(),
        endpoints: {
            health: '/health',
            api: '/api',
            documentation: 'See API documentation for available endpoints'
        }
    });
});
// Routes
app.use('/api', routes);
// Health check
app.get('/health', (req, res) => {
    res.status(200).send('OK');
});
// Add API root endpoint
app.get('/api', (req, res) => {
    res.json({
        message: 'Hotel PMS API',
        availableEndpoints: [
            '/api/auth/login (POST)',
            '/api/users (GET, POST, PUT, DELETE)',
            '/api/rooms (GET, POST, PUT, DELETE)',
            '/api/bookings (GET, POST, PUT, DELETE)',
            '/api/guests (GET, POST, PUT, DELETE)',
            '/api/payments (GET, POST)',
            '/api/notifications (GET, PUT, DELETE)',
            '/api/dashboard/stats (GET)'
        ],
        timestamp: new Date().toISOString()
    });
});
// Error handling
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).json({ message: 'Something went wrong!' });
});
// Only start server if not in Vercel serverless environment
if (process.env.VERCEL !== '1') {
    app.listen(PORT, () => {
        console.log(`🚀 Server running on port ${PORT}`);
        console.log(`📝 User routes enabled`);
        // Start scheduled jobs (only in non-serverless environment)
        (0, scheduledJobs_1.startScheduledJobs)();
    });
}
else {
    console.log('🚀 Server running in Vercel serverless mode');
    console.log('⏰ Scheduled jobs disabled in serverless environment');
}
// Export for Vercel serverless
exports.default = app;
// Trigger nodemon restart
// Trigger restart
// Restart for CORS change
// Restart for CORS change
