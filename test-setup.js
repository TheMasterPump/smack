#!/usr/bin/env node

/**
 * Script de test pour vérifier la configuration du launchpad
 * Usage: node test-setup.js
 */

const chalk = require('chalk');
const fs = require('fs');
const path = require('path');
const { Connection, PublicKey } = require('@solana/web3.js');

console.log(chalk.blue.bold('\n🚀 SMACK LAUNCHPAD - TEST DE CONFIGURATION\n'));

let errors = 0;
let warnings = 0;

// Test 1: Vérifier les fichiers importants
console.log(chalk.yellow('📁 Vérification des fichiers...'));

const requiredFiles = [
  'package.json',
  'src/App.js',
  'src/TokenForm.js',
  'src/TokenPage.js',
  'src/components/BuyBox.js',
  'src/utils/bondingClient.js',
  'backend/package.json',
  'backend/index.js',
  'backend/utils/solanaUtils.js'
];

requiredFiles.forEach(file => {
  const filePath = path.join(__dirname, file);
  if (fs.existsSync(filePath)) {
    console.log(chalk.green(`  ✅ ${file}`));
  } else {
    console.log(chalk.red(`  ❌ ${file} - MANQUANT`));
    errors++;
  }
});

// Test 2: Vérifier la configuration
console.log(chalk.yellow('\n🔧 Vérification de la configuration...'));

const envPath = path.join(__dirname, '.env');
if (fs.existsSync(envPath)) {
  console.log(chalk.green('  ✅ Fichier .env trouvé'));
} else {
  console.log(chalk.orange('  ⚠️  Fichier .env non trouvé - Utilisation des valeurs par défaut'));
  warnings++;
}

// Test 3: Vérifier les dépendances NPM
console.log(chalk.yellow('\n📦 Vérification des dépendances...'));

const packageJson = require('./package.json');
const requiredDeps = [
  '@solana/web3.js',
  '@solana/wallet-adapter-react',
  '@solana/spl-token',
  '@project-serum/anchor',
  'react',
  'react-router-dom'
];

requiredDeps.forEach(dep => {
  if (packageJson.dependencies[dep]) {
    console.log(chalk.green(`  ✅ ${dep}`));
  } else {
    console.log(chalk.red(`  ❌ ${dep} - NON INSTALLÉ`));
    errors++;
  }
});

// Test 4: Vérifier la connexion Solana
console.log(chalk.yellow('\n🌐 Test de connexion Solana...'));

async function testSolanaConnection() {
  try {
    const connection = new Connection('https://api.devnet.solana.com', 'confirmed');
    const version = await connection.getVersion();
    console.log(chalk.green(`  ✅ Connexion à Solana devnet réussie`));
    console.log(chalk.gray(`     Version: ${version['solana-core']}`));
    
    // Vérifier le programme
    const programId = new PublicKey('EJ7dWpEMiUJ5jTjg3EkfS2hGY48PSrEM8r54HrFgZNrA');
    const programInfo = await connection.getAccountInfo(programId);
    
    if (programInfo) {
      console.log(chalk.green(`  ✅ Programme de bonding curve trouvé`));
      console.log(chalk.gray(`     Taille: ${programInfo.data.length} bytes`));
    } else {
      console.log(chalk.orange(`  ⚠️  Programme de bonding curve non trouvé sur devnet`));
      warnings++;
    }
  } catch (error) {
    console.log(chalk.red(`  ❌ Erreur de connexion: ${error.message}`));
    errors++;
  }
}

// Test 5: Vérifier le backend
console.log(chalk.yellow('\n🖥️  Vérification du backend...'));

const backendKeypairPath = path.join(__dirname, 'backend', 'admin-keypair.json');
if (fs.existsSync(backendKeypairPath)) {
  console.log(chalk.green('  ✅ Fichier admin-keypair.json trouvé'));
} else {
  console.log(chalk.red('  ❌ Fichier admin-keypair.json MANQUANT'));
  console.log(chalk.gray('     Créez un wallet Solana et placez le keypair dans backend/admin-keypair.json'));
  errors++;
}

// Test 6: Vérifier les ports
console.log(chalk.yellow('\n🔌 Vérification des ports...'));

const net = require('net');

function checkPort(port, name) {
  return new Promise((resolve) => {
    const server = net.createServer();
    server.once('error', () => {
      console.log(chalk.orange(`  ⚠️  Port ${port} occupé (${name} peut être en cours d'exécution)`));
      warnings++;
      resolve();
    });
    server.once('listening', () => {
      console.log(chalk.green(`  ✅ Port ${port} disponible pour ${name}`));
      server.close();
      resolve();
    });
    server.listen(port);
  });
}

async function runTests() {
  await testSolanaConnection();
  await checkPort(3000, 'Frontend');
  await checkPort(4000, 'Backend');
  
  // Résumé
  console.log(chalk.blue.bold('\n📊 RÉSUMÉ DU TEST\n'));
  
  if (errors === 0 && warnings === 0) {
    console.log(chalk.green.bold('✨ Tout est prêt ! Le launchpad peut être démarré.'));
    console.log(chalk.gray('\nPour démarrer :'));
    console.log(chalk.gray('  1. Backend:  cd backend && npm start'));
    console.log(chalk.gray('  2. Frontend: npm start'));
  } else {
    if (errors > 0) {
      console.log(chalk.red(`❌ ${errors} erreur(s) trouvée(s) - Correction nécessaire`));
    }
    if (warnings > 0) {
      console.log(chalk.orange(`⚠️  ${warnings} avertissement(s) - Vérification recommandée`));
    }
    console.log(chalk.gray('\nConsultez setup.md pour plus d\'informations'));
  }
  
  console.log(chalk.blue('\n🔗 Liens utiles:'));
  console.log(chalk.gray('  • Solana Faucet: https://solfaucet.com/'));
  console.log(chalk.gray('  • Phantom Wallet: https://phantom.app/'));
  console.log(chalk.gray('  • Solana Explorer: https://explorer.solana.com/?cluster=devnet\n'));
}

runTests().catch(console.error);