use anchor_lang::prelude::*;

declare_id!("GzsQY3iNTX8eJGCyrD45ATKxZJUJLQmespEDubJN2teE");

#[program]
pub mod contracts {
    use super::*;

    pub fn initialize(ctx: Context<Initialize>) -> Result<()> {
        msg!("Greetings from: {:?}", ctx.program_id);
        Ok(())
    }
}

#[derive(Accounts)]
pub struct Initialize {}
