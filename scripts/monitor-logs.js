/**
 * Log Monitoring Script
 * Analyzes application logs to provide a health summary.
 * 
 * Run: node scripts/monitor-logs.js
 */

const fs = require('fs');
const path = require('path');
const readline = require('readline');

const LOG_DIR = path.join(__dirname, '../logs');

async function analyzeLogs() {
    console.log('🔍 Starting Log Analysis...\n');

    if (!fs.existsSync(LOG_DIR)) {
        console.log('⚠️  No logs directory found. Creating one for testing...');
        fs.mkdirSync(LOG_DIR, { recursive: true });
        // Create a dummy log file for demonstration
        const dummyLog = path.join(LOG_DIR, `application-${new Date().toISOString().split('T')[0]}.log`);
        const dummyData = [
            JSON.stringify({ level: 'info', message: 'System started', timestamp: new Date().toISOString() }),
            JSON.stringify({ level: 'http', message: 'GET /api/health 200', timestamp: new Date().toISOString() }),
            JSON.stringify({ level: 'info', message: 'User login: admin', timestamp: new Date().toISOString() })
        ].join('\n');
        fs.writeFileSync(dummyLog, dummyData);
    }

    const files = fs.readdirSync(LOG_DIR).filter(f => f.endsWith('.log'));

    if (files.length === 0) {
        console.log('ℹ️  No log files found to analyze.');
        return;
    }

    console.log(`📂 Found ${files.length} log files.`);

    let errorCount = 0;
    let warnCount = 0;
    let requestCount = 0;
    let latestLogs = [];

    for (const file of files) {
        const filePath = path.join(LOG_DIR, file);
        const fileStream = fs.createReadStream(filePath);
        const rl = readline.createInterface({
            input: fileStream,
            crlfDelay: Infinity
        });

        for await (const line of rl) {
            try {
                const log = JSON.parse(line);

                if (log.level === 'error') errorCount++;
                if (log.level === 'warn') warnCount++;
                if (log.level === 'http') requestCount++;

                latestLogs.push(log);
                if (latestLogs.length > 10) latestLogs.shift(); // Keep last 10
            } catch (e) {
                // Ignore malformed lines
            }
        }
    }

    console.log('\n📊 Analysis Summary:');
    console.log(`-------------------`);
    console.log(`🔴 Errors:    ${errorCount}`);
    console.log(`🟡 Warnings:  ${warnCount}`);
    console.log(`🟢 Requests:  ${requestCount}`);

    console.log('\n🕒 Latest Activity:');
    latestLogs.reverse().forEach(log => {
        const color = log.level === 'error' ? '🔴' : (log.level === 'warn' ? '🟡' : '⚪');
        console.log(`${color} [${log.timestamp}] ${log.level.toUpperCase()}: ${log.message}`);
    });

    if (errorCount === 0) {
        console.log('\n✅ System Health: EXCELLENT');
    } else if (errorCount < 5) {
        console.log('\n⚠️  System Health: GOOD (Few errors detected)');
    } else {
        console.log('\n❌ System Health: ATTENTION NEEDED');
    }
}

analyzeLogs();
