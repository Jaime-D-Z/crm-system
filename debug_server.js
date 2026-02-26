require('dotenv').config();
const express = require('express');
const cors = require('cors');
const session = require('express-session');
const MySQLStore = require('express-mysql-session')(session);
const { pool, query } = require('./core/db');

const app = express();

// Session Store
const sessionStore = new MySQLStore({ createDatabaseTable: false }, pool);

// CORS
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:5173',
  credentials: true,
}));

app.use(express.json());
app.use(session({
  key: 'crm.sid',
  secret: process.env.SESSION_SECRET || 'dev-secret-change-me',
  store: sessionStore,
  resave: false,
  saveUninitialized: false,
  cookie: { secure: false, maxAge: 24 * 60 * 60 * 1000 } // 24 hours
}));

// Test routes
app.get('/api/test/db', async (req, res) => {
  try {
    const result = await query('SELECT 1 as test');
    res.json({ ok: true, db: 'connected', result: result[0] });
  } catch (error) {
    res.status(500).json({ ok: false, error: error.message });
  }
});

app.get('/api/test/calendario', async (req, res) => {
  try {
    const rows = await query(`
      SELECT ec.*, u.name AS creado_por_nombre
      FROM eventos_calendario ec
      LEFT JOIN users u ON u.id = ec.creado_por
      WHERE ec.fecha_inicio BETWEEN NOW() AND DATE_ADD(NOW(), INTERVAL 7 DAY)
      ORDER BY ec.fecha_inicio LIMIT 10`);
    res.json({ ok: true, eventos: rows });
  } catch (error) {
    console.error('Calendario error:', error);
    res.status(500).json({ ok: false, error: error.message });
  }
});

app.get('/api/test/notificaciones', async (req, res) => {
  try {
    const rows = await query(`
      SELECT n.*, u.name AS creado_por_nombre
      FROM notificaciones n
      LEFT JOIN users u ON u.id = n.creado_por
      ORDER BY n.created_at DESC LIMIT 10`);
    res.json({ ok: true, notificaciones: rows });
  } catch (error) {
    console.error('Notificaciones error:', error);
    res.status(500).json({ ok: false, error: error.message });
  }
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`Debug server running on port ${PORT}`);
  console.log(`Test endpoints:`);
  console.log(`  GET http://localhost:${PORT}/api/test/db`);
  console.log(`  GET http://localhost:${PORT}/api/test/calendario`);
  console.log(`  GET http://localhost:${PORT}/api/test/notificaciones`);
});
