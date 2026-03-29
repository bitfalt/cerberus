// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

interface IERC20 {
    function transfer(address to, uint256 amount) external returns (bool);
    function transferFrom(address from, address to, uint256 amount) external returns (bool);
    function approve(address spender, uint256 amount) external returns (bool);
}

contract CerberusVault {
    struct ExecutionAuthorization {
        address vault;
        string proposalId;
        bytes32 proposalHash;
        address adapter;
        address tokenIn;
        address tokenOut;
        uint256 amountIn;
        uint256 minAmountOut;
        bytes32 callDataHash;
        uint256 nonce;
        uint256 validAfter;
        uint256 validUntil;
        bytes32 policyHash;
    }

    struct WithdrawalAuthorization {
        address vault;
        address token;
        address to;
        uint256 amount;
        uint256 nonce;
        uint256 validAfter;
        uint256 validUntil;
        bytes32 policyHash;
    }

    struct RecoveryAuthorization {
        address vault;
        address recoveryAddress;
        uint256 nonce;
        uint256 validAfter;
        uint256 validUntil;
        bytes32 policyHash;
    }

    bytes32 private constant EIP712_DOMAIN_TYPEHASH = keccak256(
        "EIP712Domain(string name,string version,uint256 chainId,address verifyingContract)"
    );
    bytes32 private constant EXECUTION_AUTHORIZATION_TYPEHASH = keccak256(
        "ExecutionAuthorization(address vault,string proposalId,bytes32 proposalHash,address adapter,address tokenIn,address tokenOut,uint256 amountIn,uint256 minAmountOut,bytes32 callDataHash,uint256 nonce,uint256 validAfter,uint256 validUntil,bytes32 policyHash)"
    );
    bytes32 private constant WITHDRAWAL_AUTHORIZATION_TYPEHASH = keccak256(
        "WithdrawalAuthorization(address vault,address token,address to,uint256 amount,uint256 nonce,uint256 validAfter,uint256 validUntil,bytes32 policyHash)"
    );
    bytes32 private constant RECOVERY_AUTHORIZATION_TYPEHASH = keccak256(
        "RecoveryAuthorization(address vault,address recoveryAddress,uint256 nonce,uint256 validAfter,uint256 validUntil,bytes32 policyHash)"
    );
    bytes32 private constant NAME_HASH = keccak256(bytes("CerberusVault"));
    bytes32 private constant VERSION_HASH = keccak256(bytes("1"));

    address public owner;
    address public recoveryAddress;
    address public cerberusSigner;
    bool public paused;
    uint256 public immutable recoveryDelay;
    bytes32 public immutable domainSeparator;

    mapping(uint256 => bool) public usedNonces;
    mapping(uint256 => uint256) public recoveryExecutableAt;
    mapping(address => bool) public allowedAdapters;
    mapping(address => bool) public allowedTokens;
    mapping(address => bool) public allowedRecipients;

    event VaultCreated(address indexed owner, address indexed recoveryAddress, address indexed cerberusSigner);
    event Deposited(address indexed token, address indexed from, uint256 amount);
    event ExecutionAuthorized(bytes32 indexed proposalHash, uint256 indexed nonce);
    event ExecutionPerformed(bytes32 indexed proposalHash, address indexed adapter, uint256 amountIn, bytes32 resultHash);
    event WithdrawalPerformed(address indexed token, address indexed to, uint256 amount, uint256 indexed nonce);
    event RecoveryRequested(address indexed recoveryAddress, uint256 indexed nonce, uint256 executableAt);
    event RecoveryExecuted(address indexed oldOwner, address indexed newOwner, uint256 indexed nonce);
    event Paused(address indexed by);
    event Unpaused(address indexed by);
    event CerberusSignerRotated(address indexed oldSigner, address indexed newSigner);
    event AllowedTokenUpdated(address indexed token, bool allowed);
    event AllowedRecipientUpdated(address indexed recipient, bool allowed);
    event AllowedAdapterUpdated(address indexed adapter, bool allowed);
    event TokenApprovalUpdated(address indexed token, address indexed spender, uint256 amount);

    modifier onlyOwner() {
        require(msg.sender == owner, "Owner only");
        _;
    }

    modifier onlyCerberus() {
        require(msg.sender == cerberusSigner, "Cerberus only");
        _;
    }

    modifier onlyOwnerOrCerberus() {
        require(msg.sender == owner || msg.sender == cerberusSigner, "Unauthorized caller");
        _;
    }

    constructor(address _owner, address _recoveryAddress, address _cerberusSigner, uint256 _recoveryDelay) {
        require(_owner != address(0), "Owner required");
        require(_recoveryAddress != address(0), "Recovery required");
        require(_cerberusSigner != address(0), "Cerberus signer required");

        owner = _owner;
        recoveryAddress = _recoveryAddress;
        cerberusSigner = _cerberusSigner;
        recoveryDelay = _recoveryDelay;
        allowedRecipients[_owner] = true;
        allowedRecipients[_recoveryAddress] = true;

        domainSeparator = keccak256(
            abi.encode(EIP712_DOMAIN_TYPEHASH, NAME_HASH, VERSION_HASH, block.chainid, address(this))
        );

        emit VaultCreated(_owner, _recoveryAddress, _cerberusSigner);
    }

    receive() external payable {
        emit Deposited(address(0), msg.sender, msg.value);
    }

    function depositETH() external payable {
        emit Deposited(address(0), msg.sender, msg.value);
    }

    function depositERC20(address token, uint256 amount) external {
        require(token != address(0), "Token required");
        require(amount > 0, "Amount required");

        bool ok = IERC20(token).transferFrom(msg.sender, address(this), amount);
        require(ok, "ERC20 transfer failed");
        emit Deposited(token, msg.sender, amount);
    }

    function executeAuthorized(
        ExecutionAuthorization calldata auth,
        bytes calldata ownerSig,
        bytes calldata cerberusSig,
        bytes calldata adapterCalldata
    ) external returns (bytes memory result) {
        require(!paused, "Vault paused");
        require(auth.vault == address(this), "Vault mismatch");
        require(block.timestamp >= auth.validAfter, "Authorization not active");
        require(block.timestamp <= auth.validUntil, "Authorization expired");
        require(!usedNonces[auth.nonce], "Nonce used");
        require(allowedAdapters[auth.adapter], "Adapter not allowed");
        require(allowedTokens[auth.tokenIn], "tokenIn not allowed");
        require(allowedTokens[auth.tokenOut], "tokenOut not allowed");
        require(keccak256(adapterCalldata) == auth.callDataHash, "Call data mismatch");

        bytes32 digest = _executionDigest(auth);
        require(_recoverSigner(digest, ownerSig) == owner, "Invalid owner signature");
        require(_recoverSigner(digest, cerberusSig) == cerberusSigner, "Invalid Cerberus signature");

        usedNonces[auth.nonce] = true;
        emit ExecutionAuthorized(auth.proposalHash, auth.nonce);

        (bool success, bytes memory data) = auth.adapter.call(adapterCalldata);
        require(success, _revertMessage(data, "Adapter call failed"));

        emit ExecutionPerformed(auth.proposalHash, auth.adapter, auth.amountIn, keccak256(data));
        return data;
    }

    function withdrawAuthorized(
        WithdrawalAuthorization calldata auth,
        bytes calldata ownerSig,
        bytes calldata cerberusSig
    ) external {
        require(!paused, "Vault paused");
        require(auth.vault == address(this), "Vault mismatch");
        require(block.timestamp >= auth.validAfter, "Authorization not active");
        require(block.timestamp <= auth.validUntil, "Authorization expired");
        require(!usedNonces[auth.nonce], "Nonce used");
        require(allowedRecipients[auth.to] || auth.to == owner || auth.to == recoveryAddress, "Recipient not allowed");
        if (auth.token != address(0)) {
            require(allowedTokens[auth.token], "Token not allowed");
        }

        bytes32 digest = _withdrawalDigest(auth);
        require(_recoverSigner(digest, ownerSig) == owner, "Invalid owner signature");
        require(_recoverSigner(digest, cerberusSig) == cerberusSigner, "Invalid Cerberus signature");

        usedNonces[auth.nonce] = true;

        if (auth.token == address(0)) {
            (bool sent, ) = payable(auth.to).call{value: auth.amount}("");
            require(sent, "ETH transfer failed");
        } else {
            bool ok = IERC20(auth.token).transfer(auth.to, auth.amount);
            require(ok, "ERC20 transfer failed");
        }

        emit WithdrawalPerformed(auth.token, auth.to, auth.amount, auth.nonce);
    }

    function requestRecovery(RecoveryAuthorization calldata auth, bytes calldata cerberusSig) external {
        require(auth.vault == address(this), "Vault mismatch");
        require(auth.recoveryAddress == recoveryAddress, "Recovery address mismatch");
        require(block.timestamp >= auth.validAfter, "Authorization not active");
        require(block.timestamp <= auth.validUntil, "Authorization expired");
        require(!usedNonces[auth.nonce], "Nonce used");

        bytes32 digest = _recoveryDigest(auth);
        require(_recoverSigner(digest, cerberusSig) == cerberusSigner, "Invalid Cerberus signature");

        usedNonces[auth.nonce] = true;
        uint256 executableAt = block.timestamp + recoveryDelay;
        recoveryExecutableAt[auth.nonce] = executableAt;
        emit RecoveryRequested(auth.recoveryAddress, auth.nonce, executableAt);
    }

    function executeRecovery(uint256 nonce) external {
        uint256 executableAt = recoveryExecutableAt[nonce];
        require(executableAt != 0, "Recovery not requested");
        require(block.timestamp >= executableAt, "Recovery timelocked");

        address oldOwner = owner;
        owner = recoveryAddress;
        delete recoveryExecutableAt[nonce];

        emit RecoveryExecuted(oldOwner, recoveryAddress, nonce);
    }

    function pause() external onlyOwnerOrCerberus {
        paused = true;
        emit Paused(msg.sender);
    }

    function unpause() external onlyCerberus {
        paused = false;
        emit Unpaused(msg.sender);
    }

    function rotateCerberusSigner(address newSigner) external onlyCerberus {
        require(newSigner != address(0), "Signer required");
        address previous = cerberusSigner;
        cerberusSigner = newSigner;
        emit CerberusSignerRotated(previous, newSigner);
    }

    function setAllowedToken(address token, bool allowed) external onlyCerberus {
        allowedTokens[token] = allowed;
        emit AllowedTokenUpdated(token, allowed);
    }

    function setAllowedRecipient(address recipient, bool allowed) external onlyCerberus {
        allowedRecipients[recipient] = allowed;
        emit AllowedRecipientUpdated(recipient, allowed);
    }

    function setAllowedAdapter(address adapter, bool allowed) external onlyCerberus {
        allowedAdapters[adapter] = allowed;
        emit AllowedAdapterUpdated(adapter, allowed);
    }

    function setTokenApproval(address token, address spender, uint256 amount) external onlyCerberus {
        bool ok = IERC20(token).approve(spender, amount);
        require(ok, "Approval failed");
        emit TokenApprovalUpdated(token, spender, amount);
    }

    function _executionDigest(ExecutionAuthorization calldata auth) internal view returns (bytes32) {
        bytes32 structHash = keccak256(
            abi.encode(
                EXECUTION_AUTHORIZATION_TYPEHASH,
                auth.vault,
                keccak256(bytes(auth.proposalId)),
                auth.proposalHash,
                auth.adapter,
                auth.tokenIn,
                auth.tokenOut,
                auth.amountIn,
                auth.minAmountOut,
                auth.callDataHash,
                auth.nonce,
                auth.validAfter,
                auth.validUntil,
                auth.policyHash
            )
        );

        return _toTypedDataHash(structHash);
    }

    function _withdrawalDigest(WithdrawalAuthorization calldata auth) internal view returns (bytes32) {
        bytes32 structHash = keccak256(
            abi.encode(
                WITHDRAWAL_AUTHORIZATION_TYPEHASH,
                auth.vault,
                auth.token,
                auth.to,
                auth.amount,
                auth.nonce,
                auth.validAfter,
                auth.validUntil,
                auth.policyHash
            )
        );

        return _toTypedDataHash(structHash);
    }

    function _recoveryDigest(RecoveryAuthorization calldata auth) internal view returns (bytes32) {
        bytes32 structHash = keccak256(
            abi.encode(
                RECOVERY_AUTHORIZATION_TYPEHASH,
                auth.vault,
                auth.recoveryAddress,
                auth.nonce,
                auth.validAfter,
                auth.validUntil,
                auth.policyHash
            )
        );

        return _toTypedDataHash(structHash);
    }

    function _toTypedDataHash(bytes32 structHash) internal view returns (bytes32) {
        return keccak256(abi.encodePacked("\x19\x01", domainSeparator, structHash));
    }

    function _recoverSigner(bytes32 digest, bytes calldata signature) internal pure returns (address signer) {
        require(signature.length == 65, "Invalid signature length");

        bytes32 r;
        bytes32 s;
        uint8 v;

        assembly {
            r := calldataload(signature.offset)
            s := calldataload(add(signature.offset, 0x20))
            v := byte(0, calldataload(add(signature.offset, 0x40)))
        }

        if (v < 27) {
            v += 27;
        }

        signer = ecrecover(digest, v, r, s);
        require(signer != address(0), "Invalid signature");
    }

    function _revertMessage(bytes memory data, string memory fallbackMessage) internal pure returns (string memory) {
        if (data.length < 68) {
            return fallbackMessage;
        }

        assembly {
            data := add(data, 0x04)
        }
        return abi.decode(data, (string));
    }
}
