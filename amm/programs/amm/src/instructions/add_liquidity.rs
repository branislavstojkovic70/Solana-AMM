use anchor_lang::prelude::*;
use anchor_spl::{
    associated_token::AssociatedToken,
    token_interface::{Mint, TokenAccount, TokenInterface},
};

use crate::state::PoolState;
use crate::error::ErrorCode;
use crate::instructions::shared::{
    transfer_tokens, mint_lp_tokens, integer_sqrt, calculate_optimal_amounts
};

pub fn add_liquidity_handler(
    ctx: Context<AddLiquidity>,
    amount_a_desired: u64,
    amount_b_desired: u64,
    amount_a_min: u64,
    amount_b_min: u64,
    min_lp_tokens: u64,
) -> Result<()> {
    require!(amount_a_desired > 0, ErrorCode::InvalidAmount);
    require!(amount_b_desired > 0, ErrorCode::InvalidAmount);
    
    let pool_state = &mut ctx.accounts.pool_state;
    
    let (amount_a, amount_b) = calculate_optimal_amounts(
        amount_a_desired,
        amount_b_desired,
        pool_state.reserve_a,
        pool_state.reserve_b,
    )?;
    
    require!(amount_a >= amount_a_min, ErrorCode::InsufficientAmountA);
    require!(amount_b >= amount_b_min, ErrorCode::InsufficientAmountB);
    
    require!(
        ctx.accounts.user_token_a.amount >= amount_a,
        ErrorCode::InsufficientBalance
    );
    require!(
        ctx.accounts.user_token_b.amount >= amount_b,
        ErrorCode::InsufficientBalance
    );
    
    let lp_tokens = if pool_state.total_supply == 0 {
        let product = (amount_a as u128)
            .checked_mul(amount_b as u128)
            .ok_or(ErrorCode::MathOverflow)?;
        
        let sqrt = integer_sqrt(product);
        
        require!(sqrt > 1000, ErrorCode::InsufficientLiquidity);
        
        sqrt - 1000
    } else {
        let lp_from_a = (amount_a as u128)
            .checked_mul(pool_state.total_supply as u128)
            .ok_or(ErrorCode::MathOverflow)?
            .checked_div(pool_state.reserve_a as u128)
            .ok_or(ErrorCode::DivisionByZero)? as u64;
        
        let lp_from_b = (amount_b as u128)
            .checked_mul(pool_state.total_supply as u128)
            .ok_or(ErrorCode::MathOverflow)?
            .checked_div(pool_state.reserve_b as u128)
            .ok_or(ErrorCode::DivisionByZero)? as u64;
        
        lp_from_a.min(lp_from_b)
    };
    
    require!(lp_tokens >= min_lp_tokens, ErrorCode::InsufficientLPTokens);
    require!(lp_tokens > 0, ErrorCode::InsufficientLPTokens);
    
    // Transfer tokens from user to vaults
    transfer_tokens(
        &ctx.accounts.user_token_a,
        &ctx.accounts.vault_a,
        &ctx.accounts.token_mint_a,
        &ctx.accounts.user,
        &ctx.accounts.token_program,
        amount_a,
    )?;
    
    transfer_tokens(
        &ctx.accounts.user_token_b,
        &ctx.accounts.vault_b,
        &ctx.accounts.token_mint_b,
        &ctx.accounts.user,
        &ctx.accounts.token_program,
        amount_b,
    )?;
    
    let pool_key = pool_state.key();
    let authority_bump = pool_state.authority_bump;
    let authority_seeds = &[
        b"authority",
        pool_key.as_ref(),
        &[authority_bump],
    ];
    let signer_seeds = &[&authority_seeds[..]];
    
    mint_lp_tokens(
        &ctx.accounts.pool_mint,
        &ctx.accounts.user_lp_token,
        &ctx.accounts.pool_authority,
        &ctx.accounts.token_program,
        lp_tokens,
        signer_seeds,
    )?;
    
    pool_state.reserve_a = pool_state.reserve_a
        .checked_add(amount_a)
        .ok_or(ErrorCode::MathOverflow)?;
    
    pool_state.reserve_b = pool_state.reserve_b
        .checked_add(amount_b)
        .ok_or(ErrorCode::MathOverflow)?;
    
    pool_state.total_supply = pool_state.total_supply
        .checked_add(lp_tokens)
        .ok_or(ErrorCode::MathOverflow)?;
    
    let clock = Clock::get()?;
    emit!(LiquidityAdded {
        pool: pool_state.key(),
        provider: ctx.accounts.user.key(),
        amount_a,
        amount_b,
        lp_tokens_minted: lp_tokens,
        total_supply: pool_state.total_supply,
        timestamp: clock.unix_timestamp,
    });
    
    msg!(
        "Liquidity added: {}A + {}B = {} LP tokens",
        amount_a,
        amount_b,
        lp_tokens
    );
    
    Ok(())
}

#[derive(Accounts)]
pub struct AddLiquidity<'info> {
    #[account(mut)]
    pub user: Signer<'info>,
    
    #[account(
        mut,
        seeds = [b"pool_state", pool_state.token_mint_a.as_ref(), pool_state.token_mint_b.as_ref()],
        bump = pool_state.bump,
    )]
    pub pool_state: Box<Account<'info, PoolState>>,  // ✅ BOX
    
    /// CHECK: PDA authority derived from pool_state, used as signer for vault operations
    #[account(
        seeds = [b"authority", pool_state.key().as_ref()],
        bump = pool_state.authority_bump,
    )]
    pub pool_authority: AccountInfo<'info>,
    
    #[account(mint::token_program = token_program)]
    pub token_mint_a: Box<InterfaceAccount<'info, Mint>>,  // ✅ BOX
    
    #[account(mint::token_program = token_program)]
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
        seeds = [b"pool_mint", pool_state.key().as_ref()],
        bump = pool_state.pool_mint_bump,
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
        init_if_needed,
        payer = user,
        associated_token::mint = pool_mint,
        associated_token::authority = user,
    )]
    pub user_lp_token: Box<InterfaceAccount<'info, TokenAccount>>,  // ✅ BOX
    
    pub token_program: Interface<'info, TokenInterface>,
    pub associated_token_program: Program<'info, AssociatedToken>,
    pub system_program: Program<'info, System>,
}

#[event]
pub struct LiquidityAdded {
    pub pool: Pubkey,
    pub provider: Pubkey,
    pub amount_a: u64,
    pub amount_b: u64,
    pub lp_tokens_minted: u64,
    pub total_supply: u64,
    pub timestamp: i64,
}