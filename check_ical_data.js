
const DatabaseAdapter = require('./server/db-adapter');

async function checkSources() {
    const db = new DatabaseAdapter();
    await db.connect();

    try {
        const result = await db.query("SELECT * FROM ical_sources");
        console.log(`Found ${result.length} iCal sources.`);
        if (result.length > 0) {
            console.log(JSON.stringify(result, null, 2));
        }
    } catch (err) {
        console.error('Error checking sources:', err);
    }
}

checkSources();
