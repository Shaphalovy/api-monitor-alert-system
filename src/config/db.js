const dns = require('node:dns');
const mongoose = require('mongoose');
const logger = require('./logger');

async function connectDB() {
  const uri = process.env.MONGODB_URI;

  if (!uri) {
    throw new Error('MONGODB_URI is missing in .env file');
  }

  // Workaround for Node.js SRV lookup failing on some Windows setups
  if (process.env.DNS_SERVERS) {
    const servers = process.env.DNS_SERVERS.split(',').map((s) => s.trim());
    dns.setServers(servers);
    logger.info(`Using custom DNS servers: ${servers.join(', ')}`);
  }

  mongoose.connection.on('connected', () => logger.info('MongoDB connected'));
  mongoose.connection.on('disconnected', () => logger.warn('MongoDB disconnected'));
  mongoose.connection.on('error', (err) => logger.error(`MongoDB error: ${err.message}`));

  await mongoose.connect(uri, { serverSelectionTimeoutMS: 10000 });
}

module.exports = connectDB;