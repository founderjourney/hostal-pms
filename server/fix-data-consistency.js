/**
 * Script para corregir inconsistencias en la base de datos
 * - Camas ocupadas sin huésped -> cambiar a 'clean'
 * - Camas reservadas sin huésped -> cambiar a 'clean'
 */

const path = require('path');
const dbPath = path.join(__dirname, 'almanik.db');

// Usar sqlite3 directamente
const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database(dbPath);

function runQuery(sql, params = []) {
    return new Promise((resolve, reject) => {
        db.run(sql, params, function(err) {
            if (err) reject(err);
            else resolve({ changes: this.changes });
        });
    });
}

function allQuery(sql, params = []) {
    return new Promise((resolve, reject) => {
        db.all(sql, params, (err, rows) => {
            if (err) reject(err);
            else resolve(rows);
        });
    });
}

async function fixDataConsistency() {
    console.log('🔧 Iniciando corrección de datos...\n');

    try {
        // 1. Ver camas inconsistentes
        const inconsistentBeds = await allQuery(`
            SELECT id, name, status, guest_id, room
            FROM beds
            WHERE status = 'occupied' AND guest_id IS NULL
        `);

        console.log(`📊 Camas ocupadas sin huésped: ${inconsistentBeds.length}`);
        inconsistentBeds.forEach(bed => {
            console.log(`   - ${bed.name} (${bed.room}): status=${bed.status}, guest_id=NULL`);
        });

        // 2. Corregir: cambiar a 'clean' las camas ocupadas sin huésped
        if (inconsistentBeds.length > 0) {
            const result = await runQuery(`
                UPDATE beds
                SET status = 'clean'
                WHERE status = 'occupied' AND guest_id IS NULL
            `);
            console.log(`\n✅ Corregidas ${result.changes} camas -> status='clean'`);
        }

        // 3. Ver camas reservadas sin información
        const reservedNoGuest = await allQuery(`
            SELECT id, name, status, reserved_for_guest_id, room
            FROM beds
            WHERE status = 'reserved' AND reserved_for_guest_id IS NULL
        `);

        console.log(`\n📊 Camas reservadas sin huésped asignado: ${reservedNoGuest.length}`);
        reservedNoGuest.forEach(bed => {
            console.log(`   - ${bed.name} (${bed.room})`);
        });

        // 4. Corregir reservas sin huésped
        if (reservedNoGuest.length > 0) {
            const result = await runQuery(`
                UPDATE beds
                SET status = 'clean'
                WHERE status = 'reserved' AND reserved_for_guest_id IS NULL
            `);
            console.log(`✅ Corregidas ${result.changes} camas reservadas -> status='clean'`);
        }

        // 5. Mostrar estado final
        const finalState = await allQuery(`
            SELECT status, COUNT(*) as count
            FROM beds
            GROUP BY status
        `);

        console.log('\n📊 Estado final de camas:');
        finalState.forEach(row => {
            console.log(`   ${row.status}: ${row.count}`);
        });

        // 6. Mostrar camas ocupadas con huéspedes
        const occupiedWithGuest = await allQuery(`
            SELECT b.name, b.room, g.name as guest_name
            FROM beds b
            JOIN guests g ON b.guest_id = g.id
            WHERE b.status = 'occupied'
        `);

        console.log('\n👥 Camas ocupadas con huéspedes:');
        occupiedWithGuest.forEach(bed => {
            console.log(`   🛏️ ${bed.name} (${bed.room}) -> 👤 ${bed.guest_name}`);
        });

        console.log('\n✅ Corrección de datos completada!');

    } catch (error) {
        console.error('❌ Error:', error.message);
    } finally {
        db.close();
    }
}

fixDataConsistency();
