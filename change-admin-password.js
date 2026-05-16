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

async function changeAdminPassword() {
  try {
    const newPassword = 'admin123';
    console.log('Generating new password hash for:', newPassword);
    
    const hash = await bcrypt.hash(newPassword, 10);
    console.log('New hash:', hash);
    
    const result = await pool.query(
      'UPDATE users SET password_hash = $1 WHERE email = $2 RETURNING email, role',
      [hash, 'admin@hotel.com']
    );
    
    if (result.rows.length > 0) {
      console.log('\n✅ Password updated successfully!');
      console.log('Email:', result.rows[0].email);
      console.log('Role:', result.rows[0].role);
      console.log('\nNew credentials:');
      console.log('  Email: admin@hotel.com');
      console.log('  Password:', newPassword);
      
      // Verify it works
      const verify = await pool.query(
        'SELECT password_hash FROM users WHERE email = $1',
        ['admin@hotel.com']
      );
      
      const isValid = await bcrypt.compare(newPassword, verify.rows[0].password_hash);
      console.log('\n✅ Verification:', isValid ? 'Password works!' : 'ERROR: Password does not work!');
    } else {
      console.log('❌ Admin user not found');
    }
    
    await pool.end();
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

changeAdminPassword();
