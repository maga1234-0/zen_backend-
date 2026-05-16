const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  host: process.env.DB_HOST,
  port: process.env.DB_PORT,
  database: process.env.DB_NAME,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  ssl: {
    rejectUnauthorized: false
  }
});

async function testConnection() {
  try {
    console.log('Testing Supabase connection...');
    console.log('Host:', process.env.DB_HOST);
    console.log('Database:', process.env.DB_NAME);
    console.log('User:', process.env.DB_USER);
    
    const result = await pool.query('SELECT NOW()');
    console.log('✅ Connected successfully!');
    console.log('Server time:', result.rows[0].now);
    
    // Check if users exist
    const users = await pool.query('SELECT email, role FROM users');
    console.log('\n📋 Users in database:');
    users.rows.forEach(user => {
      console.log(`  - ${user.email} (${user.role})`);
    });
    
    await pool.end();
  } catch (error) {
    console.error('❌ Connection failed:', error.message);
    process.exit(1);
  }
}

testConnection();
