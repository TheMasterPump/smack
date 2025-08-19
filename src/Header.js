// src/Header.js
import React from "react";
import { Link } from "react-router-dom";
import { WalletMultiButton } from "@solana/wallet-adapter-react-ui";

export default function Header() {
  return (
    <header style={{
      background: "#232324",
      color: "#fff",
      padding: "20px 48px",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      boxShadow: "0 2px 16px #0002",
      width: "100%",
      boxSizing: "border-box",
      fontSize: "2rem",
      zIndex: 10,
      position: "relative",
      height: "150px"
    }}>
      <div className="logo" style={{ display: "flex", alignItems: "center", justifyContent: "center" }}>
        <img 
          src="/logo-header.png" 
          alt="Logo" 
          style={{
            width: 750,
            height: 180,
            objectFit: "contain"
          }}
        />
      </div>
      <div style={{ position: "absolute", right: "48px", top: "20px", display: "flex", flexDirection: "column", alignItems: "center", gap: "6px" }}>
        {/* Logo X avec lien vers Twitter */}
        <a 
          href="https://x.com/smackdotfun"
          target="_blank"
          rel="noopener noreferrer"
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: '28px',
            height: '28px',
            background: '#000',
            borderRadius: '50%',
            transition: 'all 0.3s ease',
            boxShadow: '0 4px 15px rgba(0, 0, 0, 0.3)',
            border: '1px solid #333',
            textDecoration: 'none',
            marginTop: '-8px'
          }}
          onMouseOver={(e) => {
            e.currentTarget.style.transform = 'scale(1.1)';
            e.currentTarget.style.boxShadow = '0 6px 20px rgba(0, 0, 0, 0.5)';
          }}
          onMouseOut={(e) => {
            e.currentTarget.style.transform = 'scale(1)';
            e.currentTarget.style.boxShadow = '0 4px 15px rgba(0, 0, 0, 0.3)';
          }}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="white">
            <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
          </svg>
        </a>
        
        <WalletMultiButton />
      </div>
    </header>
  );
}
