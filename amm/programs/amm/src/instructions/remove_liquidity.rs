use anchor_lang::prelude::*;
use anchor_spl::{
    associated_token::AssociatedToken,
    token_interface::{Mint, TokenAccount, TokenInterface},
};

use crate::state::PoolState;
use crate::error::ErrorCode;
use crate::instructions::shared::{transfer_tokens_signed, burn_lp_tokens};

pub fn remove_liquidity_handler(
    ctx: Context<RemoveLiquidity>,
    lp_tokens_to_burn: u64,
    min_amount_a: u64,
    min_amount_b: u64,
) -> Result<()> {
    require!(lp_tokens_to_burn > 0, ErrorCode::InvalidAmount);
    
    let pool_state = &mut ctx.accounts.pool_state;
    
    require!(
        ctx.accounts.user_lp_token.amount >= lp_tokens_to_burn,
        ErrorCode::InsufficientBalance
    );
    
    require!(
        pool_state.total_supply >= lp_tokens_to_burn,
        ErrorCode::InsufficientLPTokens
    );
    
    let amount_a = (lp_tokens_to_burn as u128)
        .checked_mul(pool_state.reserve_a as u128)
        .ok_or(ErrorCode::MathOverflow)?
        .checked_div(pool_state.total_supply as u128)
        .ok_or(ErrorCode::DivisionByZero)? as u64;
    
    let amount_b = (lp_tokens_to_burn as u128)
        .checked_mul(pool_state.reserve_b as u128)
        .ok_or(ErrorCode::MathOverflow)?
        .checked_div(pool_state.total_supply as u128)
        .ok_or(ErrorCode::DivisionByZero)? as u64;
    
    require!(amount_a >= min_amount_a, ErrorCode::InsufficientAmountA);
    require!(amount_b >= min_amount_b, ErrorCode::InsufficientAmountB);
    
    require!(
        ctx.accounts.vault_a.amount >= amount_a,
        ErrorCode::InsufficientPoolLiquidity
    );
    require!(
        ctx.accounts.vault_b.amount >= amount_b,
        ErrorCode::InsufficientPoolLiquidity
    );
    
    burn_lp_tokens(
        &ctx.accounts.pool_mint,
        &ctx.accounts.user_lp_token,
        &ctx.accounts.user,
        &ctx.accounts.token_program,
        lp_tokens_to_burn,
    )?;
    
    let pool_key = pool_state.key();
    let authority_bump = pool_state.authority_bump;
    let authority_seeds = &[
        b"authority",
        pool_key.as_ref(),
        &[authority_bump],
    ];
    let signer_seeds = &[&authority_seeds[..]];
    
    transfer_tokens_signed(
        &ctx.accounts.vault_a,
        &ctx.accounts.user_token_a,
        &ctx.accounts.token_mint_a,
        &ctx.accounts.pool_authority,
        &ctx.accounts.token_program,
        amount_a,
        signer_seeds,
    )?;
    
    transfer_tokens_signed(
        &ctx.accounts.vault_b,
        &ctx.accounts.user_token_b,
        &ctx.accounts.token_mint_b,
        &ctx.accounts.pool_authority,
        &ctx.accounts.token_program,
        amount_b,
        signer_seeds,
    )?;
    
    pool_state.reserve_a = pool_state.reserve_a
        .checked_sub(amount_a)
        .ok_or(ErrorCode::MathOverflow)?;
    
    pool_state.reserve_b = pool_state.reserve_b
        .checked_sub(amount_b)
        .ok_or(ErrorCode::MathOverflow)?;
    
    pool_state.total_supply = pool_state.total_supply
        .checked_sub(lp_tokens_to_burn)
        .ok_or(ErrorCode::MathOverflow)?;
    
    let clock = Clock::get()?;
    emit!(LiquidityRemoved {
        pool: pool_state.key(),
        provider: ctx.accounts.user.key(),
        amount_a,
        amount_b,
        lp_tokens_burned: lp_tokens_to_burn,
        total_supply: pool_state.total_supply,
        timestamp: clock.unix_timestamp,
    });
    
    msg!(
        "Liquidity removed: {} LP tokens -> {}A + {}B",
        lp_tokens_to_burn,
        amount_a,
        amount_b
    );
    
    Ok(())
}

#[derive(Accounts)]
pub struct RemoveLiquidity<'info> {
    #[account(mut)]
    pub user: Signer<'info>,
    
    #[account(
        mut,
        seeds = [
            b"pool_state", 
            pool_state.token_mint_a.as_ref(), 
            pool_state.token_mint_b.as_ref()
        ],
        bump = pool_state.bump,
    )]
    pub pool_state: Box<Account<'info, PoolState>>,  // ✅ BOX
    
    /// CHECK: PDA authority
    #[account(
        seeds = [b"authority", pool_state.key().as_ref()],
        bump = pool_state.authority_bump,
    )]
    pub pool_authority: AccountInfo<'info>,
    
    pub token_mint_a: Box<InterfaceAccount<'info, Mint>>,  // ✅ BOX
    pub token_mint_b: Box<InterfaceAccount<'info, Mint>>,  // ✅ BOX
    
    #[account(
        mut,
        address = pool_state.vault_a,
        token::mint = token_mint_a,
        token::authority = pool_authority,
    )]
    pub vault_a: Box<InterfaceAccount<'info, TokenAccount>>,  // ✅ BOX
    
    #[account(
        mut,
        address = pool_state.vault_b,
        token::mint = token_mint_b,
        token::authority = pool_authority,
    )]
    pub vault_b: Box<InterfaceAccount<'info, TokenAccount>>,  // ✅ BOX
    
    #[account(
        mut,
        address = pool_state.pool_mint,
        mint::authority = pool_authority,
    )]
    pub pool_mint: Box<InterfaceAccount<'info, Mint>>,  // ✅ BOX
    
    #[account(
        mut,
        associated_token::mint = token_mint_a,
        associated_token::authority = user,
    )]
    pub user_token_a: Box<InterfaceAccount<'info, TokenAccount>>,  // ✅ BOX
    
    #[account(
        mut,
        associated_token::mint = token_mint_b,
        associated_token::authority = user,
    )]
    pub user_token_b: Box<InterfaceAccount<'info, TokenAccount>>,  // ✅ BOX
    
    #[account(
        mut,
        associated_token::mint = pool_mint,
        associated_token::authority = user,
    )]
    pub user_lp_token: Box<InterfaceAccount<'info, TokenAccount>>,  // ✅ BOX
    
    pub token_program: Interface<'info, TokenInterface>,
    pub associated_token_program: Program<'info, AssociatedToken>,
    pub system_program: Program<'info, System>,
}

#[event]
pub struct LiquidityRemoved {
    pub pool: Pubkey,
    pub provider: Pubkey,
    pub amount_a: u64,
    pub amount_b: u64,
    pub lp_tokens_burned: u64,
    pub total_supply: u64,
    pub timestamp: i64,
}