const { query } = require("./core/db");

async function checkAnalyticsData() {
  try {
    const devices = await query(
      `SELECT device_type, COUNT(*) AS total 
             FROM web_analytics 
             WHERE created_at >= CURRENT_TIMESTAMP - (INTERVAL '1 day' * $1)
             GROUP BY device_type 
             ORDER BY total DESC`,
      [7],
    );

    console.log("\n📊 Distribución de Dispositivos (últimos 7 días):");
    console.table(devices);

    const total = devices.reduce((sum, d) => sum + d.total, 0);
    console.log("\n📈 Porcentajes:");
    devices.forEach((d) => {
      const pct = ((d.total / total) * 100).toFixed(1);
      console.log(`  ${d.device_type}: ${d.total} sesiones (${pct}%)`);
    });
  } catch (err) {
    console.error("Error:", err.message);
  } finally {
    process.exit(0);
  }
}

checkAnalyticsData();
