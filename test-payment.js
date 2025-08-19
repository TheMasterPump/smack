/**
 * Script de test pour vérifier le paiement des frais
 * Usage: node test-payment.js
 */

const { Connection, PublicKey, LAMPORTS_PER_SOL } = require('@solana/web3.js');

const FEE_RECEIVER = "8hXGeqAkS2GezfSiCVjfNzqjobLmognqJsqyA75ZL79R";
const connection = new Connection("https://api.devnet.solana.com", "confirmed");

async function testPaymentVerification() {
  console.log("\n🔍 TEST DE VÉRIFICATION DU PAIEMENT\n");
  
  // 1. Vérifier le solde du wallet de frais
  console.log("1. Vérification du wallet receveur de frais...");
  try {
    const receiverPubkey = new PublicKey(FEE_RECEIVER);
    const balance = await connection.getBalance(receiverPubkey);
    console.log(`   ✅ Wallet: ${FEE_RECEIVER}`);
    console.log(`   💰 Solde: ${balance / LAMPORTS_PER_SOL} SOL\n`);
  } catch (e) {
    console.log(`   ❌ Erreur: ${e.message}\n`);
  }
  
  // 2. Test de l'API backend
  console.log("2. Test de l'API backend...");
  try {
    const response = await fetch('http://localhost:4000/api/test');
    if (response.ok) {
      const data = await response.json();
      console.log("   ✅ Backend en ligne");
      console.log(`   Configuration:`);
      console.log(`   - Fee Receiver: ${data.feeReceiver}`);
      console.log(`   - Fee Amount: ${data.feeAmount} SOL`);
      console.log(`   - Network: ${data.network}\n`);
    } else {
      console.log("   ❌ Backend non accessible\n");
    }
  } catch (e) {
    console.log("   ❌ Backend non démarré. Lancez 'cd backend && npm start'\n");
  }
  
  // 3. Instructions pour tester
  console.log("📝 INSTRUCTIONS DE TEST:\n");
  console.log("1. Assurez-vous que le backend tourne (cd backend && npm start)");
  console.log("2. Assurez-vous que le frontend tourne (npm start)");
  console.log("3. Connectez Phantom sur devnet");
  console.log("4. Obtenez des SOL de test: https://solfaucet.com/");
  console.log("5. Créez un token et vérifiez dans la console:");
  console.log("   - Le paiement doit afficher une signature");
  console.log("   - La confirmation doit réussir");
  console.log("   - Le backend doit valider le paiement\n");
  
  // 4. Test d'une transaction spécifique
  const testSignature = process.argv[2];
  if (testSignature) {
    console.log(`4. Vérification de la transaction: ${testSignature}`);
    try {
      const tx = await connection.getTransaction(testSignature, {
        commitment: "confirmed",
        maxSupportedTransactionVersion: 0
      });
      
      if (tx) {
        console.log("   ✅ Transaction trouvée");
        console.log(`   - Status: ${tx.meta.err ? 'Failed' : 'Success'}`);
        console.log(`   - Fee: ${tx.meta.fee / LAMPORTS_PER_SOL} SOL`);
        console.log(`   - Slot: ${tx.slot}`);
        
        // Vérifier si c'est bien un paiement vers FEE_RECEIVER
        const keys = tx.transaction.message.accountKeys.map(k => 
          typeof k === 'string' ? k : k.toBase58()
        );
        
        if (keys.includes(FEE_RECEIVER)) {
          console.log("   ✅ Transaction vers le bon wallet de frais");
          
          // Calculer le montant
          const toIndex = keys.indexOf(FEE_RECEIVER);
          const received = tx.meta.postBalances[toIndex] - tx.meta.preBalances[toIndex];
          console.log(`   💰 Montant reçu: ${received / LAMPORTS_PER_SOL} SOL`);
        } else {
          console.log("   ⚠️ Cette transaction n'est pas vers le wallet de frais");
        }
      } else {
        console.log("   ❌ Transaction non trouvée");
      }
    } catch (e) {
      console.log(`   ❌ Erreur: ${e.message}`);
    }
  } else {
    console.log("💡 Tip: Vous pouvez tester une transaction spécifique:");
    console.log("   node test-payment.js <signature>");
  }
  
  console.log("\n");
}

testPaymentVerification().catch(console.error);