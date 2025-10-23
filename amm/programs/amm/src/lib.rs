use anchor_lang::prelude::*;

pub mod error;
pub mod state;
pub mod instructions;

use instructions::*;

declare_id!("FiG4LoB7kGhAsufQGeZkBs72qgN6D4wFQpwVByGGo65F");

#[program]
pub mod amm {
    use super::*;
    
    pub fn initialize_pool(
        ctx: Context<InitializePool>,
        fee_numerator: u64,
        fee_denominator: u64,
    ) -> Result<()> {
        instructions::initialize_pool::initialize_pool_handler(ctx, fee_numerator, fee_denominator)
    }
    
  
    pub fn add_liquidity(
        ctx: Context<AddLiquidity>,
        amount_a_desired: u64,
        amount_b_desired: u64,
        amount_a_min: u64,
        amount_b_min: u64,
        min_lp_tokens: u64,
    ) -> Result<()> {
        instructions::add_liquidity::add_liquidity_handler(
            ctx,
            amount_a_desired,
            amount_b_desired,
            amount_a_min,
            amount_b_min,
            min_lp_tokens,
        )
    }
    
    pub fn remove_liquidity(
        ctx: Context<RemoveLiquidity>,
        lp_tokens: u64,
        min_amount_a: u64,
        min_amount_b: u64,
    ) -> Result<()> {
        instructions::remove_liquidity::remove_liquidity_handler(
            ctx,
            lp_tokens,
            min_amount_a,
            min_amount_b,
        )
    }
    
    pub fn swap(
        ctx: Context<Swap>,
        amount_in: u64,
        min_amount_out: u64,
        is_a_to_b: bool,
    ) -> Result<()> {
        instructions::swap::swap_handler(ctx, amount_in, min_amount_out, is_a_to_b)
    }
}