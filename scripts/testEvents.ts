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
    "t3wj7cikpzptshfuwqleehoytar2wcvom42q6io7lopbl2yp2kb2yh3ymxovsd5ccrgm36ckeibzjl3s27pzuq";
  const ORACLE_ADDRESS = "0xbd6E4e826D26A8C984C1baF057D6E62cC245645D";
  const LENDER_MANAGER_ADDRESS = "0x8322e4D514C08e211eF72B67d51d2c8E80154CC0";

  var priorityFee = await callRpc("eth_maxPriorityFeePerGas");
  const LenderManager = await ethers.getContractFactory("LenderManager");
  const lenderManager = LenderManager.attach(LENDER_MANAGER_ADDRESS);
  // const lenderManager = await LenderManager.deploy(ORACLE_ADDRESS, {
  //   maxPriorityFeePerGas: priorityFee.result,
  // });

  // await lenderManager.deployed();

  // console.log(`Deployed to ${lenderManager.address}`);

  lenderManager.on(
    "CheckReputation",
    async function (id: number, address: string) {
      console.log("**** EVENT RECEIVED ****");
      console.log(address);
    }
  );

  priorityFee = await callRpc("eth_maxPriorityFeePerGas");

  await lenderManager.checkReputation(addressAsBytes(MINER_ADDRESS), {
    maxPriorityFeePerGas: priorityFee.result,
  });
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
