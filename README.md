# ERC20Bridge Solidity Project With Hardhat

ERC20Bridge is the main contract in this project. It allows the users to move tokens between chains. 
1. The user can lock his/her tokens on the chain they exist and claim their wrapped version on the other chain that the bridge is supporting.
2. The user can burn his/her wrapped tokens on the chain they are created and unlock the original tokens on the source chain.

To interact with the bridge contract you can use ERC20BridgeNextDApp https://github.com/marindraganov/ERC20BridgeNextDApp
To "move" the tokens between chains you have to prove to the bridge contract your actions on the other chain. Here, the validator is coming to validate and sign your transactions https://github.com/marindraganov/ERC20BridgeValidator
