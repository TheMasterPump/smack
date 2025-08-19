const fs = require('fs');
const path = require('path');

const idlPath = path.resolve(__dirname, './idl/meme_launch_bonding.json');

try {
  const content = fs.readFileSync(idlPath, 'utf8');
  console.log("IDL content OK !");
  console.log(content.substring(0, 300)); // Affiche le début
} catch (e) {
  console.error("Problème avec le fichier IDL :", e);
}
