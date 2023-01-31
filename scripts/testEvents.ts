import { ethers } from "hardhat";
import axios from "axios";
import { addressAsBytes } from "./utils/parseAddress";
import AWS from 'aws-sdk';

const ENDPOINT_ADDRESS = "https://api.hyperspace.node.glif.io/rpc/v1";
const SQS_QUEUE_URL = "https://sqs.us-west-2.amazonaws.com/130922966848/fil-reputation";

async function sendMessage (queueUrl, message) {
  const sqs = new AWS.SQS();
  const params = {
    MessageBody: message,
    QueueUrl: queueUrl
  };
  
  try {
    const result = await sqs.sendMessage(params).promise();
    console.log(`Message sent: ${result.MessageId}`);
  } catch (error) {
    console.error(`Error sending message: ${error}`);
  }
};

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
  const LENDER_MANAGER_ADDRESS = "0x94269aCa160682c3404086f89005338310662841";

  var priorityFee = await callRpc("eth_maxPriorityFeePerGas");
  const LenderManager = await ethers.getContractFactory("LenderManager");
  const lenderManager = LenderManager.attach(LENDER_MANAGER_ADDRESS);

  lenderManager.on(
    "CheckReputation",
    async function (id: number, address: string) {
      console.log("**** EVENT RECEIVED ****");
      console.log(id);
      console.log(address);
      sendMessage(SQS_QUEUE_URL, address);
    }
  );

  priorityFee = await callRpc("eth_maxPriorityFeePerGas");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
