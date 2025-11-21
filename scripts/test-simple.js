// TEST SIMPLE DE CONEXIÓN
const { Pool } = require('pg');
require('dotenv').config();

async function simpleTest() {
  console.log('🔍 Test simple de conexión...');
  console.log('📋 DATABASE_URL configurada:', process.env.DATABASE_URL ? 'SÍ' : 'NO');

  if (!process.env.DATABASE_URL) {
    console.error('❌ No hay DATABASE_URL');
    return;
  }

  // Parsear URL para mostrar detalles (sin contraseña)
  try {
    const url = new URL(process.env.DATABASE_URL);
    console.log('🏠 Host:', url.hostname);
    console.log('🔌 Puerto:', url.port);
    console.log('👤 Usuario:', url.username);
    console.log('🗄️ Base de datos:', url.pathname.slice(1));
  } catch (err) {
    console.error('❌ URL malformada:', err.message);
    return;
  }

  // Test con configuración forzando IPv4 si es posible
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: {
      rejectUnauthorized: false
    },
    options: '--client_encoding=UTF8'
  });

  try {
    console.log('⏳ Conectando (timeout 5s)...');

    const client = await Promise.race([
      pool.connect(),
      new Promise((_, reject) =>
        setTimeout(() => reject(new Error('Timeout después de 5s')), 5000)
      )
    ]);

    console.log('✅ ¡Conexión exitosa!');

    const result = await client.query('SELECT 1 as test');
    console.log('📊 Query test exitosa:', result.rows[0]);

    client.release();

  } catch (error) {
    console.error('❌ Error:', error.message);

    if (error.message.includes('timeout')) {
      console.log('💡 Sugerencia: Problema de red o firewall');
    } else if (error.message.includes('authentication')) {
      console.log('💡 Sugerencia: Problema de credenciales');
    } else if (error.message.includes('ENOTFOUND')) {
      console.log('💡 Sugerencia: Problema de DNS/host');
    }
  } finally {
    await pool.end();
  }
}

simpleTest();