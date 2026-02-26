const fs = require('fs');
const path = require('path');
const { Client } = require('pg');
require('dotenv').config();

async function executeSchema() {
    console.log('🐘 PostgreSQL Schema Runner (FRESH RECREATE)');

    const config = {
        host: process.env.DB_HOST || 'localhost',
        port: parseInt(process.env.DB_PORT) || 5433,
        user: process.env.DB_USER || 'postgres',
        password: process.env.DB_PASS || 'postgres123',
    };

    // 1. Connect to 'postgres' to drop/recreate 'crm_system'
    const adminClient = new Client({ ...config, database: 'postgres' });

    try {
        await adminClient.connect();
        await adminClient.query(`
            SELECT pg_terminate_backend(pid)
            FROM pg_stat_activity
            WHERE datname = 'crm_system'
            AND pid <> pg_backend_pid();
        `);
        console.log("Dropping database 'crm_system'...");
        await adminClient.query("DROP DATABASE IF EXISTS crm_system");
        console.log("Creating database 'crm_system'...");
        await adminClient.query("CREATE DATABASE crm_system");
    } catch (err) {
        console.error('✘ Error recreating database:', err.message);
        process.exit(1);
    } finally {
        await adminClient.end();
    }

    // 2. Connect to 'crm_system' to apply schema
    const client = new Client({ ...config, database: 'crm_system' });

    try {
        await client.connect();
        console.log('Applying schema_pg.sql...');
        const schemaPath = path.join(__dirname, 'database', 'schema_pg.sql');
        const schema = fs.readFileSync(schemaPath, 'utf8');

        await client.query(schema);
        console.log('✔ Schema applied successfully');
    } catch (err) {
        console.error('✘ Error applying schema:', err.message);
        process.exit(1);
    } finally {
        await client.end();
    }
}

executeSchema();
