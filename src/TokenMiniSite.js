import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useWallet } from '@solana/wallet-adapter-react';
import themes from './themes';
import './TokenMiniSite.css';

export default function TokenMiniSite() {
  const { slug } = useParams();
  const [token, setToken] = useState(null);
  const wallet = useWallet();
  const navigate = useNavigate();

  useEffect(() => {
    fetch(`http://localhost:4000/api/token/${slug}`)
      .then(res => res.json())
      .then(data => setToken(data));
  }, [slug]);

  if (!token) return <div style={{ color: '#fb4023' }}>Loading…</div>;

  const theme = themes[token.theme] || themes.dark;

  // Copier dans le presse-papiers avec notification
  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text);
    alert('Contract address copied!');
  };

  // Vérifie si wallet connecté est le créateur du token
  const isCreator = wallet.publicKey?.toBase58() === token.marketStats?.creator;

  return (
    <div className="mini-site-container" style={{ backgroundColor: theme.background, color: theme.text }}>
      <header style={{ borderBottom: `2px solid ${theme.primary}` }}>
        <img src={token.image} alt={`${token.name} logo`} className="mini-site-logo" />
        <h1 style={{ color: theme.primary }}>{token.name}</h1>
        <div className="holder-count">{token.marketStats?.holders} holders</div>
        <div style={{ marginTop: 6 }}>
          <b>CA: </b>
          <span
            style={{ cursor: 'pointer', textDecoration: 'underline', color: theme.primary }}
            onClick={() => copyToClipboard(token.mintAddress)}
            title="Click to copy contract address"
          >
            {token.mintAddress || 'N/A'}
          </span>
        </div>
      </header>

      <nav>
        <button style={{ backgroundColor: theme.buttonBg, color: theme.buttonText, marginRight: 8 }}>Buy</button>
        <a href={token.buttons?.find(b => b.label.includes('Twitter'))?.href || '#'} target="_blank" rel="noopener noreferrer">
          <button style={{ backgroundColor: theme.buttonBg, color: theme.buttonText, marginRight: 8 }}>Twitter</button>
        </a>
        <a href={`https://dexscreener.com/solana/${token.mintAddress}`} target="_blank" rel="noopener noreferrer">
          <button style={{ backgroundColor: theme.buttonBg, color: theme.buttonText, marginRight: 8 }}>Dexscreener</button>
        </a>
        {token.buttons?.find(b => b.label.includes('Telegram'))?.href && (
          <a href={token.buttons.find(b => b.label.includes('Telegram')).href} target="_blank" rel="noopener noreferrer">
            <button style={{ backgroundColor: theme.buttonBg, color: theme.buttonText }}>Telegram</button>
          </a>
        )}
      </nav>

      {/* Bouton Modifier visible uniquement par le créateur */}
      {isCreator && (
        <button
          onClick={() => navigate(`/edit-site/${slug}`)}
          style={{
            marginTop: 20,
            backgroundColor: theme.primary,
            color: theme.buttonText,
            padding: '8px 16px',
            border: 'none',
            borderRadius: 6,
            cursor: 'pointer'
          }}
        >
          Modifier le site
        </button>
      )}

      <main>
        <section className="about" style={{ borderColor: theme.secondary }}>
          <h2>About</h2>
          <p>{token.description}</p>
        </section>
      </main>

      <footer style={{ borderTop: `2px solid ${theme.primary}`, marginTop: 40, padding: 20 }}>
        <small>© {new Date().getFullYear()} {token.name} - Powered by The Alpha Hub</small>
      </footer>
    </div>
  );
}
