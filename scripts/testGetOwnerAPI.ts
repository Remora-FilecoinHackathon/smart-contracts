import { ethers } from "hardhat";
import axios from "axios";
import { addressAsBytes } from "./utils/parseAddress";
import { newFromString, encode } from "@glif/filecoin-address";
// import { parseAddress } from "@zondax/filecoin-signing-tools/js";
import * as dotenv from "dotenv";
dotenv.config();

const ENDPOINT_ADDRESS = "https://api.hyperspace.node.glif.io/rpc/v1";

const ORACLE_ADDRESS = "0xbd6E4e826D26A8C984C1baF057D6E62cC245645D";
const MINER_ID = "t02057";
const OWNER_MINER_ADDRESS =
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
  const minerId = newFromString(MINER_ID);
  priorityFee = await callRpc("eth_maxPriorityFeePerGas");
  console.log("calling getOwnerDebug...");
  let tx = await lenderManager.getOwnerDebug(
    // addressAsBytes(OWNER_MINER_ADDRESS),
    minerId.bytes,
    {
      gasLimit: 10000000000,
      maxPriorityFeePerGas: priorityFee.result,
    }
  );

  console.log("finished executing getOwnerDebug");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
