const nacl = require('tweetnacl');
const bs58 = require('bs58');

// Mets ici TON adresse wallet admin (Solana, ex : "4M...Tu5e")
const ADMIN_WALLET = process.env.ADMIN_WALLET;

function authWallet(req, res, next) {
  try {
    // Le front doit envoyer dans les headers : address, signature, et message
    const address = req.headers['x-wallet-address'];
    const signature = req.headers['x-wallet-signature'];
    const message = req.headers['x-wallet-message'];

    if (!address || !signature || !message) {
      return res.status(401).json({ error: 'Missing wallet auth headers' });
    }

    // On vérifie que l'adresse est bien celle de l'admin
    if (address !== ADMIN_WALLET) {
      return res.status(403).json({ error: 'Not authorized' });
    }

    // Vérifier la signature (Solana)
    const verified = nacl.sign.detached.verify(
      Buffer.from(message),
      bs58.decode(signature),
      bs58.decode(address)
    );

    if (!verified) {
      return res.status(401).json({ error: 'Invalid signature' });
    }

    // OK, c'est l'admin !
    next();
  } catch (err) {
    res.status(500).json({ error: 'Wallet auth failed: ' + err.message });
  }
}

module.exports = authWallet;
