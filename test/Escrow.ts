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

        var escrow = "";

        lenderManager.on(
            "BorrowOrder",
            async (
            escrowAddress: string,
            loanAmount: number,
            lenderAmountAvailable: number,
            startBlock: number,
            amountToPay: number,
            key: number,
            minerActor: any
            ) => {
            escrow = escrowAddress;
            console.log("Escrow Address deployed at ", escrow);
            }
        );

        return { lenderManager, ORACLE_ADDRESS, MINER_ADDRESS, owner, otherAccount };
    }

    describe("Deployments", function () {
        it("Should deploy to a valid address", async function () {
            const { lenderManager } = await loadFixture(deployEscrowFixture);
        })
    })
})