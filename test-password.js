const bcrypt = require('bcryptjs');

const password = 'password123';
const hashFromDB = '$2b$10$K7L1OJ45/4Y2nIvhRVpCe.FSmhDdWoXehVzJptJ/op0lSsvqNu/1u';

console.log('Testing password:', password);
console.log('Hash from DB:', hashFromDB);

bcrypt.compare(password, hashFromDB, (err, result) => {
  if (err) {
    console.error('Error:', err);
  } else {
    console.log('Password matches:', result);
  }
});

// Also generate a new hash
bcrypt.hash(password, 10, (err, newHash) => {
  if (err) {
    console.error('Error generating hash:', err);
  } else {
    console.log('\nNew hash for password123:', newHash);
  }
});
