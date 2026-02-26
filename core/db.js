require('dotenv').config();
const { Pool } = require('pg');

const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT) || 5432,
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASS || 'postgres',
  database: process.env.DB_NAME || 'crm_system',
  max: 10,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
  ssl: {
    rejectUnauthorized: false  // <--- AÑADE ESTO
  },
});
/**
 * Execute a parameterized SQL query.
 * Adapts internal ? placeholders to PostgreSQL $1, $2, etc. if needed,
 * but recommended to update models to use $ placeholders directly.
 * For now, this helper will keep the same interface.
 * @param {string} sql
 * @param {Array}  params
 * @returns {Promise<any[]>}
 */
async function query(sql, params = []) {
  // Simple regex to replace ? with $1, $2... if they exist
  let index = 1;
  const pgSql = sql.replace(/\?/g, () => `$${index++}`);

  const safeParams = Array.isArray(params) ? params : [params].filter(p => p !== undefined);

  try {
    const result = await pool.query(pgSql, safeParams);
    return result.rows;
  } catch (err) {
    console.error('------- DATABASE ERROR -------');
    console.error('Message:', err.message);
    console.error('SQL:', pgSql);
    console.error('Params:', JSON.stringify(safeParams));
    console.error('------------------------------');
    throw err;
  }
}

async function verifyConnection() {
  try {
    const res = await pool.query('SELECT 1');
    console.log('  ✔ PostgreSQL connected');
  } catch (err) {
    console.error('  ✘ PostgreSQL connection failed:', err.message);
    console.error('    → Check DB_HOST, DB_USER, DB_PASS, DB_NAME in .env');
    process.exit(1);
  }
}

module.exports = { pool, query, verifyConnection };
