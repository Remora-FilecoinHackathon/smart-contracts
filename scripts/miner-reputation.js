const { boolean } = require("hardhat/internal/core/params/argumentTypes");
const axios = require("axios");
const ethers = require("hardhat").ethers;
const XMLHttpRequest = require("xmlhttprequest").XMLHttpRequest;

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


function getData(apiUrl, params) {
    return new Promise((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        xhr.open('GET', apiUrl + params, true);
        xhr.onload = () => {
            if (xhr.status === 200) {
                resolve(xhr.responseText);
            } else {
                reject(xhr.statusText);
            }
        };
        xhr.onerror = () => reject(xhr.statusText);
        xhr.send();
    });
}

function determineIfMinerIsReputable(jsonData) {
    var jsonData = jsonData['miners'];
    var minerIsReputable = false;
    var minerReputation = jsonData[0].score;
    var minerReachable = jsonData[0].reachability;
    console.log('REPUTATION SCORE');
    console.log(minerReputation);
    console.log('REACHABLE');
    console.log(minerReachable);

    if (minerReputation > 95 && minerReachable === 'reachable') {
        minerIsReputable = true;
        return minerIsReputable;
    }
    else {
        return minerIsReputable;
    }
}


async function writeReputation(isMinerReputable) {
    const MINER_ADDRESS =
      "t3wj7cikpzptshfuwqleehoytar2wcvom42q6io7lopbl2yp2kb2yh3ymxovsd5ccrgm36ckeibzjl3s27pzuq";
    
    // set to my own wallet so I can write reputation 
    const ORACLE_ADDRESS = "0xc2b60CfFe4f20b2046C951CDEB459aF897cff571";
    
    // NEW ADDRESS - uses mock contracts 
    const LENDER_MANAGER_ADDRESS = "0x1a75831c8646fC5c4a6Bf6337c696dE14F0c85b6";
  
    var priorityFee = await callRpc("eth_maxPriorityFeePerGas");
    const LenderManager = await ethers.getContractFactory("LenderManager");
    const lenderManager = LenderManager.attach(LENDER_MANAGER_ADDRESS);
    const id = await lenderManager.currentId()
    const oracle = await lenderManager.oracle()
    console.log("CURRENT ID");
    console.log(id);
    console.log(oracle);
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
        // var minerData = await getData('https://api.filrep.io/api/v1/miners', '?limit=10&sortBy=noPenalties');
        minerData = JSON.parse(minerData)   
        var minerReputable = determineIfMinerIsReputable(minerData);
        console.log("MINER REPUTABLE?");
        console.log(minerReputable);

        var txn = await writeReputation(minerReputable);
        console.log(txn);
        
    } catch (error) {
        console.log(error);
    }
}

// In Lambda, this address will be passed via the event listener 
main('f01662887');