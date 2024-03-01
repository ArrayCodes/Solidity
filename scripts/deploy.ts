import hre, { ethers } from "hardhat";

async function main() {
  console.log("DEPLOYING...");
  const [user1, user2] = await ethers.getSigners();
    
  const Factory1 = await ethers.getContractFactory("Carrot");
  const CarrotContract = await Factory1.deploy(user1);
  await CarrotContract.waitForDeployment();

  const Factory2 = await ethers.getContractFactory("P2EFarm");
  const P2EFarmContract = await Factory2.deploy(CarrotContract);
  await P2EFarmContract.waitForDeployment();
  await CarrotContract.connect(user1).transfer(P2EFarmContract, (await P2EFarmContract.FARM_PRICE()) * BigInt(100));



}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });


  