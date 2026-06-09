const { Pool } = require('pg');

console.log('Testing database connection with direct URL...');

const pool = new Pool({
  connectionString: 'postgresql://postgres.vzzznyrlbhftixgkqcca:6OjTIB6BXw1oslvythsi@aws-1-ap-southeast-1.pooler.supabase.com:6543/postgres',
  ssl: {
    rejectUnauthorized: false,
  },
});

pool.query('SELECT NOW()', (err, res) => {
  if (err) {
    console.error('❌ Database connection failed:', err.message);
    console.error('Error code:', err.code);
  } else {
    console.log('✅ Database connected successfully!');
    console.log('Server time:', res.rows[0].now);
  }
  process.exit(0);
});
