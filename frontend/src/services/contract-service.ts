import { Connection, PublicKey, SystemProgram } from "@solana/web3.js";
import { getAssociatedTokenAddress, TOKEN_PROGRAM_ID } from "@solana/spl-token";
import { Program, AnchorProvider, type Idl, BN } from "@coral-xyz/anchor";
import { PROGRAM_ID, ASSOCIATED_TOKEN_PROGRAM_ID } from "../utils/constants";
import IDL from "../utils/idl.json";

// ==================== INTERFACES ====================

export interface PoolInfo {
  address: PublicKey;
  tokenMintA: PublicKey;
  tokenMintB: PublicKey;
  reserveA: bigint;
  reserveB: bigint;
  totalSupply: bigint;
  feeNumerator: number;
  feeDenominator: number;
}

export interface SwapQuote {
  amountIn: bigint;
  amountOut: bigint;
  priceImpact: number;
  fee: bigint;
  minimumReceived: bigint;
}

export interface LiquidityQuote {
  amountA: bigint;
  amountB: bigint;
  lpTokens: bigint;
  shareOfPool: number;
}

export interface TokenBalance {
  mint: PublicKey;
  balance: bigint;
  decimals: number;
}

// ==================== CONTRACT SERVICE ====================

export class ContractService {
  private program: Program<Idl> | null = null;
  private connection: Connection;
  private wallet: any;

  constructor(connection: Connection, wallet: any) {
    this.connection = connection;
    this.wallet = wallet;
  }


  private getProgram(): Program<Idl> {
    if (!this.program) {
      const provider = new AnchorProvider(this.connection, this.wallet, {
        commitment: "confirmed",
      });
      //@ts-ignore
      this.program = new Program(IDL as Idl, PROGRAM_ID, provider);
    }
    return this.program;
  }


  private getPoolPDA(tokenMintA: PublicKey, tokenMintB: PublicKey): [PublicKey, number] {
    return PublicKey.findProgramAddressSync(
      [Buffer.from("pool_state"), tokenMintA.toBuffer(), tokenMintB.toBuffer()],
      PROGRAM_ID
    );
  }

  private getPoolAuthorityPDA(poolState: PublicKey): [PublicKey, number] {
    return PublicKey.findProgramAddressSync(
      [Buffer.from("authority"), poolState.toBuffer()],
      PROGRAM_ID
    );
  }

  private getPoolMintPDA(poolState: PublicKey): [PublicKey, number] {
    return PublicKey.findProgramAddressSync(
      [Buffer.from("pool_mint"), poolState.toBuffer()],
      PROGRAM_ID
    );
  }

  private sortMints(mintA: PublicKey, mintB: PublicKey): [PublicKey, PublicKey] {
    if (mintA.toBuffer().compare(mintB.toBuffer()) < 0) {
      return [mintA, mintB];
    }
    return [mintB, mintA];
  }

  async initializePool(
    tokenMintA: PublicKey,
    tokenMintB: PublicKey,
    feeNumerator: number = 3,
    feeDenominator: number = 1000
  ): Promise<string> {
    if (!this.wallet.publicKey) throw new Error("Wallet not connected");

    const program = this.getProgram();
    const [mintA, mintB] = this.sortMints(tokenMintA, tokenMintB);

    const [poolStatePDA] = this.getPoolPDA(mintA, mintB);
    const [poolAuthorityPDA] = this.getPoolAuthorityPDA(poolStatePDA);
    const [poolMintPDA] = this.getPoolMintPDA(poolStatePDA);

    const vaultA = await getAssociatedTokenAddress(
      mintA,
      poolAuthorityPDA,
      true,
      TOKEN_PROGRAM_ID,
      ASSOCIATED_TOKEN_PROGRAM_ID
    );

    const vaultB = await getAssociatedTokenAddress(
      mintB,
      poolAuthorityPDA,
      true,
      TOKEN_PROGRAM_ID,
      ASSOCIATED_TOKEN_PROGRAM_ID
    );

    const tx = await program.methods
      .initializePool(new BN(feeNumerator), new BN(feeDenominator))
      .accounts({
        payer: this.wallet.publicKey,
        tokenMintA: mintA,
        tokenMintB: mintB,
        poolState: poolStatePDA,
        poolAuthority: poolAuthorityPDA,
        poolMint: poolMintPDA,
        vaultA: vaultA,
        vaultB: vaultB,
        systemProgram: SystemProgram.programId,
        tokenProgram: TOKEN_PROGRAM_ID,
        associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
      })
      .rpc();

    return tx;
  }

 
  async getPool(tokenMintA: PublicKey, tokenMintB: PublicKey): Promise<PoolInfo | null> {
    try {
      const program = this.getProgram();
      const [mintA, mintB] = this.sortMints(tokenMintA, tokenMintB);
      const [poolPDA] = this.getPoolPDA(mintA, mintB);
      //@ts-ignore
      const poolState = await program.account.poolState.fetch(poolPDA);

      return {
        address: poolPDA,
        tokenMintA: poolState.tokenMintA,
        tokenMintB: poolState.tokenMintB,
        reserveA: BigInt(poolState.reserveA.toString()),
        reserveB: BigInt(poolState.reserveB.toString()),
        totalSupply: BigInt(poolState.totalSupply.toString()),
        feeNumerator: poolState.feeNumerator.toNumber(),
        feeDenominator: poolState.feeDenominator.toNumber(),
      };
    } catch (error) {
      console.error("Failed to fetch pool:", error);
      return null;
    }
  }

  async getAllPools(): Promise<PoolInfo[]> {
    const program = this.getProgram();
    const pools = await program.account.poolState.all();
    // @ts-ignore
    return pools.map((pool) => ({
      address: pool.publicKey,
      tokenMintA: pool.account.tokenMintA,
      tokenMintB: pool.account.tokenMintB,
      reserveA: BigInt(pool.account.reserveA.toString()),
      reserveB: BigInt(pool.account.reserveB.toString()),
      totalSupply: BigInt(pool.account.totalSupply.toString()),
      feeNumerator: pool.account.feeNumerator.toNumber(),
      feeDenominator: pool.account.feeDenominator.toNumber(),
    }));
  }



  calculateSwapOutput(
    amountIn: bigint,
    reserveIn: bigint,
    reserveOut: bigint,
    feeNumerator: number = 3,
    feeDenominator: number = 1000
  ): SwapQuote {
    const amountInBN = BigInt(amountIn);
    const reserveInBN = BigInt(reserveIn);
    const reserveOutBN = BigInt(reserveOut);

    const fee = (amountInBN * BigInt(feeNumerator)) / BigInt(feeDenominator);
    const amountInAfterFee = amountInBN - fee;

    const numerator = amountInAfterFee * reserveOutBN;
    const denominator = reserveInBN + amountInAfterFee;
    const amountOut = numerator / denominator;

    const priceBefore = Number(reserveOutBN) / Number(reserveInBN);
    const priceAfter = Number(reserveOutBN - amountOut) / Number(reserveInBN + amountInBN);
    const priceImpact = ((priceBefore - priceAfter) / priceBefore) * 100;

    const minimumReceived = (amountOut * BigInt(995)) / BigInt(1000);

    return {
      amountIn: amountInBN,
      amountOut,
      priceImpact,
      fee,
      minimumReceived,
    };
  }

  async swap(
    tokenMintA: PublicKey,
    tokenMintB: PublicKey,
    amountIn: bigint,
    minAmountOut: bigint,
    isAToB: boolean
  ): Promise<string> {
    if (!this.wallet.publicKey) throw new Error("Wallet not connected");

    const program = this.getProgram();
    const [mintA, mintB] = this.sortMints(tokenMintA, tokenMintB);

    const [poolStatePDA] = this.getPoolPDA(mintA, mintB);
    const [poolAuthorityPDA] = this.getPoolAuthorityPDA(poolStatePDA);

    const userTokenA = await getAssociatedTokenAddress(
      mintA,
      this.wallet.publicKey,
      false,
      TOKEN_PROGRAM_ID
    );

    const userTokenB = await getAssociatedTokenAddress(
      mintB,
      this.wallet.publicKey,
      false,
      TOKEN_PROGRAM_ID
    );

    const vaultA = await getAssociatedTokenAddress(
      mintA,
      poolAuthorityPDA,
      true,
      TOKEN_PROGRAM_ID
    );

    const vaultB = await getAssociatedTokenAddress(
      mintB,
      poolAuthorityPDA,
      true,
      TOKEN_PROGRAM_ID
    );

    const tx = await program.methods
      .swap(new BN(amountIn.toString()), new BN(minAmountOut.toString()), isAToB)
      .accounts({
        user: this.wallet.publicKey,
        poolState: poolStatePDA,
        poolAuthority: poolAuthorityPDA,
        tokenMintA: mintA,
        tokenMintB: mintB,
        vaultA: vaultA,
        vaultB: vaultB,
        userTokenA: userTokenA,
        userTokenB: userTokenB,
        tokenProgram: TOKEN_PROGRAM_ID,
      })
      .rpc();

    return tx;
  }

  calculateAddLiquidity(
    amountA: bigint,
    amountB: bigint,
    reserveA: bigint,
    reserveB: bigint,
    totalSupply: bigint
  ): LiquidityQuote {
    let actualAmountA = amountA;
    let actualAmountB = amountB;

    if (totalSupply === BigInt(0)) {
      const lpTokens = this.sqrt(amountA * amountB) - BigInt(1000); 
      return {
        amountA: actualAmountA,
        amountB: actualAmountB,
        lpTokens,
        shareOfPool: 100,
      };
    }

    const amountBOptimal = (amountA * reserveB) / reserveA;

    if (amountBOptimal <= amountB) {
      actualAmountB = amountBOptimal;
    } else {
      const amountAOptimal = (amountB * reserveA) / reserveB;
      actualAmountA = amountAOptimal;
    }

    // Calculate LP tokens
    const lpFromA = (actualAmountA * totalSupply) / reserveA;
    const lpFromB = (actualAmountB * totalSupply) / reserveB;
    const lpTokens = lpFromA < lpFromB ? lpFromA : lpFromB;

    // Calculate share of pool
    const shareOfPool = Number((lpTokens * BigInt(10000)) / (totalSupply + lpTokens)) / 100;

    return {
      amountA: actualAmountA,
      amountB: actualAmountB,
      lpTokens,
      shareOfPool,
    };
  }

  /**
   * Add liquidity to pool
   */
  async addLiquidity(
    tokenMintA: PublicKey,
    tokenMintB: PublicKey,
    amountADesired: bigint,
    amountBDesired: bigint,
    amountAMin: bigint,
    amountBMin: bigint,
    minLPTokens: bigint
  ): Promise<string> {
    if (!this.wallet.publicKey) throw new Error("Wallet not connected");

    const program = this.getProgram();
    const [mintA, mintB] = this.sortMints(tokenMintA, tokenMintB);

    const [poolStatePDA] = this.getPoolPDA(mintA, mintB);
    const [poolAuthorityPDA] = this.getPoolAuthorityPDA(poolStatePDA);
    const [poolMintPDA] = this.getPoolMintPDA(poolStatePDA);

    const userTokenA = await getAssociatedTokenAddress(
      mintA,
      this.wallet.publicKey,
      false,
      TOKEN_PROGRAM_ID
    );

    const userTokenB = await getAssociatedTokenAddress(
      mintB,
      this.wallet.publicKey,
      false,
      TOKEN_PROGRAM_ID
    );

    const userLpToken = await getAssociatedTokenAddress(
      poolMintPDA,
      this.wallet.publicKey,
      false,
      TOKEN_PROGRAM_ID
    );

    const vaultA = await getAssociatedTokenAddress(
      mintA,
      poolAuthorityPDA,
      true,
      TOKEN_PROGRAM_ID
    );

    const vaultB = await getAssociatedTokenAddress(
      mintB,
      poolAuthorityPDA,
      true,
      TOKEN_PROGRAM_ID
    );

    const tx = await program.methods
      .addLiquidity(
        new BN(amountADesired.toString()),
        new BN(amountBDesired.toString()),
        new BN(amountAMin.toString()),
        new BN(amountBMin.toString()),
        new BN(minLPTokens.toString())
      )
      .accounts({
        user: this.wallet.publicKey,
        poolState: poolStatePDA,
        poolAuthority: poolAuthorityPDA,
        tokenMintA: mintA,
        tokenMintB: mintB,
        vaultA: vaultA,
        vaultB: vaultB,
        poolMint: poolMintPDA,
        userTokenA: userTokenA,
        userTokenB: userTokenB,
        userLpToken: userLpToken,
        tokenProgram: TOKEN_PROGRAM_ID,
        associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
        systemProgram: SystemProgram.programId,
      })
      .rpc();

    return tx;
  }


  calculateRemoveLiquidity(
    lpTokens: bigint,
    reserveA: bigint,
    reserveB: bigint,
    totalSupply: bigint
  ): { amountA: bigint; amountB: bigint; shareOfPool: number } {
    const amountA = (lpTokens * reserveA) / totalSupply;
    const amountB = (lpTokens * reserveB) / totalSupply;
    const shareOfPool = Number((lpTokens * BigInt(10000)) / totalSupply) / 100;

    return { amountA, amountB, shareOfPool };
  }


  async removeLiquidity(
    tokenMintA: PublicKey,
    tokenMintB: PublicKey,
    lpTokens: bigint,
    minAmountA: bigint,
    minAmountB: bigint
  ): Promise<string> {
    if (!this.wallet.publicKey) throw new Error("Wallet not connected");

    const program = this.getProgram();
    const [mintA, mintB] = this.sortMints(tokenMintA, tokenMintB);

    const [poolStatePDA] = this.getPoolPDA(mintA, mintB);
    const [poolAuthorityPDA] = this.getPoolAuthorityPDA(poolStatePDA);
    const [poolMintPDA] = this.getPoolMintPDA(poolStatePDA);

    const userTokenA = await getAssociatedTokenAddress(
      mintA,
      this.wallet.publicKey,
      false,
      TOKEN_PROGRAM_ID
    );

    const userTokenB = await getAssociatedTokenAddress(
      mintB,
      this.wallet.publicKey,
      false,
      TOKEN_PROGRAM_ID
    );

    const userLpToken = await getAssociatedTokenAddress(
      poolMintPDA,
      this.wallet.publicKey,
      false,
      TOKEN_PROGRAM_ID
    );

    const vaultA = await getAssociatedTokenAddress(
      mintA,
      poolAuthorityPDA,
      true,
      TOKEN_PROGRAM_ID
    );

    const vaultB = await getAssociatedTokenAddress(
      mintB,
      poolAuthorityPDA,
      true,
      TOKEN_PROGRAM_ID
    );

    const tx = await program.methods
      .removeLiquidity(
        new BN(lpTokens.toString()),
        new BN(minAmountA.toString()),
        new BN(minAmountB.toString())
      )
      .accounts({
        user: this.wallet.publicKey,
        poolState: poolStatePDA,
        poolAuthority: poolAuthorityPDA,
        tokenMintA: mintA,
        tokenMintB: mintB,
        vaultA: vaultA,
        vaultB: vaultB,
        poolMint: poolMintPDA,
        userTokenA: userTokenA,
        userTokenB: userTokenB,
        userLpToken: userLpToken,
        tokenProgram: TOKEN_PROGRAM_ID,
        associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
        systemProgram: SystemProgram.programId,
      })
      .rpc();

    return tx;
  }


  async getTokenBalance(tokenMint: PublicKey): Promise<TokenBalance | null> {
    if (!this.wallet.publicKey) return null;

    try {
      const tokenAccount = await getAssociatedTokenAddress(
        tokenMint,
        this.wallet.publicKey,
        false,
        TOKEN_PROGRAM_ID
      );

      const accountInfo = await this.connection.getTokenAccountBalance(tokenAccount);

      return {
        mint: tokenMint,
        balance: BigInt(accountInfo.value.amount),
        decimals: accountInfo.value.decimals,
      };
    } catch (error) {
      console.error("Failed to get token balance:", error);
      return null;
    }
  }


  async getLPTokenBalance(tokenMintA: PublicKey, tokenMintB: PublicKey): Promise<bigint> {
    if (!this.wallet.publicKey) return BigInt(0);

    try {
      const [mintA, mintB] = this.sortMints(tokenMintA, tokenMintB);
      const [poolStatePDA] = this.getPoolPDA(mintA, mintB);
      const [poolMintPDA] = this.getPoolMintPDA(poolStatePDA);

      const lpTokenAccount = await getAssociatedTokenAddress(
        poolMintPDA,
        this.wallet.publicKey,
        false,
        TOKEN_PROGRAM_ID
      );

      const accountInfo = await this.connection.getTokenAccountBalance(lpTokenAccount);
      return BigInt(accountInfo.value.amount);
    } catch (error) {
      return BigInt(0);
    }
  }


  private sqrt(value: bigint): bigint {
    if (value < BigInt(0)) {
      throw new Error("Square root of negative numbers is not supported");
    }
    if (value < BigInt(2)) {
      return value;
    }

    let x = value;
    let y = (x + BigInt(1)) / BigInt(2);

    while (y < x) {
      x = y;
      y = (x + value / x) / BigInt(2);
    }

    return x;
  }


  async poolExists(tokenMintA: PublicKey, tokenMintB: PublicKey): Promise<boolean> {
    const pool = await this.getPool(tokenMintA, tokenMintB);
    return pool !== null;
  }

  /**
   * Get pool price
   */
  async getPoolPrice(tokenMintA: PublicKey, tokenMintB: PublicKey): Promise<number | null> {
    const pool = await this.getPool(tokenMintA, tokenMintB);
    if (!pool) return null;

    return Number(pool.reserveB) / Number(pool.reserveA);
  }
}