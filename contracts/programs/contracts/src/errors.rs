use anchor_lang::prelude::*;

#[error_code]
pub enum Errors {
    #[msg("Invalid fee value")]
    InvalidFee,
    #[msg("Invalid mint accounts")]
    InvalidMint,
}