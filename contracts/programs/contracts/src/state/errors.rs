use anchor_lang::prelude::*;

#[error_code]
pub enum ErrorCode {
    #[msg("Fee denominator must be greater than zero")]
    InvalidFeeDenominator,

    #[msg("Fee numerator cannot exceed denominator")]
    InvalidFeeRatio,

    #[msg("Fee is too low - minimum required")]
    FeeTooLow,

    #[msg("Fee is too high - exceeds maximum allowed")]
    FeeTooHigh,

    #[msg("Both mints must be different tokens")]
    IdenticalMints,

    #[msg("Mint0 must be less than Mint1 to prevent duplicate pools")]
    InvalidMintOrder,

    #[msg("Mint has freeze authority - cannot be used in pool")]
    MintHasFreezeAuthority,

    #[msg("Mathematical operation overflow")]
    MathOverflow,

    #[msg("Insufficient liquidity in pool")]
    InsufficientLiquidity,

    #[msg("Slippage tolerance exceeded")]
    SlippageExceeded,

    #[msg("Invalid token amount - must be greater than zero")]
    InvalidAmount,

    #[msg("Pool is empty - add liquidity first")]
    PoolEmpty,
}