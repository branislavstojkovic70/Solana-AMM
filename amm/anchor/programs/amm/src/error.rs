use anchor_lang::prelude::*;

#[error_code]
pub enum ErrorCode {
    #[msg("Src Balance < LP Deposit Amount.")]
    NotEnoughBalance,
    #[msg("Pool Mint Amount < 0 on LP Deposit")]
    NoPoolMintOutput,
    #[msg("Trying to burn too much")]
    BurnTooMuch,
    #[msg("Not enough out")]
    NotEnoughOut,
    #[msg("Math overflow")]
    MathOverflow,
    #[msg("Invalid fee parameters")]
    InvalidFeeParameters,
    #[msg("Fee too high")]
    FeeTooHigh,
    #[msg("Mints are not ordered correctly")]
    MintsNotOrdered,
}