const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("ERC20Bridge", function () {
    const supportedChainID = 123;
    let bridge;
	let coolERC20;
    let owner;
    let user1;

    before(async () => {
        [owner, user1] = await ethers.getSigners();
    });

    beforeEach(async () => {
        let bridgeFactory = await ethers.getContractFactory("ERC20Bridge");
        bridge = await bridgeFactory.deploy([supportedChainID]);
        let coolERC20Factory = await ethers.getContractFactory("CoolERC20");
        coolERC20 = await coolERC20Factory.deploy();

        await bridge.deployed();
        await coolERC20.deployed();
    });

    it("Lock Token", async function () {
        const lockAmount = 1000;
        const mintTx =  await coolERC20.mint(user1.address, lockAmount);
        const approveTx = await coolERC20.connect(user1).approve(bridge.address, lockAmount);

        const lockTx = await bridge.connect(user1).lockNativeToken(coolERC20.address, lockAmount, supportedChainID);
        
        expect(await coolERC20.balanceOf(user1.address)).to.equal(0);
        expect(await coolERC20.balanceOf(bridge.address)).to.equal(lockAmount);
    });

    it("Lock Token Fail: Not supproted chain", async function () {
        await bridge.setSupportedChain(supportedChainID, false);

        await expect(bridge.connect(user1).lockNativeToken(coolERC20.address, 50, supportedChainID))
            .to.be.revertedWith("Not supported chain!");
    });

    it("Claim Mint", async function () {
        const lockAmount = 1000;
        const txHash = ethers.utils.keccak256(ethers.utils.formatBytes32String('Ramdom text to be hashed'));
        
        await bridge.connect(user1).claimMint(lockAmount, coolERC20.address, coolERC20.name(), coolERC20.symbol(), txHash);

        const wrappedTokenAddress = await bridge.getWTokenAddress(coolERC20.address);
        expect(wrappedTokenAddress).to.not.equal(ethers.utils.getAddress('0x0000000000000000000000000000000000000000'));

        const wrappedTokenContract = await ethers.getContractAt('WERC20', wrappedTokenAddress);
        const userWrappedTokenBalance = await wrappedTokenContract.balanceOf(user1.address);
        expect(userWrappedTokenBalance).to.equal(lockAmount);
    });

    it("Claim Mint Fail: Duplicated Tx Hash", async function () {
        const lockAmount = 1000;
        const txHash = ethers.utils.keccak256(ethers.utils.formatBytes32String('Ramdom text to be hashed'));

        await bridge.connect(user1).claimMint(lockAmount, coolERC20.address, coolERC20.name(), coolERC20.symbol(), txHash);

        await expect(bridge.connect(user1).claimMint(lockAmount, coolERC20.address, coolERC20.name(), coolERC20.symbol(), txHash))
            .to.be.revertedWith("This claim is already processed!");
    });

    it("Burn Wrapped Token", async function () {
        const lockAmount = 1000;
        const txHash = ethers.utils.keccak256(ethers.utils.formatBytes32String('Ramdom text to be hashed'));

        await bridge.connect(user1).claimMint(lockAmount, coolERC20.address, coolERC20.name(), coolERC20.symbol(), txHash);

        const wrappedTokenAddress = await bridge.getWTokenAddress(coolERC20.address);
        const wrappedTokenContract = await ethers.getContractAt('WERC20', wrappedTokenAddress);
        expect(await wrappedTokenContract.balanceOf(user1.address)).to.equal(lockAmount);

        const burnAmount = 600;
        await bridge.connect(user1).burnWrappedToken(wrappedTokenAddress, burnAmount);
        expect(await wrappedTokenContract.balanceOf(user1.address)).to.equal(lockAmount - burnAmount);
    });

    it("Claim Unlock", async function () {
        const unlockAmount = 1000;
        const txHash = ethers.utils.keccak256(ethers.utils.formatBytes32String('Ramdom text to be hashed'));
        const mintTx =  await coolERC20.mint(bridge.address, unlockAmount);

        await bridge.connect(user1).claimUnlock(unlockAmount, coolERC20.address, txHash);

        const userCoolTokenBalance = await coolERC20.balanceOf(user1.address);
        expect(userCoolTokenBalance).to.equal(unlockAmount);
    });

    it("Claim Unlock Fail: Duplicated Tx Hash", async function () {
        const unlockAmount = 1000;
        const txHash = ethers.utils.keccak256(ethers.utils.formatBytes32String('Ramdom text to be hashed'));
        const mintTx =  await coolERC20.mint(bridge.address, unlockAmount);

        await bridge.connect(user1).claimUnlock(unlockAmount, coolERC20.address, txHash);

        await expect(bridge.connect(user1).claimUnlock(unlockAmount, coolERC20.address, txHash))
            .to.be.revertedWith("This claim is already processed!");
    });
});
