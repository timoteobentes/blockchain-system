import { ethers } from 'hardhat';

async function main() {
  const [deployer] = await ethers.getSigners();

  console.log('Deploying SELVATraceability with account:', deployer.address);
  console.log('Account balance:', (await ethers.provider.getBalance(deployer.address)).toString());

  const Contract = await ethers.getContractFactory('SELVATraceability');
  const contract = await Contract.deploy();
  await contract.waitForDeployment();

  const address = await contract.getAddress();
  console.log('SELVATraceability deployed to:', address);
  console.log('Set CONTRACT_ADDRESS=' + address + ' in your .env files');
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
