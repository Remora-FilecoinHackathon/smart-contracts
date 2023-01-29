const XMLHttpRequest = require("xmlhttprequest").XMLHttpRequest;

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


async function main() {
    try {
        var minerData = await getData('https://api.filrep.io/api/v1/miners', '?sortBy=score&limit=3');
        minerData = JSON.parse(minerData)   
        var reputableMiners = getMinerAddress(minerData)
        console.log(reputableMiners);
        
    } catch (error) {
        console.log(error);
    }
}
main();