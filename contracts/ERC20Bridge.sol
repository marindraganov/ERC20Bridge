// SPDX-License-Identifier: MIT
pragma solidity >=0.8.0;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/draft-IERC20Permit.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "hardhat/console.sol";
import "contracts/WERC20.sol";

contract ERC20Bridge is Ownable {

    event Deploy(address tknAddress, string tknName);
    event Mint(address indexed user, uint amount, address wTknAddress);
    event TokenUnlocked(address indexed user, uint amount, address tknAddress);
    event TokenBurned(address indexed user, uint amount, address nativeTknAddress, uint nativeChainId);
    event TokenLocked(
        address indexed user, 
        uint amount, 
        address tknAddress, 
        string tknName, 
        string tknSymbol,
        uint targetChainID);

    address private _validatorAddress;
    mapping(bytes32 => bool) private _txProcesed;
    mapping(uint => bool) private _supportedChainIDs;
    mapping(address => mapping(uint => address)) private _nativeTokenToWToken;
    mapping(address => address) private _wrappedTokenToNativeToken;
    mapping(address => uint) private _wrappedTokenToNativeChainId;

    constructor(uint[] memory supportedChainIDs, address validatorAddress) {
        for (uint i = 0; i < supportedChainIDs.length; i++) {
            _supportedChainIDs[supportedChainIDs[i]] = true;
        }

        _validatorAddress = validatorAddress;
    }

    function setValidatorPublicKey(address validatorAddress) public onlyOwner {
        _validatorAddress = validatorAddress;
    }

    function setSupportedChain(uint chaindID, bool isSupported) public onlyOwner {
        _supportedChainIDs[chaindID] = isSupported;
    }

    function isWrappedToken(address erc20Adress) public view returns(bool isWrapped) {
        isWrapped = _wrappedTokenToNativeToken[erc20Adress] != address(0);
    }

    function getWTokenAddress(address erc20Adress, uint nativeChainId) public view returns(address adr) {
        adr = _nativeTokenToWToken[erc20Adress][nativeChainId];
    }

    function lockNativeTokenWithPermit(
        address erc20Adress, 
        uint256 amount, 
        uint targetChainID, 
        uint256 deadline,
        uint8 v,
        bytes32 r,
        bytes32 s) public {

        IERC20Permit token = IERC20Permit(erc20Adress);
        
        token.permit(msg.sender, address(this), amount, deadline, v, r, s);

        lockNativeToken(erc20Adress, amount, targetChainID);
    }

    function lockNativeToken(address erc20Adress, uint amount, uint targetChainID) public {
        require(_supportedChainIDs[targetChainID] == true, "Not supported chain!");

        ERC20 token = ERC20(erc20Adress);

        token.transferFrom(msg.sender, address(this), amount);

        emit TokenLocked(msg.sender, amount, erc20Adress, token.name(), token.symbol(), targetChainID);
    }

    function burnWrappedToken(address wERC20Adress, uint amount) public {
        require(_wrappedTokenToNativeToken[wERC20Adress] != address(0), "Not a wrapped token!");
        WERC20 wTokenContract = WERC20(wERC20Adress);
        wTokenContract.burn(msg.sender, amount);
        address nativeTknAddress = _wrappedTokenToNativeToken[wERC20Adress];
        uint nativeChainId = _wrappedTokenToNativeChainId[wERC20Adress];

        emit TokenBurned(msg.sender, amount, nativeTknAddress, nativeChainId);
    }

    function claimUnlock(
        uint amount,
        address erc20Adress,
        bytes32 txHash,
        uint8 v,
        bytes32 r,
        bytes32 s) public {
        require(!_txProcesed[txHash], 'This claim is already processed!');
        _txProcesed[txHash] = true;

        bytes32 claimHash = getUnlockClaimHash(msg.sender, amount, erc20Adress, txHash);
        address signer = getSigner(claimHash, v, r, s);
        require(signer == _validatorAddress, 'Invalid claim signature!');

        ERC20 token = ERC20(erc20Adress);
        token.transfer(msg.sender, amount);

        emit TokenUnlocked(msg.sender, amount, erc20Adress);
    }

    function claimMint(
        uint amount, 
        address erc20OriginalAdress,
        uint nativeChainId,
        string memory tknName, 
        string memory tknSymbol, 
        bytes32 txHash,
        uint8 v,
        bytes32 r,
        bytes32 s) public {
        require(!_txProcesed[txHash], 'This claim is already processed!');
         _txProcesed[txHash] = true;

        bytes32 claimHash = getMintClaimHash(msg.sender, amount, erc20OriginalAdress, nativeChainId, tknName, tknSymbol, txHash);
        address signer = getSigner(claimHash, v, r, s);
        require(signer == _validatorAddress, 'Invalid claim signature!');

        if(_nativeTokenToWToken[erc20OriginalAdress][nativeChainId] == address(0)) {
            string memory newName = string(abi.encodePacked('W', tknName));
            string memory newSymbol = string(abi.encodePacked('W', tknSymbol));
            address deployAddr = deployWERC20(newName, newSymbol);
            console.log(deployAddr);
            _nativeTokenToWToken[erc20OriginalAdress][nativeChainId] = deployAddr;
            _wrappedTokenToNativeToken[deployAddr] = erc20OriginalAdress;
            _wrappedTokenToNativeChainId[deployAddr] = nativeChainId;

        }

        address wTknAddress = _nativeTokenToWToken[erc20OriginalAdress][nativeChainId];
        WERC20 token = WERC20(wTknAddress);
        token.mint(msg.sender, amount);

        emit Mint(msg.sender, amount, wTknAddress);
    }

    function getMintClaimHash(
        address user, 
        uint amount,
        address tknAddress,
        uint nativeChainId,
        string memory tknName, 
        string memory tknSymbol,
        bytes32 txHash) public pure returns (bytes32) {

        return keccak256(abi.encodePacked("claimMint", user, amount, tknAddress, nativeChainId, tknName, tknSymbol, txHash));
    }

    function getUnlockClaimHash(
        address user, 
        uint amount, 
        address nativeTknAddress,
        bytes32 txHash) public pure returns (bytes32) {

        return keccak256(abi.encodePacked("claimUnlock", user, amount, nativeTknAddress, txHash));
    }

    function getSigner(bytes32 messageHash, uint8 v, bytes32 r, bytes32 s) public pure returns (address) {
        bytes memory prefix = "\x19Ethereum Signed Message:\n32";
        bytes32 prefixedHashMessage = keccak256(abi.encodePacked(prefix, messageHash));
        address signer = ecrecover(prefixedHashMessage, v, r, s);
        return signer;
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