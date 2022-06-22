const hre = require('hardhat')
const ethers = hre.ethers;

async function deployERC20Bridge() {
    await hre.run('compile'); // We are compiling the contracts using subtask
    const [deployer] = await ethers.getSigners(); // We are getting the deployer
  
    console.log('Deploying contracts with the account:', deployer.address); // We are printing the address of the deployer
    console.log('Account balance:', (await deployer.getBalance()).toString()); // We are printing the account balance

    const ERC20Bridge = await ethers.getContractFactory('ERC20Bridge');
    const bridge = await ERC20Bridge.deploy();
    console.log('Waiting deployment...');
    await bridge.deployed();

    console.log('ERC20Bridge Contract address: ', bridge.address);
    console.log('Done!');
	console.log('Account balance:', (await deployer.getBalance()).toString());
}
  
module.exports = deployERC20Bridge;