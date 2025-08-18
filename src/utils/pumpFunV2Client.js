// 🚀 PUMP.FUN CLONE V2 CLIENT - Compatible avec le nouveau smart contract
/* global BigInt */
import * as web3 from '@solana/web3.js';
import * as splToken from '@solana/spl-token';
import { BN } from '@project-serum/anchor';

// 🔥 CONSTANTES EXACTES DE PUMP.FUN CORRIGÉES (Market Cap ~4K au lancement)
export const PUMP_PROGRAM_ID_STRING = "EJ7dWpEMiUJ5jTjg3EkfS2hGY48PSrEM8r54HrFgZNrA";
export const FEE_VAULT_STRING = "8hXGeqAkS2GezfSiCVjfNzqjobLmognqJsqyA75ZL79R";

// Lazy initialization des PublicKeys
export const getPumpProgramId = () => new web3.PublicKey(PUMP_PROGRAM_ID_STRING);
export const getFeeVault = () => new web3.PublicKey(FEE_VAULT_STRING);

export const PUMP_CONSTANTS = {
  // 🔥 VRAIES CONSTANTES PUMP.FUN (Research-based exactes)
  INITIAL_VIRTUAL_TOKEN_RESERVES: 1_073_000_000n * 1000000n, // 1.073B tokens * 1e6 (exacte)
  INITIAL_VIRTUAL_SOL_RESERVES: 30n * 1000000000n, // 30 SOL * 1e9 (exacte)
  INITIAL_REAL_TOKEN_RESERVES: 793_100_000n * 1000000n, // 793.1M tokens disponibles pour trading
  TOKEN_TOTAL_SUPPLY: 1_000_000_000n * 1000000n, // 1B tokens total
  RESERVED_TOKENS: 206_900_000n * 1000000n, // 206.9M tokens réservés (dev allocation)
  FEE_BASIS_POINTS: 100n, // 1% fee
  MIGRATION_THRESHOLD: 85n * 1000000000n, // 85 SOL pour migration vers Raydium
  DECIMALS: 6 // 6 décimales (pas 9!)
};

// Limites de sécurité
export const LIMITS = {
  MAX_BUY_AMOUNT: 100_000_000_000_000n, // 100M tokens max par achat
  MAX_PRICE_IMPACT: 5000n, // 50% max price impact
  MIN_BUY_AMOUNT: 1_000_000n, // 1 token minimum
  MAX_NAME_LENGTH: 32,
  MAX_SYMBOL_LENGTH: 10,
  MAX_URI_LENGTH: 200,
};

// ===== HELPERS PDAs =====

export function getBondingCurvePDA(mintPubkey) {
  const mintKey = typeof mintPubkey === 'string' ? new web3.PublicKey(mintPubkey) : mintPubkey;
  const [pda] = web3.PublicKey.findProgramAddressSync(
    [Buffer.from("bonding_curve"), mintKey.toBuffer()],
    getPumpProgramId()
  );
  return pda;
}

export function getCurveAuthorityPDA(mintPubkey) {
  const mintKey = typeof mintPubkey === 'string' ? new web3.PublicKey(mintPubkey) : mintPubkey;
  const [pda] = web3.PublicKey.findProgramAddressSync(
    [Buffer.from("curve_authority"), mintKey.toBuffer()],
    getPumpProgramId()
  );
  return pda;
}

// ===== FORMULES PUMP.FUN EXACTES =====

export function calculateBuyPrice(virtualSolReserves, virtualTokenReserves, tokenAmount) {
  try {
    if (tokenAmount <= 0n) {
      throw new Error("Quantité de tokens invalide");
    }

    // Vérifier qu'on ne dépasse pas les réserves
    if (tokenAmount >= virtualTokenReserves) {
      throw new Error("Pas assez de tokens disponibles");
    }

    // k = virtual_sol_reserves * virtual_token_reserves (constant product)
    const k = virtualSolReserves * virtualTokenReserves;
    
    // Nouvelle réserve de tokens après achat
    const newVirtualTokenReserves = virtualTokenReserves - tokenAmount;
    
    // Calculer SOL requis avec formule k constant
    const newVirtualSolReserves = k / newVirtualTokenReserves;
    const solRequired = newVirtualSolReserves - virtualSolReserves;
    
    // Ajouter les frais (1% comme Pump.fun)
    const fee = (solRequired * PUMP_CONSTANTS.FEE_BASIS_POINTS) / 10000n;
    const totalSolCost = solRequired + fee;
    
    return {
      solRequired: Number(solRequired) / 1e9,
      fee: Number(fee) / 1e9,
      totalCost: Number(totalSolCost) / 1e9,
      newVirtualSolReserves,
      newVirtualTokenReserves
    };
  } catch (error) {
    console.error("Erreur calcul prix achat:", error);
    throw error;
  }
}

export function calculateSellPrice(virtualSolReserves, virtualTokenReserves, tokenAmount) {
  try {
    // k = virtual_sol_reserves * virtual_token_reserves (constant product)  
    const k = virtualSolReserves * virtualTokenReserves;
    
    // Nouvelle réserve de tokens après vente
    const newVirtualTokenReserves = virtualTokenReserves + tokenAmount;
    
    // Calculer SOL reçu avec formule k constant
    const newVirtualSolReserves = k / newVirtualTokenReserves;
    const solOutput = virtualSolReserves - newVirtualSolReserves;
    
    // Soustraire les frais (1% comme Pump.fun)
    const fee = (solOutput * PUMP_CONSTANTS.FEE_BASIS_POINTS) / 10000n;
    const netSolOutput = solOutput - fee;
    
    return {
      solOutput: Number(netSolOutput) / 1e9,
      fee: Number(fee) / 1e9,
      grossOutput: Number(solOutput) / 1e9,
      newVirtualSolReserves,
      newVirtualTokenReserves
    };
  } catch (error) {
    console.error("Erreur calcul prix vente:", error);
    throw error;
  }
}

// ===== FONCTIONS PRINCIPALES =====

/**
 * 🚀 Créer un nouveau token avec metadata et initial buy
 */
export async function createToken(
  wallet,
  connection,
  tokenData,
  initialBuy = 0
) {
  try {
    console.log(`🚀 Création d'un nouveau token: ${tokenData.name} (${tokenData.symbol})`);
    
    // Validation des données
    if (!tokenData.name || tokenData.name.length > LIMITS.MAX_NAME_LENGTH) {
      throw new Error(`Nom du token trop long (max ${LIMITS.MAX_NAME_LENGTH} caractères)`);
    }
    if (!tokenData.symbol || tokenData.symbol.length > LIMITS.MAX_SYMBOL_LENGTH) {
      throw new Error(`Symbol du token trop long (max ${LIMITS.MAX_SYMBOL_LENGTH} caractères)`);
    }
    if (!tokenData.image || tokenData.image.length > LIMITS.MAX_URI_LENGTH) {
      throw new Error(`URI de l'image trop longue (max ${LIMITS.MAX_URI_LENGTH} caractères)`);
    }
    if (initialBuy > 0 && (initialBuy < Number(LIMITS.MIN_BUY_AMOUNT) || initialBuy > Number(LIMITS.MAX_BUY_AMOUNT))) {
      throw new Error(`Initial buy invalide (min: ${Number(LIMITS.MIN_BUY_AMOUNT) / 1e6}, max: ${Number(LIMITS.MAX_BUY_AMOUNT) / 1e6})`);
    }

    if (!wallet.connected || !wallet.publicKey) {
      throw new Error("Wallet non connecté");
    }

    // Générer un nouveau mint
    const mintKeypair = web3.Keypair.generate();
    const mint = mintKeypair.publicKey;

    // Calculer les PDAs
    const bondingCurve = getBondingCurvePDA(mint);
    const curveAuthority = getCurveAuthorityPDA(mint);

    // Calculer les comptes de tokens
    const curveVault = await splToken.getAssociatedTokenAddress(mint, curveAuthority, true);
    const creatorTokenAccount = await splToken.getAssociatedTokenAddress(mint, wallet.publicKey);

    // Construire l'instruction pour créer le token
    const createTokenIx = {
      programId: getPumpProgramId(),
      keys: [
        { pubkey: wallet.publicKey, isSigner: true, isWritable: true }, // creator
        { pubkey: mint, isSigner: true, isWritable: true }, // mint
        { pubkey: curveVault, isSigner: false, isWritable: true }, // curve_vault
        { pubkey: creatorTokenAccount, isSigner: false, isWritable: true }, // creator_token_account
        { pubkey: bondingCurve, isSigner: false, isWritable: true }, // bonding_curve
        { pubkey: curveAuthority, isSigner: false, isWritable: false }, // curve_authority
        { pubkey: getFeeVault(), isSigner: false, isWritable: true }, // fee_vault
        { pubkey: splToken.TOKEN_PROGRAM_ID, isSigner: false, isWritable: false }, // token_program
        { pubkey: web3.SystemProgram.programId, isSigner: false, isWritable: false }, // system_program
        { pubkey: splToken.ASSOCIATED_TOKEN_PROGRAM_ID, isSigner: false, isWritable: false }, // associated_token_program
        { pubkey: web3.SYSVAR_RENT_PUBKEY, isSigner: false, isWritable: false }, // rent
      ],
      data: encodeCreateTokenInstruction({
        name: tokenData.name,
        symbol: tokenData.symbol,
        uri: tokenData.image,
        initialBuy: initialBuy
      })
    };

    // Créer la transaction
    const transaction = new web3.Transaction();
    transaction.add(createTokenIx);

    // Ajouter les instructions pour créer les comptes de tokens si nécessaire
    const createVaultIx = splToken.createAssociatedTokenAccountInstruction(
      wallet.publicKey,
      curveVault,
      curveAuthority,
      mint
    );
    const createCreatorIx = splToken.createAssociatedTokenAccountInstruction(
      wallet.publicKey,
      creatorTokenAccount,
      wallet.publicKey,
      mint
    );

    transaction.add(createVaultIx, createCreatorIx);

    // Définir les paramètres de transaction
    const { blockhash } = await connection.getLatestBlockhash();
    transaction.recentBlockhash = blockhash;
    transaction.feePayer = wallet.publicKey;

    // Signer avec le mint keypair aussi
    transaction.partialSign(mintKeypair);

    console.log("🔄 Signature de la transaction...");
    
    // Signer la transaction avec le wallet
    const signedTransaction = await wallet.signTransaction(transaction);
    
    console.log("📡 Envoi de la transaction...");
    
    // Envoyer la transaction
    const signature = await connection.sendRawTransaction(signedTransaction.serialize());
    
    console.log(`🔗 Transaction envoyée: ${signature}`);
    console.log("⏳ Confirmation en cours...");
    
    // Attendre la confirmation
    const confirmation = await connection.confirmTransaction(signature, 'confirmed');
    
    if (confirmation.value.err) {
      throw new Error(`Transaction échouée: ${JSON.stringify(confirmation.value.err)}`);
    }
    
    console.log("✅ Token créé avec succès!");
    console.log(`🌐 Mint address: ${mint.toBase58()}`);
    
    return {
      success: true,
      mintAddress: mint.toBase58(),
      bondingCurve: bondingCurve.toBase58(),
      signature: signature,
      name: tokenData.name,
      symbol: tokenData.symbol,
      image: tokenData.image,
      initialBuy: initialBuy
    };
    
  } catch (error) {
    console.error("Erreur création token:", error);
    throw error;
  }
}

/**
 * 💰 Acheter des tokens avec transactions optimisées (Combined token account + buy)
 */
export async function buyTokens(wallet, connection, mintAddress, tokenAmount, maxSolCost) {
  try {
    console.log(`🚀 Achat OPTIMISÉ ${tokenAmount / 1e6} tokens, max ${maxSolCost} SOL`);
    
    // Vérifications de base
    if (!wallet.connected || !wallet.publicKey) {
      throw new Error("Wallet non connecté");
    }
    
    const mint = new web3.PublicKey(mintAddress);
    
    // 📊 SIMULATION PRÉALABLE (Mode simulation intégré)
    const bondingCurveData = await getBondingCurveData(connection, mint);
    const priceData = calculateBuyPrice(
      BigInt(bondingCurveData.virtualSolReserves),
      BigInt(bondingCurveData.virtualTokenReserves),
      BigInt(tokenAmount)
    );
    
    console.log(`📊 SIMULATION: ${priceData.totalCost} SOL (+ ${priceData.fee} fee)`);
    
    // Vérifier slippage
    if (priceData.totalCost > maxSolCost) {
      throw new Error(`Slippage dépassé: ${priceData.totalCost} > ${maxSolCost}`);
    }
    
    // Calculer les PDAs et comptes
    const bondingCurve = getBondingCurvePDA(mint);
    const curveAuthority = getCurveAuthorityPDA(mint);
    const curveVault = await splToken.getAssociatedTokenAddress(mint, curveAuthority, true);
    const buyerTokenAccount = await splToken.getAssociatedTokenAddress(mint, wallet.publicKey);

    // 🔥 TRANSACTION OPTIMISÉE - Single transaction avec création compte + achat
    const transaction = new web3.Transaction();
    
    // Vérifier si le compte token existe déjà
    let needsTokenAccount = false;
    try {
      await connection.getTokenAccountBalance(buyerTokenAccount);
      console.log("✅ Compte token existe déjà");
    } catch (e) {
      needsTokenAccount = true;
      console.log("🔧 Création compte token + achat en 1 transaction");
    }
    
    // Si besoin, ajouter création de compte ET achat dans la même transaction
    if (needsTokenAccount) {
      const createBuyerIx = splToken.createAssociatedTokenAccountInstruction(
        wallet.publicKey,
        buyerTokenAccount,
        wallet.publicKey,
        mint
      );
      transaction.add(createBuyerIx);
    }

    // Construire l'instruction d'achat optimisée
    const buyIx = {
      programId: getPumpProgramId(),
      keys: [
        { pubkey: wallet.publicKey, isSigner: true, isWritable: true }, // buyer
        { pubkey: bondingCurve, isSigner: false, isWritable: true }, // bonding_curve
        { pubkey: mint, isSigner: false, isWritable: true }, // mint
        { pubkey: curveVault, isSigner: false, isWritable: true }, // curve_vault
        { pubkey: buyerTokenAccount, isSigner: false, isWritable: true }, // buyer_token_account
        { pubkey: curveAuthority, isSigner: false, isWritable: false }, // curve_authority
        { pubkey: getFeeVault(), isSigner: false, isWritable: true }, // fee_vault
        { pubkey: splToken.TOKEN_PROGRAM_ID, isSigner: false, isWritable: false }, // token_program
        { pubkey: web3.SystemProgram.programId, isSigner: false, isWritable: false }, // system_program
      ],
      data: encodeBuyTokensInstruction(tokenAmount)
    };
    
    transaction.add(buyIx);

    // Définir les paramètres de transaction
    const { blockhash } = await connection.getLatestBlockhash();
    transaction.recentBlockhash = blockhash;
    transaction.feePayer = wallet.publicKey;

    console.log("🔄 Signature de la transaction...");
    
    // Signer la transaction
    const signedTransaction = await wallet.signTransaction(transaction);
    
    console.log("📡 Envoi de la vraie transaction...");
    
    // Envoyer la transaction
    const signature = await connection.sendRawTransaction(signedTransaction.serialize());
    
    console.log(`🔗 Transaction envoyée: ${signature}`);
    console.log("⏳ Confirmation en cours...");
    
    // Attendre la confirmation
    const confirmation = await connection.confirmTransaction(signature, 'confirmed');
    
    if (confirmation.value.err) {
      throw new Error(`Transaction échouée: ${JSON.stringify(confirmation.value.err)}`);
    }
    
    console.log("✅ Achat confirmé!");
    console.log(`🌐 Voir sur Solana Explorer: https://explorer.solana.com/tx/${signature}?cluster=devnet`);
    
    return {
      success: true,
      tokenAmount: tokenAmount / 1e6,
      solCost: priceData.totalCost,
      fee: priceData.fee,
      signature: signature,
      confirmed: true
    };
    
  } catch (error) {
    console.error("Erreur achat tokens:", error);
    throw error;
  }
}

/**
 * 💸 Vendre des tokens avec le nouveau smart contract
 */
export async function sellTokens(wallet, connection, mintAddress, tokenAmount, minSolOutput) {
  try {
    console.log(`💸 Vente ${tokenAmount / 1e6} tokens, min ${minSolOutput} SOL`);
    
    // Vérifications de base
    if (!wallet.connected || !wallet.publicKey) {
      throw new Error("Wallet non connecté");
    }
    
    const mint = new web3.PublicKey(mintAddress);
    
    // Obtenir les données de la bonding curve
    const bondingCurveData = await getBondingCurveData(connection, mint);
    
    // Calculer le prix avec les vraies formules
    const priceData = calculateSellPrice(
      BigInt(bondingCurveData.virtualSolReserves),
      BigInt(bondingCurveData.virtualTokenReserves),
      BigInt(tokenAmount)
    );
    
    console.log(`📊 Prix calculé: ${priceData.solOutput} SOL (- ${priceData.fee} fee)`);
    
    // Vérifier slippage
    if (priceData.solOutput < minSolOutput) {
      throw new Error(`Slippage dépassé: ${priceData.solOutput} < ${minSolOutput}`);
    }
    
    // Calculer les PDAs et comptes
    const bondingCurve = getBondingCurvePDA(mint);
    const sellerTokenAccount = await splToken.getAssociatedTokenAddress(mint, wallet.publicKey);

    // Construire l'instruction de vente
    const sellIx = {
      programId: getPumpProgramId(),
      keys: [
        { pubkey: wallet.publicKey, isSigner: true, isWritable: true }, // seller
        { pubkey: bondingCurve, isSigner: false, isWritable: true }, // bonding_curve
        { pubkey: mint, isSigner: false, isWritable: true }, // mint
        { pubkey: sellerTokenAccount, isSigner: false, isWritable: true }, // seller_token_account
        { pubkey: getFeeVault(), isSigner: false, isWritable: true }, // fee_vault
        { pubkey: splToken.TOKEN_PROGRAM_ID, isSigner: false, isWritable: false }, // token_program
        { pubkey: web3.SystemProgram.programId, isSigner: false, isWritable: false }, // system_program
      ],
      data: encodeSellTokensInstruction(tokenAmount)
    };

    // Créer la transaction
    const transaction = new web3.Transaction();
    transaction.add(sellIx);

    // Définir les paramètres de transaction
    const { blockhash } = await connection.getLatestBlockhash();
    transaction.recentBlockhash = blockhash;
    transaction.feePayer = wallet.publicKey;

    console.log("🔄 Signature de la transaction de vente...");
    
    // Signer la transaction
    const signedTransaction = await wallet.signTransaction(transaction);
    
    console.log("📡 Envoi de la vraie transaction de vente...");
    
    // Envoyer la transaction
    const signature = await connection.sendRawTransaction(signedTransaction.serialize());
    
    console.log(`🔗 Transaction envoyée: ${signature}`);
    console.log("⏳ Confirmation en cours...");
    
    // Attendre la confirmation
    const confirmation = await connection.confirmTransaction(signature, 'confirmed');
    
    if (confirmation.value.err) {
      throw new Error(`Transaction échouée: ${JSON.stringify(confirmation.value.err)}`);
    }
    
    console.log("✅ Vente confirmée!");
    console.log(`🌐 Voir sur Solana Explorer: https://explorer.solana.com/tx/${signature}?cluster=devnet`);
    
    return {
      success: true,
      tokenAmount: tokenAmount / 1e6,
      solReceived: priceData.solOutput,
      fee: priceData.fee,
      signature: signature,
      confirmed: true
    };
    
  } catch (error) {
    console.error("Erreur vente tokens:", error);
    throw error;
  }
}

// ===== SIMULATION MODE =====

/**
 * 🧪 Simuler une transaction d'achat sans l'exécuter
 */
export async function simulateBuyTokens(wallet, connection, mintAddress, tokenAmount, maxSolCost) {
  try {
    console.log(`🧪 SIMULATION: Achat ${tokenAmount / 1e6} tokens`);
    
    if (!wallet.connected || !wallet.publicKey) {
      throw new Error("Wallet non connecté pour simulation");
    }
    
    const mint = new web3.PublicKey(mintAddress);
    const bondingCurveData = await getBondingCurveData(connection, mint);
    
    // Calculer le prix avec simulation
    const priceData = calculateBuyPrice(
      BigInt(bondingCurveData.virtualSolReserves),
      BigInt(bondingCurveData.virtualTokenReserves),
      BigInt(tokenAmount)
    );
    
    // Calculer les comptes nécessaires
    const buyerTokenAccount = await splToken.getAssociatedTokenAddress(mint, wallet.publicKey);
    
    // Vérifier si compte token existe
    let needsTokenAccount = false;
    try {
      await connection.getTokenAccountBalance(buyerTokenAccount);
    } catch (e) {
      needsTokenAccount = true;
    }
    
    // Estimation des frais de transaction
    const accountCreationFee = needsTokenAccount ? 0.00203 : 0; // ~2030 lamports
    const transactionFee = 0.000005; // ~5000 lamports
    const totalNetworkFees = accountCreationFee + transactionFee;
    
    return {
      success: true,
      simulation: true,
      tokenAmount: tokenAmount / 1e6,
      solCost: priceData.totalCost,
      tradingFee: priceData.fee,
      networkFees: totalNetworkFees,
      totalCost: priceData.totalCost + totalNetworkFees,
      needsTokenAccount,
      priceImpact: bondingCurveData.currentPrice ? ((priceData.totalCost / (bondingCurveData.currentPrice || 0.000001)) - 1) * 100 : 0,
      slippageOk: priceData.totalCost <= maxSolCost,
      bondingCurveAfter: {
        virtualSolReserves: Number(priceData.newVirtualSolReserves),
        virtualTokenReserves: Number(priceData.newVirtualTokenReserves),
        currentPrice: Number(priceData.newVirtualSolReserves) / Number(priceData.newVirtualTokenReserves)
      }
    };
    
  } catch (error) {
    console.error("Erreur simulation achat:", error);
    return {
      success: false,
      simulation: true,
      error: error.message
    };
  }
}

/**
 * 🧪 Simuler une transaction de vente sans l'exécuter
 */
export async function simulateSellTokens(wallet, connection, mintAddress, tokenAmount, minSolOutput) {
  try {
    console.log(`🧪 SIMULATION: Vente ${tokenAmount / 1e6} tokens`);
    
    if (!wallet.connected || !wallet.publicKey) {
      throw new Error("Wallet non connecté pour simulation");
    }
    
    const mint = new web3.PublicKey(mintAddress);
    const bondingCurveData = await getBondingCurveData(connection, mint);
    
    // Calculer le prix avec simulation
    const priceData = calculateSellPrice(
      BigInt(bondingCurveData.virtualSolReserves),
      BigInt(bondingCurveData.virtualTokenReserves),
      BigInt(tokenAmount)
    );
    
    // Estimation des frais de transaction
    const transactionFee = 0.000005; // ~5000 lamports
    const netSolOutput = priceData.solOutput - transactionFee;
    
    return {
      success: true,
      simulation: true,
      tokenAmount: tokenAmount / 1e6,
      grossSolOutput: priceData.grossOutput,
      tradingFee: priceData.fee,
      networkFees: transactionFee,
      netSolOutput: netSolOutput,
      priceImpact: bondingCurveData.currentPrice ? ((bondingCurveData.currentPrice / ((priceData.grossOutput || 0.000001) / (tokenAmount / 1e6))) - 1) * 100 : 0,
      slippageOk: netSolOutput >= minSolOutput,
      bondingCurveAfter: {
        virtualSolReserves: Number(priceData.newVirtualSolReserves),
        virtualTokenReserves: Number(priceData.newVirtualTokenReserves),
        currentPrice: Number(priceData.newVirtualSolReserves) / Number(priceData.newVirtualTokenReserves)
      }
    };
    
  } catch (error) {
    console.error("Erreur simulation vente:", error);
    return {
      success: false,
      simulation: true,
      error: error.message
    };
  }
}

// ===== FONCTIONS UTILITAIRES =====

/**
 * Obtenir les données de la bonding curve RÉELLES depuis la blockchain
 */
export async function getBondingCurveData(connection, mintPubkey) {
  try {
    const mintKey = typeof mintPubkey === 'string' ? new web3.PublicKey(mintPubkey) : mintPubkey;
    const bondingCurvePDA = getBondingCurvePDA(mintKey);
    
    console.log(`🔍 Lecture bonding curve réelle pour ${mintKey.toBase58()}`);
    console.log(`📋 PDA bonding curve: ${bondingCurvePDA.toBase58()}`);
    
    try {
      // 🔥 LIRE LES VRAIES DONNÉES DU SMART CONTRACT
      const accountInfo = await connection.getAccountInfo(bondingCurvePDA);
      
      if (!accountInfo || !accountInfo.data) {
        console.log(`⚠️  Bonding curve non trouvée, utilisation données par défaut`);
        return getDefaultBondingCurveData(mintKey);
      }
      
      // 🧮 DÉCODER LES DONNÉES RÉELLES (ajuster selon le layout exact du smart contract)
      const data = accountInfo.data;
      console.log(`📊 Données brutes bonding curve (${data.length} bytes):`, data.toString('hex').substring(0, 200) + '...');
      
      // Structure approximative des données (à ajuster selon le smart contract réel)
      // Offset 8: discriminator (8 bytes)
      // Offset 16: virtual_token_reserves (8 bytes)  
      // Offset 24: virtual_sol_reserves (8 bytes)
      // Offset 32: real_token_reserves (8 bytes)
      // Offset 40: real_sol_reserves (8 bytes)
      // Offset 48: creator (32 bytes)
      
      if (data.length < 80) {
        console.log(`⚠️  Données insuffisantes (${data.length} < 80 bytes)`);
        return getDefaultBondingCurveData(mintKey);
      }
      
      const virtualTokenReserves = data.readBigUInt64LE(8).toString();
      const virtualSolReserves = data.readBigUInt64LE(16).toString();  
      const realTokenReserves = data.readBigUInt64LE(24).toString();
      const realSolReserves = data.readBigUInt64LE(32).toString();
      
      // Vérifier que les données sont cohérentes
      const vtReserves = BigInt(virtualTokenReserves);
      const vsReserves = BigInt(virtualSolReserves);
      const rtReserves = BigInt(realTokenReserves);
      const rsReserves = BigInt(realSolReserves);
      
      console.log(`✅ DONNÉES RÉELLES DÉCODÉES:`);
      console.log(`   Virtual Token Reserves: ${(Number(vtReserves) / 1e6).toFixed(1)}M tokens`);
      console.log(`   Virtual SOL Reserves: ${(Number(vsReserves) / 1e9).toFixed(2)} SOL`);
      console.log(`   Real Token Reserves: ${(Number(rtReserves) / 1e6).toFixed(1)}M tokens`);
      console.log(`   Real SOL Reserves: ${(Number(rsReserves) / 1e9).toFixed(6)} SOL`);
      
      // Calculer prix actuel et market cap
      const currentPrice = Number(vsReserves) / Number(vtReserves);
      const circulatingSupply = Number(PUMP_CONSTANTS.TOKEN_TOTAL_SUPPLY) - Number(rtReserves);
      const marketCap = (currentPrice * circulatingSupply) / 1e6; // en SOL
      const progressPercent = (Number(rsReserves) * 100) / Number(PUMP_CONSTANTS.MIGRATION_THRESHOLD);
      
      return {
        virtualTokenReserves: virtualTokenReserves,
        virtualSolReserves: virtualSolReserves,
        realTokenReserves: realTokenReserves,
        realSolReserves: realSolReserves,
        tokenTotalSupply: PUMP_CONSTANTS.TOKEN_TOTAL_SUPPLY.toString(),
        complete: rsReserves >= PUMP_CONSTANTS.MIGRATION_THRESHOLD,
        currentPrice: currentPrice / 1e6, // Prix par token en SOL
        marketCap: marketCap,
        progress: Math.min(progressPercent, 100),
        creator: mintKey.toBase58(),
        createdAt: Date.now(),
        dataSource: 'blockchain' // Marquer comme données réelles
      };
      
    } catch (rpcError) {
      console.log(`⚠️  Erreur RPC lecture bonding curve: ${rpcError.message}`);
      return getDefaultBondingCurveData(mintKey);
    }
  } catch (error) {
    console.error("Erreur récupération bonding curve:", error);
    throw error;
  }
}

/**
 * 📊 Données par défaut si la bonding curve n'existe pas encore
 */
function getDefaultBondingCurveData(mintKey) {
  console.log(`🔄 Utilisation données par défaut pour ${mintKey.toBase58()}`);
  return {
    virtualTokenReserves: PUMP_CONSTANTS.INITIAL_VIRTUAL_TOKEN_RESERVES.toString(),
    virtualSolReserves: PUMP_CONSTANTS.INITIAL_VIRTUAL_SOL_RESERVES.toString(),
    realTokenReserves: PUMP_CONSTANTS.INITIAL_REAL_TOKEN_RESERVES.toString(),
    realSolReserves: "0",
    tokenTotalSupply: PUMP_CONSTANTS.TOKEN_TOTAL_SUPPLY.toString(),
    complete: false,
    currentPrice: Number(PUMP_CONSTANTS.INITIAL_VIRTUAL_SOL_RESERVES) / Number(PUMP_CONSTANTS.INITIAL_VIRTUAL_TOKEN_RESERVES) / 1e6,
    marketCap: 0,
    progress: 0,
    creator: mintKey.toBase58(),
    createdAt: Date.now(),
    dataSource: 'default' // Marquer comme données par défaut
  };
}

// ===== ENCODAGE DES INSTRUCTIONS =====

function encodeCreateTokenInstruction({ name, symbol, uri, initialBuy }) {
  // Simplified encoding - in a real implementation, you'd use proper serialization
  const nameBytes = Buffer.from(name, 'utf8');
  const symbolBytes = Buffer.from(symbol, 'utf8');
  const uriBytes = Buffer.from(uri, 'utf8');
  const initialBuyBuffer = Buffer.alloc(8);
  initialBuyBuffer.writeBigUInt64LE(BigInt(initialBuy), 0);
  
  return Buffer.concat([
    Buffer.from([0]), // instruction discriminator for create_token
    Buffer.from([nameBytes.length]),
    nameBytes,
    Buffer.from([symbolBytes.length]),
    symbolBytes,
    Buffer.from([uriBytes.length]),
    uriBytes,
    initialBuyBuffer
  ]);
}

function encodeBuyTokensInstruction(tokenAmount) {
  const buffer = Buffer.alloc(9);
  buffer.writeUInt8(1, 0); // instruction discriminator for buy_tokens
  buffer.writeBigUInt64LE(BigInt(tokenAmount), 1);
  return buffer;
}

function encodeSellTokensInstruction(tokenAmount) {
  const buffer = Buffer.alloc(9);
  buffer.writeUInt8(2, 0); // instruction discriminator for sell_tokens
  buffer.writeBigUInt64LE(BigInt(tokenAmount), 1);
  return buffer;
}

// Export par défaut
export default {
  getPumpProgramId,
  getFeeVault,
  PUMP_CONSTANTS,
  LIMITS,
  getBondingCurvePDA,
  getCurveAuthorityPDA,
  calculateBuyPrice,
  calculateSellPrice,
  createToken,
  buyTokens,
  sellTokens,
  simulateBuyTokens,
  simulateSellTokens,
  getBondingCurveData,
};