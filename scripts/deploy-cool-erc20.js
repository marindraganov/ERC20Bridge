const hre = require('hardhat')
const ethers = hre.ethers;

async function deployCoolERC20() {
    await hre.run('compile'); 
    const [deployer] = await ethers.getSigners(); 
  
    const CoolERC20 = await ethers.getContractFactory('CoolERC20');
    const coolERC20 = await CoolERC20.deploy();
    //console.log('Waiting deployment...');
    await coolERC20.deployed();

    console.log('CoolERC20 Contract address: ', coolERC20.address);
    //console.log('Done!');
	//console.log('Account balance:', (await deployer.getBalance()).toString());
}
  
module.exports = deployCoolERC20;