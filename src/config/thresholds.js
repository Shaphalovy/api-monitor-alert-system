// Detection rules. Change values here, no need to touch detection logic.
module.exports = {
  responseTime: {
    warnMs: 3000,      // slower than this = anomaly (medium)
    criticalMs: 10000, // slower than this = anomaly (high)
  },
  minRecords: 1, // fewer records than this = anomaly
};