import { ethers } from "hardhat";
import axios from "axios";
import { addressAsBytes } from "./utils/parseAddress";

const ENDPOINT_ADDRESS = "https://api.hyperspace.node.glif.io/rpc/v1";

async function callRpc(method: string, params?: any) {
  const res = await axios.post(ENDPOINT_ADDRESS, {
    jsonrpc: "2.0",
    method: method,
    params: params,
    id: 1,
  });
  return res.data;
}

async function deploy() {}

async function main() {
  const MINER_ADDRESS =
  // This is working with full Hyperspace FIL addresses, full mainnet addresses, and 0x addresses, but not mainnet miner actor IDs
  // Mainnet actor IDs is what the filrep site uses
  // Two options to solve this:
  // 1. Try to reverse the addressAsBytes function
  // 2. 


  // example addresses:
  // hyperspace EVM account: t410fyk3az77e6ifsarwjkhg6wrm27cl475lrr6myeui
  // hyperspace miner ID: t02057 
  // hyperspace full miner address: t3wj7cikpzptshfuwqleehoytar2wcvom42q6io7lopbl2yp2kb2yh3ymxovsd5ccrgm36ckeibzjl3s27pzuq
  // mainnet miner ID: f01662887 
  // mainnet full miner address: f2t5am77ayepeeivbf7fjwqthei64ofm3qhz52xyi
    "f01662887";
  const ORACLE_ADDRESS = "0xbd6E4e826D26A8C984C1baF057D6E62cC245645D";
  const LENDER_MANAGER_ADDRESS = "0x8322e4D514C08e211eF72B67d51d2c8E80154CC0";

  var priorityFee = await callRpc("eth_maxPriorityFeePerGas");
  const LenderManager = await ethers.getContractFactory("LenderManager");
  const lenderManager = LenderManager.attach(LENDER_MANAGER_ADDRESS);

  priorityFee = await callRpc("eth_maxPriorityFeePerGas");

  await lenderManager.checkReputation(addressAsBytes(MINER_ADDRESS), {
    maxPriorityFeePerGas: priorityFee.result,
  });
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});