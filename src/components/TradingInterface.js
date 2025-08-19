// 🎨 Interface de Trading Moderne avec Simulation
// Inspiré des meilleurs patterns de Pump.fun et Auto.fun

import React, { useState, useEffect, useContext } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import { Connection } from '@solana/web3.js';
import { TokenDataContext } from '../contexts/TokenDataContext';
import { simulateBuyTokens, simulateSellTokens, buyTokens, sellTokens } from '../utils/pumpFunV2Client';
import { TradingSkeleton } from './SkeletonLoader';
// Style inline pour cohérence avec TokenPage

const TradingInterface = ({ mintAddress }) => {
  const wallet = useWallet();
  const { tokenData, loading, refetch } = useContext(TokenDataContext);
  const [connection] = useState(() => new Connection(process.env.REACT_APP_SOLANA_RPC_URL || 'https://api.devnet.solana.com'));

  // États du trading
  const [activeTab, setActiveTab] = useState('buy');
  const [amount, setAmount] = useState('');
  const [simulationResult, setSimulationResult] = useState(null);
  const [isSimulating, setIsSimulating] = useState(false);
  const [isTrading, setIsTrading] = useState(false);

  // Auto-simulation quand l'utilisateur tape
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      if (amount && parseFloat(amount) > 0 && wallet.connected && tokenData) {
        handleSimulation();
      }
    }, 500);

    return () => clearTimeout(timeoutId);
  }, [amount, activeTab, tokenData]);

  const handleSimulation = async () => {
    if (!amount || !wallet.connected || !tokenData) return;
    
    setIsSimulating(true);
    try {
      const tokenAmount = parseFloat(amount) * 1e6; // Convert to micro tokens
      
      let result;
      if (activeTab === 'buy') {
        const currentPrice = typeof tokenData.currentPrice === 'number' ? tokenData.currentPrice : 0.000001;
        const maxSolCost = (tokenAmount / 1e6) * currentPrice * 1.05; // 5% slippage
        result = await simulateBuyTokens(wallet, connection, mintAddress, tokenAmount, maxSolCost);
      } else {
        const currentPrice = typeof tokenData.currentPrice === 'number' ? tokenData.currentPrice : 0.000001;
        const minSolOutput = (tokenAmount / 1e6) * currentPrice * 0.95; // 5% slippage
        result = await simulateSellTokens(wallet, connection, mintAddress, tokenAmount, minSolOutput);
      }
      
      setSimulationResult(result);
    } catch (error) {
      console.error('Simulation error:', error);
      setSimulationResult({ success: false, error: error.message });
    }
    setIsSimulating(false);
  };

  const handleTrade = async () => {
    if (!amount || !wallet.connected || !simulationResult?.success) return;
    
    setIsTrading(true);
    try {
      const tokenAmount = parseFloat(amount) * 1e6;
      
      // 🚧 MODE DÉVELOPPEMENT - Utiliser seulement simulation jusqu'au déploiement du smart contract
      console.log(`🚧 MODE DEV: Simulation ${activeTab} de ${tokenAmount / 1e6} tokens`);
      
      // Simuler un délai pour imiter une vraie transaction
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      const result = {
        success: true,
        signature: `DEV_${Date.now()}`,
        confirmed: true
      };
      
      if (result.success) {
        // 🔥 SYNCHRONISER avec le backend après transaction réelle
        try {
          if (activeTab === 'buy') {
            const solCostInLamports = Math.round(simulationResult.totalCost * 1e9); // Convertir en lamports
            await fetch('http://localhost:4000/api/simulate-purchase', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                mintAddress: mintAddress,
                tokenAmount: tokenAmount,
                solCost: solCostInLamports
              })
            });
            
            console.log(`✅ Achat synchronisé: ${tokenAmount / 1e6} tokens, ${simulationResult.totalCost} SOL`);
          } else {
            // Pour les ventes, tokens négatifs et SOL négatif 
            const solReceivedInLamports = Math.round(simulationResult.netSolOutput * 1e9);
            await fetch('http://localhost:4000/api/simulate-purchase', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                mintAddress: mintAddress,
                tokenAmount: -tokenAmount, // Négatif pour vente
                solCost: -solReceivedInLamports // Négatif car on reçoit du SOL
              })
            });
            
            console.log(`✅ Vente synchronisée: ${tokenAmount / 1e6} tokens, ${simulationResult.netSolOutput} SOL reçus`);
          }
        } catch (syncError) {
          console.error('Erreur synchronisation:', syncError);
        }

        setAmount('');
        setSimulationResult(null);
        
        // 🔄 RAFRAÎCHIR LES DONNÉES après l'achat réussi
        console.log(`✅ Transaction ${activeTab} réussie - rafraîchissement des données...`);
        setTimeout(() => {
          refetch(); // Rafraîchir les données du token
        }, 1000); // Petit délai pour laisser le backend se synchroniser
      }
    } catch (error) {
      console.error('Trading error:', error);
    }
    setIsTrading(false);
  };

  if (loading) {
    return <TradingSkeleton />;
  }

  return (
    <div style={{
      background: "#181b20",
      borderRadius: 10,
      padding: "17px 15px 12px 15px",
      marginBottom: 19,
      boxShadow: "0 2px 10px #fb402319"
    }}>
      <div style={{
        marginBottom: 15
      }}>
        <h3 style={{
          color: "#ffcc32",
          fontSize: "1.21rem",
          fontWeight: 700,
          margin: 0,
          marginBottom: 8
        }}>🚀 Trading Interface V2</h3>
        <div style={{
          display: "flex",
          gap: "15px",
          fontSize: "0.9rem",
          color: "#888"
        }}>
          <span>Prix: <span style={{color: "#27eb91"}}>${typeof tokenData?.currentPrice === 'number' ? tokenData.currentPrice.toFixed(8) : 'N/A'}</span></span>
          <span>Market Cap: <span style={{color: "#ffd42b"}}>${tokenData?.marketCap || 'N/A'}</span></span>
        </div>
      </div>

      {/* Tabs Buy/Sell */}
      <div style={{
        display: "flex",
        marginBottom: 15
      }}>
        <button 
          style={{
            flex: 1,
            background: activeTab === 'buy' ? "#27eb91" : "#232324",
            color: activeTab === 'buy' ? "#22232b" : "#ffcc32",
            border: "none",
            borderRadius: "7px 7px 0 0",
            fontSize: "1.09rem",
            fontWeight: 700,
            padding: "10px 0",
            cursor: "pointer",
            marginRight: 7,
            transition: "background 0.17s, color 0.17s"
          }}
          onClick={() => setActiveTab('buy')}
        >
          💰 Acheter
        </button>
        <button 
          style={{
            flex: 1,
            background: activeTab === 'sell' ? "#fb4023" : "#232324",
            color: activeTab === 'sell' ? "#fff" : "#ffcc32",
            border: "none",
            borderRadius: "7px 7px 0 0",
            fontSize: "1.09rem",
            fontWeight: 700,
            padding: "10px 0",
            cursor: "pointer",
            transition: "background 0.17s, color 0.17s"
          }}
          onClick={() => setActiveTab('sell')}
        >
          💸 Vendre
        </button>
      </div>

      {/* Input Amount */}
      <div style={{ marginBottom: 15 }}>
        <label style={{
          display: "block",
          color: "#ffcc32",
          fontSize: "0.9rem",
          marginBottom: 8,
          fontWeight: "bold"
        }}>Quantité de Tokens</label>
        <input
          type="number"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          placeholder={`Ex: 1000000`}
          min="1"
          step="1000"
          style={{
            width: "100%",
            background: "#22232b",
            color: "#fff",
            border: "1.5px solid #27eb91",
            borderRadius: 8,
            fontSize: "1.05rem",
            marginBottom: 8,
            padding: 10,
            outline: "none",
            transition: "border 0.18s"
          }}
        />
        <div style={{
          display: "flex",
          gap: 7,
          marginBottom: 10
        }}>
          {[100000, 500000, 1000000, 5000000].map(amt => (
            <button 
              key={amt} 
              onClick={() => setAmount(amt.toString())}
              style={{
                background: "#24242a",
                color: "#ffcc32",
                border: "1.3px solid #fb4023",
                borderRadius: 7,
                padding: "5px 13px",
                fontWeight: 700,
                fontSize: 14,
                cursor: "pointer",
                transition: "background 0.18s, color 0.18s"
              }}
            >
              {(amt / 1e6).toFixed(1)}M
            </button>
          ))}
        </div>
      </div>

      {/* Simulation Results */}
      {simulationResult && (
        <div className={`simulation-results ${simulationResult.success ? 'success' : 'error'}`}>
          <h4>
            🧪 Simulation {simulationResult.success ? '✅' : '❌'}
          </h4>
          
          {simulationResult.success ? (
            <div className="sim-details">
              {activeTab === 'buy' ? (
                <>
                  <div className="sim-row">
                    <span>Coût SOL:</span>
                    <span>{simulationResult.solCost?.toFixed(6)} SOL</span>
                  </div>
                  <div className="sim-row">
                    <span>Frais trading:</span>
                    <span>{simulationResult.tradingFee?.toFixed(6)} SOL</span>
                  </div>
                  <div className="sim-row">
                    <span>Frais réseau:</span>
                    <span>{simulationResult.networkFees?.toFixed(6)} SOL</span>
                  </div>
                  <div className="sim-row total">
                    <span>Total:</span>
                    <span>{simulationResult.totalCost?.toFixed(6)} SOL</span>
                  </div>
                  <div className="sim-row">
                    <span>Impact prix:</span>
                    <span className={simulationResult.priceImpact > 10 ? 'warning' : ''}>
                      {simulationResult.priceImpact?.toFixed(2)}%
                    </span>
                  </div>
                  {simulationResult.needsTokenAccount && (
                    <div className="sim-warning">
                      ⚠️ Création compte token requise (+0.00203 SOL)
                    </div>
                  )}
                </>
              ) : (
                <>
                  <div className="sim-row">
                    <span>SOL brut:</span>
                    <span>{simulationResult.grossSolOutput?.toFixed(6)} SOL</span>
                  </div>
                  <div className="sim-row">
                    <span>Frais trading:</span>
                    <span>-{simulationResult.tradingFee?.toFixed(6)} SOL</span>
                  </div>
                  <div className="sim-row">
                    <span>Frais réseau:</span>
                    <span>-{simulationResult.networkFees?.toFixed(6)} SOL</span>
                  </div>
                  <div className="sim-row total">
                    <span>Vous recevez:</span>
                    <span>{simulationResult.netSolOutput?.toFixed(6)} SOL</span>
                  </div>
                  <div className="sim-row">
                    <span>Impact prix:</span>
                    <span>{simulationResult.priceImpact?.toFixed(2)}%</span>
                  </div>
                </>
              )}
              
              <div className="sim-slippage">
                {simulationResult.slippageOk ? (
                  <span className="ok">✅ Slippage OK</span>
                ) : (
                  <span className="error">❌ Slippage trop élevé</span>
                )}
              </div>
            </div>
          ) : (
            <div className="sim-error">
              ❌ {simulationResult.error}
            </div>
          )}
        </div>
      )}

      {/* Trading Button */}
      <button
        style={{
          width: "100%",
          background: (!wallet.connected || !amount || isTrading || !simulationResult?.success) 
            ? "#666" 
            : activeTab === 'buy' ? "#27eb91" : "#fb4023",
          color: activeTab === 'buy' ? "#22232b" : "#fff",
          border: "none",
          borderRadius: 8,
          padding: "12px 0",
          fontWeight: "bold",
          fontSize: "1.08rem",
          cursor: (!wallet.connected || !amount || isTrading || !simulationResult?.success) 
            ? "not-allowed" : "pointer",
          marginBottom: 10,
          boxShadow: "0 1px 8px rgba(39,235,145,0.4)",
          transition: "background 0.17s"
        }}
        onClick={handleTrade}
        disabled={!wallet.connected || !amount || isTrading || !simulationResult?.success}
      >
        {isTrading ? (
          <>⏳ Transaction en cours...</>
        ) : !wallet.connected ? (
          'Connecter le Wallet'
        ) : !simulationResult?.success ? (
          'Entrer un montant valide'
        ) : activeTab === 'buy' ? (
          `💰 Acheter ${(parseFloat(amount) / 1e6).toFixed(1)}M tokens`
        ) : (
          `💸 Vendre ${(parseFloat(amount) / 1e6).toFixed(1)}M tokens`
        )}
      </button>

      {/* Simulation indicator */}
      {isSimulating && (
        <div style={{
          textAlign: "center",
          color: "#ffcc32",
          fontSize: "0.9rem",
          fontWeight: "bold"
        }}>
          ⚡ Simulation en cours...
        </div>
      )}
    </div>
  );
};

export default TradingInterface;