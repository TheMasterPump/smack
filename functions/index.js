const functions = require('firebase-functions');
const admin = require('firebase-admin');
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const axios = require('axios');

// Initialiser Firebase Admin
admin.initializeApp();
const db = admin.firestore();

// Import des utilitaires Solana
const solanaWeb3 = require("@solana/web3.js");
const { PublicKey, Connection, LAMPORTS_PER_SOL } = solanaWeb3;
const nacl = require("tweetnacl");
const anchor = require('@project-serum/anchor');

// Constants for fee verification
const FEE_RECEIVER = "8hXGeqAkS2GezfSiCVjfNzqjobLmognqJsqyA75ZL79R";
const FEE_AMOUNT = 0.06 * LAMPORTS_PER_SOL;
const FEE_CONNECTION = new Connection("https://api.devnet.solana.com", "confirmed");

// TODO: Upload functionality will be added later

// Créer l'app Express
const app = express();

// Middleware
app.use(cors({ origin: true }));
app.use(helmet());
app.use(express.json({ limit: '1mb' }));

// Fee transaction verification function
async function verifyFeeTransaction(signature, userWalletPubkey) {
  console.log(`[FEE CHECK] Vérification fee tx ${signature} pour user ${userWalletPubkey}`);
  const tx = await FEE_CONNECTION.getTransaction(signature, { commitment: "confirmed" });
  if (!tx) throw new Error("Transaction introuvable !");
  if (tx.meta && tx.meta.err) throw new Error("Transaction failed!");

  // Extract addresses
  const keys = tx.transaction.message.accountKeys.map(k =>
    typeof k === "string" ? k : (k.toBase58 ? k.toBase58() : k.pubkey)
  );
  const fromIndex = keys.findIndex(k => k === userWalletPubkey);
  const toIndex = keys.findIndex(k => k === FEE_RECEIVER);
  if (fromIndex === -1 || toIndex === -1) throw new Error("Wallets not found in transaction!");

  const pre = tx.meta.preBalances;
  const post = tx.meta.postBalances;
  const sent = pre[fromIndex] - post[fromIndex];
  const received = post[toIndex] - pre[toIndex];

  // Accept if received ≥ 0.06 SOL (accounts for transaction fees)
  if (sent < FEE_AMOUNT || received < FEE_AMOUNT) {
    throw new Error(`Fee insuffisante: envoyé ${sent/LAMPORTS_PER_SOL} SOL, requis ${FEE_AMOUNT/LAMPORTS_PER_SOL} SOL`);
  }
  
  console.log(`✅ Fee validée: ${received/LAMPORTS_PER_SOL} SOL reçu`);
}

// Health check
app.get('/api/health', (req, res) => {
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
    console.log("\n======== [NEW TOKEN REQUEST] ========");
    console.log("[STEP 1] Données reçues pour token :", token);
    
    // Validation basique
    if (!token.name || !token.ticker || !token.description) {
      return res.status(400).json({ error: "Name, ticker and description are required" });
    }
    
    // Compatibility: use ticker as symbol for backend
    token.symbol = token.ticker;

    // 1️⃣ Vérifie la FEE AVANT d'enregistrer
    try {
      const { feeSignature, creatorWallet } = token;
      if (!feeSignature || !creatorWallet) {
        return res.status(400).json({ error: "Fee signature and creator wallet are required" });
      }
      console.log("[STEP 2] Vérification de la fee...");
      await verifyFeeTransaction(feeSignature, creatorWallet);
      console.log("[STEP 2] ✅ Fee validée !");
    } catch (e) {
      console.error("[FEE CHECK ERROR]", e);
      return res.status(400).json({ error: e.message || "Fee transaction not valid" });
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

// ========== UPLOAD ENDPOINTS ==========
app.post('/api/upload', async (req, res) => {
  try {
    console.log('📤 Upload endpoint called');
    
    const config = functions.config();
    if (!config.cloudflare || !config.cloudflare.api_key || !config.cloudflare.account_id) {
      console.error('❌ Missing Cloudflare credentials');
      return res.status(500).json({ 
        error: "Cloudflare credentials not configured",
        message: "Environment variables missing"
      });
    }

    // For now, handle base64 image data from request body
    const { imageData, fileName } = req.body;
    
    if (!imageData) {
      return res.status(400).json({ 
        error: "No image data provided",
        message: "Please provide imageData in the request body"
      });
    }

    // Convert base64 to buffer
    const buffer = Buffer.from(imageData.replace(/^data:image\/[a-z]+;base64,/, ''), 'base64');
    
    const FormData = require('form-data');
    const formData = new FormData();
    formData.append('file', buffer, fileName || 'token-image.png');

    console.log('🚀 Uploading to Cloudflare...');
    
    const response = await axios.post(
      `https://api.cloudflare.com/client/v4/accounts/${config.cloudflare.account_id}/images/v1`,
      formData,
      {
        headers: {
          'Authorization': `Bearer ${config.cloudflare.api_key}`,
          ...formData.getHeaders()
        }
      }
    );

    if (response.data.success) {
      const imageUrl = response.data.result.variants[0];
      console.log('✅ Image uploaded successfully:', imageUrl);
      
      res.json({
        success: true,
        imageUrl: imageUrl,
        message: "Image uploaded successfully to Cloudflare"
      });
    } else {
      console.error('❌ Cloudflare upload failed:', response.data);
      res.status(500).json({
        error: "Failed to upload image to Cloudflare",
        details: response.data.errors
      });
    }

  } catch (error) {
    console.error('❌ Upload error:', error);
    res.status(500).json({
      error: "Upload failed",
      message: error.message
    });
  }
});

// ========== AI IMAGE GENERATION ENDPOINT ==========
app.post('/api/generate-ai', async (req, res) => {
  try {
    console.log('🎨 AI image generation endpoint called');
    
    const config = functions.config();
    if (!config.openai || !config.openai.api_key) {
      console.error('❌ Missing OpenAI API key');
      return res.status(500).json({ 
        error: "OpenAI API key not configured",
        message: "Environment variables missing"
      });
    }

    const { prompt, name, ticker } = req.body;
    
    if (!prompt || !name || !ticker) {
      return res.status(400).json({ 
        error: "Missing required fields",
        message: "Please provide prompt, name, and ticker"
      });
    }

    const enhancedPrompt = `Create a meme token logo for "${name}" (${ticker}): ${prompt}. Make it colorful, fun, and suitable for cryptocurrency. Style should be modern and appealing.`;
    
    console.log('🚀 Generating AI image with OpenAI...');
    
    const openAIResponse = await axios.post(
      'https://api.openai.com/v1/images/generations',
      {
        model: "dall-e-3",
        prompt: enhancedPrompt,
        n: 1,
        size: "1024x1024",
        quality: "standard"
      },
      {
        headers: {
          'Authorization': `Bearer ${config.openai.api_key}`,
          'Content-Type': 'application/json'
        }
      }
    );

    if (openAIResponse.data.data && openAIResponse.data.data[0]) {
      const imageUrl = openAIResponse.data.data[0].url;
      console.log('✅ AI image generated successfully');
      
      // Download the image and upload to Cloudflare
      const imageResponse = await axios.get(imageUrl, { responseType: 'arraybuffer' });
      const imageBuffer = Buffer.from(imageResponse.data);
      
      const FormData = require('form-data');
      const formData = new FormData();
      formData.append('file', imageBuffer, `${ticker}-ai-generated.png`);

      console.log('📤 Uploading AI image to Cloudflare...');
      
      const cloudflareResponse = await axios.post(
        `https://api.cloudflare.com/client/v4/accounts/${config.cloudflare.account_id}/images/v1`,
        formData,
        {
          headers: {
            'Authorization': `Bearer ${config.cloudflare.api_key}`,
            ...formData.getHeaders()
          }
        }
      );

      if (cloudflareResponse.data.success) {
        const cloudflareUrl = cloudflareResponse.data.result.variants[0];
        console.log('✅ AI image uploaded to Cloudflare:', cloudflareUrl);
        
        res.json({
          success: true,
          imageUrl: cloudflareUrl,
          originalPrompt: enhancedPrompt,
          message: "AI image generated and uploaded successfully"
        });
      } else {
        console.error('❌ Cloudflare upload failed for AI image');
        res.json({
          success: true,
          imageUrl: imageUrl, // Return OpenAI URL as fallback
          message: "AI image generated successfully, but Cloudflare upload failed"
        });
      }
    } else {
      console.error('❌ OpenAI image generation failed:', openAIResponse.data);
      res.status(500).json({
        error: "Failed to generate AI image",
        details: openAIResponse.data
      });
    }

  } catch (error) {
    console.error('❌ AI generation error:', error);
    res.status(500).json({
      error: "AI image generation failed",
      message: error.message
    });
  }
});

// Endpoint de test simple pour debugger
app.post('/api/test-token', async (req, res) => {
  try {
    console.log('🧪 Test token creation:', req.body);
    
    const token = req.body;
    
    // Validation basique
    if (!token.name || !token.ticker || !token.description) {
      return res.status(400).json({ 
        success: false,
        error: "Name, ticker and description are required" 
      });
    }
    
    // Simulation d'une sauvegarde simple
    const testToken = {
      slug: token.slug || token.name.toLowerCase().replace(/[^a-z0-9]+/g, "-"),
      name: token.name,
      ticker: token.ticker,
      description: token.description,
      theme: token.theme || 'dark',
      createdAt: new Date().toISOString(),
      version: "test",
      status: "created_successfully"
    };
    
    console.log('✅ Test token created:', testToken);
    
    res.json({ 
      success: true, 
      token: testToken,
      message: "Test token created successfully!" 
    });
    
  } catch (e) {
    console.error("❌ Erreur test token:", e);
    res.status(500).json({ 
      success: false,
      error: e.message || "Test token creation failed" 
    });
  }
});

// Exporter l'app comme Firebase Function
exports.api = functions.https.onRequest(app);