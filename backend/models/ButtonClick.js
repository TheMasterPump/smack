const mongoose = require('mongoose');

const buttonClickSchema = new mongoose.Schema({
  tokenSlug: {
    type: String,
    required: true,
    index: true
  },
  buttonLabel: {
    type: String,
    required: true
  },
  buttonHref: {
    type: String,
    required: true
  },
  userIp: {
    type: String,
    required: true
  },
  userAgent: {
    type: String,
    default: ''
  },
  timestamp: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

// Index pour optimiser les requêtes par token et date
buttonClickSchema.index({ tokenSlug: 1, timestamp: -1 });

module.exports = mongoose.model('ButtonClick', buttonClickSchema);