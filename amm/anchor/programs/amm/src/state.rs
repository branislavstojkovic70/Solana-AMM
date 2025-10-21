use anchor_lang::prelude::*;

#[account]
#[derive(InitSpace)]  
pub struct PoolState {
    pub fee_numerator: u64,
    
    pub fee_denominator: u64,
    
    pub total_amount_minted: u64,
}

impl PoolState {
    pub const SIZE: usize = 8 + 8 + 8 + 8;
}