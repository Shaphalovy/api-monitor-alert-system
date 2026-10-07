const nodemailer = require('nodemailer');
const logger = require('../config/logger');

const SEVERITY_RANK = { low: 1, medium: 2, high: 3, critical: 4 };

const config = () => ({
  user: process.env.SMTP_USER,
  pass: process.env.SMTP_PASS,
  to: process.env.ALERT_EMAIL_TO,
  host: process.env.SMTP_HOST || 'smtp.gmail.com',
  port: Number(process.env.SMTP_PORT) || 465,
  minSeverity: process.env.ALERT_EMAIL_MIN_SEVERITY || 'high',
});

const isConfigured = () => {
  const c = config();
  return Boolean(c.user && c.pass && c.to);
};

let transporter; // created once and reused (Nodemailer docs recommendation)
function getTransporter() {
  if (!transporter) {
    const c = config();
    transporter = nodemailer.createTransport({
      host: c.host,
      port: c.port,
      secure: c.port === 465,
      auth: { user: c.user, pass: c.pass },
      connectionTimeout: 10000,
      greetingTimeout: 10000,
      socketTimeout: 15000,
    });
  }
  return transporter;
}

const escapeHtml = (s) =>
  String(s).replace(/[&<>"']/g, (ch) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch]));

// strip line breaks so nothing from outside can inject extra email headers
const oneLine = (s) => String(s).replace(/[\r\n]+/g, ' ').slice(0, 120);

function shouldEmail(severity) {
  const min = SEVERITY_RANK[config().minSeverity] || SEVERITY_RANK.high;
  return (SEVERITY_RANK[severity] || 0) >= min;
}

function buildEmail(alert) {
  const sev = String(alert.severity || 'unknown').toUpperCase();
  const subject = oneLine(`[${sev}] ${alert.apiName} anomaly detected`);
  const lines = [
    `API: ${alert.apiName}`,
    `Severity: ${sev}`,
    `Issues: ${(alert.anomalyTypes || []).join(', ')}`,
    `Status code: ${alert.statusCode ?? 'n/a'}`,
    `Response time: ${alert.responseTimeMs != null ? alert.responseTimeMs + ' ms' : 'n/a'}`,
    `Records returned: ${alert.recordsReturned ?? 'n/a'}`,
    `Message source: ${alert.aiGenerated ? 'AI (Gemini)' : 'template fallback'}`,
  ];
  const text = `${alert.message}\n\n${lines.join('\n')}\n`;
  const html =
    `<p style="font-size:15px">${escapeHtml(alert.message)}</p>` +
    `<ul style="font-family:Arial,sans-serif;font-size:13px;color:#444">` +
    lines.map((l) => `<li>${escapeHtml(l)}</li>`).join('') +
    `</ul>`;
  return { subject, text, html };
}

// Never throws: a failed email must not break alert saving.
async function sendAlertEmail(alert, { force = false } = {}) {
  if (!isConfigured()) return { sent: false, reason: 'not_configured' };
  if (!force && !shouldEmail(alert.severity)) return { sent: false, reason: 'below_threshold' };
  try {
    const { subject, text, html } = buildEmail(alert);
    const info = await getTransporter().sendMail({
      from: `"API Monitor" <${config().user}>`,
      to: config().to,
      subject,
      text,
      html,
    });
    logger.info(`Alert email sent for ${alert.apiName}`, { messageId: info.messageId });
    return { sent: true, messageId: info.messageId };
  } catch (err) {
    logger.error(`Alert email failed for ${alert.apiName}: ${err.message}`);
    return { sent: false, reason: 'send_failed', error: err.message };
  }
}

async function verifyEmailConnection() {
  if (!isConfigured()) return { ok: false, error: 'SMTP_USER, SMTP_PASS or ALERT_EMAIL_TO missing in .env' };
  try {
    await getTransporter().verify();
    return { ok: true };
  } catch (err) {
    return { ok: false, error: err.message };
  }
}

// Fire-and-forget, one email at a time, so a big batch never opens
// many Gmail connections at once and /monitor never waits for SMTP.
let emailChain = Promise.resolve();
function enqueueAlertEmail(alert) {
  if (!isConfigured() || !shouldEmail(alert.severity)) return;
  emailChain = emailChain
    .then(() => sendAlertEmail(alert))
    .catch((err) => logger.error(`Email queue error: ${err.message}`));
}

module.exports = { sendAlertEmail, enqueueAlertEmail, verifyEmailConnection, shouldEmail, buildEmail, isConfigured };