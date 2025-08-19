#!/usr/bin/env node

const { Connection, PublicKey, Keypair } = require('@solana/web3.js');

// Test script pour initialiser une vraie bonding curve pour le token existant
async function testBondingInit() {
  console.log("🧪 Test d'initialisation bonding curve...");
  
  const connection = new Connection("https://api.devnet.solana.com", "confirmed");
  const mintAddress = "e18FSjwAoXiJCns1MWWjPfPx9siDf2789xEHEQVbL72";
  
  try {
    // Vérifier que le token existe
    const mintPubkey = new PublicKey(mintAddress);
    const mintInfo = await connection.getAccountInfo(mintPubkey);
    
    if (!mintInfo) {
      throw new Error("Token n'existe pas");
    }
    
    console.log("✅ Token trouvé on-chain");
    
    // Test des PDAs
    console.log("\n🔍 Test des PDAs...");
    
    // ID du programme depuis l'IDL
    const PROGRAM_ID = new PublicKey("EJ7dWpEMiUJ5jTjg3EkfS2hGY48PSrEM8r54HrFgZNrA");
    
    // PDA bonding curve
    const [bondingCurvePda] = await PublicKey.findProgramAddress(
      [Buffer.from("bonding_curve"), mintPubkey.toBuffer()],
      PROGRAM_ID
    );
    
    console.log("📍 Bonding Curve PDA:", bondingCurvePda.toBase58());
    
    // Vérifier si elle existe
    const bondingCurveAccount = await connection.getAccountInfo(bondingCurvePda);
    if (bondingCurveAccount) {
      console.log("✅ Bonding curve existe déjà!");
    } else {
      console.log("❌ Bonding curve n'existe pas");
      console.log("💡 Il faut initialiser la bonding curve avec le programme Solana");
    }
    
  } catch (error) {
    console.error("❌ Erreur:", error.message);
    console.log("\n⚠️ Pour créer une vraie bonding curve, il faut:");
    console.log("1. Un programme Solana déployé et fonctionnel sur devnet");
    console.log("2. Initialiser le compte global du programme");
    console.log("3. Utiliser la fonction initializeBondingCurve avec un wallet connecté");
  }
}

testBondingInit();