const hre = require('hardhat')
const ethers = hre.ethers;

async function deployCoolERC20() {
    await hre.run('compile'); 
    const [deployer] = await ethers.getSigners(); 
  
    //console.log('Deploying contracts with the account:', deployer.address); 
    //console.log('Account balance:', (await deployer.getBalance()).toString()); 

    const CoolERC20 = await ethers.getContractFactory('CoolERC20');
    const coolERC20 = await CoolERC20.deploy('CoolToken', 'COOL');
    //console.log('Waiting deployment...');
    await coolERC20.deployed();

    console.log('CoolERC20 Contract address: ', coolERC20.address);
    //console.log('Done!');
	//console.log('Account balance:', (await deployer.getBalance()).toString());
}
  
module.exports = deployCoolERC20;