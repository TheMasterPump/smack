console.log('Testing Firebase Functions setup...');

try {
  const functions = require('firebase-functions');
  console.log('✅ Firebase Functions loaded');
} catch (e) {
  console.log('❌ Firebase Functions failed:', e.message);
}

try {
  const admin = require('firebase-admin');
  console.log('✅ Firebase Admin loaded');
} catch (e) {
  console.log('❌ Firebase Admin failed:', e.message);
}

try {
  const anchor = require('@project-serum/anchor');
  console.log('✅ Solana/Anchor loaded in Functions');
} catch (e) {
  console.log('❌ Solana failed:', e.message);
}

console.log('🔥 Firebase Functions + Solana test complete!');