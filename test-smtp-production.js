// Test SMTP direct pour production
// Usage: node test-smtp-production.js

const nodemailer = require('nodemailer');

console.log('🔍 Testing SMTP Configuration...\n');

// Configuration depuis variables d'environnement Render
const config = {
  host: process.env.SMTP_HOST || 'smtp.gmail.com',
  port: parseInt(process.env.SMTP_PORT || '587'),
  secure: process.env.SMTP_SECURE === 'true',
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
};

console.log('📧 SMTP Config:');
console.log('  Host:', config.host);
console.log('  Port:', config.port);
console.log('  Secure:', config.secure);
console.log('  User:', config.auth.user);
console.log('  Pass:', config.auth.pass ? '***' + config.auth.pass.slice(-4) : 'MISSING');
console.log('  EMAIL_FROM:', process.env.EMAIL_FROM || 'MISSING');
console.log('  EMAIL_FROM_NAME:', process.env.EMAIL_FROM_NAME || 'MISSING');
console.log('\n');

// Vérifier les variables requises
const requiredVars = [
  'SMTP_HOST',
  'SMTP_PORT',
  'SMTP_USER',
  'SMTP_PASS',
  'EMAIL_FROM',
  'EMAIL_FROM_NAME'
];

let missingVars = [];
requiredVars.forEach(varName => {
  if (!process.env[varName]) {
    missingVars.push(varName);
  }
});

if (missingVars.length > 0) {
  console.error('❌ Missing environment variables:', missingVars.join(', '));
  console.error('\nPlease set these variables in Render Environment.\n');
  process.exit(1);
}

// Créer le transporteur
const transporter = nodemailer.createTransport(config);

// Test 1: Vérifier la connexion
console.log('🔍 Test 1: Verifying SMTP connection...');
transporter.verify((error, success) => {
  if (error) {
    console.error('❌ SMTP Connection FAILED:');
    console.error('  Error code:', error.code);
    console.error('  Message:', error.message);
    if (error.response) {
      console.error('  Response:', error.response);
    }
    console.error('\n📋 Troubleshooting:');
    
    if (error.code === 'EAUTH') {
      console.error('  → Invalid credentials. Check SMTP_USER and SMTP_PASS');
      console.error('  → Make sure 2FA is enabled on Gmail');
      console.error('  → Generate a new App Password if needed');
    } else if (error.code === 'ETIMEDOUT' || error.code === 'ESOCKET') {
      console.error('  → Connection timeout. Check SMTP_HOST and SMTP_PORT');
      console.error('  → Make sure SMTP_HOST=smtp.gmail.com and SMTP_PORT=587');
    } else {
      console.error('  → Check all SMTP variables in Render Environment');
    }
    
    process.exit(1);
  } else {
    console.log('✅ SMTP Connection successful!');
    console.log('\n🔍 Test 2: Sending test email...');
    
    // Test 2: Envoyer un email test
    const testEmail = {
      from: `"${process.env.EMAIL_FROM_NAME}" <${process.env.EMAIL_FROM}>`,
      to: process.env.TEST_EMAIL || process.env.SMTP_USER,
      subject: '🧪 Test Email from ZENIT PMS',
      html: `
        <h2>Test Email</h2>
        <p>This is a test email from ZENIT PMS backend.</p>
        <p>If you receive this, SMTP is working correctly!</p>
        <p><strong>Timestamp:</strong> ${new Date().toISOString()}</p>
      `,
      text: `Test email from ZENIT PMS. Timestamp: ${new Date().toISOString()}`,
    };
    
    transporter.sendMail(testEmail, (error, info) => {
      if (error) {
        console.error('❌ Email sending FAILED:');
        console.error('  Error code:', error.code);
        console.error('  Message:', error.message);
        if (error.response) {
          console.error('  Response:', error.response);
        }
        
        console.error('\n📋 Troubleshooting:');
        if (error.responseCode === 553 || error.message.includes('Sender address rejected')) {
          console.error('  → EMAIL_FROM must match SMTP_USER');
          console.error('  → Current EMAIL_FROM:', process.env.EMAIL_FROM);
          console.error('  → Current SMTP_USER:', process.env.SMTP_USER);
        }
        
        process.exit(1);
      } else {
        console.log('✅ Email sent successfully!');
        console.log('  Message ID:', info.messageId);
        console.log('  Response:', info.response);
        console.log('\n🎉 All SMTP tests passed!\n');
        process.exit(0);
      }
    });
  }
});
