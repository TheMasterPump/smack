/**
 * Script pour corriger TokenForm.js en supprimant l'ancien code de retry
 */

const fs = require('fs');
const path = require('path');

function fixTokenForm() {
  const filePath = path.join(__dirname, 'src', 'TokenForm.js');
  const content = fs.readFileSync(filePath, 'utf8');
  
  console.log('🔧 Correction de TokenForm.js...\n');
  
  // Trouver et supprimer l'ancien code de retry
  const lines = content.split('\n');
  const newLines = [];
  let skipSection = false;
  let braceCount = 0;
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    
    // Détecter le début de l'ancienne fonction de retry
    if (line.includes('for (let attempt = 1; attempt <= maxRetries; attempt++)')) {
      console.log(`Ligne ${i + 1}: Début de l'ancien code de retry détecté`);
      skipSection = true;
      braceCount = 0;
      continue;
    }
    
    if (skipSection) {
      // Compter les accolades pour savoir quand s'arrêter
      const openBraces = (line.match(/\{/g) || []).length;
      const closeBraces = (line.match(/\}/g) || []).length;
      braceCount += openBraces - closeBraces;
      
      // Si on arrive à la fin de la section
      if (braceCount <= -2) {
        console.log(`Ligne ${i + 1}: Fin de l'ancien code de retry détecté`);
        skipSection = false;
      }
      continue;
    }
    
    newLines.push(line);
  }
  
  // Écrire le fichier corrigé
  const newContent = newLines.join('\n');
  fs.writeFileSync(filePath, newContent, 'utf8');
  
  console.log('✅ TokenForm.js corrigé !');
  console.log(`Lignes supprimées: ${lines.length - newLines.length}`);
  console.log(`Lignes restantes: ${newLines.length}\n`);
  
  // Vérifier qu'il n'y a plus d'erreurs
  const hasOldRetry = newContent.includes('for (let attempt = 1; attempt <= maxRetries');
  const hasSendTransactionWithRetry = newContent.includes('sendTransactionWithRetry');
  
  if (hasOldRetry || hasSendTransactionWithRetry) {
    console.log('⚠️  Il reste encore de l\'ancien code à nettoyer');
  } else {
    console.log('✅ Nettoyage complet terminé');
  }
}

console.log('🧹 NETTOYAGE DE TOKENFORM.JS\n');
fixTokenForm();