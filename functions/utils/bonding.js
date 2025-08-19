const anchor = require("@project-serum/anchor");
const { web3, BN, Program, Wallet } = anchor;
const idl = require("../idl/meme_launch_bonding.json");

const PROGRAM_ID = new web3.PublicKey("EJ7dWpEMiUJ5jTjg3EkfS2hGY48PSrEM8r54HrFgZNrA");

// ADMIN PRIVATE KEY (pour tests/admin, mais pas pour payer la bonding côté prod)
const secret = JSON.parse(process.env.ADMIN_KEY_JSON);
const adminKeypair = web3.Keypair.fromSecretKey(new Uint8Array(secret));

function getProvider(connection) {
  return new anchor.AnchorProvider(connection, new Wallet(adminKeypair), { commitment: "confirmed" });
}

function getProgram(connection) {
  const provider = getProvider(connection);
  return new Program(idl, PROGRAM_ID, provider);
}

// Taille du compte BondingCurve (struct Anchor) :
const BONDING_CURVE_ACCOUNT_SIZE =
  8 +    // discriminator Anchor
  8 +    // a: u64
  8 +    // b: u64
  8 +    // c: u64
  8 +    // current_supply: u64
  8 +    // max_supply: u64
  8 +    // total_raised: u64
  1 +    // complete: bool
  32 +   // creator: publicKey
  8;     // real_sol_reserves: u64

// Fonction à utiliser côté BACKEND pour générer la transaction à signer côté USER
async function buildBondingCurveTx(connection, tokenMintPubkey, userPublicKey) {
  const program = getProgram(connection);

  // Générer la PDA
  const [bondingCurvePda] = web3.PublicKey.findProgramAddressSync(
    [Buffer.from("bonding_curve"), tokenMintPubkey.toBuffer()],
    PROGRAM_ID
  );

  // 1. Créer le compte system pour la PDA BondingCurve
  const lamports = await connection.getMinimumBalanceForRentExemption(BONDING_CURVE_ACCOUNT_SIZE);
  const createIx = web3.SystemProgram.createAccount({
    fromPubkey: userPublicKey,
    newAccountPubkey: bondingCurvePda,
    lamports,
    space: BONDING_CURVE_ACCOUNT_SIZE,
    programId: PROGRAM_ID,
  });

  // 2. Instruction Anchor initializeBondingCurve
  const ix = await program.methods
    .initializeBondingCurve(
      new BN(1),             // a
      new BN(2),             // b
      new BN(3),             // c
      new BN(100),           // max_supply
      userPublicKey          // creator
    )
    .accounts({
      bonding_curve: bondingCurvePda,     // snake_case exact (IDL)
      payer: userPublicKey,
      system_program: web3.SystemProgram.programId,
    })
    .instruction();

  // 3. Construire la transaction complète
  const tx = new web3.Transaction().add(createIx, ix);
  tx.feePayer = userPublicKey;
  const { blockhash } = await connection.getLatestBlockhash("finalized");
  tx.recentBlockhash = blockhash;

  // Retour en base64
  return {
    txBase64: tx.serialize({ requireAllSignatures: false }).toString("base64"),
    bondingCurveAddress: bondingCurvePda.toBase58(),
  };
}

// Fonction "admin" (à ne PAS utiliser pour le flow utilisateur, mais ok pour tests locaux)
async function initializeBondingCurveWithPDA(connection, tokenMintPubkey) {
  const program = getProgram(connection);
  const [bondingCurvePda] = web3.PublicKey.findProgramAddressSync(
    [Buffer.from("bonding_curve"), tokenMintPubkey.toBuffer()],
    PROGRAM_ID
  );

  // Même logique : créer la PDA avant d’initialiser
  const lamports = await connection.getMinimumBalanceForRentExemption(BONDING_CURVE_ACCOUNT_SIZE);
  const createIx = web3.SystemProgram.createAccount({
    fromPubkey: adminKeypair.publicKey,
    newAccountPubkey: bondingCurvePda,
    lamports,
    space: BONDING_CURVE_ACCOUNT_SIZE,
    programId: PROGRAM_ID,
  });

  const ix = await program.methods
    .initializeBondingCurve(
      new BN(1),
      new BN(2),
      new BN(3),
      new BN(100),
      adminKeypair.publicKey
    )
    .accounts({
      bonding_curve: bondingCurvePda,
      payer: adminKeypair.publicKey,
      system_program: web3.SystemProgram.programId,
    })
    .instruction();

  const tx = new web3.Transaction().add(createIx, ix);
  tx.feePayer = adminKeypair.publicKey;
  const { blockhash } = await connection.getLatestBlockhash("finalized");
  tx.recentBlockhash = blockhash;

  // Envoie la transaction signée
  await web3.sendAndConfirmTransaction(connection, tx, [adminKeypair]);
  return bondingCurvePda.toBase58();
}

module.exports = { buildBondingCurveTx, initializeBondingCurveWithPDA };
