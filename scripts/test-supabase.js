// TEST DE CONEXIÓN SUPABASE
// Ejecutar: node test-supabase.js

const { Pool } = require('pg');
require('dotenv').config();

async function testSupabaseConnection() {
  console.log('🔍 Probando conexión a Supabase...');

  if (!process.env.DATABASE_URL) {
    console.error('❌ DATABASE_URL no configurada en .env');
    console.log('📝 Asegúrate de tener la DATABASE_URL de Supabase en tu archivo .env');
    return;
  }

  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: {
      rejectUnauthorized: false,
      require: true
    },
    connectionTimeoutMillis: 10000,
    idleTimeoutMillis: 30000
  });

  try {
    // Test básico de conexión
    console.log('📡 Conectando...');
    const client = await pool.connect();

    // Test query simple
    console.log('🧪 Ejecutando query de prueba...');
    const result = await client.query('SELECT NOW() as current_time, version() as pg_version');

    console.log('✅ ¡Conexión exitosa!');
    console.log('🕒 Tiempo actual del servidor:', result.rows[0].current_time);
    console.log('🐘 Versión PostgreSQL:', result.rows[0].pg_version);

    // Test tablas existentes
    console.log('📋 Verificando tablas existentes...');
    const tables = await client.query(`
      SELECT table_name
      FROM information_schema.tables
      WHERE table_schema = 'public'
      ORDER BY table_name
    `);

    if (tables.rows.length > 0) {
      console.log('📊 Tablas encontradas:');
      tables.rows.forEach(row => {
        console.log(`   - ${row.table_name}`);
      });
    } else {
      console.log('📋 No hay tablas personalizadas (será necesario migrar)');
    }

    client.release();

  } catch (error) {
    console.error('❌ Error de conexión:', error.message);
    console.log('');
    console.log('🔧 Posibles soluciones:');
    console.log('   1. Verifica que DATABASE_URL sea correcta');
    console.log('   2. Asegúrate que el proyecto Supabase esté activo');
    console.log('   3. Verifica que la contraseña sea correcta');
    console.log('   4. Revisa que la región sea accesible');
  } finally {
    await pool.end();
  }
}

testSupabaseConnection();