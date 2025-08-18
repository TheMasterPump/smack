import { AnchorProvider, Program, web3, BN } from "@project-serum/anchor";
import * as splToken from "@solana/spl-token";
import idl from "../idl/meme_launch_bonding.json";

const PROGRAM_ID = new web3.PublicKey("EJ7dWpEMiUJ5jTjg3EkfS2hGY48PSrEM8r54HrFgZNrA");
const COMMITMENT = "confirmed";

// Constants for bonding curve
const INITIAL_PRICE = 0.000001; // Initial price in SOL
const PRICE_INCREMENT = 0.0000001; // Price increase per token
const MAX_SUPPLY = new BN(1_000_000_000); // 1 billion tokens max supply

// Default fee configuration
const DEFAULT_FEE_BASIS_POINTS = new BN(500); // 5%
const DEFAULT_CREATOR_FEE_BASIS_POINTS = new BN(100); // 1%
const DEFAULT_POOL_MIGRATION_FEE = new BN(1000000); // 0.001 SOL
const DEFAULT_FEE_RECIPIENT = new web3.PublicKey("8hXGeqAkS2GezfSiCVjfNzqjobLmognqJsqyA75ZL79R");

// Fournit le provider
export function getProvider(wallet, connection) {
  return new AnchorProvider(connection, wallet, { commitment: COMMITMENT });
}

// Fournit le programme
export function getProgram(wallet, connection) {
  const provider = getProvider(wallet, connection);
  return new Program(idl, PROGRAM_ID, provider);
}

// Get bonding curve PDA
export async function getBondingCurvePDA(mintPubkey) {
  const [bondingCurvePda] = await web3.PublicKey.findProgramAddress(
    [Buffer.from("bonding_curve"), mintPubkey.toBuffer()],
    PROGRAM_ID
  );
  return bondingCurvePda;
}

// Get global PDA
export async function getGlobalPDA() {
  const [globalPda] = await web3.PublicKey.findProgramAddress(
    [Buffer.from("global")],
    PROGRAM_ID
  );
  return globalPda;
}

// Get curve authority PDA
export async function getCurveAuthorityPDA(bondingCurvePda) {
  const [curveAuthority] = await web3.PublicKey.findProgramAddress(
    [Buffer.from("curve_authority"), bondingCurvePda.toBuffer()],
    PROGRAM_ID
  );
  return curveAuthority;
}

// Get curve vault PDA
export async function getCurveVaultPDA(bondingCurvePda, mintPubkey) {
  const [curveVault] = await web3.PublicKey.findProgramAddress(
    [Buffer.from("curve_vault"), bondingCurvePda.toBuffer(), mintPubkey.toBuffer()],
    PROGRAM_ID
  );
  return curveVault;
}

// Get creator vault PDA  
export async function getCreatorVaultPDA(creator) {
  const [creatorVault] = await web3.PublicKey.findProgramAddress(
    [Buffer.from("creator_vault"), creator.toBuffer()],
    PROGRAM_ID
  );
  return creatorVault;
}

// Get fee vault PDA
export async function getFeeVaultPDA() {
  const [feeVault] = await web3.PublicKey.findProgramAddress(
    [Buffer.from("fee_vault")],
    PROGRAM_ID
  );
  return feeVault;
}

// Initialize global state (run once)
export async function initializeGlobal(wallet, connection) {
  try {
    const program = getProgram(wallet, connection);
    const globalPda = await getGlobalPDA();

    const tx = await program.methods
      .initializeGlobal(
        DEFAULT_FEE_BASIS_POINTS,
        DEFAULT_CREATOR_FEE_BASIS_POINTS,
        DEFAULT_POOL_MIGRATION_FEE,
        DEFAULT_FEE_RECIPIENT,
        true // enable migrate
      )
      .accounts({
        global: globalPda,
        payer: wallet.publicKey,
        systemProgram: web3.SystemProgram.programId,
      })
      .rpc();

    console.log("Global state initialized:", tx);
    return globalPda.toBase58();
  } catch (error) {
    console.error("Error initializing global state:", error);
    throw error;
  }
}


// Calculate price based on bonding curve formula
export function calculatePrice(currentSupply, amount) {
  const supply = typeof currentSupply === 'number' ? currentSupply : currentSupply.toNumber();
  const qty = typeof amount === 'number' ? amount : amount.toNumber();
  
  // Linear bonding curve: price = base + (supply * increment)
  const currentPrice = INITIAL_PRICE + (supply * PRICE_INCREMENT);
  const endPrice = INITIAL_PRICE + ((supply + qty) * PRICE_INCREMENT);
  
  // Average price for the purchase
  const avgPrice = (currentPrice + endPrice) / 2;
  const totalCost = avgPrice * qty;
  
  return {
    pricePerToken: avgPrice,
    totalCost: totalCost,
    priceImpact: ((endPrice - currentPrice) / currentPrice) * 100
  };
}

// Get bonding curve data
export async function getBondingCurveData(connection, mintPubkey) {
  try {
    const program = getProgram({ publicKey: null }, connection);
    const bondingCurvePda = await getBondingCurvePDA(mintPubkey);
    
    const bondingCurve = await program.account.bondingCurve.fetch(bondingCurvePda);
    
    return {
      curveVault: bondingCurve.curveVault.toBase58(),
      currentSupply: bondingCurve.currentSupply.toNumber(),
      maxSupply: bondingCurve.maxSupply.toNumber(),
      totalRaised: bondingCurve.totalRaised.toNumber(),
      realSolReserves: bondingCurve.realSolReserves.toNumber(),
      a: bondingCurve.a.toNumber(),
      b: bondingCurve.b.toNumber(),
      c: bondingCurve.c.toNumber(),
      complete: bondingCurve.complete,
      creator: bondingCurve.creator.toBase58()
    };
  } catch (error) {
    console.error("Error fetching bonding curve data:", error);
    return null;
  }
}

// Fonction pour initialiser la bonding_curve (launch curve)
export async function initializeBondingCurve(wallet, connection, mintPubkey) {
  try {
    const program = getProgram(wallet, connection);
    const bondingCurvePda = await getBondingCurvePDA(mintPubkey);
    const curveVault = await getCurveVaultPDA(bondingCurvePda, mintPubkey);
    const curveAuthority = await getCurveAuthorityPDA(bondingCurvePda);

    // Parameters for linear bonding curve
    const a = new BN(1000000); // Scale factor
    const b = new BN(1); // Linear coefficient  
    const c = new BN(0); // Constant term

    const tx = await program.methods
      .launchCurve(a, b, c, MAX_SUPPLY, wallet.publicKey)
      .accounts({
        payer: wallet.publicKey,
        mint: mintPubkey,
        curveVault: curveVault,
        bondingCurve: bondingCurvePda,
        curveAuthority: curveAuthority,
        tokenProgram: splToken.TOKEN_PROGRAM_ID,
        systemProgram: web3.SystemProgram.programId,
        associatedTokenProgram: splToken.ASSOCIATED_TOKEN_PROGRAM_ID,
        rent: web3.SYSVAR_RENT_PUBKEY,
      })
      .rpc();

    console.log("Bonding curve initialized:", tx);
    return bondingCurvePda.toBase58();
  } catch (error) {
    console.error("Error initializing bonding curve:", error);
    throw error;
  }
}

// Buy tokens from bonding curve
export async function buyToken(wallet, connection, mintPubkey, deltaQ) {
  try {
    const program = getProgram(wallet, connection);
    const mintPubkeyObj = new web3.PublicKey(mintPubkey);
    
    const bondingCurvePda = await getBondingCurvePDA(mintPubkeyObj);
    const globalPda = await getGlobalPDA();
    const curveVault = await getCurveVaultPDA(bondingCurvePda, mintPubkeyObj);
    const curveAuthority = await getCurveAuthorityPDA(bondingCurvePda);
    
    // Get bonding curve data to get creator
    const bondingCurveData = await program.account.bondingCurve.fetch(bondingCurvePda);
    const creatorVault = await getCreatorVaultPDA(bondingCurveData.creator);
    const feeVault = await getFeeVaultPDA();
    
    // Get or create buyer's token account
    const userTokenAccount = await splToken.getOrCreateAssociatedTokenAccount(
      connection,
      wallet,
      mintPubkeyObj,
      wallet.publicKey
    );

    // deltaQ should be in token units (with decimals)
    const deltaQBN = new BN(deltaQ);

    const tx = await program.methods
      .buy(deltaQBN)
      .accounts({
        bondingCurve: bondingCurvePda,
        global: globalPda,
        payer: wallet.publicKey,
        creatorVault: creatorVault,
        feeVault: feeVault,
        mint: mintPubkeyObj,
        userTokenAccount: userTokenAccount.address,
        curveVault: curveVault,
        curveAuthority: curveAuthority,
        tokenProgram: splToken.TOKEN_PROGRAM_ID,
        systemProgram: web3.SystemProgram.programId,
      })
      .rpc();

    console.log("Buy transaction:", tx);
    return tx;
  } catch (error) {
    console.error("Error buying token:", error);
    throw error;
  }
}

// Sell tokens to bonding curve
export async function sellToken(wallet, connection, mintPubkey, deltaQ) {
  try {
    const program = getProgram(wallet, connection);
    const mintPubkeyObj = new web3.PublicKey(mintPubkey);
    
    const bondingCurvePda = await getBondingCurvePDA(mintPubkeyObj);
    
    // Get seller's token account
    const userTokenAccount = await splToken.getAssociatedTokenAddress(
      mintPubkeyObj,
      wallet.publicKey
    );

    const deltaQBN = new BN(deltaQ);

    const tx = await program.methods
      .sell(deltaQBN)
      .accounts({
        bondingCurve: bondingCurvePda,
        mint: mintPubkeyObj,
        userTokenAccount: userTokenAccount,
        user: wallet.publicKey,
        tokenProgram: splToken.TOKEN_PROGRAM_ID,
      })
      .rpc();

    console.log("Sell transaction:", tx);
    return tx;
  } catch (error) {
    console.error("Error selling token:", error);
    throw error;
  }
}

// Get current token price
export async function getCurrentPrice(connection, mintPubkey) {
  try {
    const bondingCurveData = await getBondingCurveData(connection, mintPubkey);
    if (!bondingCurveData) return null;
    
    const { currentSupply } = bondingCurveData;
    const price = INITIAL_PRICE + (currentSupply * PRICE_INCREMENT);
    
    return price;
  } catch (error) {
    console.error("Error getting current price:", error);
    return null;
  }
}

// Get market stats for a token
export async function getMarketStats(connection, mintPubkey) {
  try {
    const bondingCurveData = await getBondingCurveData(connection, mintPubkey);
    if (!bondingCurveData) {
      return {
        marketcap: "N/A",
        liquidity: "N/A",
        holders: "N/A",
        price: "N/A",
        volume24h: "N/A"
      };
    }
    
    const currentPrice = await getCurrentPrice(connection, mintPubkey);
    const marketcap = currentPrice * bondingCurveData.currentSupply;
    const liquidity = bondingCurveData.realSolReserves / web3.LAMPORTS_PER_SOL;
    
    return {
      marketcap: `$${marketcap.toFixed(2)}`,
      liquidity: `${liquidity.toFixed(4)} SOL`,
      holders: "0", // Would need to query token accounts
      price: `$${currentPrice.toFixed(8)}`,
      volume24h: "$0", // Would need transaction history
      currentSupply: bondingCurveData.currentSupply,
      maxSupply: bondingCurveData.maxSupply
    };
  } catch (error) {
    console.error("Error getting market stats:", error);
    return {
      marketcap: "N/A",
      liquidity: "N/A",
      holders: "N/A",
      price: "N/A",
      volume24h: "N/A"
    };
  }
}
