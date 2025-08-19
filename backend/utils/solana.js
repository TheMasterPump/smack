import * as anchor from "@project-serum/anchor";
import { web3, BN, Program } from "@project-serum/anchor";
import idl from "../../src/idl/meme_launch_bonding.json"; // Vérifie le chemin selon ta structure

const PROGRAM_ID = new web3.PublicKey("EJ7dWpEMiUJ5jTjg3EkfS2hGY48PSrEM8r54HrFgZNrA");

export async function launchBondingCurve({
  connection,
  adminKeypair,      // Keypair du backend (admin)
  creatorWallet,      // Pubkey du créateur du token
  mint,               // Keypair du mint SPL créé
}) {
  // Provider Anchor
  const wallet = new anchor.Wallet(adminKeypair);
  const provider = new anchor.AnchorProvider(connection, wallet, { commitment: "confirmed" });
  const program = new Program(idl, PROGRAM_ID, provider);

  // Calcul des PDA (comme dans ton backend)
  const [curveAuthority] = web3.PublicKey.findProgramAddressSync(
    [Buffer.from("curve_authority"), mint.publicKey.toBuffer()],
    PROGRAM_ID
  );
  const [bondingCurve] = web3.PublicKey.findProgramAddressSync(
    [Buffer.from("bonding_curve"), mint.publicKey.toBuffer()],
    PROGRAM_ID
  );

  // Attention: il faut une ATA pour curve_vault (créée AVANT cet appel)
  const { getAssociatedTokenAddressSync } = await import("@solana/spl-token");
  const curveVault = getAssociatedTokenAddressSync(
    mint.publicKey,
    curveAuthority,
    true
  );

  // Appel du smart contract launch_curve
  let txIdCurve = await program.methods
    .launchCurve(
      new BN(1),        // a
      new BN(2),        // b
      new BN(3),        // c
      new BN(3),        // max_supply (personnalise selon besoin)
      new web3.PublicKey(creatorWallet) // creator
    )
    .accounts({
      payer: adminKeypair.publicKey,             // backend signer
      mint: mint.publicKey,                      // mint SPL
      curve_vault: curveVault,                   // ATA de curve authority
      bonding_curve: bondingCurve,               // PDA bonding curve
      curve_authority: curveAuthority,           // PDA authority
      token_program: web3.TOKEN_PROGRAM_ID,
      system_program: web3.SystemProgram.programId,
      associated_token_program: new web3.PublicKey("ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL"), // Standard SPL ATA program
      rent: new web3.PublicKey("SysvarRent111111111111111111111111111111111"),
    })
    .signers([adminKeypair, mint])   // admin + mint sont les seuls à signer
    .rpc();

  return {
    txIdCurve,
    curveAuthority: curveAuthority.toBase58(),
    bondingCurve: bondingCurve.toBase58(),
    curveVault: curveVault.toBase58()
  };
}
