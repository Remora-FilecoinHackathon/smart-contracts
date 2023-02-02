const ethers = require("hardhat").ethers;
const XMLHttpRequest = require("xmlhttprequest").XMLHttpRequest;


async function callRpc(method, params) {
    const res = await axios.post(ENDPOINT_ADDRESS, {
      jsonrpc: "2.0",
      method: method,
      params: params,
      id: 1,
    });
    return res.data;
  }


async function writeReputation() {
    const MINER_ADDRESS =
      "t3wj7cikpzptshfuwqleehoytar2wcvom42q6io7lopbl2yp2kb2yh3ymxovsd5ccrgm36ckeibzjl3s27pzuq";
    
    // set to my own wallet so I can write reputation 
    const ORACLE_ADDRESS = "0xc2b60CfFe4f20b2046C951CDEB459aF897cff571";
    
    // NEW ADDRESS - uses mock contracts 
    const LENDER_MANAGER_ADDRESS = "0x1a75831c8646fC5c4a6Bf6337c696dE14F0c85b6";
  
    var priorityFee = await callRpc("eth_maxPriorityFeePerGas");
    const LenderManager = await ethers.getContractFactory("LenderManager");
    const lenderManager = LenderManager.attach(LENDER_MANAGER_ADDRESS);

    // receiveReputation score takes 1 for bad, 2 for good
    await lenderManager.receiveReputationScore(1, 2, {
        maxPriorityFeePerGas: priorityFee.result,
      });
  
    priorityFee = await callRpc("eth_maxPriorityFeePerGas");
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


function getMinerAddress(jsonData) {
    var jsonData = jsonData['miners']
    var minerAddresses = [];
    for (var i = 0; i < jsonData.length; i++) {
        minerAddresses.push(jsonData[i].address);
    }
    return minerAddresses;
}


async function main(address) {
    try {
        var minerData = await getData('https://api.filrep.io/api/v1/miners', `?search=${address}`);
        // var minerData = await getData('https://api.filrep.io/api/v1/miners', '?limit=10&sortBy=noPenalties');
        minerData = JSON.parse(minerData)   
        var reputableMiners = getMinerAddress(minerData)
        console.log("ALL DATA");
        console.log(minerData);
        console.log("MINER ADDRESS");
        console.log(reputableMiners);
        
    } catch (error) {
        console.log(error);
    }
}

// In Lambda, this address will be passed via the event listener 
main('f066104');