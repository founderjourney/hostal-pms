/**
 * Test Data Factory
 * Generate test data for various entities
 */

/**
 * Generate guest data
 */
function generateGuest(overrides = {}) {
  const random = Math.floor(Math.random() * 10000);
  return {
    name: `Guest ${random}`,
    document: `DOC${random}`,
    email: `guest${random}@example.com`,
    phone: `+1234${random}`,
    nationality: 'US',
    ...overrides,
  };
}

/**
 * Generate room data
 */
function generateRoom(overrides = {}) {
  const random = Math.floor(Math.random() * 100);
  return {
    name: `Room ${random}`,
    type: 'shared',
    capacity: 4,
    price_per_night: 25.00,
    ...overrides,
  };
}

/**
 * Generate bed data
 */
function generateBed(overrides = {}) {
  const random = Math.floor(Math.random() * 10);
  return {
    bed_number: random,
    status: 'available',
    ...overrides,
  };
}

/**
 * Generate reservation data
 */
function generateReservation(guestId, bedId, overrides = {}) {
  const today = new Date();
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);
  const dayAfter = new Date(tomorrow);
  dayAfter.setDate(dayAfter.getDate() + 1);

  return {
    guest_id: guestId,
    bed_id: bedId,
    check_in: tomorrow.toISOString().split('T')[0],
    check_out: dayAfter.toISOString().split('T')[0],
    nights: 1,
    total: 25.00,
    source: 'walkin',
    ...overrides,
  };
}

/**
 * Generate iCal source data
 */
function generateIcalSource(overrides = {}) {
  const random = Math.floor(Math.random() * 10000);
  return {
    name: `Booking.com Room ${random}`,
    source_type: 'booking',
    ical_url: `https://admin.booking.com/hotel/ical/${random}.ics`,
    active: true,
    ...overrides,
  };
}

/**
 * Generate date range
 */
function generateDateRange(daysFromNow = 1, nights = 2) {
  const checkIn = new Date();
  checkIn.setDate(checkIn.getDate() + daysFromNow);

  const checkOut = new Date(checkIn);
  checkOut.setDate(checkOut.getDate() + nights);

  return {
    check_in: checkIn.toISOString().split('T')[0],
    check_out: checkOut.toISOString().split('T')[0],
    nights,
  };
}

module.exports = {
  generateGuest,
  generateRoom,
  generateBed,
  generateReservation,
  generateIcalSource,
  generateDateRange,
};
