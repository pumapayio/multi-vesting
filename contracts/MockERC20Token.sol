pragma solidity ^0.5.17;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/token/ERC20/ERC20Detailed.sol";

contract MockERC20Token is ERC20, ERC20Detailed {

    constructor(string memory _name, string memory _symbol, uint8 _decimals, uint256 _amount)
    ERC20Detailed(_name, _symbol, _decimals)
    public
    {
        uint toMint = _amount.mul( 10 ** uint256(_decimals));
        _mint(msg.sender,toMint);
    }
}
