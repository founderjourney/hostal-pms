/**
 * Check Demo Data Script
 * Verifica los datos de demo en la base de datos
 */

const path = require('path');
const DatabaseAdapter = require('../server/db-adapter');

async function checkDemoData() {
  const db = new DatabaseAdapter();

  try {
    await db.connect();

    console.log('\n📊 VERIFICANDO DATOS DE DEMO\n');
    console.log('='.repeat(60));

    // Check guests
    const guests = await db.query('SELECT COUNT(*) as count FROM guests');
    console.log(`\n✅ Huéspedes: ${guests[0].count}`);

    // Check beds
    const beds = await db.query('SELECT COUNT(*) as count FROM beds');
    const bedsByRoom = await db.query(`
      SELECT room, COUNT(*) as count, AVG(price) as avg_price
      FROM beds
      GROUP BY room
      ORDER BY room
    `);
    console.log(`\n✅ Camas totales: ${beds[0].count}`);
    console.log('\nDistribución por habitación:');
    bedsByRoom.forEach(r => {
      console.log(`   - ${r.room}: ${r.count} camas @ $${parseFloat(r.avg_price).toFixed(2)}/noche`);
    });

    // Check bookings
    const bookings = await db.query('SELECT COUNT(*) as count FROM bookings');
    const activeBookings = await db.query(`
      SELECT COUNT(*) as count
      FROM bookings
      WHERE status IN ('active', 'confirmed', 'checked_in')
    `);
    console.log(`\n✅ Reservas totales: ${bookings[0].count}`);
    console.log(`   - Activas: ${activeBookings[0].count}`);

    // Check transactions
    const transactions = await db.query(`
      SELECT
        type,
        COUNT(*) as count,
        SUM(amount) as total
      FROM transactions
      GROUP BY type
    `);
    console.log(`\n✅ Transacciones:`);
    let totalRevenue = 0;
    transactions.forEach(t => {
      console.log(`   - ${t.type}: ${t.count} (Total: $${parseFloat(t.total || 0).toFixed(2)})`);
      if (t.type === 'payment') {
        totalRevenue = parseFloat(t.total || 0);
      }
    });
    console.log(`\n   💰 Revenue Total: $${totalRevenue.toFixed(2)}`);

    // Check tours
    const tours = await db.query('SELECT COUNT(*) as count FROM tours WHERE active = 1');
    console.log(`\n✅ Tours activos: ${tours[0].count || 0}`);

    // Check tour commissions
    const commissions = await db.query(`
      SELECT COUNT(*) as count, SUM(amount) as total
      FROM tour_commissions
    `);
    console.log(`   - Comisiones: ${commissions[0].count || 0} ventas`);
    console.log(`   💵 Total comisiones: $${parseFloat(commissions[0].total || 0).toFixed(2)}`);

    // Calculate occupancy
    const totalBeds = beds[0].count;
    const occupiedBeds = await db.query(`
      SELECT COUNT(DISTINCT bed_id) as count
      FROM bookings
      WHERE status IN ('active', 'confirmed', 'checked_in')
      AND check_in <= date('now')
      AND check_out >= date('now')
    `);
    const occupancy = totalBeds > 0
      ? (occupiedBeds[0].count / totalBeds * 100).toFixed(2)
      : 0;

    console.log(`\n📈 MÉTRICAS ACTUALES:`);
    console.log('='.repeat(60));
    console.log(`   Occupancy Rate: ${occupancy}% (${occupiedBeds[0].count}/${totalBeds} camas)`);
    console.log(`   Revenue (pagos): $${totalRevenue.toFixed(2)}`);
    console.log(`   Reservas activas: ${activeBookings[0].count}`);
    console.log(`   Comisiones: $${parseFloat(commissions[0].total || 0).toFixed(2)}`);

    console.log('\n' + '='.repeat(60));
    console.log('✅ Verificación completada\n');

    process.exit(0);
  } catch (error) {
    console.error('\n❌ Error:', error);
    process.exit(1);
  }
}

checkDemoData();
