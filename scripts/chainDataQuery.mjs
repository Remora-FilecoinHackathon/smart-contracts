// Import necessary packages
import { HttpJsonRpcConnector, LotusClient } from "filecoin.js";

// Use the local node URL to create a connection to your Lotus node
const localNodeUrl = 'http://100.20.82.125:1234/rpc/v0';
const localConnector = new HttpJsonRpcConnector({ url: localNodeUrl });

// lotusClient exposes all Lotus APIs
const lotusClient = new LotusClient(localConnector);
const version = await lotusClient.common.version();
console.log(version);

//Query the current block head
const chainHead = await lotusClient.chain.getHead();
console.log(chainHead);

//Query all the messages in a block
const tipSet = await lotusClient.chain.getTipSetByHeight(39096);
const messages = await lotusClient.chain.getBlockMessages(tipSet.Cids[0]);
console.log(messages);

//Query Wallet balance
const walletBalance = await lotusClient.wallet.balance("t3wj7cikpzptshfuwqleehoytar2wcvom42q6io7lopbl2yp2kb2yh3ymxovsd5ccrgm36ckeibzjl3s27pzuq");
console.log(walletBalance)

