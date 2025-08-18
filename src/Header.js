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
          src="/logo header.png" 
          alt="Logo" 
          style={{
            width: 750,
            height: 180,
            objectFit: "contain"
          }}
        />
      </div>
      <div style={{ position: "absolute", right: "48px", display: "flex", alignItems: "center" }}>
        <WalletMultiButton />
      </div>
    </header>
  );
}
