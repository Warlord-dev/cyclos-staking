const anchor = require('@project-serum/anchor');
const { TOKEN_PROGRAM_ID } = require("@solana/spl-token");
const { getAccounts } = require('./utils')

const fund = async(lockPeriod, amount) => {
  const {
    rewardPoolProgram,
    cysTokenAccount,
    pools,
    wallet
  } = getAccounts();

  const pool = pools.find(_pool => _pool.lockPeriod.toString() === lockPeriod.toString())

  const tx = await rewardPoolProgram.rpc.fund(
    amount,
    {
      accounts: {
        pool: pool.pool,
        stakingVault: pool.stakingVault,
        rewardVault: pool.rewardVault,
        funder: wallet.publicKey,
        from: cysTokenAccount,
        poolSigner: pool.poolSigner,
        tokenProgram: TOKEN_PROGRAM_ID
      },
    }
  )

  console.log("Tx: ", tx);
}

const lockPeriod = new anchor.BN(5184000);
const amount = new anchor.BN('10000');

fund(lockPeriod, amount);
