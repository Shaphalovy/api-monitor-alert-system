const { processBatch, MAX_BATCH_SIZE } = require('../services/monitorService');
const HttpError = require('../utils/HttpError');

async function monitor(req, res) {
  let items = req.body;

  if (items === undefined) {
    throw new HttpError(400, 'Request body is missing. Send JSON with Content-Type: application/json');
  }
  if (!Array.isArray(items)) {
    items = [items];
  }
  if (items.length === 0) {
    throw new HttpError(400, 'Request body must contain at least one API response');
  }
  if (items.length > MAX_BATCH_SIZE) {
    throw new HttpError(400, `Too many items. Maximum batch size is ${MAX_BATCH_SIZE}`);
  }

  const summary = await processBatch(items);
  res.status(summary.alertsCreated > 0 ? 201 : 200).json(summary);
}

module.exports = { monitor };