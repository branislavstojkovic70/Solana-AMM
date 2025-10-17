use anchor_lang::prelude::*;
use anchor_spl::token::{Mint, Token, TokenAccount};
use crate::state::{PoolState, ErrorCode};

// Konstante za fee validaciju
pub const MIN_FEE_NUMERATOR: u64 = 1;
pub const MAX_FEE_NUMERATOR: u64 = 100;

pub fn handler(
    ctx: Context<InitializePool>,
    fee_numerator: u64,
    fee_denominator: u64,
) -> Result<()> {
    // Validacija fee parametara
    require!(
        fee_denominator > 0,
        ErrorCode::InvalidFeeDenominator
    );
    require!(
        fee_numerator <= fee_denominator,
        ErrorCode::InvalidFeeRatio
    );
    require!(
        fee_numerator >= MIN_FEE_NUMERATOR,
        ErrorCode::FeeTooLow
    );
    require!(
        fee_numerator <= MAX_FEE_NUMERATOR,
        ErrorCode::FeeTooHigh
    );

    // Validacija mint-ova
    require!(
        ctx.accounts.mint0.key() != ctx.accounts.mint1.key(),
        ErrorCode::IdenticalMints
    );
    require!(
        ctx.accounts.mint0.key() < ctx.accounts.mint1.key(),
        ErrorCode::InvalidMintOrder
    );

    // Provera da mint-ovi nisu zamrznuti
    require!(
        ctx.accounts.mint0.freeze_authority.is_none(),
        ErrorCode::MintHasFreezeAuthority
    );
    require!(
        ctx.accounts.mint1.freeze_authority.is_none(),
        ErrorCode::MintHasFreezeAuthority
    );

    // Inicijalizacija pool state
    let pool_state = &mut ctx.accounts.pool_state;
    pool_state.mint0 = ctx.accounts.mint0.key();
    pool_state.mint1 = ctx.accounts.mint1.key();
    pool_state.fee_numerator = fee_numerator;
    pool_state.fee_denominator = fee_denominator;
    pool_state.total_lp_supply = 0;
    pool_state.pool_state_bump = ctx.bumps.pool_state;
    pool_state.pool_authority_bump = ctx.bumps.pool_authority;

    // Emit event
    emit!(PoolCreated {
        pool_state: ctx.accounts.pool_state.key(),
        mint0: ctx.accounts.mint0.key(),
        mint1: ctx.accounts.mint1.key(),
        vault0: ctx.accounts.vault0.key(),
        vault1: ctx.accounts.vault1.key(),
        pool_mint: ctx.accounts.pool_mint.key(),
        fee_numerator,
        fee_denominator,
        timestamp: Clock::get()?.unix_timestamp,
    });

    msg!("Pool initialized successfully!");
    msg!("Mint0: {}", ctx.accounts.mint0.key());
    msg!("Mint1: {}", ctx.accounts.mint1.key());
    msg!("Fee: {}/{} ({:.2}%)", fee_numerator, fee_denominator, 
         (fee_numerator as f64 / fee_denominator as f64) * 100.0);

    Ok(())
}

#[derive(Accounts)]
pub struct InitializePool<'info> {
    pub mint0: Account<'info, Mint>,
    pub mint1: Account<'info, Mint>,

    #[account(
        init,
        payer = payer,
        space = 8 + PoolState::INIT_SPACE,
        seeds = [b"pool_state", mint0.key().as_ref(), mint1.key().as_ref()],
        bump,
    )]
    pub pool_state: Box<Account<'info, PoolState>>,

    /// CHECK: PDA used as signing authority for token vaults and pool mint operations
    #[account(
        seeds = [b"authority", pool_state.key().as_ref()],
        bump
    )]
    pub pool_authority: AccountInfo<'info>,

    #[account(
        init,
        payer = payer,
        seeds = [b"vault0", pool_state.key().as_ref()],
        bump,
        token::mint = mint0,
        token::authority = pool_authority
    )]
    pub vault0: Box<Account<'info, TokenAccount>>,

    #[account(
        init,
        payer = payer,
        seeds = [b"vault1", pool_state.key().as_ref()],
        bump,
        token::mint = mint1,
        token::authority = pool_authority
    )]
    pub vault1: Box<Account<'info, TokenAccount>>,

    #[account(
        init,
        payer = payer,
        seeds = [b"pool_mint", pool_state.key().as_ref()],
        bump,
        mint::decimals = 9,
        mint::authority = pool_authority
    )]
    pub pool_mint: Box<Account<'info, Mint>>,

    #[account(mut)]
    pub payer: Signer<'info>,

    pub system_program: Program<'info, System>,
    pub token_program: Program<'info, Token>,
}

#[event]
pub struct PoolCreated {
    pub pool_state: Pubkey,
    pub mint0: Pubkey,
    pub mint1: Pubkey,
    pub vault0: Pubkey,
    pub vault1: Pubkey,
    pub pool_mint: Pubkey,
    pub fee_numerator: u64,
    pub fee_denominator: u64,
    pub timestamp: i64,
}