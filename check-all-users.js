require('dotenv').config();
const { Pool } = require('pg');
const bcrypt = require('bcryptjs');

const pool = new Pool({
  host: process.env.DB_HOST,
  port: process.env.DB_PORT,
  database: process.env.DB_NAME,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
});

async function checkAllUsers() {
  try {
    console.log('Checking all users...\n');

    const result = await pool.query(
      'SELECT id, email, password_hash, first_name, last_name, role, is_active FROM users ORDER BY email'
    );

    const password = 'password123';

    for (const user of result.rows) {
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      console.log('Email:', user.email);
      console.log('Name:', user.first_name, user.last_name);
      console.log('Role:', user.role);
      console.log('Active:', user.is_active);
      console.log('Hash:', user.password_hash);
      
      const isValid = await bcrypt.compare(password, user.password_hash);
      console.log('Password "password123" works:', isValid ? '✅ YES' : '❌ NO');
      console.log();
    }

    await pool.end();
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

checkAllUsers();
