const logger = require('../config/logger');

function notFound(req, res) {
  res.status(404).json({ error: `Route not found: ${req.method} ${req.originalUrl}` });
}

// Express recognises an error handler by its 4 arguments, so keep `next`
function errorHandler(err, req, res, next) {
  if (res.headersSent) return next(err);

  let status = err.status || err.statusCode || 500;
  if (err.name === 'ValidationError') status = 400;
  if (status < 400 || status > 599) status = 500;

  if (status >= 500) {
    logger.error(`${req.method} ${req.originalUrl} -> ${err.stack || err.message}`);
  } else {
    logger.warn(`${req.method} ${req.originalUrl} -> ${status} ${err.message}`);
  }

  let message = 'Internal server error';
  if (status < 500) {
    message = err.type === 'entity.parse.failed' ? 'Request body is not valid JSON' : err.message;
  }

  res.status(status).json({ error: message });
}

module.exports = { notFound, errorHandler };