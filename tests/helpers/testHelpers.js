/**
 * Test Helpers
 * Utility functions for testing
 */

const request = require('supertest');

/**
 * Login helper - gets session cookie for authenticated requests
 */
async function loginAsAdmin(app) {
  const response = await request(app)
    .post('/api/auth/login')
    .send({
      username: 'admin',
      password: process.env.ADMIN_PASSWORD,
    });

  if (response.status !== 200) {
    throw new Error(`Login failed: ${response.body.error || 'Unknown error'}`);
  }

  // Extract session cookie
  const cookies = response.headers['set-cookie'];
  return cookies;
}

async function loginAsReception(app) {
  const response = await request(app)
    .post('/api/auth/login')
    .send({
      username: 'recepcion',
      password: process.env.RECEPTION_PASSWORD,
    });

  if (response.status !== 200) {
    throw new Error(`Login failed: ${response.body.error || 'Unknown error'}`);
  }

  const cookies = response.headers['set-cookie'];
  return cookies;
}

/**
 * Create test guest
 */
async function createTestGuest(app, cookies, guestData = {}) {
  const defaultGuest = {
    name: 'Test Guest',
    document: 'TEST123456',
    email: 'test@example.com',
    phone: '+1234567890',
    nationality: 'US',
    ...guestData,
  };

  const response = await request(app)
    .post('/api/guests')
    .set('Cookie', cookies)
    .send(defaultGuest);

  if (response.status !== 201) {
    throw new Error(`Failed to create guest: ${response.body.error || 'Unknown error'}`);
  }

  return response.body.guest;
}

/**
 * Create test room
 */
async function createTestRoom(app, cookies, roomData = {}) {
  const defaultRoom = {
    name: 'Test Room 101',
    type: 'shared',
    capacity: 4,
    price_per_night: 25.00,
    ...roomData,
  };

  const response = await request(app)
    .post('/api/rooms')
    .set('Cookie', cookies)
    .send(defaultRoom);

  if (response.status !== 201) {
    throw new Error(`Failed to create room: ${response.body.error || 'Unknown error'}`);
  }

  return response.body.room;
}

/**
 * Create test bed
 */
async function createTestBed(app, cookies, roomId, bedData = {}) {
  const defaultBed = {
    bed_number: 1,
    status: 'available',
    ...bedData,
  };

  const response = await request(app)
    .post(`/api/rooms/${roomId}/beds`)
    .set('Cookie', cookies)
    .send(defaultBed);

  if (response.status !== 201) {
    throw new Error(`Failed to create bed: ${response.body.error || 'Unknown error'}`);
  }

  return response.body.bed;
}

/**
 * Create test reservation
 */
async function createTestReservation(app, cookies, reservationData) {
  const response = await request(app)
    .post('/api/reservations')
    .set('Cookie', cookies)
    .send(reservationData);

  if (response.status !== 201) {
    throw new Error(`Failed to create reservation: ${response.body.error || 'Unknown error'}`);
  }

  return response.body.reservation;
}

/**
 * Clean up test database
 */
async function cleanupDatabase(db) {
  // Delete in correct order to respect foreign keys
  await db.run('DELETE FROM transactions');
  await db.run('DELETE FROM external_reservations');
  await db.run('DELETE FROM sync_logs');
  await db.run('DELETE FROM ical_sources');
  await db.run('DELETE FROM bookings');
  await db.run('DELETE FROM beds');
  await db.run('DELETE FROM rooms');
  await db.run('DELETE FROM guests');
  await db.run('DELETE FROM activity_logs');
}

/**
 * Wait for a condition to be true (for async operations)
 */
async function waitFor(condition, timeout = 5000, interval = 100) {
  const startTime = Date.now();
  while (Date.now() - startTime < timeout) {
    if (await condition()) {
      return true;
    }
    await new Promise(resolve => setTimeout(resolve, interval));
  }
  throw new Error('Timeout waiting for condition');
}

module.exports = {
  loginAsAdmin,
  loginAsReception,
  createTestGuest,
  createTestRoom,
  createTestBed,
  createTestReservation,
  cleanupDatabase,
  waitFor,
};
