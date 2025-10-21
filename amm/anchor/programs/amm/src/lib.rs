use anchor_lang::prelude::*;

pub mod error;
pub mod state;
pub mod instructions;

use instructions::*;

declare_id!("coUnmi3oBUtwtd9fjeAvSsJssXh5A5xyPbhpewyzRVF");

#[program]
pub mod amm {
    use super::*;

    pub fn initialize_pool(
        ctx: Context<InitializePool>,  
        fee_numerator: u64,
        fee_denominator: u64,
    ) -> Result<()> {
        init_pool::handler(ctx, fee_numerator, fee_denominator)
    }

    pub fn add_liquidity(
        ctx: Context<LiquidityOperation>,  
        amount_liq0: u64,
        amount_liq1: u64,
    ) -> Result<()> {
        liquidity::add_liquidity(ctx, amount_liq0, amount_liq1)
    }

    pub fn remove_liquidity(
        ctx: Context<LiquidityOperation>,  
        burn_amount: u64,
    ) -> Result<()> {
        liquidity::remove_liquidity(ctx, burn_amount)
    }

    pub fn swap(
        ctx: Context<Swap>,  
        amount_in: u64,
        min_amount_out: u64,
    ) -> Result<()> {
        swap::swap(ctx, amount_in, min_amount_out)
    }
}