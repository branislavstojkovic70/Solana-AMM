use anchor_lang::prelude::*;
use anchor_spl::{
    token_interface::{Mint, TokenAccount, TokenInterface},
};

use crate::state::PoolState;
use crate::error::ErrorCode;
use crate::instructions::shared::{transfer_tokens, transfer_tokens_signed, calculate_swap_output};

const MINIMUM_OUTPUT: u64 = 1;
const MAX_PRICE_IMPACT_BPS: u64 = 1000; // 10%

pub fn swap_handler(
    ctx: Context<Swap>,
    amount_in: u64,
    min_amount_out: u64,
    is_a_to_b: bool, 
) -> Result<()> {
    require!(amount_in > 0, ErrorCode::InvalidAmount);
    require!(min_amount_out > 0, ErrorCode::InvalidAmount);
    
    let pool_state = &mut ctx.accounts.pool_state;
    
    let (user_in, user_out, vault_in, vault_out, mint_in, mint_out, reserve_in, reserve_out) = 
        if is_a_to_b {
            (
                &ctx.accounts.user_token_a,
                &ctx.accounts.user_token_b,
                &ctx.accounts.vault_a,
                &ctx.accounts.vault_b,
                &ctx.accounts.token_mint_a,
                &ctx.accounts.token_mint_b,
                pool_state.reserve_a,
                pool_state.reserve_b,
            )
        } else {
            (
                &ctx.accounts.user_token_b,
                &ctx.accounts.user_token_a,
                &ctx.accounts.vault_b,
                &ctx.accounts.vault_a,
                &ctx.accounts.token_mint_b,
                &ctx.accounts.token_mint_a,
                pool_state.reserve_b,
                pool_state.reserve_a,
            )
        };
    
    require!(
        user_in.amount >= amount_in,
        ErrorCode::InsufficientBalance
    );
    
    require!(
        reserve_in > 0 && reserve_out > 0, 
        ErrorCode::EmptyReserves
    );
    
    let k_before = (reserve_in as u128)
        .checked_mul(reserve_out as u128)
        .ok_or(ErrorCode::MathOverflow)?;
    
    let price_before = (reserve_out as u128)
        .checked_mul(1_000_000)
        .ok_or(ErrorCode::MathOverflow)?
        .checked_div(reserve_in as u128)
        .ok_or(ErrorCode::DivisionByZero)? as u64;
    
    let fee_amount = (amount_in as u128)
        .checked_mul(pool_state.fee_numerator as u128)
        .ok_or(ErrorCode::MathOverflow)?
        .checked_div(pool_state.fee_denominator as u128)
        .ok_or(ErrorCode::DivisionByZero)? as u64;
    
    let amount_in_after_fee = amount_in
        .checked_sub(fee_amount)
        .ok_or(ErrorCode::MathOverflow)?;
    
    let amount_out = calculate_swap_output(
        amount_in_after_fee,
        reserve_in,
        reserve_out,
    )?;
    
    require!(
        amount_out >= min_amount_out,
        ErrorCode::SlippageExceeded
    );
    
    require!(
        amount_out >= MINIMUM_OUTPUT,
        ErrorCode::OutputTooSmall
    );
    
    let price_impact_bps = (amount_out as u128)
        .checked_mul(10000)
        .ok_or(ErrorCode::MathOverflow)?
        .checked_div(reserve_out as u128)
        .ok_or(ErrorCode::DivisionByZero)? as u64;
    
    require!(
        price_impact_bps <= MAX_PRICE_IMPACT_BPS,
        ErrorCode::PriceImpactTooHigh
    );
    
    require!(
        vault_out.amount >= amount_out,
        ErrorCode::InsufficientPoolLiquidity
    );
    
    transfer_tokens(
        user_in,
        vault_in,
        mint_in,
        &ctx.accounts.user,
        &ctx.accounts.token_program,
        amount_in,
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
        vault_out,
        user_out,
        mint_out,
        &ctx.accounts.pool_authority,
        &ctx.accounts.token_program,
        amount_out,
        signer_seeds,
    )?;
    
    if is_a_to_b {
        pool_state.reserve_a = pool_state.reserve_a
            .checked_add(amount_in)
            .ok_or(ErrorCode::MathOverflow)?;
        
        pool_state.reserve_b = pool_state.reserve_b
            .checked_sub(amount_out)
            .ok_or(ErrorCode::MathOverflow)?;
    } else {
        pool_state.reserve_b = pool_state.reserve_b
            .checked_add(amount_in)
            .ok_or(ErrorCode::MathOverflow)?;
        
        pool_state.reserve_a = pool_state.reserve_a
            .checked_sub(amount_out)
            .ok_or(ErrorCode::MathOverflow)?;
    }
    
    let k_after = (pool_state.reserve_a as u128)
        .checked_mul(pool_state.reserve_b as u128)
        .ok_or(ErrorCode::MathOverflow)?;
    
    require!(
        k_after >= k_before,
        ErrorCode::InvalidConstantProduct
    );
    
    let (reserve_in_after, reserve_out_after) = if is_a_to_b {
        (pool_state.reserve_a, pool_state.reserve_b)
    } else {
        (pool_state.reserve_b, pool_state.reserve_a)
    };
    
    let price_after = (reserve_out_after as u128)
        .checked_mul(1_000_000)
        .ok_or(ErrorCode::MathOverflow)?
        .checked_div(reserve_in_after as u128)
        .ok_or(ErrorCode::DivisionByZero)? as u64;
    
    let clock = Clock::get()?;
    emit!(SwapExecuted {
        pool: pool_state.key(),
        user: ctx.accounts.user.key(),
        token_in: if is_a_to_b { pool_state.token_mint_a } else { pool_state.token_mint_b },
        token_out: if is_a_to_b { pool_state.token_mint_b } else { pool_state.token_mint_a },
        amount_in,
        amount_out,
        fee_amount,
        reserve_a: pool_state.reserve_a,
        reserve_b: pool_state.reserve_b,
        price_before,
        price_after,
        price_impact: price_impact_bps,
        timestamp: clock.unix_timestamp,
    });
    
    msg!(
        "Swap: {}→{} (fee: {}, impact: {}bps)",
        amount_in, amount_out, fee_amount, price_impact_bps
    );
    
    Ok(())
}

#[derive(Accounts)]
pub struct Swap<'info> {
    #[account(mut)]
    pub user: Signer<'info>,
    
    #[account(
        mut,
        seeds = [b"pool_state", pool_state.token_mint_a.as_ref(), pool_state.token_mint_b.as_ref()],
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
        token::mint = token_mint_a,
        token::authority = user,
    )]
    pub user_token_a: Box<InterfaceAccount<'info, TokenAccount>>,  // ✅ BOX
    
    #[account(
        mut,
        token::mint = token_mint_b,
        token::authority = user,
    )]
    pub user_token_b: Box<InterfaceAccount<'info, TokenAccount>>,  // ✅ BOX
    
    pub token_program: Interface<'info, TokenInterface>,
}

#[event]
pub struct SwapExecuted {
    pub pool: Pubkey,
    pub user: Pubkey,
    pub token_in: Pubkey,
    pub token_out: Pubkey,
    pub amount_in: u64,
    pub amount_out: u64,
    pub fee_amount: u64,
    pub reserve_a: u64,
    pub reserve_b: u64,
    pub price_before: u64,
    pub price_after: u64,
    pub price_impact: u64,
    pub timestamp: i64,
}