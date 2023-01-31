import { ethers } from "hardhat";
import axios from "axios";
import { addressAsBytes } from "./utils/parseAddress";
import {
  HttpJsonRpcConnector,
  LotusWalletProvider,
  LotusClient,
} from "filecoin.js";
import * as dotenv from "dotenv";
dotenv.config();

const ENDPOINT_ADDRESS = "https://api.hyperspace.node.glif.io/rpc/v1";
const LOTUS_HTTP_RPC_ENDPOINT = "https://100.20.82.125:1234";

const ORACLE_ADDRESS = "0xbd6E4e826D26A8C984C1baF057D6E62cC245645D";
const MINER_ADDRESS =
  "t3wj7cikpzptshfuwqleehoytar2wcvom42q6io7lopbl2yp2kb2yh3ymxovsd5ccrgm36ckeibzjl3s27pzuq";

async function callRpc(method: string, params?: any) {
  const res = await axios.post(ENDPOINT_ADDRESS, {
    jsonrpc: "2.0",
    method: method,
    params: params,
    id: 1,
  });
  return res.data;
}

async function main() {
  const [lenderAddress, borrowerAddress] = await ethers.getSigners();

  var priorityFee = await callRpc("eth_maxPriorityFeePerGas");

  const LenderManager = await ethers.getContractFactory("LenderManager");
  const lenderManager = await LenderManager.deploy(ORACLE_ADDRESS, {
    maxPriorityFeePerGas: priorityFee.result,
  });
  await lenderManager.deployed();
  console.log(`Deployed to ${lenderManager.address}`);

  priorityFee = await callRpc("eth_maxPriorityFeePerGas");
  console.log("calling isControllingAddress...");
  await lenderManager.isControllingAddress(addressAsBytes(MINER_ADDRESS), {
    gasLimit: 1000000000,
    maxPriorityFeePerGas: priorityFee.result,
  });
  console.log("finished executing isControllingAddress");

  const amount = ethers.utils.parseEther("0.002");
  const currentTimestampInSeconds = Math.round(Date.now() / 1000);
  const ONE_YEAR_IN_SECS = 365 * 24 * 60 * 60;
  const unlockTime = currentTimestampInSeconds + ONE_YEAR_IN_SECS;

  priorityFee = await callRpc("eth_maxPriorityFeePerGas");
  let tx = await lenderManager.createLendingPosition(unlockTime, 300, {
    value: amount,
    maxPriorityFeePerGas: priorityFee.result,
  });
  await tx.wait();

  console.log("createLendingPosition finished executing.");

  var loanKey = await lenderManager.loanKeys(0);

  var escrow = "";

  lenderManager.on(
    "BorrowOrder",
    async (
      escrowAddress: string,
      loanAmount: number,
      lenderAmountAvailable: number,
      startBlock: number,
      amountToPay: number,
      key: number,
      minerActor: any
    ) => {
      escrow = escrowAddress;
      console.log("Escrow Address deployed at ", escrow);
    }
  );

  console.log("calling createBorrow");
  priorityFee = await callRpc("eth_maxPriorityFeePerGas");

  await lenderManager
    .connect(borrowerAddress)
    .createBorrow(
      loanKey,
      ethers.utils.parseEther("0.001"),
      addressAsBytes(MINER_ADDRESS),
      {
        maxPriorityFeePerGas: priorityFee.result,
      }
    );

  console.log("createBorrow finished executing.");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
