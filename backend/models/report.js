// models/report.js
const mongoose = require('mongoose');

const reportSchema = new mongoose.Schema({
  chatRoom: { type: String, required: true },
  messageId: { type: String, required: true },
  reportedBy: { type: String, required: true },
  reportedUser: { type: String },
  reason: { type: String, required: true },
  date: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Report', reportSchema);
