const BASE = process.env.BASE_URL || 'http://localhost:3000';

async function call(label, path, options = {}) {
  try {
    const res = await fetch(BASE + path, options);
    const text = await res.text();
    console.log(`\n${label}\n  -> ${res.status} ${text.slice(0, 160)}`);
  } catch (err) {
    console.log(`\n${label}\n  -> request failed: ${err.message}`);
  }
}

const postJson = (body) => ({
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body,
});

(async () => {
  await call('1. Broken JSON body (expect 400)', '/monitor', postJson('{"api_name": '));
  await call('2. Empty array (expect 400)', '/monitor', postJson('[]'));
  await call('3. Body not sent as JSON (expect 400)', '/monitor', {
    method: 'POST',
    headers: { 'Content-Type': 'text/plain' },
    body: 'hello',
  });
  await call(
    '4. 101 items, over the batch limit (expect 400)',
    '/monitor',
    postJson(JSON.stringify(Array.from({ length: 101 }, () => ({}))))
  );
  await call('5. Bad status filter (expect 400)', '/alerts?status=banana');
  await call('6. Bad severity filter (expect 400)', '/alerts?severity=urgent');
  await call('7. Repeated query param (expect 400)', '/alerts?status=active&status=resolved');
  await call('8. Malformed alert id (expect 400)', '/alerts/123/resolve', { method: 'PATCH' });
  await call('9. Valid id format but not found (expect 404)', '/alerts/000000000000000000000000/resolve', {
    method: 'PATCH',
  });
  await call('10. Unknown route (expect 404)', '/does-not-exist');
  await call('11. Normal request still works (expect 200)', '/alerts?limit=1');
})();