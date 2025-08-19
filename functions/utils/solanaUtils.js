// === /utils/solanaUtils.js ===

const anchor = require('@coral-xyz/anchor');
const { 
  Keypair, 
  PublicKey, 
  SystemProgram, 
  LAMPORTS_PER_SOL, 
  Connection
} = require('@solana/web3.js');
const {
  TOKEN_PROGRAM_ID,
  ASSOCIATED_TOKEN_PROGRAM_ID,
  MINT_SIZE,
  getAssociatedTokenAddress,
  createAssociatedTokenAccountInstruction,
  createInitializeMintInstruction
} = require('@solana/spl-token');
const fs = require('fs');
const path = require('path');

// --- AJOUT POUR LA FEE ---
const FEE_RECEIVER = "8hXGeqAkS2GezfSiCVjfNzqjobLmognqJsqyA75ZL79R"; // <-- ton wallet SOL
const FEE_AMOUNT = 0.06 * LAMPORTS_PER_SOL;
const FEE_CONNECTION = new Connection("https://api.devnet.solana.com", "confirmed");

const ADMIN_KEYPAIR_PATH = path.resolve(__dirname, '../admin-keypair.json');
const idl = require('../idl/meme_launch_bonding.json');
const PROGRAM_ID = new PublicKey("EJ7dWpEMiUJ5jTjg3EkfS2hGY48PSrEM8r54HrFgZNrA");
const CLUSTER = 'https://api.devnet.solana.com';

const adminKeypair = Keypair.fromSecretKey(
  Uint8Array.from(JSON.parse(fs.readFileSync(ADMIN_KEYPAIR_PATH, 'utf8')))
);
const connection = new anchor.web3.Connection(CLUSTER, 'confirmed');
const wallet = new anchor.Wallet(adminKeypair);
const provider = new anchor.AnchorProvider(connection, wallet, { preflightCommitment: 'confirmed' });
anchor.setProvider(provider);
const program = new anchor.Program(idl, PROGRAM_ID, provider);

// === VERIFICATION FEE ULTRA SIMPLE ===
async function verifyFeeTransaction(signature, userWalletPubkey) {
  console.log(`[FEE CHECK] Vérification fee tx ${signature} pour user ${userWalletPubkey}`);
  const tx = await FEE_CONNECTION.getTransaction(signature, { commitment: "confirmed" });
  if (!tx) throw new Error("Transaction introuvable !");
  if (tx.meta && tx.meta.err) throw new Error("Transaction failed!");

  // --- Extraction des adresses ---
  const keys = tx.transaction.message.accountKeys.map(k =>
    typeof k === "string" ? k : (k.toBase58 ? k.toBase58() : k.pubkey)
  );
  const fromIndex = keys.findIndex(k => k === userWalletPubkey);
  const toIndex = keys.findIndex(k => k === FEE_RECEIVER);
  if (fromIndex === -1 || toIndex === -1) throw new Error("Wallets not found in transaction!");

  const pre = tx.meta.preBalances;
  const post = tx.meta.postBalances;
  const sent = pre[fromIndex] - post[fromIndex];
  const received = post[toIndex] - pre[toIndex];

  // On accepte si reçu ≥ 0.06 SOL (prend en compte les frais de transaction)
  if (sent < FEE_AMOUNT || received < FEE_AMOUNT) {
    throw new Error("Fee payment not found or too low!");
  }
  console.log(`[FEE CHECK] ✅ Payment valid! ${sent / LAMPORTS_PER_SOL} SOL sent, ${received / LAMPORTS_PER_SOL} SOL received`);
  return true;
}

// ----------------------------------------------------------

async function initGlobal() {
  try {
    const [global] = await PublicKey.findProgramAddress(
      [Buffer.from("global")],
      PROGRAM_ID
    );
    const info = await connection.getAccountInfo(global);
    console.log('[initGlobal] PDA global:', global.toBase58());
    if (info) {
      console.log('[initGlobal] Déjà initialisé.');
      return { success: false, msg: "Déjà initialisé", global: global.toBase58() };
    }

    const fee_basis_points = new anchor.BN(100);
    const creator_fee_basis_points = new anchor.BN(100);
    const pool_migration_fee = new anchor.BN(0);
    const fee_recipient = adminKeypair.publicKey;
    const enable_migrate = false;

    const accountsObj = {
      global,
      payer: adminKeypair.publicKey,
      systemProgram: anchor.web3.SystemProgram.programId,
    };
    console.log('[initGlobal] Initialisation avec accounts:', accountsObj);

    const tx = await program.methods
      .initializeGlobal(
        fee_basis_points,
        creator_fee_basis_points,
        pool_migration_fee,
        fee_recipient,
        enable_migrate
      )
      .accounts(accountsObj)
      .signers([adminKeypair])
      .rpc();

    console.log('[initGlobal] Global initialisé ! Tx:', tx);
    return {
      success: true,
      tx,
      global: global.toBase58(),
    };
  } catch (e) {
    console.error('[initGlobal] ERROR:', e);
    if (e.logs) console.error('[initGlobal] Solana LOGS:\n', e.logs.join('\n'));
    if (e.transactionLogs) console.error('[initGlobal] TX LOGS:\n', JSON.stringify(e.transactionLogs, null, 2));
    if (e.message) console.error('[initGlobal] ERR MESSAGE:', e.message);
    throw e;
  }
}

async function launchCurve({ a, b, c, maxSupply, creator }) {
  console.log('\n--- [launchCurve] Démarrage ---');
  try {
    a = new anchor.BN(a);
    b = new anchor.BN(b);
    c = new anchor.BN(c);
    maxSupply = new anchor.BN(maxSupply);
    creator = new PublicKey(creator);

    const mint = Keypair.generate();
    console.log('[DEBUG/ENV] Nouveau Mint:', mint.publicKey.toBase58());

    const [curveAuthority] = await PublicKey.findProgramAddress(
      [Buffer.from("curve_authority"), mint.publicKey.toBuffer()],
      PROGRAM_ID
    );
    const [bondingCurve] = await PublicKey.findProgramAddress(
      [Buffer.from("bonding_curve"), mint.publicKey.toBuffer()],
      PROGRAM_ID
    );
    const curveVault = await getAssociatedTokenAddress(
      mint.publicKey,
      curveAuthority,
      true
    );

    const accountsObj = {
      payer: adminKeypair.publicKey,
      mint: mint.publicKey,
      curveVault: curveVault,
      bondingCurve: bondingCurve,
      curveAuthority: curveAuthority,
      tokenProgram: TOKEN_PROGRAM_ID,
      systemProgram: anchor.web3.SystemProgram.programId,
      associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
      rent: anchor.web3.SYSVAR_RENT_PUBKEY,
    };

    console.log('[launchCurve] COMPTES pour instruction:', Object.fromEntries(
      Object.entries(accountsObj).map(([k, v]) => [k, v.toBase58 ? v.toBase58() : v])
    ));

    const tx = await program.methods
      .launchCurve(
        a, b, c, maxSupply, creator
      )
      .accounts(accountsObj)
      .signers([adminKeypair, mint])
      .rpc();

    console.log('[launchCurve] SUCCESS! tx:', tx);

    return {
      success: true,
      tx,
      mint: mint.publicKey.toBase58(),
      bondingCurve: bondingCurve.toBase58(),
      curveVault: curveVault.toBase58(),
      curveAuthority: curveAuthority.toBase58()
    };
  } catch (e) {
    console.error('[launchCurve] ERROR:', e);
    if (e.logs) console.error('[launchCurve] Solana LOGS:\n', e.logs.join('\n'));
    if (e.transactionLogs) console.error('[launchCurve] TX LOGS:\n', JSON.stringify(e.transactionLogs, null, 2));
    if (e.message) console.error('[launchCurve] ERR MESSAGE:', e.message);
    throw e;
  }
}

async function buyToken({ mintPubkey, bondingCurvePubkey, deltaQ }) {
  console.log('\n--- [buyToken] START ---');
  try {
    console.log('[buyToken] Params:', { mintPubkey, bondingCurvePubkey, deltaQ });
    const [global] = await PublicKey.findProgramAddress(
      [Buffer.from("global")],
      PROGRAM_ID
    );
    const [curveAuthority] = await PublicKey.findProgramAddress(
      [Buffer.from("curve_authority"), new PublicKey(mintPubkey).toBuffer()],
      PROGRAM_ID
    );
    const [creatorVault] = await PublicKey.findProgramAddress(
      [Buffer.from("creator_vault"), new PublicKey(mintPubkey).toBuffer()],
      PROGRAM_ID
    );
    const [feeVault] = await PublicKey.findProgramAddress(
      [Buffer.from("fee_vault"), new PublicKey(mintPubkey).toBuffer()],
      PROGRAM_ID
    );
    const curveVault = await getAssociatedTokenAddress(
      new PublicKey(mintPubkey),
      curveAuthority,
      true
    );

    // LOG toutes les adresses
    console.log('[buyToken] global:', global.toBase58());
    console.log('[buyToken] curveAuthority:', curveAuthority.toBase58());
    console.log('[buyToken] creatorVault:', creatorVault.toBase58());
    console.log('[buyToken] feeVault:', feeVault.toBase58());
    console.log('[buyToken] curveVault:', curveVault.toBase58());

    const userTokenAccount = await getAssociatedTokenAddress(
      new PublicKey(mintPubkey),
      adminKeypair.publicKey
    );
    console.log('[buyToken] userTokenAccount:', userTokenAccount.toBase58());

    // Vérifie/crée ATA utilisateur
    const ataInfo = await connection.getAccountInfo(userTokenAccount);
    if (!ataInfo) {
      console.log('[buyToken] ATA user PAS trouvé, création...');
      const createAtaIx = createAssociatedTokenAccountInstruction(
        adminKeypair.publicKey,
        userTokenAccount,
        adminKeypair.publicKey,
        new PublicKey(mintPubkey)
      );
      const txCreate = new anchor.web3.Transaction().add(createAtaIx);
      const ataSig = await provider.sendAndConfirm(txCreate, [adminKeypair]);
      console.log('[buyToken] ATA user créé, tx:', ataSig);
    } else {
      console.log('[buyToken] ATA user déjà existant.');
    }

    // Construction des comptes pour l’achat
    const accountsObj = {
      bondingCurve: new PublicKey(bondingCurvePubkey),
      global: global,
      payer: adminKeypair.publicKey,
      creatorVault: creatorVault,
      feeVault: feeVault,
      mint: new PublicKey(mintPubkey),
      userTokenAccount: userTokenAccount,
      curveVault: curveVault,
      curveAuthority: curveAuthority,
      tokenProgram: TOKEN_PROGRAM_ID,
      systemProgram: SystemProgram.programId,
    };
    console.log('[buyToken] accountsObj:', Object.fromEntries(
      Object.entries(accountsObj).map(([k, v]) => [k, v.toBase58 ? v.toBase58() : v])
    ));

    // Appel smart contract achat
    console.log('[buyToken] Appel smart contract...');
    const tx = await program.methods.buy(new anchor.BN(deltaQ))
      .accounts(accountsObj)
      .signers([adminKeypair])
      .rpc();

    console.log('[buyToken] SUCCESS! tx:', tx);

    return {
      success: true,
      tx,
      userTokenAccount: userTokenAccount.toBase58(),
    };
  } catch (e) {
    console.error('[buyToken] ERROR:', e);
    if (e.logs) console.error('[buyToken] Solana logs:\n', e.logs.join('\n'));
    if (e.transactionLogs) console.error('[buyToken] TX LOGS:\n', JSON.stringify(e.transactionLogs, null, 2));
    if (e.message) console.error('[buyToken] ERR MESSAGE:', e.message);
    throw e;
  }
}

// === FONCTION POUR FETCH BONDING CURVE INFOS ===
async function getBondingCurveInfo(mintPubkeyStr) {
  const mintPubkey = new PublicKey(mintPubkeyStr);

  // Trouve le PDA de la bonding curve
  const [bondingCurvePDA] = await PublicKey.findProgramAddress(
    [Buffer.from("bonding_curve"), mintPubkey.toBuffer()],
    PROGRAM_ID
  );

  // Fetch les données du compte
  const account = await connection.getAccountInfo(bondingCurvePDA);
  if (!account) throw new Error("Bonding curve not found");

  // Décodage Anchor selon ton IDL
  const data = program.coder.accounts.decode('bondingCurve', account.data);

  // Supply du mint
  const mintInfo = await connection.getParsedAccountInfo(mintPubkey);
  const supply = mintInfo.value.data.parsed.info.supply;

  // Calcul prix actuel (optionnel, selon formule)
  const supplyNum = Number(supply);
  const a = Number(data.a);
  const b = Number(data.b);
  const c = Number(data.c);
  const price = a * (supplyNum ** 2) + b * supplyNum + c;

  return {
    bondingCurve: bondingCurvePDA.toBase58(),
    params: {
      a: data.a.toString(),
      b: data.b.toString(),
      c: data.c.toString(),
      maxSupply: data.maxSupply.toString(),
      currentSupply: supply
    },
    currentPrice: price.toString()
  };
}

// --- EXPORTS ---
module.exports = {
  initGlobal,
  launchCurve,
  buyToken,
  verifyFeeTransaction,
  getBondingCurveInfo,
  FEE_RECEIVER,
  FEE_AMOUNT
};
