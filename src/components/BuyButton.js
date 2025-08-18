import React, { useEffect, useState } from "react";
import { PublicKey, SystemProgram } from "@solana/web3.js";
import { useWallet, useConnection } from "@solana/wallet-adapter-react";
import { getProgram } from "../utils/bondingClient";
import * as anchor from "@project-serum/anchor";

export const BuyButton = () => {
  const { publicKey, signTransaction, connected } = useWallet();
  const { connection } = useConnection();
  const [loading, setLoading] = useState(false);
  const [config, setConfig] = useState(null);

  // 🔁 Charger les adresses depuis tokenConfig.json
  useEffect(() => {
    const loadConfig = async () => {
      try {
        const res = await fetch("/tokenConfig.json");
        const data = await res.json();
        setConfig(data);
      } catch (err) {
        console.error("Erreur chargement config :", err);
      }
    };
    loadConfig();
  }, []);

  const handleBuy = async () => {
    if (!publicKey || !signTransaction) return alert("Connecte ton wallet");
    if (!config) return alert("Config non chargée");

    setLoading(true);
    try {
      const program = getProgram({ publicKey, signTransaction, connection });

      await program.methods
        .buy(new anchor.BN(3)) // quantité à acheter
        .accounts({
          bonding_curve: new PublicKey(config.bondingCurve),
          global: new PublicKey(config.global),
          payer: publicKey,
          creator_vault: new PublicKey(config.creatorVault),
          fee_vault: new PublicKey(config.feeVault),
          system_program: SystemProgram.programId,
        })
        .rpc();

      alert("✅ Achat réussi !");
    } catch (e) {
      console.error(e);
      alert("❌ Erreur lors de l’achat");
    }
    setLoading(false);
  };

  return (
    <button onClick={handleBuy} disabled={!connected || loading || !config}>
      {loading ? "Achat..." : "Acheter 1 token"}
    </button>
  );
};
