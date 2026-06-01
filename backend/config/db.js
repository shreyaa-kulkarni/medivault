const mongoose = require('mongoose');

// Embedded schema — not a top-level collection
const documentSchema = new mongoose.Schema(
  {
    name:        { type: String, required: true, trim: true },
    mimeType:    { type: String, default: 'application/octet-stream' },
    size:        { type: Number, default: 0 },          // bytes
    description: { type: String, default: '' },
    base64Data:  { type: String, default: '' },         // full data-URL stored in DB
    uploadedBy:  { type: String, default: '' },         // uploader's display name
    uploadedAt:  { type: Date,   default: Date.now },
  },
  { _id: true }
);

module.exports = documentSchema;
