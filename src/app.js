const path = require('node:path');
const express = require('express');
const cors = require('cors');
const logger = require('./config/logger');
const monitorRoutes = require('./routes/monitorRoutes');
const alertRoutes = require('./routes/alertRoutes');
const { notFound, errorHandler } = require('./middleware/errorHandler');

const app = express();

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, '..', 'public')));

app.use((req, res, next) => {
  logger.info(`${req.method} ${req.originalUrl}`);
  next();
});

app.get('/health', (req, res) => {
  res.status(200).json({ status: 'ok', time: new Date().toISOString() });
});

app.use('/monitor', monitorRoutes);
app.use('/alerts', alertRoutes);

app.use(notFound);
app.use(errorHandler);

module.exports = app;