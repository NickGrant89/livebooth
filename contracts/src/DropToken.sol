// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

/// @title DROP — LiveBooth platform token
/// @dev 1B max supply. Testnet-only faucet when enabled at deploy.
contract DropToken is ERC20, Ownable {
    uint256 public constant MAX_SUPPLY = 1_000_000_000 * 1e18;
    uint256 public constant MAX_FAUCET = 500 * 1e18;

    bool public immutable faucetEnabled;
    mapping(address => uint256) public lastFaucetAt;

    constructor(bool _faucetEnabled) ERC20("Drop", "DROP") {
        faucetEnabled = _faucetEnabled;
        _mint(msg.sender, MAX_SUPPLY);
    }

    function _mint(address account, uint256 amount) internal override {
        require(totalSupply() + amount <= MAX_SUPPLY, "max supply exceeded");
        super._mint(account, amount);
    }

    /// @dev Testnet faucet — disabled on mainnet deploys
    function faucet(uint256 amount) external {
        require(faucetEnabled, "faucet disabled");
        require(amount > 0 && amount <= MAX_FAUCET, "invalid amount");
        require(block.timestamp >= lastFaucetAt[msg.sender] + 1 days, "cooldown");
        lastFaucetAt[msg.sender] = block.timestamp;
        _mint(msg.sender, amount);
    }
}
