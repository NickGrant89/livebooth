// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";

/// @title AchievementVault — DROP rewards claimed with server-signed vouchers
contract AchievementVault is Ownable, ReentrancyGuard {
    IERC20 public immutable dropToken;
    address public claimSigner;
    mapping(bytes32 => bool) public claimed;

    event RewardClaimed(address indexed user, bytes32 indexed claimId, uint256 amount);
    event ClaimSignerUpdated(address indexed signer);

    constructor(address token, address signer) {
        dropToken = IERC20(token);
        claimSigner = signer;
    }

    function setClaimSigner(address signer) external onlyOwner {
        require(signer != address(0), "invalid signer");
        claimSigner = signer;
        emit ClaimSignerUpdated(signer);
    }

    function fund(uint256 amount) external {
        dropToken.transferFrom(msg.sender, address(this), amount);
    }

    function claim(
        bytes32 claimId,
        uint256 amount,
        uint256 deadline,
        bytes calldata signature
    ) external nonReentrant {
        require(!claimed[claimId], "already claimed");
        require(block.timestamp <= deadline, "expired");
        require(amount > 0, "invalid amount");

        bytes32 claimHash = keccak256(abi.encode(msg.sender, claimId, amount, deadline));
        bytes32 digest = keccak256(abi.encodePacked("\x19Ethereum Signed Message:\n32", claimHash));
        address recovered = ECDSA.recover(digest, signature);
        require(recovered == claimSigner, "bad signature");

        claimed[claimId] = true;
        dropToken.transfer(msg.sender, amount);
        emit RewardClaimed(msg.sender, claimId, amount);
    }
}
