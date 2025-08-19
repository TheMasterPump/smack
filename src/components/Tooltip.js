// 💡 Tooltip Component pour expliquer les terms techniques
import React, { useState } from 'react';

const Tooltip = ({ children, content, position = 'top' }) => {
  const [visible, setVisible] = useState(false);

  const tooltipStyle = {
    position: 'relative',
    display: 'inline-block',
    cursor: 'help'
  };

  const tooltipContentStyle = {
    position: 'absolute',
    zIndex: 1000,
    background: '#22232b',
    color: '#fff',
    padding: '8px 12px',
    borderRadius: '6px',
    fontSize: '0.85rem',
    boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
    border: '1px solid #ffcc32',
    maxWidth: '200px',
    width: 'max-content',
    opacity: visible ? 1 : 0,
    visibility: visible ? 'visible' : 'hidden',
    transition: 'opacity 0.2s, visibility 0.2s',
    ...(position === 'top' && {
      bottom: '100%',
      left: '50%',
      transform: 'translateX(-50%)',
      marginBottom: '8px'
    }),
    ...(position === 'bottom' && {
      top: '100%',
      left: '50%',
      transform: 'translateX(-50%)',
      marginTop: '8px'
    }),
    ...(position === 'right' && {
      left: '100%',
      top: '50%',
      transform: 'translateY(-50%)',
      marginLeft: '8px'
    }),
    ...(position === 'left' && {
      right: '100%',
      top: '50%',
      transform: 'translateY(-50%)',
      marginRight: '8px'
    })
  };

  const arrowStyle = {
    position: 'absolute',
    width: 0,
    height: 0,
    ...(position === 'top' && {
      top: '100%',
      left: '50%',
      transform: 'translateX(-50%)',
      borderLeft: '5px solid transparent',
      borderRight: '5px solid transparent',
      borderTop: '5px solid #ffcc32'
    }),
    ...(position === 'bottom' && {
      bottom: '100%',
      left: '50%',
      transform: 'translateX(-50%)',
      borderLeft: '5px solid transparent',
      borderRight: '5px solid transparent',
      borderBottom: '5px solid #ffcc32'
    }),
    ...(position === 'right' && {
      right: '100%',
      top: '50%',
      transform: 'translateY(-50%)',
      borderTop: '5px solid transparent',
      borderBottom: '5px solid transparent',
      borderRight: '5px solid #ffcc32'
    }),
    ...(position === 'left' && {
      left: '100%',
      top: '50%',
      transform: 'translateY(-50%)',
      borderTop: '5px solid transparent',
      borderBottom: '5px solid transparent',
      borderLeft: '5px solid #ffcc32'
    })
  };

  return (
    <div
      style={tooltipStyle}
      onMouseEnter={() => setVisible(true)}
      onMouseLeave={() => setVisible(false)}
      onTouchStart={() => setVisible(true)}
      onTouchEnd={() => setTimeout(() => setVisible(false), 2000)}
    >
      {children}
      <div style={tooltipContentStyle}>
        {content}
        <div style={arrowStyle} />
      </div>
    </div>
  );
};

// Tooltips spécialisés pour les terms crypto
export const MarketCapTooltip = ({ children }) => (
  <Tooltip content="La valeur totale de tous les tokens en circulation (prix × supply)">
    {children}
  </Tooltip>
);

export const SlippageTooltip = ({ children }) => (
  <Tooltip content="Différence entre le prix attendu et le prix réel d'exécution de la transaction">
    {children}
  </Tooltip>
);

export const LiquidityTooltip = ({ children }) => (
  <Tooltip content="Quantité de tokens disponibles pour le trading sans affecter drastiquement le prix">
    {children}
  </Tooltip>
);

export const ATHTooltip = ({ children }) => (
  <Tooltip content="All-Time High - Le prix le plus élevé jamais atteint par le token">
    {children}
  </Tooltip>
);

export const VolumeTooltip = ({ children }) => (
  <Tooltip content="Montant total échangé sur les dernières 24 heures">
    {children}
  </Tooltip>
);

export const MigrationTooltip = ({ children }) => (
  <Tooltip content="Transfer du token vers Raydium pour plus de liquidité et de fonctionnalités">
    {children}
  </Tooltip>
);

export const BondingCurveTooltip = ({ children }) => (
  <Tooltip content="Mécanisme qui détermine le prix du token basé sur l'offre et la demande">
    {children}
  </Tooltip>
);

export default Tooltip;