import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import dotenv from 'dotenv';
import { startScheduledJobs } from './services/scheduledJobs';

// Try to import routes with error handling
let routes;
try {
  routes = require('./routes').default;
  console.log('✅ Routes imported successfully');
} catch (error: any) {
  console.error('❌ Failed to import routes:', error.message);
  console.error('Stack:', error.stack);
  // Create empty router as fallback
  const { Router } = require('express');
  routes = Router();
  routes.get('/', (req: express.Request, res: express.Response) => {
    res.json({ error: 'Routes failed to load', message: error.message });
  });
}

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(helmet());

// CORS configuration
const corsOptions = {
  origin: (origin: string | undefined, callback: (err: Error | null, allow?: boolean) => void) => {
    // Allow requests with no origin (like mobile apps or curl requests)
    if (!origin) return callback(null, true);
    
    const allowedOrigins = process.env.CORS_ORIGIN ? 
      process.env.CORS_ORIGIN.split(',') : 
      ['http://localhost:5173', 'http://localhost:5174'];
    
    if (allowedOrigins.indexOf(origin) !== -1 || allowedOrigins.includes('*')) {
      callback(null, true);
    } else {
      console.log(`❌ CORS blocked: ${origin} not in ${allowedOrigins}`);
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  optionsSuccessStatus: 200
};

app.use(cors(corsOptions));
app.use(morgan('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

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
  res.json({ status: 'OK', timestamp: new Date().toISOString() });
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
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error(err.stack);
  res.status(500).json({ message: 'Something went wrong!' });
});

// Only start server if not in Vercel serverless environment
if (process.env.VERCEL !== '1') {
  app.listen(PORT, () => {
    console.log(`🚀 Server running on port ${PORT}`);
    console.log(`📝 User routes enabled`);
    
    // Start scheduled jobs (only in non-serverless environment)
    startScheduledJobs();
  });
} else {
  console.log('🚀 Server running in Vercel serverless mode');
  console.log('⏰ Scheduled jobs disabled in serverless environment');
}

// Export for Vercel serverless
export default app;
// Trigger nodemon restart
// Trigger restart
// Restart for CORS change
// Restart for CORS change