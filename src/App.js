import React, { useMemo, useState } from "react";
import * as solanaWeb3 from "@solana/web3.js";
import { BrowserRouter, Routes, Route, useNavigate } from "react-router-dom";
import HomePage from "./HomePage";
import TokenPage from "./TokenPage";
import TokenMiniSite from "./TokenMiniSite";
import TokenForm from "./TokenForm";
import TokenList from "./TokenList";
import EmojiDebug from "./EmojiDebug";
import ReportsDashboard from "./ReportsDashboard";
import DaoVotePage from "./DaoVotePage";
import ProfilePage from "./ProfilePage";
import Header from "./Header";
import UserProfile from "./UserProfile";
import Leaderboard from "./Leaderboard";
import AdminPanel from "./AdminPanel";
import LaunchCountdown from "./LaunchCountdown";
import PrivacyPolicy from "./PrivacyPolicy";
import TermsOfService from "./TermsOfService";
import Fees from "./Fees";
import TechUpdates from "./TechUpdates";
import DaoInfo from "./DaoInfo";
import Footer from "./Footer";

// 👇 Ajouté ici
import { BuyButton } from "./components/BuyButton";
import InitBondingCurve from "./components/InitBondingCurve"; // ✅ Import ajouté

import {
  ConnectionProvider,
  WalletProvider,
  useWallet,
} from "@solana/wallet-adapter-react";
import { WalletModalProvider } from "@solana/wallet-adapter-react-ui";
import { PhantomWalletAdapter } from "@solana/wallet-adapter-wallets";
import "@solana/wallet-adapter-react-ui/styles.css";
import "./App.css";
import "./mobile.css";

import {
  TOKEN_PROGRAM_ID,
  MINT_SIZE,
  createInitializeMintInstruction,
  getAssociatedTokenAddress,
  createAssociatedTokenAccountInstruction,
  createMintToInstruction,
} from "@solana/spl-token";

const endpoint = "https://api.devnet.solana.com";

// ---- Token Creation Button Component ----
function CreateTokenWithForm({ formValues, onTokenCreated }) {
  const wallet = useWallet();
  const [mintAddress, setMintAddress] = useState(null);
  const [error, setError] = useState(null);
  const navigate = useNavigate();

  const handleCreateToken = async () => {
    setError(null);
    try {
      if (!wallet.publicKey || !wallet.signTransaction) {
        setError("Please connect your Phantom wallet!");
        return;
      }
      const connection = new solanaWeb3.Connection(endpoint, "confirmed");
      const mint = solanaWeb3.Keypair.generate();
      const lamports = await connection.getMinimumBalanceForRentExemption(MINT_SIZE);
      const ata = await getAssociatedTokenAddress(mint.publicKey, wallet.publicKey);

      const transaction = new solanaWeb3.Transaction().add(
        solanaWeb3.SystemProgram.createAccount({
          fromPubkey: wallet.publicKey,
          newAccountPubkey: mint.publicKey,
          space: MINT_SIZE,
          lamports,
          programId: TOKEN_PROGRAM_ID,
        }),
        createInitializeMintInstruction(
          mint.publicKey,
          9,
          wallet.publicKey,
          wallet.publicKey
        ),
        createAssociatedTokenAccountInstruction(
          wallet.publicKey,
          ata,
          wallet.publicKey,
          mint.publicKey
        ),
        createMintToInstruction(
          mint.publicKey,
          ata,
          wallet.publicKey,
          1_000_000_000_000
        )
      );

      transaction.feePayer = wallet.publicKey;
      transaction.recentBlockhash = (await connection.getLatestBlockhash()).blockhash;
      transaction.partialSign(mint);

      const signed = await wallet.signTransaction(transaction);
      const sig = await connection.sendRawTransaction(signed.serialize());
      await connection.confirmTransaction(sig, "confirmed");
      setMintAddress(mint.publicKey.toBase58());

      const slug = formValues.name
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/(^-|-$)/g, "");
      const newToken = {
        mintAddress: mint.publicKey.toBase58(),
        slug,
        ...formValues,
        badges: [
          { label: "LP BURN" },
          { label: "CREATOR CLEAN" }
        ],
        buttons: [
          { label: "💬 Telegram", href: formValues.telegram || "#" },
          { label: "🐦 Twitter", href: formValues.twitter || "#" },
          { label: "🌐 Website", href: formValues.websiteOption === "custom" ? formValues.customSiteUrl : "#" }
        ],
        marketStats: {
          marketcap: "N/A",
          liquidity: "N/A",
          holders: "N/A",
          creator: wallet.publicKey.toBase58()
        },
        holders: []
      };

      await fetch('/api/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newToken)
      });

      if (onTokenCreated) {
        onTokenCreated(newToken);
        navigate(`/tokens/${slug}`);
      }
    } catch (err) {
      setError(err.message || "An error occurred during creation");
    }
  };

  return (
    <div style={{ textAlign: "center", marginTop: 20 }}>
      <button onClick={handleCreateToken} disabled={!wallet.connected}>
        🚀 Launch on Solana
      </button>
      {mintAddress && (
        <div>
          <b>Token mint address:</b> <span>{mintAddress}</span>
        </div>
      )}
      {error && <div style={{ color: "red", marginTop: 10 }}>{error}</div>}
    </div>
  );
}

// ---- Barre profil affichée après le header ----
function ProfileBar() {
  const { publicKey } = useWallet();

  if (!publicKey)
    return (
      <div style={{ color: "#fff", textAlign: "center", marginTop: 60 }}>
        Connect your wallet to see your profile.
      </div>
    );

  return (
    <UserProfile
      userWallet={publicKey.toString()}
      connectedWallet={publicKey.toString()}
    />
  );
}

// ---- Le contenu principal de l'app ----
function AppContent() {
  const [formValues, setFormValues] = useState(null);
  const [createdToken, setCreatedToken] = useState(null);
  const { publicKey } = useWallet();

  return (
    <>
      <BrowserRouter>
        <Header />
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
          <Routes>
          <Route path="/" element={<LaunchCountdown />} />
          <Route path="/home" element={<HomePage />} />
          <Route path="/tokens" element={<TokenList />} />
          <Route
            path="/create"
            element={
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  justifyContent: "center",
                  minHeight: "100vh",
                  background: "#23232b",
                }}
              >
                {!formValues && <TokenForm onSubmit={setFormValues} />}
                {formValues && (
                  <CreateTokenWithForm
                    formValues={formValues}
                    onTokenCreated={setCreatedToken}
                  />
                )}
                {createdToken && (
                  <div
                    style={{
                      marginTop: 30,
                      background: "#ffd42b",
                      padding: 20,
                      borderRadius: 10,
                    }}
                  >
                    <h3>✅ Your token was created!</h3>
                    <div>
                      <b>Name:</b> {createdToken.name}
                      <br />
                      <b>Symbol:</b> {createdToken.ticker}
                      <br />
                      <b>Description:</b> {createdToken.description}
                      <br />
                      <b>Mint:</b> {createdToken.mintAddress}
                    </div>
                  </div>
                )}
              </div>
            }
          />
          <Route path="/tokens/:slug" element={<TokenPage />} />
          <Route path="/mini-site/:slug" element={<TokenMiniSite />} />
          <Route path="/emojidebug" element={<EmojiDebug />} />
          <Route path="/admin/reports" element={<ReportsDashboard />} />
          <Route path="/dao" element={<DaoVotePage />} />
          <Route path="/profile" element={<ProfileBar />} />
          <Route
            path="/leaderboard"
            element={
              <Leaderboard
                connectedWallet={publicKey ? publicKey.toString() : null}
              />
            }
          />

          {/* ✅ Page d’achat */}
          <Route path="/buy-test" element={<BuyButton />} />

          {/* ✅ Nouvelle route pour init bonding curve */}
          <Route path="/init-bonding" element={<InitBondingCurve />} />
          
          {/* 🛠️ Panel d'administration */}
          <Route path="/admin" element={<AdminPanel />} />
          
          {/* 🚀 Page de compte à rebours */}
          <Route path="/countdown" element={<LaunchCountdown />} />
          
          {/* 🔒 Page de politique de confidentialité */}
          <Route path="/privacy" element={<PrivacyPolicy />} />
          
          {/* 📋 Page des conditions d'utilisation */}
          <Route path="/terms" element={<TermsOfService />} />
          
          {/* 💰 Page des frais */}
          <Route path="/fees" element={<Fees />} />
          
          {/* 🔧 Page des mises à jour techniques */}
          <Route path="/updates" element={<TechUpdates />} />
          
          {/* 🏛️ Page d'information DAO */}
          <Route path="/dao-info" element={<DaoInfo />} />
          </Routes>
        </div>
        <Footer />
      </BrowserRouter>
    </>
  );
}

// ---- Composant racine App ----
function App() {
  const wallets = useMemo(() => [new PhantomWalletAdapter()], []);

  return (
    <ConnectionProvider endpoint={endpoint}>
      <WalletProvider wallets={wallets} autoConnect>
        <WalletModalProvider>
          <AppContent />
        </WalletModalProvider>
      </WalletProvider>
    </ConnectionProvider>
  );
}

export default App;
