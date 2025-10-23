use anchor_lang::prelude::*;

#[error_code]
pub enum ErrorCode {
    #[msg("Invalid fee parameters")]
    InvalidFeeParameters,
    
    #[msg("Fee too high - maximum fee is 1% (numerator <= denominator/100)")]
    FeeTooHigh,
    
    #[msg("Mints must be ordered (mint_a < mint_b)")]
    MintsNotOrdered,
    
    #[msg("Mixed token programs detected")]
    MixedTokenPrograms,

    #[msg("Invalid amount - must be greater than zero")]
    InvalidAmount,
    
    #[msg("Insufficient balance in user account")]
    InsufficientBalance,
    
    #[msg("Insufficient amount A - below minimum threshold")]
    InsufficientAmountA,
    
    #[msg("Insufficient amount B - below minimum threshold")]
    InsufficientAmountB,
    
    #[msg("Insufficient LP tokens - below minimum threshold")]
    InsufficientLPTokens,

    #[msg("Insufficient liquidity - minimum liquidity not met")]
    InsufficientLiquidity,
    
    #[msg("Insufficient liquidity in pool for this operation")]
    InsufficientPoolLiquidity,

    #[msg("Math overflow occurred")]
    MathOverflow,
    
    #[msg("Division by zero")]
    DivisionByZero,

    #[msg("Slippage tolerance exceeded")]
    SlippageExceeded,
    
    #[msg("Output amount below minimum")]
    OutputBelowMinimum,

    #[msg("Pool is not initialized")]
    PoolNotInitialized,
    
    #[msg("Pool reserves are empty")]
    EmptyReserves,
    
    #[msg("Invalid pool state")]
    InvalidPoolState,

    #[msg("Invalid token mint")]
    InvalidTokenMint,
    
    #[msg("Token account mismatch")]
    TokenAccountMismatch,
    
    #[msg("Identical tokens - cannot create pool with same token")]
    IdenticalTokens,

    #[msg("Invalid authority")]
    InvalidAuthority,
    
    #[msg("Unauthorized operation")]
    Unauthorized,

    #[msg("Output too small")]
    OutputTooSmall,

    #[msg("Price impact too high")]
    PriceImpactTooHigh,

    #[msg("Invalid constant product")]
    InvalidConstantProduct,
}