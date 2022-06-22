// SPDX-License-Identifier: MIT
pragma solidity >=0.8.0;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "hardhat/console.sol";
import "contracts/WERC20.sol";

contract ERC20Bridge {

    event Deploy(address tknAddress, string tknName);
    event Mint(address indexed user, uint amount, address tknAddress);
    event TokenUnlocked(address indexed user, uint amount, address tknAddress);
    event TokenLocked(
        address indexed user, 
        uint amount, 
        address tknAddress, 
        string tknName, 
        string tknSymbol);

    mapping(address => address) public _nativeTokenToWToken;
    mapping(bytes => bool) public _txProcesed;

    function lockNativeToken(address erc20Adress, uint amount, uint targetChainID) public {
        ERC20 token = ERC20(erc20Adress);

        token.transferFrom(msg.sender, address(this), amount);

        emit TokenLocked(msg.sender, amount, erc20Adress, token.name(), token.symbol());
    }

    function burnWrappedToken(address erc20Adress, uint amount, uint targetChainID) public {
        //TODO
    }

    function claimUnlock(
        address erc20Adress, 
        uint amount,
        bytes memory txHash) public {
        //Check Validator's Signature
        require(!_txProcesed[txHash], 'This claim is already processed!'); //??

        ERC20 token = ERC20(erc20Adress);
        token.transfer(msg.sender, amount);

        emit TokenUnlocked(msg.sender, amount, erc20Adress);
    }

    function claimMint(
        uint amount, 
        address erc20OriginalAdress, 
        string memory tknName, 
        string memory tknSymbol, 
        bytes memory txHash) public {
        //Check Validator's Signature
        require(!_txProcesed[txHash], 'This claim is already processed!'); //??

        if(_nativeTokenToWToken[erc20OriginalAdress] == address(0)) {
            string memory newName = string(abi.encodePacked('W', tknName));
            string memory newSymbol = string(abi.encodePacked('W', tknSymbol));
            address deployAddr = deployWERC20(newName, newSymbol);
            _nativeTokenToWToken[erc20OriginalAdress] = deployAddr;
        }

        address wTknAddress = _nativeTokenToWToken[erc20OriginalAdress];
        WERC20 token = WERC20(wTknAddress);
        token.mint(msg.sender, amount);

        emit Mint(msg.sender, amount, wTknAddress);
    }

    function deployWERC20(string memory wTknName, string memory tknSymbol) private returns (address addr){
        bytes memory code = getByteCodeWERC20(wTknName, tknSymbol);
        assembly {
            addr := create(0, add(code, 0x20), mload(code))
        }

        emit Deploy(addr, wTknName);
    }

    function getByteCodeWERC20(string memory wTknName, string memory tknSymbol) public pure returns (bytes memory){
        bytes memory bytecode = type(WERC20).creationCode;
        return abi.encodePacked(bytecode, abi.encode(wTknName, tknSymbol));
    }
}