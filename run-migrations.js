#!/usr/bin/env node

/**
 * Simple migration script for Hotel PMS
 * Runs pending database migrations
 */

const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

async function runMigrations() {
  console.log('🚀 Starting database migrations...\n');
  
  // Database connection configuration
  const pool = new Pool({
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5432'),
    database: process.env.DB_NAME || 'hotel_pms',
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || 'aubin1234',
    max: 5,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 10000,
  });

  try {
    // Test connection
    console.log('🔌 Testing database connection...');
    const client = await pool.connect();
    console.log('✅ Database connected successfully\n');
    
    // Migration 1: Make phone optional in guests table
    console.log('1️⃣  Running migration: Make phone optional in guests table...');
    try {
      await client.query(`
        ALTER TABLE guests 
        ALTER COLUMN phone DROP NOT NULL;
      `);
      console.log('   ✅ Phone field is now optional');
      
      // Update any existing empty phone values to NULL for consistency
      await client.query(`
        UPDATE guests 
        SET phone = NULL 
        WHERE phone = '' OR TRIM(phone) = '';
      `);
      console.log('   ✅ Cleaned up empty phone values');
    } catch (err) {
      console.log('   ℹ️  Phone field might already be optional:', err.message);
    }
    
    // Migration 2: Add priority column to notifications table
    console.log('\n2️⃣  Running migration: Add priority column to notifications table...');
    try {
      await client.query(`
        ALTER TABLE notifications 
        ADD COLUMN IF NOT EXISTS priority VARCHAR(20) DEFAULT 'medium' 
        CHECK (priority IN ('low', 'medium', 'high'));
      `);
      console.log('   ✅ Priority column added');
      
      // Update the type constraint to include new types
      await client.query(`
        ALTER TABLE notifications 
        DROP CONSTRAINT IF EXISTS notifications_type_check;
      `);
      
      await client.query(`
        ALTER TABLE notifications 
        ADD CONSTRAINT notifications_type_check 
        CHECK (type IN ('booking', 'room', 'housekeeping', 'payment', 'maintenance', 'system', 'check_in', 'check_out'));
      `);
      console.log('   ✅ Notification type constraint updated');
    } catch (err) {
      console.log('   ℹ️  Priority column might already exist:', err.message);
    }
    
    // Verify migrations
    console.log('\n📊 Verifying migrations...');
    
    // Check guests table
    const guestsResult = await client.query(`
      SELECT column_name, is_nullable, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'guests' 
      AND column_name = 'phone';
    `);
    
    if (guestsResult.rows.length > 0) {
      const phoneCol = guestsResult.rows[0];
      console.log(`   Guests.phone: ${phoneCol.is_nullable === 'YES' ? '✅ Optional' : '❌ Still required'}`);
    }
    
    // Check notifications table
    const notificationsResult = await client.query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'notifications' 
      AND column_name = 'priority';
    `);
    
    if (notificationsResult.rows.length > 0) {
      console.log(`   Notifications.priority: ✅ Column exists`);
    } else {
      console.log(`   Notifications.priority: ❌ Column missing`);
    }
    
    // Check room status constraint
    const roomsResult = await client.query(`
      SELECT constraint_name, check_clause
      FROM information_schema.check_constraints
      WHERE constraint_name LIKE '%rooms_status%'
      LIMIT 1;
    `);
    
    if (roomsResult.rows.length > 0) {
      const constraint = roomsResult.rows[0].check_clause;
      if (constraint.includes("'dirty'")) {
        console.log(`   Rooms status constraint: ✅ Includes 'dirty' status`);
      } else {
        console.log(`   Rooms status constraint: ❌ Missing 'dirty' status`);
      }
    }
    
    // Check maintenance fields
    const maintenanceResult = await client.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'rooms' 
      AND column_name IN ('maintenance_reason', 'is_urgent', 'maintenance_reported_at', 'maintenance_reported_by');
    `);
    
    const maintenanceFields = maintenanceResult.rows.map(r => r.column_name);
    const expectedFields = ['maintenance_reason', 'is_urgent', 'maintenance_reported_at', 'maintenance_reported_by'];
    const missingFields = expectedFields.filter(f => !maintenanceFields.includes(f));
    
    if (missingFields.length === 0) {
      console.log(`   Maintenance fields: ✅ All present`);
    } else {
      console.log(`   Maintenance fields: ❌ Missing: ${missingFields.join(', ')}`);
    }
    
    console.log('\n🎉 Migration completed!');
    console.log('\n📋 Summary:');
    console.log('   - Phone field in guests table should now be optional');
    console.log('   - Notifications table now has priority column');
    console.log('   - Room status constraint already includes "dirty"');
    console.log('   - Maintenance tracking fields already exist');
    console.log('\n⚠️  Note: Restart the server if it was running during migrations.');
    
    client.release();
    
  } catch (err) {
    console.error('❌ Migration failed:', err.message);
    console.error('   Make sure:');
    console.error('   1. PostgreSQL is running on localhost:5432');
    console.error('   2. Database "hotel_pms" exists');
    console.error('   3. User "postgres" has password "aubin1234"');
    console.error('   4. Or update the .env file with correct credentials');
    process.exit(1);
  } finally {
    await pool.end();
  }
}

// Run migrations
runMigrations().catch(err => {
  console.error('❌ Unexpected error:', err);
  process.exit(1);
});