const hre = require('hardhat')
const ethers = hre.ethers;

async function deployCoolERC20() {
    await hre.run('compile');
	
    const wallet = new ethers.Wallet(process.env.PRIVATE_KEY, hre.ethers.provider);
    console.log('Deploying contracts with the account:', wallet.address); 
    console.log('Account balance:', (await wallet.getBalance()).toString()); 

    const CoolERC20 = await ethers.getContractFactory("CoolERC20", wallet);
    const coolERC20 = await CoolERC20.deploy();
    console.log('Waiting deployment...');
    await coolERC20.deployed();

    console.log('CoolERC20 contract address: ', coolERC20.address);
    console.log('Done!');
}
  
module.exports = deployCoolERC20;