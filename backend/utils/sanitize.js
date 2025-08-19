// Fonction de base pour nettoyer les chaînes
function sanitizeString(str, max = 100) {
  if (typeof str !== "string") return "";
  // Enlève les caractères dangereux de base
  let s = str.replace(/[<>"'`;]/g, "");
  // Limite la longueur à max caractères
  return s.slice(0, max);
}

module.exports = { sanitizeString };
