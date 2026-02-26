require('dotenv').config();
const axios = require('axios');

const BASE_URL = 'http://localhost:3000';

async function testEndpoints() {
  console.log('🧪 Testing API endpoints...\n');
  
  // Test endpoints without authentication (should return 401 or 403)
  const endpoints = [
    { path: '/api/calendario/proximos', expected: 401 },
    { path: '/api/notificaciones', expected: 401 },
    { path: '/api/admin/audit', expected: 401 },
    { path: '/api/ventas/stats', expected: 401 },
    { path: '/api/proyectos/stats', expected: 401 },
    { path: '/api/finanzas/stats', expected: 401 },
    { path: '/api/asistencia/list', expected: 401 },
  ];
  
  for (const endpoint of endpoints) {
    try {
      const response = await axios.get(`${BASE_URL}${endpoint.path}`, {
        validateStatus: () => true // Don't throw on error status
      });
      
      const status = response.status;
      const statusText = status === endpoint.expected ? '✓' : '❌';
      
      console.log(`${statusText} ${endpoint.path}: ${status} (expected ${endpoint.expected})`);
      
      if (status >= 500) {
        console.log(`   Error: ${response.data?.error || 'Unknown error'}`);
      }
    } catch (error) {
      console.log(`❌ ${endpoint.path}: Connection error - ${error.message}`);
    }
  }
  
  console.log('\n📝 Test completed. Check server logs for more details.');
}

testEndpoints().catch(console.error);
