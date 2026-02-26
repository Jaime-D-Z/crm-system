require("dotenv").config();
const express = require("express");
const cors = require("cors");
const session = require("express-session");
const PgSession = require("connect-pg-simple")(session);
const cookieParser = require("cookie-parser");
const helmet = require("helmet");
const path = require("path");
const multer = require("multer");
const fs = require("fs");

const { pool, verifyConnection } = require("./core/db");
const {
  requireAuth,
  requireAdmin,
  requireSuperAdmin,
  requireEmployee,
  requireGuest,
} = require("./middlewares/auth");
const { checkPermission } = require("./middlewares/permissions");
const { loginLimiter, apiLimiter } = require("./middlewares/rateLimiter");
const analyticsMiddleware = require("./middlewares/analytics");

const authCtrl = require("./controllers/authController");
const adminCtrl = require("./controllers/adminController");
const analyticsCtrl = require("./controllers/analyticsController");
const employeeCtrl = require("./controllers/employeeController");
const evalCtrl = require("./controllers/evaluationsController");
const objCtrl = require("./controllers/objectivesController");
const permCtrl = require("./controllers/permissionsController");
const finanzasCtrl = require("./controllers/finanzasController");
const notifCtrl = require("./controllers/notificacionesController");
const calCtrl = require("./controllers/calendarioController");
const asistCtrl = require("./controllers/asistenciaController");
const proyCtrl = require("./controllers/proyectosController");
const ventasCtrl = require("./controllers/ventasController");
const ausenciasCtrl = require("./controllers/ausenciasController");
const reportCtrl = require("./controllers/reportController");

const app = express();

// ── Uploads directory ─────────────────────────────────────
const UPLOADS_DIR = path.join(__dirname, "uploads", "empleados");
fs.mkdirSync(UPLOADS_DIR, { recursive: true });

// ── Multer config ─────────────────────────────────────────
const storage = multer.diskStorage({
  destination: (_, __, cb) => cb(null, UPLOADS_DIR),
  filename: (_, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    const safe = `emp-${Date.now()}-${Math.floor(Math.random() * 10000)}${ext}`;
    cb(null, safe);
  },
});
const photoUpload = multer({
  storage,
  limits: { fileSize: 2 * 1024 * 1024 }, // 2MB
  fileFilter: (_, file, cb) => {
    const allowed = [".jpg", ".jpeg", ".png", ".webp"];
    const ext = path.extname(file.originalname).toLowerCase();
    if (allowed.includes(ext)) return cb(null, true);
    cb(new Error("Solo se permiten imágenes JPG, PNG y WEBP."));
  },
});

// ── Session Store (PostgreSQL) ─────────────────────────────
const sessionStore = new PgSession({
  pool: pool,
  tableName: "session",
});

// ── CORS ──────────────────────────────────────────────────
// Allow React dev server (and production URL) to call the API with cookies
const allowedOrigins = [
  process.env.FRONTEND_URL || "http://localhost:5173",
  "http://localhost:5173",
  "http://localhost:5174", // Support alternative dev port
  "http://localhost:5175", // Support alternative dev port
  "http://localhost:5176", // Support alternative dev port
  "http://localhost:3000", // same-origin requests (HTML views)
];

// Remove empty/undefined origins
const validOrigins = allowedOrigins.filter(Boolean);

app.use(
  cors({
    origin: (origin, callback) => {
      // Allow requests with no origin (e.g. curl, server-to-server, mobile apps)
      if (!origin) return callback(null, true);
      
      // Check if origin is in whitelist
      if (validOrigins.includes(origin)) {
        return callback(null, true);
      }
      
      // Log rejected origin for debugging
      console.warn(`CORS: origin '${origin}' not allowed`);
      callback(new Error(`CORS: origin '${origin}' not allowed`));
    },
    credentials: true,
  }),
);

// ── Core Middleware ───────────────────────────────────────
app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'", "'unsafe-inline'", "cdn.jsdelivr.net"],
        scriptSrcAttr: ["'unsafe-inline'"],
        styleSrc: ["'self'", "'unsafe-inline'", "fonts.googleapis.com"],
        fontSrc: ["'self'", "fonts.gstatic.com"],
        imgSrc: ["'self'", "data:", "blob:"],
        connectSrc: ["'self'", "cdn.jsdelivr.net"],
      },
    },
    crossOriginEmbedderPolicy: false,
    hsts: false,
  }),
);
app.use(express.json({ limit: "1mb" }));
app.use(express.urlencoded({ extended: true, limit: "1mb" }));
app.use(cookieParser());
app.use(
  session({
    key: "crm.sid",
    secret: process.env.SESSION_SECRET || "dev-secret-change-me",
    store: sessionStore,
    resave: false,
    saveUninitialized: false,
    cookie: { 
      httpOnly: true,
      sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',  // ← CAMBIO IMPORTANTE
      secure: process.env.NODE_ENV === 'production',  // ← CAMBIO IMPORTANTE
      maxAge: 8 * 60 * 60 * 1000 
    },
  }),
);


// ── Static files ──────────────────────────────────────────
app.use(express.static(path.join(__dirname, "public")));
app.use("/uploads", express.static(path.join(__dirname, "uploads")));

// ── Analytics Middleware ──────────────────────────────────
app.use(analyticsMiddleware);

// ── Helpers ───────────────────────────────────────────────
const v = (f) => path.join(__dirname, "views", f);

// ── Legacy Page Routes (Replaced by React SPA) ─────────────
/*
app.get('/', requireGuest, (_, r) => r.sendFile(v('login.html')));
app.get('/login', requireGuest, (_, r) => r.sendFile(v('login.html')));
app.get('/change-password', requireAuth, (_, r) => r.sendFile(v('change-password.html')));

// Admin pages
app.get('/admin/dashboard', requireAdmin, (_, r) => r.sendFile(v('admin/dashboard.html')));
app.get('/admin/employees', requireAdmin, (_, r) => r.sendFile(v('admin/employees.html')));
app.get('/admin/analytics', requireAdmin, (_, r) => r.sendFile(v('admin/analytics.html')));
app.get('/admin/audit', requireAdmin, (_, r) => r.sendFile(v('admin/audit.html')));
app.get('/admin/permissions', requireSuperAdmin, (_, r) => r.sendFile(v('admin/permissions.html')));

// Employee pages
app.get('/employee/dashboard', requireEmployee, (req, res) => {
  const role = req.session.roleName || req.session.userRole;
  if (role === 'developer') return res.sendFile(v('employee/developer.html'));
  if (role === 'instructor') return res.sendFile(v('employee/instructor.html'));
  if (role === 'assistant') return res.sendFile(v('employee/assistant.html'));
  return res.sendFile(v('employee/dashboard.html'));
});
app.get('/employee/assistant', requireEmployee, (_, r) => r.sendFile(v('employee/assistant.html')));

// Admin module pages
app.get('/admin/asistencia', requireAdmin, (_, r) => r.sendFile(v('admin/asistencia.html')));
app.get('/admin/permisos', requireAdmin, (_, r) => r.sendFile(v('admin/permisos.html')));
app.get('/admin/proyectos', requireAdmin, (_, r) => r.sendFile(v('admin/proyectos.html')));
app.get('/admin/ventas', requireAdmin, (_, r) => r.sendFile(v('admin/ventas.html')));
app.get('/admin/finanzas', requireAdmin, (_, r) => r.sendFile(v('admin/finanzas.html')));
app.get('/admin/notificaciones', requireAdmin, (_, r) => r.sendFile(v('admin/notificaciones.html')));
app.get('/admin/calendario', requireAdmin, (_, r) => r.sendFile(v('admin/calendario.html')));
*/

// 403 page
app.get("/403", (_, r) => r.sendFile(v("403.html")));

// ── Global API rate limiter ───────────────────────────────
app.use("/api", apiLimiter);

// ── API Auth ──────────────────────────────────────────────
app.post("/api/auth/login", loginLimiter, authCtrl.login);
app.post("/api/auth/logout", authCtrl.logout);
app.get("/api/auth/me", requireAuth, authCtrl.me);
app.get("/api/users", requireAdmin, authCtrl.listUsers); // Added route
app.post(
  "/api/auth/change-password",
  requireAuth,
  ...authCtrl.changePasswordValidators,
  authCtrl.changePassword,
);
// Forgot password (OTP flow)
app.post("/api/auth/forgot-password", authCtrl.requestPasswordReset);
app.post("/api/auth/reset-password", authCtrl.confirmPasswordReset);

// ── API Admin — Employees ─────────────────────────────────
app.get("/api/admin/dashboard", requireAdmin, adminCtrl.dashboard);
app.get(
  "/api/admin/employees",
  requireAdmin,
  checkPermission("RRHH", "ver"),
  adminCtrl.listEmployees,
);
app.get(
  "/api/admin/employees/:id",
  requireAdmin,
  checkPermission("RRHH", "ver"),
  adminCtrl.getEmployee,
);
app.post(
  "/api/admin/employees",
  requireAdmin,
  checkPermission("RRHH", "crear"),
  ...adminCtrl.createValidators,
  adminCtrl.createEmployee,
);
app.put(
  "/api/admin/employees/:id",
  requireAdmin,
  checkPermission("RRHH", "editar"),
  adminCtrl.updateEmployee,
);
app.delete(
  "/api/admin/employees/:id",
  requireAdmin,
  checkPermission("RRHH", "eliminar"),
  adminCtrl.deleteEmployee,
);
app.post(
  "/api/admin/employees/:id/photo",
  requireAdmin,
  checkPermission("RRHH", "editar"),
  (req, res, next) =>
    photoUpload.single("photo")(req, res, (err) => {
      if (err) return res.status(400).json({ error: err.message });
      next();
    }),
  adminCtrl.uploadPhoto,
);
app.get(
  "/api/admin/reports/employees/csv",
  requireAdmin,
  checkPermission("RRHH", "ver"),
  reportCtrl.exportEmployeesCSV,
);

// ── API Admin — Audit ─────────────────────────────────────
app.get(
  "/api/admin/audit",
  requireAdmin,
  checkPermission("Auditoria", "ver"),
  adminCtrl.getAuditLogs,
);
app.get(
  "/api/admin/audit/duplicates",
  requireAdmin,
  checkPermission("Auditoria", "ver"),
  adminCtrl.getDuplicates,
);

// ── API Admin — Config Global ─────────────────────────────
app.get("/api/admin/config", requireAdmin, adminCtrl.getConfig);
app.put("/api/admin/config/:key", requireAdmin, adminCtrl.updateConfig);

// ── API Permissions (Super Admin only) ────────────────────
app.get("/api/permissions/matrix", requireSuperAdmin, permCtrl.getMatrix);
app.get("/api/permissions/roles", requireAdmin, permCtrl.getRoles);
app.post("/api/permissions/toggle", requireSuperAdmin, permCtrl.toggle);
app.put(
  "/api/permissions/role/:roleId",
  requireSuperAdmin,
  permCtrl.bulkUpdate,
);

// ── API Analytics ─────────────────────────────────────────
app.post("/api/analytics/pageview", requireAuth, analyticsCtrl.trackPageView);
app.get(
  "/api/analytics/stats",
  requireAdmin,
  checkPermission("Analitica", "ver"),
  analyticsCtrl.getStats,
);
app.get(
  "/api/analytics/traffic",
  requireAdmin,
  checkPermission("Analitica", "ver"),
  analyticsCtrl.getTraffic,
);
app.get(
  "/api/analytics/pages",
  requireAdmin,
  checkPermission("Analitica", "ver"),
  analyticsCtrl.getTopPages,
);
app.get(
  "/api/analytics/devices",
  requireAdmin,
  checkPermission("Analitica", "ver"),
  analyticsCtrl.getDevices,
);
app.get(
  "/api/analytics/clicks",
  requireAdmin,
  checkPermission("Analitica", "ver"),
  analyticsCtrl.getTopClicks,
);
app.post("/api/analytics/click", requireAuth, analyticsCtrl.trackClick);

// ── API Evaluaciones ──────────────────────────────────────
app.post(
  "/api/evaluations",
  requireAdmin,
  checkPermission("Desempeno", "crear"),
  ...evalCtrl.validators,
  evalCtrl.create,
);
app.get(
  "/api/evaluations/summary",
  requireAdmin,
  checkPermission("Desempeno", "ver"),
  evalCtrl.getSummary,
);
app.get(
  "/api/evaluations/:employeeId",
  requireAuth,
  checkPermission("Desempeno", "ver"),
  evalCtrl.getByEmployee,
);

// ── API Objetivos ─────────────────────────────────────────
app.post(
  "/api/objectives",
  requireAdmin,
  checkPermission("Objetivos", "crear"),
  ...objCtrl.validators,
  objCtrl.create,
);
app.get(
  "/api/objectives",
  requireAdmin,
  checkPermission("Objetivos", "ver"),
  objCtrl.getAll,
);
app.get(
  "/api/objectives/employee/:employeeId",
  requireAuth,
  checkPermission("Objetivos", "ver"),
  objCtrl.getByEmployee,
);
app.patch(
  "/api/objectives/:id/progress",
  requireAdmin,
  checkPermission("Objetivos", "editar"),
  objCtrl.updateProgress,
);

// ── API Employee ──────────────────────────────────────────
app.get("/api/employee/dashboard", requireEmployee, employeeCtrl.dashboard);

// ── API Ausencias (Permisos/Vacaciones) ───────────────────
app.post("/api/ausencias", requireAuth, ausenciasCtrl.create);
app.get("/api/ausencias", requireAdmin, ausenciasCtrl.getAll);
app.put("/api/ausencias/:id/aprobar", requireAdmin, ausenciasCtrl.aprobar);
app.put("/api/ausencias/:id/rechazar", requireAdmin, ausenciasCtrl.rechazar);

// ── API Finanzas ───────────────────────────────────────────
app.get(
  "/api/finanzas/stats",
  requireAdmin,
  checkPermission("Finanzas", "ver"),
  finanzasCtrl.getStats,
);
app.get(
  "/api/finanzas/evolutivo",
  requireAdmin,
  checkPermission("Finanzas", "ver"),
  finanzasCtrl.getEvolutivo,
);
app.get(
  "/api/finanzas/categorias",
  requireAdmin,
  checkPermission("Finanzas", "ver"),
  finanzasCtrl.getCategorias,
);
app.get(
  "/api/finanzas/transacciones",
  requireAdmin,
  checkPermission("Finanzas", "ver"),
  finanzasCtrl.list,
);
app.post(
  "/api/finanzas/transacciones",
  requireAdmin,
  checkPermission("Finanzas", "crear"),
  finanzasCtrl.create,
);
app.put(
  "/api/finanzas/transacciones/:id",
  requireAdmin,
  checkPermission("Finanzas", "editar"),
  finanzasCtrl.update,
);
app.patch(
  "/api/finanzas/transacciones/:id/anular",
  requireAdmin,
  checkPermission("Finanzas", "editar"),
  finanzasCtrl.anular,
);

// ── API Notificaciones ─────────────────────────────────────
app.get("/api/notificaciones/badge", requireAuth, notifCtrl.getBadge);
app.get("/api/notificaciones/mias", requireAuth, notifCtrl.getMias);
app.get("/api/notificaciones", requireAdmin, notifCtrl.getAll);
app.post("/api/notificaciones", requireAdmin, notifCtrl.create);
app.put(
  "/api/notificaciones/leer-todas",
  requireAuth,
  notifCtrl.marcarTodasLeidas,
);
app.put("/api/notificaciones/:id/leer", requireAuth, notifCtrl.marcarLeida);
app.delete("/api/notificaciones/:id", requireAdmin, notifCtrl.eliminar);

// ── API Calendario ─────────────────────────────────────────
app.get("/api/calendario/proximos", requireAuth, calCtrl.getProximos);
app.get("/api/calendario", requireAuth, calCtrl.getByMes);
app.post("/api/calendario", requireAdmin, calCtrl.create);
app.put("/api/calendario/:id", requireAdmin, calCtrl.update);
app.delete("/api/calendario/:id", requireAdmin, calCtrl.remove);

// ── API Asistencia ─────────────────────────────────────────
app.get(
  "/api/asistencia/resumen",
  requireAdmin,
  checkPermission("Asistencia", "ver"),
  asistCtrl.getResumen,
);
app.get(
  "/api/asistencia/list",
  requireAdmin,
  checkPermission("Asistencia", "ver"),
  asistCtrl.getList,
);
app.get("/api/asistencia/historial", requireAuth, asistCtrl.getHistorial);
app.post(
  "/api/asistencia/marcar",
  requireAdmin,
  checkPermission("Asistencia", "editar"),
  asistCtrl.marcar,
);
app.post("/api/asistencia/entrada", requireAuth, asistCtrl.marcarEntrada);
app.post("/api/asistencia/salida", requireAuth, asistCtrl.marcarSalida);

// ── API Proyectos ──────────────────────────────────────────
app.get("/api/proyectos/mis-tareas", requireAuth, proyCtrl.getMyTasks);
app.get(
  "/api/proyectos/stats",
  requireAdmin,
  checkPermission("Proyectos", "ver"),
  proyCtrl.getStats,
);
app.get(
  "/api/proyectos",
  requireAdmin,
  checkPermission("Proyectos", "ver"),
  proyCtrl.list,
);
app.post(
  "/api/proyectos",
  requireAdmin,
  checkPermission("Proyectos", "crear"),
  proyCtrl.create,
);
app.get(
  "/api/proyectos/:id",
  requireAdmin,
  checkPermission("Proyectos", "ver"),
  proyCtrl.get,
);
app.put(
  "/api/proyectos/:id",
  requireAdmin,
  checkPermission("Proyectos", "editar"),
  proyCtrl.update,
);
app.delete(
  "/api/proyectos/:id",
  requireAdmin,
  checkPermission("Proyectos", "eliminar"),
  proyCtrl.remove,
);
app.post(
  "/api/proyectos/:id/tareas",
  requireAdmin,
  checkPermission("Proyectos", "editar"),
  proyCtrl.createTarea,
);
app.patch(
  "/api/proyectos/tareas/:tareaId/estado",
  requireAdmin,
  checkPermission("Proyectos", "editar"),
  proyCtrl.updateTareaEstado,
);

// ── API Ventas ─────────────────────────────────────────────
app.get(
  "/api/ventas/stats",
  requireAdmin,
  checkPermission("Ventas", "ver"),
  ventasCtrl.getStats,
);
app.get(
  "/api/ventas/evolutivo",
  requireAdmin,
  checkPermission("Ventas", "ver"),
  ventasCtrl.getEvolutivo,
);
app.get(
  "/api/ventas",
  requireAdmin,
  checkPermission("Ventas", "ver"),
  ventasCtrl.list,
);
app.post(
  "/api/ventas",
  requireAdmin,
  checkPermission("Ventas", "crear"),
  ventasCtrl.create,
);
app.put(
  "/api/ventas/:id",
  requireAdmin,
  checkPermission("Ventas", "editar"),
  ventasCtrl.update,
);
app.patch(
  "/api/ventas/:id/estado",
  requireAdmin,
  checkPermission("Ventas", "editar"),
  ventasCtrl.updateEstado,
);
app.delete(
  "/api/ventas/:id",
  requireAdmin,
  checkPermission("Ventas", "eliminar"),
  ventasCtrl.remove,
);

// ── Multer / generic error handler ───────────────────────
// Must be BEFORE the 404 fallback so it can intercept upload errors
app.use((err, req, res, next) => {
  if (err.code === "LIMIT_FILE_SIZE")
    return res
      .status(400)
      .json({ error: "Archivo demasiado grande. Máximo 2MB." });
  if (err) return res.status(400).json({ error: err.message });
  next();
});

// ── 404 Fallback ──────────────────────────────────────────
app.use((req, res) => {
  if (req.path.startsWith("/api"))
    return res.status(404).json({ error: "Not found" });
  res.redirect("/login");
});

// ── Start ─────────────────────────────────────────────────
const PORT = process.env.PORT || 3000;
app.listen(PORT, async () => {
  console.log(
    `\n🚀 ${process.env.APP_NAME || "CRM System"} running at http://localhost:${PORT}`,
  );
  console.log("   Press Ctrl+C to stop\n");
  await verifyConnection();
  console.log("  📁 Uploads dir ready:", UPLOADS_DIR, "\n");
});
