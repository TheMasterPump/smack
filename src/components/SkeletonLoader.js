// 💫 Skeleton Loader Components
// Animations de chargement fluides pour une meilleure UX

import React from 'react';

// Skeleton de base
const SkeletonBox = ({ width = '100%', height = '20px', borderRadius = '4px' }) => (
  <div
    style={{
      width,
      height,
      background: 'linear-gradient(90deg, #333 25%, #444 50%, #333 75%)',
      backgroundSize: '200% 100%',
      animation: 'shimmer 2s infinite',
      borderRadius
    }}
  />
);

// Skeleton pour les stats
export const StatsSkeleton = () => (
  <div style={{ padding: '15px' }}>
    {[...Array(6)].map((_, i) => (
      <div key={i} style={{ 
        display: 'flex', 
        justifyContent: 'space-between', 
        marginBottom: 15,
        alignItems: 'center'
      }}>
        <SkeletonBox width="40%" height="16px" />
        <SkeletonBox width="30%" height="18px" />
      </div>
    ))}
  </div>
);

// Skeleton pour le graphique
export const ChartSkeleton = ({ height = 300 }) => (
  <div style={{
    background: '#0f0f0f',
    borderRadius: 8,
    padding: 20,
    height
  }}>
    {/* Header skeleton */}
    <div style={{ marginBottom: 20 }}>
      <SkeletonBox width="60%" height="24px" />
      <div style={{ display: 'flex', gap: 15, marginTop: 10 }}>
        <SkeletonBox width="20%" height="14px" />
        <SkeletonBox width="25%" height="14px" />
        <SkeletonBox width="20%" height="14px" />
      </div>
    </div>
    
    {/* Chart area */}
    <div style={{ 
      position: 'relative',
      height: height - 100,
      background: '#1a1a1a',
      borderRadius: 8
    }}>
      <SkeletonBox width="100%" height="100%" borderRadius="8px" />
    </div>
  </div>
);

// Skeleton pour les composants de trading
export const TradingSkeleton = () => (
  <div style={{
    background: "#181b20",
    borderRadius: 10,
    padding: "17px 15px",
    marginBottom: 19
  }}>
    <SkeletonBox width="70%" height="20px" style={{ marginBottom: 15 }} />
    
    {/* Tabs skeleton */}
    <div style={{ display: 'flex', gap: 10, marginBottom: 15 }}>
      <SkeletonBox width="50%" height="40px" borderRadius="7px" />
      <SkeletonBox width="50%" height="40px" borderRadius="7px" />
    </div>
    
    {/* Input skeleton */}
    <SkeletonBox width="100%" height="45px" borderRadius="8px" style={{ marginBottom: 10 }} />
    
    {/* Quick amounts */}
    <div style={{ display: 'flex', gap: 7, marginBottom: 15 }}>
      {[...Array(4)].map((_, i) => (
        <SkeletonBox key={i} width="25%" height="30px" borderRadius="7px" />
      ))}
    </div>
    
    {/* Button skeleton */}
    <SkeletonBox width="100%" height="48px" borderRadius="8px" />
  </div>
);

// Skeleton pour les holders
export const HoldersSkeleton = () => (
  <div>
    {[...Array(5)].map((_, i) => (
      <div key={i} style={{ 
        display: 'flex', 
        justifyContent: 'space-between',
        marginBottom: 10,
        alignItems: 'center'
      }}>
        <SkeletonBox width="60%" height="14px" />
        <SkeletonBox width="25%" height="14px" />
      </div>
    ))}
  </div>
);

// Animation CSS
const SkeletonStyles = () => (
  <style jsx global>{`
    @keyframes shimmer {
      0% { background-position: -200% 0; }
      100% { background-position: 200% 0; }
    }
    
    .skeleton-pulse {
      animation: pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite;
    }
    
    @keyframes pulse {
      0%, 100% { opacity: 1; }
      50% { opacity: 0.5; }
    }
  `}</style>
);

// Export default avec les styles
const SkeletonLoader = () => <SkeletonStyles />;
export default SkeletonLoader;