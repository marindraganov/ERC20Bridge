require("@nomiclabs/hardhat-waffle");

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

// You need to export an object to set up your config
// Go to https://hardhat.org/config/ to learn more

/**
 * @type import('hardhat/config').HardhatUserConfig
 */
module.exports = {
  solidity: "0.8.4",
};
