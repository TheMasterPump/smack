import React, { useState, useEffect } from "react";
import { useWallet } from "@solana/wallet-adapter-react";
import { useConnection } from "@solana/wallet-adapter-react";
import * as web3 from "@solana/web3.js";
import { 
  buyToken, 
  sellToken, 
  calculatePrice, 
  getCurrentPrice, 
  getBondingCurveData 
} from "../utils/bondingClient";

// Props: ticker, mintAddress, prixActuel, solBalance, onBuy (fonction async)
export default function BuyBox({ ticker = "TOKEN", mintAddress, prixActuel = 0.01, solBalance = 0, onBuy }) {
  const wallet = useWallet();
  const { connection } = useConnection();
  const [mode, setMode] = useState("buy");
  const [amount, setAmount] = useState("");
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState("");
  const [currentPrice, setCurrentPrice] = useState(prixActuel);
  const [bondingCurveData, setBondingCurveData] = useState(null);

  const quickAmounts = [0.1, 0.3, 0.5, 1];
  const estimatedTokens = amount && currentPrice > 0
    ? (parseFloat(amount) / currentPrice).toFixed(2)
    : "0";

  // Load bonding curve data and price
  useEffect(() => {
    const loadData = async () => {
      if (!mintAddress || !connection) return;
      
      try {
        const price = await getCurrentPrice(connection, new web3.PublicKey(mintAddress));
        if (price) setCurrentPrice(price);
        
        const curveData = await getBondingCurveData(connection, new web3.PublicKey(mintAddress));
        setBondingCurveData(curveData);
      } catch (err) {
        console.error("Error loading bonding curve data:", err);
      }
    };
    
    loadData();
    const interval = setInterval(loadData, 10000);
    return () => clearInterval(interval);
  }, [mintAddress, connection]);

  async function handleBuy() {
    if (!wallet.connected || !wallet.publicKey) {
      setStatus("Erreur : Connectez votre wallet");
      return;
    }
    
    setLoading(true);
    setStatus("");
    try {
      // Use the new buyToken function if mintAddress is provided
      if (mintAddress && connection) {
        // Convert SOL amount to token deltaQ (assuming we want to buy tokens worth this SOL amount)
        // For now, let's assume 1 SOL = 1000 tokens as a simple conversion
        const deltaQ = Math.floor(parseFloat(amount) * 1000 * 1e9); // tokens with 9 decimals
        const tx = await buyToken(wallet, connection, mintAddress, deltaQ);
        setStatus(`✅ Achat réussi ! TX: ${tx.slice(0, 8)}...`);
        setAmount("");
      } else if (onBuy) {
        // Fallback to old onBuy prop
        await onBuy(parseFloat(amount));
        setStatus(`✅ Achat réussi !`);
      } else {
        setStatus("Erreur : Configuration manquante");
      }
    } catch (e) {
      setStatus("Erreur : " + (e.message || e));
    }
    setLoading(false);
  }

  async function handleSell() {
    if (!wallet.connected || !wallet.publicKey) {
      setStatus("Erreur : Connectez votre wallet");
      return;
    }
    
    setLoading(true);
    setStatus("");
    try {
      if (mintAddress && connection) {
        // Convert amount to token units with decimals
        const deltaQ = Math.floor(parseFloat(amount) * 1e9); // tokens with 9 decimals
        const tx = await sellToken(wallet, connection, mintAddress, deltaQ);
        setStatus(`✅ Vente réussie ! TX: ${tx.slice(0, 8)}...`);
        setAmount("");
      } else {
        setStatus("Erreur : Configuration manquante");
      }
    } catch (e) {
      setStatus("Erreur : " + (e.message || e));
    }
    setLoading(false);
  }

  return (
    <div className="buybox-container">
      <div className="buybox-tabs">
        <button
          className={mode === "buy" ? "active" : ""}
          onClick={() => setMode("buy")}
          style={{
            background: mode === "buy" ? "#27eb91" : "#232324",
            color: mode === "buy" ? "#23232b" : "#ffcc32"
          }}
        >Buy</button>
        <button
          className={mode === "sell" ? "active" : ""}
          onClick={() => setMode("sell")}
          style={{
            background: mode === "sell" ? "#fb4023" : "#232324",
            color: mode === "sell" ? "#fff" : "#fb4023",
            borderLeft: "2px solid #232324"
          }}
        >Sell</button>
      </div>
      <input
        className="buybox-input"
        type="number"
        min={0}
        step={0.0001}
        placeholder="Amount in SOL"
        value={amount}
        onChange={e => setAmount(e.target.value)}
        disabled={loading}
      />
      <div className="buybox-quick">
        {quickAmounts.map(v => (
          <button
            key={v}
            type="button"
            onClick={() => setAmount(String(v))}
            disabled={loading}
          >{v} SOL</button>
        ))}
        <button
          type="button"
          onClick={() => setAmount(String(solBalance))}
          disabled={loading}
        >Max</button>
      </div>
      <div className="buybox-estimate">
        {mode === "buy" ? (
          <>
            Tu recevras : <b>{estimatedTokens} {ticker}</b>
            <span className="buybox-price">(Prix actuel : {currentPrice.toFixed(8)} SOL/token)</span>
          </>
        ) : (
          <>
            Tu recevras : <b>{(parseFloat(amount || 0) * currentPrice).toFixed(4)} SOL</b>
            <span className="buybox-price">(Prix actuel : {currentPrice.toFixed(8)} SOL/token)</span>
          </>
        )}
        {bondingCurveData && (
          <div style={{ fontSize: '12px', marginTop: '5px', color: '#888' }}>
            Supply: {(bondingCurveData.currentSupply / 1e9).toFixed(0)} / {(bondingCurveData.maxSupply / 1e9).toFixed(0)}
          </div>
        )}
      </div>
      <button
        className="buybox-buy-btn"
        style={{
          background: "#27eb91",
          color: "#23232b",
          fontWeight: 700,
          borderRadius: 8,
          fontSize: 16,
          padding: "11px 0",
          marginTop: 6,
          width: "100%",
          border: "none",
          transition: "background 0.18s"
        }}
        disabled={!amount || loading || Number(amount) <= 0}
        onClick={mode === "buy" ? handleBuy : handleSell}
      >
        {loading ? (mode === "buy" ? "Achat..." : "Vente...") : (mode === "buy" ? `Buy ${ticker}` : `Sell ${ticker}`)}
      </button>
      {status && (
        <div className="buybox-status" style={{
          color: status.startsWith("✅") ? "#22e96e" : "#fb4023",
          marginTop: 8, fontWeight: 500
        }}>
          {status}
        </div>
      )}
      <div className="buybox-wallet">
        Balance: {solBalance} SOL
        {bondingCurveData && (
          <span style={{ marginLeft: '10px', fontSize: '12px' }}>
            | Liquidity: {(bondingCurveData.realSolReserves / 1e9).toFixed(4)} SOL
          </span>
        )}
      </div>
      <div className="buybox-fee">
        + Solana network fee
      </div>
    </div>
  );
}
