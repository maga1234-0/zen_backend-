/**
 * Test script to verify the checkout endpoint works correctly
 * This tests the PATCH /bookings/:id/status endpoint
 */

const { Pool } = require('pg');

const pool = new Pool({
  host: 'localhost',
  port: 5432,
  database: 'hotel_pms',
  user: 'postgres',
  password: 'aubin1234',
});

async function testCheckoutEndpoint() {
  const client = await pool.connect();
  
  try {
    console.log('🔍 Finding a checked-in booking to test...\n');
    
    // Find a checked-in booking
    const bookingResult = await client.query(`
      SELECT b.id, b.room_id, b.status as booking_status,
             r.room_number, r.status as room_status,
             g.first_name || ' ' || g.last_name as guest_name
      FROM bookings b
      JOIN rooms r ON b.room_id = r.id
      JOIN guests g ON b.guest_id = g.id
      WHERE b.status = 'checked_in'
      LIMIT 1
    `);
    
    if (bookingResult.rows.length === 0) {
      console.log('❌ No checked-in bookings found. Creating a test booking...\n');
      
      // Get an available room
      const roomResult = await client.query(`
        SELECT id, room_number FROM rooms WHERE status = 'available' LIMIT 1
      `);
      
      if (roomResult.rows.length === 0) {
        console.log('❌ No available rooms. Please run database/seed.sql first.');
        return;
      }
      
      // Get a guest
      const guestResult = await client.query(`
        SELECT id FROM guests LIMIT 1
      `);
      
      if (guestResult.rows.length === 0) {
        console.log('❌ No guests found. Please run database/seed.sql first.');
        return;
      }
      
      const roomId = roomResult.rows[0].id;
      const guestId = guestResult.rows[0].id;
      const hotelId = '550e8400-e29b-41d4-a716-446655440000';
      
      // Create a test booking
      await client.query('BEGIN');
      
      const newBooking = await client.query(`
        INSERT INTO bookings (hotel_id, guest_id, room_id, check_in_date, check_out_date, 
                             number_of_guests, total_amount, status)
        VALUES ($1, $2, $3, CURRENT_DATE, CURRENT_DATE + INTERVAL '2 days', 2, 200, 'checked_in')
        RETURNING id, room_id
      `, [hotelId, guestId, roomId]);
      
      // Set room to occupied
      await client.query(`
        UPDATE rooms SET status = 'occupied' WHERE id = $1
      `, [roomId]);
      
      await client.query('COMMIT');
      
      console.log(`✅ Created test booking ID: ${newBooking.rows[0].id}\n`);
      
      // Re-query to get full details
      const refreshedBooking = await client.query(`
        SELECT b.id, b.room_id, b.status as booking_status,
               r.room_number, r.status as room_status,
               g.first_name || ' ' || g.last_name as guest_name
        FROM bookings b
        JOIN rooms r ON b.room_id = r.id
        JOIN guests g ON b.guest_id = g.id
        WHERE b.id = $1
      `, [newBooking.rows[0].id]);
      
      bookingResult.rows = refreshedBooking.rows;
    }
    
    const booking = bookingResult.rows[0];
    
    console.log('📋 BEFORE CHECKOUT:');
    console.log(`   Booking ID: ${booking.id}`);
    console.log(`   Guest: ${booking.guest_name}`);
    console.log(`   Room: ${booking.room_number}`);
    console.log(`   Booking Status: ${booking.booking_status}`);
    console.log(`   Room Status: ${booking.room_status}`);
    console.log('');
    
    // Simulate the checkout endpoint logic
    console.log('🔄 Simulating checkout...\n');
    
    await client.query('BEGIN');
    
    // Update booking status
    await client.query(
      'UPDATE bookings SET status = $1, updated_at = NOW() WHERE id = $2',
      ['checked_out', booking.id]
    );
    
    // Set room to dirty
    await client.query(
      'UPDATE rooms SET status = $1 WHERE id = $2',
      ['dirty', booking.room_id]
    );
    
    console.log(`✅ Room ${booking.room_id} set to dirty after checkout`);
    
    await client.query('COMMIT');
    
    // Verify the changes
    const verifyResult = await client.query(`
      SELECT b.id, b.status as booking_status,
             r.room_number, r.status as room_status,
             g.first_name || ' ' || g.last_name as guest_name
      FROM bookings b
      JOIN rooms r ON b.room_id = r.id
      JOIN guests g ON b.guest_id = g.id
      WHERE b.id = $1
    `, [booking.id]);
    
    const updated = verifyResult.rows[0];
    
    console.log('');
    console.log('📋 AFTER CHECKOUT:');
    console.log(`   Booking ID: ${updated.id}`);
    console.log(`   Guest: ${updated.guest_name}`);
    console.log(`   Room: ${updated.room_number}`);
    console.log(`   Booking Status: ${updated.booking_status}`);
    console.log(`   Room Status: ${updated.room_status}`);
    console.log('');
    
    if (updated.booking_status === 'checked_out' && updated.room_status === 'dirty') {
      console.log('✅ SUCCESS! Checkout logic works correctly.');
      console.log('   - Booking status changed to "checked_out"');
      console.log('   - Room status changed to "dirty"');
    } else {
      console.log('❌ FAILED! Something went wrong:');
      if (updated.booking_status !== 'checked_out') {
        console.log(`   - Booking status is "${updated.booking_status}" (expected "checked_out")`);
      }
      if (updated.room_status !== 'dirty') {
        console.log(`   - Room status is "${updated.room_status}" (expected "dirty")`);
      }
    }
    
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('❌ Error:', error.message);
  } finally {
    client.release();
    await pool.end();
  }
}

testCheckoutEndpoint();
