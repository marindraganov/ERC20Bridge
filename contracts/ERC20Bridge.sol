// SPDX-License-Identifier: MIT
pragma solidity >=0.8.0;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "hardhat/console.sol";
import "contracts/WERC20.sol";

contract ERC20Bridge is Ownable {

    event Deploy(address tknAddress, string tknName);
    event Mint(address indexed user, uint amount, address wTknAddress);
    event TokenUnlocked(address indexed user, uint amount, address tknAddress);
    event TokenBurned(address indexed user, uint amount, address nativeTknAddress);
    event TokenLocked(
        address indexed user, 
        uint amount, 
        address tknAddress, 
        string tknName, 
        string tknSymbol,
        uint tergetChainID);

    mapping(address => address) private _nativeTokenToWToken;
    mapping(address => address) private _wrappedTokenToNativeToken;
    mapping(bytes => bool) private _txProcesed;
    mapping(uint => bool) private _supportedChainIDs;

    constructor(uint[] memory supportedChainIDs) {
        for (uint i = 0; i < supportedChainIDs.length; i++) {
            _supportedChainIDs[supportedChainIDs[i]] = true;
        }
    }

    function setSupportedChain(uint chaindID, bool isSupported) public onlyOwner {
        _supportedChainIDs[chaindID] = isSupported;
    }

    function getWTokenAddress(address erc20Adress) public view returns(address adr) {
        adr = _nativeTokenToWToken[erc20Adress];
    }

    function getNativeTokenAddress(address wERC20Adress) public view returns(address adr) {
        adr = _wrappedTokenToNativeToken[wERC20Adress];
    }

    function lockNativeToken(address erc20Adress, uint amount, uint targetChainID) public {
        require(_supportedChainIDs[targetChainID] == true, "Not supported chain!");

        ERC20 token = ERC20(erc20Adress);

        token.transferFrom(msg.sender, address(this), amount);

        emit TokenLocked(msg.sender, amount, erc20Adress, token.name(), token.symbol(), targetChainID);
    }

    function burnWrappedToken(address wERC20Adress, uint amount) public {
        require(_wrappedTokenToNativeToken[wERC20Adress] != address(0), "Not a wrapped token");
        WERC20 wTokenContract = WERC20(wERC20Adress);
        wTokenContract.burn(msg.sender, amount);
        address nativeTknAddress = _wrappedTokenToNativeToken[wERC20Adress];

        emit TokenBurned(msg.sender, amount, nativeTknAddress);
    }

    function claimUnlock(
        uint amount,
        address erc20Adress,
        bytes memory txHash) public {
        //Check Validator's Signature
        require(!_txProcesed[txHash], 'This claim is already processed!');

        _txProcesed[txHash] = true;

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
        require(!_txProcesed[txHash], 'This claim is already processed!');

        _txProcesed[txHash] = true;

        if(_nativeTokenToWToken[erc20OriginalAdress] == address(0)) {
            string memory newName = string(abi.encodePacked('W', tknName));
            string memory newSymbol = string(abi.encodePacked('W', tknSymbol));
            address deployAddr = deployWERC20(newName, newSymbol);
            _nativeTokenToWToken[erc20OriginalAdress] = deployAddr;
            _wrappedTokenToNativeToken[deployAddr] = erc20OriginalAdress;
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