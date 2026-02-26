require('dotenv').config();
const { query } = require('./core/db');

async function testDB() {
  try {
    console.log('Testing DB connection...');
    await query('SELECT 1');
    console.log('DB OK');
    
    // Test specific tables
    console.log('Checking eventos_calendario table...');
    const events = await query('SELECT COUNT(*) as count FROM eventos_calendario LIMIT 1');
    console.log('Eventos table exists, count:', events[0].count);
    
    console.log('Checking notificaciones table...');
    const notifs = await query('SELECT COUNT(*) as count FROM notificaciones LIMIT 1');
    console.log('Notificaciones table exists, count:', notifs[0].count);
    
  } catch (error) {
    console.error('DB Error:', error.message);
    console.error('Full error:', error);
  }
}

testDB();
