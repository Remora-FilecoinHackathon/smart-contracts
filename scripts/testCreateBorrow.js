const hre = require("hardhat")

async function main() {
    const LenderManager = await hre.ethers.getContractFactory("LenderManager")
    const contract = await LenderManager.deploy()

    await contract.deployed()

    console.log(`LenderManager deployed to ${contract.address}`)
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main().catch((error) => {
    console.error(error)
    process.exitCode = 1
})
