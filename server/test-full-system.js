#!/usr/bin/env node
/**
 * ALMANIK PMS - Full System Test
 * Tests all endpoints and generates audit report
 */

const http = require('http');

const BASE_URL = 'http://localhost:3000';
let SESSION_ID = null;

const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  cyan: '\x1b[36m',
  magenta: '\x1b[35m',
  dim: '\x1b[2m'
};

const results = {
  passed: 0,
  failed: 0,
  warnings: 0,
  tests: []
};

function log(msg, color = 'reset') {
  console.log(`${colors[color]}${msg}${colors.reset}`);
}

function httpRequest(method, path, data = null) {
  return new Promise((resolve, reject) => {
    const url = new URL(path, BASE_URL);
    const options = {
      hostname: url.hostname,
      port: url.port || 3000,
      path: url.pathname + url.search,
      method,
      headers: {
        'Content-Type': 'application/json',
        ...(SESSION_ID && { 'session-id': SESSION_ID })
      },
      timeout: 10000
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
    req.on('timeout', () => reject(new Error('Timeout')));

    if (data) req.write(JSON.stringify(data));
    req.end();
  });
}

async function test(name, fn) {
  try {
    const result = await fn();
    if (result.pass) {
      log(`  ✅ ${name}`, 'green');
      results.passed++;
      results.tests.push({ name, status: 'PASS', details: result.details });
    } else if (result.warning) {
      log(`  ⚠️  ${name}: ${result.message}`, 'yellow');
      results.warnings++;
      results.tests.push({ name, status: 'WARNING', details: result.message });
    } else {
      log(`  ❌ ${name}: ${result.message}`, 'red');
      results.failed++;
      results.tests.push({ name, status: 'FAIL', details: result.message });
    }
  } catch (error) {
    log(`  ❌ ${name}: ${error.message}`, 'red');
    results.failed++;
    results.tests.push({ name, status: 'ERROR', details: error.message });
  }
}

async function runTests() {
  log('\n' + '='.repeat(60), 'cyan');
  log('  ALMANIK PMS - FULL SYSTEM AUDIT', 'cyan');
  log('  ' + new Date().toISOString(), 'dim');
  log('='.repeat(60) + '\n', 'cyan');

  // 1. Health Check
  log('📡 CONNECTIVITY', 'magenta');
  await test('Health endpoint', async () => {
    const res = await httpRequest('GET', '/health');
    return { pass: res.status === 200 && res.data.status === 'healthy', details: res.data };
  });

  // 2. Authentication
  log('\n🔐 AUTHENTICATION', 'magenta');
  await test('Login with admin', async () => {
    const res = await httpRequest('POST', '/api/login', { username: 'admin', password: 'admin123' });
    if (res.status === 200 && res.data.sessionId) {
      SESSION_ID = res.data.sessionId;
      return { pass: true, details: `Session: ${SESSION_ID}` };
    }
    return { pass: false, message: 'Login failed' };
  });

  // 3. Core Endpoints
  log('\n📦 CORE ENDPOINTS', 'magenta');

  await test('GET /api/beds', async () => {
    const res = await httpRequest('GET', '/api/beds');
    const count = Array.isArray(res.data) ? res.data.length : res.data.beds?.length;
    return { pass: res.status === 200 && count > 0, details: `${count} beds` };
  });

  await test('GET /api/guests', async () => {
    const res = await httpRequest('GET', '/api/guests');
    const count = res.data.guests?.length;
    return { pass: res.status === 200, details: `${count || 0} guests` };
  });

  await test('GET /api/reservations', async () => {
    const res = await httpRequest('GET', '/api/reservations');
    const count = res.data.reservations?.length;
    return { pass: res.status === 200, details: `${count || 0} reservations` };
  });

  await test('GET /api/products', async () => {
    const res = await httpRequest('GET', '/api/products');
    const count = res.data.products?.length;
    return { pass: res.status === 200, details: `${count || 0} products` };
  });

  await test('GET /api/staff', async () => {
    const res = await httpRequest('GET', '/api/staff');
    const count = res.data.staff?.length;
    return { pass: res.status === 200, details: `${count || 0} staff` };
  });

  await test('GET /api/tasks', async () => {
    const res = await httpRequest('GET', '/api/tasks');
    const count = res.data.tasks?.length;
    return { pass: res.status === 200, details: `${count || 0} tasks` };
  });

  await test('GET /api/users', async () => {
    const res = await httpRequest('GET', '/api/users');
    const count = res.data.users?.length;
    return { pass: res.status === 200, details: `${count || 0} users` };
  });

  await test('GET /api/tours', async () => {
    const res = await httpRequest('GET', '/api/tours');
    const count = res.data.tours?.length;
    return { pass: res.status === 200, details: `${count || 0} tours` };
  });

  // 4. Module Endpoints
  log('\n🔧 MODULE ENDPOINTS', 'magenta');

  await test('GET /api/cashbox/sessions', async () => {
    const res = await httpRequest('GET', '/api/cashbox/sessions');
    return { pass: res.status === 200, details: 'OK' };
  });

  await test('GET /api/analytics/overview', async () => {
    const res = await httpRequest('GET', '/api/analytics/overview');
    return { pass: res.status === 200 && res.data.today !== undefined, details: 'OK' };
  });

  await test('GET /api/dashboard/kpi', async () => {
    const res = await httpRequest('GET', '/api/dashboard/kpi');
    return { pass: res.status === 200, details: 'OK' };
  });

  await test('GET /api/reviews', async () => {
    const res = await httpRequest('GET', '/api/reviews');
    return { pass: res.status === 200, details: `${res.data.reviews?.length || 0} reviews` };
  });

  await test('GET /api/pricing/seasons', async () => {
    const res = await httpRequest('GET', '/api/pricing/seasons');
    return { pass: res.status === 200, details: `${res.data.seasons?.length || 0} seasons` };
  });

  await test('GET /api/pricing/rules', async () => {
    const res = await httpRequest('GET', '/api/pricing/rules');
    return { pass: res.status === 200, details: `${res.data.rules?.length || 0} rules` };
  });

  // 5. iCal Sync
  log('\n📅 ICAL SYNC', 'magenta');

  await test('GET /api/ical/sources', async () => {
    const res = await httpRequest('GET', '/api/ical/sources');
    return { pass: res.status === 200, details: `${res.data.sources?.length || 0} sources` };
  });

  await test('GET /api/ical/external-reservations', async () => {
    const res = await httpRequest('GET', '/api/ical/external-reservations');
    return { pass: res.status === 200, details: `${res.data.reservations?.length || 0} external` };
  });

  await test('GET /api/ical/all-rooms.ics', async () => {
    const res = await httpRequest('GET', '/api/ical/all-rooms.ics');
    const isIcal = typeof res.data === 'string' && res.data.includes('VCALENDAR');
    return { pass: res.status === 200 && isIcal, details: 'iCal export OK' };
  });

  // 6. Front Desk
  log('\n🛎️  FRONT DESK', 'magenta');

  await test('GET /api/front-desk/status', async () => {
    const res = await httpRequest('GET', '/api/front-desk/status');
    return { pass: res.status === 200, details: 'OK' };
  });

  await test('GET /api/front-desk/today-arrivals', async () => {
    const res = await httpRequest('GET', '/api/front-desk/today-arrivals');
    return { pass: res.status === 200, details: `${res.data.arrivals?.length || 0} arrivals` };
  });

  await test('GET /api/front-desk/today-departures', async () => {
    const res = await httpRequest('GET', '/api/front-desk/today-departures');
    return { pass: res.status === 200, details: `${res.data.departures?.length || 0} departures` };
  });

  // 7. Beds Advanced
  log('\n🛏️  BEDS ADVANCED', 'magenta');

  await test('GET /api/beds-advanced', async () => {
    const res = await httpRequest('GET', '/api/beds-advanced');
    return { pass: res.status === 200, details: `${res.data.beds?.length || 0} beds` };
  });

  await test('GET /api/beds-advanced/housekeeping', async () => {
    const res = await httpRequest('GET', '/api/beds-advanced/housekeeping');
    return { pass: res.status === 200, details: 'OK' };
  });

  await test('GET /api/beds-advanced/availability', async () => {
    const res = await httpRequest('GET', '/api/beds-advanced/availability?start_date=2025-01-01&end_date=2025-01-07');
    return { pass: res.status === 200, details: 'OK' };
  });

  // 8. External Services (expect warning if not configured)
  log('\n🔌 EXTERNAL SERVICES', 'magenta');

  await test('GET /api/payments/status', async () => {
    const res = await httpRequest('GET', '/api/payments/status');
    if (res.status === 503) {
      return { warning: true, message: 'Stripe not configured (expected)' };
    }
    return { pass: res.status === 200, details: 'Stripe configured' };
  });

  await test('GET /api/email/status', async () => {
    const res = await httpRequest('GET', '/api/email/status');
    if (res.status === 503) {
      return { warning: true, message: 'SendGrid not configured (expected)' };
    }
    return { pass: res.status === 200, details: 'SendGrid configured' };
  });

  await test('GET /api/sms/status', async () => {
    const res = await httpRequest('GET', '/api/sms/status');
    if (res.status === 503) {
      return { warning: true, message: 'Twilio not configured (expected)' };
    }
    return { pass: res.status === 200, details: 'Twilio configured' };
  });

  await test('GET /api/whatsapp/status', async () => {
    const res = await httpRequest('GET', '/api/whatsapp/status');
    if (res.status === 503) {
      return { warning: true, message: 'WhatsApp not configured (expected)' };
    }
    return { pass: res.status === 200, details: 'WhatsApp configured' };
  });

  await test('GET /api/notifications/vapid-public-key', async () => {
    const res = await httpRequest('GET', '/api/notifications/vapid-public-key');
    if (res.status === 503) {
      return { warning: true, message: 'VAPID not configured (expected)' };
    }
    return { pass: res.status === 200, details: 'Push configured' };
  });

  // 9. Admin/Audit
  log('\n👮 ADMIN/AUDIT', 'magenta');

  await test('GET /api/admin/audit', async () => {
    const res = await httpRequest('GET', '/api/admin/audit');
    return { pass: res.status === 200, details: `${res.data.total || 0} logs` };
  });

  await test('GET /api/admin/backups', async () => {
    const res = await httpRequest('GET', '/api/admin/backups');
    return { pass: res.status === 200, details: 'OK' };
  });

  await test('GET /api/gdpr/retention-policy', async () => {
    const res = await httpRequest('GET', '/api/gdpr/retention-policy');
    return { pass: res.status === 200, details: 'OK' };
  });

  // Summary
  log('\n' + '='.repeat(60), 'cyan');
  log('  AUDIT SUMMARY', 'cyan');
  log('='.repeat(60), 'cyan');

  const total = results.passed + results.failed + results.warnings;
  log(`\n  Total Tests: ${total}`, 'reset');
  log(`  ✅ Passed:   ${results.passed}`, 'green');
  log(`  ⚠️  Warnings: ${results.warnings}`, 'yellow');
  log(`  ❌ Failed:   ${results.failed}`, 'red');

  const score = Math.round((results.passed / total) * 100);
  const scoreColor = score >= 90 ? 'green' : score >= 70 ? 'yellow' : 'red';
  log(`\n  Score: ${score}%`, scoreColor);

  // Failed tests detail
  if (results.failed > 0) {
    log('\n  FAILED TESTS:', 'red');
    results.tests.filter(t => t.status === 'FAIL' || t.status === 'ERROR').forEach(t => {
      log(`    - ${t.name}: ${t.details}`, 'red');
    });
  }

  log('\n' + '='.repeat(60) + '\n', 'cyan');

  return results;
}

// Run
runTests().then(r => {
  process.exit(r.failed > 0 ? 1 : 0);
}).catch(err => {
  console.error('Test error:', err);
  process.exit(1);
});
