import React, { useState } from "react";
import { useWallet, useConnection } from "@solana/wallet-adapter-react";
import { initializeBondingCurve } from "../utils/bondingClient";
import { PublicKey } from "@solana/web3.js";

const InitBondingCurve = ({ mintAddress }) => {
  const { publicKey, signTransaction } = useWallet();
  const { connection } = useConnection();
  const [tx, setTx] = useState(null);

  const handleInit = async () => {
    if (!publicKey || !signTransaction) {
      alert("Connecte ton wallet");
      return;
    }

    if (!mintAddress) {
      alert("Mint address is required");
      return;
    }

    try {
      const mintPubkey = new PublicKey(mintAddress);
      const bondingCurveAddress = await initializeBondingCurve(
        { publicKey, signTransaction },
        connection,
        mintPubkey
      );
      setTx(bondingCurveAddress);
      alert("✅ bonding_curve créé !");
    } catch (e) {
      console.error(e);
      alert("❌ Erreur lors de l'initialisation");
    }
  };

  return (
    <div style={{ padding: "20px", textAlign: "center" }}>
      <h2>🛠️ Initialisation du Bonding Curve</h2>
      <button onClick={handleInit}>Initialiser BondingCurve</button>
      {tx && (
        <div style={{ marginTop: "20px" }}>
          <p>✅ Adresse générée :</p>
          <code>{tx}</code>
        </div>
      )}
    </div>
  );
};

export default InitBondingCurve;
