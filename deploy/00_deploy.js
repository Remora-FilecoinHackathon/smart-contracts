require("hardhat-deploy")
require("hardhat-deploy-ethers")

const ethers = require("ethers")
const util = require("util")
const request = util.promisify(require("request"))
const { networkConfig } = require("../helper-hardhat-config")

const DEPLOYER_PRIVATE_KEY = network.config.accounts[0]

async function callRpc(method, params) {
    var options = {
        method: "POST",
        url: "https://api.hyperspace.node.glif.io/rpc/v1",
        // url: "http://localhost:1234/rpc/v0",
        headers: {
            "Content-Type": "application/json",
        },
        body: JSON.stringify({
            jsonrpc: "2.0",
            method: method,
            params: params,
            id: 1,
        }),
    }
    const res = await request(options)
    return JSON.parse(res.body).result
}

const deployer = new ethers.Wallet(DEPLOYER_PRIVATE_KEY)

module.exports = async ({ deployments }) => {
    const { deploy, execute, read } = deployments

    const priorityFee = await callRpc("eth_maxPriorityFeePerGas")

    // Wraps Hardhat's deploy, logging errors to console.
    const deployLogError = async (title, obj) => {
        let ret
        try {
            ret = await deploy(title, obj)
        } catch (error) {
            console.log(error.toString())
            process.exit(1)
        }
        return ret
    }

    console.log("Wallet Ethereum Address:", deployer.address)
    const lenderManager = await deployLogError("LenderManager", {
        from: deployer.address,
        args: [],
        // maxPriorityFeePerGas to instruct hardhat to use EIP-1559 tx format
        maxPriorityFeePerGas: priorityFee,
        log: true,
    })

    const currentTimestampInSeconds = Math.round(Date.now() / 1000)
    const ONE_YEAR_IN_SECS = 365 * 24 * 60 * 60
    const unlockTime = currentTimestampInSeconds + ONE_YEAR_IN_SECS

    const amount = hre.ethers.utils.parseEther("0.002")
    console.log("Calling createLendingPosition...")
    await execute(
        "LenderManager",
        {
            from: deployer.address,
            maxPriorityFeePerGas: priorityFee,
            value: amount,
        },
        "createLendingPosition",
        unlockTime,
        10
    )
    console.log("createLendingPosition finished executing.")

    const MINER_ADDRESS =
        "t3wj7cikpzptshfuwqleehoytar2wcvom42q6io7lopbl2yp2kb2yh3ymxovsd5ccrgm36ckeibzjl3s27pzuq"
    console.log("Calling createBorrow...")
    let tx = await execute(
        "LenderManager",
        {
            from: deployer.address,
            maxPriorityFeePerGas: priorityFee,
            gasLimit: 10000000000,
        },
        "createBorrow",
        ethers.utils.parseEther("0.001"),
        ethers.utils.toUtf8Bytes(MINER_ADDRESS)
    )
}
