// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";

/// @title TipRouter — routes DROP tips with 10% platform fee
contract TipRouter is Ownable, ReentrancyGuard {
    IERC20 public immutable dropToken;
    address public platformTreasury;
    uint256 public constant PLATFORM_BPS = 1000; // 10%

    event Tip(
        address indexed from,
        address indexed dj,
        uint256 amount,
        uint256 platformFee,
        bytes32 indexed streamId
    );
    event PlatformTreasuryUpdated(address indexed treasury);

    constructor(address token, address treasury) {
        dropToken = IERC20(token);
        platformTreasury = treasury;
    }

    function setPlatformTreasury(address treasury) external onlyOwner {
        require(treasury != address(0), "invalid treasury");
        platformTreasury = treasury;
        emit PlatformTreasuryUpdated(treasury);
    }

    function tip(address dj, uint256 amount, bytes32 streamId) external nonReentrant {
        require(dj != address(0) && amount > 0, "invalid tip");
        uint256 fee = (amount * PLATFORM_BPS) / 10_000;
        uint256 toDj = amount - fee;

        dropToken.transferFrom(msg.sender, dj, toDj);
        if (fee > 0) {
            dropToken.transferFrom(msg.sender, platformTreasury, fee);
        }

        emit Tip(msg.sender, dj, amount, fee, streamId);
    }
}
