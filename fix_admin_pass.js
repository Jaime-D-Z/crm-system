const { pool } = require('./core/db');
async function run() {
    try {
        const hash = '$2b$12$BdcwjI6l9x/WoGQc70BVSOSMLRXD9A249cSuUZZhDIXYza5uNDH2O';
        const [res] = await pool.execute(
            'UPDATE users SET password = ?, is_active = 1, primer_acceso = 0 WHERE email = ?',
            [hash, 'admin@crm.com']
        );
        console.log('Update success:', res);

        const [res2] = await pool.execute('DELETE FROM login_intentos WHERE email = ?', ['admin@crm.com']);
        console.log('Intents cleared:', res2);

        // Let's verify right here
        const [rows] = await pool.execute('SELECT password FROM users WHERE email = ?', ['admin@crm.com']);
        console.log('Verified hash in DB:', rows[0].password);
    } catch (e) {
        console.error('Update failed:', e);
    } finally {
        await pool.end();
        process.exit();
    }
}
run();
