import { expect } from "chai";
import { time, loadFixture } from "@nomicfoundation/hardhat-network-helpers";
import axios from "axios";
import { ethers } from "hardhat";
import { addressAsBytes } from "../scripts/utils/parseAddress";

describe("Escrow Contract", function () {

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

    async function deployEscrowFixture() {
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

        let tx = await lenderManager.createLendingPosition(unlockTime, 10, {
            value: amount,
            maxPriorityFeePerGas: priorityFee.result,
        });
        await tx.wait();

        var loanKey = await lenderManager.loanKeys(0);

        priorityFee = await callRpc("eth_maxPriorityFeePerGas");
        await lenderManager
        .connect(otherAccount)
        .createBorrow(
          loanKey,
          ethers.utils.parseEther("0.001"),
          addressAsBytes(MINER_ADDRESS),
          {
            maxPriorityFeePerGas: priorityFee.result,
          }
        );

        const escrowAddress = await lenderManager.escrowContracts(loanKey,0);
        console.log("Escrow Address",escrowAddress);

        const escrowContract = await ethers.getContractAt("Escrow", escrowAddress);

        return { lenderManager, escrowContract, loanKey, ORACLE_ADDRESS, MINER_ADDRESS, owner, otherAccount };
    }

    describe("Deployments", function () {
        it("Should deploy to a valid (non-address) address", async function () {
            const { escrowContract } = await loadFixture(deployEscrowFixture);

            expect(escrowContract.address).to.not.equal(0);
        })

        it("All params should be updated correctly", async function () {
            const { lenderManager, MINER_ADDRESS, escrowContract, otherAccount, owner, loanKey } = await loadFixture(deployEscrowFixture);
            
            // Param update checks
            const lender = (await escrowContract.lender()).toString();
            const borrower = (await escrowContract.borrower()).toString();
            const minerActor = (await escrowContract.minerActor()).toString();
            const loanAmount = await escrowContract.loanAmount();
            const rateAmount = await escrowContract.rateAmount();
            const withdrawInterval = await escrowContract.withdrawInterval();
            const end = await escrowContract.end();
            
            const endTime = (await lenderManager.positions(loanKey)).endTimestamp;
            const interestRate = (await lenderManager.positions(loanKey)).interestRate;
            const interest = await lenderManager.calculateInterest(ethers.utils.parseEther("0.001"), interestRate);

            expect(lender).to.equal(owner.address);
            expect(borrower).to.equal(otherAccount.address);
            // expect(minerActor).to.equal(addressAsBytes(MINER_ADDRESS).toString());
            expect(loanAmount).to.equal(interest[1]);
            expect(rateAmount).to.equal(interest[0]);
            expect(withdrawInterval).to.equal(30 * 86400);
            expect(end).to.equal(endTime);
        })
    })

    describe("Start Loan", function () {
        it("Should fail if the loan is already started", async function () {
            const { lenderManager, escrowContract } = await loadFixture(deployEscrowFixture);
        })

        it("Test start loan", async function () {
            const { lenderManager, escrowContract } = await loadFixture(deployEscrowFixture);
            await escrowContract.startLoan();
        })
    })

    describe("Transfer to miner", function () {
        it("Borrower should not be able to call the function", async function () {
            const { escrowContract } = await loadFixture(deployEscrowFixture);

            await expect(escrowContract.transferToMinerActor(10)).to.be.revertedWithCustomError(escrowContract,"Not_The_Borrower");
        })

        it("Shaould fail for invalid amount", async function () {
            const { escrowContract, otherAccount } = await loadFixture(deployEscrowFixture);

            await expect(escrowContract.connect(otherAccount).transferToMinerActor(ethers.utils.parseEther("0.003"))).to.be.revertedWithCustomError(escrowContract,"Not_Enough_Balance");
        })

        it("Should pass for correct params sent to the function", async function () {
            const { escrowContract, otherAccount } = await loadFixture(deployEscrowFixture);

            await escrowContract.connect(otherAccount).transferToMinerActor(ethers.utils.parseEther("0.0001"));
        })

    })

    describe("Transfer from miner", function () {

    })

    describe("Repay", function () {
        it("Should fail if repaying non-existant loan", async function () {
            const { escrowContract } = await loadFixture(deployEscrowFixture);

            var nextWithdraw = await escrowContract.nextWithdraw();
            console.log(nextWithdraw);

            await escrowContract.repay();

            nextWithdraw = await escrowContract.nextWithdraw();
            console.log(nextWithdraw);
        })
    })

    describe("Withdraw before Loan Start", function () {
        it("Should fail if the lender is not calling the function", async function () {
            const { escrowContract, otherAccount } = await loadFixture(deployEscrowFixture);

            // Should fail when borrower calls
            await expect(escrowContract.connect(otherAccount).withdrawBeforLoanStarts()).to.be.revertedWithCustomError(escrowContract, "Not_The_Lender");
        })

        it("Should fail if loan is already started", async function () {
            const { escrowContract } = await loadFixture(deployEscrowFixture);

            await escrowContract.startLoan();

            // Should fail when borrower calls
            await expect(escrowContract.withdrawBeforLoanStarts()).to.be.revertedWithCustomError(escrowContract, "Already_Started");
        })

        it("Should pass if conditions are correct", async function () {
            const { escrowContract } = await loadFixture(deployEscrowFixture);

            await expect(escrowContract.withdrawBeforLoanStarts()).to.emit(escrowContract, "ClosedLoan");
        })
    })

    describe("Close Loan", function () {
        it("Should fail if loan is not started", async function () {
            const { escrowContract } = await loadFixture(deployEscrowFixture);

            // deadline not reached yet
            await expect(escrowContract.closeLoan()).to.be.revertedWithCustomError(escrowContract, "Loan_Not_Expired");
        })
    })
})