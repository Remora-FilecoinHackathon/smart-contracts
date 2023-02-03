const axios = require("axios");
const ethers = require("hardhat").ethers;

const ENDPOINT_ADDRESS = "https://api.hyperspace.node.glif.io/rpc/v1";

async function callRpc(method, params) {
    const res = await axios.post(ENDPOINT_ADDRESS, {
        jsonrpc: "2.0",
        method: method,
        params: params,
        id: 1,
      });
    return res.data;
  }


async function getData(apiUrl, params) {
    try {
        const response = await axios.get(apiUrl + params);
        return response.data['miners'];
    } catch (error) {
        return error.message;
    }
}

async function determineIfMinerIsReputable(jsonData) {
    var minerIsReputable = false;
    var minerReputation = jsonData[0].score;
    var minerReachable = jsonData[0].reachability;

    if (minerReputation > 95 && minerReachable === 'reachable') {
        minerIsReputable = true;
        return minerIsReputable;
    }
    else {
        return minerIsReputable;
    }
}


async function writeReputation(isMinerReputable) {
    const LENDER_MANAGER_ADDRESS = "0x8322e4D514C08e211eF72B67d51d2c8E80154CC0";
  
    var priorityFee = await callRpc("eth_maxPriorityFeePerGas");
    const LenderManager = await ethers.getContractFactory("LenderManager");
    const lenderManager = LenderManager.attach(LENDER_MANAGER_ADDRESS);
    const id = await lenderManager.currentId()

    // receiveReputation score takes 1 for bad, 2 for good
    if (isMinerReputable === false) {
        await lenderManager.receiveReputationScore(id, 1, {
            gasLimit: 1000000000,
            maxPriorityFeePerGas: priorityFee.result,
          });
    } else if (isMinerReputable === true) {
        await lenderManager.receiveReputationScore(id, 2, {
            gasLimit: 1000000000,
            maxPriorityFeePerGas: priorityFee.result,
          });
    }
}


async function main(address) {
    try {
        var minerData = await getData('https://api.filrep.io/api/v1/miners', `?search=${address}`);
        var minerReputable = await determineIfMinerIsReputable(minerData);

        var txn = await writeReputation(minerReputable);
        console.log(txn);
        
    } catch (error) {
        console.log(error);
    }
}

// In Lambda, this address will be passed via the event listener 
main('f01662887');