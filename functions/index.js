const functions = require('firebase-functions');
const admin = require('firebase-admin');
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');

// Initialiser Firebase Admin
admin.initializeApp();
const db = admin.firestore();

// Import des utilitaires Solana
const solanaWeb3 = require("@solana/web3.js");
const { PublicKey, Connection } = solanaWeb3;
const nacl = require("tweetnacl");
const anchor = require('@project-serum/anchor');

// Créer l'app Express
const app = express();

// Middleware
app.use(cors({ origin: true }));
app.use(helmet());
app.use(express.json({ limit: '1mb' }));

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'Firebase Functions OK', timestamp: new Date().toISOString() });
});

// ========== ENDPOINTS VIP ==========
app.post('/api/vip/register-wallet', async (req, res) => {
  try {
    const { 
      wallet, 
      smackedSeconds, 
      totalClicks, 
      sessionId, 
      userAgent 
    } = req.body;

    if (!wallet || !sessionId || smackedSeconds === undefined) {
      return res.status(400).json({
        success: false,
        message: 'Missing required fields: wallet, sessionId, smackedSeconds'
      });
    }

    if (wallet.length < 32 || wallet.length > 44) {
      return res.status(400).json({
        success: false,
        message: 'Invalid Solana wallet address format'
      });
    }

    const userIP = req.ip || req.headers['x-forwarded-for'] || 'unknown';
    const crypto = require('crypto');
    const ipHash = crypto.createHash('sha256').update(userIP).digest('hex');

    const userAgentData = userAgent || req.headers['user-agent'] || '';
    const metadata = {
      browser: userAgentData.includes('Chrome') ? 'Chrome' : 
               userAgentData.includes('Firefox') ? 'Firefox' : 
               userAgentData.includes('Safari') ? 'Safari' : 'Other',
      platform: userAgentData.includes('Windows') ? 'Windows' :
                 userAgentData.includes('Mac') ? 'Mac' :
                 userAgentData.includes('Linux') ? 'Linux' : 'Other',
      referrer: req.headers.referer || 'direct'
    };

    const vipData = {
      wallet: wallet.trim(),
      smackedSeconds: parseInt(smackedSeconds) || 0,
      totalClicks: parseInt(totalClicks) || 0,
      sessionId: sessionId,
      ipHash: ipHash,
      userAgent: userAgentData,
      registrationReward: parseInt(smackedSeconds) || 0,
      metadata: metadata
    };

    const vipRef = db.collection('vip-supporters').doc(wallet.trim());
    const vipSnap = await vipRef.get();
    
    if (vipSnap.exists) {
      const existingData = vipSnap.data();
      const updatedData = {
        ...vipData,
        totalSmackedSeconds: (existingData.totalSmackedSeconds || 0) + parseInt(smackedSeconds),
        updatedAt: new Date().toISOString()
      };
      await vipRef.update(updatedData);
      
      console.log(`📝 VIP wallet updated: ${wallet.slice(0,8)}...${wallet.slice(-8)} (+${smackedSeconds}s)`);
      
      res.status(200).json({
        success: true,
        message: 'Wallet successfully updated in VIP list!',
        data: {
          walletTruncated: `${wallet.slice(0,8)}...${wallet.slice(-8)}`,
          smackedSeconds: updatedData.smackedSeconds,
          totalSmackedSeconds: updatedData.totalSmackedSeconds,
          rank: null,
          registeredAt: existingData.createdAt || new Date().toISOString()
        }
      });
    } else {
      const newVipData = {
        ...vipData,
        totalSmackedSeconds: parseInt(smackedSeconds),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
      await vipRef.set(newVipData);
      
      console.log(`📝 VIP wallet registered: ${wallet.slice(0,8)}...${wallet.slice(-8)} (+${smackedSeconds}s)`);
      
      res.status(201).json({
        success: true,
        message: 'Wallet successfully registered in VIP list!',
        data: {
          walletTruncated: `${wallet.slice(0,8)}...${wallet.slice(-8)}`,
          smackedSeconds: newVipData.smackedSeconds,
          totalSmackedSeconds: newVipData.totalSmackedSeconds,
          rank: null,
          registeredAt: newVipData.createdAt
        }
      });
    }

  } catch (error) {
    console.error('❌ Error registering VIP wallet:', error);
    res.status(500).json({
      success: false,
      message: 'Error registering wallet',
      error: error.message
    });
  }
});

// ========== ENDPOINT BUTTON CLICKS ==========
app.post('/api/button-click', async (req, res) => {
  try {
    const { tokenSlug, buttonLabel, buttonHref } = req.body;

    if (!tokenSlug || !buttonLabel || !buttonHref) {
      return res.status(400).json({
        success: false,
        message: 'Missing required fields: tokenSlug, buttonLabel, buttonHref'
      });
    }

    const userIP = req.ip || req.headers['x-forwarded-for'] || 'unknown';
    const userAgent = req.headers['user-agent'] || '';

    const clickData = {
      tokenSlug: tokenSlug.trim(),
      buttonLabel: buttonLabel.trim(),
      buttonHref: buttonHref.trim(),
      userIp: userIP,
      userAgent: userAgent,
      timestamp: new Date().toISOString(),
      createdAt: Date.now()
    };

    const clickRef = await db.collection('button-clicks').add(clickData);

    console.log(`📊 Button click saved: ${tokenSlug} -> ${buttonLabel} (${userIP})`);

    res.status(201).json({
      success: true,
      message: 'Button click recorded successfully',
      data: {
        id: clickRef.id,
        tokenSlug,
        buttonLabel,
        timestamp: clickData.timestamp
      }
    });

  } catch (error) {
    console.error('❌ Error recording button click:', error);
    res.status(500).json({
      success: false,
      message: 'Error recording button click',
      error: error.message
    });
  }
});

// ========== GLOBAL SMACK COUNTER ==========
app.post('/api/smack', async (req, res) => {
  try {
    const { timeReduced, sessionId, userAgent } = req.body;

    if (timeReduced === undefined || !sessionId) {
      return res.status(400).json({
        success: false,
        message: 'Missing required fields: timeReduced, sessionId'
      });
    }

    const userIP = req.ip || req.headers['x-forwarded-for'] || 'unknown';
    const crypto = require('crypto');
    const ipHash = crypto.createHash('sha256').update(userIP).digest('hex');

    const smackData = {
      timeReduced: parseInt(timeReduced) || 0,
      sessionId: sessionId,
      ipHash: ipHash,
      userAgent: userAgent || req.headers['user-agent'] || '',
      timestamp: new Date().toISOString(),
      createdAt: Date.now()
    };

    // Enregistrer le SMACK individuel
    const smackRef = await db.collection('smacks').add(smackData);

    // Mettre à jour le compteur global
    const globalRef = db.collection('global-stats').doc('smack-counter');
    const globalSnap = await globalRef.get();

    if (globalSnap.exists) {
      const current = globalSnap.data();
      await globalRef.update({
        totalClicks: (current.totalClicks || 0) + 1,
        totalTimeReduced: (current.totalTimeReduced || 0) + parseInt(timeReduced),
        lastUpdated: new Date().toISOString()
      });
    } else {
      await globalRef.set({
        totalClicks: 1,
        totalTimeReduced: parseInt(timeReduced),
        createdAt: new Date().toISOString(),
        lastUpdated: new Date().toISOString()
      });
    }

    // Récupérer les stats mises à jour
    const updatedGlobal = await globalRef.get();
    const globalData = updatedGlobal.data();

    console.log(`⚡ SMACK recorded: +${timeReduced}s (Total: ${globalData.totalClicks} clicks, ${globalData.totalTimeReduced}s)`);

    res.status(201).json({
      success: true,
      message: 'SMACK recorded successfully',
      data: {
        id: smackRef.id,
        timeReduced: parseInt(timeReduced),
        globalStats: {
          totalClicks: globalData.totalClicks,
          totalTimeReduced: globalData.totalTimeReduced,
          formattedTimeReduced: formatTime(globalData.totalTimeReduced)
        }
      }
    });

  } catch (error) {
    console.error('❌ Error recording SMACK:', error);
    res.status(500).json({
      success: false,
      message: 'Error recording SMACK',
      error: error.message
    });
  }
});

app.get('/api/global-counter', async (req, res) => {
  try {
    const globalRef = db.collection('global-stats').doc('smack-counter');
    const globalSnap = await globalRef.get();

    if (globalSnap.exists) {
      const globalData = globalSnap.data();
      res.json({
        success: true,
        globalStats: {
          totalClicks: globalData.totalClicks || 0,
          totalTimeReduced: globalData.totalTimeReduced || 0,
          formattedTimeReduced: formatTime(globalData.totalTimeReduced || 0)
        }
      });
    } else {
      res.json({
        success: true,
        globalStats: {
          totalClicks: 0,
          totalTimeReduced: 0,
          formattedTimeReduced: "0m 0s"
        }
      });
    }

  } catch (error) {
    console.error('❌ Error getting global counter:', error);
    res.status(500).json({
      success: false,
      message: 'Error getting global counter',
      error: error.message
    });
  }
});

// Fonction utilitaire pour formater le temps
function formatTime(seconds) {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const remainingSeconds = seconds % 60;

  if (hours > 0) {
    return `${hours}h ${minutes}m ${remainingSeconds}s`;
  } else if (minutes > 0) {
    return `${minutes}m ${remainingSeconds}s`;
  } else {
    return `${remainingSeconds}s`;
  }
}

// ========== TOKEN ENDPOINTS ==========
app.post('/api/token', async (req, res) => {
  try {
    const token = req.body;
    
    // Validation basique
    if (!token.name || !token.symbol || !token.description) {
      return res.status(400).json({ error: "Name, symbol and description are required" });
    }

    // Auto-générer les boutons sociaux
    if (!token.buttons) {
      const buttons = [];
      if (token.telegram) buttons.push({ label: "💬 Telegram", href: token.telegram });
      if (token.twitter) buttons.push({ label: "🐦 Twitter", href: token.twitter });
      if (token.websiteOption === "custom" && token.customSiteUrl) {
        buttons.push({ label: "🌐 Website", href: token.customSiteUrl });
      }
      token.buttons = buttons;
    }

    // TODO: Vérification des frais Solana ici si nécessaire

    const tokenRef = db.collection('tokens').doc(token.slug);
    const tokenSnap = await tokenRef.get();
    
    if (tokenSnap.exists) {
      console.log("Token déjà existant :", token.slug);
      return res.status(409).json({ error: "Token slug already exists" });
    }

    // Ajouter metadata Firebase
    token.createdAt = new Date().toISOString();
    token.version = "firebase";
    
    await tokenRef.set(token);

    console.log("✅ Token créé avec succès :", token.slug);
    res.json({ 
      success: true, 
      token: token,
      message: "Token created successfully on Firebase!" 
    });

  } catch (e) {
    console.error("❌ Erreur création token :", e);
    res.status(500).json({ error: e.message || "Failed to create token" });
  }
});

// Exporter l'app comme Firebase Function
exports.api = functions.https.onRequest(app);