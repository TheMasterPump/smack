import React, { useMemo, useCallback } from "react";
import { ConnectionProvider, WalletProvider, useWallet } from "@solana/wallet-adapter-react";
import { WalletModalProvider, WalletMultiButton } from "@solana/wallet-adapter-react-ui";
import { PhantomWalletAdapter } from "@solana/wallet-adapter-wallets";
import { clusterApiUrl, Connection, Keypair, PublicKey, Transaction } from "@solana/web3.js";
import { createMint } from "@solana/spl-token";
import "@solana/wallet-adapter-react-ui/styles.css";

const endpoint = "https://api.devnet.solana.com";

function TokenCreator() {
  const wallet = useWallet();

  const handleCreateToken = useCallback(async () => {
    if (!wallet.publicKey || !wallet.signTransaction) {
      alert("Connect your wallet first !");
      return;
    }

    const connection = new Connection(endpoint, "confirmed");

    // Transaction: création du mint (token)
    const mint = Keypair.generate();

    // createMint de SPL Token nécessite payer, mint, authority, freezeAuthority, decimals
    const tx = await createMint(
      connection,
      wallet.adapter, // payer (remonte du wallet connecté)
      wallet.publicKey, // mint authority
      null, // freeze authority (optionnel)
      9 // decimals
    );
    alert("Token mint créé : " + tx.toBase58());
  }, [wallet]);

  return (
    <div style={{ marginTop: 40 }}>
      <button onClick={handleCreateToken} disabled={!wallet.connected}>
        Créer un Token SPL
      </button>
    </div>
  );
}

function App() {
  const wallets = useMemo(() => [new PhantomWalletAdapter()], []);
  return (
    <ConnectionProvider endpoint={endpoint}>
      <WalletProvider wallets={wallets} autoConnect>
        <WalletModalProvider>
          <div style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            height: "100vh",
            justifyContent: "center"
          }}>
            <WalletMultiButton />
            <TokenCreator />
          </div>
        </WalletModalProvider>
      </WalletProvider>
    </ConnectionProvider>
  );
}

export default App;
