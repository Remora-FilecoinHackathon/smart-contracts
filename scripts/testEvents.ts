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
  const LENDER_MANAGER_ADDRESS = "0x8322e4D514C08e211eF72B67d51d2c8E80154CC0";

  var priorityFee = await callRpc("eth_maxPriorityFeePerGas");
  const LenderManager = await ethers.getContractFactory("LenderManager");
  const lenderManager = LenderManager.attach(LENDER_MANAGER_ADDRESS);

  lenderManager.on(
    "CheckReputation",
    async function (id: number, address: string) {
      console.log("**** EVENT RECEIVED ****");
      console.log(id);
      console.log(address);
    }
  );

  priorityFee = await callRpc("eth_maxPriorityFeePerGas");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
