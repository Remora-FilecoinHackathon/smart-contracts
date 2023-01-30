import { HardhatUserConfig } from "hardhat/config";
import "@nomicfoundation/hardhat-toolbox";
import * as dotenv from "dotenv";

dotenv.config();

const PRIVATE_KEY_LENDER = process.env.PRIVATE_KEY_LENDER as string;
const PRIVATE_KEY_BORROWER = process.env.PRIVATE_KEY_BORROWER as string;

const config: HardhatUserConfig = {
  solidity: {
    version: "0.8.17",
    settings: {
      optimizer: {
        enabled: true,
        runs: 1000,
      },
    },
  },
  defaultNetwork: "hyperspace",
  networks: {
    hyperspace: {
      chainId: 3141,
      url: "https://api.hyperspace.node.glif.io/rpc/v1",
      accounts: [PRIVATE_KEY_LENDER, PRIVATE_KEY_BORROWER],
      timeout: 4000000,
    },
  },
};

export default config;
