// SPDX-License-Identifier: MIT

pragma solidity >=0.8.0;

import "@openzeppelin/contracts/token/ERC20/extensions/draft-ERC20Permit.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

contract EasyERC20 is ERC20, ERC20Permit, Ownable {

    constructor() ERC20("EasyERC20", "COOL") ERC20Permit("EasyERC20") {
        _mint(msg.sender, 1000 * (10**18));
    }

    function mint(address addressTo, uint amount) public onlyOwner {
        _mint(addressTo, amount);
    }
}