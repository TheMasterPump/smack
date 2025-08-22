const express = require('express');
const router = express.Router();
const { db } = require('./firebase'); // utilise Firebase au lieu de MongoDB

// AJOUT : import du middleware d'auth par wallet
const authWallet = require('./authWallet');

// AJOUT : import du sanitizer !
const { sanitizeString } = require('./utils/sanitize');

// POST /api/report
router.post('/', async (req, res) => {
  try {
    // On SANITIZE chaque champ utilisateur :
    const messageId = sanitizeString(req.body.messageId, 80);
    const reason = sanitizeString(req.body.reason, 200);
    const reportedBy = sanitizeString(req.body.reportedBy, 40);
    const chatRoom = sanitizeString(req.body.chatRoom, 40);
    const reportedUser = sanitizeString(req.body.reportedUser, 40);

    const report = new Report({ messageId, reason, reportedBy, chatRoom, reportedUser });
    await report.save();
    res.status(201).json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// GET /api/report
router.get('/', async (req, res) => {
  try {
    const reports = await Report.find().sort({ date: -1 });
    res.json(reports);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/report/ban (PROTÉGÉ PAR WALLET ADMIN !)
router.post('/ban', authWallet, async (req, res) => {
  try {
    // On SANITIZE les champs utilisés pour le ban :
    const username = sanitizeString(req.body.username, 40);
    const chatRoom = sanitizeString(req.body.chatRoom, 40);
    const type = sanitizeString(req.body.type, 20);

    if (!username || !chatRoom) return res.status(400).json({ error: "Missing username or chatRoom" });

    // Check if already banned pour ce chatRoom (ou global si chatRoom === '*')
    const exists = await BannedUser.findOne({ username, chatRoom, type: type || 'chat' });
    if (exists) return res.status(200).json({ alreadyBanned: true });

    await BannedUser.create({ username, chatRoom, type: type || 'chat' });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
