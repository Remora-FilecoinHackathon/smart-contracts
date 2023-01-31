import { HttpJsonRpcConnector, LotusClient, LightWalletProvider,MnemonicWalletProvider} from "filecoin.js";
import BigNumber from "bignumber.js";
const glifNodeurl = "https://hyperspace.node.glif.io";
const glifNodeConn = new HttpJsonRpcConnector({url:glifNodeurl});
const glifClient = new LotusClient(glifNodeConn);

async function createLightWallet(){
    try {
        const lightWallet = new LightWalletProvider(glifClient, () => { return 'superStrongPassword' }, 'test');
        let mnemonic = await lightWallet.createLightWallet('superStrongPassword');
        console.log(mnemonic);
        let encryptedWallet = lightWallet.keystore.serialize();
        console.log(encryptedWallet);
        const lightWalletAddress = await lightWallet.getDefaultAddress();
        console.log(lightWalletAddress);
    } catch (error) {
        console.log(error);
    }
}

// Test the function
createLightWallet()
