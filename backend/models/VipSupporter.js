// models/VipSupporter.js
const mongoose = require('mongoose');

const vipSupporterSchema = new mongoose.Schema({
  wallet: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    minlength: 32,
    maxlength: 44,
    index: true // Index pour recherche rapide
  },
  smackedSeconds: {
    type: Number,
    required: true,
    min: 0,
    default: 0
  },
  totalClicks: {
    type: Number,
    required: true,
    min: 0,
    default: 0
  },
  totalSmackedSeconds: {
    type: Number,
    default: 0,
    min: 0
  },
  sessionId: {
    type: String,
    required: true,
    index: true
  },
  ipHash: {
    type: String,
    required: false, // Hash de l'IP pour anti-bot
  },
  userAgent: {
    type: String,
    required: false
  },
  registrationReward: {
    type: Number,
    required: true // Secondes gagnées lors de l'enregistrement
  },
  rank: {
    type: Number,
    default: null // Calculé dynamiquement
  },
  isVerified: {
    type: Boolean,
    default: true
  },
  isActive: {
    type: Boolean,
    default: true
  },
  metadata: {
    browser: String,
    platform: String,
    referrer: String
  }
}, {
  timestamps: true, // Ajoute createdAt et updatedAt automatiquement
  versionKey: false
});

// Index composé pour éviter les doublons wallet + session
vipSupporterSchema.index({ wallet: 1, sessionId: 1 }, { unique: true });

// Index pour le leaderboard (tri par total des secondes)
vipSupporterSchema.index({ totalSmackedSeconds: -1, createdAt: 1 });

// Méthodes du modèle
vipSupporterSchema.statics.getLeaderboard = async function(limit = 50) {
  return await this.find({ isActive: true })
    .sort({ totalSmackedSeconds: -1, createdAt: 1 })
    .limit(limit)
    .select('wallet totalSmackedSeconds smackedSeconds totalClicks createdAt')
    .lean();
};

vipSupporterSchema.statics.getTotalStats = async function() {
  const stats = await this.aggregate([
    { $match: { isActive: true } },
    {
      $group: {
        _id: null,
        totalSupporters: { $sum: 1 },
        totalSeconds: { $sum: '$totalSmackedSeconds' },
        totalClicks: { $sum: '$totalClicks' },
        avgSeconds: { $avg: '$totalSmackedSeconds' }
      }
    }
  ]);
  return stats[0] || {};
};

// Middleware pre-save pour calculer totalSmackedSeconds
vipSupporterSchema.pre('save', function(next) {
  if (this.isNew) {
    this.totalSmackedSeconds = this.smackedSeconds;
  }
  next();
});

// Méthode pour ajouter des secondes smackées
vipSupporterSchema.methods.addSmackedSeconds = async function(seconds, clicks = 0) {
  this.totalSmackedSeconds += seconds;
  this.totalClicks += clicks;
  return await this.save();
};

// Virtual pour wallet tronqué (sécurité)
vipSupporterSchema.virtual('walletTruncated').get(function() {
  return `${this.wallet.slice(0, 8)}...${this.wallet.slice(-8)}`;
});

module.exports = mongoose.model('VipSupporter', vipSupporterSchema);