const Alert = require('../models/Alert');
const HttpError = require('../utils/HttpError');

const STATUSES = ['active', 'resolved'];
const SEVERITIES = ['low', 'medium', 'high', 'critical'];

function single(value, name) {
  if (value === undefined) return undefined;
  if (typeof value !== 'string') {
    throw new HttpError(400, `${name} must be a single value`);
  }
  return value;
}

async function listAlerts(req, res) {
  const status = single(req.query.status, 'status') ?? 'active';
  const severity = single(req.query.severity, 'severity');
  const apiName = single(req.query.apiName, 'apiName');

  const filter = {};

  if (status !== 'all') {
    if (!STATUSES.includes(status)) {
      throw new HttpError(400, `status must be one of: ${STATUSES.join(', ')}, all`);
    }
    filter.status = status;
  }
  if (severity) {
    if (!SEVERITIES.includes(severity)) {
      throw new HttpError(400, `severity must be one of: ${SEVERITIES.join(', ')}`);
    }
    filter.severity = severity;
  }
  if (apiName) {
    filter.apiName = apiName;
  }

  const limit = Math.min(Math.max(parseInt(req.query.limit, 10) || 100, 1), 500);

  const alerts = await Alert.find(filter).sort({ createdAt: -1 }).limit(limit).lean();
  res.json({ count: alerts.length, alerts });
}

async function resolveAlert(req, res) {
  const { id } = req.params;

  if (!/^[a-f\d]{24}$/i.test(id)) {
    throw new HttpError(400, 'Invalid alert id');
  }

  const alert = await Alert.findByIdAndUpdate(
    id,
    { status: 'resolved', resolvedAt: new Date() },
    { returnDocument: 'after' }
  ).lean();

  if (!alert) {
    throw new HttpError(404, 'Alert not found');
  }
  res.json(alert);
}

module.exports = { listAlerts, resolveAlert };