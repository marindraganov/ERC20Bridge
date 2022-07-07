require('dotenv').config();
require("@nomiclabs/hardhat-waffle");
require("solidity-coverage");

// This is a sample Hardhat task. To learn how to create your own go to
// https://hardhat.org/guides/create-task.html
task("accounts", "Prints the list of accounts", async (taskArgs, hre) => {
  const accounts = await hre.ethers.getSigners();

  for (const account of accounts) {
    console.log(account.address);
  }
});

task("deploy-testnet", "Deploys contract on a provided network")
    .setAction(async () => {
        const libraryContract = require("./scripts/deploy");
        await libraryContract();
});

task("deploy-cool-erc20", "Deploys contract on a provided network")
    .setAction(async () => {
        const coolERC20 = require("./scripts/deploy-cool-erc20");
        await coolERC20();
});

task("deploy-bridge-mainnet", "Deploys contract on a provided network")
	.setAction(async ({}) => {
		const deployERC20Bridge = require("./scripts/deploy-bridge-mainnet");
		await deployERC20Bridge();
});

task("deploy-coolerc20-mainnet", "Deploys contract on a provided network")
	.setAction(async ({}) => {
		const deployCoolERC20 = require("./scripts/deploy-coolerc20-mainnet");
		await deployCoolERC20();
});

task("deploy-easyerc20-mainnet", "Deploys contract on a provided network")
	.setAction(async ({}) => {
		const deployEasyERC20 = require("./scripts/deploy-easyerc20-mainnet");
		await deployEasyERC20();
});

// You need to export an object to set up your config
// Go to https://hardhat.org/config/ to learn more

/**
 * @type import('hardhat/config').HardhatUserConfig
 */
module.exports = {
  solidity:  {
		version: "0.8.4",
	},
  networks: {
		rinkeby: {
			url: "https://rinkeby.infura.io/v3/310cd3dfc7aa4145a10b689ee5bfa044",
			accounts: [process.env.PRIVATE_KEY]
		},
    ropsten: {
			url: "https://ropsten.infura.io/v3/310cd3dfc7aa4145a10b689ee5bfa044",
			accounts: [process.env.PRIVATE_KEY]
		}
	},
};
