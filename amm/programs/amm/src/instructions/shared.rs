use anchor_lang::prelude::*;
use anchor_spl::token_interface::{
    Mint, TokenAccount, TokenInterface,
    transfer_checked, TransferChecked,
    mint_to, MintTo,
    burn, Burn,
};
use crate::error::ErrorCode;

pub fn transfer_tokens<'info>(
    from: &InterfaceAccount<'info, TokenAccount>,
    to: &InterfaceAccount<'info, TokenAccount>,
    mint: &InterfaceAccount<'info, Mint>,
    authority: &Signer<'info>,
    token_program: &Interface<'info, TokenInterface>,
    amount: u64,
) -> Result<()> {
    let cpi_accounts = TransferChecked {
        from: from.to_account_info(),
        to: to.to_account_info(),
        authority: authority.to_account_info(),
        mint: mint.to_account_info(),
    };
    
    let cpi_ctx = CpiContext::new(token_program.to_account_info(), cpi_accounts);
    
    transfer_checked(cpi_ctx, amount, mint.decimals)?;
    
    Ok(())
}

pub fn transfer_tokens_signed<'info>(
    from: &InterfaceAccount<'info, TokenAccount>,
    to: &InterfaceAccount<'info, TokenAccount>,
    mint: &InterfaceAccount<'info, Mint>,
    authority: &AccountInfo<'info>,
    token_program: &Interface<'info, TokenInterface>,
    amount: u64,
    signer_seeds: &[&[&[u8]]],
) -> Result<()> {
    let cpi_accounts = TransferChecked {
        from: from.to_account_info(),
        to: to.to_account_info(),
        authority: authority.to_account_info(),
        mint: mint.to_account_info(),
    };
    
    let cpi_ctx = CpiContext::new_with_signer(
        token_program.to_account_info(),
        cpi_accounts,
        signer_seeds,
    );
    
    transfer_checked(cpi_ctx, amount, mint.decimals)?;
    
    Ok(())
}

pub fn mint_lp_tokens<'info>(
    mint: &InterfaceAccount<'info, Mint>,
    to: &InterfaceAccount<'info, TokenAccount>,
    authority: &AccountInfo<'info>,
    token_program: &Interface<'info, TokenInterface>,
    amount: u64,
    signer_seeds: &[&[&[u8]]],
) -> Result<()> {
    let cpi_accounts = MintTo {
        mint: mint.to_account_info(),
        to: to.to_account_info(),
        authority: authority.to_account_info(),
    };
    
    let cpi_ctx = CpiContext::new_with_signer(
        token_program.to_account_info(),
        cpi_accounts,
        signer_seeds,
    );
    
    mint_to(cpi_ctx, amount)?;
    
    Ok(())
}

pub fn burn_lp_tokens<'info>(
    mint: &InterfaceAccount<'info, Mint>,
    from: &InterfaceAccount<'info, TokenAccount>,
    authority: &Signer<'info>,
    token_program: &Interface<'info, TokenInterface>,
    amount: u64,
) -> Result<()> {
    let cpi_accounts = Burn {
        mint: mint.to_account_info(),
        from: from.to_account_info(),
        authority: authority.to_account_info(),
    };
    
    let cpi_ctx = CpiContext::new(token_program.to_account_info(), cpi_accounts);
    
    burn(cpi_ctx, amount)?;
    
    Ok(())
}

pub fn integer_sqrt(value: u128) -> u64 {
    if value == 0 {
        return 0;
    }
    
    let mut x = value;
    let mut y = (x + 1) / 2;
    
    while y < x {
        x = y;
        y = (x + value / x) / 2;
    }
    
    x as u64
}

pub fn calculate_optimal_amounts(
    amount_a_desired: u64,
    amount_b_desired: u64,
    reserve_a: u64,
    reserve_b: u64,
) -> Result<(u64, u64)> {
    if reserve_a == 0 && reserve_b == 0 {
        return Ok((amount_a_desired, amount_b_desired));
    }
    
    let amount_b_optimal = (amount_a_desired as u128)
        .checked_mul(reserve_b as u128)
        .ok_or(ErrorCode::MathOverflow)?
        .checked_div(reserve_a as u128)
        .ok_or(ErrorCode::DivisionByZero)? as u64;
    
    if amount_b_optimal <= amount_b_desired {
        return Ok((amount_a_desired, amount_b_optimal));
    }
    
    let amount_a_optimal = (amount_b_desired as u128)
        .checked_mul(reserve_a as u128)
        .ok_or(ErrorCode::MathOverflow)?
        .checked_div(reserve_b as u128)
        .ok_or(ErrorCode::DivisionByZero)? as u64;
    
    require!(
        amount_a_optimal <= amount_a_desired,
        ErrorCode::InvalidAmount  
    );
    
    Ok((amount_a_optimal, amount_b_desired))
}

pub fn calculate_swap_output(
    amount_in: u64,
    reserve_in: u64,
    reserve_out: u64,
) -> Result<u64> {
    require!(amount_in > 0, ErrorCode::InvalidAmount);
    require!(reserve_in > 0 && reserve_out > 0, ErrorCode::EmptyReserves);
    
    let numerator = (amount_in as u128)
        .checked_mul(reserve_out as u128)
        .ok_or(ErrorCode::MathOverflow)?;
    
    let denominator = (reserve_in as u128)
        .checked_add(amount_in as u128)
        .ok_or(ErrorCode::MathOverflow)?;
    
    let amount_out = numerator
        .checked_div(denominator)
        .ok_or(ErrorCode::DivisionByZero)? as u64;
    
    require!(amount_out > 0, ErrorCode::OutputBelowMinimum);
    
    Ok(amount_out)
}