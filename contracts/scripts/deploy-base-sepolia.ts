import { network } from "hardhat";

async function main() {
  const { viem } = await network.connect("baseSepolia");
  const [deployer] = await viem.getWalletClients();

  if (!process.env.CERBERUS_SIGNER_PRIVATE_KEY) {
    throw new Error("CERBERUS_SIGNER_PRIVATE_KEY is required to deploy to Base Sepolia.");
  }

  const factory = await viem.deployContract("CerberusVaultFactory", [deployer.account.address, 1800n]);
  const adapter = await viem.deployContract("MockExecutionAdapter");

  console.log(JSON.stringify({
    deployer: deployer.account.address,
    vaultFactory: factory.address,
    mockExecutionAdapter: adapter.address,
  }, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
