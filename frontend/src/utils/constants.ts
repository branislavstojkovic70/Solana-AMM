import { PublicKey } from "@solana/web3.js";

export const PROGRAM_ID = new PublicKey("FiG4LoB7kGhAsufQGeZkBs72qgN6D4wFQpwVByGGo65F");

export const TOKEN_PROGRAM_ID = new PublicKey(
  "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA"
);

export const ASSOCIATED_TOKEN_PROGRAM_ID = new PublicKey(
  "ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL"
);

export const FEE_PERCENTAGE = 0.3;

export interface Token {
  symbol: string;
  name: string;
  mint: string;
  decimals: number;
  logo: string;
}

export const TOKEN_LIST: Token[] = [
  {
    symbol: "USDC",
    name: "USD Coin",
    mint: "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v",
    decimals: 6,
    logo: "https://raw.githubusercontent.com/solana-labs/token-list/main/assets/mainnet/EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v/logo.png",
  },
  {
    symbol: "SOL",
    name: "Wrapped SOL",
    mint: "So11111111111111111111111111111111111111112",
    decimals: 9,
    logo: "https://raw.githubusercontent.com/solana-labs/token-list/main/assets/mainnet/So11111111111111111111111111111111111111112/logo.png",
  },
  {
    symbol: "USDT",
    name: "USDT",
    mint: "Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB",
    decimals: 6,
    logo: "https://raw.githubusercontent.com/solana-labs/token-list/main/assets/mainnet/Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB/logo.svg",
  },
  // Add your test tokens here for localnet
  {
    symbol: "TEST-A",
    name: "Test Token A",
    mint: "YOUR_TEST_TOKEN_A_MINT",
    decimals: 9,
    logo: "/logo.png",
  },
  {
    symbol: "TEST-B",
    name: "Test Token B",
    mint: "YOUR_TEST_TOKEN_B_MINT",
    decimals: 9,
    logo: "/logo.png",
  },
];