import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { Amm } from "../target/types/amm";

import * as token from "@solana/spl-token";
import * as web3 from "@solana/web3.js";
import assert from "assert";

interface Pool {
  auth: web3.Keypair;
  payer: web3.Keypair;
  mint0: web3.PublicKey;
  mint1: web3.PublicKey;
  vault0: web3.PublicKey;
  vault1: web3.PublicKey;
  poolMint: web3.PublicKey;
  poolState: web3.PublicKey;
  poolAuth: web3.PublicKey;
}

interface LPProvider {
  signer: web3.Keypair;
  user0: web3.PublicKey;
  user1: web3.PublicKey;
  poolAta: web3.PublicKey;
}

describe("AMM Tests", () => {
  const provider = anchor.AnchorProvider.env();
  const connection = provider.connection;
  anchor.setProvider(provider);

  const program = anchor.workspace.Amm as Program<Amm>;

  let pool: Pool;
  const n_decimals = 9;

  it("Initializes a new pool", async () => {
    console.log("\n Starting Pool Initialization...");
    
    const auth = web3.Keypair.generate();
    const sig = await connection.requestAirdrop(
      auth.publicKey,
      100 * web3.LAMPORTS_PER_SOL
    );
    await connection.confirmTransaction(sig);
    console.log("Funded authority:", auth.publicKey.toString());

    const mint0 = await token.createMint(
      connection,
      auth,
      auth.publicKey,
      auth.publicKey,
      n_decimals
    );
    console.log("Created mint0:", mint0.toString());

    const mint1 = await token.createMint(
      connection,
      auth,
      auth.publicKey,
      auth.publicKey,
      n_decimals
    );
    console.log("Created mint1:", mint1.toString());

    const [poolState] = web3.PublicKey.findProgramAddressSync(
      [Buffer.from("pool_state"), mint0.toBuffer(), mint1.toBuffer()],
      program.programId
    );

    const [authority] = web3.PublicKey.findProgramAddressSync(
      [Buffer.from("authority"), poolState.toBuffer()],
      program.programId
    );

    const [vault0] = web3.PublicKey.findProgramAddressSync(
      [Buffer.from("vault0"), poolState.toBuffer()],
      program.programId
    );

    const [vault1] = web3.PublicKey.findProgramAddressSync(
      [Buffer.from("vault1"), poolState.toBuffer()],
      program.programId
    );

    const [poolMint] = web3.PublicKey.findProgramAddressSync(
      [Buffer.from("pool_mint"), poolState.toBuffer()],
      program.programId
    );

    console.log(" Pool State:", poolState.toString());
    console.log(" Pool Authority:", authority.toString());

    const fee_numerator = new anchor.BN(1);
    const fee_denominator = new anchor.BN(10000);

    await program.methods
      .initializePool(fee_numerator, fee_denominator)
      .accountsPartial({
        mint0: mint0,
        mint1: mint1,
        poolState: poolState,
        poolAuthority: authority,
        vault0: vault0,
        vault1: vault1,
        poolMint: poolMint,
        payer: provider.wallet.publicKey,
        systemProgram: web3.SystemProgram.programId,
        tokenProgram: token.TOKEN_PROGRAM_ID,
        associatedTokenProgram: token.ASSOCIATED_TOKEN_PROGRAM_ID,
        rent: web3.SYSVAR_RENT_PUBKEY,
      })
      .rpc();

    console.log("Pool initialized successfully!");

    pool = {
      auth: auth,
      payer: auth,
      mint0: mint0,
      mint1: mint1,
      vault0: vault0,
      vault1: vault1,
      poolMint: poolMint,
      poolState: poolState,
      poolAuth: authority,
    };

    const poolStateAccount = await program.account.poolState.fetch(poolState);
    assert.equal(
      poolStateAccount.feeNumerator.toNumber(),
      1,
      "Fee numerator should be 1"
    );
    assert.equal(
      poolStateAccount.feeDenominator.toNumber(),
      10000,
      "Fee denominator should be 10000"
    );
    assert.equal(
      poolStateAccount.totalAmountMinted.toNumber(),
      0,
      "Total minted should be 0"
    );
  });

  async function setupLPProvider(lpUser: web3.PublicKey, amount: number) {
    const mint0Ata = await token.createAssociatedTokenAccount(
      connection,
      pool.payer,
      pool.mint0,
      lpUser
    );

    const mint1Ata = await token.createAssociatedTokenAccount(
      connection,
      pool.payer,
      pool.mint1,
      lpUser
    );

    const poolMintAta = await token.createAssociatedTokenAccount(
      connection,
      pool.payer,
      pool.poolMint,
      lpUser
    );

    await token.mintTo(
      connection,
      pool.payer,
      pool.mint0,
      mint0Ata,
      pool.auth,
      amount * 10 ** n_decimals
    );

    await token.mintTo(
      connection,
      pool.payer,
      pool.mint1,
      mint1Ata,
      pool.auth,
      amount * 10 ** n_decimals
    );

    return [mint0Ata, mint1Ata, poolMintAta];
  }

  async function getTokenBalance(pk: web3.PublicKey): Promise<number> {
    return (await connection.getTokenAccountBalance(pk)).value.uiAmount || 0;
  }

  function lpAmount(n: number): anchor.BN {
    return new anchor.BN(n * 10 ** n_decimals);
  }

  let lpUser0: LPProvider;
  it("Adds initial liquidity to the pool", async () => {
    console.log("\nAdding Initial Liquidity...");
    
    const lpUserSigner = web3.Keypair.generate();
    const lpUser = lpUserSigner.publicKey;
    
    const [user0, user1, poolAta] = await setupLPProvider(lpUser, 100);

    lpUser0 = {
      signer: lpUserSigner,
      user0: user0,
      user1: user1,
      poolAta: poolAta,
    };

    const [srcAmount0In, srcAmount1In] = [lpAmount(50), lpAmount(50)];

    await program.methods
      .addLiquidity(srcAmount0In, srcAmount1In)
      .accountsPartial({
        poolState: pool.poolState,
        poolAuthority: pool.poolAuth,
        vault0: pool.vault0,
        vault1: pool.vault1,
        poolMint: pool.poolMint,
        user0: user0,
        user1: user1,
        userPoolAta: poolAta,
        owner: lpUser,
        tokenProgram: token.TOKEN_PROGRAM_ID,
      })
      .signers([lpUserSigner])
      .rpc();

    const balanceMint0 = await getTokenBalance(poolAta);
    const poolStateAccount = await program.account.poolState.fetch(pool.poolState);
    const amountTotalMint = poolStateAccount.totalAmountMinted.toNumber() / 10 ** n_decimals;

    console.log("LP Tokens Received:", balanceMint0);
    console.log("Total LP Supply:", amountTotalMint);

    assert(balanceMint0 > 0, "Should receive LP tokens");

    const vb0 = await getTokenBalance(pool.vault0);
    const vb1 = await getTokenBalance(pool.vault1);
    console.log("Vault0 Balance:", vb0);
    console.log("Vault1 Balance:", vb1);

    assert(vb0 > 0, "Vault0 should have tokens");
    assert(vb1 > 0, "Vault1 should have tokens");
    assert.equal(vb0, vb1, "Vaults should have equal amounts (1:1 ratio)");
  });

  let lpUser1: LPProvider;
  it("Adds second liquidity to the pool", async () => {
    console.log("\nAdding Second Liquidity...");
    
    const lpUserSigner = web3.Keypair.generate();
    const lpUser = lpUserSigner.publicKey;
    const [user0, user1, poolAta] = await setupLPProvider(lpUser, 100);

    lpUser1 = {
      signer: lpUserSigner,
      user0: user0,
      user1: user1,
      poolAta: poolAta,
    };

    const [srcAmount0In, srcAmount1In] = [lpAmount(50), lpAmount(50)];

    await program.methods
      .addLiquidity(srcAmount0In, srcAmount1In)
      .accountsPartial({
        poolState: pool.poolState,
        poolAuthority: pool.poolAuth,
        vault0: pool.vault0,
        vault1: pool.vault1,
        poolMint: pool.poolMint,
        user0: user0,
        user1: user1,
        userPoolAta: poolAta,
        owner: lpUser,
        tokenProgram: token.TOKEN_PROGRAM_ID,
      })
      .signers([lpUserSigner])
      .rpc();

    const balanceMint0 = await getTokenBalance(poolAta);
    const poolStateAccount = await program.account.poolState.fetch(pool.poolState);
    const amountTotalMint = poolStateAccount.totalAmountMinted.toNumber() / 10 ** n_decimals;

    console.log("LP Tokens Received:", balanceMint0);
    console.log("Total LP Supply:", amountTotalMint);

    assert(balanceMint0 > 0, "Should receive LP tokens");

    const vb0 = await getTokenBalance(pool.vault0);
    const vb1 = await getTokenBalance(pool.vault1);
    console.log("Vault0 Balance:", vb0);
    console.log("Vault1 Balance:", vb1);

    assert.equal(vb0, vb1, "Vaults should maintain 1:1 ratio");
  });

  it("Adds third liquidity with proportional amounts", async () => {
    console.log("\nAdding Third Liquidity (Proportional)...");
    
    const lpUserSigner = web3.Keypair.generate();
    const lpUser = lpUserSigner.publicKey;
    const [user0, user1, poolAta] = await setupLPProvider(lpUser, 100);

    const [srcAmount0In, srcAmount1In] = [lpAmount(25), lpAmount(100)];

    await program.methods
      .addLiquidity(srcAmount0In, srcAmount1In)
      .accountsPartial({
        poolState: pool.poolState,
        poolAuthority: pool.poolAuth,
        vault0: pool.vault0,
        vault1: pool.vault1,
        poolMint: pool.poolMint,
        user0: user0,
        user1: user1,
        userPoolAta: poolAta,
        owner: lpUser,
        tokenProgram: token.TOKEN_PROGRAM_ID,
      })
      .signers([lpUserSigner])
      .rpc();

    const balanceMint0 = await getTokenBalance(poolAta);
    console.log("LP Tokens Received:", balanceMint0);

    const vb0 = await getTokenBalance(pool.vault0);
    const vb1 = await getTokenBalance(pool.vault1);
    console.log("Vault0 Balance:", vb0);
    console.log("Vault1 Balance:", vb1);

    assert(vb0 > 0, "Vault0 should have tokens");
    assert(vb1 > 0, "Vault1 should have tokens");
    assert.equal(vb0, vb1, "Vaults should still maintain 1:1 ratio");
  });

  it("Removes liquidity", async () => {
    console.log("\n Removing Liquidity...");
    
    const bUser0Before = await getTokenBalance(lpUser0.user0);
    const bUser1Before = await getTokenBalance(lpUser0.user1);
    const balanceMint0Before = await getTokenBalance(lpUser0.poolAta);

    console.log("Before - User0:", bUser0Before, "User1:", bUser1Before, "LP:", balanceMint0Before);

    await program.methods
      .removeLiquidity(lpAmount(50))
      .accountsPartial({
        poolState: pool.poolState,
        poolAuthority: pool.poolAuth,
        vault0: pool.vault0,
        vault1: pool.vault1,
        poolMint: pool.poolMint,
        user0: lpUser0.user0,
        user1: lpUser0.user1,
        userPoolAta: lpUser0.poolAta,
        owner: lpUser0.signer.publicKey,
        tokenProgram: token.TOKEN_PROGRAM_ID,
      })
      .signers([lpUser0.signer])
      .rpc();

    const bUser0After = await getTokenBalance(lpUser0.user0);
    const bUser1After = await getTokenBalance(lpUser0.user1);
    const balanceMint0After = await getTokenBalance(lpUser0.poolAta);

    console.log("After - User0:", bUser0After, "User1:", bUser1After, "LP:", balanceMint0After);

    assert(balanceMint0Before > balanceMint0After, "LP tokens should decrease");
    assert(bUser0Before < bUser0After, "Token0 balance should increase");
    assert(bUser1Before < bUser1After, "Token1 balance should increase");

    const vb0 = await getTokenBalance(pool.vault0);
    const vb1 = await getTokenBalance(pool.vault1);
    console.log("Vault0:", vb0, "Vault1:", vb1);
  });

  it("Performs a swap", async () => {
    console.log("\nPerforming Swap...");
    
    const swapperSigner = web3.Keypair.generate();
    const swapper = swapperSigner.publicKey;

    const mint0Ata = await token.createAssociatedTokenAccount(
      connection,
      pool.payer,
      pool.mint0,
      swapper
    );
    const mint1Ata = await token.createAssociatedTokenAccount(
      connection,
      pool.payer,
      pool.mint1,
      swapper
    );

    const amount = 100;
    await token.mintTo(
      connection,
      pool.payer,
      pool.mint0,
      mint0Ata,
      pool.auth,
      amount * 10 ** n_decimals
    );

    const b0Before = await getTokenBalance(mint0Ata);
    const b1Before = await getTokenBalance(mint1Ata);
    console.log("Before Swap - Token0:", b0Before, "Token1:", b1Before);

    await program.methods
      .swap(new anchor.BN(10 * 10 ** n_decimals), new anchor.BN(0))
      .accountsPartial({
        poolState: pool.poolState,
        poolAuthority: pool.poolAuth,
        vaultSrc: pool.vault0,
        vaultDst: pool.vault1,
        userSrc: mint0Ata,
        userDst: mint1Ata,
        owner: swapper,
        tokenProgram: token.TOKEN_PROGRAM_ID,
      })
      .signers([swapperSigner])
      .rpc();

    const b0After = await getTokenBalance(mint0Ata);
    const b1After = await getTokenBalance(mint1Ata);
    console.log("After Swap - Token0:", b0After, "Token1:", b1After);

    assert(b0After < b0Before, "Token0 balance should decrease");
    assert(b1After > b1Before, "Token1 balance should increase");
    console.log("Swap successful! Received:", b1After, "token1");
  });

  it("Removes liquidity after swap (with fee earnings)", async () => {
    console.log("\n Removing Liquidity After Swap (Check Fee Earnings)...");
    
    const bUser0Before = await getTokenBalance(lpUser1.user0);
    const bUser1Before = await getTokenBalance(lpUser1.user1);
    const balanceMint0Before = await getTokenBalance(lpUser1.poolAta);

    console.log("Before - Token0:", bUser0Before, "Token1:", bUser1Before, "LP:", balanceMint0Before);

    await program.methods
      .removeLiquidity(lpAmount(50))
      .accountsPartial({
        poolState: pool.poolState,
        poolAuthority: pool.poolAuth,
        vault0: pool.vault0,
        vault1: pool.vault1,
        poolMint: pool.poolMint,
        user0: lpUser1.user0,
        user1: lpUser1.user1,
        userPoolAta: lpUser1.poolAta,
        owner: lpUser1.signer.publicKey,
        tokenProgram: token.TOKEN_PROGRAM_ID,
      })
      .signers([lpUser1.signer])
      .rpc();

    const bUser0After = await getTokenBalance(lpUser1.user0);
    const bUser1After = await getTokenBalance(lpUser1.user1);
    const balanceMint0After = await getTokenBalance(lpUser1.poolAta);

    console.log("After - Token0:", bUser0After, "Token1:", bUser1After, "LP:", balanceMint0After);

    assert(balanceMint0Before > balanceMint0After, "LP tokens should decrease");
    assert(bUser0Before < bUser0After, "Token0 balance should increase");
    assert(bUser1Before < bUser1After, "Token1 balance should increase");

    console.log("💵 Fee Earnings Check:");
    console.log("  Token0 Gain:", bUser0After - bUser0Before);
    console.log("  Token1 Gain:", bUser1After - bUser1Before);

    assert(
      bUser0After > bUser0Before + 50,
      "Should earn more token0 due to fees"
    );

    const vb0 = await getTokenBalance(pool.vault0);
    const vb1 = await getTokenBalance(pool.vault1);
    console.log("Final Vault0:", vb0, "Vault1:", vb1);
    
    console.log("\nAll tests passed!");
  });
});


