const { Pool } = require('pg');

console.log('Testing with correct password...');

const pool = new Pool({
  connectionString: 'postgresql://postgres.vzzznyrlbhftixgkqcca:6OjTIB6BXw1oslvy@aws-1-ap-southeast-1.pooler.supabase.com:6543/postgres',
  ssl: {
    rejectUnauthorized: false,
  },
});

pool.query('SELECT NOW() as time, current_database() as db', (err, res) => {
  if (err) {
    console.error('❌ Connection failed:', err.message);
  } else {
    console.log('✅ Connection successful!');
    console.log('Time:', res.rows[0].time);
    console.log('Database:', res.rows[0].db);
  }
  process.exit(0);
});
