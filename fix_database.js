require('dotenv').config();
const mysql = require('mysql2/promise');
const fs = require('fs');

async function fixDatabase() {
  console.log('🔧 Starting database fix...');
  
  // Create connection without database specified
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT) || 3306,
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASS || '',
  });

  try {
    // Create database if not exists
    await connection.execute(`CREATE DATABASE IF NOT EXISTS crm_system CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`);
    console.log('✓ Database created/verified');
    
    // Switch to the database
    await connection.execute('USE crm_system');
    
    // Read and execute schema
    const schemaPath = './database/schema.sql';
    if (fs.existsSync(schemaPath)) {
      const schema = fs.readFileSync(schemaPath, 'utf8');
      const statements = schema.split(';').filter(stmt => stmt.trim());
      
      for (const statement of statements) {
        if (statement.trim()) {
          try {
            await connection.execute(statement);
          } catch (error) {
            // Ignore errors for existing tables/data
            if (!error.message.includes('already exists') && !error.message.includes('Duplicate entry')) {
              console.warn('Schema warning:', error.message);
            }
          }
        }
      }
      console.log('✓ Schema executed');
    }
    
    // Check critical tables
    const tables = ['users', 'eventos_calendario', 'notificaciones', 'audit_logs'];
    for (const table of tables) {
      const [rows] = await connection.execute(`SHOW TABLES LIKE '${table}'`);
      if (rows.length === 0) {
        console.error(`❌ Missing table: ${table}`);
      } else {
        console.log(`✓ Table exists: ${table}`);
      }
    }
    
    console.log('🎉 Database fix completed!');
    
  } catch (error) {
    console.error('❌ Database fix failed:', error.message);
  } finally {
    await connection.end();
  }
}

fixDatabase();
