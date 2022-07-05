const hre = require('hardhat')
const ethers = hre.ethers;

async function deployERC20Bridge() {
    await hre.run('compile'); 
    const wallet = new ethers.Wallet(process.env.PRIVATE_KEY, hre.ethers.provider);
    console.log('Deploying contracts with the account:', wallet.address, " To: ", network.name); 
    console.log('Account balance:', (await wallet.getBalance()).toString()); 

	let supportedChainIDs = [];
	let validatorPublicKey = "";
	
	if(network.name == "rinkeby") {
		supportedChainIDs = [3];
        validatorPublicKey = "0x7CE5Ce402620eF4F595E38eb6e454939FD05F0A7"
	}
    else if(network.name == "ropsten") {
		supportedChainIDs = [4];
        validatorPublicKey = "0x97D64FE7f3E5c30EdC4572B01DeDD3d927D83aE0"
	}
    else {
		console.log("Network ",network.name, " not configured!")
        return;
	}

    const ERC20Bridge = await ethers.getContractFactory("ERC20Bridge", wallet);
    const bridge = await ERC20Bridge.deploy(supportedChainIDs, validatorPublicKey);
    console.log('Waiting deployment...');
    await bridge.deployed();

    console.log('Contract address: ', bridge.address);
    console.log('Done!');
}
  
module.exports = deployERC20Bridge;