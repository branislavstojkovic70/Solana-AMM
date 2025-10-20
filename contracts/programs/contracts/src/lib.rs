use anchor_lang::prelude::*;
mod errors;
mod instructions;
mod state;
mod constants;

pub use instructions::*;
declare_id!("GzsQY3iNTX8eJGCyrD45ATKxZJUJLQmespEDubJN2teE");

#[program]
pub mod contracts {
    use super::*;
    pub fn create_amm(ctx: Context<CreateAmm>, id: Pubkey, fee: u16) -> Result<()> {
        ctx.accounts.create_amm(id, fee)?;
        Ok(())
    }

    pub fn create_pool(ctx: Context<CreatePool>) -> Result<()> {
        ctx.accounts.create_pool()?;
        Ok(())
    }
   
}

