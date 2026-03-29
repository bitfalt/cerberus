// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "./CerberusVault.sol";

contract CerberusVaultFactory {
    address public cerberusSigner;
    uint256 public recoveryDelay;

    mapping(address => address) public vaultByOwner;

    event VaultCreated(address indexed owner, address indexed vault, address indexed recoveryAddress);
    event CerberusSignerUpdated(address indexed oldSigner, address indexed newSigner);
    event RecoveryDelayUpdated(uint256 oldDelay, uint256 newDelay);

    constructor(address _cerberusSigner, uint256 _recoveryDelay) {
        require(_cerberusSigner != address(0), "Signer required");
        cerberusSigner = _cerberusSigner;
        recoveryDelay = _recoveryDelay;
    }

    function createVault(address recoveryAddress) external returns (address vaultAddress) {
        require(recoveryAddress != address(0), "Recovery required");
        require(vaultByOwner[msg.sender] == address(0), "Vault exists");

        CerberusVault vault = new CerberusVault(msg.sender, recoveryAddress, cerberusSigner, recoveryDelay);
        vaultAddress = address(vault);
        vaultByOwner[msg.sender] = vaultAddress;

        emit VaultCreated(msg.sender, vaultAddress, recoveryAddress);
    }

    function setCerberusSigner(address newSigner) external {
        require(msg.sender == cerberusSigner, "Cerberus only");
        require(newSigner != address(0), "Signer required");

        address oldSigner = cerberusSigner;
        cerberusSigner = newSigner;
        emit CerberusSignerUpdated(oldSigner, newSigner);
    }

    function setRecoveryDelay(uint256 newDelay) external {
        require(msg.sender == cerberusSigner, "Cerberus only");
        uint256 oldDelay = recoveryDelay;
        recoveryDelay = newDelay;
        emit RecoveryDelayUpdated(oldDelay, newDelay);
    }
}
