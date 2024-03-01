import { Contract } from "hardhat/internal/hardhat-network/stack-traces/model";
import { loadFixture, ethers, expect } from "../test/setup";

describe("P2EFarm", function() {

    async function deployToken() {
        const [user1, user2] = await ethers.getSigners();
    
        const Factory = await ethers.getContractFactory("Carrot");
        const CarrotContract = await Factory.deploy(user1);
        await CarrotContract.waitForDeployment();
    
        return { user1, user2, CarrotContract }
      }


    async function deployFarm() {
        const { user1, user2, CarrotContract } = await deployToken();
    
        const Factory = await ethers.getContractFactory("P2EFarm");
        const P2EFarmContract = await Factory.deploy(CarrotContract);
        await P2EFarmContract.waitForDeployment();
    
        return { user1, user2, P2EFarmContract, CarrotContract }
    }

    it("should be deployed", async function() {
    const { P2EFarmContract } = await loadFixture(deployFarm);

    expect(P2EFarmContract.target).to.be.properAddress;
    });


    it("should set token address by the owner", async function() {
        const { user1, P2EFarmContract, CarrotContract} = await loadFixture(deployFarm);
        await CarrotContract.connect(user1).transfer(CarrotContract, 1)

        await expect(
            P2EFarmContract.connect(user1).setTokenAddress(CarrotContract)
        ).to.be.changes;
    
    });

    it("should not set the token address by the owner if the token balance is zero", async function() {
        const { user1, P2EFarmContract, CarrotContract} = await loadFixture(deployFarm);

        await expect(
            P2EFarmContract.connect(user1).setTokenAddress(CarrotContract)
        ).to.be.revertedWith("Token does not exist or has zero balance");
    
    });

    it("should not set the address of the token if the sender is not the owner.", async function() {
        const { user1, P2EFarmContract, CarrotContract} = await loadFixture(deployFarm);

        await expect(
            P2EFarmContract.connect(user1).setTokenAddress(CarrotContract)
        ).to.be.revertedWith("Token does not exist or has zero balance");
    
    });

    it("should allow users to buy farms", async function() {
        const { user1, P2EFarmContract, CarrotContract} = await loadFixture(deployFarm);
        await CarrotContract.connect(user1).approve(P2EFarmContract, await P2EFarmContract.FARM_PRICE());
        await P2EFarmContract.connect(user1).buyFarm();
        const farmCount = await P2EFarmContract.userFarms(user1.address, 0);

        
        expect(farmCount).to.above(0);
    });

    it("should allow users to claim rewards", async function() {
        const { user1, P2EFarmContract, CarrotContract} = await loadFixture(deployFarm);
        await CarrotContract.connect(user1).approve(P2EFarmContract, await P2EFarmContract.FARM_PRICE());
        await P2EFarmContract.connect(user1).buyFarm();
        const idFarm = await P2EFarmContract.getIdFarm(0, user1)

        const initialBalance = await CarrotContract.balanceOf(P2EFarmContract);
        await ethers.provider.send("evm_increaseTime", [60]); // Increase time by 60 seconds
        await P2EFarmContract.connect(user1).claimRewards(idFarm);
        const updatedBalance = await CarrotContract.balanceOf(P2EFarmContract);
        expect(updatedBalance).to.be.below(initialBalance);
    });

    it("should prohibit non-owner users from claiming rewards", async function() {
        const { user1, user2, P2EFarmContract, CarrotContract} = await loadFixture(deployFarm);
        await CarrotContract.connect(user1).approve(P2EFarmContract, await P2EFarmContract.FARM_PRICE());
        await P2EFarmContract.connect(user1).buyFarm();
        const idFarm = await P2EFarmContract.userFarms(user1.address, 0)

        await ethers.provider.send("evm_increaseTime", [60]); // Increase time by 60 seconds
        await P2EFarmContract.connect(user1).claimRewards(idFarm);
        await expect(
            P2EFarmContract.connect(user2).claimRewards(idFarm)
        ).to.be.revertedWith("You are not the owner of this farm");
    });

    it("should allow users to upgrade reward rate", async function() {
        const { user1, P2EFarmContract, CarrotContract} = await loadFixture(deployFarm);
        await CarrotContract.connect(user1).approve(P2EFarmContract, await P2EFarmContract.FARM_PRICE() + await P2EFarmContract.currentCostUpgradeRewardRate(1));
        await P2EFarmContract.connect(user1).buyFarm();
        const idFarm = await P2EFarmContract.userFarms(user1.address, 0)

        const initialRate = await P2EFarmContract.getRateLvlFarm(idFarm);
        await P2EFarmContract.connect(user1).upgradeRewardRate(idFarm);
        const updatedRate = await P2EFarmContract.getRateLvlFarm(idFarm);
        expect(updatedRate).to.be.above(initialRate);
    });

    it("should allow users to upgrade max capacity", async function() {
        const { user1, P2EFarmContract, CarrotContract} = await loadFixture(deployFarm);
        await CarrotContract.connect(user1).approve(P2EFarmContract, await P2EFarmContract.FARM_PRICE() + await P2EFarmContract.currentCostUpgradeMaxCapacity(1));
        await P2EFarmContract.connect(user1).buyFarm();
        const idFarm = await P2EFarmContract.userFarms(user1.address, 0)

        const initialCapacity = await P2EFarmContract.getCapacityLvlFarm(idFarm);
        await P2EFarmContract.connect(user1).upgradeMaxCapacity(idFarm);
        const updatedCapacity = await P2EFarmContract.getCapacityLvlFarm(idFarm);
        expect(updatedCapacity).to.be.above(initialCapacity);
    });

    it("should allow users to sell farms (at the right price)", async function() {
        const { user1, P2EFarmContract, CarrotContract} = await loadFixture(deployFarm);
        await CarrotContract.connect(user1).approve(P2EFarmContract, await P2EFarmContract.FARM_PRICE() + await P2EFarmContract.currentCostUpgradeMaxCapacity(1));
        const initialBalance = await CarrotContract.balanceOf(P2EFarmContract);

        await P2EFarmContract.connect(user1).buyFarm();
        const idFarm = await P2EFarmContract.userFarms(user1.address, 0)
        
        await P2EFarmContract.connect(user1).upgradeMaxCapacity(idFarm);
        await P2EFarmContract.connect(user1).sellFarm(idFarm);
        const updatedBalance = await CarrotContract.balanceOf(P2EFarmContract);
        expect(updatedBalance - initialBalance).to.be.eq(await P2EFarmContract.connect(user1).getFarmSellPrice(idFarm));
    });


});