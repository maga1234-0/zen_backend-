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

async function testLogin() {
  try {
    console.log('Testing database connection...');
    console.log('DB Config:', {
      host: process.env.DB_HOST,
      port: process.env.DB_PORT,
      database: process.env.DB_NAME,
      user: process.env.DB_USER,
    });

    const email = 'admin@hotel.com';
    const password = 'password123';

    console.log('\nQuerying user:', email);
    const result = await pool.query(
      'SELECT id, email, password_hash, first_name, last_name, role, is_active FROM users WHERE email = $1',
      [email]
    );

    if (result.rows.length === 0) {
      console.log('❌ User not found in database');
      return;
    }

    const user = result.rows[0];
    console.log('\n✅ User found:');
    console.log('  ID:', user.id);
    console.log('  Email:', user.email);
    console.log('  Name:', user.first_name, user.last_name);
    console.log('  Role:', user.role);
    console.log('  Active:', user.is_active);
    console.log('  Password hash:', user.password_hash);

    if (!user.is_active) {
      console.log('\n❌ Account is deactivated');
      return;
    }

    console.log('\nTesting password:', password);
    const isValidPassword = await bcrypt.compare(password, user.password_hash);
    
    if (isValidPassword) {
      console.log('✅ Password is CORRECT!');
    } else {
      console.log('❌ Password is INCORRECT!');
      
      // Generate a new hash for comparison
      const newHash = await bcrypt.hash(password, 10);
      console.log('\nNew hash for "password123":', newHash);
      console.log('\nTo fix, run this SQL:');
      console.log(`UPDATE users SET password_hash = '${newHash}' WHERE email = '${email}';`);
    }

    await pool.end();
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

testLogin();
