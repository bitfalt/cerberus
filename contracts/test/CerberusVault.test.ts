import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { encodeFunctionData, keccak256, parseEther } from "viem";
import { network } from "hardhat";
import { cerberusDomain, executionAuthorizationTypes, recoveryAuthorizationTypes, withdrawalAuthorizationTypes } from "../../src/lib/protocol/eip712";

const { viem, networkHelpers } = await network.connect();

async function deployVaultFixture() {
  const [owner, cerberus, recovery, recipient] = await viem.getWalletClients();
  const publicClient = await viem.getPublicClient();
  const vault = await viem.deployContract("CerberusVault", [
    owner.account.address,
    recovery.account.address,
    cerberus.account.address,
    1800n,
  ]);
  const adapter = await viem.deployContract("MockExecutionAdapter");

  await vault.write.setAllowedToken(["0x0000000000000000000000000000000000000000", true], {
    account: cerberus.account,
  });
  await vault.write.setAllowedAdapter([adapter.address, true], {
    account: cerberus.account,
  });
  await vault.write.setAllowedRecipient([recipient.account.address, true], {
    account: cerberus.account,
  });

  return { owner, cerberus, recovery, recipient, publicClient, vault, adapter };
}

describe("CerberusVault", () => {
  it("executes an authorized adapter call with dual signatures", async () => {
    const { owner, cerberus, vault, adapter } = await networkHelpers.loadFixture(deployVaultFixture);
    const proposalHash = keccak256("0x1234");
    const adapterCalldata = encodeFunctionData({
      abi: adapter.abi,
      functionName: "executeSwap",
      args: [proposalHash, 1n, 1n],
    });

    const authorization = {
      vault: vault.address,
      proposalId: "proposal-1",
      proposalHash,
      adapter: adapter.address,
      tokenIn: "0x0000000000000000000000000000000000000000",
      tokenOut: "0x0000000000000000000000000000000000000000",
      amountIn: 1n,
      minAmountOut: 1n,
      callDataHash: keccak256(adapterCalldata),
      nonce: 1n,
      validAfter: 0n,
      validUntil: 9_999_999_999n,
      policyHash: keccak256("0x5678"),
    };

    const ownerSig = await owner.signTypedData({
      account: owner.account,
      domain: cerberusDomain(31337, vault.address),
      types: executionAuthorizationTypes,
      primaryType: "ExecutionAuthorization",
      message: authorization,
    });
    const cerberusSig = await cerberus.signTypedData({
      account: cerberus.account,
      domain: cerberusDomain(31337, vault.address),
      types: executionAuthorizationTypes,
      primaryType: "ExecutionAuthorization",
      message: authorization,
    });

    await viem.assertions.emit(vault.write.executeAuthorized([authorization, ownerSig, cerberusSig, adapterCalldata]), vault, "ExecutionPerformed");
    assert.equal(await vault.read.usedNonces([1n]), true);
  });

  it("rejects replayed execute authorizations", async () => {
    const { owner, cerberus, vault, adapter } = await networkHelpers.loadFixture(deployVaultFixture);
    const proposalHash = keccak256("0x9999");
    const adapterCalldata = encodeFunctionData({
      abi: adapter.abi,
      functionName: "executeSwap",
      args: [proposalHash, 2n, 2n],
    });

    const authorization = {
      vault: vault.address,
      proposalId: "proposal-2",
      proposalHash,
      adapter: adapter.address,
      tokenIn: "0x0000000000000000000000000000000000000000",
      tokenOut: "0x0000000000000000000000000000000000000000",
      amountIn: 2n,
      minAmountOut: 2n,
      callDataHash: keccak256(adapterCalldata),
      nonce: 2n,
      validAfter: 0n,
      validUntil: 9_999_999_999n,
      policyHash: keccak256("0x7777"),
    };

    const ownerSig = await owner.signTypedData({
      account: owner.account,
      domain: cerberusDomain(31337, vault.address),
      types: executionAuthorizationTypes,
      primaryType: "ExecutionAuthorization",
      message: authorization,
    });
    const cerberusSig = await cerberus.signTypedData({
      account: cerberus.account,
      domain: cerberusDomain(31337, vault.address),
      types: executionAuthorizationTypes,
      primaryType: "ExecutionAuthorization",
      message: authorization,
    });

    await vault.write.executeAuthorized([authorization, ownerSig, cerberusSig, adapterCalldata]);
    await viem.assertions.revertWith(
      vault.write.executeAuthorized([authorization, ownerSig, cerberusSig, adapterCalldata]),
      "Nonce used"
    );
  });

  it("executes governed withdrawals with owner and Cerberus signatures", async () => {
    const { owner, cerberus, recipient, publicClient, vault } = await networkHelpers.loadFixture(deployVaultFixture);
    await owner.sendTransaction({ to: vault.address, value: parseEther("1") });

    const authorization = {
      vault: vault.address,
      token: "0x0000000000000000000000000000000000000000",
      to: recipient.account.address,
      amount: parseEther("0.25"),
      nonce: 3n,
      validAfter: 0n,
      validUntil: 9_999_999_999n,
      policyHash: keccak256("0x0102"),
    };

    const ownerSig = await owner.signTypedData({
      account: owner.account,
      domain: cerberusDomain(31337, vault.address),
      types: withdrawalAuthorizationTypes,
      primaryType: "WithdrawalAuthorization",
      message: authorization,
    });
    const cerberusSig = await cerberus.signTypedData({
      account: cerberus.account,
      domain: cerberusDomain(31337, vault.address),
      types: withdrawalAuthorizationTypes,
      primaryType: "WithdrawalAuthorization",
      message: authorization,
    });

    const balanceBefore = await publicClient.getBalance({ address: recipient.account.address });
    const hash = await vault.write.withdrawAuthorized([authorization, ownerSig, cerberusSig]);
    await publicClient.waitForTransactionReceipt({ hash });
    const balanceAfter = await publicClient.getBalance({ address: recipient.account.address });

    assert.equal(balanceAfter > balanceBefore, true);
  });

  it("enforces recovery timelocks before ownership can change", async () => {
    const { cerberus, recovery, vault } = await networkHelpers.loadFixture(deployVaultFixture);
    const authorization = {
      vault: vault.address,
      recoveryAddress: recovery.account.address,
      nonce: 4n,
      validAfter: 0n,
      validUntil: 9_999_999_999n,
      policyHash: keccak256("0x0304"),
    };

    const cerberusSig = await cerberus.signTypedData({
      account: cerberus.account,
      domain: cerberusDomain(31337, vault.address),
      types: recoveryAuthorizationTypes,
      primaryType: "RecoveryAuthorization",
      message: authorization,
    });

    await vault.write.requestRecovery([authorization, cerberusSig]);
    await viem.assertions.revertWith(vault.write.executeRecovery([4n]), "Recovery timelocked");
    await networkHelpers.time.increase(1801);
    await vault.write.executeRecovery([4n]);
    assert.equal((await vault.read.owner()).toLowerCase(), recovery.account.address.toLowerCase());
  });
});
