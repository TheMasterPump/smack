#!/usr/bin/env node
/**
 * Script pour vérifier votre balance SOL avant de créer un token
 */

const { Connection, PublicKey, LAMPORTS_PER_SOL } = require('@solana/web3.js');

const ENDPOINT = "https://api.devnet.solana.com";
const FEE_AMOUNT = 0.06; // SOL
const MIN_BALANCE = 0.1; // Minimum recommandé

async function checkBalance() {
  console.log("💳 Vérification des balances...\n");
  
  const connection = new Connection(ENDPOINT, 'confirmed');
  
  // Remplacez par votre adresse de wallet
  const walletAddress = "VOTRE_ADRESSE_WALLET_ICI";
  
  if (walletAddress === "VOTRE_ADRESSE_WALLET_ICI") {
    console.log("⚠️  Modifiez ce script avec votre adresse de wallet Phantom");
    console.log("Pour trouver votre adresse :");
    console.log("1. Ouvrez Phantom");
    console.log("2. Cliquez sur votre nom en haut");
    console.log("3. Copiez l'adresse publique");
    return;
  }
  
  try {
    const publicKey = new PublicKey(walletAddress);
    const balance = await connection.getBalance(publicKey);
    const balanceSOL = balance / LAMPORTS_PER_SOL;
    
    console.log(`📍 Adresse: ${walletAddress}`);
    console.log(`💰 Balance: ${balanceSOL.toFixed(4)} SOL`);
    console.log(`💸 Frais requis: ${FEE_AMOUNT} SOL`);
    console.log(`⛽ Frais réseau: ~0.01 SOL`);
    console.log(`📊 Total nécessaire: ~${FEE_AMOUNT + 0.01} SOL`);
    
    if (balanceSOL < MIN_BALANCE) {
      console.log("\n❌ Balance insuffisante !");
      console.log("💡 Solutions :");
      console.log("1. Allez sur https://faucet.solana.com/");
      console.log("2. Collez votre adresse");
      console.log("3. Demandez 1-2 SOL devnet");
    } else {
      console.log("\n✅ Balance suffisante pour créer un token !");
    }
    
  } catch (error) {
    console.error("❌ Erreur:", error.message);
  }
}

checkBalance();