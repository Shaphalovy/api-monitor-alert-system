require('dotenv').config({ quiet: true });
if (process.argv.includes('--no-ai')) delete process.env.GEMINI_API_KEY;

const { detectAnomalies } = require('../src/services/anomalyDetector');
const { generateAlertMessage } = require('../src/services/alertGenerator');

const cases = [
  { name: 'Assignment example', input: { api_name: 'AppointmentAPI', response_time_ms: 5500, status_code: 500, records_returned: 0 } },
  { name: 'Only slow', input: { api_name: 'BillingAPI', response_time_ms: 4000, status_code: 200, records_returned: 10 } },
  { name: 'Invalid data', input: { response_time_ms: 'fast', status_code: 'abc', records_returned: -5 } },
];

(async () => {
  for (const c of cases) {
    const result = detectAnomalies(c.input);
    const out = await generateAlertMessage(c.input, result);
    console.log(`\n${c.name}`);
    console.log(`aiGenerated: ${out.aiGenerated}`);
    console.log(out.message);
  }
})();