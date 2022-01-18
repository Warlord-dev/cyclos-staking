const assert = require("assert");
const anchor = require('@project-serum/anchor');
const { TOKEN_PROGRAM_ID, Token } = require("@solana/spl-token");
const { sleep } = require('@project-serum/common');
const { PublicKey } = require("@solana/web3.js");

describe('reward-pool', () => {
  const provider = anchor.Provider.env();
  anchor.setProvider(provider);

  const rewardPool = anchor.workspace.RewardPool;
  let cyclosMint;
  let stakingVault;
  let rewardVault;
  let pool;
  let poolSigner;
  let nonce;
  let ownerTokenAccount;
  let lockPeriod = new anchor.BN(86400 * 60);
  const rewardDuration = new anchor.BN(86400 * 7);
  const wallet = provider.wallet;

  beforeEach(async () => {
    cyclosMint = new Token(provider.connection, new PublicKey("9Nt3mt734gNW9Ufi8TFLWKpW1Tz33TRvuHoKqqvsFdHJ"), TOKEN_PROGRAM_ID, wallet.payer)
    // cyclosMint = await Token.createMint(provider.connection, wallet.payer, wallet.publicKey, null, 6, TOKEN_PROGRAM_ID);
    console.log("CyclosMint: ", cyclosMint.publicKey.toString())
    // ownerTokenAccount = await cyclosMint.createAccount(wallet.publicKey)
    // console.log("OwnerTokenAcccount: ", ownerTokenAccount.toString())
    // await cyclosMint.mintTo(ownerTokenAccount, wallet.payer, [], 100000000000000)

    pool = anchor.web3.Keypair.generate()
    console.log("Pool: ", pool.publicKey.toString())
    let [_poolSigner, _nonce] = await anchor.web3.PublicKey.findProgramAddress(
      [pool.publicKey.toBuffer()],
      rewardPool.programId
    )
    poolSigner = _poolSigner;
    nonce = _nonce;
    stakingVault = await cyclosMint.createAccount(poolSigner)
    console.log("StakingVault: ", stakingVault.toString())

    rewardVault = await cyclosMint.createAccount(poolSigner)
    console.log("rewardVault: ", rewardVault.toString())

    console.log("Pool Signer: ", poolSigner.toString());
    console.log("Pool Nonce: ", nonce.toString());

    await rewardPool.rpc.initializePool(
      nonce,
      rewardDuration,
      lockPeriod,
      {
        accounts: {
          authority: wallet.publicKey,
          stakingMint: cyclosMint.publicKey,
          stakingVault,
          rewardMint: cyclosMint.publicKey,
          rewardVault,
          poolSigner: poolSigner,
          pool: pool.publicKey,
          tokenProgram: TOKEN_PROGRAM_ID
        },
        signers: [pool],
        instructions: [
          await rewardPool.account.pool.createInstruction(pool),
        ]
      }
    )
  })

  describe('initialize pool', () => {
    it('check initialized pool values', async () => {
      const poolAccount = await rewardPool.account.pool.fetch(pool.publicKey);
      assert.equal(poolAccount.authority.toString(), wallet.publicKey.toString());
      assert.equal(poolAccount.nonce, nonce);
      assert.equal(poolAccount.paused, false);
      assert.equal(poolAccount.stakingMint.toString(), cyclosMint.publicKey);
      assert.equal(poolAccount.stakingVault.toString(), stakingVault);
      assert.equal(poolAccount.rewardMint.toString(), cyclosMint.publicKey);
      assert.equal(poolAccount.rewardVault.toString(), rewardVault);
      assert.equal(poolAccount.rewardDuration.toString(), rewardDuration.toString());
      assert.equal(poolAccount.rewardDurationEnd.toString(), '0');
      assert.equal(poolAccount.lockPeriod.toString(), lockPeriod.toString());
      assert.equal(poolAccount.lastUpdateTime.toString(), '0');
      assert.equal(poolAccount.rewardRate.toString(), '0');
      assert.equal(poolAccount.rewardPerTokenStored.toString(), '0');
      assert.equal(poolAccount.userStakeCount.toString(), '0');
      assert.equal(poolAccount.funders.length, 5);
    });
  })

  describe.only('fund', () => {
    it('fund', async () => {
      const fundAmount = new anchor.BN("10000000000");

      await rewardPool.rpc.fund(
        fundAmount,
        {
          accounts: {
            pool: pool.publicKey,
            stakingVault,
            rewardVault,
            funder: wallet.publicKey,
            from: new PublicKey("Dt2412sS9U177Mz82dhVTcRE8hwDFJXNmrdMGv222gvr"),// ownerTokenAccount,
            poolSigner: poolSigner,
            tokenProgram: TOKEN_PROGRAM_ID
          },
        }
      )
    });
  })

  // describe('stake', () => {
  //   let userSigner;
  //   let userNonce;

  //   beforeEach(async () => {
  //     let [_userSigner, _userNonce] = await anchor.web3.PublicKey.findProgramAddress(
  //       [wallet.publicKey.toBuffer(), pool.publicKey.toBuffer()],
  //       rewardPool.programId
  //     )
  //     userSigner = _userSigner;
  //     userNonce = _userNonce;

  //     await rewardPool.rpc.createUser(
  //       userNonce,
  //       {
  //         accounts: {
  //           pool: pool.publicKey,
  //           user: userSigner,
  //           owner: wallet.publicKey,
  //           systemProgram: anchor.web3.SystemProgram.programId
  //         },
  //       }
  //     )
  //   })

  //   it('fails if amount is zero', async () => {
  //     try {
  //       await rewardPool.rpc.stake(
  //         new anchor.BN(0),
  //         {
  //           accounts: {
  //             pool: pool.publicKey,
  //             stakingVault,
  //             user: userSigner,
  //             owner: wallet.publicKey,
  //             stakeFromAccount: ownerTokenAccount,
  //             poolSigner: poolSigner,
  //             tokenProgram: TOKEN_PROGRAM_ID
  //           },
  //         }
  //       );
  //       assert.fail('Should not reach this');
  //     } catch (err) {
  //       assert.equal(err.msg, 'Amount must be greater than zero.');
  //     }
  //   });

  //   it('stake CYS', async () => {
  //     const amount = new anchor.BN(100000000)

  //     await rewardPool.rpc.stake(
  //       amount,
  //       {
  //         accounts: {
  //           pool: pool.publicKey,
  //           stakingVault,
  //           user: userSigner,
  //           owner: wallet.publicKey,
  //           stakeFromAccount: ownerTokenAccount,
  //           poolSigner: poolSigner,
  //           tokenProgram: TOKEN_PROGRAM_ID
  //         },
  //       }
  //     );

  //     const userAccount = await rewardPool.account.user.fetch(userSigner);
  //     assert.equal(userAccount.pool.toString(), pool.publicKey.toString())
  //     assert.equal(userAccount.owner.toString(), wallet.publicKey.toString())
  //     assert.equal(userAccount.rewardPerTokenComplete.toString(), '0')
  //     assert.equal(userAccount.rewardPerTokenPending.toString(), '0')
  //     assert.equal(userAccount.balanceStaked.toString(), amount.toString())
  //     // assert.equal(userAccount.maturityTime.toString(), '0')
  //     assert.equal(userAccount.nonce.toString(), userNonce)
  //   });
  // })

  // describe('unstake', () => {
  //   let userSigner;
  //   let userNonce;
  //   let stakeAmount;

  //   beforeEach(async () => {
  //     let [_userSigner, _userNonce] = await anchor.web3.PublicKey.findProgramAddress(
  //       [wallet.publicKey.toBuffer(), pool.publicKey.toBuffer()],
  //       rewardPool.programId
  //     )
  //     userSigner = _userSigner;
  //     userNonce = _userNonce;

  //     await rewardPool.rpc.createUser(
  //       userNonce,
  //       {
  //         accounts: {
  //           pool: pool.publicKey,
  //           user: userSigner,
  //           owner: wallet.publicKey,
  //           systemProgram: anchor.web3.SystemProgram.programId
  //         },
  //       }
  //     )

  //     stakeAmount = new anchor.BN(100000000)

  //     await rewardPool.rpc.stake(
  //       stakeAmount,
  //       {
  //         accounts: {
  //           pool: pool.publicKey,
  //           stakingVault,
  //           user: userSigner,
  //           owner: wallet.publicKey,
  //           stakeFromAccount: ownerTokenAccount,
  //           poolSigner: poolSigner,
  //           tokenProgram: TOKEN_PROGRAM_ID
  //         },
  //       }
  //     );
  //   })

  //   it('fails if amount is zero', async () => {
  //     try {
  //       await rewardPool.rpc.unstake(
  //         new anchor.BN(0),
  //         {
  //           accounts: {
  //             pool: pool.publicKey,
  //             stakingVault,
  //             user: userSigner,
  //             owner: wallet.publicKey,
  //             stakeFromAccount: ownerTokenAccount,
  //             poolSigner: poolSigner,
  //             tokenProgram: TOKEN_PROGRAM_ID
  //           },
  //         }
  //       );
  //       assert.fail('Should not reach this');
  //     } catch (err) {
  //       assert.equal(err.msg, 'Amount must be greater than zero.');
  //     }
  //   });

  //   it('fails if still locked', async () => {
  //     try {
  //       await rewardPool.rpc.unstake(
  //         new anchor.BN(1),
  //         {
  //           accounts: {
  //             pool: pool.publicKey,
  //             stakingVault,
  //             user: userSigner,
  //             owner: wallet.publicKey,
  //             stakeFromAccount: ownerTokenAccount,
  //             poolSigner: poolSigner,
  //             tokenProgram: TOKEN_PROGRAM_ID
  //           },
  //         }
  //       );
  //       assert.fail('Should not reach this');
  //     } catch (err) {
  //       assert.equal(err.msg, 'Need to wait until maturity time to stake or claim.');
  //     }
  //   });

  //   it('unstake cys', async () => {
  //     const amount = new anchor.BN(10000000);

  //     await wait(lockPeriod.toNumber());

  //     await rewardPool.rpc.unstake(
  //       amount,
  //       {
  //         accounts: {
  //           pool: pool.publicKey,
  //           stakingVault,
  //           user: userSigner,
  //           owner: wallet.publicKey,
  //           stakeFromAccount: ownerTokenAccount,
  //           poolSigner: poolSigner,
  //           tokenProgram: TOKEN_PROGRAM_ID
  //         },
  //       }
  //     );
  //   });
  // })

  // describe('claim', () => {
  //   let userSigner;
  //   let userNonce;
  //   let stakeAmount;
  //   let rewardAccount;

  //   beforeEach(async () => {
  //     rewardAccount = await cyclosMint.createAccount(wallet.publicKey)

  //     let [_userSigner, _userNonce] = await anchor.web3.PublicKey.findProgramAddress(
  //       [wallet.publicKey.toBuffer(), pool.publicKey.toBuffer()],
  //       rewardPool.programId
  //     )
  //     userSigner = _userSigner;
  //     userNonce = _userNonce;

  //     await rewardPool.rpc.createUser(
  //       userNonce,
  //       {
  //         accounts: {
  //           pool: pool.publicKey,
  //           user: userSigner,
  //           owner: wallet.publicKey,
  //           systemProgram: anchor.web3.SystemProgram.programId
  //         },
  //       }
  //     )

  //     stakeAmount = new anchor.BN(100000000)

  //     await rewardPool.rpc.stake(
  //       stakeAmount,
  //       {
  //         accounts: {
  //           pool: pool.publicKey,
  //           stakingVault: stakingVault,
  //           user: userSigner,
  //           owner: wallet.publicKey,
  //           stakeFromAccount: ownerTokenAccount,
  //           poolSigner: poolSigner,
  //           tokenProgram: TOKEN_PROGRAM_ID
  //         },
  //       }
  //     );

  //     const fundAmount = new anchor.BN("1000000000");

  //     await rewardPool.rpc.fund(
  //       fundAmount,
  //       {
  //         accounts: {
  //           pool: pool.publicKey,
  //           stakingVault: stakingVault,
  //           rewardVault,
  //           funder: wallet.publicKey,
  //           from: ownerTokenAccount,
  //           poolSigner: poolSigner,
  //           tokenProgram: TOKEN_PROGRAM_ID
  //         },
  //       }
  //     )
  //   })

  //   it('fails if still locked', async () => {
  //     try {
  //       await rewardPool.rpc.claim(
  //         {
  //           accounts: {
  //             pool: pool.publicKey,
  //             stakingVault: stakingVault,
  //             rewardVault,
  //             user: userSigner,
  //             owner: wallet.publicKey,
  //             rewardAccount: rewardAccount,
  //             poolSigner: poolSigner,
  //             tokenProgram: TOKEN_PROGRAM_ID
  //           },
  //         }
  //       );
  //       assert.fail('Should not reach this');
  //     } catch (err) {
  //       assert.equal(err.msg, 'Need to wait until maturity time to stake or claim.');
  //     }
  //   });

  //   it('claim cys', async () => {
  //     await wait(lockPeriod.toNumber());

  //     await rewardPool.rpc.claim(
  //       {
  //         accounts: {
  //           pool: pool.publicKey,
  //           stakingVault,
  //           rewardVault,
  //           user: userSigner,
  //           owner: wallet.publicKey,
  //           rewardAccount,
  //           poolSigner: poolSigner,
  //           tokenProgram: TOKEN_PROGRAM_ID
  //         },
  //       }
  //     );
  //   });
  // })
});

async function wait(seconds) {
  await sleep(seconds * 1000);
}