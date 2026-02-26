console.log('Starting simple test...');

try {
  require('dotenv').config();
  console.log('Dotenv loaded');
  
  const { query } = require('./core/db');
  console.log('DB module loaded');
  
  async function runTest() {
    try {
      console.log('Testing DB connection...');
      const result = await query('SELECT 1 as test, NOW() as time');
      console.log('DB Result:', result);
      
      console.log('Testing eventos_calendario table...');
      const events = await query('SELECT COUNT(*) as count FROM eventos_calendario');
      console.log('Events count:', events);
      
      console.log('Testing notificaciones table...');
      const notifs = await query('SELECT COUNT(*) as count FROM notificaciones');
      console.log('Notifs count:', notifs);
      
      console.log('All tests completed successfully!');
    } catch (error) {
      console.error('Test failed:', error.message);
      console.error('Full error:', error);
    }
  }
  
  runTest();
} catch (error) {
  console.error('Setup error:', error.message);
}
