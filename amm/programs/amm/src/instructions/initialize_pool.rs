use crate::error::ErrorCode;
use crate::state::PoolState;
use anchor_lang::prelude::*;
use anchor_spl::{
    associated_token::AssociatedToken,
    token_interface::{Mint, TokenAccount, TokenInterface},
};

pub fn initialize_pool_handler(
    ctx: Context<InitializePool>,
    fee_numerator: u64,
    fee_denominator: u64,
) -> Result<()> {
    require!(fee_denominator > 0, ErrorCode::InvalidFeeParameters);
    require!(
        fee_numerator <= fee_denominator / 100,
        ErrorCode::FeeTooHigh
    );
    require_keys_neq!(
        ctx.accounts.token_mint_a.key(),
        ctx.accounts.token_mint_b.key()
    );
    require!(
        ctx.accounts.token_mint_a.key() < ctx.accounts.token_mint_b.key(),
        ErrorCode::MintsNotOrdered
    );

    let pool_state = &mut ctx.accounts.pool_state;
    pool_state.token_mint_a = ctx.accounts.token_mint_a.key();
    pool_state.token_mint_b = ctx.accounts.token_mint_b.key();
    pool_state.vault_a = ctx.accounts.vault_a.key();
    pool_state.vault_b = ctx.accounts.vault_b.key();
    pool_state.pool_mint = ctx.accounts.pool_mint.key();

    pool_state.fee_numerator = fee_numerator;
    pool_state.fee_denominator = fee_denominator;
    pool_state.reserve_a = 0;
    pool_state.reserve_b = 0;
    pool_state.total_supply = 0;

    pool_state.bump = ctx.bumps.pool_state;
    pool_state.authority_bump = ctx.bumps.pool_authority;
    pool_state.pool_mint_bump = ctx.bumps.pool_mint;

    let clock = Clock::get()?;

    emit!(PoolCreated {
        pool: pool_state.key(),
        pool_authority: ctx.accounts.pool_authority.key(),
        creator: ctx.accounts.payer.key(),

        token_mint_a: pool_state.token_mint_a,
        token_mint_b: pool_state.token_mint_b,

        vault_a: pool_state.vault_a,
        vault_b: pool_state.vault_b,
        pool_mint: pool_state.pool_mint,

        fee_numerator,
        fee_denominator,

        timestamp: clock.unix_timestamp,

        pool_bump: pool_state.bump,
        authority_bump: pool_state.authority_bump,
        pool_mint_bump: pool_state.pool_mint_bump,
    });

    msg!(
        "Pool initialized: fee={}/{}, creator={}, timestamp={}",
        fee_numerator,
        fee_denominator,
        ctx.accounts.payer.key(),
        clock.unix_timestamp
    );

    Ok(())
}

#[derive(Accounts)]
pub struct InitializePool<'info> {
    #[account(mut)]
    pub payer: Signer<'info>,
    
    #[account(mint::token_program = token_program)]
    pub token_mint_a: Box<InterfaceAccount<'info, Mint>>,  // ✅ BOX
    
    #[account(mint::token_program = token_program)]
    pub token_mint_b: Box<InterfaceAccount<'info, Mint>>,  // ✅ BOX

    #[account(
        init,
        payer = payer,
        space = 8 + PoolState::INIT_SPACE,
        seeds = [b"pool_state", token_mint_a.key().as_ref(), token_mint_b.key().as_ref()],
        bump,
    )]
    pub pool_state: Box<Account<'info, PoolState>>,  // ✅ BOX

    /// CHECK: PDA authority derived from pool_state, used as signer for vault operations
    #[account(
        seeds = [b"authority", pool_state.key().as_ref()],
        bump
    )]
    pub pool_authority: AccountInfo<'info>,

    #[account(
        init,
        payer = payer,
        seeds = [b"pool_mint", pool_state.key().as_ref()],
        bump,
        mint::decimals = 9,
        mint::authority = pool_authority,
        mint::token_program = token_program,
    )]
    pub pool_mint: Box<InterfaceAccount<'info, Mint>>,  // ✅ BOX

    #[account(
        init,
        payer = payer,
        associated_token::mint = token_mint_a,
        associated_token::authority = pool_authority,
        associated_token::token_program = token_program,
    )]
    pub vault_a: Box<InterfaceAccount<'info, TokenAccount>>,  // ✅ BOX

    #[account(
        init,
        payer = payer,
        associated_token::mint = token_mint_b,
        associated_token::authority = pool_authority,
        associated_token::token_program = token_program,
    )]
    pub vault_b: Box<InterfaceAccount<'info, TokenAccount>>,  // ✅ BOX

    pub system_program: Program<'info, System>,
    pub token_program: Interface<'info, TokenInterface>,
    pub associated_token_program: Program<'info, AssociatedToken>,
}

#[event]
pub struct PoolCreated {
    pub pool: Pubkey,
    pub pool_authority: Pubkey,
    pub creator: Pubkey,

    pub token_mint_a: Pubkey,
    pub token_mint_b: Pubkey,

    pub vault_a: Pubkey,
    pub vault_b: Pubkey,
    pub pool_mint: Pubkey,

    pub fee_numerator: u64,
    pub fee_denominator: u64,

    pub timestamp: i64,

    pub pool_bump: u8,
    pub authority_bump: u8,
    pub pool_mint_bump: u8,
}