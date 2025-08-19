// models/GlobalCounter.js
const mongoose = require('mongoose');

const globalCounterSchema = new mongoose.Schema({
  counterId: {
    type: String,
    required: true,
    unique: true,
    default: 'smack_global_counter'
  },
  totalClicks: {
    type: Number,
    required: true,
    default: 0,
    min: 0
  },
  totalTimeReduced: {
    type: Number,
    required: true,
    default: 0,
    min: 0
  },
  totalUsers: {
    type: Number,
    required: true,
    default: 0,
    min: 0
  },
  lastClickAt: {
    type: Date,
    default: Date.now
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true,
  versionKey: false
});

// Méthode statique pour incrémenter le compteur
globalCounterSchema.statics.incrementCounter = async function(timeReduced = 0, isNewUser = false) {
  const counter = await this.findOneAndUpdate(
    { counterId: 'smack_global_counter' },
    {
      $inc: { 
        totalClicks: 1,
        totalTimeReduced: timeReduced,
        totalUsers: isNewUser ? 1 : 0
      },
      $set: { 
        lastClickAt: new Date(),
        updatedAt: new Date()
      }
    },
    {
      upsert: true,
      new: true,
      runValidators: true
    }
  );
  return counter;
};

// Méthode statique pour récupérer le compteur
globalCounterSchema.statics.getGlobalCounter = async function() {
  const counter = await this.findOne({ counterId: 'smack_global_counter' });
  if (!counter) {
    // Créer le compteur s'il n'existe pas
    return await this.create({
      counterId: 'smack_global_counter',
      totalClicks: 0,
      totalTimeReduced: 0,
      totalUsers: 0
    });
  }
  return counter;
};

// Méthode statique pour obtenir les stats formatées
globalCounterSchema.statics.getFormattedStats = async function() {
  const counter = await this.getGlobalCounter();
  
  return {
    totalClicks: counter.totalClicks.toLocaleString(),
    totalTimeReduced: {
      minutes: Math.floor(counter.totalTimeReduced / 60),
      seconds: counter.totalTimeReduced % 60,
      formatted: `${Math.floor(counter.totalTimeReduced / 60)}m ${counter.totalTimeReduced % 60}s`
    },
    totalUsers: counter.totalUsers.toLocaleString(),
    lastClickAt: counter.lastClickAt
  };
};

module.exports = mongoose.model('GlobalCounter', globalCounterSchema);