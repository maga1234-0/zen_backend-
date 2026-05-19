import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import dotenv from 'dotenv';
import { Pool } from 'pg';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

console.log('🔧 Starting simple server with configuration:');
console.log(`   PORT: ${PORT}`);
console.log(`   NODE_ENV: ${process.env.NODE_ENV || 'development'}`);
console.log(`   CORS_ORIGIN: ${process.env.CORS_ORIGIN || 'not set'}`);

// Middleware
app.use(helmet());

// CORS configuration
const corsOptions = {
  origin: process.env.CORS_ORIGIN || '*',
  credentials: true,
  optionsSuccessStatus: 200
};

app.use(cors(corsOptions));
app.use(morgan('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Create database pool
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
  max: 5,
  connectionTimeoutMillis: 10000,
});

// Helper function to verify JWT token
const verifyToken = (token: string): any => {
  const jwtSecret = process.env.JWT_SECRET || 'default-secret-key-change-in-production';
  try {
    return jwt.verify(token, jwtSecret);
  } catch (error) {
    throw new Error('Invalid or expired token');
  }
};

// Helper function to check authentication
const checkAuth = (req: express.Request): { userId: string; email: string; role: string } => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    throw new Error('Authentication required');
  }
  
  const token = authHeader.substring(7);
  const decoded = verifyToken(token) as any;
  return {
    userId: decoded.id,
    email: decoded.email,
    role: decoded.role
  };
};

// Root endpoint
app.get('/', (req, res) => {
  res.json({
    message: 'Hotel PMS Backend API (Simple Version)',
    version: '1.0.0',
    timestamp: new Date().toISOString(),
    endpoints: {
      health: '/health',
      api: '/api',
      auth: '/api/auth/login (POST)',
      users: '/api/users (GET, POST)'
    }
  });
});

// Health check
app.get('/health', async (req, res) => {
  try {
    await pool.query('SELECT 1 as test');
    res.json({ 
      status: 'OK', 
      database: 'connected',
      timestamp: new Date().toISOString() 
    });
  } catch (error: any) {
    res.status(500).json({ 
      status: 'ERROR', 
      database: 'disconnected',
      error: error.message,
      timestamp: new Date().toISOString() 
    });
  }
});

// API root
app.get('/api', (req, res) => {
  res.json({
    message: 'Hotel PMS API',
    availableEndpoints: [
      '/api/auth/login (POST)',
      '/api/users (GET, POST)',
      '/api/rooms (GET)',
      '/api/bookings (GET)',
      '/api/guests (GET)',
      '/api/payments (GET)',
      '/api/notifications (GET)',
      '/api/dashboard/stats (GET)'
    ],
    timestamp: new Date().toISOString()
  });
});

// Auth login
app.post('/api/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ message: 'Email and password are required' });
    }

    console.log('🔐 Login attempt for:', email);

    // Query user from database
    const result = await pool.query(
      'SELECT id, email, password_hash, first_name, last_name, role, is_active FROM users WHERE email = $1',
      [email]
    );

    if (result.rows.length === 0) {
      console.log('❌ User not found:', email);
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    const user = result.rows[0];

    if (!user.is_active) {
      console.log('❌ Account deactivated:', email);
      return res.status(403).json({ message: 'Account is deactivated' });
    }

    const isValidPassword = await bcrypt.compare(password, user.password_hash);

    if (!isValidPassword) {
      console.log('❌ Invalid password for:', email);
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    const jwtSecret = process.env.JWT_SECRET || 'default-secret-key-change-in-production';
    
    const token = jwt.sign(
      { id: user.id, email: user.email, role: user.role },
      jwtSecret,
      { expiresIn: '7d' }
    );

    const responseData = {
      token,
      user: {
        id: user.id,
        email: user.email,
        firstName: user.first_name,
        lastName: user.last_name,
        role: user.role,
      },
    };

    console.log('✅ Login successful for:', email);
    res.status(200).json(responseData);
    
  } catch (error: any) {
    console.error('❌ Login error:', error);
    res.status(500).json({ 
      message: 'Server error',
      error: error.message
    });
  }
});

// Get all users
app.get('/api/users', async (req, res) => {
  try {
    // Check authentication
    const auth = checkAuth(req);
    console.log('✅ Authenticated user:', auth.email, '- Role:', auth.role);
    
    // Get all users
    const result = await pool.query(
      'SELECT id, email, first_name, last_name, phone, role, is_active, created_at FROM users ORDER BY created_at DESC'
    );
    
    console.log('✅ Found', result.rows.length, 'users');
    res.status(200).json(result.rows);
    
  } catch (error: any) {
    console.error('❌ Get users error:', error);
    
    if (error.message === 'Authentication required') {
      return res.status(401).json({ message: 'Authentication required' });
    }
    
    if (error.message === 'Invalid or expired token') {
      return res.status(401).json({ message: 'Invalid or expired token' });
    }
    
    res.status(500).json({ 
      message: 'Server error',
      error: error.message
    });
  }
});

// Create user (add staff)
app.post('/api/users', async (req, res) => {
  try {
    // Check authentication
    const auth = checkAuth(req);
    console.log('✅ Authenticated user:', auth.email, '- Role:', auth.role);
    
    // Check if user has permission (admin or manager)
    if (auth.role !== 'admin' && auth.role !== 'manager') {
      return res.status(403).json({ message: 'Permission denied. Only admins and managers can create users.' });
    }
    
    // Parse request body
    const { email, password, firstName, lastName, phone, role } = req.body;
    
    // Validate required fields
    if (!email || !password || !firstName || !lastName || !role) {
      return res.status(400).json({ 
        message: 'Missing required fields',
        required: ['email', 'password', 'firstName', 'lastName', 'role'],
        optional: ['phone']
      });
    }
    
    // Check if user already exists
    const existingUser = await pool.query(
      'SELECT id FROM users WHERE email = $1',
      [email]
    );
    
    if (existingUser.rows.length > 0) {
      return res.status(400).json({ message: 'User with this email already exists' });
    }
    
    // Hash password
    const passwordHash = await bcrypt.hash(password, 10);
    
    // Create user
    const result = await pool.query(
      `INSERT INTO users (email, password_hash, first_name, last_name, phone, role) 
       VALUES ($1, $2, $3, $4, $5, $6) 
       RETURNING id, email, first_name, last_name, phone, role, is_active, created_at`,
      [email, passwordHash, firstName, lastName, phone || null, role]
    );
    
    console.log('✅ User created:', result.rows[0].email);
    res.status(201).json(result.rows[0]);
    
  } catch (error: any) {
    console.error('❌ Create user error:', error);
    
    if (error.message === 'Authentication required') {
      return res.status(401).json({ message: 'Authentication required' });
    }
    
    if (error.message === 'Invalid or expired token') {
      return res.status(401).json({ message: 'Invalid or expired token' });
    }
    
    res.status(500).json({ 
      message: 'Server error',
      error: error.message
    });
  }
});

// Get rooms
app.get('/api/rooms', async (req, res) => {
  try {
    // Check authentication
    const auth = checkAuth(req);
    console.log('✅ Authenticated user:', auth.email, '- Role:', auth.role);
    
    // Get all rooms with room type information
    const result = await pool.query(`
      SELECT 
        r.id, r.room_number, r.floor, r.status,
        rt.name as room_type, rt.base_price, rt.max_occupancy,
        rt.amenities
      FROM rooms r
      JOIN room_types rt ON r.room_type_id = rt.id
      ORDER BY r.floor, r.room_number
    `);
    
    console.log('✅ Found', result.rows.length, 'rooms');
    res.status(200).json(result.rows);
    
  } catch (error: any) {
    console.error('❌ Get rooms error:', error);
    
    if (error.message === 'Authentication required') {
      return res.status(401).json({ message: 'Authentication required' });
    }
    
    if (error.message === 'Invalid or expired token') {
      return res.status(401).json({ message: 'Invalid or expired token' });
    }
    
    res.status(500).json({ 
      message: 'Server error',
      error: error.message
    });
  }
});

// Get room types
app.get('/api/rooms/types', async (req, res) => {
  try {
    // Check authentication
    const auth = checkAuth(req);
    console.log('✅ Authenticated user:', auth.email, '- Role:', auth.role);
    
    // Get all room types
    const result = await pool.query(`
      SELECT id, name, description, base_price, max_occupancy, amenities
      FROM room_types
      ORDER BY base_price
    `);
    
    console.log('✅ Found', result.rows.length, 'room types');
    res.status(200).json(result.rows);
    
  } catch (error: any) {
    console.error('❌ Get room types error:', error);
    
    if (error.message === 'Authentication required') {
      return res.status(401).json({ message: 'Authentication required' });
    }
    
    if (error.message === 'Invalid or expired token') {
      return res.status(401).json({ message: 'Invalid or expired token' });
    }
    
    res.status(500).json({ 
      message: 'Server error',
      error: error.message
    });
  }
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ 
    message: 'Route not found',
    path: req.path,
    method: req.method,
    availableEndpoints: [
      '/',
      '/health',
      '/api',
      '/api/auth/login (POST)',
      '/api/users (GET, POST)',
      '/api/rooms (GET)',
      '/api/rooms/types (GET)'
    ]
  });
});

// Error handling middleware
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('❌ Server error:', err.stack);
  res.status(500).json({ 
    message: 'Something went wrong!',
    error: process.env.NODE_ENV === 'production' ? undefined : err.message
  });
});

// Start server
app.listen(PORT, () => {
  console.log(`🚀 Simple server running on port ${PORT}`);
  console.log(`🌐 Health check: http://localhost:${PORT}/health`);
  console.log(`📝 API root: http://localhost:${PORT}/api`);
});

export default app;