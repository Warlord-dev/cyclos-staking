const assert = require("assert");
const anchor = require('@project-serum/anchor');
const { TOKEN_PROGRAM_ID, Token } = require("@solana/spl-token");
const dotenv = require('dotenv');
const fs = require('fs');
const { PublicKey, Keypair, Connection } = require("@solana/web3.js");
const rewardPoolIdl = require("../target/idl/reward_pool.json")
const keypair = require('../jeet.json')

dotenv.config();

const getEndpoints = (cluster) => {
  if (cluster == "localnet") {
    return "http://127.0.0.1:8899"
  } else if (cluster == "devnet") {
    return "https://api.devnet.solana.com"
  } else if (cluster == "testnet") {
    return "https://api.devnet.solana.com"
  } else if (cluster == "mainnet") {
    return "https://dawn-red-log.solana-mainnet.quiknode.pro/ff88020a7deb8e7d855ad7c5125f489ef1e9db71/";
  } else {
    throw Error("unsupported cluster");
  }
}

const getAccounts = () => {
  const cluster = process.env.CLUSTER || "localnet";
  const config = require(`./${cluster}-config.json`);
  const connection = new Connection(getEndpoints(cluster), anchor.Provider.defaultOptions().commitment);
  const payer = Keypair.fromSecretKey(Buffer.from(keypair));
  const wallet = new anchor.Wallet(payer);
  const provider = new anchor.Provider(connection, wallet, anchor.Provider.defaultOptions());

  anchor.setProvider(provider);
  const rewardPoolProgram = new anchor.Program(rewardPoolIdl, new PublicKey(config.rewardPoolProgram));

  const cysMint = new Token(connection, new PublicKey(config.cysMint), TOKEN_PROGRAM_ID, payer);
  const cysTokenAccount = new PublicKey(config.cysTokenAccount)

  const pools = config.pools.map(pool => {
    return {
      ...pool,
      pool: new PublicKey(pool.pool),
      poolSigner: new PublicKey(pool.poolSigner),
      stakingVault: new PublicKey(pool.stakingVault),
      rewardVault: new PublicKey(pool.rewardVault),
    }
  });

  return {
    rewardPoolProgram,
    cysMint,
    cysTokenAccount,
    pools,
    provider,
    wallet,
  }
}

const addPoolInfo = (poolDetails) => {
  const cluster = process.env.CLUSTER || "localnet";
  const config = require(`./${cluster}-config.json`);
  config.pools.push(poolDetails)

  console.log("Add new pool info...");
  fs.writeFileSync(`./src/${cluster}-config.json`, JSON.stringify(config, null, 2));
}

module.exports = {
  getEndpoints,
  getAccounts,
  addPoolInfo
};
