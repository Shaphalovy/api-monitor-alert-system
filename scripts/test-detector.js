const { detectAnomalies } = require('../src/services/anomalyDetector');

const cases = [
  { name: '1. Healthy', input: { api_name: 'PatientDataAPI', response_time_ms: 1200, status_code: 200, records_returned: 50 } },
  { name: '2. Assignment example (500 + slow + 0 records)', input: { api_name: 'AppointmentAPI', response_time_ms: 5500, status_code: 500, records_returned: 0 } },
  { name: '3. Only slow', input: { api_name: 'BillingAPI', response_time_ms: 4000, status_code: 200, records_returned: 10 } },
  { name: '4. 200 OK but 0 records', input: { api_name: 'LabAPI', response_time_ms: 800, status_code: 200, records_returned: 0 } },
  { name: '5. 404 error', input: { api_name: 'PharmacyAPI', response_time_ms: 600, status_code: 404, records_returned: 0 } },
  { name: '6. Invalid data', input: { response_time_ms: 'fast', status_code: 'abc', records_returned: -5 } },
];

for (const c of cases) {
  console.log(`\n${c.name}`);
  console.log(JSON.stringify(detectAnomalies(c.input)));
}