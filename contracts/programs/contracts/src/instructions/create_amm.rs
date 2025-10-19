use anchor_lang::prelude::*;

use crate::{errors::*, state::Amm};

impl<'info> CreateAmm<'info> {
    pub fn create_amm(&mut self, id: Pubkey, fee: u16) -> Result<()> {
        require!(fee < 10000, Errors::InvalidFee);
        let amm = &mut self.amm;
        amm.id = id;
        amm.admin = self.admin.key();
        amm.fee = fee;

        Ok(())
    }
}
#[derive(Accounts)]
#[instruction(id: Pubkey, fee: u16)]
pub struct CreateAmm<'info> {
    #[account(
        init,
        payer = payer,
        space = Amm::LEN,
        seeds = [
            b"amm",
            id.as_ref()
        ],
        bump,
    )]
    pub amm: Account<'info, Amm>,
    pub admin: Signer<'info>,

    #[account(mut)]
    pub payer: Signer<'info>,

    pub system_program: Program<'info, System>,
}
