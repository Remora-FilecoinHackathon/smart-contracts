import { ethers } from "hardhat";
import axios from "axios";

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

async function main() {
  var priorityFee = await callRpc("eth_maxPriorityFeePerGas");
  const LenderManager = await ethers.getContractFactory("LenderManager");
  const lenderManager = await LenderManager.deploy({
    maxPriorityFeePerGas: priorityFee.result,
  });

  await lenderManager.deployed();

  console.log(`Deployed to ${lenderManager.address}`);

  lenderManager.on("CheckReputation", async function (address: string) {
    console.log("**** EVENT RECEIVED ****");
    console.log(address);
  });

  priorityFee = await callRpc("eth_maxPriorityFeePerGas");

  await lenderManager.checkReputation({
    maxPriorityFeePerGas: priorityFee.result,
  });
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
