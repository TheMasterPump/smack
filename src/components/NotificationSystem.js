// 🔔 Système de notifications et alertes
import React, { createContext, useContext, useState, useEffect } from 'react';

const NotificationContext = createContext();

export const useNotifications = () => {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error('useNotifications must be used within a NotificationProvider');
  }
  return context;
};

// Types de notifications
const NOTIFICATION_TYPES = {
  SUCCESS: 'success',
  ERROR: 'error', 
  WARNING: 'warning',
  INFO: 'info',
  PRICE_ALERT: 'price_alert',
  MIGRATION_ALERT: 'migration_alert'
};

// Composant notification individuelle
const Notification = ({ notification, onClose }) => {
  const getIcon = (type) => {
    switch (type) {
      case NOTIFICATION_TYPES.SUCCESS: return '✅';
      case NOTIFICATION_TYPES.ERROR: return '❌';
      case NOTIFICATION_TYPES.WARNING: return '⚠️';
      case NOTIFICATION_TYPES.INFO: return 'ℹ️';
      case NOTIFICATION_TYPES.PRICE_ALERT: return '📈';
      case NOTIFICATION_TYPES.MIGRATION_ALERT: return '🚀';
      default: return 'ℹ️';
    }
  };

  const getColor = (type) => {
    switch (type) {
      case NOTIFICATION_TYPES.SUCCESS: return '#27eb91';
      case NOTIFICATION_TYPES.ERROR: return '#fb4023';
      case NOTIFICATION_TYPES.WARNING: return '#ffd42b';
      case NOTIFICATION_TYPES.INFO: return '#ffcc32';
      case NOTIFICATION_TYPES.PRICE_ALERT: return '#27eb91';
      case NOTIFICATION_TYPES.MIGRATION_ALERT: return '#fb4023';
      default: return '#ffcc32';
    }
  };

  useEffect(() => {
    if (notification.autoClose !== false) {
      const timer = setTimeout(() => {
        onClose(notification.id);
      }, notification.duration || 5000);
      
      return () => clearTimeout(timer);
    }
  }, [notification, onClose]);

  return (
    <div
      style={{
        background: '#22232b',
        border: `2px solid ${getColor(notification.type)}`,
        borderRadius: 8,
        padding: '12px 16px',
        marginBottom: 12,
        boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
        display: 'flex',
        alignItems: 'center',
        gap: 12,
        maxWidth: 400,
        animation: 'slideIn 0.3s ease-out'
      }}
    >
      <span style={{ fontSize: '18px' }}>{getIcon(notification.type)}</span>
      <div style={{ flex: 1 }}>
        {notification.title && (
          <div style={{ 
            color: getColor(notification.type), 
            fontWeight: 'bold', 
            fontSize: '14px',
            marginBottom: 4
          }}>
            {notification.title}
          </div>
        )}
        <div style={{ color: '#fff', fontSize: '13px' }}>
          {notification.message}
        </div>
      </div>
      <button
        onClick={() => onClose(notification.id)}
        style={{
          background: 'none',
          border: 'none',
          color: '#888',
          cursor: 'pointer',
          fontSize: '16px',
          padding: 4
        }}
      >
        ✕
      </button>
    </div>
  );
};

// Container des notifications
const NotificationContainer = ({ notifications, onClose }) => (
  <div
    style={{
      position: 'fixed',
      top: 20,
      right: 20,
      zIndex: 9999,
      pointerEvents: 'none'
    }}
  >
    <style jsx>{`
      @keyframes slideIn {
        from {
          transform: translateX(100%);
          opacity: 0;
        }
        to {
          transform: translateX(0);
          opacity: 1;
        }
      }
    `}</style>
    {notifications.map(notification => (
      <div key={notification.id} style={{ pointerEvents: 'all' }}>
        <Notification notification={notification} onClose={onClose} />
      </div>
    ))}
  </div>
);

// Provider du système de notifications
export const NotificationProvider = ({ children }) => {
  const [notifications, setNotifications] = useState([]);
  const [priceAlerts, setPriceAlerts] = useState([]); // Alertes prix configurées

  const addNotification = (notification) => {
    const id = Date.now().toString();
    const newNotification = {
      id,
      type: NOTIFICATION_TYPES.INFO,
      duration: 5000,
      autoClose: true,
      ...notification
    };

    setNotifications(prev => [...prev, newNotification]);
    return id;
  };

  const removeNotification = (id) => {
    setNotifications(prev => prev.filter(n => n.id !== id));
  };

  // Shortcuts pour types spécifiques
  const success = (message, title = 'Success') => 
    addNotification({ type: NOTIFICATION_TYPES.SUCCESS, message, title });

  const error = (message, title = 'Error') => 
    addNotification({ type: NOTIFICATION_TYPES.ERROR, message, title });

  const warning = (message, title = 'Warning') => 
    addNotification({ type: NOTIFICATION_TYPES.WARNING, message, title });

  const info = (message, title = 'Info') => 
    addNotification({ type: NOTIFICATION_TYPES.INFO, message, title });

  const priceAlert = (message, title = 'Prix Alert') => 
    addNotification({ type: NOTIFICATION_TYPES.PRICE_ALERT, message, title, duration: 10000 });

  const migrationAlert = (message, title = 'Migration Alert') => 
    addNotification({ type: NOTIFICATION_TYPES.MIGRATION_ALERT, message, title, duration: 15000 });

  // Système d'alertes prix
  const addPriceAlert = (mintAddress, type, targetPrice, condition) => {
    const alert = {
      id: Date.now().toString(),
      mintAddress,
      type, // 'above', 'below'
      targetPrice,
      condition,
      active: true,
      createdAt: Date.now()
    };
    
    setPriceAlerts(prev => [...prev, alert]);
    return alert.id;
  };

  const removePriceAlert = (alertId) => {
    setPriceAlerts(prev => prev.filter(alert => alert.id !== alertId));
  };

  // Vérifier les alertes prix
  const checkPriceAlerts = (mintAddress, currentPrice) => {
    priceAlerts
      .filter(alert => alert.mintAddress === mintAddress && alert.active)
      .forEach(alert => {
        let triggered = false;
        
        if (alert.type === 'above' && currentPrice >= alert.targetPrice) {
          triggered = true;
        } else if (alert.type === 'below' && currentPrice <= alert.targetPrice) {
          triggered = true;
        }
        
        if (triggered) {
          priceAlert(
            `Token ${mintAddress.slice(0, 8)}... est ${alert.type === 'above' ? 'au-dessus' : 'en-dessous'} de $${alert.targetPrice}`,
            'Alerte Prix Déclenchée'
          );
          
          // Désactiver l'alerte
          setPriceAlerts(prev => 
            prev.map(a => a.id === alert.id ? { ...a, active: false } : a)
          );
        }
      });
  };

  const value = {
    notifications,
    addNotification,
    removeNotification,
    success,
    error,
    warning,
    info,
    priceAlert,
    migrationAlert,
    priceAlerts,
    addPriceAlert,
    removePriceAlert,
    checkPriceAlerts,
    NOTIFICATION_TYPES
  };

  return (
    <NotificationContext.Provider value={value}>
      {children}
      <NotificationContainer 
        notifications={notifications} 
        onClose={removeNotification} 
      />
    </NotificationContext.Provider>
  );
};

export default NotificationProvider;