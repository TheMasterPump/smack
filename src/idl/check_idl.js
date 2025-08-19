const idl = require('./meme_launch_bonding.json');
console.log("==== DEBUG IDL ====");
console.log("Instructions:");
idl.instructions.forEach(i => console.log("-", i.name));
console.log("\nAccounts:");
idl.accounts.forEach(a => {
  console.log("-", a.name, "->", a.type ? "OK" : "MANQUE TYPE!");
});
console.log("\nChamp accounts complet ?", !!idl.accounts && Array.isArray(idl.accounts));
console.log("Exemple BondingCurve type:", JSON.stringify(idl.accounts.find(a => a.name === "BondingCurve"), null, 2));
