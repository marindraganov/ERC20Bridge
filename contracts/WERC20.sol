// SPDX-License-Identifier: MIT

pragma solidity >=0.8.0;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

contract WERC20 is ERC20, Ownable {
    event Mint(address to, uint amount);
    event Burn(address to, uint amount);

    constructor(string memory tokenName, string memory tokenSymbol) ERC20(tokenName, tokenSymbol) {

    }

    function mint(address to, uint amount) public onlyOwner {
        _mint(to, amount);

        emit Mint(to, amount);
    }

    function burn(address from, uint amount) public onlyOwner {
        _burn(from, amount);

        emit Burn(from, amount);
    }
}