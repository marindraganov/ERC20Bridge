const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("ERC20Bridge", function () {
    const supportedChainID = 123;
    let bridge;
	let coolERC20;
    let owner;
    let user1;
    let validator;
    let chainId;

    before(async () => {
        [owner, user1, validator] = await ethers.getSigners();
        const network = await ethers.getDefaultProvider().getNetwork();
        chainId = network.chainId;
    });

    beforeEach(async () => {
        let bridgeFactory = await ethers.getContractFactory("ERC20Bridge");
        bridge = await bridgeFactory.deploy([supportedChainID], validator.address);
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

        await claimMint(lockAmount, txHash, user1, validator, coolERC20, chainId, bridge);

        const wrappedTokenAddress = await bridge.getWTokenAddress(coolERC20.address, chainId);
        expect(wrappedTokenAddress).to.not.equal(ethers.utils.getAddress('0x0000000000000000000000000000000000000000'));

        const wrappedTokenContract = await ethers.getContractAt('WERC20', wrappedTokenAddress);
        const userWrappedTokenBalance = await wrappedTokenContract.balanceOf(user1.address);
        expect(userWrappedTokenBalance).to.equal(lockAmount);
    });

    it("Claim Mint: Mint token that is already creted", async function () {
        const lockAmount = 1000;
        const txHash = ethers.utils.keccak256(ethers.utils.formatBytes32String('Ramdom text to be hashed'));

        await claimMint(lockAmount, txHash, user1, validator, coolERC20, chainId, bridge);

        const txHash2 = ethers.utils.keccak256(ethers.utils.formatBytes32String('Some other text to be hashed'));

        await claimMint(lockAmount, txHash2, user1, validator, coolERC20, chainId, bridge);

        const wrappedTokenAddress = await bridge.getWTokenAddress(coolERC20.address, chainId);
        const wrappedTokenContract = await ethers.getContractAt('WERC20', wrappedTokenAddress);
        const userWrappedTokenBalance = await wrappedTokenContract.balanceOf(user1.address);
        expect(userWrappedTokenBalance).to.equal(2 * lockAmount);
    });

    it("Claim Mint Fail: Duplicated Tx Hash", async function () {
        const lockAmount = 1000;
        const txHash = ethers.utils.keccak256(ethers.utils.formatBytes32String('Ramdom text to be hashed'));

        await claimMint(lockAmount, txHash, user1, validator, coolERC20, chainId, bridge);

        await expect(claimMint(lockAmount, txHash, user1, validator, coolERC20, chainId, bridge))
            .to.be.revertedWith("This claim is already processed!");
    });

    it("Claim Mint Fail: Invalid Signature", async function () {
        const lockAmount = 1000;
        const txHash = ethers.utils.keccak256(ethers.utils.formatBytes32String('Ramdom text to be hashed'));

        await bridge.setValidatorPublicKey(ethers.utils.getAddress('0x0000000000000000000000000000000000000000'))

        await expect(claimMint(lockAmount, txHash, user1, validator, coolERC20, chainId, bridge))
            .to.be.revertedWith("Invalid claim signature!");
    });

    it("Burn Wrapped Tokens", async function () {
        const lockAmount = 1000;
        const txHash = ethers.utils.keccak256(ethers.utils.formatBytes32String('Ramdom text to be hashed'));

        await claimMint(lockAmount, txHash, user1, validator, coolERC20, chainId, bridge);

        const wrappedTokenAddress = await bridge.getWTokenAddress(coolERC20.address, chainId);
        const wrappedTokenContract = await ethers.getContractAt('WERC20', wrappedTokenAddress);
        expect(await wrappedTokenContract.balanceOf(user1.address)).to.equal(lockAmount);

        const burnAmount = 600;
        await bridge.connect(user1).burnWrappedToken(wrappedTokenAddress, burnAmount);
        expect(await wrappedTokenContract.balanceOf(user1.address)).to.equal(lockAmount - burnAmount);
    });

    it("Burn Wrapped Tokens Fail: Not a wrapped token!", async function () {
        const wrappedTokenAddress = user1.address
        const burnAmount = 600;

        await expect(bridge.connect(user1).burnWrappedToken(wrappedTokenAddress, burnAmount))
            .to.be.revertedWith("Not a wrapped token!");
    });

    it("Claim Unlock", async function () {
        const unlockAmount = 1000;
        const txHash = ethers.utils.keccak256(ethers.utils.formatBytes32String('Ramdom text to be hashed'));
        const mintTx =  await coolERC20.mint(bridge.address, unlockAmount);

        await claimUnlock (unlockAmount, txHash, user1, validator, coolERC20, bridge)

        const userCoolTokenBalance = await coolERC20.balanceOf(user1.address);
        expect(userCoolTokenBalance).to.equal(unlockAmount);
    });

    it("Claim Unlock Fail: Invalid claim signature!", async function () {
        const unlockAmount = 1000;
        const txHash = ethers.utils.keccak256(ethers.utils.formatBytes32String('Ramdom text to be hashed'));
        const signer = user1;
        
        await expect(claimUnlock (unlockAmount, txHash, user1, signer, coolERC20, bridge))
            .to.be.revertedWith("Invalid claim signature!");
    });

    it("Claim Unlock Fail: Duplicated Tx Hash", async function () {
        const unlockAmount = 1000;
        const txHash = ethers.utils.keccak256(ethers.utils.formatBytes32String('Ramdom text to be hashed'));
        const mintTx =  await coolERC20.mint(bridge.address, unlockAmount);

        await claimUnlock (unlockAmount, txHash, user1, validator, coolERC20, bridge)

        await expect(claimUnlock (unlockAmount, txHash, user1, validator, coolERC20, bridge))
            .to.be.revertedWith("This claim is already processed!");
    });
});

async function claimMint (amount, txHash, user, signer, token, nativeChainId, bridge) {
    const tknName = await token.name()
    const tknSymbol = await token.symbol()
    const claimHash = await bridge.getMintClaimHash(user.address, amount, token.address, nativeChainId, tknName, tknSymbol, txHash)

    const sig = await signer.signMessage(ethers.utils.arrayify(claimHash));
    const sigSplit = await ethers.utils.splitSignature(sig);

    await bridge.connect(user).claimMint(amount, token.address, nativeChainId, tknName, tknSymbol, txHash, sigSplit.v, sigSplit.r, sigSplit.s);
}

async function claimUnlock (amount, txHash, user, signer, token, bridge) {
    const tknName = await token.name()
    const tknSymbol = await token.symbol()
    const claimHash = await bridge.getUnlockClaimHash(user.address, amount, token.address, txHash)

    const sig = await signer.signMessage(ethers.utils.arrayify(claimHash));
    const sigSplit = await ethers.utils.splitSignature(sig);

    await bridge.connect(user).claimUnlock(amount, token.address, txHash, sigSplit.v, sigSplit.r, sigSplit.s);
}

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