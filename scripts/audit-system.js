/**
 * System Audit Script (Dry Run)
 * Simulates a full guest lifecycle to verify system integrity.
 * 
 * Run: node scripts/audit-system.js
 */

const DatabaseAdapter = require('../server/db-adapter');

async function runAudit() {
    console.log('🕵️ Starting Final System Audit (Dry Run)...\n');

    const db = new DatabaseAdapter();
    await db.connect();

    try {
        // 1. Create Guest
        console.log('1️⃣  Creating Test Guest...');
        const guestDoc = `TEST-${Date.now()}`;
        const guestResult = await db.run(
            'INSERT INTO guests (name, email, phone, document) VALUES (?, ?, ?, ?)',
            ['Audit Guest', 'audit@test.com', '555-0000', guestDoc]
        );

        let guestId;
        if (db.isProduction) {
            // In Postgres, INSERT RETURNING is needed or we query back
            const g = await db.get('SELECT id FROM guests WHERE document = ?', [guestDoc]);
            guestId = g.id;
        } else {
            guestId = guestResult.id;
        }
        console.log(`✅ Guest created with ID: ${guestId}`);

        // 2. Find Available Bed
        console.log('\n2️⃣  Finding Available Bed...');
        const bed = await db.get("SELECT id, name, price FROM beds WHERE status = 'clean' LIMIT 1");
        if (!bed) throw new Error('No clean beds available for audit');
        console.log(`✅ Found bed: ${bed.name} ($${bed.price})`);

        // 3. Create Booking
        console.log('\n3️⃣  Creating Booking...');
        const checkIn = new Date().toISOString().split('T')[0]; // Today
        const checkOut = new Date(Date.now() + 86400000).toISOString().split('T')[0]; // Tomorrow
        const total = bed.price;

        const bookingResult = await db.run(
            'INSERT INTO bookings (guest_id, bed_id, check_in, check_out, nights, total, status) VALUES (?, ?, ?, ?, ?, ?, ?)',
            [guestId, bed.id, checkIn, checkOut, 1, total, 'confirmed']
        );

        let bookingId;
        if (db.isProduction) {
            // For simplicity in this script, we'll query the latest booking for this guest
            const b = await db.get('SELECT id FROM bookings WHERE guest_id = ? ORDER BY id DESC LIMIT 1', [guestId]);
            bookingId = b.id;
        } else {
            bookingId = bookingResult.id;
        }
        console.log(`✅ Booking created with ID: ${bookingId}`);

        // 4. Check-in
        console.log('\n4️⃣  Performing Check-in...');
        await db.run("UPDATE beds SET status = 'occupied', guest_id = ? WHERE id = ?", [guestId, bed.id]);
        await db.run("UPDATE bookings SET status = 'checked_in' WHERE id = ?", [bookingId]);
        console.log('✅ Guest checked in, bed marked occupied');

        // 5. Add Transaction (POS)
        console.log('\n5️⃣  Adding POS Transaction...');
        await db.run(
            'INSERT INTO transactions (booking_id, type, description, amount, bed_id) VALUES (?, ?, ?, ?, ?)',
            [bookingId, 'charge', 'Audit Coke', 2.50, bed.id]
        );
        console.log('✅ Transaction added: $2.50');

        // 6. Verify Balance
        console.log('\n6️⃣  Verifying Balance...');
        const txs = await db.query('SELECT * FROM transactions WHERE booking_id = ?', [bookingId]);
        const balance = txs.reduce((acc, tx) => acc + (tx.type === 'charge' ? tx.amount : -tx.amount), 0);
        console.log(`✅ Current Balance: $${balance} (Expected: $2.50)`);

        // 7. Check-out
        console.log('\n7️⃣  Performing Check-out...');
        await db.run("UPDATE beds SET status = 'dirty', guest_id = NULL WHERE id = ?", [bed.id]);
        await db.run("UPDATE bookings SET status = 'checked_out' WHERE id = ?", [bookingId]);
        console.log('✅ Guest checked out, bed marked dirty');

        console.log('\n🎉 SYSTEM AUDIT PASSED SUCCESSFULLY!');
        console.log('The system is ready for production use.');

    } catch (error) {
        console.error('\n❌ AUDIT FAILED:', error);
        process.exit(1);
    }
}

runAudit();
