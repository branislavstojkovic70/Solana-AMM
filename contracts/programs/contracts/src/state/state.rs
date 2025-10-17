use anchor_lang::prelude::*;

#[account]
#[derive(InitSpace)]
pub struct PoolState {
    /// Prvi token mint (manji pubkey)
    pub mint0: Pubkey,
    
    /// Drugi token mint (veći pubkey)
    pub mint1: Pubkey,
    
    /// Ukupna količina LP tokena u cirkulaciji
    pub total_lp_supply: u64,
    
    /// Brojilac za fee (npr. 3 za 0.3%)
    pub fee_numerator: u64,
    
    /// Imenilac za fee (npr. 1000 za 0.3%)
    pub fee_denominator: u64,
    
    /// Bump seed za pool_state PDA
    pub pool_state_bump: u8,
    
    /// Bump seed za pool_authority PDA
    pub pool_authority_bump: u8,
}

impl PoolState {
    /// Vraća fee kao decimalni broj (0.003 za 0.3%)
    pub fn fee_rate(&self) -> f64 {
        self.fee_numerator as f64 / self.fee_denominator as f64
    }

    /// Vraća fee kao procenat (0.3 za 0.3%)
    pub fn fee_percentage(&self) -> f64 {
        self.fee_rate() * 100.0
    }

    /// Izračunava fee za datu količinu
    pub fn calculate_fee(&self, amount: u64) -> Result<u64> {
        amount
            .checked_mul(self.fee_numerator)
            .and_then(|v| v.checked_div(self.fee_denominator))
            .ok_or(error!(crate::state::ErrorCode::MathOverflow))
    }

    /// Izračunava količinu nakon odbitka fee-a
    pub fn amount_after_fee(&self, amount: u64) -> Result<u64> {
        let fee = self.calculate_fee(amount)?;
        amount
            .checked_sub(fee)
            .ok_or(error!(crate::state::ErrorCode::MathOverflow))
    }
}