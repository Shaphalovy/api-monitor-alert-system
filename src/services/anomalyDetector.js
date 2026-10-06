const thresholds = require('../config/thresholds');

const SEVERITY_ORDER = ['low', 'medium', 'high', 'critical'];

function maxSeverity(a, b) {
  return SEVERITY_ORDER.indexOf(a) >= SEVERITY_ORDER.indexOf(b) ? a : b;
}

// Returns a list of problems. Empty list means the input is valid.
function validateInput(item) {
  if (!item || typeof item !== 'object' || Array.isArray(item)) {
    return ['Input item is not an object'];
  }

  const problems = [];

  if (typeof item.api_name !== 'string' || item.api_name.trim() === '') {
    problems.push('api_name is missing or not a string');
  }
  if (typeof item.response_time_ms !== 'number' || !Number.isFinite(item.response_time_ms) || item.response_time_ms < 0) {
    problems.push('response_time_ms must be a non-negative number');
  }
  if (!Number.isInteger(item.status_code) || item.status_code < 100 || item.status_code > 599) {
    problems.push('status_code must be an HTTP status code between 100 and 599');
  }
  if (!Number.isInteger(item.records_returned) || item.records_returned < 0) {
    problems.push('records_returned must be a non-negative integer');
  }

  return problems;
}

function detectAnomalies(item) {
  const problems = validateInput(item);

  if (problems.length > 0) {
    return {
      isAnomaly: true,
      anomalyTypes: ['INVALID_DATA'],
      severity: 'high',
      details: { problems },
    };
  }

  const anomalyTypes = [];
  let severity = 'low';

  if (item.response_time_ms > thresholds.responseTime.warnMs) {
    anomalyTypes.push('HIGH_RESPONSE_TIME');
    const level = item.response_time_ms > thresholds.responseTime.criticalMs ? 'high' : 'medium';
    severity = maxSeverity(severity, level);
  }

  if (item.status_code >= 400) {
    anomalyTypes.push('FAILED_REQUEST');
    severity = maxSeverity(severity, item.status_code >= 500 ? 'critical' : 'high');
  }

  if (item.records_returned < thresholds.minRecords) {
    anomalyTypes.push('NO_RECORDS');
    severity = maxSeverity(severity, 'high');
  }

  const isAnomaly = anomalyTypes.length > 0;

  return {
    isAnomaly,
    anomalyTypes,
    severity: isAnomaly ? severity : null,
    details: {},
  };
}

module.exports = { detectAnomalies, validateInput };