import { expect } from "chai";
import { time, loadFixture } from "@nomicfoundation/hardhat-network-helpers";
import axios from "axios";
import { ethers } from "hardhat";
import { addressAsBytes } from "../scripts/utils/parseAddress";

describe("Lender Manager Contract", function () {

    const ENDPOINT_ADDRESS = "https://api.hyperspace.node.glif.io/rpc/v1";

    const amount = ethers.utils.parseEther("0.002");
    const currentTimestampInSeconds = Math.round(Date.now() / 1000);
    const ONE_YEAR_IN_SECS = 365 * 24 * 60 * 60;
    const unlockTime = currentTimestampInSeconds + ONE_YEAR_IN_SECS;

    async function callRpc(method: string, params?: any) {
        const res = await axios.post(ENDPOINT_ADDRESS, {
          jsonrpc: "2.0",
          method: method,
          params: params,
          id: 1,
        });
        return res.data;
    }

    async function deployLenderManagerFixture() {
        const ORACLE_ADDRESS = "0xbd6E4e826D26A8C984C1baF057D6E62cC245645D";
        const MINER_ADDRESS =
            "t3wj7cikpzptshfuwqleehoytar2wcvom42q6io7lopbl2yp2kb2yh3ymxovsd5ccrgm36ckeibzjl3s27pzuq";

        var priorityFee = await callRpc("eth_maxPriorityFeePerGas");

        // Contracts are deployed using the first signer/account by default
        const [owner, otherAccount] = await ethers.getSigners();

        const LenderManager = await ethers.getContractFactory("LenderManager");
        const lenderManager = await LenderManager.deploy(ORACLE_ADDRESS, {
            maxPriorityFeePerGas: priorityFee.result,
        });

        return { lenderManager, ORACLE_ADDRESS, MINER_ADDRESS, owner, otherAccount };
    }

    describe("Deployments", function () {
        it("Oracle address should be set correctly", async function () {
            const { lenderManager, ORACLE_ADDRESS } = await loadFixture(deployLenderManagerFixture);

            expect(await lenderManager.oracle()).not.to.equal(0);
            expect(await lenderManager.oracle()).to.equal(ORACLE_ADDRESS);
        })
    })

    describe("Create Lending Position", function () {
        it("Should fail for zero value sent to the function", async function () {
            const { lenderManager } = await loadFixture(deployLenderManagerFixture);

            await expect(lenderManager.createLendingPosition(unlockTime, 10)).to.be.revertedWith('send some FIL to create a lending position');
        })

        it("Should fail for invalid duration sent to the function", async function () {
            const { lenderManager } = await loadFixture(deployLenderManagerFixture);

            await expect(lenderManager.createLendingPosition(currentTimestampInSeconds - 1, 10, {value: amount})).to.be.revertedWith('duration must be greater than current timestamp');
        })

        it("Should pass for the correct params", async function () {
            const { lenderManager, owner } = await loadFixture(deployLenderManagerFixture);

            const tx = await lenderManager.createLendingPosition(unlockTime, 10, {value: 1});
            await tx.wait();

            // param update checks
            let key = await lenderManager.loanKeys(0);
            let lenderPosition = await lenderManager.positions(key);
            // console.log(lenderPosition);

            expect(lenderPosition.lender).to.equal(owner.address);
            expect(lenderPosition.availableAmount).to.equal(1);
            expect(lenderPosition.endTimestamp).to.equal(unlockTime);
            expect(lenderPosition.interestRate).to.equal(10);
        })
    })

    describe("Create Borrow", function () {
        it("Should fail for an invalid loan key sent to the function", async function () {
            const { lenderManager, MINER_ADDRESS } = await loadFixture(deployLenderManagerFixture);

            const tx = await lenderManager.createLendingPosition(unlockTime, 10, {value: amount});
            await tx.wait();

            await expect(lenderManager.createBorrow(0, ethers.utils.parseEther("0.001"), addressAsBytes(MINER_ADDRESS))).to.be.reverted;
        })

        it("Should fail for an invalid amount sent to the function", async function () {
            const { lenderManager, MINER_ADDRESS } = await loadFixture(deployLenderManagerFixture);

            const tx = await lenderManager.createLendingPosition(unlockTime, 10, {value: amount});
            await tx.wait();

            let key = await lenderManager.loanKeys(0);

            await expect(lenderManager.createBorrow(key, ethers.utils.parseEther("0.003"), addressAsBytes(MINER_ADDRESS))).to.be.revertedWith("Lending position not available");
        })

        it("Should fail for zero amount sent to the function", async function () {
            const { lenderManager, MINER_ADDRESS } = await loadFixture(deployLenderManagerFixture);

            const tx = await lenderManager.createLendingPosition(unlockTime, 10, {value: amount});
            await tx.wait();

            let key = await lenderManager.loanKeys(0);

            await expect(lenderManager.createBorrow(key, ethers.utils.parseEther("0"), addressAsBytes(MINER_ADDRESS))).to.be.reverted;
        })

        it("Should fail if duration is passed for the given loan", async function () {
            const { lenderManager, MINER_ADDRESS } = await loadFixture(deployLenderManagerFixture);

            const tx = await lenderManager.createLendingPosition(unlockTime, 10, {value: amount});
            await tx.wait();

            let key = await lenderManager.loanKeys(0);

            // time travelling to after the unlock time
            await time.increaseTo(unlockTime + 1);

            await expect(lenderManager.createBorrow(key, ethers.utils.parseEther("0.001"), addressAsBytes(MINER_ADDRESS))).to.be.revertedWith("Lending position not available");
        })

        it("Should pass for the correct params passed to the function", async function () {
            const { lenderManager, MINER_ADDRESS, owner } = await loadFixture(deployLenderManagerFixture);

            const tx = await lenderManager.createLendingPosition(unlockTime, 10, {value: amount});
            await tx.wait();

            let key = await lenderManager.loanKeys(0);

            await lenderManager.createBorrow(key, ethers.utils.parseEther("0.001"), addressAsBytes(MINER_ADDRESS));

            // check params updated
            let lenderPosition = await lenderManager.positions(key);
            expect(lenderPosition.availableAmount).to.equal(ethers.utils.parseEther("0.001"));

            let lendingOrders = await lenderManager.ordersForLending(key,0);
            // This is not correct, the lender should not be able to borrow from themselves
            expect(lendingOrders.borrower).to.equal(owner.address);
            
            expect(lendingOrders.loanAmount).to.equal(ethers.utils.parseEther("0.001"));
            // expect(lendingOrders.startBlock).to.equal(new ethers.BigNumber(Math.round(Date.now() / 1000)));
        })

    })
    // TODO: Add checks for the calculation functions
})