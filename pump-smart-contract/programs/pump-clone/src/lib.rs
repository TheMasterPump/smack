use anchor_lang::prelude::*;
use anchor_spl::token::{self, Token, TokenAccount, Mint, MintTo, Transfer};
use anchor_spl::associated_token::AssociatedToken;

declare_id!("6EF8rrecthR5Dkzon8Nwu78hRvfCKubJ14M5uBEwF6P");

// 🔥 PARAMÈTRES EXACTS DE PUMP.FUN
pub const INITIAL_VIRTUAL_TOKEN_RESERVES: u64 = 1_073_000_000_000_000; // 1,073,000 tokens * 1e9
pub const INITIAL_VIRTUAL_SOL_RESERVES: u64 = 30_000_000_000; // 30 SOL * 1e9  
pub const INITIAL_REAL_TOKEN_RESERVES: u64 = 793_100_000_000_000; // 793,100 tokens * 1e9
pub const TOKEN_TOTAL_SUPPLY: u64 = 1_000_000_000_000_000; // 1,000,000 tokens * 1e9
pub const FEE_BASIS_POINTS: u64 = 100; // 1% fee

// Migration threshold - when to move to Raydium (~$69k)
pub const MIGRATION_THRESHOLD_SOL: u64 = 85_000_000_000; // 85 SOL * 1e9

#[program]
pub mod pump_clone {
    use super::*;

    /// Initialize global configuration (admin only)
    pub fn initialize_global(
        ctx: Context<InitializeGlobal>,
        fee_basis_points: u64,
        fee_recipient: Pubkey,
        enable_migrate: bool,
    ) -> Result<()> {
        let global = &mut ctx.accounts.global;
        global.initialized = true;
        global.authority = ctx.accounts.authority.key();
        global.fee_recipient = fee_recipient;
        global.initial_virtual_token_reserves = INITIAL_VIRTUAL_TOKEN_RESERVES;
        global.initial_virtual_sol_reserves = INITIAL_VIRTUAL_SOL_RESERVES;
        global.initial_real_token_reserves = INITIAL_REAL_TOKEN_RESERVES;
        global.token_total_supply = TOKEN_TOTAL_SUPPLY;
        global.fee_basis_points = fee_basis_points;
        global.enable_migrate = enable_migrate;
        
        msg!("🔥 Global initialized with Pump.fun parameters!");
        Ok(())
    }

    /// Create a new token with bonding curve (like Pump.fun)
    pub fn create(
        ctx: Context<Create>,
        name: String,
        symbol: String,
        uri: String,
    ) -> Result<()> {
        let global = &ctx.accounts.global;
        let bonding_curve = &mut ctx.accounts.bonding_curve;
        
        // Initialize bonding curve avec paramètres Pump.fun
        bonding_curve.virtual_token_reserves = global.initial_virtual_token_reserves;
        bonding_curve.virtual_sol_reserves = global.initial_virtual_sol_reserves;
        bonding_curve.real_token_reserves = global.initial_real_token_reserves;
        bonding_curve.real_sol_reserves = 0;
        bonding_curve.token_total_supply = global.token_total_supply;
        bonding_curve.complete = false;
        bonding_curve.creator = ctx.accounts.user.key();

        // Create 1 billion tokens
        let seeds = &[
            b"bonding-curve",
            ctx.accounts.mint.key().as_ref(),
            &[ctx.bumps.bonding_curve],
        ];
        let signer = &[&seeds[..]];

        let cpi_accounts = MintTo {
            mint: ctx.accounts.mint.to_account_info(),
            to: ctx.accounts.associated_bonding_curve.to_account_info(),
            authority: bonding_curve.to_account_info(),
        };
        let cpi_program = ctx.accounts.token_program.to_account_info();
        let cpi_ctx = CpiContext::new_with_signer(cpi_program, cpi_accounts, signer);
        
        token::mint_to(cpi_ctx, global.token_total_supply)?;

        msg!("🚀 Token created: {} ({})", name, symbol);
        Ok(())
    }

    /// Buy tokens using Pump.fun formula (Uniswap V2 with virtual reserves)
    pub fn buy(
        ctx: Context<Buy>,
        amount: u64,      // Amount of tokens to buy
        max_sol_cost: u64, // Max SOL to spend (slippage protection)
    ) -> Result<()> {
        let bonding_curve = &mut ctx.accounts.bonding_curve;
        let global = &ctx.accounts.global;

        require!(!bonding_curve.complete, PumpError::BondingCurveComplete);

        // 💎 FORMULE EXACTE PUMP.FUN (Uniswap V2 avec réserves virtuelles)
        // k = virtual_sol_reserves * virtual_token_reserves (constant product)
        let k = bonding_curve.virtual_sol_reserves
            .checked_mul(bonding_curve.virtual_token_reserves)
            .ok_or(PumpError::Overflow)?;

        // Nouvelle réserve de tokens après achat
        let new_virtual_token_reserves = bonding_curve.virtual_token_reserves
            .checked_sub(amount)
            .ok_or(PumpError::InsufficientTokens)?;

        // Calculer SOL requis avec formule k constant
        let new_virtual_sol_reserves = k
            .checked_div(new_virtual_token_reserves)
            .ok_or(PumpError::InvalidCalculation)?;

        let sol_required = new_virtual_sol_reserves
            .checked_sub(bonding_curve.virtual_sol_reserves)
            .ok_or(PumpError::InvalidCalculation)?;

        // Ajouter les frais (1% comme Pump.fun)
        let fee = sol_required
            .checked_mul(global.fee_basis_points)
            .ok_or(PumpError::Overflow)?
            .checked_div(10000)
            .ok_or(PumpError::InvalidCalculation)?;

        let total_sol_cost = sol_required.checked_add(fee).ok_or(PumpError::Overflow)?;

        // Vérifier slippage
        require!(total_sol_cost <= max_sol_cost, PumpError::SlippageExceeded);

        // Transférer SOL de l'utilisateur
        let ix = anchor_lang::system_program::transfer(
            &ctx.accounts.user.to_account_info(),
            &bonding_curve.to_account_info(),
            total_sol_cost,
        );
        anchor_lang::system_program::invoke(
            &ix,
            &[
                ctx.accounts.user.to_account_info(),
                bonding_curve.to_account_info(),
                ctx.accounts.system_program.to_account_info(),
            ],
        )?;

        // Transférer tokens à l'utilisateur
        let seeds = &[
            b"bonding-curve",
            ctx.accounts.mint.key().as_ref(),
            &[ctx.bumps.bonding_curve],
        ];
        let signer = &[&seeds[..]];

        let cpi_accounts = Transfer {
            from: ctx.accounts.associated_bonding_curve.to_account_info(),
            to: ctx.accounts.associated_user.to_account_info(),
            authority: bonding_curve.to_account_info(),
        };
        let cpi_program = ctx.accounts.token_program.to_account_info();
        let cpi_ctx = CpiContext::new_with_signer(cpi_program, cpi_accounts, signer);
        
        token::transfer(cpi_ctx, amount)?;

        // Mettre à jour les réserves
        bonding_curve.virtual_token_reserves = new_virtual_token_reserves;
        bonding_curve.virtual_sol_reserves = new_virtual_sol_reserves;
        bonding_curve.real_token_reserves = bonding_curve.real_token_reserves
            .checked_sub(amount)
            .ok_or(PumpError::Overflow)?;
        bonding_curve.real_sol_reserves = bonding_curve.real_sol_reserves
            .checked_add(sol_required)
            .ok_or(PumpError::Overflow)?;

        // Vérifier si migration nécessaire
        if bonding_curve.real_sol_reserves >= MIGRATION_THRESHOLD_SOL {
            bonding_curve.complete = true;
            msg!("🎉 Bonding curve complete! Ready for Raydium migration.");
        }

        msg!("💰 Buy successful: {} tokens for {} SOL (+ {} fee)", amount, sol_required, fee);
        Ok(())
    }

    /// Sell tokens using Pump.fun formula
    pub fn sell(
        ctx: Context<Sell>,
        amount: u64,          // Amount of tokens to sell
        min_sol_output: u64,  // Min SOL to receive (slippage protection)
    ) -> Result<()> {
        let bonding_curve = &mut ctx.accounts.bonding_curve;
        let global = &ctx.accounts.global;

        require!(!bonding_curve.complete, PumpError::BondingCurveComplete);

        // 💎 FORMULE EXACTE PUMP.FUN (Uniswap V2 avec réserves virtuelles)
        let k = bonding_curve.virtual_sol_reserves
            .checked_mul(bonding_curve.virtual_token_reserves)
            .ok_or(PumpError::Overflow)?;

        // Nouvelle réserve de tokens après vente
        let new_virtual_token_reserves = bonding_curve.virtual_token_reserves
            .checked_add(amount)
            .ok_or(PumpError::Overflow)?;

        // Calculer SOL reçu avec formule k constant
        let new_virtual_sol_reserves = k
            .checked_div(new_virtual_token_reserves)
            .ok_or(PumpError::InvalidCalculation)?;

        let sol_output = bonding_curve.virtual_sol_reserves
            .checked_sub(new_virtual_sol_reserves)
            .ok_or(PumpError::InvalidCalculation)?;

        // Soustraire les frais (1% comme Pump.fun)
        let fee = sol_output
            .checked_mul(global.fee_basis_points)
            .ok_or(PumpError::Overflow)?
            .checked_div(10000)
            .ok_or(PumpError::InvalidCalculation)?;

        let net_sol_output = sol_output.checked_sub(fee).ok_or(PumpError::Overflow)?;

        // Vérifier slippage
        require!(net_sol_output >= min_sol_output, PumpError::SlippageExceeded);

        // Transférer tokens de l'utilisateur
        let cpi_accounts = Transfer {
            from: ctx.accounts.associated_user.to_account_info(),
            to: ctx.accounts.associated_bonding_curve.to_account_info(),
            authority: ctx.accounts.user.to_account_info(),
        };
        let cpi_program = ctx.accounts.token_program.to_account_info();
        let cpi_ctx = CpiContext::new(cpi_program, cpi_accounts);
        
        token::transfer(cpi_ctx, amount)?;

        // Transférer SOL à l'utilisateur
        **bonding_curve.to_account_info().try_borrow_mut_lamports()? -= net_sol_output;
        **ctx.accounts.user.to_account_info().try_borrow_mut_lamports()? += net_sol_output;

        // Mettre à jour les réserves
        bonding_curve.virtual_token_reserves = new_virtual_token_reserves;
        bonding_curve.virtual_sol_reserves = new_virtual_sol_reserves;
        bonding_curve.real_token_reserves = bonding_curve.real_token_reserves
            .checked_add(amount)
            .ok_or(PumpError::Overflow)?;
        bonding_curve.real_sol_reserves = bonding_curve.real_sol_reserves
            .checked_sub(sol_output)
            .ok_or(PumpError::Overflow)?;

        msg!("💸 Sell successful: {} tokens for {} SOL (- {} fee)", amount, net_sol_output, fee);
        Ok(())
    }
}

// ============ ACCOUNTS STRUCTURES ============

#[derive(Accounts)]
pub struct InitializeGlobal<'info> {
    #[account(
        init,
        pda = [b"global"],
        bump,
        payer = authority,
        space = 8 + 32 + 32 + 8 * 6 + 1 + 1
    )]
    pub global: Account<'info, Global>,
    #[account(mut)]
    pub authority: Signer<'info>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct Create<'info> {
    pub global: Account<'info, Global>,
    #[account(
        init,
        pda = [b"bonding-curve", mint.key().as_ref()],
        bump,
        payer = user,
        space = 8 + 32 + 8 * 6 + 1 + 1
    )]
    pub bonding_curve: Account<'info, BondingCurve>,
    #[account(mut)]
    pub user: Signer<'info>,
    #[account(
        init,
        payer = user,
        mint::decimals = 6,
        mint::authority = bonding_curve,
    )]
    pub mint: Account<'info, Mint>,
    #[account(
        init,
        payer = user,
        associated_token::mint = mint,
        associated_token::authority = bonding_curve,
    )]
    pub associated_bonding_curve: Account<'info, TokenAccount>,
    pub token_program: Program<'info, Token>,
    pub associated_token_program: Program<'info, AssociatedToken>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct Buy<'info> {
    pub global: Account<'info, Global>,
    #[account(mut)]
    pub bonding_curve: Account<'info, BondingCurve>,
    #[account(mut)]
    pub user: Signer<'info>,
    pub mint: Account<'info, Mint>,
    #[account(mut)]
    pub associated_bonding_curve: Account<'info, TokenAccount>,
    #[account(
        init_if_needed,
        payer = user,
        associated_token::mint = mint,
        associated_token::authority = user,
    )]
    pub associated_user: Account<'info, TokenAccount>,
    pub token_program: Program<'info, Token>,
    pub associated_token_program: Program<'info, AssociatedToken>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct Sell<'info> {
    pub global: Account<'info, Global>,
    #[account(mut)]
    pub bonding_curve: Account<'info, BondingCurve>,
    #[account(mut)]
    pub user: Signer<'info>,
    pub mint: Account<'info, Mint>,
    #[account(mut)]
    pub associated_bonding_curve: Account<'info, TokenAccount>,
    #[account(mut)]
    pub associated_user: Account<'info, TokenAccount>,
    pub token_program: Program<'info, Token>,
    pub system_program: Program<'info, System>,
}

// ============ STATE ACCOUNTS ============

#[account]
pub struct Global {
    pub initialized: bool,
    pub authority: Pubkey,
    pub fee_recipient: Pubkey,
    pub initial_virtual_token_reserves: u64,
    pub initial_virtual_sol_reserves: u64,
    pub initial_real_token_reserves: u64,
    pub token_total_supply: u64,
    pub fee_basis_points: u64,
    pub enable_migrate: bool,
}

#[account]
pub struct BondingCurve {
    pub virtual_token_reserves: u64,
    pub virtual_sol_reserves: u64,
    pub real_token_reserves: u64,
    pub real_sol_reserves: u64,
    pub token_total_supply: u64,
    pub complete: bool,
    pub creator: Pubkey,
}

// ============ ERRORS ============

#[error_code]
pub enum PumpError {
    #[msg("Bonding curve is complete")]
    BondingCurveComplete,
    #[msg("Insufficient tokens")]
    InsufficientTokens,
    #[msg("Invalid calculation")]
    InvalidCalculation,
    #[msg("Overflow")]
    Overflow,
    #[msg("Slippage exceeded")]
    SlippageExceeded,
}