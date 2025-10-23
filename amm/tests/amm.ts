import * as anchor from "@coral-xyz/anchor";
import { Program, BN } from "@coral-xyz/anchor";
import { Amm } from "../target/types/amm";
import {
  ASSOCIATED_TOKEN_PROGRAM_ID,
  TOKEN_PROGRAM_ID,
  createMint,
  getOrCreateAssociatedTokenAccount,
  getAssociatedTokenAddress,
  mintTo,
  getAccount,
} from "@solana/spl-token";
import { Keypair, LAMPORTS_PER_SOL, PublicKey, SystemProgram } from "@solana/web3.js";
import { assert } from "chai";

describe("AMM", () => {
  const provider = anchor.AnchorProvider.env();
  anchor.setProvider(provider);
  const program = anchor.workspace.Amm as Program<Amm>;
  const connection = provider.connection;

  let admin: Keypair;
  let user1: Keypair;
  let user2: Keypair;
  let user3: Keypair;
  let tokenMintA: PublicKey;
  let tokenMintB: PublicKey;
  let poolStatePDA: PublicKey;
  let poolAuthorityPDA: PublicKey;
  let vaultAPDA: PublicKey;
  let vaultBPDA: PublicKey;
  let poolMintPDA: PublicKey;
  let user1TokenA: PublicKey;
  let user1TokenB: PublicKey;
  let user1LpToken: PublicKey;
  let user2TokenA: PublicKey;
  let user2TokenB: PublicKey;
  let user2LpToken: PublicKey;
  let user3TokenA: PublicKey;
  let user3TokenB: PublicKey;
  let user3LpToken: PublicKey;

  const FEE_NUMERATOR = new BN(3);
  const FEE_DENOMINATOR = new BN(1000);

  async function confirmTx(signature: string) {
    const latestBlockhash = await connection.getLatestBlockhash();
    await connection.confirmTransaction({
      signature,
      ...latestBlockhash,
    });
  }

  it("Setup: Create test accounts and fund them", async () => {
    console.log("\n🚀 Setting up test environment...");

    admin = Keypair.generate();
    user1 = Keypair.generate();
    user2 = Keypair.generate();
    user3 = Keypair.generate();

    console.log("💰 Airdropping SOL...");
    const sig1 = await connection.requestAirdrop(admin.publicKey, 10 * LAMPORTS_PER_SOL);
    await confirmTx(sig1);

    const sig2 = await connection.requestAirdrop(user1.publicKey, 10 * LAMPORTS_PER_SOL);
    await confirmTx(sig2);

    const sig3 = await connection.requestAirdrop(user2.publicKey, 10 * LAMPORTS_PER_SOL);
    await confirmTx(sig3);

    const sig4 = await connection.requestAirdrop(user3.publicKey, 10 * LAMPORTS_PER_SOL);
    await confirmTx(sig4);

    console.log("Airdrops complete");

    console.log("Creating token mints...");
    const mintATmp = await createMint(
      connection,
      admin,
      admin.publicKey,
      null,
      9,
      undefined,
      undefined,
      TOKEN_PROGRAM_ID
    );

    const mintBTmp = await createMint(
      connection,
      admin,
      admin.publicKey,
      null,
      9,
      undefined,
      undefined,
      TOKEN_PROGRAM_ID
    );

    if (mintATmp.toBuffer().compare(mintBTmp.toBuffer()) < 0) {
      tokenMintA = mintATmp;
      tokenMintB = mintBTmp;
    } else {
      tokenMintA = mintBTmp;
      tokenMintB = mintATmp;
    }

    console.log("Token A:", tokenMintA.toBase58());
    console.log("Token B:", tokenMintB.toBase58());
    console.log("Mints correctly ordered:", tokenMintA.toBase58() < tokenMintB.toBase58() ? "YES" : "NO");

    [poolStatePDA] = PublicKey.findProgramAddressSync(
      [Buffer.from("pool_state"), tokenMintA.toBuffer(), tokenMintB.toBuffer()],
      program.programId
    );

    [poolAuthorityPDA] = PublicKey.findProgramAddressSync(
      [Buffer.from("authority"), poolStatePDA.toBuffer()],
      program.programId
    );

    vaultAPDA = await getAssociatedTokenAddress(
      tokenMintA,
      poolAuthorityPDA,
      true,
      TOKEN_PROGRAM_ID,
      ASSOCIATED_TOKEN_PROGRAM_ID
    );

    vaultBPDA = await getAssociatedTokenAddress(
      tokenMintB,
      poolAuthorityPDA,
      true,
      TOKEN_PROGRAM_ID,
      ASSOCIATED_TOKEN_PROGRAM_ID
    );

    [poolMintPDA] = PublicKey.findProgramAddressSync(
      [Buffer.from("pool_mint"), poolStatePDA.toBuffer()],
      program.programId
    );

    console.log("   PDAs derived");
    console.log("   Pool State:", poolStatePDA.toBase58());
    console.log("   Pool Authority:", poolAuthorityPDA.toBase58());
    console.log("   Vault A:", vaultAPDA.toBase58());
    console.log("   Vault B:", vaultBPDA.toBase58());
    console.log("   Pool Mint:", poolMintPDA.toBase58());

    console.log("💼 Creating user token accounts...");

    const user1AccA = await getOrCreateAssociatedTokenAccount(
      connection, admin, tokenMintA, user1.publicKey, false, undefined, undefined, TOKEN_PROGRAM_ID
    );
    user1TokenA = user1AccA.address;

    const user1AccB = await getOrCreateAssociatedTokenAccount(
      connection, admin, tokenMintB, user1.publicKey, false, undefined, undefined, TOKEN_PROGRAM_ID
    );
    user1TokenB = user1AccB.address;

    const user2AccA = await getOrCreateAssociatedTokenAccount(
      connection, admin, tokenMintA, user2.publicKey, false, undefined, undefined, TOKEN_PROGRAM_ID
    );
    user2TokenA = user2AccA.address;

    const user2AccB = await getOrCreateAssociatedTokenAccount(
      connection, admin, tokenMintB, user2.publicKey, false, undefined, undefined, TOKEN_PROGRAM_ID
    );
    user2TokenB = user2AccB.address;

    const user3AccA = await getOrCreateAssociatedTokenAccount(
      connection, admin, tokenMintA, user3.publicKey, false, undefined, undefined, TOKEN_PROGRAM_ID
    );
    user3TokenA = user3AccA.address;

    const user3AccB = await getOrCreateAssociatedTokenAccount(
      connection, admin, tokenMintB, user3.publicKey, false, undefined, undefined, TOKEN_PROGRAM_ID
    );
    user3TokenB = user3AccB.address;

    await mintTo(connection, admin, tokenMintA, user1TokenA, admin, 100_000_000_000, [], undefined, TOKEN_PROGRAM_ID);
    await mintTo(connection, admin, tokenMintB, user1TokenB, admin, 100_000_000_000, [], undefined, TOKEN_PROGRAM_ID);
    await mintTo(connection, admin, tokenMintA, user2TokenA, admin, 100_000_000_000, [], undefined, TOKEN_PROGRAM_ID);
    await mintTo(connection, admin, tokenMintB, user2TokenB, admin, 100_000_000_000, [], undefined, TOKEN_PROGRAM_ID);
    await mintTo(connection, admin, tokenMintA, user3TokenA, admin, 100_000_000_000, [], undefined, TOKEN_PROGRAM_ID);
    await mintTo(connection, admin, tokenMintB, user3TokenB, admin, 100_000_000_000, [], undefined, TOKEN_PROGRAM_ID);

    console.log("Users funded with 100 tokens each");
    console.log("Setup complete!\n");
  });

  it("Should reject pool initialization with high fee", async () => {
    console.log("\n Testing high fee rejection...");

    const highFee = new BN(11);

    try {
      await program.methods
        .initializePool(highFee, FEE_DENOMINATOR)
        .accounts({
          payer: admin.publicKey,
          tokenMintA,
          tokenMintB,
          poolState: poolStatePDA,
          poolAuthority: poolAuthorityPDA,
          poolMint: poolMintPDA,
          vaultA: vaultAPDA,
          vaultB: vaultBPDA,
          systemProgram: SystemProgram.programId,
          tokenProgram: TOKEN_PROGRAM_ID,
          associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
        })
        .signers([admin])
        .rpc();

      assert.fail("Should have thrown error");
    } catch (err: any) {
      const errMsg = err.toString();
      assert.isTrue(
        errMsg.includes("FeeTooHigh") || errMsg.includes("6001"),
        "Should fail with FeeTooHigh error"
      );
      console.log(" Correctly rejected high fee");
    }
  });

  it("Should reject pool initialization with zero denominator", async () => {
    console.log("\n Testing zero fee denominator...");

    try {
      await program.methods
        .initializePool(FEE_NUMERATOR, new BN(0))
        .accounts({
          payer: admin.publicKey,
          tokenMintA,
          tokenMintB,
          poolState: poolStatePDA,
          poolAuthority: poolAuthorityPDA,
          poolMint: poolMintPDA,
          vaultA: vaultAPDA,
          vaultB: vaultBPDA,
          systemProgram: SystemProgram.programId,
          tokenProgram: TOKEN_PROGRAM_ID,
          associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
        })
        .signers([admin])
        .rpc();

      assert.fail("Should have thrown error");
    } catch (err: any) {
      const errMsg = err.toString();
      assert.isTrue(
        errMsg.includes("InvalidFeeParameters") || errMsg.includes("6000"),
        "Should fail with InvalidFeeParameters error"
      );
      console.log(" Correctly rejected zero denominator");
    }
  });

  it("Should reject pool with unordered mints", async () => {
    console.log("\n Testing mint ordering validation...");

    const [wrongPoolState] = PublicKey.findProgramAddressSync(
      [Buffer.from("pool_state"), tokenMintB.toBuffer(), tokenMintA.toBuffer()],
      program.programId
    );

    const [wrongAuthority] = PublicKey.findProgramAddressSync(
      [Buffer.from("authority"), wrongPoolState.toBuffer()],
      program.programId
    );

    const [wrongPoolMint] = PublicKey.findProgramAddressSync(
      [Buffer.from("pool_mint"), wrongPoolState.toBuffer()],
      program.programId
    );

    const wrongVaultA = await getAssociatedTokenAddress(
      tokenMintB,
      wrongAuthority,
      true,
      TOKEN_PROGRAM_ID,
      ASSOCIATED_TOKEN_PROGRAM_ID
    );

    const wrongVaultB = await getAssociatedTokenAddress(
      tokenMintA,
      wrongAuthority,
      true,
      TOKEN_PROGRAM_ID,
      ASSOCIATED_TOKEN_PROGRAM_ID
    );

    try {
      await program.methods
        .initializePool(FEE_NUMERATOR, FEE_DENOMINATOR)
        .accounts({
          payer: admin.publicKey,
          tokenMintA: tokenMintB,
          tokenMintB: tokenMintA,
          poolState: wrongPoolState,
          poolAuthority: wrongAuthority,
          poolMint: wrongPoolMint,
          vaultA: wrongVaultA,
          vaultB: wrongVaultB,
          systemProgram: SystemProgram.programId,
          tokenProgram: TOKEN_PROGRAM_ID,
          associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
        })
        .signers([admin])
        .rpc();

      assert.fail("Should have thrown error");
    } catch (err: any) {
      const errMsg = err.toString();
      assert.isTrue(
        errMsg.includes("MintsNotOrdered") || errMsg.includes("6003") || errMsg.includes("ConstraintSeeds"),
        "Should fail with MintsNotOrdered or ConstraintSeeds error"
      );
      console.log(" Correctly rejected unordered mints");
    }
  });

  it("Should initialize pool successfully", async () => {
    console.log("\n Initializing pool...");

    const tx = await program.methods
      .initializePool(FEE_NUMERATOR, FEE_DENOMINATOR)
      .accounts({
        payer: admin.publicKey,
        tokenMintA,
        tokenMintB,
        poolState: poolStatePDA,
        poolAuthority: poolAuthorityPDA,
        poolMint: poolMintPDA,
        vaultA: vaultAPDA,
        vaultB: vaultBPDA,
        systemProgram: SystemProgram.programId,
        tokenProgram: TOKEN_PROGRAM_ID,
        associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
      })
      .signers([admin])
      .rpc();

    await confirmTx(tx);
    console.log(" Tx:", tx);

    const poolState = await program.account.poolState.fetch(poolStatePDA);

    assert.equal(poolState.feeNumerator.toNumber(), 3);
    assert.equal(poolState.feeDenominator.toNumber(), 1000);
    assert.equal(poolState.reserveA.toNumber(), 0);
    assert.equal(poolState.reserveB.toNumber(), 0);
    assert.equal(poolState.totalSupply.toNumber(), 0);
    assert.equal(poolState.tokenMintA.toBase58(), tokenMintA.toBase58());
    assert.equal(poolState.tokenMintB.toBase58(), tokenMintB.toBase58());

    console.log(" Pool initialized with 0.3% fee");
  });

  it("Should reject duplicate pool initialization", async () => {
    console.log("\n Testing duplicate pool initialization...");

    try {
      await program.methods
        .initializePool(FEE_NUMERATOR, FEE_DENOMINATOR)
        .accounts({
          payer: admin.publicKey,
          tokenMintA,
          tokenMintB,
          poolState: poolStatePDA,
          poolAuthority: poolAuthorityPDA,
          poolMint: poolMintPDA,
          vaultA: vaultAPDA,
          vaultB: vaultBPDA,
          systemProgram: SystemProgram.programId,
          tokenProgram: TOKEN_PROGRAM_ID,
          associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
        })
        .signers([admin])
        .rpc();

      assert.fail("Should have thrown error");
    } catch (err: any) {
      const errMsg = err.toString();
      assert.isTrue(
        errMsg.includes("already in use") || errMsg.includes("0x0"),
        "Should fail because pool already exists"
      );
      console.log(" Correctly rejected duplicate initialization");
    }
  });

  it("Should reject adding liquidity with zero amounts", async () => {
    console.log("\n Testing zero amount rejection...");

    const lpAcc = await getOrCreateAssociatedTokenAccount(
      connection, user1, poolMintPDA, user1.publicKey, false, undefined, undefined, TOKEN_PROGRAM_ID
    );
    user1LpToken = lpAcc.address;

    try {
      await program.methods
        .addLiquidity(new BN(0), new BN(1000), new BN(0), new BN(0), new BN(1))
        .accounts({
          user: user1.publicKey,
          poolState: poolStatePDA,
          poolAuthority: poolAuthorityPDA,
          tokenMintA,
          tokenMintB,
          vaultA: vaultAPDA,
          vaultB: vaultBPDA,
          poolMint: poolMintPDA,
          userTokenA: user1TokenA,
          userTokenB: user1TokenB,
          userLpToken: user1LpToken,
          tokenProgram: TOKEN_PROGRAM_ID,
          associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
          systemProgram: SystemProgram.programId,
        })
        .signers([user1])
        .rpc();

      assert.fail("Should have thrown error");
    } catch (err: any) {
      const errMsg = err.toString();
      assert.isTrue(
        errMsg.includes("InvalidAmount") || errMsg.includes("6004"),
        "Should fail with InvalidAmount error"
      );
      console.log(" Correctly rejected zero amount");
    }
  });

  it("Should add initial liquidity", async () => {
    console.log("\n Adding initial liquidity...");

    const amountA = new BN(1_000_000_000);
    const amountB = new BN(2_000_000_000);

    const tx = await program.methods
      .addLiquidity(amountA, amountB, new BN(0), new BN(0), new BN(1))
      .accounts({
        user: user1.publicKey,
        poolState: poolStatePDA,
        poolAuthority: poolAuthorityPDA,
        tokenMintA,
        tokenMintB,
        vaultA: vaultAPDA,
        vaultB: vaultBPDA,
        poolMint: poolMintPDA,
        userTokenA: user1TokenA,
        userTokenB: user1TokenB,
        userLpToken: user1LpToken,
        tokenProgram: TOKEN_PROGRAM_ID,
        associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
        systemProgram: SystemProgram.programId,
      })
      .signers([user1])
      .rpc();

    await confirmTx(tx);

    const poolState = await program.account.poolState.fetch(poolStatePDA);
    const lpBalance = await getAccount(connection, user1LpToken);
    const vaultABalance = await getAccount(connection, vaultAPDA);
    const vaultBBalance = await getAccount(connection, vaultBPDA);

    assert.equal(poolState.reserveA.toNumber(), amountA.toNumber());
    assert.equal(poolState.reserveB.toNumber(), amountB.toNumber());
    assert.isTrue(Number(lpBalance.amount) > 0);
    assert.equal(Number(vaultABalance.amount), amountA.toNumber());
    assert.equal(Number(vaultBBalance.amount), amountB.toNumber());

    console.log(" Added: 1 Token A + 2 Token B");
    console.log(" LP tokens received:", Number(lpBalance.amount) / 1e9);
  });

  it("Should add more liquidity with correct ratio", async () => {
    console.log("\n Adding more liquidity...");

    const poolBefore = await program.account.poolState.fetch(poolStatePDA);
    const lpBefore = await getAccount(connection, user1LpToken);

    const amountA = new BN(500_000_000);

    const tx = await program.methods
      .addLiquidity(amountA, new BN(1_000_000_000), new BN(0), new BN(0), new BN(1))
      .accounts({
        user: user1.publicKey,
        poolState: poolStatePDA,
        poolAuthority: poolAuthorityPDA,
        tokenMintA,
        tokenMintB,
        vaultA: vaultAPDA,
        vaultB: vaultBPDA,
        poolMint: poolMintPDA,
        userTokenA: user1TokenA,
        userTokenB: user1TokenB,
        userLpToken: user1LpToken,
        tokenProgram: TOKEN_PROGRAM_ID,
        associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
        systemProgram: SystemProgram.programId,
      })
      .signers([user1])
      .rpc();

    await confirmTx(tx);

    const poolAfter = await program.account.poolState.fetch(poolStatePDA);
    const lpAfter = await getAccount(connection, user1LpToken);

    assert.isTrue(poolAfter.reserveA.toNumber() > poolBefore.reserveA.toNumber());
    assert.isTrue(poolAfter.reserveB.toNumber() > poolBefore.reserveB.toNumber());
    assert.isTrue(lpAfter.amount > lpBefore.amount);

    const ratio = poolAfter.reserveB.toNumber() / poolAfter.reserveA.toNumber();
    assert.approximately(ratio, 2.0, 0.01, "Ratio should remain ~2:1");

    console.log(" Liquidity increased");
    console.log(" Reserves: A =", poolAfter.reserveA.toNumber() / 1e9, "B =", poolAfter.reserveB.toNumber() / 1e9);
  });

  it("Should reject liquidity with insufficient minimum", async () => {
    console.log("\n Testing minimum amount protection...");

    try {
      await program.methods
        .addLiquidity(
          new BN(100_000_000),
          new BN(200_000_000),
          new BN(200_000_000),
          new BN(0),
          new BN(1)
        )
        .accounts({
          user: user1.publicKey,
          poolState: poolStatePDA,
          poolAuthority: poolAuthorityPDA,
          tokenMintA,
          tokenMintB,
          vaultA: vaultAPDA,
          vaultB: vaultBPDA,
          poolMint: poolMintPDA,
          userTokenA: user1TokenA,
          userTokenB: user1TokenB,
          userLpToken: user1LpToken,
          tokenProgram: TOKEN_PROGRAM_ID,
          associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
          systemProgram: SystemProgram.programId,
        })
        .signers([user1])
        .rpc();

      assert.fail("Should have thrown error");
    } catch (err: any) {
      const errMsg = err.toString();
      assert.isTrue(
        errMsg.includes("InsufficientAmountA") || errMsg.includes("6006"),
        "Should fail with InsufficientAmountA error"
      );
      console.log(" Correctly rejected insufficient amount");
    }
  });

  it("Should perform small swap A for B", async () => {
    console.log("\n Swapping small amount: Token A → Token B...");

    const balanceBefore = await getAccount(connection, user2TokenB);
    const amountIn = new BN(10_000_000);
    const tx = await program.methods
      .swap(amountIn, new BN(1), true)
      .accounts({
        user: user2.publicKey,
        poolState: poolStatePDA,
        poolAuthority: poolAuthorityPDA,
        tokenMintA,
        tokenMintB,
        vaultA: vaultAPDA,
        vaultB: vaultBPDA,
        userTokenA: user2TokenA,
        userTokenB: user2TokenB,
        tokenProgram: TOKEN_PROGRAM_ID,
      })
      .signers([user2])
      .rpc();

    await confirmTx(tx);

    const balanceAfter = await getAccount(connection, user2TokenB);
    const received = Number(balanceAfter.amount) - Number(balanceBefore.amount);

    assert.isTrue(received > 0);
    console.log(" Small swap: 0.01 Token A → ", received / 1e9, "Token B");
  });

  it("Should perform medium swap B for A", async () => {
    console.log("\n Swapping medium amount: Token B → Token A...");

    const poolBefore = await program.account.poolState.fetch(poolStatePDA);
    const balanceBefore = await getAccount(connection, user2TokenA);
    const amountIn = new BN(200_000_000);

    const tx = await program.methods
      .swap(amountIn, new BN(1), false)
      .accounts({
        user: user2.publicKey,
        poolState: poolStatePDA,
        poolAuthority: poolAuthorityPDA,
        tokenMintA,
        tokenMintB,
        vaultA: vaultAPDA,
        vaultB: vaultBPDA,
        userTokenA: user2TokenA,
        userTokenB: user2TokenB,
        tokenProgram: TOKEN_PROGRAM_ID,
      })
      .signers([user2])
      .rpc();

    await confirmTx(tx);

    const poolAfter = await program.account.poolState.fetch(poolStatePDA);
    const balanceAfter = await getAccount(connection, user2TokenA);
    const received = Number(balanceAfter.amount) - Number(balanceBefore.amount);

    assert.isTrue(poolAfter.reserveB.toNumber() > poolBefore.reserveB.toNumber());
    assert.isTrue(poolAfter.reserveA.toNumber() < poolBefore.reserveA.toNumber());
    assert.isTrue(received > 0);

    console.log(" Medium swap: 0.2 Token B → ", received / 1e9, "Token A");
  });

  it("Should reject excessively large swap due to price impact", async () => {
    console.log("\n Testing price impact protection...");

    const poolState = await program.account.poolState.fetch(poolStatePDA);
    const hugeAmount = new BN(Math.floor(poolState.reserveA.toNumber() * 0.5));

    try {
      await program.methods
        .swap(hugeAmount, new BN(1), true)
        .accounts({
          user: user2.publicKey,
          poolState: poolStatePDA,
          poolAuthority: poolAuthorityPDA,
          tokenMintA,
          tokenMintB,
          vaultA: vaultAPDA,
          vaultB: vaultBPDA,
          userTokenA: user2TokenA,
          userTokenB: user2TokenB,
          tokenProgram: TOKEN_PROGRAM_ID,
        })
        .signers([user2])
        .rpc();

      assert.fail("Should have thrown error");
    } catch (err: any) {
      const errMsg = err.toString();
      assert.isTrue(
        errMsg.includes("PriceImpactTooHigh") || errMsg.includes("6015"),
        "Should fail with PriceImpactTooHigh error"
      );
      console.log(" Correctly rejected excessive price impact");
    }
  });

  it("Should reject swap with excessive slippage", async () => {
    console.log("\n Testing slippage protection...");

    try {
      await program.methods
        .swap(new BN(100_000_000), new BN(999_999_999_999), true)
        .accounts({
          user: user2.publicKey,
          poolState: poolStatePDA,
          poolAuthority: poolAuthorityPDA,
          tokenMintA,
          tokenMintB,
          vaultA: vaultAPDA,
          vaultB: vaultBPDA,
          userTokenA: user2TokenA,
          userTokenB: user2TokenB,
          tokenProgram: TOKEN_PROGRAM_ID,
        })
        .signers([user2])
        .rpc();

      assert.fail("Should have thrown error");
    } catch (err: any) {
      const errMsg = err.toString();
      assert.isTrue(
        errMsg.includes("SlippageExceeded") || errMsg.includes("6005"),
        "Should fail with SlippageExceeded error"
      );
      console.log(" Correctly rejected excessive slippage");
    }
  });

  it("Should reject swap with zero amount", async () => {
    console.log("\n Testing zero swap amount...");

    try {
      await program.methods
        .swap(new BN(0), new BN(1), true)
        .accounts({
          user: user2.publicKey,
          poolState: poolStatePDA,
          poolAuthority: poolAuthorityPDA,
          tokenMintA,
          tokenMintB,
          vaultA: vaultAPDA,
          vaultB: vaultBPDA,
          userTokenA: user2TokenA,
          userTokenB: user2TokenB,
          tokenProgram: TOKEN_PROGRAM_ID,
        })
        .signers([user2])
        .rpc();

      assert.fail("Should have thrown error");
    } catch (err: any) {
      const errMsg = err.toString();
      assert.isTrue(
        errMsg.includes("InvalidAmount") || errMsg.includes("6004"),
        "Should fail with InvalidAmount error"
      );
      console.log(" Correctly rejected zero swap");
    }
  });

  it("Should perform multiple consecutive swaps", async () => {
    console.log("\n Testing multiple consecutive swaps...");

    const poolBefore = await program.account.poolState.fetch(poolStatePDA);
    const kBefore = poolBefore.reserveA.toNumber() * poolBefore.reserveB.toNumber();

    for (let i = 0; i < 5; i++) {
      await program.methods
        .swap(new BN(20_000_000), new BN(1), i % 2 === 0)
        .accounts({
          user: user2.publicKey,
          poolState: poolStatePDA,
          poolAuthority: poolAuthorityPDA,
          tokenMintA,
          tokenMintB,
          vaultA: vaultAPDA,
          vaultB: vaultBPDA,
          userTokenA: user2TokenA,
          userTokenB: user2TokenB,
          tokenProgram: TOKEN_PROGRAM_ID,
        })
        .signers([user2])
        .rpc();
    }

    const poolAfter = await program.account.poolState.fetch(poolStatePDA);
    const kAfter = poolAfter.reserveA.toNumber() * poolAfter.reserveB.toNumber();

    assert.isTrue(kAfter >= kBefore);
    console.log(" Completed 5 swaps");
    console.log(" K growth:", ((kAfter - kBefore) / kBefore * 100).toFixed(3), "%");
  });

  it("Should handle second liquidity provider", async () => {
    console.log("\n Testing second LP...");

    const lpAcc = await getOrCreateAssociatedTokenAccount(
      connection, user2, poolMintPDA, user2.publicKey, false, undefined, undefined, TOKEN_PROGRAM_ID
    );
    user2LpToken = lpAcc.address;

    const poolBefore = await program.account.poolState.fetch(poolStatePDA);
    const lpSupplyBefore = poolBefore.totalSupply.toNumber();

    const amountA = new BN(250_000_000);

    const tx = await program.methods
      .addLiquidity(amountA, new BN(500_000_000), new BN(0), new BN(0), new BN(1))
      .accounts({
        user: user2.publicKey,
        poolState: poolStatePDA,
        poolAuthority: poolAuthorityPDA,
        tokenMintA,
        tokenMintB,
        vaultA: vaultAPDA,
        vaultB: vaultBPDA,
        poolMint: poolMintPDA,
        userTokenA: user2TokenA,
        userTokenB: user2TokenB,
        userLpToken: user2LpToken,
        tokenProgram: TOKEN_PROGRAM_ID,
        associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
        systemProgram: SystemProgram.programId,
      })
      .signers([user2])
      .rpc();

    await confirmTx(tx);

    const poolAfter = await program.account.poolState.fetch(poolStatePDA);
    const user2LpBalance = await getAccount(connection, user2LpToken);

    assert.isTrue(poolAfter.totalSupply.toNumber() > lpSupplyBefore);
    assert.isTrue(Number(user2LpBalance.amount) > 0);

    console.log(" Second LP added liquidity");
    console.log(" User2 LP tokens:", Number(user2LpBalance.amount) / 1e9);
  });

  it("Should handle third liquidity provider", async () => {
    console.log("\n Testing third LP...");

    const lpAcc = await getOrCreateAssociatedTokenAccount(
      connection, user3, poolMintPDA, user3.publicKey, false, undefined, undefined, TOKEN_PROGRAM_ID
    );
    user3LpToken = lpAcc.address;

    const poolBefore = await program.account.poolState.fetch(poolStatePDA);

    const amountA = new BN(100_000_000);

    const tx = await program.methods
      .addLiquidity(amountA, new BN(200_000_000), new BN(0), new BN(0), new BN(1))
      .accounts({
        user: user3.publicKey,
        poolState: poolStatePDA,
        poolAuthority: poolAuthorityPDA,
        tokenMintA,
        tokenMintB,
        vaultA: vaultAPDA,
        vaultB: vaultBPDA,
        poolMint: poolMintPDA,
        userTokenA: user3TokenA,
        userTokenB: user3TokenB,
        userLpToken: user3LpToken,
        tokenProgram: TOKEN_PROGRAM_ID,
        associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
        systemProgram: SystemProgram.programId,
      })
      .signers([user3])
      .rpc();

    await confirmTx(tx);

    const poolAfter = await program.account.poolState.fetch(poolStatePDA);
    const user3LpBalance = await getAccount(connection, user3LpToken);

    assert.isTrue(poolAfter.totalSupply.toNumber() > poolBefore.totalSupply.toNumber());
    assert.isTrue(Number(user3LpBalance.amount) > 0);

    console.log(" Third LP added liquidity");
    console.log(" User3 LP tokens:", Number(user3LpBalance.amount) / 1e9);
  });

  it("Should remove partial liquidity", async () => {
    console.log("\n Removing partial liquidity (user1)...");

    const lpBefore = await getAccount(connection, user1LpToken);
    const poolBefore = await program.account.poolState.fetch(poolStatePDA);

    const lpToBurn = new BN(Number(lpBefore.amount) / 4);
    const tx = await program.methods
      .removeLiquidity(lpToBurn, new BN(1), new BN(1))
      .accounts({
        user: user1.publicKey,
        poolState: poolStatePDA,
        poolAuthority: poolAuthorityPDA,
        tokenMintA,
        tokenMintB,
        vaultA: vaultAPDA,
        vaultB: vaultBPDA,
        poolMint: poolMintPDA,
        userTokenA: user1TokenA,
        userTokenB: user1TokenB,
        userLpToken: user1LpToken,
        tokenProgram: TOKEN_PROGRAM_ID,
        associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
        systemProgram: SystemProgram.programId,
      })
      .signers([user1])
      .rpc();

    await confirmTx(tx);

    const lpAfter = await getAccount(connection, user1LpToken);
    const poolAfter = await program.account.poolState.fetch(poolStatePDA);

    assert.isTrue(Number(lpAfter.amount) < Number(lpBefore.amount));
    assert.isTrue(poolAfter.totalSupply.toNumber() < poolBefore.totalSupply.toNumber());

    console.log(" Removed 25% liquidity");
    console.log(" LP tokens burned:", Number(lpToBurn) / 1e9);
  });

  it("Should remove all liquidity from user2", async () => {
    console.log("\n Removing all liquidity (user2)...");

    const lpBalance = await getAccount(connection, user2LpToken);
    const lpToBurn = new BN(Number(lpBalance.amount));

    const tx = await program.methods
      .removeLiquidity(lpToBurn, new BN(1), new BN(1))
      .accounts({
        user: user2.publicKey,
        poolState: poolStatePDA,
        poolAuthority: poolAuthorityPDA,
        tokenMintA,
        tokenMintB,
        vaultA: vaultAPDA,
        vaultB: vaultBPDA,
        poolMint: poolMintPDA,
        userTokenA: user2TokenA,
        userTokenB: user2TokenB,
        userLpToken: user2LpToken,
        tokenProgram: TOKEN_PROGRAM_ID,
        associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
        systemProgram: SystemProgram.programId,
      })
      .signers([user2])
      .rpc();

    await confirmTx(tx);

    const lpAfter = await getAccount(connection, user2LpToken);

    assert.equal(Number(lpAfter.amount), 0);
    console.log(" User2 removed all liquidity");
  });

  it("Should reject removing more liquidity than owned", async () => {
    console.log("\n Testing insufficient LP token balance...");

    const lpBalance = await getAccount(connection, user1LpToken);
    const excessiveAmount = new BN(Number(lpBalance.amount) + 1_000_000_000);

    try {
      await program.methods
        .removeLiquidity(excessiveAmount, new BN(1), new BN(1))
        .accounts({
          user: user1.publicKey,
          poolState: poolStatePDA,
          poolAuthority: poolAuthorityPDA,
          tokenMintA,
          tokenMintB,
          vaultA: vaultAPDA,
          vaultB: vaultBPDA,
          poolMint: poolMintPDA,
          userTokenA: user1TokenA,
          userTokenB: user1TokenB,
          userLpToken: user1LpToken,
          tokenProgram: TOKEN_PROGRAM_ID,
          associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
          systemProgram: SystemProgram.programId,
        })
        .signers([user1])
        .rpc();

      assert.fail("Should have thrown error");
    } catch (err: any) {
      const errMsg = err.toString();
      assert.isTrue(
        errMsg.includes("InsufficientBalance") || errMsg.includes("insufficient"),
        "Should fail with insufficient balance error"
      );
      console.log("Correctly rejected excessive withdrawal");
    }
  });

  it("Should reject removal with high minimum amounts", async () => {
    console.log("\n Testing minimum withdrawal protection...");

    const lpBalance = await getAccount(connection, user3LpToken);
    const lpToBurn = new BN(Number(lpBalance.amount) / 2);

    try {
      await program.methods
        .removeLiquidity(
          lpToBurn,
          new BN(999_999_999_999),
          new BN(1)
        )
        .accounts({
          user: user3.publicKey,
          poolState: poolStatePDA,
          poolAuthority: poolAuthorityPDA,
          tokenMintA,
          tokenMintB,
          vaultA: vaultAPDA,
          vaultB: vaultBPDA,
          poolMint: poolMintPDA,
          userTokenA: user3TokenA,
          userTokenB: user3TokenB,
          userLpToken: user3LpToken,
          tokenProgram: TOKEN_PROGRAM_ID,
          associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
          systemProgram: SystemProgram.programId,
        })
        .signers([user3])
        .rpc();

      assert.fail("Should have thrown error");
    } catch (err: any) {
      const errMsg = err.toString();
      assert.isTrue(
        errMsg.includes("InsufficientAmountA") || errMsg.includes("6006"),
        "Should fail with InsufficientAmountA error"
      );
      console.log(" Correctly rejected high minimum");
    }
  });

  it("Should handle swap after liquidity changes", async () => {
    console.log("\n Testing swap after liquidity removal...");

    const poolBefore = await program.account.poolState.fetch(poolStatePDA);
    const balanceBefore = await getAccount(connection, user2TokenB);

    const tx = await program.methods
      .swap(new BN(50_000_000), new BN(1), true)
      .accounts({
        user: user2.publicKey,
        poolState: poolStatePDA,
        poolAuthority: poolAuthorityPDA,
        tokenMintA,
        tokenMintB,
        vaultA: vaultAPDA,
        vaultB: vaultBPDA,
        userTokenA: user2TokenA,
        userTokenB: user2TokenB,
        tokenProgram: TOKEN_PROGRAM_ID,
      })
      .signers([user2])
      .rpc();

    await confirmTx(tx);

    const poolAfter = await program.account.poolState.fetch(poolStatePDA);
    const balanceAfter = await getAccount(connection, user2TokenB);
    const received = Number(balanceAfter.amount) - Number(balanceBefore.amount);

    assert.isTrue(received > 0);
    assert.isTrue(poolAfter.reserveA.toNumber() > poolBefore.reserveA.toNumber());

    console.log(" Swap successful after liquidity changes");
    console.log(" Received:", received / 1e9, "Token B");
  });

  it("Should calculate correct price after all operations", async () => {
    console.log("\n Testing price consistency...");

    const poolState = await program.account.poolState.fetch(poolStatePDA);
    const price = poolState.reserveB.toNumber() / poolState.reserveA.toNumber();

    assert.isTrue(price > 0);
    assert.isTrue(price < 10);

    console.log(" Price calculated");
    console.log(" Current price (B/A):", price.toFixed(4));
  });

  it("Summary: Display final pool state", async () => {
    console.log("\n ============ FINAL POOL STATE ============");

    const poolState = await program.account.poolState.fetch(poolStatePDA);
    const vaultA = await getAccount(connection, vaultAPDA);
    const vaultB = await getAccount(connection, vaultBPDA);
    const user1LP = await getAccount(connection, user1LpToken);
    const user2LP = await getAccount(connection, user2LpToken);
    const user3LP = await getAccount(connection, user3LpToken);

    const totalLpTokens = Number(user1LP.amount) + Number(user2LP.amount) + Number(user3LP.amount);

    console.log("\n Pool Information:");
    console.log("   Reserve A:", poolState.reserveA.toNumber() / 1e9, "tokens");
    console.log("   Reserve B:", poolState.reserveB.toNumber() / 1e9, "tokens");
    console.log("   Total LP Supply:", poolState.totalSupply.toNumber() / 1e9);
    console.log("   Fee: 0.3%");
    console.log("   Price (B/A):", (poolState.reserveB.toNumber() / poolState.reserveA.toNumber()).toFixed(4));

    console.log("\n Liquidity Providers:");
    console.log("   User1 LP tokens:", Number(user1LP.amount) / 1e9);
    console.log("   User2 LP tokens:", Number(user2LP.amount) / 1e9);
    console.log("   User3 LP tokens:", Number(user3LP.amount) / 1e9);
    console.log("   User1 share:", ((Number(user1LP.amount) / poolState.totalSupply.toNumber()) * 100).toFixed(2), "%");
    console.log("   User2 share:", ((Number(user2LP.amount) / poolState.totalSupply.toNumber()) * 100).toFixed(2), "%");
    console.log("   User3 share:", ((Number(user3LP.amount) / poolState.totalSupply.toNumber()) * 100).toFixed(2), "%");

    console.log("\n Vault Balances:");
    console.log("   Vault A:", Number(vaultA.amount) / 1e9, "tokens");
    console.log("   Vault B:", Number(vaultB.amount) / 1e9, "tokens");

    console.log("\n All", "25", "tests completed successfully! 🎉\n");

    assert.equal(poolState.reserveA.toNumber(), Number(vaultA.amount));
    assert.equal(poolState.reserveB.toNumber(), Number(vaultB.amount));
    assert.isTrue(poolState.totalSupply.toNumber() > 0);
    assert.approximately(
      poolState.totalSupply.toNumber(),
      totalLpTokens,
      1000,
      "Total supply should match sum of LP tokens"
    );
  });
});