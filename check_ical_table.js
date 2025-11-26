
const DatabaseAdapter = require('./server/db-adapter');

async function checkTables() {
    const db = new DatabaseAdapter();
    await db.connect();

    try {
        const result = await db.query("SELECT name FROM sqlite_master WHERE type='table' AND name='ical_sources'");
        if (result && result.length > 0) {
            console.log('✅ Table ical_sources EXISTS');
        } else {
            console.log('❌ Table ical_sources DOES NOT EXIST');
        }
    } catch (err) {
        console.error('Error checking tables:', err);
    }
}

checkTables();
