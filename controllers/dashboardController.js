const User = require('../models/User');
const AuditLog = require('../models/AuditLog');

// GET /api/dashboard  (generic — not currently routed; see adminCtrl or employeeCtrl)
async function index(req, res) {
  const userId = req.session?.userId;
  if (!userId) return res.status(401).json({ error: 'No autenticado.' });

  try {
    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ error: 'Usuario no encontrado.' });

    const logs = await AuditLog.getByUser(userId, 20);
    const totalLogins = logs.filter(l => l.event === 'login').length;

    res.json({
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        roleName: user.role_name,
        createdAt: user.created_at,
      },
      stats: {
        totalLogins,
        totalEvents: logs.length,
      },
      logs,
    });
  } catch (err) {
    console.error('Dashboard index error:', err);
    res.status(500).json({ error: 'Error del servidor.' });
  }
}

module.exports = { index };
