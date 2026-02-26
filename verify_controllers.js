const adminController = require('./controllers/adminController');
const ventasController = require('./controllers/ventasController');
const finanzasController = require('./controllers/finanzasController');
const asistenciaController = require('./controllers/asistenciaController');

// Mock req and res
const mockRes = (name) => ({
    status: function (code) {
        this.statusCode = code;
        return this;
    },
    json: function (data) {
        console.log(`[${name}] Response (${this.statusCode || 200}):`, JSON.stringify(data).slice(0, 100) + '...');
    }
});

const mockReq = (params = {}, query = {}, body = {}) => ({
    params,
    query,
    body,
    session: { userId: '00000000-0000-0000-0000-000000000001', roleId: 1 }
});

async function runTests() {
    console.log('🧪 Starting Controller Verification...');

    try {
        console.log('\n--- Testing Admin Config ---');
        await adminController.getConfig(mockReq(), mockRes('Admin.getConfig'));

        console.log('\n--- Testing Ventas Stats ---');
        await ventasController.getStats(mockReq(), mockRes('Ventas.getStats'));

        console.log('\n--- Testing Finanzas Stats ---');
        await finanzasController.getStats(mockReq(), mockRes('Finanzas.getStats'));

        console.log('\n--- Testing Asistencia Resumen ---');
        await asistenciaController.getResumen(mockReq(), mockRes('Asistencia.getResumen'));

        console.log('\n--- Testing Proyectos List ---');
        const proyectosController = require('./controllers/proyectosController');
        await proyectosController.list(mockReq(), mockRes('Proyectos.list'));

        console.log('\n--- Testing Evaluations Summary ---');
        const evaluationsController = require('./controllers/evaluationsController');
        await evaluationsController.getSummary(mockReq(), mockRes('Evaluations.getSummary'));

        console.log('\n--- Testing Objectives List ---');
        const objectivesController = require('./controllers/objectivesController');
        await objectivesController.getAll(mockReq(), mockRes('Objectives.getAll'));

        console.log('\n✔ Verification completed!');
    } catch (err) {
        console.error('\n✘ Verification failed with error:', err.message);
    } finally {
        process.exit();
    }
}

runTests();
