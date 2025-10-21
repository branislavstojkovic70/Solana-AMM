use anchor_lang::prelude::*;
use anchor_spl::{
    associated_token::AssociatedToken,
    token::{Mint, Token, TokenAccount},
};

use crate::state::PoolState;
use crate::error::ErrorCode;

pub fn handler(
    ctx: Context<InitializePool>, 
    fee_numerator: u64,
    fee_denominator: u64,
) -> Result<()> {
    require!(fee_denominator > 0, ErrorCode::InvalidFeeParameters);
    require!(fee_numerator <= fee_denominator / 100, ErrorCode::FeeTooHigh);
    require!(
        ctx.accounts.mint0.key() < ctx.accounts.mint1.key(),
        ErrorCode::MintsNotOrdered
    );
    let pool_state = &mut ctx.accounts.pool_state;
    pool_state.fee_numerator = fee_numerator;
    pool_state.fee_denominator = fee_denominator;
    pool_state.total_amount_minted = 0; 

    
    
    msg!("Pool initialized with fee: {}/{}", fee_numerator, fee_denominator);
    
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
    
    /// CHECK: PDA authority derived from pool_state, used as signer for vault operations
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
    
    pub associated_token_program: Program<'info, AssociatedToken>,
    
    pub rent: Sysvar<'info, Rent>,
}