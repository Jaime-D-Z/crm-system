"use strict";
const { query } = require("../core/db");

// ── Obtener logs de auditoría paginated ──────────────────────────
exports.getAuditLogs = async (req, res) => {
  try {
    const page = parseInt(req.query.page || 1);
    const limit = parseInt(req.query.limit || 50);
    const offset = (page - 1) * limit;

    const [logs, countResult] = await Promise.all([
      query(
        `
        SELECT al.*, u.name AS usuario_nombre 
        FROM audit_logs al
        LEFT JOIN users u ON u.id = al.usuario_id
        ORDER BY al.created_at DESC 
        LIMIT ? OFFSET ?`,
        [limit, offset],
      ),
      query(`SELECT COUNT(*) AS total FROM audit_logs`),
    ]);

    res.json({
      ok: true,
      logs,
      total: countResult[0]?.total || 0,
      page,
      limit,
      pages: Math.ceil((countResult[0]?.total || 0) / limit),
    });
  } catch (e) {
    console.error("Audit error:", e);
    res.status(500).json({ error: "Error al obtener registros de auditoría" });
  }
};

// ── Obtener duplicados ────────────────────────────────────────────
exports.getDuplicates = async (req, res) => {
  try {
    const duplicates = await query(`
        SELECT tabla, PRIMARY KEY, COUNT(*) AS repeticiones
        FROM audit_duplicate
        GROUP BY tabla, PRIMARY KEY
        HAVING repeticiones > 1
        ORDER BY repeticiones DESC`);

    res.json({ ok: true, duplicados: duplicates });
  } catch (e) {
    console.error("Duplicates error:", e);
    res.status(500).json({ error: "Error al obtener duplicados" });
  }
};
