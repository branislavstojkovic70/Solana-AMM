use anchor_lang::prelude::*;
use anchor_spl::{
    token,
    token::{Burn, Mint, MintTo, Token, TokenAccount, Transfer},
};

use crate::state::PoolState;
use crate::error::ErrorCode;

pub fn add_liquidity(
    ctx: Context<LiquidityOperation>, 
    amount_liq0: u64,
    amount_liq1: u64, 
) -> Result<()> {
    let user_balance0 = ctx.accounts.user0.amount; 
    let user_balance1 = ctx.accounts.user1.amount; 

    require!(amount_liq0 <= user_balance0, ErrorCode::NotEnoughBalance);
    require!(amount_liq1 <= user_balance1, ErrorCode::NotEnoughBalance);

    let vault_balance0 = ctx.accounts.vault0.amount;
    let vault_balance1 = ctx.accounts.vault1.amount;
    let pool_state = &mut ctx.accounts.pool_state; 
    
    let deposit0 = amount_liq0;
    let deposit1; 
    let amount_to_mint;
    
    msg!("vaults: {} {}", vault_balance0, vault_balance1);
    msg!("init deposits: {} {}", amount_liq0, amount_liq1);

    if vault_balance0 == 0 && vault_balance1 == 0 {
        let product = (amount_liq0 as u128)
            .checked_mul(amount_liq1 as u128)
            .ok_or(ErrorCode::MathOverflow)?;
        amount_to_mint = integer_sqrt(product);
        deposit1 = amount_liq1;
    } else { 
        let exchange10 = vault_balance1.checked_div(vault_balance0).unwrap();
        let amount_deposit_1 = amount_liq0.checked_mul(exchange10).unwrap();
        msg!("new deposits: {} {} {}", exchange10, amount_liq0, amount_deposit_1);

        require!(amount_deposit_1 <= amount_liq1, ErrorCode::NotEnoughBalance);
        deposit1 = amount_deposit_1;

        amount_to_mint = (
            (deposit1 as u128)
            .checked_mul(pool_state.total_amount_minted as u128).unwrap()
            .checked_div(vault_balance1 as u128).unwrap()
        ) as u64;

        msg!("pmint: {}", amount_to_mint);
    }

    require!(amount_to_mint > 0, ErrorCode::NoPoolMintOutput);

    pool_state.total_amount_minted += amount_to_mint;
    
    let bump = ctx.bumps.pool_authority;
    let pool_key = ctx.accounts.pool_state.key();
    let pda_sign = &[b"authority", pool_key.as_ref(), &[bump]];
    
    let mint_ctx = CpiContext::new(
        ctx.accounts.token_program.to_account_info(), 
        MintTo {
            to: ctx.accounts.user_pool_ata.to_account_info(),
            mint: ctx.accounts.pool_mint.to_account_info(),
            authority: ctx.accounts.pool_authority.to_account_info(),
        }
    );
    token::mint_to(mint_ctx.with_signer(&[pda_sign]), amount_to_mint)?;
    
    token::transfer(CpiContext::new(
        ctx.accounts.token_program.to_account_info(), 
        Transfer {
            from: ctx.accounts.user0.to_account_info(), 
            to: ctx.accounts.vault0.to_account_info(),
            authority: ctx.accounts.owner.to_account_info(), 
        }
    ), deposit0)?;

    token::transfer(CpiContext::new(
        ctx.accounts.token_program.to_account_info(), 
        Transfer {
            from: ctx.accounts.user1.to_account_info(), 
            to: ctx.accounts.vault1.to_account_info(),
            authority: ctx.accounts.owner.to_account_info(), 
        }
    ), deposit1)?;

    Ok(())
}

pub fn remove_liquidity(
    ctx: Context<LiquidityOperation>, 
    burn_amount: u64,
) -> Result<()> {
    let pool_mint_balance = ctx.accounts.user_pool_ata.amount; 
    require!(burn_amount <= pool_mint_balance, ErrorCode::NotEnoughBalance);

    let pool_key = ctx.accounts.pool_state.key();
    let state = &mut ctx.accounts.pool_state;
    require!(state.total_amount_minted >= burn_amount, ErrorCode::BurnTooMuch);
    
    let vault0_amount = ctx.accounts.vault0.amount as u128;
    let vault1_amount = ctx.accounts.vault1.amount as u128;
    let u128_burn_amount = burn_amount as u128;

    let [amount0, amount1] = [
        u128_burn_amount
            .checked_mul(vault0_amount).unwrap()
            .checked_div(state.total_amount_minted as u128).unwrap() as u64,
        u128_burn_amount
            .checked_mul(vault1_amount).unwrap()
            .checked_div(state.total_amount_minted as u128).unwrap() as u64
    ];

    // ✅ FIXED: Koristi direktan pristup bump-u
    let bump = ctx.bumps.pool_authority;
    let pda_sign = &[b"authority", pool_key.as_ref(), &[bump]];
    
    token::transfer(CpiContext::new(
        ctx.accounts.token_program.to_account_info(), 
        Transfer {
            from: ctx.accounts.vault0.to_account_info(), 
            to: ctx.accounts.user0.to_account_info(),
            authority: ctx.accounts.pool_authority.to_account_info(), 
        }
    ).with_signer(&[pda_sign]), amount0)?;

    token::transfer(CpiContext::new(
        ctx.accounts.token_program.to_account_info(), 
        Transfer {
            from: ctx.accounts.vault1.to_account_info(), 
            to: ctx.accounts.user1.to_account_info(),
            authority: ctx.accounts.pool_authority.to_account_info(), 
        }
    ).with_signer(&[pda_sign]), amount1)?;

    token::burn(CpiContext::new(
        ctx.accounts.token_program.to_account_info(), 
        Burn { 
            mint: ctx.accounts.pool_mint.to_account_info(), 
            from: ctx.accounts.user_pool_ata.to_account_info(), 
            authority: ctx.accounts.owner.to_account_info(),      
        }
    ), burn_amount)?;  

    state.total_amount_minted -= burn_amount; 

    Ok(())
}

fn integer_sqrt(n: u128) -> u64 {
    if n == 0 {
        return 0;
    }
    let mut x = n;
    let mut y = (x + 1) / 2;
    while y < x {
        x = y;
        y = (x + n / x) / 2;
    }
    x as u64
}

#[derive(Accounts)]
pub struct LiquidityOperation<'info> {
    #[account(mut)]
    pub pool_state: Box<Account<'info, PoolState>>,
    
    /// CHECK: PDA authority derived from pool_state, used as signer for vault operations
    #[account(seeds=[b"authority", pool_state.key().as_ref()], bump)]
    pub pool_authority: AccountInfo<'info>,
    
    #[account(mut, 
        constraint = vault0.mint == user0.mint,
        seeds=[b"vault0", pool_state.key().as_ref()], bump)]
    pub vault0: Box<Account<'info, TokenAccount>>, 
    
    #[account(mut, 
        constraint = vault1.mint == user1.mint,
        seeds=[b"vault1", pool_state.key().as_ref()], bump)]
    pub vault1: Box<Account<'info, TokenAccount>>,
    
    #[account(mut, 
        constraint = user_pool_ata.mint == pool_mint.key(),
        seeds=[b"pool_mint", pool_state.key().as_ref()], bump)]
    pub pool_mint: Box<Account<'info, Mint>>,  
    
    #[account(mut, has_one = owner)]
    pub user0: Box<Account<'info, TokenAccount>>, 
    
    #[account(mut, has_one = owner)]
    pub user1: Box<Account<'info, TokenAccount>>, 
    
    #[account(mut, has_one = owner)]
    pub user_pool_ata: Box<Account<'info, TokenAccount>>, 
    
    pub owner: Signer<'info>,

    pub token_program: Program<'info, Token>,
}