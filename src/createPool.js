const anchor = require('@project-serum/anchor');
const { TOKEN_PROGRAM_ID } = require("@solana/spl-token");
const { getAccounts, addPoolInfo } = require('./utils')

const createPool = async(lockPeriod, amount) => {
  const {
    rewardPoolProgram,
    cysMint,
    pools,
    wallet
  } = getAccounts();

  const poolDetails = pools.find(_pool => _pool.lockPeriod.toString() === lockPeriod.toString())
  if (poolDetails) {
    throw Error("pool exist")
  }

  pool = anchor.web3.Keypair.generate()
  console.log("Pool: ", pool.publicKey.toString())
  let [poolSigner, nonce] = await anchor.web3.PublicKey.findProgramAddress(
    [pool.publicKey.toBuffer()],
    rewardPoolProgram.programId
  )
  stakingVault = await cysMint.createAccount(poolSigner)
  console.log("StakingVault: ", stakingVault.toString())

  rewardVault = await cysMint.createAccount(poolSigner)
  console.log("rewardVault: ", rewardVault.toString())

  console.log("Pool Signer: ", poolSigner.toString());
  console.log("Pool Nonce: ", nonce.toString());

  const rewardDuration = new anchor.BN(3600 * 24 * 7);
  const tx = await rewardPoolProgram.rpc.initializePool(
    nonce,
    rewardDuration,
    lockPeriod,
    {
      accounts: {
        authority: wallet.publicKey,
        stakingMint: cysMint.publicKey,
        stakingVault,
        rewardMint: cysMint.publicKey,
        rewardVault,
        poolSigner: poolSigner,
        pool: pool.publicKey,
        tokenProgram: TOKEN_PROGRAM_ID
      },
      signers: [pool],
      instructions: [
        await rewardPoolProgram.account.pool.createInstruction(pool),
      ]
    }
  )

  console.log("Tx: ", tx);

  addPoolInfo({
    lockPeriod: lockPeriod.toNumber(),
    pool: pool.publicKey.toString(),
    poolSigner: poolSigner.toString(),
    nonce,
    stakingVault: stakingVault.toString(),
    rewardVault: rewardVault.toString(),
  })
}

const lockPeriod = new anchor.BN(3600 * 24 * 60);

createPool(lockPeriod);
