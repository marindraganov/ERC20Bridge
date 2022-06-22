// SPDX-License-Identifier: MIT

pragma solidity >=0.8.0;

import "@openzeppelin/contracts/token/ERC20/presets/ERC20PresetMinterPauser.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

contract CoolERC20 is ERC20PresetMinterPauser {

    constructor() ERC20PresetMinterPauser("CoolERC20", "COOL") {
    }
}