const User = require('../models/User');
const Otp = require('../models/Otp');
const AuditLog = require('../models/AuditLog');
const { sendOtp } = require('../core/mailer');

// POST /api/otp/verify
function verify(req, res) {
  const { code } = req.body;
  const userId = req.session?.pendingUserId;

  if (!userId) return res.status(400).json({ errors: ['Session expired. Please register again.'] });

  const user = User.findById(userId);
  if (!user) return res.status(400).json({ errors: ['User not found.'] });

  const clean = String(code || '').replace(/\D/g, '').padStart(6, '0');

  if (!Otp.verify(userId, clean, 'verification')) {
    AuditLog.log(userId, 'otp_failed', req, { code });
    return res.status(400).json({ errors: ['Invalid or expired code. Try again.'] });
  }

  User.markVerified(userId);
  AuditLog.log(userId, 'email_verified', req);

  req.session.regenerate(err => {
    if (err) return res.status(500).json({ errors: ['Session error.'] });

    req.session.userId = userId;
    req.session.userName = user.name;
    req.session.userEmail = user.email;

    AuditLog.log(userId, 'login', req, { method: 'post_verification' });

    res.json({ ok: true, redirectTo: '/dashboard' });
  });
}

// POST /api/otp/resend
async function resend(req, res) {
  const userId = req.session?.pendingUserId;
  const email  = req.session?.pendingUserEmail;
  const name   = req.session?.pendingUserName;

  if (!userId) return res.status(400).json({ errors: ['Session expired.'] });

  const otp = Otp.generate(userId, email, 'verification');
  AuditLog.log(userId, 'otp_sent', req, { type: 'resend' });
  req.session.demoOtp = otp;

  sendOtp(email, name, otp).catch(err => console.error('Mail error:', err.message));

  res.json({ ok: true, message: `New code sent to ${email}` });
}

// GET /api/otp/pending  — returns pending session info for the frontend
function pending(req, res) {
  if (!req.session?.pendingUserId) return res.status(400).json({ error: 'No pending session' });
  res.json({
    email: req.session.pendingUserEmail,
    name: req.session.pendingUserName,
    demoOtp: req.session.demoOtp ?? null,
  });
}

module.exports = { verify, resend, pending };
