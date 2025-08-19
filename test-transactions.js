/**
 * Script de test pour les transactions Solana
 * Teste la robustesse contre les timeouts et expirations
 */

const { Connection, PublicKey, LAMPORTS_PER_SOL } = require('@solana/web3.js');

async function testTransactionResilience() {
  console.log("\n🧪 TEST DE ROBUSTESSE DES TRANSACTIONS\n");
  
  const endpoints = [
    'https://api.devnet.solana.com',
    'https://devnet.helius-rpc.com/',
    'https://solana-devnet.g.alchemy.com/v2/demo'
  ];
  
  for (const endpoint of endpoints) {
    console.log(`📡 Test de l'endpoint: ${endpoint}`);
    
    try {
      const connection = new Connection(endpoint, 'confirmed');
      
      // Test de base
      const startTime = Date.now();
      const version = await connection.getVersion();
      const responseTime = Date.now() - startTime;
      
      console.log(`   ✅ Connecté en ${responseTime}ms`);
      console.log(`   Version: ${version['solana-core']}`);
      
      // Test de blockhash
      const blockhashStart = Date.now();
      const { blockhash, lastValidBlockHeight } = await connection.getLatestBlockhash('finalized');
      const blockhashTime = Date.now() - blockhashStart;
      
      console.log(`   🧱 Blockhash obtenu en ${blockhashTime}ms`);
      console.log(`   Block height: ${lastValidBlockHeight}`);
      
      // Test de slot
      const slot = await connection.getSlot();
      console.log(`   📊 Slot actuel: ${slot}`);
      
      // Calculer l'âge du blockhash (approximatif)
      const slotsAhead = slot - lastValidBlockHeight;
      const estimatedAge = slotsAhead * 400; // ~400ms par slot
      
      if (estimatedAge > 60000) { // Plus de 60 secondes
        console.log(`   ⚠️  Blockhash potentiellement vieux (${Math.round(estimatedAge/1000)}s)`);
      } else {
        console.log(`   ✅ Blockhash frais (${Math.round(estimatedAge/1000)}s)`);
      }
      
      // Score de performance
      const totalTime = responseTime + blockhashTime;
      let performance = '🟢 Excellent';
      
      if (totalTime > 2000) {
        performance = '🔴 Lent';
      } else if (totalTime > 1000) {
        performance = '🟡 Correct';
      }
      
      console.log(`   Performance: ${performance} (${totalTime}ms total)\n`);
      
    } catch (error) {
      console.log(`   ❌ Erreur: ${error.message}\n`);
    }
  }
  
  // Recommandations
  console.log("💡 RECOMMANDATIONS:\n");
  console.log("1. Utilisez l'endpoint le plus rapide pour votre région");
  console.log("2. Si vous voyez des timeouts fréquents:");
  console.log("   - Changez d'endpoint RPC");
  console.log("   - Vérifiez votre connexion internet");
  console.log("   - Essayez aux heures de faible trafic");
  console.log("3. Le retry automatique gère maintenant la plupart des problèmes");
  console.log("4. Gardez au moins 0.1 SOL pour les frais de transaction\n");
  
  // Test spécifique pour blockhash expiration
  console.log("⏱️  SIMULATION D'EXPIRATION DE BLOCKHASH:\n");
  
  try {
    const connection = new Connection('https://api.devnet.solana.com', 'confirmed');
    
    // Obtenir un blockhash
    const { blockhash, lastValidBlockHeight } = await connection.getLatestBlockhash();
    console.log(`Blockhash initial: ${blockhash.slice(0, 8)}...`);
    console.log(`Block height: ${lastValidBlockHeight}`);
    
    // Attendre et vérifier s'il est toujours valide
    console.log("Attente de 10 secondes...");
    await new Promise(resolve => setTimeout(resolve, 10000));
    
    const currentSlot = await connection.getSlot();
    const slotsElapsed = currentSlot - lastValidBlockHeight;
    const timeElapsed = slotsElapsed * 400; // approximation
    
    console.log(`Slots écoulés: ${slotsElapsed}`);
    console.log(`Temps estimé: ${Math.round(timeElapsed/1000)}s`);
    
    if (slotsElapsed > 150) {
      console.log("❌ Ce blockhash aurait expiré");
    } else {
      console.log("✅ Ce blockhash est encore valide");
    }
    
    // Obtenir un nouveau blockhash
    const { blockhash: newBlockhash } = await connection.getLatestBlockhash();
    
    if (newBlockhash !== blockhash) {
      console.log("🔄 Nouveau blockhash disponible");
    } else {
      console.log("🔄 Même blockhash (normal sur devnet peu actif)");
    }
    
  } catch (error) {
    console.log(`❌ Erreur lors du test d'expiration: ${error.message}`);
  }
  
  console.log("\n🎯 CONSEILS POUR ÉVITER LES EXPIRATIONS:\n");
  console.log("• L'application fait maintenant automatiquement 3 tentatives");
  console.log("• Chaque tentative utilise un blockhash frais");
  console.log("• Signez rapidement dans Phantom (< 30 secondes)");
  console.log("• Évitez de créer des tokens pendant les pics de trafic");
  console.log("• Si ça persiste, changez d'endpoint RPC dans .env\n");
}

// Vérifier les arguments
const testSpecific = process.argv[2];

if (testSpecific === 'endpoints') {
  console.log("Test des endpoints uniquement...");
  testTransactionResilience().catch(console.error);
} else if (testSpecific === 'help') {
  console.log("\nUsage:");
  console.log("  node test-transactions.js           # Test complet");
  console.log("  node test-transactions.js endpoints # Test endpoints seulement");
  console.log("  node test-transactions.js help      # Cette aide\n");
} else {
  testTransactionResilience().catch(console.error);
}