#!/usr/bin/env node

const { Connection, PublicKey } = require('@solana/web3.js');

// Simuler l'initialisation d'une bonding curve pour les tokens existants
async function fixBondingCurve() {
  const connection = new Connection("https://api.devnet.solana.com", "confirmed");
  
  // Token qui a besoin d'une bonding curve
  const mintAddress = "e18FSjwAoXiJCns1MWWjPfPx9siDf2789xEHEQVbL72";
  
  console.log(`🔧 Vérification du token ${mintAddress}...`);
  
  try {
    // Vérifier si le mint existe
    const mintInfo = await connection.getAccountInfo(new PublicKey(mintAddress));
    
    if (!mintInfo) {
      console.log("❌ Le mint n'existe pas sur la blockchain");
      return;
    }
    
    console.log("✅ Le mint existe sur la blockchain");
    console.log(`📊 Lamports: ${mintInfo.lamports}`);
    console.log(`👤 Owner: ${mintInfo.owner.toBase58()}`);
    
    // Pour ce test, on va créer une bonding curve factice dans le backend
    const bondingCurveData = {
      mintAddress,
      bondingCurve: "FAKE_PDA_" + mintAddress.slice(0, 10), // PDA simulée
      params: {
        a: "1000000000000", // 1e12
        b: "500000000000",  // 5e11  
        c: "250000000000",  // 2.5e11
        currentSupply: "0",
        maxSupply: "1000000000000000000", // 1 billion * 1e9
      },
      currentPrice: "0.000001000", // Prix initial
      realSolReserves: "0"
    };
    
    // Sauvegarder dans le backend
    const response = await fetch('http://localhost:4000/api/bonding-curve/init', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(bondingCurveData)
    });
    
    if (response.ok) {
      console.log("✅ Bonding curve initialisée avec succès!");
      
      // Mettre à jour le token avec la bonding curve PDA
      const updateResponse = await fetch(`http://localhost:4000/api/token/test-222222/update-bonding`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          bondingCurve: bondingCurveData.bondingCurve
        })
      });
      
      if (updateResponse.ok) {
        console.log("✅ Token mis à jour avec la bonding curve!");
      } else {
        console.log("⚠️ Token bonding curve update failed");
      }
      
    } else {
      console.log("❌ Échec de l'initialisation:", await response.text());
    }
    
  } catch (error) {
    console.error("❌ Erreur:", error.message);
  }
}

fixBondingCurve();