import { Pool } from 'pg';
import dotenv from 'dotenv';

dotenv.config();

export const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false,
  },
  max: 5,
  connectionTimeoutMillis: 10000,
});

pool.on('connect', () => {
  console.log('✅ Database connected successfully');
});

pool.on('error', (err: Error) => {
  console.error('❌ Unexpected database error:', err);
  process.exit(-1);
});

export default pool;
