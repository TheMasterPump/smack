import React, { useState } from 'react';
import { useWallet, useConnection } from '@solana/wallet-adapter-react';
import { initializeGlobal, getGlobalPDA } from './utils/bondingClient';

export default function AdminPanel() {
  const wallet = useWallet();
  const { connection } = useConnection();
  const [status, setStatus] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleInitializeGlobal() {
    if (!wallet.connected) {
      setStatus('❌ Connectez votre wallet');
      return;
    }

    setLoading(true);
    setStatus('⏳ Initialisation du global state...');
    
    try {
      // Check if global already exists
      const globalPda = await getGlobalPDA();
      const accountInfo = await connection.getAccountInfo(globalPda);
      
      if (accountInfo) {
        setStatus('ℹ️ Global state déjà initialisé: ' + globalPda.toBase58());
        return;
      }

      const result = await initializeGlobal(wallet, connection);
      setStatus('✅ Global state initialisé: ' + result);
    } catch (error) {
      setStatus('❌ Erreur: ' + (error.message || error));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{
      background: '#1a1a1a',
      color: 'white',
      padding: '20px',
      borderRadius: '8px',
      margin: '20px',
      maxWidth: '500px'
    }}>
      <h2 style={{ color: '#ffd42b' }}>🛠️ Panel d'Administration</h2>
      <p>Ce panel permet d'initialiser les comptes nécessaires pour les bonding curves.</p>
      
      <div style={{ marginTop: '20px' }}>
        <button
          onClick={handleInitializeGlobal}
          disabled={loading || !wallet.connected}
          style={{
            background: wallet.connected ? '#27eb91' : '#666',
            color: '#000',
            border: 'none',
            padding: '12px 24px',
            borderRadius: '6px',
            fontWeight: 'bold',
            cursor: wallet.connected ? 'pointer' : 'not-allowed'
          }}
        >
          {loading ? 'Initialisation...' : 'Initialiser Global State'}
        </button>
      </div>

      {status && (
        <div style={{
          marginTop: '15px',
          padding: '10px',
          borderRadius: '4px',
          background: status.includes('❌') ? '#3d1a00' : status.includes('✅') ? '#003d1a' : '#1a1a3d',
          border: `1px solid ${status.includes('❌') ? '#ff4444' : status.includes('✅') ? '#44ff44' : '#4444ff'}`
        }}>
          {status}
        </div>
      )}

      <div style={{ marginTop: '20px', fontSize: '14px', color: '#888' }}>
        <strong>Note:</strong> L'initialisation du global state n'est nécessaire qu'une seule fois sur le réseau Solana.
      </div>
    </div>
  );
}