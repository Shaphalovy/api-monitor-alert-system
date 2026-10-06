# Intelligent API Monitoring & Alert System

A Node.js backend that checks API health data, detects anomalies with simple rules, asks an LLM (Google Gemini) to write a human-readable alert, stores the alert in MongoDB, and shows everything on a small web dashboard.

## How it works

```
POST /monitor  ->  validate  ->  detect anomalies (rules)  ->  Gemini writes alert text
                                                         \->  fallback template if AI fails
                                  ->  save to MongoDB  ->  GET /alerts  ->  dashboard
```

- **Detection is rule-based, not AI.** Rules are fast, free and always give the same answer. The AI only turns the detected facts into a readable message.
- **If Gemini fails** (quota, network, timeout), the alert is still created with a template message and `aiGenerated: false`.
- **Patient data is never sent to the AI.** Only the API name, status code, response time and record count are used in the prompt.

## Requirements

- Node.js 20.19 or newer
- A free MongoDB Atlas cluster (or any MongoDB connection string)
- A Gemini API key from https://aistudio.google.com/apikey

## Setup

```bash
git clone <your-repo-url>
cd api-monitor-alert-system
npm install
```

Create your env file (Windows: `copy .env.example .env`, macOS/Linux: `cp .env.example .env`), then fill in the values:

| Variable | Required | Description |
|---|---|---|
| `MONGODB_URI` | yes | MongoDB connection string. Use database name `api_monitor`. |
| `GEMINI_API_KEY` | no* | Gemini key. *Without it, alerts use the template message. |
| `GEMINI_MODEL` | no | Default `gemini-3.5-flash-lite`. |
| `PORT` | no | Default `3000`. |
| `DNS_SERVERS` | no | e.g. `8.8.8.8,1.1.1.1`. Workaround for a Node.js SRV DNS issue on some Windows setups (`querySrv ECONNREFUSED`). |
| `MAX_BATCH_SIZE` | no | Max items per `/monitor` request. Default `100`. |
| `AI_CONCURRENCY` | no | Max parallel Gemini calls. Default `3`. |

In MongoDB Atlas, add your IP under **Network Access** and create a database user.

## Run

```bash
npm run dev     # development, restarts on file changes
npm start       # normal start
```

Open http://localhost:3000 for the dashboard.

## API

### `POST /monitor`
Send one API response object or an array of them.

```bash
curl -X POST http://localhost:3000/monitor \
  -H "Content-Type: application/json" \
  -d '[
    {"api_name":"PatientDataAPI","response_time_ms":1200,"status_code":200,"records_returned":50},
    {"api_name":"AppointmentAPI","response_time_ms":5500,"status_code":500,"records_returned":0}
  ]'
```

Returns `201` if at least one alert was created (otherwise `200`) with a summary: `processed`, `healthy`, `alertsCreated`, `failed`, `durationMs` and a result per item. A ready-made file is in `data/sample-input.json`. Analysis can take a few seconds because each alert is written by the AI model.

### `GET /alerts`
Returns alerts, newest first. Default: active alerts only.

| Query | Values |
|---|---|
| `status` | `active` (default), `resolved`, `all` |
| `severity` | `low`, `medium`, `high`, `critical` |
| `apiName` | exact API name |
| `limit` | 1-500, default 100 |

### `PATCH /alerts/:id/resolve`
Marks an alert as resolved.

### `GET /health`
Simple liveness check.

Errors return JSON like `{"error":"..."}` with `400` (bad input), `404` (not found) or `500` (server error, details only in the logs).

## Detection rules

Thresholds are in `src/config/thresholds.js`.

| Anomaly | Condition | Severity |
|---|---|---|
| `HIGH_RESPONSE_TIME` | over 3000 ms | medium (high above 10000 ms) |
| `FAILED_REQUEST` | status code 400 or higher | high (critical for 500+) |
| `NO_RECORDS` | fewer than 1 record | high |
| `INVALID_DATA` | missing or wrong-typed fields | high |

One input can trigger several anomalies. The alert gets the highest severity.

The 3000 ms / 10000 ms thresholds are reasonable defaults chosen for this project, not values from the brief. Tune them to real traffic.

## Project structure

```
src/
  server.js, app.js          startup and Express setup
  config/                    db connection, logger (Winston), thresholds
  routes/ controllers/       HTTP layer
  services/
    anomalyDetector.js       rules and input validation
    alertGenerator.js        Gemini call, timeout, fallback template
    monitorService.js        batch processing, saves alerts
  models/Alert.js            Mongoose schema
  middleware/errorHandler.js
  utils/                     HttpError, concurrency helper
public/                      dashboard (plain HTML/CSS/JS)
scripts/                     small test scripts
data/sample-input.json
logs/                        runtime logs (git-ignored)
```

## Handling many APIs

- Items in a batch are processed independently: one failure does not stop the rest.
- Gemini calls run with limited concurrency (default 3) to stay inside rate limits.
- Each Gemini call has a 15 second timeout, then the fallback message is used.
- Batch size is capped (default 100).

## Testing

```bash
node scripts/test-detector.js          # detection rules, no server needed
node scripts/test-alert-generator.js   # AI messages (add --no-ai for fallback only)
node scripts/test-errors.js            # error handling, server must be running
```

## Known limitations

- Repeating the same failing input creates duplicate active alerts (no deduplication).
- `/monitor` has no authentication or rate limiting.
- Email reports (optional in the brief) are not implemented.
- The AI may suggest a "likely cause". Treat it as a hint, not a fact.
- No automated test framework, only the scripts above.