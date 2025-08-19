#!/usr/bin/env node
/**
 * Script de test pour vérifier le bon fonctionnement des bonding curves
 */

const { Connection, PublicKey, Keypair } = require('@solana/web3.js');

const ENDPOINT = "https://api.devnet.solana.com";
const PROGRAM_ID = "EJ7dWpEMiUJ5jTjg3EkfS2hGY48PSrEM8r54HrFgZNrA";

async function testBondingCurve() {
  console.log("🧪 Test des bonding curves...\n");
  
  const connection = new Connection(ENDPOINT, 'confirmed');
  
  try {
    // Test 1: Vérifier que le programme existe
    console.log("1️⃣ Vérification du programme...");
    const programInfo = await connection.getAccountInfo(new PublicKey(PROGRAM_ID));
    if (programInfo) {
      console.log("✅ Programme trouvé");
    } else {
      console.log("❌ Programme non trouvé");
      return;
    }
    
    // Test 2: Vérifier les PDAs
    console.log("\n2️⃣ Test des PDAs...");
    
    // Test mint (exemple)
    const testMint = Keypair.generate().publicKey;
    console.log("Test mint:", testMint.toBase58());
    
    // Bonding curve PDA
    const [bondingCurvePda] = await PublicKey.findProgramAddress(
      [Buffer.from("bonding_curve"), testMint.toBuffer()],
      new PublicKey(PROGRAM_ID)
    );
    console.log("✅ Bonding curve PDA:", bondingCurvePda.toBase58());
    
    // Global PDA
    const [globalPda] = await PublicKey.findProgramAddress(
      [Buffer.from("global")],
      new PublicKey(PROGRAM_ID)
    );
    console.log("✅ Global PDA:", globalPda.toBase58());
    
    // Curve authority PDA
    const [curveAuthority] = await PublicKey.findProgramAddress(
      [Buffer.from("curve_authority"), bondingCurvePda.toBuffer()],
      new PublicKey(PROGRAM_ID)
    );
    console.log("✅ Curve authority PDA:", curveAuthority.toBase58());
    
    console.log("\n✅ Tous les tests basiques passés !");
    console.log("\n📝 Prochaines étapes:");
    console.log("1. Initialiser le global state avec initializeGlobal()");
    console.log("2. Créer un token avec votre TokenForm");
    console.log("3. Tester les achats avec le BuyBox");
    
  } catch (error) {
    console.error("❌ Erreur lors des tests:", error);
  }
}

testBondingCurve();