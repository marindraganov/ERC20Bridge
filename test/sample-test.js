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

    it("Lock Token With Permit", async function () {
        const lockAmount = 1000;
        const easyERC20Factory = await ethers.getContractFactory("EasyERC20");
        const easyERC20 = await easyERC20Factory.deploy();
        await easyERC20.deployed();

        const mintTx =  await easyERC20.mint(user1.address, lockAmount);

        const deadline = ethers.constants.MaxInt256;
        
        const { v, r, s } = await getPermitSignature(
            user1,
            easyERC20,
            bridge.address,
            lockAmount,
            deadline
          )

        //   function lockNativeTokenWithPermit(
        //     address erc20Adress, 
        //     uint amount, 
        //     uint targetChainID, 
        //     uint deadline,
        //     uint8 v,
        //     bytes32 r,
        //     bytes32 s)
        const lockTx = await bridge.connect(user1)
           .lockNativeTokenWithPermit(easyERC20.address, lockAmount, supportedChainID, deadline, v, r, s);
        
        expect(await easyERC20.balanceOf(user1.address)).to.equal(0);
        expect(await easyERC20.balanceOf(bridge.address)).to.equal(1000);
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
        const wrappedToNativeMapping = await bridge.getNativeTokenAddress(wrappedTokenAddress);
        expect(wrappedToNativeMapping).to.equal(coolERC20.address);

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

async function getPermitSignature(
    wallet,
    token,
    spender,
    value,
    deadline) {
    const [nonce, name, version, chainId] = await Promise.all([
      token.nonces(wallet.address),
      token.name(),
      '1',
      wallet.getChainId(),
    ])
  
    return ethers.utils.splitSignature(
      await wallet._signTypedData(
        {
          name,
          version,
          chainId,
          verifyingContract: token.address,
        },
        {
          Permit: [
            {
              name: 'owner',
              type: 'address',
            },
            {
              name: 'spender',
              type: 'address',
            },
            {
              name: 'value',
              type: 'uint256',
            },
            {
              name: 'nonce',
              type: 'uint256',
            },
            {
              name: 'deadline',
              type: 'uint256',
            },
          ],
        },
        {
          owner: wallet.address,
          spender,
          value,
          nonce,
          deadline,
        }
      )
    )
  }