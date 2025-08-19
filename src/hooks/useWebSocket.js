// 🔗 Hook WebSocket pour données temps réel
import { useState, useEffect, useRef } from 'react';

export const useWebSocket = (url, options = {}) => {
  const [data, setData] = useState(null);
  const [connected, setConnected] = useState(false);
  const [error, setError] = useState(null);
  const wsRef = useRef(null);
  const reconnectTimeoutRef = useRef(null);
  const reconnectAttempts = useRef(0);

  const { 
    onMessage,
    onConnect,
    onDisconnect,
    onError,
    reconnectDelay = 3000,
    maxReconnectAttempts = 5
  } = options;

  const connect = () => {
    try {
      wsRef.current = new WebSocket(url);
      
      wsRef.current.onopen = () => {
        console.log('🔗 WebSocket connected');
        setConnected(true);
        setError(null);
        reconnectAttempts.current = 0;
        onConnect?.();
      };

      wsRef.current.onmessage = (event) => {
        try {
          const parsedData = JSON.parse(event.data);
          setData(parsedData);
          onMessage?.(parsedData);
        } catch (err) {
          console.error('Error parsing WebSocket message:', err);
          onMessage?.(event.data);
        }
      };

      wsRef.current.onclose = () => {
        console.log('🔌 WebSocket disconnected');
        setConnected(false);
        onDisconnect?.();
        
        // Auto-reconnect logic
        if (reconnectAttempts.current < maxReconnectAttempts) {
          reconnectTimeoutRef.current = setTimeout(() => {
            reconnectAttempts.current++;
            console.log(`🔄 Reconnecting... Attempt ${reconnectAttempts.current}`);
            connect();
          }, reconnectDelay);
        }
      };

      wsRef.current.onerror = (err) => {
        console.error('❌ WebSocket error:', err);
        setError(err);
        onError?.(err);
      };

    } catch (err) {
      console.error('Failed to create WebSocket:', err);
      setError(err);
    }
  };

  const disconnect = () => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
    }
    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }
    setConnected(false);
  };

  const sendMessage = (message) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify(message));
      return true;
    }
    return false;
  };

  useEffect(() => {
    connect();
    return () => {
      disconnect();
    };
  }, [url]);

  return {
    data,
    connected,
    error,
    sendMessage,
    disconnect,
    reconnect: connect
  };
};

// Hook spécialisé pour les prix de tokens
export const useTokenPriceStream = (mintAddress) => {
  const [priceData, setPriceData] = useState(null);
  const [priceHistory, setPriceHistory] = useState([]);
  
  // Simuler WebSocket avec polling pour demo
  useEffect(() => {
    if (!mintAddress) return;
    
    const fetchPrice = async () => {
      try {
        const response = await fetch(`http://localhost:4000/api/token-data/${mintAddress}`);
        const data = await response.json();
        
        const newPrice = {
          price: data.currentPrice || 0,
          timestamp: Date.now(),
          volume: data.marketStats?.volume24h || 0,
          marketCap: data.marketStats?.marketCap || 0
        };
        
        setPriceData(newPrice);
        
        // Ajouter au history (max 100 points)
        setPriceHistory(prev => {
          const updated = [...prev, newPrice];
          return updated.slice(-100);
        });
      } catch (error) {
        console.error('Failed to fetch price:', error);
      }
    };
    
    // Fetch initial
    fetchPrice();
    
    // Poll every 5 seconds
    const interval = setInterval(fetchPrice, 5000);
    
    return () => clearInterval(interval);
  }, [mintAddress]);
  
  return { priceData, priceHistory };
};

export default useWebSocket;