// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/ERC20Burnable.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/ERC20Permit.sol";

contract Carrot is ERC20, ERC20Burnable, Ownable, ERC20Permit {
    constructor(address initialOwner)
        ERC20("Carrot", "CRT")
        Ownable()
        ERC20Permit("Carrot")
    {
        _mint(msg.sender, 11000 * 10 ** decimals());
        transferOwnership(initialOwner);

    }

    function mint(address to, uint256 amount) public onlyOwner {
        _mint(to, amount);
    }
}
