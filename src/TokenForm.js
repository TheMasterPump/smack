import React, { useState } from "react";
import { useWallet, useConnection } from "@solana/wallet-adapter-react";
import { LAMPORTS_PER_SOL, SystemProgram, Transaction, PublicKey, Keypair } from "@solana/web3.js";
import {
  TOKEN_PROGRAM_ID,
  MINT_SIZE,
  createInitializeMintInstruction,
  getAssociatedTokenAddress,
  createAssociatedTokenAccountInstruction,
  createMintToInstruction,
} from "@solana/spl-token";
import { initializeBondingCurve } from "./utils/bondingClient";
import './TokenForm.css';

const FEE_RECEIVER = "8hXGeqAkS2GezfSiCVjfNzqjobLmognqJsqyA75ZL79R"; // <-- MET TON WALLET SOL
const FEE_AMOUNT = 0.06 * LAMPORTS_PER_SOL;

export default function TokenForm() {
  const wallet = useWallet();
  const { connection } = useConnection(); // ⚡️ LA CORRECTION ! 
  const [form, setForm] = useState({
    name: "",
    ticker: "",
    description: "",
    twitter: "",
    telegram: "",
    websiteOption: "none",
    customSiteUrl: "",
    theme: "dark",
    imgType: "upload",
    aiPrompt: "",
  });
  const [mintAddress, setMintAddress] = useState(null);
  const [formError, setFormError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isPaying, setIsPaying] = useState(false);

  const [imagePreview, setImagePreview] = useState("");
  const [imageFile, setImageFile] = useState(null);
  const [isGenerating, setIsGenerating] = useState(false);

  function handleChange(e) {
    const { name, value } = e.target;
    setForm(f => ({ ...f, [name]: value }));
  }

  function handleImageChange(e) {
    const file = e.target.files[0];
    if (file) {
      setImageFile(file);
      setImagePreview(URL.createObjectURL(file));
    }
  }

  function validateForm() {
    if (!form.name || form.name.length < 2 || form.name.length > 60)
      return "Name is required (2-60 chars)";
    if (!form.ticker || form.ticker.length < 1 || form.ticker.length > 16)
      return "Ticker is required (1-16 chars)";
    if (/<script/i.test(form.name) || /<script/i.test(form.ticker) || /<script/i.test(form.description || ""))
      return "No script tags allowed!";
    if (form.twitter && !/^https?:\/\/(www\.)?(twitter|x)\.com\//.test(form.twitter))
      return "Invalid Twitter URL";
    if (form.telegram && !/^https?:\/\/t\.me\//.test(form.telegram))
      return "Invalid Telegram URL";
    if (form.customSiteUrl && !/^https?:\/\//.test(form.customSiteUrl))
      return "Invalid website URL";
    if (form.description && form.description.length > 240)
      return "Description too long (max 240 chars)";
    return "";
  }

  async function generateAiImage() {
    if (!form.aiPrompt) {
      alert("Please write a prompt!");
      return;
    }
    setIsGenerating(true);
    try {
      const res = await fetch("/api/generate-ai", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt: form.aiPrompt }),
      });
      const result = await res.json();
      if (result.imageUrl) {
        setImagePreview(result.imageUrl);
        setImageFile(null);
      } else {
        alert("Image generation failed");
      }
    } catch {
      alert("AI generation error");
    }
    setIsGenerating(false);
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setFormError("");
    setIsSubmitting(true);

    // --- VALIDATION ---
    const errorMsg = validateForm();
    if (errorMsg) {
      setFormError(errorMsg);
      setIsSubmitting(false);
      return;
    }

    let imageUrl = "";

    // 1. Upload image
    if (form.imgType === "upload" && imageFile) {
      const data = new FormData();
      data.append("image", imageFile);
      const res = await fetch("/api/upload", {
        method: "POST",
        body: data,
      });
      const result = await res.json();
      if (result.imageUrl) {
        imageUrl = result.imageUrl;
      } else {
        setFormError("Image upload failed");
        setIsSubmitting(false);
        return;
      }
    } else if (form.imgType === "ai" && imagePreview) {
      imageUrl = imagePreview;
    }

    if (!wallet.publicKey) {
      setFormError("Connect your Phantom wallet!");
      setIsSubmitting(false);
      return;
    }

    // ============ STEP 1 : Payment ============
    let feeSignature = "";
    setIsPaying(true);
    try {
      console.log('💰 Paiement des frais:', FEE_AMOUNT / LAMPORTS_PER_SOL, 'SOL à', FEE_RECEIVER);
      
      const transaction = new Transaction().add(
        SystemProgram.transfer({
          fromPubkey: wallet.publicKey,
          toPubkey: new PublicKey(FEE_RECEIVER),
          lamports: FEE_AMOUNT,
        })
      );

      // Préparer la transaction
      const { blockhash } = await connection.getLatestBlockhash();
      transaction.recentBlockhash = blockhash;
      transaction.feePayer = wallet.publicKey;

      // Signer et envoyer
      const signed = await wallet.signTransaction(transaction);
      const signature = await connection.sendRawTransaction(signed.serialize());
      console.log('✅ Transaction envoyée:', signature);

      // Confirmer
      await connection.confirmTransaction(signature, 'confirmed');
      console.log('✅ Paiement confirmé !');
      
      feeSignature = signature;
      
    } catch (e) {
      console.error('❌ Erreur paiement:', e);
      setFormError(`Erreur lors du paiement: ${e.message || 'Transaction échouée'}`);
      setIsPaying(false);
      setIsSubmitting(false);
      return;
    }
    setIsPaying(false);

    // ============ STEP 2 : Create token on-chain FIRST ============
    let mintAddress = "";
    let bondingCurvePda = "";
    
    try {
      console.log('🔧 Création du token on-chain...');
      setFormError("Étape 1/4: Génération des clés...");
      
      // 1. CREATE TOKEN ON-CHAIN
      const mint = Keypair.generate();
      console.log('🔑 Keypair généré:', mint.publicKey.toBase58());
      
      setFormError("Étape 2/4: Calcul des frais de rent...");
      const lamports = await connection.getMinimumBalanceForRentExemption(MINT_SIZE);
      console.log('💰 Lamports requis:', lamports);
      
      setFormError("Étape 3/4: Création du token account...");
      const ata = await getAssociatedTokenAddress(mint.publicKey, wallet.publicKey);
      console.log('🏦 ATA:', ata.toBase58());

      const transaction = new Transaction().add(
        SystemProgram.createAccount({
          fromPubkey: wallet.publicKey,
          newAccountPubkey: mint.publicKey,
          space: MINT_SIZE,
          lamports,
          programId: TOKEN_PROGRAM_ID,
        }),
        createInitializeMintInstruction(
          mint.publicKey,
          9, // decimals
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
          1_000_000_000 * Math.pow(10, 9) // 1 billion tokens with 9 decimals
        )
      );

      transaction.feePayer = wallet.publicKey;
      transaction.recentBlockhash = (await connection.getLatestBlockhash()).blockhash;
      transaction.partialSign(mint);

      const signed = await wallet.signTransaction(transaction);
      const sig = await connection.sendRawTransaction(signed.serialize());
      await connection.confirmTransaction(sig, "confirmed");
      
      mintAddress = mint.publicKey.toBase58();
      setMintAddress(mintAddress);
      console.log('✅ Token créé:', mintAddress);
      
      // 2. INITIALIZE BONDING CURVE
      try {
        console.log('🔧 Initialisation bonding curve...');
        bondingCurvePda = await initializeBondingCurve(wallet, connection, mint.publicKey);
        console.log('✅ Bonding curve créée:', bondingCurvePda);
      } catch (bcError) {
        console.error("❌ Bonding curve failed:", bcError);
        // Continue without bonding curve for now
        bondingCurvePda = "";
      }
      
      // 3. SAVE EVERYTHING IN DB (with all data)
      const slug = form.name
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/(^-|-$)/g, "");

      console.log('💾 Sauvegarde en DB...');
      const saveToken = await fetch("/api/token", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          slug,
          name: form.name,
          ticker: form.ticker,
          description: form.description,
          twitter: form.twitter,
          telegram: form.telegram,
          websiteOption: form.websiteOption,
          customSiteUrl: form.customSiteUrl,
          theme: form.theme,
          image: imageUrl,
          creatorWallet: wallet.publicKey.toBase58(),
          feeSignature, // preuve du paiement
          mintAddress, // ✅ Address du token créé
          bondingCurve: bondingCurvePda // ✅ PDA de la bonding curve
        }),
      });

      if (!saveToken.ok) {
        const errorData = await saveToken.text();
        console.error('❌ Erreur sauvegarde:', errorData);
        throw new Error(`Failed to save token: ${errorData}`);
      }
      
      console.log('✅ Token sauvegardé en DB !');

      // Reset
      setForm({
        name: "",
        ticker: "",
        description: "",
        twitter: "",
        telegram: "",
        websiteOption: "none",
        customSiteUrl: "",
        theme: "dark",
        imgType: "upload",
        aiPrompt: "",
      });
      setImageFile(null);
      setImagePreview("");
      setFormError("");
    } catch (err) {
      setFormError("Failed to save token: " + (err.message || err));
    }
    setIsSubmitting(false);
  }

  return (
    <div className="form-card-wrapper">
      <form className="token-form-container" id="token-form" onSubmit={handleSubmit}>
        <div className="form-title">Launch your memecoin</div>
        <div className="form-subtitle">A single button to create your memecoin, website, and generate an image.</div>

        {formError && (
          <div style={{ color: "red", marginBottom: 12, fontWeight: 600 }}>{formError}</div>
        )}

        <div className="form-row">
          <div className="form-field half">
            <label>Token Name</label>
            <input
              name="name"
              value={form.name}
              onChange={handleChange}
              required
              placeholder="Name Memecoin"
            />
          </div>
          <div className="form-field half">
            <label>Ticker</label>
            <input
              name="ticker"
              value={form.ticker}
              onChange={handleChange}
              required
              maxLength={16}
              placeholder="MEMECOIN"
            />
          </div>
        </div>

        <div className="form-row">
          <div className="form-field full">
            <label>Description</label>
            <textarea
              name="description"
              value={form.description}
              onChange={handleChange}
              placeholder="Description of your memecoin."
              rows={3}
            />
          </div>
        </div>

        <div className="form-row">
          <div className="form-field half">
            <label>X URL (optional)</label>
            <input
              name="twitter"
              value={form.twitter}
              onChange={handleChange}
              placeholder="https://x.com/yourhandle"
            />
          </div>
          <div className="form-field half">
            <label>Telegram URL (optional)</label>
            <input
              name="telegram"
              value={form.telegram}
              onChange={handleChange}
              placeholder="https://t.me/yourchannel"
            />
          </div>
        </div>

        <div className="form-row">
          <div className="form-field full">
            <label>Token image (optional)</label>
            <div className="radio-row">
              <label>
                <input
                  type="radio"
                  name="imgType"
                  checked={form.imgType === "ai"}
                  onChange={() => setForm(f => ({ ...f, imgType: "ai" }))}
                />
                Generate with AI
              </label>
              <label>
                <input
                  type="radio"
                  name="imgType"
                  checked={form.imgType === "upload"}
                  onChange={() => setForm(f => ({ ...f, imgType: "upload" }))}
                />
                Upload image
              </label>
            </div>
            {form.imgType === "upload" ? (
              <>
                <input type="file" accept="image/*" onChange={handleImageChange} />
                {imagePreview && <img src={imagePreview} alt="Preview" className="img-preview" />}
              </>
            ) : (
              <>
                <input
                  type="text"
                  placeholder="Describe your token (prompt)"
                  value={form.aiPrompt}
                  onChange={e => setForm(f => ({ ...f, aiPrompt: e.target.value }))}
                  style={{ width: "100%" }}
                />
                <button
                  type="button"
                  onClick={generateAiImage}
                  style={{ marginTop: 6 }}
                  disabled={isGenerating}
                  className="form-button ai"
                >
                  {isGenerating ? "Generating..." : "Generate"}
                </button>
                {imagePreview && <img src={imagePreview} alt="Preview" className="img-preview" />}
              </>
            )}
          </div>
        </div>

        <div className="form-row">
          <div className="form-field full">
            <label>Website</label>
            <select name="websiteOption" value={form.websiteOption} onChange={handleChange}>
              <option value="none">No website</option>
              <option value="auto">Auto-generate a website</option>
              <option value="custom">I have my own website</option>
            </select>
            {form.websiteOption === "custom" && (
              <>
                <label>Your website URL</label>
                <input
                  name="customSiteUrl"
                  value={form.customSiteUrl}
                  onChange={handleChange}
                  placeholder="https://yourwebsite.com"
                />
              </>
            )}
            {form.websiteOption === "auto" && (
              <>
                <label>Website theme</label>
                <select name="theme" value={form.theme} onChange={handleChange}>
                  <option value="dark">Dark</option>
                  <option value="light">Light</option>
                  <option value="cartoon">Cartoon</option>
                  <option value="pixel">Pixel</option>
                  <option value="bonkOrange">Bonk Orange</option>
                  <option value="pepeGreen">Pepe Green</option>
                </select>
              </>
            )}
          </div>
        </div>

        {mintAddress && (
          <div style={{ marginTop: 18 }}>
            <b>Token mint address:</b> {mintAddress}
          </div>
        )}

        {(isSubmitting || isPaying) && (
          <div style={{ marginTop: 10, color: "#333" }}>
            {isPaying
              ? "Waiting for transaction confirmation (fee 0.06 SOL)..."
              : "Creating token, please wait..."}
          </div>
        )}
      </form>
      <div className="form-button-outer">
        <button className="form-button" type="submit" form="token-form" disabled={isSubmitting || isPaying}>
          Launch
        </button>
      </div>
    </div>
  );
}
