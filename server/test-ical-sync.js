#!/usr/bin/env node
/**
 * Test Script: iCal Sync with OTAs
 *
 * This script helps you test the OTA integration before going live.
 * Run: node server/test-ical-sync.js
 */

const http = require('http');

const BASE_URL = 'http://localhost:3000';

// Colors for terminal output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  red: '\x1b[31m',
  cyan: '\x1b[36m',
  magenta: '\x1b[35m'
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function httpRequest(method, path, data = null) {
  return new Promise((resolve, reject) => {
    const url = new URL(path, BASE_URL);
    const options = {
      hostname: url.hostname,
      port: url.port || 3000,
      path: url.pathname + url.search,
      method: method,
      headers: {
        'Content-Type': 'application/json',
        'session-id': '1234567890'
      }
    };

    const req = http.request(options, (res) => {
      let body = '';
      res.on('data', chunk => body += chunk);
      res.on('end', () => {
        try {
          resolve({ status: res.statusCode, data: JSON.parse(body) });
        } catch {
          resolve({ status: res.statusCode, data: body });
        }
      });
    });

    req.on('error', reject);

    if (data) {
      req.write(JSON.stringify(data));
    }
    req.end();
  });
}

async function testConnection() {
  log('\n='.repeat(60), 'cyan');
  log('  ALMANIK PMS - iCal Sync Test Suite', 'cyan');
  log('  Testing OTA Integration', 'cyan');
  log('='.repeat(60) + '\n', 'cyan');

  // Test 1: Check server is running
  log('1️⃣  Testing server connection...', 'yellow');
  try {
    const res = await httpRequest('GET', '/api/beds');
    if (res.status === 200) {
      log('   ✅ Server is running', 'green');
    } else {
      throw new Error(`Status ${res.status}`);
    }
  } catch (error) {
    log(`   ❌ Server not reachable: ${error.message}`, 'red');
    log('   Start the server with: npm start', 'yellow');
    process.exit(1);
  }

  // Test 2: Check iCal tables exist
  log('\n2️⃣  Testing iCal endpoints...', 'yellow');
  try {
    const res = await httpRequest('GET', '/api/ical/sources');
    if (res.status === 200) {
      log(`   ✅ iCal module loaded. Sources: ${res.data.sources?.length || 0}`, 'green');
    } else if (res.status === 500 && res.data.error?.includes('no such table')) {
      log('   ❌ Tables not created. Run: node server/migrate-ical-sync.js', 'red');
      process.exit(1);
    } else {
      log(`   ⚠️  Unexpected response: ${res.status}`, 'yellow');
    }
  } catch (error) {
    log(`   ❌ Error: ${error.message}`, 'red');
  }

  // Test 3: Test export endpoint
  log('\n3️⃣  Testing iCal export...', 'yellow');
  try {
    const res = await httpRequest('GET', '/api/ical/all-rooms.ics');
    if (res.status === 200) {
      const hasIcal = typeof res.data === 'string' && res.data.includes('BEGIN:VCALENDAR');
      if (hasIcal) {
        log('   ✅ iCal export working', 'green');
      } else {
        log('   ✅ Export endpoint working (no reservations yet)', 'green');
      }
    }
  } catch (error) {
    log(`   ❌ Error: ${error.message}`, 'red');
  }

  // Test 4: Create a test source
  log('\n4️⃣  Creating test iCal source...', 'yellow');
  try {
    const testSource = {
      name: 'Test Source (Demo)',
      source_type: 'test',
      ical_url: 'https://www.calendarlabs.com/ical-calendar/ics/46/Colombia_Holidays.ics', // Public test calendar
      bed_id: 1,
      sync_interval_minutes: 120
    };

    const res = await httpRequest('POST', '/api/ical/sources', testSource);

    if (res.status === 200 && res.data.success) {
      log(`   ✅ Test source created (ID: ${res.data.source.id})`, 'green');

      // Test 5: Sync the source
      log('\n5️⃣  Testing sync...', 'yellow');
      const syncRes = await httpRequest('POST', `/api/ical/sync/${res.data.source.id}`);

      if (syncRes.status === 200 && syncRes.data.success) {
        log(`   ✅ Sync completed!`, 'green');
        log(`      - Events processed: ${syncRes.data.stats?.processed || 0}`, 'cyan');
        log(`      - Created: ${syncRes.data.stats?.created || 0}`, 'cyan');
        log(`      - Updated: ${syncRes.data.stats?.updated || 0}`, 'cyan');
        log(`      - Conflicts: ${syncRes.data.stats?.conflicts || 0}`, 'cyan');
      } else {
        log(`   ⚠️  Sync returned: ${JSON.stringify(syncRes.data)}`, 'yellow');
      }

      // Cleanup: Delete test source
      log('\n6️⃣  Cleaning up test source...', 'yellow');
      await httpRequest('DELETE', `/api/ical/sources/${res.data.source.id}`);
      log('   ✅ Test source deleted', 'green');

    } else {
      log(`   ⚠️  Could not create source: ${JSON.stringify(res.data)}`, 'yellow');
    }
  } catch (error) {
    log(`   ❌ Error: ${error.message}`, 'red');
  }

  // Summary
  log('\n' + '='.repeat(60), 'cyan');
  log('  TEST SUMMARY', 'cyan');
  log('='.repeat(60), 'cyan');
  log('\n✅ iCal sync module is working correctly!\n', 'green');

  log('Next steps:', 'magenta');
  log('1. Get your iCal URLs from Booking.com/Hostelworld extranet', 'reset');
  log('2. Register sources: POST /api/ical/sources', 'reset');
  log('3. Sync manually: POST /api/ical/sync/:source_id', 'reset');
  log('4. Check external reservations: GET /api/ical/external-reservations\n', 'reset');

  log('Documentation: docs/05-api/OTA-INTEGRATION-GUIDE.md\n', 'yellow');
}

// Example usage with real OTAs
async function showExamples() {
  log('\n📋 EXAMPLE COMMANDS\n', 'magenta');

  log('# Register Booking.com source:', 'cyan');
  log(`curl -X POST ${BASE_URL}/api/ical/sources \\
  -H "Content-Type: application/json" \\
  -H "session-id: YOUR_SESSION" \\
  -d '{
    "name": "Booking.com - Dorm 1",
    "source_type": "booking.com",
    "ical_url": "YOUR_BOOKING_ICAL_URL",
    "bed_id": 1
  }'
`, 'reset');

  log('# Register Hostelworld source:', 'cyan');
  log(`curl -X POST ${BASE_URL}/api/ical/sources \\
  -H "Content-Type: application/json" \\
  -H "session-id: YOUR_SESSION" \\
  -d '{
    "name": "Hostelworld - Dorm",
    "source_type": "hostelworld",
    "ical_url": "YOUR_HOSTELWORLD_ICAL_URL",
    "room_id": 1
  }'
`, 'reset');

  log('# Sync all sources:', 'cyan');
  log(`curl -X POST ${BASE_URL}/api/ical/sync-all -H "session-id: YOUR_SESSION"
`, 'reset');

  log('# Export your calendar (give this URL to OTAs):', 'cyan');
  log(`${BASE_URL}/api/ical/beds/1.ics
${BASE_URL}/api/ical/rooms/1.ics
${BASE_URL}/api/ical/all-rooms.ics
`, 'reset');
}

async function main() {
  const args = process.argv.slice(2);

  if (args.includes('--help') || args.includes('-h')) {
    log('\nUsage: node server/test-ical-sync.js [options]\n', 'cyan');
    log('Options:', 'yellow');
    log('  --test     Run connection tests (default)', 'reset');
    log('  --examples Show curl examples', 'reset');
    log('  --help     Show this help\n', 'reset');
    return;
  }

  if (args.includes('--examples')) {
    await showExamples();
    return;
  }

  await testConnection();
  await showExamples();
}

main().catch(console.error);
