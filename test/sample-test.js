const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("ERC20Bridge", function () {
    let bridge;
	let coolERC20;
    let owner;
    let user1;

    before(async () => {
        let bridgeFactory = await ethers.getContractFactory("ERC20Bridge");
        bridge = await bridgeFactory.deploy();
        let coolERC20Factory = await ethers.getContractFactory("CoolERC20");
        coolERC20 = await coolERC20Factory.deploy();
        [owner, user1] = await ethers.getSigners();

        await bridge.deployed();
        await coolERC20.deployed();
    });

    it("Lock token", async function () {
        const mintTx =  await coolERC20.mint(user1.address, 1000);
        const approveTx = await coolERC20.connect(user1).approve(bridge.address, 1000);

        const lockTx = await bridge.connect(user1).lockNativeToken(coolERC20.address, 1000, 2);
        
        expect(await coolERC20.balanceOf(user1.address)).to.equal(0);
        expect(await coolERC20.balanceOf(bridge.address)).to.equal(1000);
    });
});
