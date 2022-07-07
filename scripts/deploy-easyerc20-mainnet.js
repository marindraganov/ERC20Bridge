const hre = require('hardhat')
const ethers = hre.ethers;

async function deployEasyERC20() {
    await hre.run('compile');
	
    const wallet = new ethers.Wallet(process.env.PRIVATE_KEY, hre.ethers.provider);
    console.log('Deploying contracts with the account:', wallet.address); 
    console.log('Account balance:', (await wallet.getBalance()).toString()); 

    const EasyERC20 = await ethers.getContractFactory("EasyERC20", wallet);
    const easyERC20 = await EasyERC20.deploy();
    console.log('Waiting deployment...');
    await easyERC20.deployed();

    console.log('EasyERC20 contract address: ', easyERC20.address);
    console.log('Done!');
}
  
module.exports = deployEasyERC20;