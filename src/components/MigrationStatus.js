// 🔗 Composant de Status de Migration Raydium
// Interface moderne pour afficher le progrès vers la migration

import React, { useState, useEffect, useContext } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import { Connection } from '@solana/web3.js';
import { TokenDataContext } from '../contexts/TokenDataContext';
import { canMigrateToRaydium, simulateRaydiumMigration, executeRaydiumMigration } from '../utils/raydiumIntegration';
// Style inline pour cohérence avec TokenPage

const MigrationStatus = ({ mintAddress }) => {
  const wallet = useWallet();
  const { tokenData, loading } = useContext(TokenDataContext);
  const [connection] = useState(() => new Connection(process.env.REACT_APP_SOLANA_RPC_URL || 'https://api.devnet.solana.com'));
  
  const [migrationStatus, setMigrationStatus] = useState(null);
  const [migrationSimulation, setMigrationSimulation] = useState(null);
  const [isMigrating, setIsMigrating] = useState(false);
  const [showDetails, setShowDetails] = useState(false);

  // Calculer le status de migration
  useEffect(() => {
    if (tokenData) {
      const status = canMigrateToRaydium(tokenData);
      setMigrationStatus(status);
      
      // Auto-simuler si proche de la migration
      if (status.progress > 0.8 && wallet.connected) {
        handleSimulateMigration();
      }
    }
  }, [tokenData, wallet.connected]);

  const handleSimulateMigration = async () => {
    if (!tokenData || !wallet.connected) return;
    
    try {
      const simulation = await simulateRaydiumMigration(connection, mintAddress, tokenData, wallet);
      setMigrationSimulation(simulation);
    } catch (error) {
      console.error('Migration simulation error:', error);
    }
  };

  const handleExecuteMigration = async () => {
    if (!tokenData || !wallet.connected || !migrationStatus?.canMigrate) return;
    
    setIsMigrating(true);
    try {
      const result = await executeRaydiumMigration(wallet, connection, mintAddress, tokenData);
      
      if (result.success) {
        alert(`🎉 Migration réussie!\nPool Raydium: ${result.poolAddress}`);
        // Rafraîchir les données
        window.location.reload();
      } else {
        alert(`❌ Migration échouée: ${result.error}`);
      }
    } catch (error) {
      console.error('Migration error:', error);
      alert(`❌ Erreur migration: ${error.message}`);
    }
    setIsMigrating(false);
  };

  if (loading && !migrationStatus) {
    return (
      <div className="migration-status loading">
        <div className="loading-spinner">⏳</div>
        <p>Vérification migration...</p>
      </div>
    );
  }

  if (!migrationStatus) return null;

  const progressPercentage = Math.min(migrationStatus.progress * 100, 100);
  const isReadyToMigrate = migrationStatus.canMigrate;

  return (
    <div style={{
      background: "#181b20",
      borderRadius: 10,
      padding: "17px 15px 12px 15px",
      marginBottom: 19,
      boxShadow: "0 2px 10px #fb402319"
    }}>
      <div style={{
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        marginBottom: 15
      }}>
        <div>
          <h3 style={{
            color: "#ffcc32",
            fontSize: "1.21rem",
            fontWeight: 700,
            margin: 0,
            marginBottom: 5
          }}>🔗 Migration Raydium</h3>
          <span style={{
            background: isReadyToMigrate ? "#27eb91" : "#ffcc32",
            color: "#22232b",
            padding: "3px 12px",
            borderRadius: 6,
            fontWeight: "bold",
            fontSize: "0.85rem"
          }}>
            {isReadyToMigrate ? '✅ Prêt' : '⏳ En cours'}
          </span>
        </div>
        <button 
          style={{
            background: "none",
            border: "1px solid #333",
            color: "#fff",
            padding: "4px 8px",
            borderRadius: 4,
            cursor: "pointer",
            fontSize: 10
          }}
          onClick={() => setShowDetails(!showDetails)}
        >
          {showDetails ? '👆 Masquer' : '👇 Détails'}
        </button>
      </div>

      {/* Progress Bar */}
      <div style={{ marginBottom: 15 }}>
        <div style={{
          display: "flex",
          justifyContent: "space-between",
          marginBottom: 8,
          fontSize: "0.95rem",
          color: "#fff"
        }}>
          <span>Progrès vers la migration</span>
          <span style={{ color: "#ffcc32", fontWeight: "bold" }}>{progressPercentage.toFixed(1)}%</span>
        </div>
        <div style={{
          width: "100%",
          background: "#22232b",
          borderRadius: 8,
          height: 22,
          marginBottom: 10,
          overflow: "hidden",
          border: "1.5px solid #ffcc32",
          boxShadow: "0 1px 8px #fb40232a inset"
        }}>
          <div style={{
            background: "linear-gradient(90deg, #fb4023 50%, #ffcc32 100%)",
            height: "100%",
            width: `${progressPercentage}%`,
            transition: "width 0.4s",
            borderRadius: "7px 0 0 7px"
          }} />
        </div>
        <div style={{
          display: "flex",
          justifyContent: "space-between",
          fontSize: "0.9rem",
          color: "#fff5"
        }}>
          <span>{migrationStatus.currentSol.toFixed(2)} SOL collectés</span>
          <span>{migrationStatus.thresholdSol.toFixed(0)} SOL requis</span>
        </div>
      </div>

      {/* Status Message */}
      <div style={{
        padding: "12px",
        borderRadius: 8,
        marginBottom: 15,
        background: isReadyToMigrate ? "#27eb9120" : "#ffcc3220",
        border: isReadyToMigrate ? "1px solid #27eb91" : "1px solid #ffcc32",
        fontSize: "0.95rem"
      }}>
        {isReadyToMigrate ? (
          <div style={{ color: "#27eb91" }}>
            🎉 <strong>Prêt pour Raydium!</strong> Le token a atteint le seuil de migration.
          </div>
        ) : (
          <div style={{ color: "#ffcc32" }}>
            💰 <strong>{migrationStatus.requiredSol.toFixed(2)} SOL manquants</strong> pour déclencher la migration automatique.
          </div>
        )}
      </div>

      {/* Details Section */}
      {showDetails && (
        <div className="migration-details">
          {migrationSimulation?.success && (
            <div className="simulation-results">
              <h4>🧪 Simulation de Migration</h4>
              <div className="detail-grid">
                <div className="detail-item">
                  <span>Liquidité initiale:</span>
                  <span>
                    {migrationSimulation.migration.liquidityProvision.tokens.toFixed(1)}M tokens + {' '}
                    {migrationSimulation.migration.liquidityProvision.sol.toFixed(2)} SOL
                  </span>
                </div>
                <div className="detail-item">
                  <span>Prix initial:</span>
                  <span>${(migrationSimulation.migration.liquidityProvision.initialPrice * 1e6).toFixed(8)}</span>
                </div>
                <div className="detail-item">
                  <span>Frais estimés:</span>
                  <span>{migrationSimulation.migration.estimatedFees.total.toFixed(3)} SOL</span>
                </div>
                <div className="detail-item">
                  <span>Temps estimé:</span>
                  <span>{migrationSimulation.migration.timeline.total}</span>
                </div>
              </div>
              
              <div className="benefits">
                <h5>📈 Avantages post-migration:</h5>
                <ul>
                  <li>✅ Liquidité plus profonde</li>
                  <li>✅ Slippage réduit</li>
                  <li>✅ Accès institutionnel</li>
                  <li>✅ {migrationSimulation.migration.benefits.tradingVolume}</li>
                </ul>
              </div>
            </div>
          )}
          
          {!migrationSimulation && wallet.connected && (
            <button 
              className="simulate-button"
              onClick={handleSimulateMigration}
            >
              🧪 Simuler Migration
            </button>
          )}
        </div>
      )}

      {/* Migration Button */}
      {isReadyToMigrate && (
        <button
          style={{
            background: (!wallet.connected || isMigrating) ? "#666" : "#fb4023",
            color: "#fff",
            border: "none",
            borderRadius: 8,
            padding: "12px 0",
            width: "100%",
            fontWeight: "bold",
            fontSize: "1.08rem",
            cursor: (!wallet.connected || isMigrating) ? "not-allowed" : "pointer",
            marginBottom: 15,
            boxShadow: "0 1px 8px #fb402340",
            transition: "background 0.17s"
          }}
          onClick={handleExecuteMigration}
          disabled={!wallet.connected || isMigrating}
        >
          {isMigrating ? (
            <>⏳ Migration en cours...</>
          ) : !wallet.connected ? (
            'Connecter le Wallet pour Migrer'
          ) : (
            '🚀 Migrer vers Raydium'
          )}
        </button>
      )}

      {/* Development Note */}
      <div style={{
        background: "#22232b",
        border: "1px solid #333",
        borderRadius: 6,
        padding: "8px 10px",
        fontSize: "0.85rem",
        color: "#888",
        textAlign: "center"
      }}>
        🚧 <strong>Note:</strong> Migration Raydium en développement - simulation fonctionnelle
      </div>
    </div>
  );
};

export default MigrationStatus;