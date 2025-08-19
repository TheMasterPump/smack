import React, { useEffect, useState, useRef } from 'react';
import { createChart, ColorType } from 'lightweight-charts'; 
import { useParams } from 'react-router-dom';
import { useWallet } from "@solana/wallet-adapter-react";
import TokenChat from "./TokenChat";
import TradingInterface from "./components/TradingInterface";
import MigrationStatus from "./components/MigrationStatus";
import { TokenDataContext, TokenDataProvider } from "./contexts/TokenDataContext";
import { StatsSkeleton, ChartSkeleton, TradingSkeleton, HoldersSkeleton } from "./components/SkeletonLoader";
import { MarketCapTooltip, LiquidityTooltip, VolumeTooltip, ATHTooltip } from "./components/Tooltip";
import { useTokenPriceStream } from "./hooks/useWebSocket";
import { NotificationProvider, useNotifications } from "./components/NotificationSystem";
import { Leaderboard, UserBadges, XPProgress } from "./components/Gamification";
import { useDebounce, useChartOptimization, useLazyLoad } from "./hooks/useOptimization";
import AdvancedTrading from "./components/AdvancedTrading";
import './TokenPage.css';

// === Market Stats Component Optimisé ===
function MarketStats() {
  const { tokenData, loading, error } = React.useContext(TokenDataContext);

  if (loading && !tokenData) return <StatsSkeleton />;
  if (error && !tokenData) return <div style={{ color: "#fb4023", fontSize: 13 }}>Connection error</div>;
  if (!tokenData) return <div style={{ color: "#fb4023", fontSize: 13 }}>No stats available</div>;

  return (
    <div className="side-list">
      <div className="side-list-item">
        <MarketCapTooltip><span>Market Cap</span></MarketCapTooltip>
        <span style={{ color: "#27eb91", fontWeight: 600 }}>{tokenData.marketStats?.marketCap || "-"}</span>
      </div>
      <div className="side-list-item">
        <LiquidityTooltip><span>Liquidity</span></LiquidityTooltip>
        <span style={{ color: "#ffd42b" }}>{tokenData.marketStats?.liquidityUSD || tokenData.marketStats?.liquidity || "-"}</span>
      </div>
      <div className="side-list-item">
        <VolumeTooltip><span>Volume 24h</span></VolumeTooltip>
        <span>{tokenData.marketStats?.volume24h || "-"}</span>
      </div>
      <div className="side-list-item">
        <span>Price Change</span> 
        <span style={{ color: tokenData.marketStats?.priceChange24h?.startsWith('+') ? "#27eb91" : "#fb4023" }}>
          {tokenData.marketStats?.priceChange24h || "-"}
        </span>
      </div>
      <div className="side-list-item">
        <span>Holders</span> 
        <span>{tokenData.tradingStats?.uniqueHolders || "0"}</span>
      </div>
      <div className="side-list-item">
        <span>Transactions</span> 
        <span>{tokenData.tradingStats?.totalTransactions || "0"}</span>
      </div>
    </div>
  );
}

// === SIMPLE : Prix qui commence bas et monte ===
function generateRealisticPriceHistory(currentPrice) {
  const history = [];
  const dataPoints = 100; // Plus de points pour historique complet
  
  // TEST FORCÉ : Vérifier si la progression marche
  const startPrice = 0.001;   // Démarrage : $0.001  
  const endPrice = 0.080;     // Test forcé : $0.080 (au lieu du backend buggué)
  
  console.log(`🚀 TEST PROGRESSION: $${startPrice.toFixed(6)} → $${endPrice.toFixed(6)}`);
  console.log(`🐛 PROBLÈME: currentPrice du backend = $${currentPrice.toFixed(6)} (devrait être ~$0.074)`);
  
  // HISTORIQUE COMPLET depuis le lancement (24h)
  const startTime = Date.now() - (24 * 60 * 60 * 1000); // 24h dans le passé
  
  for (let i = 0; i < dataPoints; i++) {
    const progress = i / (dataPoints - 1); // De 0 à 1
    const timestamp = startTime + (i * (24 * 60 * 60 * 1000) / dataPoints); // Étalé sur 24h
    
    // PROGRESSION SIMPLE ET LOGIQUE : BAS vers HAUT
    const curve = progress; // Progression linéaire simple : 0 → 1
    const basePrice = startPrice + (endPrice - startPrice) * curve;
    
    console.log(`Point ${i}: progress=${progress.toFixed(3)}, prix=$${basePrice.toFixed(6)}`);
    
    // Très petite volatilité pour garder la progression claire
    const volatility = basePrice * 0.005; // 0.5% seulement
    const randomChange = (Math.random() - 0.5) * volatility;
    const price = Math.max(basePrice + randomChange, startPrice); // Ne pas descendre sous startPrice
    
    history.push({
      price: price,
      timestamp: timestamp
    });
  }
  
  console.log(`📊 HISTORIQUE COMPLET: $${startPrice.toFixed(4)} → $${endPrice.toFixed(4)}`);
  console.log(`📊 Premier point: $${history[0]?.price.toFixed(6)}`);
  console.log(`📊 Dernier point: $${history[history.length-1]?.price.toFixed(6)}`);
  return history;
}

// === TradingView Lightweight Charts Component ===  
const PriceChart = React.memo(function PriceChart() {
  const { tokenData, loading } = React.useContext(TokenDataContext);
  const [timeframe, setTimeframe] = useState('1m'); // 1s, 1m, 1h, 1d
  // Plus besoin de refs avec Recharts !
  
  // Hook pour données temps réel
  const { priceHistory: realtimePrices } = useTokenPriceStream(tokenData?.mintAddress);
  
  // Convertir prix SOL vers USD (SOL = ~$324)
  const priceInSol = parseFloat(tokenData?.currentPrice || 0.00022761);
  const solToUsdRate = 324; // Prix du SOL en USD (ajuster selon le marché)
  const currentPrice = priceInSol * solToUsdRate; // Prix token en USD
  
  console.log('🪙 Prix token en SOL:', priceInSol);
  console.log('💰 Prix token en USD:', currentPrice);
  console.log('📊 Taux SOL/USD utilisé:', solToUsdRate);
  console.log('🔍 tokenData?.currentPrice:', tokenData?.currentPrice);
  console.log('🔍 Calcul: ${priceInSol} x ${solToUsdRate} = ${currentPrice}');
  const currentMarketCap = parseFloat(tokenData?.marketCap || 15400);
  
  // RETOUR AUX VRAIES DONNÉES DU BACKEND
  const rawPriceHistory = realtimePrices?.length > 0 
    ? realtimePrices 
    : tokenData?.priceHistory?.history?.length > 0 
    ? tokenData.priceHistory.history 
    : generateRealisticPriceHistory(currentPrice);

  // 📈 ARM CUP & HANDLE PATTERN - TRADINGVIEW STYLE
  const generateCupHandlePattern = () => {
    // DONNÉES SIMPLES POUR TEST - Prix fixe pour voir les bougies
    const data = [];
    const now = Math.floor(Date.now() / 1000);
    
    // 20 bougies simples avec des prix qui varient pour créer des bougies visibles
    for (let i = 0; i < 20; i++) {
      const time = now - (19 - i) * 300; // 5 minutes par bougie
      const basePrice = 1.0 + (i * 0.1); // Prix qui monte de 1.0 à 3.0
      
      const open = basePrice;
      const close = basePrice + (Math.random() - 0.5) * 0.8; // Variation plus importante +/-0.4
      const high = Math.max(open, close) + Math.random() * 0.3; // Mèches plus longues
      const low = Math.min(open, close) - Math.random() * 0.3;
      
      data.push({
        time: time,
        open: Math.max(0.1, open),
        high: Math.max(0.1, high),
        low: Math.max(0.1, low),
        close: Math.max(0.1, close)
      });
    }
    
    console.log(`🏆 Cup & Handle Pattern: ${data.length} bougies générées`);
    console.log(`🏆 Prix début: $${data[0].close.toFixed(6)} → Prix fin: $${data[data.length-1].close.toFixed(6)}`);
    console.log('🏆 Premières bougies:', data.slice(0, 2));
    
    return data.sort((a, b) => a.time - b.time);
  };
  
  /*
  // ANCIEN CODE COMMENTÉ - IGNORÉ
    
    // Grouper les données par intervalles de 5 minutes
    const startTime = priceData[0]?.timestamp || Date.now();
    const endTime = priceData[priceData.length - 1]?.timestamp || Date.now();
    
    // Créer des bougies de 5 minutes
    for (let time = startTime; time <= endTime; time += candleInterval * 1000) {
      // Trouver tous les prix dans cette période de 5 minutes
      const periodData = priceData.filter(p => {
        const pTime = p.timestamp || time;
        return pTime >= time && pTime < time + (candleInterval * 1000);
      });
      
      if (periodData.length === 0) continue;
      
      // Calculer OHLC réel pour cette période
      const open = periodData[0].price;
      const close = periodData[periodData.length - 1].price;
      const high = Math.max(...periodData.map(p => p.price));
      const low = Math.min(...periodData.map(p => p.price));
      
      // Pas de scale, utiliser les vrais prix directement
      const scale = 1;
      
      candles.push({
        time: Math.floor(time / 1000), // TradingView utilise des timestamps en secondes
        open: open * scale,
        high: high * scale,
        low: low * scale,
        close: close * scale
      });
    }
    
    // FORCER L'UTILISATION DE NOS VRAIES DONNÉES (pas de synthétiques)
    if (candles.length > 0) {
      console.log(`🔥 Utilisation ${candles.length} vraies bougies`);
      return candles.sort((a, b) => a.time - b.time);
    }
    
    // Si vraiment aucune donnée, créer des bougies synthétiques
    if (candles.length < 20) {
      const syntheticCandles = [];
      const now = Math.floor(Date.now() / 1000);
      let lastPrice = currentPrice;
      
      for (let i = 40; i >= 0; i--) {
        const timestamp = now - (i * candleInterval);
        
        // Générer OHLC réaliste pour cette bougie
        const basePrice = lastPrice;
        const volatility = 0.02; // 2% de volatilité par bougie
        
        // Open = close de la bougie précédente
        const open = lastPrice;
        
        // Générer high et low avec du mouvement réaliste
        const maxMove = basePrice * volatility;
        const high = open + (Math.random() * maxMove);
        const low = open - (Math.random() * maxMove);
        
        // Close quelque part entre low et high
        const closeRange = high - low;
        const close = low + (Math.random() * closeRange);
        
        // S'assurer que OHLC respecte les règles
        const finalHigh = Math.max(open, close, high);
        const finalLow = Math.min(open, close, low);
        
        const scale = 1; // Pas de scale
        
        syntheticCandles.push({
          time: timestamp,
          open: open * scale,
          high: finalHigh * scale,
          low: finalLow * scale,
          close: close * scale
        });
        
        lastPrice = close;
      }
      
      console.log(`📊 Généré ${syntheticCandles.length} bougies synthétiques réalistes`);
      return syntheticCandles.sort((a, b) => a.time - b.time);
    }
    
    console.log(`📊 Généré ${candles.length} vraies bougies OHLC (5min)`);
    return candles.sort((a, b) => a.time - b.time);
  };

  */ // FIN DU COMMENTAIRE
  
  // Test basique pour voir si le composant se charge
  console.log('🚀 TokenPage loaded!');
  
  // Cup & Handle Pattern Data pour TradingView
  const candleData = React.useMemo(() => {
    console.log('🚀 useMemo candleData appelé');
    return generateCupHandlePattern();
  }, [tokenData]); // Pattern Cup & Handle avec breakout
  
  // === DEBUG DÉTAILLÉ ===
  console.log('🔍 [DEBUG] tokenData:', tokenData);
  console.log('🔍 [DEBUG] tokenData?.currentPrice:', tokenData?.currentPrice);
  console.log('🔍 [DEBUG] priceInSol:', priceInSol);
  console.log('🔍 [DEBUG] currentPrice USD:', currentPrice);
  console.log('🔍 [DEBUG] rawPriceHistory:', rawPriceHistory);
  console.log('🔍 [DEBUG] candleData sera générée avec Cup & Handle pattern');

  // Responsive chart height
  const [chartHeight, setChartHeight] = useState(450);
  
  useEffect(() => {
    const updateChartHeight = () => {
      if (window.innerWidth <= 600) {
        setChartHeight(300);
      } else if (window.innerWidth <= 950) {
        setChartHeight(350);
      } else {
        setChartHeight(450);
      }
    };
    
    updateChartHeight();
    window.addEventListener('resize', updateChartHeight);
    return () => window.removeEventListener('resize', updateChartHeight);
  }, []);

  // TradingView refs
  const chartContainerRef = useRef(null);
  const chartRef = useRef(null);
  const candleSeriesRef = useRef(null);
    
  // 📈 TRADINGVIEW CUP & HANDLE PATTERN
  useEffect(() => {
    console.log('🔧 [CHART] useEffect déclenché');
    console.log('🔧 [CHART] chartContainerRef.current:', chartContainerRef.current);
    console.log('🔧 [CHART] candleData.length:', candleData.length);
    console.log('🔧 [CHART] Données complètes:', candleData);
    
    if (!chartContainerRef.current) {
      console.log('❌ [CHART] Pas de container ref');
      return;
    }
    
    if (candleData.length === 0) {
      console.log('❌ [CHART] Pas de données');
      return;
    }
    
    console.log('✅ [CHART] Création du graphique TradingView...');
    console.log('✅ [CHART] Container dimensions:', {
      width: chartContainerRef.current.clientWidth,
      height: chartHeight
    });
    // Créer le chart avec paramètres optimisés pour la lisibilité
    const chart = createChart(chartContainerRef.current, {
      width: chartContainerRef.current.clientWidth,
      height: chartHeight,
      layout: {
        background: { type: ColorType.Solid, color: '#0d0d0f' },
        textColor: '#ffffff',
        fontSize: 12,
        fontFamily: 'Arial, sans-serif',
      },
      grid: {
        vertLines: { 
          color: '#2a2d3a',
          style: 1,
          visible: true,
        },
        horzLines: { 
          color: '#2a2d3a',
          style: 1,
          visible: true,
        },
      },
      crosshair: {
        mode: 1,
        vertLine: {
          color: '#758696',
          width: 1,
          style: 2,
        },
        horzLine: {
          color: '#758696',
          width: 1,
          style: 2,
        },
      },
      rightPriceScale: {
        borderColor: '#485158',
        textColor: '#ffffff',
        scaleMargins: {
          top: 0.05,
          bottom: 0.05,
        },
        borderVisible: true,
        entireTextOnly: false,
        visible: true,
        alignLabels: true,
        autoScale: true, // Auto-scale par défaut
        mode: 0, // Normal price scale mode (pas de pourcentage)
        invertScale: false,
        // Marges optimisées pour une meilleure lisibilité
        scaleMargins: {
          top: 0.15,    // 15% de marge en haut pour voir les pics
          bottom: 0.1,  // 10% de marge en bas pour voir les creux
        },
        // priceScale supprimé - laissons TradingView auto-détecter
        // Formatter SIMPLE - juste afficher le prix
        priceFormatter: (price) => {
          console.log('💰 [FORMATTER] Prix reçu:', price);
          return `$${price.toFixed(3)}`;
        },
      },
      leftPriceScale: {
        visible: false,
      },
      timeScale: {
        borderColor: '#485158',
        textColor: '#ffffff',
        timeVisible: true,
        secondsVisible: false,
        borderVisible: true,
        fixLeftEdge: false, // Permettre de voir avant le début
        fixRightEdge: false, // Permettre de voir après la fin
        lockVisibleTimeRangeOnResize: false, // Permettre ajustement libre
        barSpacing: 12, // Plus d'espace entre les bougies pour qu'elles ne se coupent pas
        minBarSpacing: 8, // Espacement plus large pour bougies complètes
        rightOffset: 12, // Plus de décalage pour bien voir les bougies
        // Permettre zoom/dézoom sur l'axe temps
        allowShiftVisibleRangeOnWhitespaceClick: true,
        shiftVisibleRangeOnNewBar: false,
      },
      handleScroll: {
        mouseWheel: true,
        pressedMouseMove: true,
        horzTouchDrag: true,
        vertTouchDrag: true,
      },
      handleScale: {
        axisPressedMouseMove: true,
        mouseWheel: true,
        pinch: true,
        // Permettre zoom et dé-zoom avec molette
        scaleCandles: true,
        // Autoriser zoom complet
        axisDoubleClickReset: true,
      },
    });

    // Debug: vérifier les méthodes disponibles
    console.log('Chart methods:', Object.getOwnPropertyNames(chart));
    console.log('Has addCandlestickSeries:', typeof chart.addCandlestickSeries);
    
    // TradingView v5 API: Use addSeries with CandlestickSeries
    let candleSeries;
    
    try {
      // TradingView v4 syntax - bougies COMPLÈTES et très visibles
      candleSeries = chart.addCandlestickSeries({
        upColor: '#00FF88',        // Vert fluo pour hausse
        downColor: '#FF3366',      // Rouge vif pour baisse
        borderUpColor: '#00FF88',  // Bordure verte
        borderDownColor: '#FF3366', // Bordure rouge  
        wickUpColor: '#00FF88',    // Mèche verte
        wickDownColor: '#FF3366',  // Mèche rouge
        borderVisible: true,       // Bordures visibles
        wickVisible: true,         // Mèches visibles
        borderWidth: 3,           // Bordures encore plus épaisses
        wickWidth: 2,             // Mèches plus visibles
        // Configuration pour bougies complètes
        priceLineVisible: false,  // Pas de ligne de prix
        lastValueVisible: true,   // Montrer dernière valeur
        // Forcer affichage complet des bougies
        drawBorder: true,
        // Améliorer contraste
        baseLineVisible: false
      });
      console.log('✅ TradingView v4.2.0 avec couleurs optimisées!');
    } catch (error) {
      console.error('❌ Error creating candlestick series:', error);
      console.error('❌ Error details:', error.message, error.stack);
      // Fallback to line series if candlestick fails
      const lineData = candleData.map(candle => ({
        time: candle.time,
        value: candle.close
      }));
      candleSeries = chart.addLineSeries({
        color: '#00d4aa',
        lineWidth: 2,
      });
      candleSeries.setData(lineData);
      console.log('⚠️ Using fallback line series - CANDLESTICKS FAILED');
      candleSeriesRef.current = candleSeries;
      chartRef.current = chart;
      return;
    }

    // Ajouter les données aux bougies
    if (candleSeries && candleSeries.setData) {
      console.log('📈 [CHART] Données envoyées à TradingView:', candleData);
      console.log('📈 [CHART] Premier prix:', candleData[0]);
      console.log('📈 [CHART] Dernier prix:', candleData[candleData.length - 1]);
      console.log('📈 [CHART] CandleSeries créé avec succès:', candleSeries);
      
      candleSeries.setData(candleData);
      console.log('✅ [CHART] Données appliquées au chart');
    } else {
      console.error('❌ [CHART] Impossible de définir les données - candleSeries non valide:', candleSeries);
    }

    // AFFICHAGE SIMPLE - laisser TradingView gérer
    chart.timeScale().fitContent();
    console.log('✅ [CHART] fitContent() appliqué');
    
    // Double-clic pour reset simple
    chartContainerRef.current.addEventListener('dblclick', () => {
      chart.timeScale().fitContent();
    });
    
    // Stocker les références
    chartRef.current = chart;
    candleSeriesRef.current = candleSeries;
    
    console.log('🎯 [CHART] Chart complètement initialisé et affiché!');
    console.log('🎯 [CHART] DOM element:', chartContainerRef.current);
    console.log('🎯 [CHART] Chart object:', chart);

    // FORCER L'ÉCHELLE DES PRIX depuis 0
    const minPrice = Math.min(...candleData.map(c => c.low));
    const maxPrice = Math.max(...candleData.map(c => c.high));
    
    // Configuration par défaut - pas de customisation
    
    // TEMPORAIREMENT DÉSACTIVÉ - éviter les erreurs de price scale
    // setTimeout(() => {
    //   chart.priceScale('right').setVisibleRange({
    //     from: 0,
    //     to: maxPrice * 1.1
    //   });
    // }, 100);

    // Sauvegarder les références
    chartRef.current = chart;
    candleSeriesRef.current = candleSeries;

    // Nettoyage
    return () => {
      if (chartRef.current) {
        chartRef.current.remove();
        chartRef.current = null;
        candleSeriesRef.current = null;
      }
    };
  }, [candleData, chartHeight]);

  /* ANCIEN RESIZE HANDLER TRADINGVIEW - COMMENTÉ
  // Mettre à jour la taille du chart
  useEffect(() => {
    const chart = chartRef.current;
    if (!chart || !chartContainerRef.current) return;

    const resizeHandler = () => {
      chart.applyOptions({
        width: chartContainerRef.current.clientWidth,
        height: chartHeight,
      });
    };

    window.addEventListener('resize', resizeHandler);
    resizeHandler(); // Appeler immédiatement

    return () => window.removeEventListener('resize', resizeHandler);
  }, [chartHeight]);
  */

  if (loading && candleData.length === 0) {
    return <ChartSkeleton height={chartHeight} />;
  }

  const timeframes = [
    { id: '1s', label: '1S' },
    { id: '1m', label: '1M' }, 
    { id: '5m', label: '5M' },
    { id: '15m', label: '15M' },
    { id: '1h', label: '1H' },
    { id: '4h', label: '4H' },
    { id: '1d', label: '1D' }
  ];

  return (
    <div 
      style={{ 
        background: "#161620", 
        borderRadius: 12, 
        padding: "15px", 
        margin: "20px 0",
        border: "1px solid #2a2a35"
      }}
    >
      {/* Header TradingView style */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 15 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 15 }}>
          <div style={{ color: "#fff", fontSize: 16, fontWeight: "600" }}>
            📊 {tokenData?.name || 'TOKEN'}/USD
          </div>
          <div style={{ 
            color: candleData.length > 1 && candleData[candleData.length - 1]?.close > candleData[candleData.length - 2]?.close ? "#00d4aa" : "#ff4976", 
            fontSize: 18, 
            fontWeight: "700" 
          }}>
            ${currentPrice > 0.001 ? (currentPrice * 100000).toFixed(0) : (currentPrice * 100000).toExponential(2)}
          </div>
          <div style={{ 
            color: "#888", 
            fontSize: 12 
          }}>
            MC: ${currentMarketCap >= 1000000 ? (currentMarketCap / 1000000).toFixed(2) + 'M' : (currentMarketCap / 1000).toFixed(0) + 'k'}
          </div>
        </div>
        
        {/* Timeframe buttons - TradingView style */}
        <div style={{ display: "flex", gap: 2 }}>
          {timeframes.map(tf => (
            <button
              key={tf.id}
              onClick={() => setTimeframe(tf.id)}
              style={{
                background: timeframe === tf.id ? "#3179f5" : "transparent",
                color: timeframe === tf.id ? "#fff" : "#888",
                border: "1px solid #2a2a35",
                borderRadius: 4,
                padding: "6px 12px",
                fontSize: 11,
                fontWeight: "600",
                cursor: "pointer",
                transition: "all 0.2s"
              }}
            >
              {tf.label}
            </button>
          ))}
        </div>
      </div>
      
      {/* DEBUG TRADINGVIEW */}
      <div style={{ background: '#333', padding: 10, marginBottom: 10, color: '#fff', fontSize: 12, borderRadius: 5 }}>
        📊 <strong>GRAPHIQUE TRADINGVIEW:</strong><br/>
        Cup & Handle: {candleData.length} bougies<br/>
        Prix début: {candleData[0] ? `$${candleData[0].close.toFixed(6)}` : 'N/A'}<br/>
        Prix breakout: {candleData[candleData.length-1] ? `$${candleData[candleData.length-1].close.toFixed(6)}` : 'N/A'}<br/>
        Pattern: {candleData[0] && candleData[candleData.length-1] ? 
          (candleData[candleData.length-1].close > candleData[0].close ? '🚀 BREAKOUT!' : '📈 FORMATION') 
          : 'N/A'}
      </div>
      
      {/* 📈 ARM CUP & HANDLE PATTERN - TRADINGVIEW */}
      <div 
        ref={chartContainerRef}
        style={{ 
          height: chartHeight,
          width: '100%',
          borderRadius: 8,
          overflow: 'hidden',
          border: "1px solid #1a1a25",
          background: '#0d0d0f'
        }}
      />
      
      <style jsx>{`
        @keyframes pulse {
          0% { opacity: 1; }
          50% { opacity: 0.5; }
          100% { opacity: 1; }
        }
      `}</style>
    </div>
  );
});

// === Holders List Component Optimisé ===
function HoldersList() {
  const { tokenData, loading } = React.useContext(TokenDataContext);

  const holders = tokenData?.topHolders || [];

  if (loading && !tokenData) return <HoldersSkeleton />;
  if (!holders.length) return <div className="side-list"><div className="side-list-item"><span>No holders yet</span></div></div>;

  return (
    <div className="side-list">
      {holders.slice(0, 5).map((holder, i) => (
        <div className="side-list-item" key={i}>
          <span style={{ fontFamily: "monospace", fontSize: 12 }}>{holder.address}</span> 
          <span style={{ color: "#27eb91", fontWeight: 600 }}>{holder.percentage.toFixed(1)}%</span>
        </div>
      ))}
      <div className="side-list-item">
        <span style={{ color: "#888", fontSize: 12 }}>
          ...and {Math.max(0, (holders.length || 0) - 5)} more holders
        </span>
      </div>
    </div>
  );
}

// === Ancien composant BondingCurveInfo supprimé ===
// Il affichait des données incorrectes (prix négatif, progression > 100%)
// Remplacé par MigrationStatus qui utilise les vraies données blockchain

// === Composant d’achat (BuyBox) CORRIGÉ ===
function BuyBox({ token, solBalance, onBuy }) {
  const [amount, setAmount] = useState("");
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState("");
  const quickAmounts = [1, 10, 50, 100]; // Tokens, pas SOL !

  // Add null check for token
  if (!token) {
    return <div style={{ color: '#888' }}>Loading token...</div>;
  }

  async function handleBuy() {
    setLoading(true);
    setStatus("");
    try {
      // conversion en SPL u64 (6 décimales)
      const deltaQ = Math.floor(Number(amount)) * 1e6;
      if (!Number.isInteger(Number(amount)) || Number(amount) <= 0) throw new Error("Entrer un nombre entier de tokens (>=1)");
      await onBuy(deltaQ);
      setStatus("✅ Achat réussi !");
      setAmount("");
    } catch (e) {
      setStatus("Erreur : " + (e.message || e));
    }
    setLoading(false);
  }

  return (
    <div className="buybox-container">
      <div style={{ marginBottom: 6 }}>
        <b>Acheter {token.ticker || "TOKEN"}</b>
      </div>
      <input
        type="number"
        min={1}
        step={1}
        placeholder="Nombre de tokens à acheter"
        value={amount}
        onChange={e => setAmount(e.target.value)}
        disabled={loading}
        style={{ width: "100%", marginBottom: 8, borderRadius: 6, padding: 8, border: "1px solid #444" }}
      />
      <div style={{ display: "flex", gap: 8, marginBottom: 10 }}>
        {quickAmounts.map(v => (
          <button
            key={v}
            type="button"
            onClick={() => setAmount(String(v))}
            disabled={loading}
            style={{ background: "#232324", color: "#ffcc32", borderRadius: 6, padding: "5px 15px", border: "1px solid #27eb91", cursor: "pointer" }}
          >{v} {token.ticker || "TOKEN"}</button>
        ))}
      </div>
      <button
        onClick={handleBuy}
        disabled={!amount || loading || Number(amount) < 1}
        style={{ width: "100%", background: "#27eb91", color: "#222", fontWeight: 700, border: "none", borderRadius: 8, padding: 10, fontSize: 15, marginTop: 6 }}
      >
        {loading ? "Achat..." : `Acheter ${token.ticker || "TOKEN"}`}
      </button>
      <div style={{ color: "#888", marginTop: 7, fontSize: 13 }}>Balance: {solBalance} SOL</div>
      {status && (
        <div style={{ 
          marginTop: 8, 
          color: status.startsWith("✅") ? "green" : "#fb4023", 
          fontWeight: 600,
          fontSize: 13,
          wordBreak: "break-all",
          lineHeight: "1.3"
        }}>
          {status}
        </div>
      )}
    </div>
  );
}

// -------- HOOK IDENTITY CHAT --------
function useChatIdentity(wallet) {
  const [user, setUser] = useState(null);
  useEffect(() => {
    const saved = localStorage.getItem("chatUser");
    if (saved) setUser(JSON.parse(saved));
  }, []);
  const saveUser = (userObj) => {
    setUser(userObj);
    localStorage.setItem("chatUser", JSON.stringify(userObj));
  };
  return [user, saveUser];
}

// --------- COMPOSANT D’IDENTITÉ CHAT ---------
function ChatIdentityForm({ wallet, setChatUser }) {
  const [username, setUsername] = useState("");
  const [avatar, setAvatar] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleValidate() {
    if (!username || username.length < 2 || username.length > 20)
      return alert("Choose a username (2-20 letters)");

    const msg = `I want to join the chat as "${username}" for wallet: ${wallet.publicKey}`;
    setLoading(true);
    try {
      const encoded = new TextEncoder().encode(msg);
      const sig = await wallet.signMessage(encoded, "utf8");
      setChatUser({
        wallet: wallet.publicKey.toBase58(),
        username,
        avatar,
        sig: Array.from(sig),
      });
    } catch (e) {
      alert("Signature required!");
    }
    setLoading(false);
  }

  return (
    <div>
      <input
        placeholder="Choose your username"
        value={username}
        onChange={e => setUsername(e.target.value)}
        style={{ width: "100%", marginBottom: 10, fontSize: 16, borderRadius: 6, padding: 7, border: "1px solid #ffd42b" }}
        maxLength={20}
      />
      <input
        placeholder="(Optional) Image URL for avatar"
        value={avatar}
        onChange={e => setAvatar(e.target.value)}
        style={{ width: "100%", marginBottom: 10, fontSize: 14, borderRadius: 6, padding: 7, border: "1px solid #ffd42b" }}
      />
      <button
        onClick={handleValidate}
        style={{ width: "100%", background: "#ffd42b", color: "#23232b", fontWeight: 700, border: "none", borderRadius: 8, padding: 11, fontSize: 16, cursor: "pointer" }}
        disabled={loading}
      >
        {loading ? "Validating..." : "Join chat"}
      </button>
    </div>
  );
}

// ========== COMPOSANT INTERNE AVEC NOTIFICATIONS ==========
function TokenPageContent({ token, wallet, slug }) {
  const [solBalance, setSolBalance] = useState(0);
  const [tab, setTab] = useState('chat');
  const [claimLoading, setClaimLoading] = useState(false);
  const [claimMsg, setClaimMsg] = useState("");
  const [chatUser, setChatUser] = useChatIdentity(wallet);
  const [refreshCurveKey, setRefreshCurveKey] = useState(0);
  
  // Hook notifications (maintenant à l'intérieur du provider)
  const notifications = useNotifications();

  useEffect(() => {
    async function fetchBalance() {
      if (wallet.publicKey) {
        try {
          const web3 = await import("@solana/web3.js");
          const connection = new web3.Connection("https://api.devnet.solana.com");
          const balanceLamports = await connection.getBalance(wallet.publicKey);
          setSolBalance(Number((balanceLamports / 1e9).toFixed(3)));
        } catch (e) {
          setSolBalance(0);
        }
      } else {
        setSolBalance(0);
      }
    }
    fetchBalance();
  }, [wallet.publicKey]);

  // 🚀 FONCTION ACHAT avec les VRAIES FORMULES PUMP.FUN
  async function handleBuyToken(deltaQ) {
    if (!token) throw new Error("Token non chargé");
    if (!token.mintAddress) throw new Error("Token pas encore créé on-chain");
    if (!wallet.publicKey) throw new Error("Wallet non connecté");
    
    try {
      const web3 = await import("@solana/web3.js");
      const connection = new web3.Connection("https://api.devnet.solana.com");
      const { buyTokens } = await import("./utils/pumpFunClient");
      
      // Convertir deltaQ en nombre de tokens (6 décimales pour notre token)
      const tokenAmount = deltaQ; // deltaQ est déjà en unités de base
      const maxSolCost = 100; // Max 100 SOL pour protection slippage
      
      console.log(`🔥 Utilisation des formules EXACTES de Pump.fun!`);
      console.log(`💰 Achat ${tokenAmount / 1e6} tokens, max ${maxSolCost} SOL`);
      
      const result = await buyTokens(wallet, connection, token.mintAddress, tokenAmount, maxSolCost);
      
      setRefreshCurveKey(r => r + 1);
      
      console.log("✅ Achat réussi avec formules Pump.fun:", result);
      
      // Afficher la signature de transaction à l'utilisateur
      if (result.signature && result.signature !== "SIMULATION_" + Date.now()) {
        console.log(`🔗 Signature de transaction: ${result.signature}`);
        console.log(`🌐 Voir sur Solana Explorer: https://explorer.solana.com/tx/${result.signature}?cluster=devnet`);
      }
      
      return { 
        success: true,
        message: `✅ Transaction confirmée! Acheté ${result.tokenAmount} tokens pour ${result.solCost.toFixed(6)} SOL${result.signature ? `\n🔗 Signature: ${result.signature}` : ''}`,
        signature: result.signature
      };
      
    } catch (error) {
      console.error("Erreur achat Pump.fun:", error);
      throw new Error(`🔥 Formules Pump.fun: ${error.message}`);
    }
  }


  // ----- FONCTION CLAIM ----- //
  async function handleClaim() {
    setClaimLoading(true);
    setClaimMsg("");
    try {
      if (!wallet.publicKey || !wallet.signMessage) {
        setClaimMsg("Connect your wallet (must support signMessage)");
        setClaimLoading(false);
        return;
      }
      const message = `I claim ownership of the token "${token.slug}" at ${Date.now()}`;
      const encodedMessage = new TextEncoder().encode(message);
      const signature = await wallet.signMessage(encodedMessage, "utf8");
      const signatureBase64 = Buffer.from(signature).toString("base64");
      const res = await fetch(`http://localhost:4000/api/token/${token.slug}/claim`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          wallet: wallet.publicKey.toBase58(),
          message,
          signature: signatureBase64,
        }),
      });
      const result = await res.json();
      if (result.success) {
        setClaimMsg("✅ Token claimed!");
        notifications.success("Token successfully claimed! 🎉", "Claim Success");
        setTimeout(() => window.location.reload(), 1000);
      } else {
        setClaimMsg(result.error || "Claim failed");
        notifications.error(result.error || "Claim failed", "Claim Error");
      }
    } catch (err) {
      setClaimMsg("Claim error: " + (err.message || err));
    }
    setClaimLoading(false);
  }

  const tabList = [
    { id: 'chat', label: '💬 Chat', content: '' },
    { id: 'trades', label: '📈 Trades', content: '[ List of trades here! ]' },
    { id: 'memes', label: '🖼️ Memes', content: '[ Meme generator/uploads here! ]' }
  ];

  return (
    <TokenDataProvider mintAddress={token.mintAddress} refreshKey={refreshCurveKey}>
        <div className="token-page-grid">
        <div className="main-column">
        <div className="token-header">
          <img src={token.image || token.imageUrl} className="token-logo" alt="token" />
          <div className="token-header-infos">
            <div>
              <span className="token-title">{token.name}</span>
              <span className="token-ticker">{token.ticker}</span>
            </div>
            <div className="token-desc">{token.description}</div>
            
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
              {!token.claimedBy ? (
                <>
                  <button
                    style={{
                      margin: '15px 0 8px 0',
                      padding: '8px 2px',
                      background: '#ffd42b',
                      border: 'none',
                      borderRadius: '6px',
                      fontWeight: 700,
                      cursor: 'pointer',
                      display: 'inline-block',
                      width: 'fit-content',
                      whiteSpace: 'nowrap'
                    }}
                    onClick={handleClaim}
                    disabled={!wallet.connected || claimLoading}
                  >
                    {claimLoading ? "Claiming..." : "Claim this token"}
                  </button>
                </>
              ) : (
                <div style={{ color: "green", margin: "13px 0 7px 0", fontWeight: 600 }}>
                  Already claimed by: {token.claimedBy}
                </div>
              )}
              
              {/* Vote Button */}
              <button
                onClick={() => alert('Voted!')}
                style={{
                  margin: '15px 0 8px 0',
                  padding: '8px 12px',
                  background: '#fb4023',
                  border: 'none',
                  borderRadius: '6px',
                  fontWeight: 700,
                  cursor: 'pointer',
                  color: '#fff',
                  display: 'inline-block',
                  width: 'fit-content',
                  whiteSpace: 'nowrap'
                }}
              >
                Vote
              </button>
              
              {/* Vote count with flame */}
              <span style={{ fontSize: "1.2rem", color: "#fb4023", fontWeight: "bold" }}>🔥 {token.votes || 0}</span>
            </div>
            
            {/* Claim message */}
            {!token.claimedBy && claimMsg && (
              <div style={{ margin: "10px 0", color: claimMsg.startsWith("✅") ? "green" : "red" }}>
                {claimMsg}
              </div>
            )}
            
            {/* Contract Address cliquable pour copier */}
            {token.mintAddress && (
              <div 
                style={{ 
                  color: "#ffcc32", 
                  fontSize: 12, 
                  margin: "8px 0 10px 0",
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  gap: "8px"
                }}
                onClick={async () => {
                  try {
                    await navigator.clipboard.writeText(token.mintAddress);
                    // Feedback visuel temporaire
                    const elem = document.getElementById('ca-feedback');
                    if (elem) {
                      elem.style.display = 'inline';
                      setTimeout(() => elem.style.display = 'none', 2000);
                    }
                  } catch (err) {
                    console.error('Failed to copy CA:', err);
                  }
                }}
                title="Cliquer pour copier l'adresse du contrat"
              >
                <span>CA: </span>
                <span style={{ 
                  fontFamily: "monospace", 
                  fontSize: "11px",
                  background: "#333",
                  padding: "2px 6px",
                  borderRadius: "4px",
                  border: "1px solid #555"
                }}>
                  {token.mintAddress.slice(0, 6)}...{token.mintAddress.slice(-6)}
                </span>
                <span style={{ fontSize: "10px", color: "#888" }}>📋</span>
                <span 
                  id="ca-feedback" 
                  style={{ 
                    display: "none", 
                    color: "#27eb91", 
                    fontSize: "10px",
                    fontWeight: "bold"
                  }}
                >
                  ✅ Copié!
                </span>
              </div>
            )}
            
            <div className="token-badges">
              {token.badges && token.badges.map((b, i) => (
                <span className="badge" key={i} style={b.style || {}}>{b.label}</span>
              ))}
            </div>
          </div>
        </div>
        <div className="token-buttons">
          {token.buttons && token.buttons.length > 0 ? (
            token.buttons.map((btn, i) => (
              <a className="token-btn" href={btn.href} key={i} target="_blank" rel="noopener noreferrer">{btn.label}</a>
            ))
          ) : (
            <div style={{ color: "#888", fontSize: 14, margin: 8 }}>No buttons</div>
          )}
        </div>
        <div className="chart-section">
          <PriceChart />
        </div>
        <div className="tabbed-section">
          <div className="tab-header">
            {tabList.map(t => (
              <button
                key={t.id}
                className={`tab-btn${tab === t.id ? ' active' : ''}`}
                onClick={() => setTab(t.id)}
                type="button"
              >{t.label}</button>
            ))}
          </div>
          {tab === "chat" ? (
            <div className="tab-content">
              {!chatUser ? (
                <div style={{
                  background: "#23232b", color: "#fff", borderRadius: 12, padding: 24,
                  maxWidth: 350, margin: "40px auto", boxShadow: "0 2px 8px #0006"
                }}>
                  <div style={{ fontSize: 21, marginBottom: 12 }}>
                    👛 Connect wallet to join the chat
                  </div>
                  {!wallet.connected ? (
                    <div>
                      <b style={{ color: "#fb4023" }}>Connect your wallet first!</b>
                    </div>
                  ) : (
                    <ChatIdentityForm wallet={wallet} setChatUser={setChatUser} />
                  )}
                </div>
              ) : (
                <TokenChat slug={token.slug} user={chatUser} token={token} />
              )}
            </div>
          ) : tabList.map(t => (
            t.id !== "chat" && (
              <div
                className="tab-content"
                key={t.id}
                style={{ display: tab === t.id ? '' : 'none' }}
              >{t.content}</div>
            )
          ))}
        </div>
      </div>
      <div className="side-column">
        {/* ====== MIGRATION STATUS RAYDIUM ====== */}
        {token && token.mintAddress && (
          <MigrationStatus 
            mintAddress={token.mintAddress}
          />
        )}
        
        {/* ====== TRADING INTERFACE V2 MODERNE ====== */}
        <div style={{ margin: "32px 0 0 0" }}>
          {token && token.mintAddress ? (
            <TradingInterface 
              mintAddress={token.mintAddress}
            />
          ) : token ? (
            <div style={{ padding: '20px', background: '#333', borderRadius: '8px', textAlign: 'center' }}>
              <p style={{ color: '#ffd42b' }}>Token not yet created on-chain</p>
              <p style={{ color: '#999', fontSize: '0.9rem' }}>Trading will be available after deployment</p>
            </div>
          ) : (
            <div style={{ padding: '20px', background: '#333', borderRadius: '8px', textAlign: 'center' }}>
              <p style={{ color: '#888' }}>Loading token...</p>
            </div>
          )}
        </div>
        
        {/* ====== ADVANCED TRADING FEATURES ====== */}
        {token && token.mintAddress && (
          <AdvancedTrading mintAddress={token.mintAddress} />
        )}
        
        {/* ====== FIN BUY BOX ====== */}

        {/* Ancien composant Bonding Curve supprimé - remplacé par MigrationStatus */}

        <div className="side-title">Top Holders</div>
        <HoldersList />
        
        {/* Gamification Components */}
        <Leaderboard tokenAddress={token.mintAddress} />
        <XPProgress currentXP={1250} nextLevelXP={2000} />
        <UserBadges userAddress={wallet.publicKey?.toBase58()} badges={['first_buy', 'early_bird']} />
        
      </div>
      </div>
      </TokenDataProvider>
  );
}

// ========== PAGE PRINCIPALE ==========
export default function TokenPage() {
  const { slug } = useParams();
  const wallet = useWallet();
  const [token, setToken] = useState(null);

  useEffect(() => {
    fetch(`http://localhost:4000/api/token/${slug}`)
      .then(res => {
        if (!res.ok) throw new Error('Token not found');
        return res.json();
      })
      .then(data => {
        setToken(data);
        console.log('Token loaded:', data);
        console.log('MintAddress:', data.mintAddress);
      })
      .catch(error => {
        console.error('Error loading token:', error);
        setToken(null);
      });
  }, [slug]);

  if (!token) return <div style={{ color: '#fb4023' }}>Loading…</div>;

  return (
    <NotificationProvider>
      <TokenPageContent token={token} wallet={wallet} slug={slug} />
    </NotificationProvider>
  );
}
