require('dotenv').config({ quiet: true });

const app = require('./app');
const logger = require('./config/logger');
const connectDB = require('./config/db');

const PORT = process.env.PORT || 3000;

async function start() {
  try {
    await connectDB();

    app.listen(PORT, (error) => {
      if (error) {
        logger.error(`Server failed to start: ${error.message}`);
        process.exit(1);
      }
      logger.info(`Server running on http://localhost:${PORT}`);
    });
  } catch (err) {
    logger.error(`Startup failed: ${err.message}`);
    process.exit(1);
  }
}

start();