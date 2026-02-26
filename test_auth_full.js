const axios = require('axios');
const http = require('http');

const BASE_URL = 'http://localhost:3000';

async function testAuth() {
    console.log('🧪 Testing Full Auth Flow...\n');

    // Create an axios instance to maintain cookies
    const client = axios.create({
        baseURL: BASE_URL,
        withCredentials: true
    });

    try {
        // 1. Login
        console.log('1. Attempting login as admin@crm.com...');
        const loginRes = await client.post('/api/auth/login', {
            email: 'admin@crm.com',
            password: 'Admin1234!'
        });

        console.log('✓ Login successful:', loginRes.data.ok ? 'OK' : 'FAIL');
        const cookie = loginRes.headers['set-cookie'];
        if (cookie) client.defaults.headers.Cookie = cookie[0];

        // 2. Call /api/auth/me
        console.log('2. Calling /api/auth/me...');
        const meRes = await client.get('/api/auth/me');

        console.log('✓ /api/auth/me successful!');
        console.log('   User:', meRes.data.userName);
        console.log('   Role:', meRes.data.roleName);
        console.log('   Primer Acceso:', meRes.data.primerAcceso);

        if (meRes.status === 200) {
            console.log('\n✅ AUTH FLOW VERIFIED - No 403 error on /me');
        }

    } catch (error) {
        console.error('❌ Test failed:', error.response?.status, error.response?.data || error.message);
    }
}

testAuth();
