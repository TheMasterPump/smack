import React, { createContext, useState, useEffect } from 'react';

export const TokenDataContext = createContext();

export function TokenDataProvider({ children, mintAddress, refreshKey, autoRefresh = false }) {
  const [tokenData, setTokenData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const fetchTokenData = async () => {
    if (!mintAddress) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`http://localhost:4000/api/token-data/${mintAddress}`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      setTokenData(data);
      console.log(`🔄 Données mises à jour pour ${mintAddress.slice(0, 8)}...`);
    } catch (e) {
      console.error("Erreur token data:", e);
      setError(e.message);
    }
    setLoading(false);
  };

  useEffect(() => {
    // Charger les données initiales
    fetchTokenData();
    
    // 🔥 AUTO-REFRESH OPTIONNEL - seulement si activé explicitement
    let interval = null;
    if (autoRefresh) {
      console.log(`⚡ Auto-refresh activé toutes les 5 secondes pour ${mintAddress?.slice(0, 8)}...`);
      interval = setInterval(fetchTokenData, 5000); // Augmenté à 5s pour moins de spam
    } else {
      console.log(`⏸️  Auto-refresh désactivé - rafraîchissement manuel seulement`);
    }
    
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [mintAddress, refreshKey, autoRefresh]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <TokenDataContext.Provider value={{ tokenData, loading, error, refetch: fetchTokenData }}>
      {children}
    </TokenDataContext.Provider>
  );
}