const { Pool } = require('pg');
require('dotenv').config();

async function test() {
    const configs = [
        { port: 5433, pass: 'postgres123' },
        { port: 5432, pass: 'postgres' },
        { port: 5432, pass: 'postgres123' },
        { port: 5433, pass: 'postgres' },
    ];

    for (const c of configs) {
        console.log(`Testing Port: ${c.port}, Pass: ${c.pass}`);
        const pool = new Pool({
            host: 'localhost',
            port: c.port,
            user: 'postgres',
            password: c.pass,
            database: 'postgres',
            connectionTimeoutMillis: 2000,
        });

        try {
            await pool.query('SELECT 1');
            console.log(`✔ SUCCESS: Port ${c.port}, Pass ${c.pass}`);
            await pool.end();
            process.exit(0);
        } catch (err) {
            console.log(`✘ FAILED: ${err.message}`);
            await pool.end();
        }
    }
    console.log('No configuration worked.');
    process.exit(1);
}

test();
