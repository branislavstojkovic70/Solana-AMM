use anchor_lang::prelude::*;

#[account]
#[derive(InitSpace)]
pub struct PoolState {
    pub token_mint_a: Pubkey,
    pub token_mint_b: Pubkey,

    pub vault_a: Pubkey,
    pub vault_b: Pubkey,

    pub pool_mint: Pubkey,

    pub fee_numerator: u64,
    pub fee_denominator: u64,

    pub reserve_a: u64,
    pub reserve_b: u64,
    pub total_supply: u64,

    pub bump: u8,
    pub authority_bump: u8,
    pub pool_mint_bump: u8,
}
