// 📈 Advanced Trading Features
import React, { useState, useContext, useEffect } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import { TokenDataContext } from '../contexts/TokenDataContext';
import { useNotifications } from './NotificationSystem';

const AdvancedTrading = ({ mintAddress }) => {
  const wallet = useWallet();
  const { tokenData } = useContext(TokenDataContext);
  const notifications = useNotifications();

  // States pour stop-loss et take-profit
  const [stopLoss, setStopLoss] = useState({ enabled: false, price: '', percentage: '' });
  const [takeProfit, setTakeProfit] = useState({ enabled: false, price: '', percentage: '' });
  const [orderHistory, setOrderHistory] = useState([]);
  
  // DCA (Dollar Cost Averaging)
  const [dcaSettings, setDcaSettings] = useState({ 
    enabled: false, 
    amount: '', 
    interval: '1h', 
    duration: '24h' 
  });

  // Responsive grid state
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth <= 600);
    };
    
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  const currentPrice = parseFloat(tokenData?.currentPrice || 0);

  // Style commun pour tous les inputs
  const inputStyle = {
    background: '#22232b',
    color: '#fff',
    padding: '8px',
    borderRadius: 4,
    fontSize: '0.9rem',
    width: '100%',
    boxSizing: 'border-box',
    minWidth: 0
  };

  // Calculer prix basé sur pourcentage
  const calculatePriceFromPercentage = (percentage, isIncrease = true) => {
    if (!currentPrice || !percentage) return '';
    const multiplier = isIncrease ? (1 + percentage / 100) : (1 - percentage / 100);
    return (currentPrice * multiplier).toFixed(8);
  };

  // Calculer pourcentage basé sur prix
  const calculatePercentageFromPrice = (price, isIncrease = true) => {
    if (!currentPrice || !price) return '';
    const percentage = ((price - currentPrice) / currentPrice) * 100;
    return percentage.toFixed(2);
  };

  // Activer Stop Loss
  const enableStopLoss = async () => {
    if (!stopLoss.price || !wallet.connected) return;
    
    try {
      // Simuler l'activation du stop loss
      setStopLoss(prev => ({ ...prev, enabled: true }));
      notifications.success(`Stop Loss activé à $${stopLoss.price}`, 'Order Placed');
      
      // Ajouter à l'historique
      setOrderHistory(prev => [...prev, {
        type: 'Stop Loss',
        price: stopLoss.price,
        timestamp: Date.now(),
        status: 'Active'
      }]);
    } catch (error) {
      notifications.error('Failed to set Stop Loss', 'Order Error');
    }
  };

  // Activer Take Profit
  const enableTakeProfit = async () => {
    if (!takeProfit.price || !wallet.connected) return;
    
    try {
      setTakeProfit(prev => ({ ...prev, enabled: true }));
      notifications.success(`Take Profit activé à $${takeProfit.price}`, 'Order Placed');
      
      setOrderHistory(prev => [...prev, {
        type: 'Take Profit',
        price: takeProfit.price,
        timestamp: Date.now(),
        status: 'Active'
      }]);
    } catch (error) {
      notifications.error('Failed to set Take Profit', 'Order Error');
    }
  };

  // Activer DCA
  const enableDCA = async () => {
    if (!dcaSettings.amount || !wallet.connected) return;
    
    try {
      setDcaSettings(prev => ({ ...prev, enabled: true }));
      notifications.success(`DCA activé: $${dcaSettings.amount} tous les ${dcaSettings.interval}`, 'DCA Started');
    } catch (error) {
      notifications.error('Failed to start DCA', 'DCA Error');
    }
  };

  return (
    <div style={{
      background: "#181b20",
      borderRadius: 10,
      padding: "17px 15px",
      marginBottom: 19,
      boxShadow: "0 2px 10px #fb402319",
      maxWidth: "100%",
      overflow: "hidden"
    }}>
      <h3 style={{ color: '#ffcc32', margin: 0, marginBottom: 15, fontSize: '1.1rem' }}>
        ⚡ Advanced Trading
      </h3>

      {/* Stop Loss Section */}
      <div style={{ marginBottom: 20 }}>
        <div style={{ 
          display: 'flex', 
          alignItems: 'center', 
          marginBottom: 10,
          color: '#fb4023'
        }}>
          <span style={{ marginRight: 8 }}>🛑</span>
          <strong>Stop Loss</strong>
          {stopLoss.enabled && <span style={{ marginLeft: 8, fontSize: '0.8rem', color: '#27eb91' }}>✅ Active</span>}
        </div>
        
        <div style={{ 
          display: 'grid', 
          gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', 
          gap: 10, 
          marginBottom: 10 
        }}>
          <input
            type="number"
            placeholder="Prix ($)"
            value={stopLoss.price}
            onChange={(e) => {
              const price = e.target.value;
              setStopLoss(prev => ({ 
                ...prev, 
                price,
                percentage: calculatePercentageFromPrice(price, false)
              }));
            }}
            style={{
              ...inputStyle,
              border: '1px solid #fb4023'
            }}
          />
          <input
            type="number"
            placeholder="% perte"
            value={stopLoss.percentage}
            onChange={(e) => {
              const percentage = e.target.value;
              setStopLoss(prev => ({ 
                ...prev, 
                percentage,
                price: calculatePriceFromPercentage(percentage, false)
              }));
            }}
            style={{
              ...inputStyle,
              border: '1px solid #fb4023'
            }}
          />
        </div>
        
        <button
          onClick={stopLoss.enabled ? () => setStopLoss(prev => ({ ...prev, enabled: false })) : enableStopLoss}
          disabled={!wallet.connected}
          style={{
            background: stopLoss.enabled ? '#666' : '#fb4023',
            color: '#fff',
            border: 'none',
            padding: '8px 16px',
            borderRadius: 4,
            fontSize: '0.9rem',
            cursor: wallet.connected ? 'pointer' : 'not-allowed',
            width: '100%'
          }}
        >
          {stopLoss.enabled ? '🛑 Cancel Stop Loss' : '🛑 Set Stop Loss'}
        </button>
      </div>

      {/* Take Profit Section */}
      <div style={{ marginBottom: 20 }}>
        <div style={{ 
          display: 'flex', 
          alignItems: 'center', 
          marginBottom: 10,
          color: '#27eb91'
        }}>
          <span style={{ marginRight: 8 }}>🎯</span>
          <strong>Take Profit</strong>
          {takeProfit.enabled && <span style={{ marginLeft: 8, fontSize: '0.8rem', color: '#27eb91' }}>✅ Active</span>}
        </div>
        
        <div style={{ 
          display: 'grid', 
          gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', 
          gap: 10, 
          marginBottom: 10 
        }}>
          <input
            type="number"
            placeholder="Prix ($)"
            value={takeProfit.price}
            onChange={(e) => {
              const price = e.target.value;
              setTakeProfit(prev => ({ 
                ...prev, 
                price,
                percentage: calculatePercentageFromPrice(price, true)
              }));
            }}
            style={{
              ...inputStyle,
              border: '1px solid #27eb91'
            }}
          />
          <input
            type="number"
            placeholder="% gain"
            value={takeProfit.percentage}
            onChange={(e) => {
              const percentage = e.target.value;
              setTakeProfit(prev => ({ 
                ...prev, 
                percentage,
                price: calculatePriceFromPercentage(percentage, true)
              }));
            }}
            style={{
              ...inputStyle,
              border: '1px solid #27eb91'
            }}
          />
        </div>
        
        <button
          onClick={takeProfit.enabled ? () => setTakeProfit(prev => ({ ...prev, enabled: false })) : enableTakeProfit}
          disabled={!wallet.connected}
          style={{
            background: takeProfit.enabled ? '#666' : '#27eb91',
            color: takeProfit.enabled ? '#fff' : '#22232b',
            border: 'none',
            padding: '8px 16px',
            borderRadius: 4,
            fontSize: '0.9rem',
            cursor: wallet.connected ? 'pointer' : 'not-allowed',
            width: '100%',
            fontWeight: 'bold'
          }}
        >
          {takeProfit.enabled ? '🎯 Cancel Take Profit' : '🎯 Set Take Profit'}
        </button>
      </div>

      {/* DCA Section */}
      <div style={{ marginBottom: 20 }}>
        <div style={{ 
          display: 'flex', 
          alignItems: 'center', 
          marginBottom: 10,
          color: '#ffcc32'
        }}>
          <span style={{ marginRight: 8 }}>📊</span>
          <strong>Dollar Cost Averaging</strong>
          {dcaSettings.enabled && <span style={{ marginLeft: 8, fontSize: '0.8rem', color: '#27eb91' }}>✅ Running</span>}
        </div>
        
        <div style={{ 
          display: 'grid', 
          gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', 
          gap: 10, 
          marginBottom: 10 
        }}>
          <input
            type="number"
            placeholder="Montant ($)"
            value={dcaSettings.amount}
            onChange={(e) => setDcaSettings(prev => ({ ...prev, amount: e.target.value }))}
            style={{
              ...inputStyle,
              border: '1px solid #ffcc32'
            }}
          />
          <select
            value={dcaSettings.interval}
            onChange={(e) => setDcaSettings(prev => ({ ...prev, interval: e.target.value }))}
            style={{
              ...inputStyle,
              border: '1px solid #ffcc32'
            }}
          >
            <option value="15m">15 min</option>
            <option value="1h">1 heure</option>
            <option value="4h">4 heures</option>
            <option value="1d">1 jour</option>
          </select>
        </div>
        
        <button
          onClick={dcaSettings.enabled ? () => setDcaSettings(prev => ({ ...prev, enabled: false })) : enableDCA}
          disabled={!wallet.connected}
          style={{
            background: dcaSettings.enabled ? '#666' : '#ffcc32',
            color: dcaSettings.enabled ? '#fff' : '#22232b',
            border: 'none',
            padding: '8px 16px',
            borderRadius: 4,
            fontSize: '0.9rem',
            cursor: wallet.connected ? 'pointer' : 'not-allowed',
            width: '100%',
            fontWeight: 'bold'
          }}
        >
          {dcaSettings.enabled ? '📊 Stop DCA' : '📊 Start DCA'}
        </button>
      </div>

      {/* Order History */}
      {orderHistory.length > 0 && (
        <div>
          <h4 style={{ color: '#ffcc32', margin: 0, marginBottom: 10, fontSize: '1rem' }}>
            📋 Active Orders
          </h4>
          {orderHistory.slice(-3).map((order, index) => (
            <div key={index} style={{
              display: 'flex',
              justifyContent: 'space-between',
              padding: '8px',
              background: '#22232b',
              borderRadius: 4,
              marginBottom: 5,
              fontSize: '0.85rem'
            }}>
              <span style={{ color: order.type.includes('Stop') ? '#fb4023' : '#27eb91' }}>
                {order.type}
              </span>
              <span style={{ color: '#fff' }}>${order.price}</span>
              <span style={{ color: '#27eb91', fontSize: '0.7rem' }}>
                {order.status}
              </span>
            </div>
          ))}
        </div>
      )}

      {/* Current Price Reference */}
      <div style={{
        background: '#22232b',
        padding: '8px',
        borderRadius: 4,
        marginTop: 10,
        textAlign: 'center',
        border: '1px solid #333'
      }}>
        <div style={{ color: '#888', fontSize: '0.8rem' }}>Prix actuel</div>
        <div style={{ color: '#27eb91', fontSize: '1rem', fontWeight: 'bold' }}>
          ${currentPrice.toFixed(8)}
        </div>
      </div>
    </div>
  );
};

export default AdvancedTrading;