use anchor_lang::prelude::*;
pub mod state;
pub mod instructions;

use instructions::*;
declare_id!("GzsQY3iNTX8eJGCyrD45ATKxZJUJLQmespEDubJN2teE");

#[program]
pub mod contracts {
    use super::*;

    pub fn initialize_pool(
        ctx: Context<InitializePool>, 
        fee_numerator: u64,
        fee_denominator: u64,
    ) -> Result<()> {
        init_pool::handler(ctx, fee_numerator, fee_denominator)
    }
}

