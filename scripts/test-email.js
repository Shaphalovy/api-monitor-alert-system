require('dotenv').config({ quiet: true });
const { sendAlertEmail, verifyEmailConnection } = require('../src/services/emailService');

(async () => {
  console.log('Checking SMTP login...');
  const v = await verifyEmailConnection();
  console.log(v.ok ? 'SMTP login OK' : `SMTP login FAILED: ${v.error}`);
  if (!v.ok) process.exit(1);

  const r = await sendAlertEmail(
    {
      apiName: 'AppointmentAPI',
      severity: 'critical',
      anomalyTypes: ['HIGH_RESPONSE_TIME', 'FAILED_REQUEST', 'NO_RECORDS'],
      statusCode: 500,
      responseTimeMs: 5500,
      recordsReturned: 0,
      aiGenerated: false,
      message: 'Test alert: AppointmentAPI failed with status 500 and returned 0 records.',
    },
    { force: true }
  );
  console.log('Result:', r);
})();