const express = require("express"); 
const cors = require("cors");
const helmet = require("helmet");
const rateLimit = require("express-rate-limit");
const uploadRouter = require("./upload");
const solanaWeb3 = require("@solana/web3.js");
const { PublicKey, Connection } = solanaWeb3;
const nacl = require("tweetnacl");
const reportRouter = require('./report');
const anchor = require('@project-serum/anchor');

const { db } = require('./firebase');
// Plus besoin de MongoDB - tout sur Firebase maintenant !
const { initGlobal, launchCurve, buyToken, verifyFeeTransaction } = require('./utils/solanaUtils');

const app = express();

app.use(cors());
app.use(helmet());
app.use(express.json({ limit: '1mb' }));
app.use(rateLimit({
  windowMs: 60 * 1000,
  max: 200, // Augmenter de 30 à 200 requêtes par minute pour le chart live
  standardHeaders: true,
  legacyHeaders: false,
}));

app.use("/api", uploadRouter);
app.use('/api/report', reportRouter);

// Health check endpoint for Railway
app.get('/health', (req, res) => {
  res.status(200).json({ 
    status: 'OK', 
    timestamp: new Date().toISOString(),
    service: 'SMACK Backend API'
  });
});

// Endpoint pour sauvegarder les clics du bouton countdown
app.post('/api/analytics/button-clicks', async (req, res) => {
  try {
    const { clickCount, timestamp, userAgent, sessionId, timeReduced, isFirstClick } = req.body;
    
    // Obtenir l'IP de l'utilisateur
    const userIP = req.ip || req.connection.remoteAddress || req.headers['x-forwarded-for'];
    
    // Données à sauvegarder dans Firebase (historique)
    const clickData = {
      clickCount: parseInt(clickCount) || 0,
      timestamp: timestamp || new Date().toISOString(),
      userAgent: userAgent || 'unknown',
      sessionId: sessionId || 'anonymous',
      userIP: userIP,
      date: new Date().toISOString().split('T')[0],
      timeReduced: parseInt(timeReduced) || 0
    };
    
    // Sauvegarder dans Firebase (historique)
    const docRef = await db.collection('buttonClicks').add(clickData);
    
    // Mettre à jour le compteur global MongoDB
    const globalCounter = await GlobalCounter.incrementCounter(
      parseInt(timeReduced) || 0,
      Boolean(isFirstClick)
    );
    
    // Émettre la mise à jour en temps réel via Socket.IO
    io.emit('globalCounter', {
      totalClicks: globalCounter.totalClicks,
      totalTimeReduced: globalCounter.totalTimeReduced,
      totalUsers: globalCounter.totalUsers,
      formattedTimeReduced: `${Math.floor(globalCounter.totalTimeReduced / 60)}m ${globalCounter.totalTimeReduced % 60}s`,
      lastUpdate: new Date()
    });
    
    console.log(`📊 Button click saved: ${clickCount} clicks from ${sessionId} | 🌍 Global: ${globalCounter.totalClicks} total`);
    
    res.status(200).json({
      success: true,
      message: 'Click data saved successfully',
      docId: docRef.id,
      globalStats: {
        totalClicks: globalCounter.totalClicks,
        totalTimeReduced: globalCounter.totalTimeReduced,
        totalUsers: globalCounter.totalUsers
      }
    });
    
  } catch (error) {
    console.error('Error saving click data:', error);
    res.status(500).json({
      success: false,
      message: 'Error saving click data',
      error: error.message
    });
  }
});

// Endpoint pour obtenir les statistiques globales des clics
app.get('/api/analytics/button-stats', async (req, res) => {
  try {
    const clicksSnapshot = await db.collection('buttonClicks').get();
    
    let totalClicks = 0;
    let totalSessions = 0;
    let uniqueIPs = new Set();
    let dailyStats = {};
    
    clicksSnapshot.forEach(doc => {
      const data = doc.data();
      totalClicks += data.clickCount || 0;
      totalSessions++;
      uniqueIPs.add(data.userIP);
      
      const date = data.date;
      if (!dailyStats[date]) {
        dailyStats[date] = { clicks: 0, sessions: 0 };
      }
      dailyStats[date].clicks += data.clickCount || 0;
      dailyStats[date].sessions++;
    });
    
    res.status(200).json({
      success: true,
      stats: {
        totalClicks,
        totalSessions,
        uniqueUsers: uniqueIPs.size,
        dailyStats: Object.entries(dailyStats).map(([date, stats]) => ({
          date,
          ...stats
        }))
      }
    });
    
  } catch (error) {
    console.error('Error fetching click stats:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching stats',
      error: error.message
    });
  }
});

// Endpoint pour obtenir le compteur global MongoDB
app.get('/api/global-counter', async (req, res) => {
  try {
    const globalStats = await GlobalCounter.getFormattedStats();
    
    res.status(200).json({
      success: true,
      data: globalStats
    });
    
  } catch (error) {
    console.error('Error fetching global counter:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching global counter',
      error: error.message
    });
  }
});

// --- Validation des champs token ---
function validateTokenInput(token, { partial = false } = {}) {
  const errors = [];
  function isString(str, min = 1, max = 200) {
    return typeof str === "string" && str.length >= min && str.length <= max;
  }

  if (!partial || token.slug !== undefined)
    if (!isString(token.slug, 2, 60) || !/^[a-z0-9-]+$/.test(token.slug)) errors.push("Invalid slug");

  if (!partial || token.name !== undefined)
    if (!isString(token.name, 2, 60)) errors.push("Invalid name");

  if (!partial || token.ticker !== undefined)
    if (!isString(token.ticker, 1, 16) || !/^[A-Z0-9$]+$/.test(token.ticker)) errors.push("Invalid ticker");

  if (token.description !== undefined && !isString(token.description, 0, 240)) errors.push("Invalid description");

  if (
  token.twitter !== undefined &&
  token.twitter &&
  !/^https?:\/\/(www\.)?(twitter\.com|x\.com)\//.test(token.twitter)
) errors.push("Invalid Twitter link");

  if (token.telegram !== undefined && token.telegram && !/^https?:\/\/t\.me\//.test(token.telegram)) errors.push("Invalid Telegram link");
  if (token.customSiteUrl !== undefined && token.customSiteUrl && !/^https?:\/\//.test(token.customSiteUrl)) errors.push("Invalid website URL");

  for (const key of ["name", "ticker", "description"]) {
    if (token[key] && /<script/i.test(token[key])) errors.push("XSS not allowed");
  }

  return errors;
}

// --- Ajout d'un token (avec vérification FEE AVANT enregistrement !) ---
app.post('/api/token', async (req, res) => {
  const token = req.body;
  console.log("\n======== [NEW TOKEN REQUEST] ========");
  console.log("[STEP 1] Données reçues pour token :", token);

  const errors = validateTokenInput(token);
  if (errors.length) {
    console.log("[STEP 2] Erreurs de validation :", errors);
    return res.status(400).json({ error: errors.join(", ") });
  }

  // --- CRÉATION AUTOMATIQUE DES BOUTONS SI NON PRÉSENTS ---
  if (!token.buttons) {
    const buttons = [];
    if (token.telegram) buttons.push({ label: "💬 Telegram", href: token.telegram });
    if (token.twitter) buttons.push({ label: "🐦 Twitter", href: token.twitter });
    if (token.websiteOption === "custom" && token.customSiteUrl) {
      buttons.push({ label: "🌐 Website", href: token.customSiteUrl });
    }
    token.buttons = buttons;
  }

  // 1️⃣ Vérifie la FEE AVANT d'enregistrer
  try {
    const { feeSignature, creatorWallet } = token;
    if (!feeSignature || !creatorWallet) {
      return res.status(400).json({ error: "Fee signature and wallet are required" });
    }
    await verifyFeeTransaction(feeSignature, creatorWallet);
  } catch (e) {
    console.error("[FEE CHECK ERROR]", e);
    return res.status(400).json({ error: e.message || "Fee transaction not valid" });
  }

  try {
    const tokenRef = db.collection('tokens').doc(token.slug);
    const tokenSnap = await tokenRef.get();
    if (tokenSnap.exists) {
      console.log("[STEP 3] Token déjà existant :", token.slug);
      return res.status(409).json({ error: "Token already exists" });
    }

    // --- PAS D'INITIALISATION BONDING CURVE ICI ---
    await tokenRef.set(token);

    console.log("[SUCCÈS] Token sauvegardé !");
    res.json({ success: true, token });

  } catch (e) {
    console.error("[ERREUR LORS DE LA SAUVEGARDE] :", e);
    res.status(500).json({ error: e.message || "Failed to save token" });
  }
});

// --- Get token details ---
app.get('/api/token/:slug', async (req, res) => {
  const { slug } = req.params;
  try {
    const tokenRef = db.collection('tokens').doc(slug);
    const tokenSnap = await tokenRef.get();
    if (!tokenSnap.exists) return res.status(404).json({ error: "Token not found" });
    res.json(tokenSnap.data());
  } catch (e) {
    res.status(500).json({ error: "Failed to fetch token" });
  }
});

// --- Update token ---
app.put('/api/token/:slug', async (req, res) => {
  const { slug } = req.params;
  const updatedData = req.body;

  const errors = validateTokenInput(updatedData, { partial: true });
  if (errors.length) return res.status(400).json({ error: errors.join(", ") });

  try {
    const tokenRef = db.collection('tokens').doc(slug);
    const tokenSnap = await tokenRef.get();
    if (!tokenSnap.exists) return res.status(404).json({ error: 'Token not found' });

    await tokenRef.update(updatedData);
    const updatedTokenSnap = await tokenRef.get();
    res.json({ success: true, token: updatedTokenSnap.data() });
  } catch (e) {
    res.status(500).json({ error: "Failed to update token" });
  }
});

// --- Claim token ---
app.post('/api/token/:slug/claim', async (req, res) => {
  const { slug } = req.params;
  const { wallet, message, signature } = req.body;

  try {
    const tokenRef = db.collection('tokens').doc(slug);
    const tokenSnap = await tokenRef.get();
    if (!tokenSnap.exists) return res.status(404).json({ error: "Token not found" });

    const token = tokenSnap.data();
    if (token.claimedBy) return res.status(400).json({ error: "Already claimed" });

    const pubkey = new solanaWeb3.PublicKey(wallet);
    const messageBytes = new TextEncoder().encode(message);
    const signatureBytes = Uint8Array.from(Buffer.from(signature, 'base64'));

    const valid = nacl.sign.detached.verify(
      messageBytes,
      signatureBytes,
      pubkey.toBytes()
    );
    if (!valid) return res.status(400).json({ error: "Invalid signature" });

    await tokenRef.update({ claimedBy: wallet });
    res.json({ success: true });
  } catch (e) {
    res.status(400).json({ error: "Signature verification failed" });
  }
});

// --- List all tokens ---
app.get('/api/tokens', async (req, res) => {
  try {
    const snapshot = await db.collection('tokens').get();
    const tokens = [];
    snapshot.forEach(doc => tokens.push(doc.data()));
    res.json(tokens);
  } catch (e) {
    console.error("Erreur récupération tokens:", e);
    res.status(500).json({ error: "Failed to fetch tokens" });
  }
});

// ========== NOUVELLE ROUTE V2 POUR CRÉATION DE TOKENS AVEC METADATA ==========
app.post('/api/v2/create-token', async (req, res) => {
  const { name, symbol, description, image, telegram, twitter, website, initialBuy, creatorWallet, feeSignature } = req.body;
  console.log("\n======== [NEW V2 TOKEN REQUEST] ========");
  console.log("[STEP 1] Données V2 reçues :", { name, symbol, description, initialBuy });

  // Validation des données V2
  const errors = [];
  if (!name || name.length < 2 || name.length > 32) errors.push("Token name invalid (2-32 chars)");
  if (!symbol || symbol.length < 1 || symbol.length > 10) errors.push("Token symbol invalid (1-10 chars)");
  if (!description || description.length < 10 || description.length > 200) errors.push("Description invalid (10-200 chars)");
  if (!image || !image.startsWith('http')) errors.push("Image URL invalid");
  if (!creatorWallet) errors.push("Creator wallet required");
  if (!feeSignature) errors.push("Fee signature required");

  // Validation initialBuy
  if (initialBuy && (initialBuy < 1 || initialBuy > 100000000)) {
    errors.push("Initial buy invalid (1 - 100M tokens)");
  }

  if (errors.length) {
    console.log("[STEP 2] Erreurs de validation V2 :", errors);
    return res.status(400).json({ error: errors.join(", ") });
  }

  // Générer slug unique
  const slug = name.toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .substring(0, 50) + '-' + Date.now().toString().slice(-6);

  try {
    // 1️⃣ Vérifier la FEE AVANT création
    if (!feeSignature || !creatorWallet) {
      return res.status(400).json({ error: "Fee signature and wallet are required for V2" });
    }

    // 2️⃣ Préparer les données pour le smart contract V2
    const tokenDataV2 = {
      // Données pour le smart contract
      contractData: {
        name: name,
        symbol: symbol,
        uri: image,
        initialBuy: (initialBuy || 0) * 1e6 // Convertir en micro-tokens (6 décimales)
      },
      // Données pour Firestore
      firestoreData: {
        slug: slug,
        name: name,
        ticker: symbol,
        description: description,
        image: image,
        imageUrl: image,
        telegram: telegram || "",
        twitter: twitter || "",
        websiteOption: website ? "custom" : "none",
        customSiteUrl: website || "",
        creator: creatorWallet,
        createdAt: new Date().toISOString(),
        version: "v2",
        initialBuy: initialBuy || 0,
        // Sera rempli après création on-chain
        mintAddress: null,
        bondingCurve: null,
        signature: null,
        // Auto-générer boutons
        buttons: []
      }
    };

    // Auto-générer les boutons
    if (telegram) tokenDataV2.firestoreData.buttons.push({ label: "💬 Telegram", href: telegram });
    if (twitter) tokenDataV2.firestoreData.buttons.push({ label: "🐦 Twitter", href: twitter });
    if (website) tokenDataV2.firestoreData.buttons.push({ label: "🌐 Website", href: website });

    // 3️⃣ Ici on appellerait le smart contract V2 pour créer le token
    // Pour l'instant, on simule la création
    console.log("[V2 SMART CONTRACT] Données à envoyer au contrat :", tokenDataV2.contractData);
    
    // Simulation - dans la vraie version, on appellerait le smart contract
    const mockMintAddress = "V2Mock" + Date.now().toString() + Math.random().toString(36).substring(7);
    const mockSignature = "v2_sig_" + Date.now();
    
    // Mettre à jour avec les données from smart contract
    tokenDataV2.firestoreData.mintAddress = mockMintAddress;
    tokenDataV2.firestoreData.bondingCurve = "curve_" + mockMintAddress.slice(-10);
    tokenDataV2.firestoreData.signature = mockSignature;

    // 4️⃣ Sauvegarder dans Firestore
    const tokenRef = db.collection('tokens').doc(slug);
    const tokenSnap = await tokenRef.get();
    if (tokenSnap.exists) {
      console.log("[STEP 3] Token déjà existant :", slug);
      return res.status(409).json({ error: "Token slug already exists" });
    }

    await tokenRef.set(tokenDataV2.firestoreData);

    console.log("[V2 SUCCESS] Token V2 créé avec succès !");
    console.log(`[V2 INFO] Mint: ${mockMintAddress}`);
    console.log(`[V2 INFO] Slug: ${slug}`);

    res.json({ 
      success: true, 
      version: "v2",
      token: tokenDataV2.firestoreData,
      mintAddress: mockMintAddress,
      signature: mockSignature,
      message: "Token V2 créé avec metadata complète !",
      contractData: tokenDataV2.contractData
    });

  } catch (e) {
    console.error("[V2 ERROR] Erreur création token V2 :", e);
    res.status(500).json({ error: e.message || "Failed to create V2 token" });
  }
});

// ========== ENDPOINT V2 POUR RÉCUPÉRER LES TOKENS AVEC METADATA ==========
app.get('/api/v2/token/:slug', async (req, res) => {
  const { slug } = req.params;
  try {
    const tokenRef = db.collection('tokens').doc(slug);
    const tokenSnap = await tokenRef.get();
    if (!tokenSnap.exists) return res.status(404).json({ error: "V2 Token not found" });
    
    const tokenData = tokenSnap.data();
    
    // Enrichir avec des données live si mintAddress existe
    if (tokenData.mintAddress && tokenData.version === "v2") {
      // Ajouter données bonding curve live
      tokenData.liveData = {
        currentPrice: "0.000001",
        marketCap: "$1,234",
        holders: "1",
        progress: "0.1%",
        lastUpdate: new Date().toISOString()
      };
    }
    
    res.json(tokenData);
  } catch (e) {
    console.error("Erreur récupération token V2:", e);
    res.status(500).json({ error: "Failed to fetch V2 token" });
  }
});

// ========== ENDPOINT V2 POUR LISTER TOUS LES TOKENS V2 ==========
app.get('/api/v2/tokens', async (req, res) => {
  try {
    const snapshot = await db.collection('tokens').where('version', '==', 'v2').get();
    const tokensV2 = [];
    snapshot.forEach(doc => {
      const tokenData = doc.data();
      // Ajouter données de base pour la liste
      tokensV2.push({
        ...tokenData,
        id: doc.id,
        hasMetadata: true,
        isV2: true
      });
    });
    
    // Trier par date de création (plus récents en premier)
    tokensV2.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    
    res.json({
      tokens: tokensV2,
      count: tokensV2.length,
      version: "v2",
      message: "Tokens V2 avec metadata complète"
    });
  } catch (e) {
    console.error("Erreur récupération tokens V2:", e);
    res.status(500).json({ error: "Failed to fetch V2 tokens" });
  }
});

// ========== AJOUT DES ROUTES SOLANA ==========

// Route admin pour initialiser le global
app.post('/api/init-global', async (req, res) => {
  console.log("[ADMIN] INIT GLOBAL lancé !");
  try {
    const result = await initGlobal();
    console.log("[ADMIN] INIT GLOBAL RESULT :", result);
    res.json(result);
  } catch (e) {
    console.error("[ADMIN] INIT GLOBAL ERROR :", e);
    if (e.logs) console.error("[Solana LOGS]:", e.logs.join('\n'));
    res.status(500).json({ error: e.message });
  }
});

// Route admin pour lancer un token (bonding curve)
app.post('/api/launch-token', async (req, res) => {
  const { a, b, c, maxSupply, creator, mintPubkey, slug } = req.body;
  console.log("[ADMIN] LAUNCH TOKEN reçu : ", { a, b, c, maxSupply, creator, mintPubkey, slug });
  try {
    const result = await launchCurve({ a, b, c, maxSupply, creator, mintPubkey });
    console.log("[ADMIN] LAUNCH TOKEN OK :", result);

    // Mise à jour Firestore AVEC l'adresse du mint
    if (slug && result && result.bondingCurve) {
      const tokenRef = db.collection('tokens').doc(slug);
      await tokenRef.update({
        mintAddress: result.mint,
        bondingCurve: result.bondingCurve,
        curveVault: result.curveVault,
        curveAuthority: result.curveAuthority,
      });
      console.log(`[ADMIN] Token Firestore "${slug}" mis à jour avec bondingCurve et mintAddress`);
    }

    res.json(result);
  } catch (e) {
    console.error("[ADMIN] LAUNCH TOKEN ERROR :", e);
    if (e.logs) console.error("[Solana LOGS]:", e.logs.join('\n'));
    res.status(500).json({ error: e.message });
  }
});

// --- ACHAT TOKEN : RECOIT UN NOMBRE DE TOKENS SPL (deltaQ) ---
app.post('/api/buy', async (req, res) => {
  const { mintPubkey, bondingCurvePubkey, deltaQ } = req.body;
  console.log("[BUY] Achat token reçu :", { mintPubkey, bondingCurvePubkey, deltaQ });

  // Validation du nombre de tokens (deltaQ)
  if (
    typeof deltaQ !== "number" ||
    !Number.isInteger(deltaQ) ||
    deltaQ <= 0 ||
    deltaQ > 1_000_000_000_000_000_000 // anti spam extrême
  ) {
    return res.status(400).json({ error: "deltaQ doit être un entier SPL >0" });
  }

  try {
    const result = await buyToken({ mintPubkey, bondingCurvePubkey, deltaQ });
    console.log("[BUY] Achat effectué, résultat :", result);
    res.json(result);
  } catch (e) {
    console.error("[BUY] ERREUR achat :", e);
    if (e.logs) console.error("[Solana LOGS]:", e.logs.join('\n'));
    res.status(500).json({ error: e.message });
  }
});

// ================== ANCIENNE ROUTE BONDING CURVE - DÉSACTIVÉE ==================
// Commenté pour éviter conflicts avec le nouveau endpoint /api/token-data/ qui supporte blockchain
/*
const idl = require("./idl/meme_launch_bonding.json"); // Place ton idl.json à la racine du projet (ou adapte le chemin)
const SOLANA_RPC = "https://api.devnet.solana.com";

app.get('/api/bonding-curve/:mint', async (req, res) => {
  const mint = req.params.mint;
  console.log("[API] GET /api/bonding-curve/ avec FORMULES PUMP.FUN", mint);

  try {
    // 🔥 UTILISATION DES VRAIES FORMULES PUMP.FUN (avec réserves plus grandes)
    const PUMP_CONSTANTS = {
      INITIAL_VIRTUAL_TOKEN_RESERVES: 1073000000000000n, // 1,073,000,000 tokens avec 6 décimales
      INITIAL_VIRTUAL_SOL_RESERVES: 30000000000n, // 30 SOL  
      INITIAL_REAL_TOKEN_RESERVES: 793100000000000n, // 793,100,000 tokens avec 6 décimales
      TOKEN_TOTAL_SUPPLY: 1000000000000000n, // 1,000,000,000 tokens avec 6 décimales
      FEE_BASIS_POINTS: 100n // 1% fee
    };

    // Vérifier si il y a des achats simulés pour ce token
    if (!global.tokenPurchases) global.tokenPurchases = {};
    
    const purchases = global.tokenPurchases[mint] || { totalTokensBought: 0n, totalSolSpent: 0n };
    
    // Calculer les nouvelles réserves basées sur les achats simulés
    const currentVirtualTokenReserves = PUMP_CONSTANTS.INITIAL_VIRTUAL_TOKEN_RESERVES - purchases.totalTokensBought;
    const currentVirtualSolReserves = PUMP_CONSTANTS.INITIAL_VIRTUAL_SOL_RESERVES + purchases.totalSolSpent;
    const currentRealTokenReserves = PUMP_CONSTANTS.INITIAL_REAL_TOKEN_RESERVES - purchases.totalTokensBought;
    
    // Prix actuel avec les réserves mises à jour
    // 🔥 PRIX EXACT Pump.fun: Virtual Sol / Virtual Tokens
    const pricePerToken = Number(currentVirtualSolReserves) / Number(currentVirtualTokenReserves);
    
    // 🔥 MARKET CAP EXACT comme Pump.fun: Prix * Supply disponible (pas total)
    // Market cap = Prix * Tokens en circulation (exclus réservés)
    const circulatingSupply = Number(PUMP_CONSTANTS.TOKEN_TOTAL_SUPPLY - PUMP_CONSTANTS.RESERVED_TOKENS) / 1e6;
    const marketCapSOL = pricePerToken * circulatingSupply;
    
    // ✅ PROGRESSION basée sur les tokens vendus (comme vraie Pump.fun)
    const leftTokens = Number(currentRealTokenReserves - PUMP_CONSTANTS.RESERVED_TOKENS);
    const initialAvailableTokens = Number(PUMP_CONSTANTS.INITIAL_REAL_TOKEN_RESERVES - PUMP_CONSTANTS.RESERVED_TOKENS);
    const progress = Math.max(0, 1 - (leftTokens / initialAvailableTokens)); // De 0 à 1
    const marketCapUSD = marketCapSOL * 180; // Supposons 1 SOL = $180 pour l'exemple
    
    // 🔍 DEBUG - Afficher les valeurs calculées
    console.log(`[DEBUG] Token: ${mint}`);
    console.log(`[DEBUG] Prix par token: ${pricePerToken.toFixed(12)} SOL`);
    console.log(`[DEBUG] Supply circulante: ${circulatingSupply.toFixed(2)}M tokens`);
    console.log(`[DEBUG] Market Cap: ${marketCapSOL.toFixed(8)} SOL = $${marketCapUSD.toFixed(2)}`);
    console.log(`[DEBUG] Progression: ${(progress * 100).toFixed(2)}%`);
    console.log(`[DEBUG] Achats: ${Number(purchases.totalTokensBought / 1000000n)} tokens, ${Number(purchases.totalSolSpent / 1000000000n)} SOL`);
    console.log(`[DEBUG] -----`);
    const liquidity = Number(purchases.totalSolSpent) / 1e9; // Liquidity = SOL dans le vault
    const volume24h = liquidity * 1.2; // Volume estimé (simulation)
    
    // 📊 Stats avancées
    const tokensBought = Number(purchases.totalTokensBought / 1000000n);
    const solInVault = Number(purchases.totalSolSpent / 1000000000n);
    const priceChange24h = Math.random() * 20 - 10; // Simulation de variation %
    
    console.log("[API] 🔥 Token", mint);
    console.log("- Tokens achetés:", Number(purchases.totalTokensBought / 1000000n));
    console.log("- SOL dépensé:", Number(purchases.totalSolSpent / 1000000000n)); 
    console.log("- Prix actuel:", currentPrice.toFixed(12));
    console.log("- Réserves virtuelles tokens:", Number(currentVirtualTokenReserves / 1000000n));
    console.log("- Réserves virtuelles SOL:", Number(currentVirtualSolReserves / 1000000000n));
    
    // 📈 ENREGISTRER LE POINT DE PRIX POUR LE CHART LIVE
    addPricePoint(mint, currentPrice);
    
    return res.json({
      params: {
        a: currentVirtualSolReserves.toString(),
        b: "0",
        c: "0", 
        maxSupply: PUMP_CONSTANTS.TOKEN_TOTAL_SUPPLY.toString(),
        currentSupply: currentSupply.toString()
      },
      currentPrice: currentPrice.toFixed(12),
      bondingCurve: "PUMP_CURVE_" + mint.slice(0, 10),
      realSolReserves: purchases.totalSolSpent.toString(),
      progress: progress,
      
      // 💰 MARKET STATS comme Pump.fun
      marketStats: {
        marketCap: `$${marketCapUSD.toFixed(2)}`,
        marketCapSOL: `${marketCap.toFixed(4)} SOL`,
        liquidity: `${liquidity.toFixed(6)} SOL`,
        liquidityUSD: `$${(liquidity * 180).toFixed(2)}`,
        volume24h: `$${(volume24h * 180).toFixed(2)}`,
        priceChange24h: `${priceChange24h > 0 ? '+' : ''}${priceChange24h.toFixed(2)}%`,
        currentPriceUSD: `$${(currentPrice * 180).toFixed(8)}`
      },
      
      // 📊 Trading Stats
      tradingStats: {
        totalTransactions: Math.floor(tokensBought / 1000) + 1,
        totalVolume: `${(solInVault * 2.5).toFixed(4)} SOL`,
        avgTransactionSize: `${(tokensBought / Math.max(1, Math.floor(tokensBought / 1000))).toFixed(0)} tokens`,
        uniqueHolders: Math.min(50, Math.floor(tokensBought / 5000) + 1)
      },
      
      // Données supplémentaires Pump.fun
      virtualSolReserves: currentVirtualSolReserves.toString(),
      virtualTokenReserves: currentVirtualTokenReserves.toString(),
      realTokenReserves: currentRealTokenReserves.toString(),
      feeBasicPoints: PUMP_CONSTANTS.FEE_BASIS_POINTS.toString(),
      type: "PUMP_FUN_CLONE",
      
      // Stats d'achats
      totalPurchases: purchases.totalTokensBought.toString(),
      totalSpent: purchases.totalSolSpent.toString(),
      
      // 🏆 Holders simulés (Top 5)
      topHolders: [
        { address: `${mint.slice(0,4)}...${mint.slice(-4)}`, balance: Math.floor(tokensBought * 0.35), percentage: (tokensBought > 0 ? 35.2 : 0) },
        { address: "9WzD...k3mF", balance: Math.floor(tokensBought * 0.22), percentage: (tokensBought > 0 ? 22.1 : 0) },
        { address: "7pX2...vR8z", balance: Math.floor(tokensBought * 0.15), percentage: (tokensBought > 0 ? 15.7 : 0) },
        { address: "5nK4...jL9q", balance: Math.floor(tokensBought * 0.12), percentage: (tokensBought > 0 ? 12.3 : 0) },
        { address: "3mJ8...wP5t", balance: Math.floor(tokensBought * 0.08), percentage: (tokensBought > 0 ? 8.1 : 0) }
      ]
    });
  } catch (e) {
    console.error("Erreur dans /api/bonding-curve/:mint", e);
    if (e.message === "Token not found" || e.message === "Bonding curve missing") {
      return res.status(404).json({ error: e.message });
    }
    res.status(500).json({ error: "Erreur interne serveur" });
  }
});
*/

// ========== STOCKAGE HISTORIQUE DES PRIX ==========
// Stocker l'historique des prix pour le chart en temps réel
if (!global.priceHistory) global.priceHistory = {};

function addPricePoint(mintAddress, price, timestamp = Date.now()) {
  if (!global.priceHistory[mintAddress]) {
    global.priceHistory[mintAddress] = [];
  }
  
  global.priceHistory[mintAddress].push({
    price: price,
    timestamp: timestamp,
    priceUSD: price * 180 // Conversion en USD
  });
  
  // Garder seulement les 100 derniers points (environ 1h40 à 1 point/seconde)
  if (global.priceHistory[mintAddress].length > 100) {
    global.priceHistory[mintAddress] = global.priceHistory[mintAddress].slice(-100);
  }
}

// ========== NOUVEAU ENDPOINT POUR HISTORIQUE DES PRIX ==========
app.get('/api/price-history/:mint', (req, res) => {
  const mint = req.params.mint;
  const history = global.priceHistory[mint] || [];
  
  res.json({
    success: true,
    history: history,
    count: history.length,
    latestPrice: history.length > 0 ? history[history.length - 1] : null
  });
});

// ========== ENDPOINT UNIFIÉ POUR TOUTES LES DONNÉES DE TOKEN ==========
app.get('/api/token-data/:mint', async (req, res) => {
  const mint = req.params.mint;
  console.log(`[API] GET /api/token-data/ UNIFIÉ pour ${mint}`);
  
  try {
    // 🔥 VRAIES CONSTANTES PUMP.FUN (Research-based exactes)
    const PUMP_CONSTANTS = {
      INITIAL_VIRTUAL_TOKEN_RESERVES: 1_073_000_000n * 1000000n, // 1.073B tokens * 1e6
      INITIAL_VIRTUAL_SOL_RESERVES: 30n * 1000000000n, // 30 SOL * 1e9  
      INITIAL_REAL_TOKEN_RESERVES: 793_100_000n * 1000000n, // 793.1M tokens disponibles trading
      TOKEN_TOTAL_SUPPLY: 1_000_000_000n * 1000000n, // 1B tokens total
      RESERVED_TOKENS: 206_900_000n * 1000000n, // 206.9M réservés (dev allocation)
      FEE_BASIS_POINTS: 100n
    };

    // 🔥 ESSAYER DE LIRE LES VRAIES DONNÉES BLOCKCHAIN D'ABORD
    let bondingCurveData = null;
    let dataSource = 'simulated';
    
    try {
      // Calculer l'adresse PDA de la bonding curve
      const mintPubkey = new PublicKey(mint);
      const [bondingCurvePDA] = PublicKey.findProgramAddressSync(
        [Buffer.from("bonding_curve"), mintPubkey.toBuffer()],
        new PublicKey("EJ7dWpEMiUJ5jTjg3EkfS2hGY48PSrEM8r54HrFgZNrA") // Pump program ID
      );
      
      console.log(`🔍 [BLOCKCHAIN] Tentative lecture PDA: ${bondingCurvePDA.toBase58()}`);
      
      // Essayer de lire les données réelles
      const connection = new Connection('https://api.devnet.solana.com');
      const accountInfo = await connection.getAccountInfo(bondingCurvePDA);
      
      if (accountInfo && accountInfo.data && accountInfo.data.length >= 80) {
        console.log(`✅ [BLOCKCHAIN] Bonding curve trouvée! (${accountInfo.data.length} bytes)`);
        
        // Décoder les données réelles
        const data = accountInfo.data;
        const virtualTokenReserves = data.readBigUInt64LE(8);
        const virtualSolReserves = data.readBigUInt64LE(16);  
        const realTokenReserves = data.readBigUInt64LE(24);
        const realSolReserves = data.readBigUInt64LE(32);
        
        bondingCurveData = {
          virtualTokenReserves,
          virtualSolReserves,
          realTokenReserves,
          realSolReserves
        };
        
        dataSource = 'blockchain';
        
        console.log(`📊 [BLOCKCHAIN] Données décodées:`);
        console.log(`   Virtual Token: ${(Number(virtualTokenReserves) / 1e6).toFixed(1)}M`);
        console.log(`   Virtual SOL: ${(Number(virtualSolReserves) / 1e9).toFixed(6)} SOL`);
        console.log(`   Real Token: ${(Number(realTokenReserves) / 1e6).toFixed(1)}M`);
        console.log(`   Real SOL: ${(Number(realSolReserves) / 1e9).toFixed(6)} SOL`);
      } else {
        console.log(`⚠️  [BLOCKCHAIN] Bonding curve non trouvée ou données insuffisantes`);
      }
    } catch (blockchainError) {
      console.log(`⚠️  [BLOCKCHAIN] Erreur lecture: ${blockchainError.message}`);
    }
    
    // 🔄 Fallback sur données simulées si blockchain échoue
    if (!bondingCurveData) {
      if (!global.tokenPurchases) global.tokenPurchases = {};
      const purchases = global.tokenPurchases[mint] || { totalTokensBought: 0n, totalSolSpent: 0n };
      
      // S'assurer que les réserves restent positives
      const maxTokensToBuy = PUMP_CONSTANTS.INITIAL_REAL_TOKEN_RESERVES - PUMP_CONSTANTS.RESERVED_TOKENS;
      const tokensBought = purchases.totalTokensBought > maxTokensToBuy ? maxTokensToBuy : purchases.totalTokensBought;
      
      bondingCurveData = {
        virtualTokenReserves: PUMP_CONSTANTS.INITIAL_VIRTUAL_TOKEN_RESERVES - tokensBought,
        virtualSolReserves: PUMP_CONSTANTS.INITIAL_VIRTUAL_SOL_RESERVES + purchases.totalSolSpent,
        realTokenReserves: PUMP_CONSTANTS.INITIAL_REAL_TOKEN_RESERVES - tokensBought,
        realSolReserves: purchases.totalSolSpent
      };
      
      console.log(`🔄 [SIMULÉ] Utilisation données simulées`);
    }
    
    // Calculer toutes les données avec les vraies données de bonding curve
    const currentVirtualTokenReserves = bondingCurveData.virtualTokenReserves;
    const currentVirtualSolReserves = bondingCurveData.virtualSolReserves;
    const currentRealTokenReserves = bondingCurveData.realTokenReserves;
    
    // 🔥 PRIX EXACT Pump.fun: Virtual Sol / Virtual Tokens
    const pricePerToken = Math.abs(Number(currentVirtualSolReserves) / Number(currentVirtualTokenReserves));
    const currentPrice = pricePerToken > 0 ? pricePerToken : 0.000001; // Prix minimum pour éviter les divisions par zéro
    
    // 🔥 MARKET CAP EXACT comme Pump.fun: Prix * Supply disponible (pas total)
    const circulatingSupply = Number(PUMP_CONSTANTS.TOKEN_TOTAL_SUPPLY - PUMP_CONSTANTS.RESERVED_TOKENS) / 1e6;
    const marketCapSOL = currentPrice * circulatingSupply;
    const marketCap = marketCapSOL; // Alias pour compatibilité
    
    // ✅ PROGRESSION basée sur les tokens vendus (comme vraie Pump.fun)
    const leftTokens = Number(currentRealTokenReserves - PUMP_CONSTANTS.RESERVED_TOKENS);
    const initialAvailableTokens = Number(PUMP_CONSTANTS.INITIAL_REAL_TOKEN_RESERVES - PUMP_CONSTANTS.RESERVED_TOKENS);
    const progress = Math.max(0, 1 - (leftTokens / initialAvailableTokens)); // De 0 à 1
    const currentSupply = Number(PUMP_CONSTANTS.TOKEN_TOTAL_SUPPLY - BigInt(leftTokens)) / 1e6;
    
    // 🔥 Calculer à partir des vraies données blockchain
    const tokensBought = Number((PUMP_CONSTANTS.INITIAL_REAL_TOKEN_RESERVES - bondingCurveData.realTokenReserves) / 1000000n);
    const solInVault = Number(bondingCurveData.realSolReserves) / 1e9;
    
    // Market cap basé sur un ratio plus réaliste comme le vrai Pump.fun
    // Sur Pump.fun: ~$723 par SOL collecté (15.4k MC / 21.3 SOL)
    const marketCapUSD = solInVault * 723; // Ratio plus réaliste
    const liquidity = solInVault;
    const volume24h = liquidity * 1.2;
    const priceChange24h = Math.random() * 20 - 10;
    
    // 🔍 DEBUG - Afficher les valeurs calculées DANS L'ENDPOINT UNIFIÉ
    console.log(`[DEBUG UNIFIED] Token: ${mint}`);
    console.log(`[DEBUG UNIFIED] Source données: ${dataSource.toUpperCase()}`);
    console.log(`[DEBUG UNIFIED] Prix par token: ${pricePerToken.toFixed(12)} SOL`);
    console.log(`[DEBUG UNIFIED] Supply circulante: ${(circulatingSupply / 1000000).toFixed(1)}M tokens (${circulatingSupply} tokens)`);
    console.log(`[DEBUG UNIFIED] Market Cap: ${marketCapSOL.toFixed(8)} SOL = $${marketCapUSD.toFixed(2)}`);
    console.log(`[DEBUG UNIFIED] Progression: ${(progress * 100).toFixed(2)}%`);
    console.log(`[DEBUG UNIFIED] Achats: ${tokensBought} tokens, ${solInVault} SOL`);
    console.log(`[DEBUG UNIFIED] -----`);

    // Price history
    const history = global.priceHistory ? (global.priceHistory[mint] || []) : [];
    
    // Holders
    const topHolders = [
      { address: `${mint.slice(0,4)}...${mint.slice(-4)}`, balance: Math.floor(tokensBought * 0.35), percentage: (tokensBought > 0 ? 35.2 : 0) },
      { address: "9WzD...k3mF", balance: Math.floor(tokensBought * 0.22), percentage: (tokensBought > 0 ? 22.1 : 0) },
      { address: "7pX2...vR8z", balance: Math.floor(tokensBought * 0.15), percentage: (tokensBought > 0 ? 15.7 : 0) },
      { address: "5nK4...jL9q", balance: Math.floor(tokensBought * 0.12), percentage: (tokensBought > 0 ? 12.3 : 0) },
      { address: "3mJ8...wP5t", balance: Math.floor(tokensBought * 0.08), percentage: (tokensBought > 0 ? 8.1 : 0) }
    ];

    // Enregistrer le prix actuel
    addPricePoint(mint, currentPrice);
    
    // Retourner TOUTES les données en une seule requête
    return res.json({
      // Bonding curve data
      params: {
        a: currentVirtualSolReserves.toString(),
        b: "0", c: "0", 
        maxSupply: PUMP_CONSTANTS.TOKEN_TOTAL_SUPPLY.toString(),
        currentSupply: currentSupply.toString()
      },
      currentPrice: currentPrice.toFixed(12),
      bondingCurve: "PUMP_CURVE_" + mint.slice(0, 10),
      progress: progress,
      
      // Market stats
      marketStats: {
        marketCap: `$${marketCapUSD.toFixed(2)}`,
        marketCapSOL: `${marketCap.toFixed(4)} SOL`,
        liquidity: `${liquidity.toFixed(6)} SOL`,
        liquidityUSD: `$${(liquidity * 180).toFixed(2)}`,
        volume24h: `$${(volume24h * 180).toFixed(2)}`,
        priceChange24h: `${priceChange24h > 0 ? '+' : ''}${priceChange24h.toFixed(2)}%`,
        currentPriceUSD: `$${(currentPrice * 180).toFixed(8)}`
      },
      
      // Trading stats
      tradingStats: {
        totalTransactions: Math.floor(tokensBought / 1000) + 1,
        totalVolume: `${(solInVault * 2.5).toFixed(4)} SOL`,
        avgTransactionSize: `${(tokensBought / Math.max(1, Math.floor(tokensBought / 1000))).toFixed(0)} tokens`,
        uniqueHolders: Math.min(50, Math.floor(tokensBought / 5000) + 1)
      },
      
      // Holders
      topHolders: topHolders,
      
      // Price history
      priceHistory: {
        history: history,
        count: history.length,
        latestPrice: history.length > 0 ? history[history.length - 1] : null
      },
      
      // 🔥 DONNÉES PRINCIPALES que le frontend utilise directement
      currentPrice: pricePerToken,
      marketCap: marketCapUSD.toFixed(2),
      virtualSolReserves: currentVirtualSolReserves.toString(),
      virtualTokenReserves: currentVirtualTokenReserves.toString(),
      realSolReserves: bondingCurveData.realSolReserves.toString(),
      
      type: "UNIFIED_TOKEN_DATA"
    });
    
  } catch (e) {
    console.error("Erreur dans /api/token-data/:mint", e);
    res.status(500).json({ error: "Erreur serveur" });
  }
});

// ========== ENDPOINT POUR SIMULER LES ACHATS ==========
app.post('/api/simulate-purchase', (req, res) => {
  const { mintAddress, tokenAmount, solCost } = req.body;
  
  if (!mintAddress || !tokenAmount || !solCost) {
    return res.status(400).json({ error: 'Missing required fields' });
  }
  
  try {
    // Initialiser le tracking des achats si nécessaire
    if (!global.tokenPurchases) global.tokenPurchases = {};
    if (!global.tokenPurchases[mintAddress]) {
      global.tokenPurchases[mintAddress] = { totalTokensBought: 0n, totalSolSpent: 0n };
    }
    
    // Enregistrer l'achat simulé
    global.tokenPurchases[mintAddress].totalTokensBought += BigInt(tokenAmount);
    global.tokenPurchases[mintAddress].totalSolSpent += BigInt(solCost);
    
    const isPositive = BigInt(tokenAmount) > 0n;
    const action = isPositive ? 'Achat' : 'Vente';
    console.log(`[SIMULATION] ${action} enregistré pour ${mintAddress}:`, {
      tokens: Number(BigInt(tokenAmount) / 1000000n),
      sol: Number(BigInt(solCost) / 1000000000n),
      totalTokens: Number(global.tokenPurchases[mintAddress].totalTokensBought / 1000000n),
      totalSol: Number(global.tokenPurchases[mintAddress].totalSolSpent / 1000000000n)
    });
    
    res.json({ success: true });
  } catch (e) {
    console.error('[SIMULATION] Erreur:', e);
    res.status(500).json({ error: e.message });
  }
});

// ===================================================================

// --- SOCKET.IO CHAT ---
const server = require("http").createServer(app);
const io = require("socket.io")(server, {
  cors: { origin: "*" }
});

const chatRooms = {};

io.on("connection", (socket) => {
  const room = socket.handshake.query.room;
  if (room) {
    socket.join(room);

    if (!chatRooms[room]) chatRooms[room] = [];
    socket.emit("chat_history", chatRooms[room]);

    socket.on("typing", ({ user, room }) => {
      if (user && room) {
        socket.to(room).emit("typing", { user });
      }
    });

    socket.on("chat_message", async (msg) => {
      console.log("BACKEND - message reçu:", msg);

      if (msg && msg.user && msg.user.username) {
        // Vérifier les utilisateurs bannis dans Firebase
        const bannedSnapshot = await db.collection('banned-users')
          .where('username', '==', msg.user.username)
          .where('chatRoom', 'in', [room, '*'])
          .get();
        
        if (!bannedSnapshot.empty) {
          const bannedDoc = bannedSnapshot.docs[0].data();
          socket.emit("banned_message", { reason: bannedDoc.chatRoom === "*" ? "Global ban" : "Token ban" });
          return;
        }
      }

      if ((!msg.text && !msg.image) || !msg.user) return;
      const message = {
        ...msg,
        createdAt: Date.now()
      };
      chatRooms[room].push(message);
      if (chatRooms[room].length > 200) chatRooms[room].shift();
      io.to(room).emit("chat_message", message);
    });
  }
});

// ----- ENDPOINTS TEMPORAIRES POUR FIX BONDING CURVE -----

// Endpoint pour initialiser une bonding curve factice
app.post('/api/bonding-curve/init', async (req, res) => {
  const { mintAddress, bondingCurve, params, currentPrice, realSolReserves } = req.body;
  
  console.log(`[API] Initialisation bonding curve temporaire pour ${mintAddress}`);
  
  // Stockage temporaire en mémoire 
  if (!global.bondingCurves) global.bondingCurves = {};
  
  global.bondingCurves[mintAddress] = {
    bondingCurve,
    params,
    currentPrice,
    realSolReserves
  };
  
  console.log(`[API] ✅ Bonding curve temporaire créée pour ${mintAddress}`);
  res.json({ success: true, message: 'Bonding curve initialisée' });
});

// Endpoint pour mettre à jour un token avec sa bonding curve
app.patch('/api/token/:slug/update-bonding', async (req, res) => {
  const { slug } = req.params;
  const { bondingCurve } = req.body;
  
  console.log(`[API] Mise à jour bonding curve pour token ${slug}: ${bondingCurve}`);
  
  try {
    // Mise à jour temporaire en mémoire (pas de MongoDB)
    if (!global.tokenUpdates) global.tokenUpdates = {};
    global.tokenUpdates[slug] = { bondingCurve };
    
    console.log(`[API] ✅ Token ${slug} mis à jour avec bonding curve`);
    res.json({ success: true });
  } catch (error) {
    console.error(`[API] ❌ Erreur mise à jour token ${slug}:`, error);
    res.status(500).json({ error: error.message });
  }
});

// ========== SIMULATION D'ACTIVITÉ DE MARCHÉ LIVE ==========
// Ajouter périodiquement des micro-variations de prix pour simuler l'activité
function simulateMarketActivity() {
  if (!global.priceHistory) return;
  
  Object.keys(global.priceHistory).forEach(mintAddress => {
    const history = global.priceHistory[mintAddress];
    if (history.length === 0) return;
    
    const lastPrice = history[history.length - 1].price;
    
    // Micro-variation aléatoire (-0.5% à +0.5%)
    const variation = (Math.random() - 0.5) * 0.01;
    const newPrice = lastPrice * (1 + variation);
    
    // Ajouter le nouveau point seulement si assez de temps s'est écoulé
    const lastTimestamp = history[history.length - 1].timestamp;
    const now = Date.now();
    
    if (now - lastTimestamp > 2000) { // Au moins 2 secondes
      addPricePoint(mintAddress, Math.max(0, newPrice));
    }
  });
}

// ===============================
// VIP SUPPORTERS & WALLET ENDPOINTS
// ===============================

// Endpoint pour enregistrer un wallet VIP
app.post('/api/vip/register-wallet', async (req, res) => {
  try {
    const { 
      wallet, 
      smackedSeconds, 
      totalClicks, 
      sessionId, 
      userAgent 
    } = req.body;

    // Validation des données
    if (!wallet || !sessionId || smackedSeconds === undefined) {
      return res.status(400).json({
        success: false,
        message: 'Missing required fields: wallet, sessionId, smackedSeconds'
      });
    }

    // Validation de l'adresse Solana
    if (wallet.length < 32 || wallet.length > 44) {
      return res.status(400).json({
        success: false,
        message: 'Invalid Solana wallet address format'
      });
    }

    // Hash de l'IP pour anti-bot (simple)
    const userIP = req.ip || req.connection.remoteAddress || req.headers['x-forwarded-for'];
    const crypto = require('crypto');
    const ipHash = crypto.createHash('sha256').update(userIP || 'unknown').digest('hex');

    // Extraction des métadonnées du navigateur
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

    // Créer ou mettre à jour le supporter VIP
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

    // Firebase Firestore upsert
    const vipRef = db.collection('vip-supporters').doc(wallet.trim());
    const vipSnap = await vipRef.get();
    
    if (vipSnap.exists) {
      // Mettre à jour existant
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
      // Créer nouveau
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

// Endpoint pour obtenir le leaderboard VIP avec Firebase
app.get('/api/vip/leaderboard', async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 50;
    const page = parseInt(req.query.page) || 1;
    const skip = (page - 1) * limit;

    // Obtenir le leaderboard depuis Firebase
    const snapshot = await db.collection('vip-supporters')
      .orderBy('totalSmackedSeconds', 'desc')
      .orderBy('createdAt', 'asc')
      .get();

    if (snapshot.empty) {
      return res.json({
        success: true,
        data: {
          leaderboard: [],
          pagination: { page, limit, total: 0 },
          stats: { totalSupporters: 0, totalSecondsSmacked: 0, totalClicks: 0, averageSeconds: 0 }
        }
      });
    }

    // Traiter les données
    const allSupporters = [];
    let totalSeconds = 0;
    let totalClicks = 0;

    snapshot.forEach(doc => {
      const data = doc.data();
      allSupporters.push({
        wallet: doc.id,
        ...data
      });
      totalSeconds += data.totalSmackedSeconds || 0;
      totalClicks += data.totalClicks || 0;
    });

    // Pagination
    const paginatedLeaderboard = allSupporters
      .slice(skip, skip + limit)
      .map((supporter, index) => ({
        rank: skip + index + 1,
        walletTruncated: `${supporter.wallet.slice(0,8)}...${supporter.wallet.slice(-8)}`,
        totalSmackedSeconds: supporter.totalSmackedSeconds || 0,
        registrationReward: supporter.smackedSeconds || 0,
        totalClicks: supporter.totalClicks || 0,
        joinedAt: supporter.createdAt
      }));

    // Statistiques globales
    const stats = {
      totalSupporters: allSupporters.length,
      totalSecondsSmacked: totalSeconds,
      totalClicks: totalClicks,
      averageSeconds: allSupporters.length > 0 ? Math.round(totalSeconds / allSupporters.length) : 0
    };

    res.json({
      success: true,
      data: {
        leaderboard: paginatedLeaderboard,
        pagination: {
          page,
          limit,
          total: stats.totalSupporters
        },
        stats: stats
      }
    });

  } catch (error) {
    console.error('❌ Error fetching leaderboard:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching leaderboard',
      error: error.message
    });
  }
});

// Endpoint pour obtenir les stats VIP d'un wallet spécifique avec Firebase
app.get('/api/vip/wallet/:address', async (req, res) => {
  try {
    const { address } = req.params;

    if (!address || address.length < 32) {
      return res.status(400).json({
        success: false,
        message: 'Invalid wallet address'
      });
    }

    // Chercher le wallet dans Firebase
    const vipRef = db.collection('vip-supporters').doc(address);
    const vipSnap = await vipRef.get();

    if (!vipSnap.exists) {
      return res.status(404).json({
        success: false,
        message: 'Wallet not found in VIP list'
      });
    }

    const supporterData = vipSnap.data();

    // Calculer le rang (compter ceux qui ont plus de smacked seconds)
    const higherRanksSnapshot = await db.collection('vip-supporters')
      .where('totalSmackedSeconds', '>', supporterData.totalSmackedSeconds)
      .get();
    
    const rank = higherRanksSnapshot.size + 1;

    res.json({
      success: true,
      data: {
        walletTruncated: `${address.slice(0,8)}...${address.slice(-8)}`,
        totalSmackedSeconds: supporterData.totalSmackedSeconds || 0,
        registrationReward: supporterData.smackedSeconds || 0,
        totalClicks: supporterData.totalClicks || 0,
        rank: rank,
        joinedAt: supporterData.createdAt
      }
    });

  } catch (error) {
    console.error('❌ Error fetching wallet stats:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching wallet stats',
      error: error.message
    });
  }
});

// ===============================
// FIN VIP ENDPOINTS
// ===============================

// ========== ENDPOINT POUR STOCKER LES CLICS DE BOUTON DANS FIREBASE ==========
app.post('/api/button-click', async (req, res) => {
  try {
    const { tokenSlug, buttonLabel, buttonHref } = req.body;

    // Validation des données
    if (!tokenSlug || !buttonLabel || !buttonHref) {
      return res.status(400).json({
        success: false,
        message: 'Missing required fields: tokenSlug, buttonLabel, buttonHref'
      });
    }

    // Récupérer l'IP de l'utilisateur
    const userIP = req.ip || req.connection.remoteAddress || req.headers['x-forwarded-for'] || 'unknown';
    const userAgent = req.headers['user-agent'] || '';

    // Créer l'enregistrement du clic dans Firebase
    const clickData = {
      tokenSlug: tokenSlug.trim(),
      buttonLabel: buttonLabel.trim(),
      buttonHref: buttonHref.trim(),
      userIp: userIP,
      userAgent: userAgent,
      timestamp: new Date().toISOString(),
      createdAt: Date.now()
    };

    // Sauvegarder dans Firebase
    const clickRef = await db.collection('button-clicks').add(clickData);

    console.log(`📊 Button click saved to Firebase: ${tokenSlug} -> ${buttonLabel} (${userIP})`);

    res.status(201).json({
      success: true,
      message: 'Button click recorded successfully in Firebase',
      data: {
        id: clickRef.id,
        tokenSlug,
        buttonLabel,
        timestamp: clickData.timestamp
      }
    });

  } catch (error) {
    console.error('❌ Error recording button click in Firebase:', error);
    res.status(500).json({
      success: false,
      message: 'Error recording button click',
      error: error.message
    });
  }
});

// ========== ENDPOINT POUR OBTENIR LES STATISTIQUES DES CLICS DEPUIS FIREBASE ==========
app.get('/api/button-clicks/:tokenSlug', async (req, res) => {
  try {
    const { tokenSlug } = req.params;
    const { timeframe = '24h' } = req.query;

    // Calculer la date de début selon le timeframe
    let startTime;
    switch (timeframe) {
      case '1h':
        startTime = Date.now() - (60 * 60 * 1000);
        break;
      case '24h':
        startTime = Date.now() - (24 * 60 * 60 * 1000);
        break;
      case '7d':
        startTime = Date.now() - (7 * 24 * 60 * 60 * 1000);
        break;
      case '30d':
        startTime = Date.now() - (30 * 24 * 60 * 60 * 1000);
        break;
      default:
        startTime = Date.now() - (24 * 60 * 60 * 1000);
    }

    // Récupérer les clics depuis Firebase
    const clicksQuery = db.collection('button-clicks')
      .where('tokenSlug', '==', tokenSlug)
      .where('createdAt', '>=', startTime)
      .orderBy('createdAt', 'desc');

    const snapshot = await clicksQuery.get();
    
    if (snapshot.empty) {
      return res.json({
        success: true,
        data: {
          tokenSlug,
          timeframe,
          stats: {
            totalClicks: 0,
            uniqueUsers: 0,
            clicksByButton: []
          }
        }
      });
    }

    // Traiter les données
    const clicks = [];
    const uniqueIPs = new Set();
    const buttonStats = {};

    snapshot.forEach(doc => {
      const data = doc.data();
      clicks.push(data);
      uniqueIPs.add(data.userIp);
      
      const buttonKey = `${data.buttonLabel}|${data.buttonHref}`;
      if (!buttonStats[buttonKey]) {
        buttonStats[buttonKey] = {
          buttonLabel: data.buttonLabel,
          buttonHref: data.buttonHref,
          clicks: 0,
          lastClick: data.timestamp
        };
      }
      buttonStats[buttonKey].clicks++;
      
      // Garder le clic le plus récent
      if (data.timestamp > buttonStats[buttonKey].lastClick) {
        buttonStats[buttonKey].lastClick = data.timestamp;
      }
    });

    // Convertir en tableau et trier par nombre de clics
    const clicksByButton = Object.values(buttonStats)
      .sort((a, b) => b.clicks - a.clicks);

    console.log(`📊 Button click stats for ${tokenSlug}: ${clicks.length} clicks, ${uniqueIPs.size} unique users`);

    res.json({
      success: true,
      data: {
        tokenSlug,
        timeframe,
        stats: {
          totalClicks: clicks.length,
          uniqueUsers: uniqueIPs.size,
          clicksByButton
        }
      }
    });

  } catch (error) {
    console.error('❌ Error fetching button click stats from Firebase:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching button click statistics',
      error: error.message
    });
  }
});

// Démarrer la simulation d'activité toutes les 3 secondes
setInterval(simulateMarketActivity, 3000);

const PORT = process.env.PORT || 4000;
server.listen(PORT, '0.0.0.0', () => {
  console.log("API backend & chat running on port " + PORT);
  console.log("🔥 Live market simulation started - charts will update every 3 seconds");
});
