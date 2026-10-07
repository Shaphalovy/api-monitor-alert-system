const Alert = require('../models/Alert');
const logger = require('../config/logger');
const { detectAnomalies } = require('./anomalyDetector');
const { generateAlertMessage, safeName } = require('./alertGenerator');
const { mapWithConcurrency } = require('../utils/concurrency');
const { enqueueAlertEmail } = require('./emailService');
const MAX_BATCH_SIZE = Number(process.env.MAX_BATCH_SIZE) || 100;
const AI_CONCURRENCY = Number(process.env.AI_CONCURRENCY) || 3;

function stringifyInput(item) {
  try {
    return JSON.stringify(item).slice(0, 2000);
  } catch (err) {
    return undefined;
  }
}

function buildAlertDoc(item, result, ai) {
  const invalid = result.anomalyTypes.includes('INVALID_DATA');
  return {
    apiName: safeName(item && item.api_name),
    statusCode: invalid ? undefined : item.status_code,
    responseTimeMs: invalid ? undefined : item.response_time_ms,
    recordsReturned: invalid ? undefined : item.records_returned,
    anomalyTypes: result.anomalyTypes,
    severity: result.severity,
    message: ai.message,
    aiGenerated: ai.aiGenerated,
    rawInput: stringifyInput(item),
  };
}

async function processOne(item, index) {
  const apiName = safeName(item && item.api_name);
  const result = detectAnomalies(item);

  if (!result.isAnomaly) {
    return { index, apiName, status: 'healthy' };
  }

  try {
    const ai = await generateAlertMessage(item, result);
    const alert = await Alert.create(buildAlertDoc(item, result, ai));
    enqueueAlertEmail(alert.toObject());
    return {
      index,
      apiName,
      status: 'alert_created',
      alertId: alert._id,
      severity: alert.severity,
      aiGenerated: alert.aiGenerated,
    };
  } catch (err) {
    logger.error(`Could not store alert for item ${index} (${apiName}): ${err.message}`);
    return { index, apiName, status: 'failed', error: 'Could not store alert' };
  }
}

async function processBatch(items) {
  const startedAt = Date.now();
  const results = await mapWithConcurrency(items, AI_CONCURRENCY, processOne);

  const count = (status) => results.filter((r) => r.status === status).length;
  const summary = {
    processed: items.length,
    healthy: count('healthy'),
    alertsCreated: count('alert_created'),
    failed: count('failed'),
    durationMs: Date.now() - startedAt,
    results,
  };

  logger.info(
    `Batch done: ${summary.processed} processed, ${summary.healthy} healthy, ` +
      `${summary.alertsCreated} alerts, ${summary.failed} failed, ${summary.durationMs} ms`
  );
  return summary;
}

module.exports = { processBatch, MAX_BATCH_SIZE };