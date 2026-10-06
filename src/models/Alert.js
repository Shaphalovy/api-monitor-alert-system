const mongoose = require('mongoose');

const ANOMALY_TYPES = ['HIGH_RESPONSE_TIME', 'FAILED_REQUEST', 'NO_RECORDS', 'INVALID_DATA'];

const alertSchema = new mongoose.Schema(
  {
    apiName: { type: String, required: true, index: true },

    // Optional: missing when the input itself was invalid
    statusCode: { type: Number },
    responseTimeMs: { type: Number },
    recordsReturned: { type: Number },

    anomalyTypes: {
      type: [{ type: String, enum: ANOMALY_TYPES }],
      validate: {
        validator: (v) => Array.isArray(v) && v.length > 0,
        message: 'At least one anomaly type is required',
      },
    },
    severity: {
      type: String,
      enum: ['low', 'medium', 'high', 'critical'],
      required: true,
    },

    message: { type: String, required: true },
    aiGenerated: { type: Boolean, default: false },

    status: { type: String, enum: ['active', 'resolved'], default: 'active' },
    resolvedAt: { type: Date },

    rawInput: { type: String, maxlength: 2000 },
  },
  { timestamps: true }
);

alertSchema.index({ status: 1, createdAt: -1 });

module.exports = mongoose.model('Alert', alertSchema);