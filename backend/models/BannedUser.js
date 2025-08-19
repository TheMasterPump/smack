const mongoose = require('mongoose');

const bannedUserSchema = new mongoose.Schema({
  username: { type: String, required: true },
  chatRoom: { type: String, required: true }, // '*' pour global ban
  date: { type: Date, default: Date.now }
});

module.exports = mongoose.model('BannedUser', bannedUserSchema);
