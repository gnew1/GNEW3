
import { ethers } from "hardhat";

async function main() {
  const Subscription = await ethers.getContractFactory("Subscription");
  const sub = await Subscription.deploy();
  await sub.waitForDeployment();
  console.log("Subscription deployed:", await sub.getAddress());
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});


