// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

/// @title DROP — LiveBooth platform token (VeChain testnet)
contract DropToken is ERC20, Ownable {
    uint256 public constant MAX_FAUCET = 500 * 1e18;
    mapping(address => uint256) public lastFaucetAt;

    constructor() ERC20("Drop", "DROP") {
        _mint(msg.sender, 1_000_000_000 * 1e18);
    }

    /// @dev Testnet faucet — max 500 DROP per wallet per 24h
    function faucet(uint256 amount) external {
        require(amount > 0 && amount <= MAX_FAUCET, "invalid amount");
        require(block.timestamp >= lastFaucetAt[msg.sender] + 1 days, "cooldown");
        lastFaucetAt[msg.sender] = block.timestamp;
        _mint(msg.sender, amount);
    }
}
