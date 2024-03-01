// SPDX-License-Identifier: MIT

pragma solidity ^0.8.0;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/utils/math/Math.sol";
import "hardhat/console.sol";


contract P2EFarm {
    address public owner;
    address public tokenAddress;

    uint256 public constant DECIMALS_FIX = 10 ** 18;
    uint256 public constant FARM_PRICE = 100 * DECIMALS_FIX; // Стоимость покупки фермы
    uint256 public constant DEFAULT_REWARD_RATE = 10 * DECIMALS_FIX; // Количество токенов, которые фармится за час по умолчанию
    uint256 public constant DEFAULT_MAX_CAPACITY = 100 * DECIMALS_FIX; // Максимальная емкость хранилища наград по умолчанию
    uint256 public constant CLAIM_INTERVAL = 1 seconds; // Интервал времени между клеймами
    uint256 public constant REWARD_RATE_UPGRADE_COST = 100 * DECIMALS_FIX; // Стоимость улучшения REWARD_RATE
    uint256 public constant MAX_CAPACITY_UPGRADE_COST = 200 * DECIMALS_FIX; // Стоимость улучшения MAX_CAPACITY
    uint256 public constant MAX_FARM_AMOUNT = 5; // Максимальное количество ферм одного пользователя 


    mapping(uint256 => Farm) public allFarms;
    mapping(address => uint256[]) public userFarms;

    struct Farm {
        address owner;
        uint256 idFarm;
        uint256 rateLvl;
        uint256 capacityLvl;
        uint256 balance;
        uint256 lastClaimTime;
    }

    modifier onlyOwner() {
        require(owner == msg.sender, "You are not the owner of this contract");
        _;
    }

    modifier tokenAddressSet() {
        require(tokenAddress != address(0), "Token address not set");
        _;
    }

    modifier farmExists(uint256 _idFarm) {
        require(allFarms[_idFarm].idFarm == _idFarm, "Farm does not exist");
        _;
    }

    modifier onlyFarmOwner(uint256 _idFarm) {
        require(allFarms[_idFarm].owner == msg.sender, "You are not the owner of this farm");
        _;
    }

    event FarmPurchased(address buyer, uint256 idFarm);
    event RewardClaimed(address farmer, uint256 idFarm, uint256 amount);
    event RewardRateUpgraded(address farmer, uint256 idFarm, uint256 cost);
    event MaxCapacityUpgraded(address farmer, uint256 idFarm, uint256 cost);
    event FarmSold(address seller, uint256 idFarm, uint256 price);

    constructor(address _tokenAddress) {
        tokenAddress = _tokenAddress;
        owner = msg.sender;
    }

    function calculateCapacity(uint256 capacityLevel) public pure returns (uint256) {
        uint256 growthCoefficient = 20 * DECIMALS_FIX; 
        uint256 calculatedCapacity = DEFAULT_MAX_CAPACITY + ((capacityLevel - 1) *(growthCoefficient));
        return calculatedCapacity;
    }

    function calculateRewardRate(uint256 rewardRateLevel) public pure returns (uint256) {
        uint256 growthCoefficient = 2 * DECIMALS_FIX; 
        uint256 calculatedRewardRate = DEFAULT_REWARD_RATE + ((rewardRateLevel - 1) * growthCoefficient);
        return calculatedRewardRate;
    }

    function setTokenAddress(address _tokenAddress) external onlyOwner() {
        require(_tokenAddress != address(0) && IERC20(_tokenAddress).balanceOf(_tokenAddress) > 0, "Token does not exist or has zero balance");

        tokenAddress = _tokenAddress;
    }

    function generateRandomNumber() public view returns (uint256) {
        uint256 randomNumber = uint256(keccak256(abi.encodePacked(blockhash(block.number - 1), msg.sender, block.timestamp)));
        return randomNumber;
    }

    function buyFarm() external tokenAddressSet returns(uint256) {
        IERC20 token = IERC20(tokenAddress);

        require(token.balanceOf(msg.sender) >= FARM_PRICE, "Insufficient balance");
        require(token.transferFrom(msg.sender, address(this), FARM_PRICE), "Transfer failed");
        require(userFarms[msg.sender].length < MAX_FARM_AMOUNT, "You have the maximum amount of farms");

        Farm memory newFarm = Farm({
            owner: msg.sender,
            idFarm: generateRandomNumber(),
            rateLvl: 1,
            capacityLvl: 1,
            balance: 0,
            lastClaimTime: block.timestamp
        });

        allFarms[newFarm.idFarm] = newFarm;
        userFarms[msg.sender].push(newFarm.idFarm);

        emit FarmPurchased(msg.sender, newFarm.idFarm);

        return newFarm.idFarm;
    }

    function claimRewards(uint256 _idFarm) external tokenAddressSet farmExists(_idFarm) onlyFarmOwner(_idFarm) {
        IERC20 token = IERC20(tokenAddress);
        uint256 rewards = calculateRewards(_idFarm);

        require(rewards > 0, "No rewards to claim");
        require(token.balanceOf(address(this)) >= rewards, "Not enough rewards in contract");

        allFarms[_idFarm].lastClaimTime = block.timestamp;

        require(token.transfer(msg.sender, rewards), "Transfer failed");

        emit RewardClaimed(msg.sender, _idFarm, rewards);
    }

    function upgradeRewardRate(uint256 _idFarm) external tokenAddressSet farmExists(_idFarm) onlyFarmOwner(_idFarm) {
        IERC20 token = IERC20(tokenAddress);
        uint256 currentCost = REWARD_RATE_UPGRADE_COST * allFarms[_idFarm].rateLvl;

        require(token.balanceOf(msg.sender) >= currentCost, "Insufficient balance");
        require(token.transferFrom(msg.sender, address(this), currentCost), "Transfer failed");

        allFarms[_idFarm].rateLvl += 1;
        emit RewardRateUpgraded(msg.sender, _idFarm, currentCost);
    }

    function upgradeMaxCapacity(uint256 _idFarm) external tokenAddressSet farmExists(_idFarm) onlyFarmOwner(_idFarm) {
        IERC20 token = IERC20(tokenAddress);
        uint256 currentCost = MAX_CAPACITY_UPGRADE_COST * allFarms[_idFarm].capacityLvl;

        require(token.balanceOf(msg.sender) >= currentCost, "Insufficient balance");
        require(token.transferFrom(msg.sender, address(this), currentCost), "Transfer failed");

        allFarms[_idFarm].capacityLvl += 1;
        emit MaxCapacityUpgraded(msg.sender, _idFarm, currentCost);
    }

    function calculateRewards(uint256 _idFarm) public view farmExists(_idFarm) returns (uint256) {
        uint256 elapsedTime = block.timestamp - allFarms[_idFarm].lastClaimTime;
        uint256 rewards = (elapsedTime / CLAIM_INTERVAL) * (calculateRewardRate(allFarms[_idFarm].rateLvl)/ 10 * CLAIM_INTERVAL);
        rewards = Math.min(rewards, calculateCapacity(allFarms[_idFarm].capacityLvl));
        return rewards; 
    }

    function currentCostUpgradeMaxCapacity(uint256 _farmLevel) public pure returns (uint256) {
        return MAX_CAPACITY_UPGRADE_COST * _farmLevel;
    }

    function currentCostUpgradeRewardRate(uint256 _farmLevel) public pure returns (uint256) {
        return REWARD_RATE_UPGRADE_COST * _farmLevel;
    }

    function removeFarm(uint256 _idFarm) private farmExists(_idFarm) onlyFarmOwner(_idFarm) {
        uint256 farmAmount = userFarms[msg.sender].length;
        uint256 farmIndex;
        bool flag = false;
        for (uint256 i; i < farmAmount; i++) {

            if (flag) {
                userFarms[msg.sender][i - 1] = userFarms[msg.sender][i];
            }
            if (userFarms[msg.sender][i] == _idFarm) {
                        farmIndex = i;
                        flag = true;
            }
            
        }
        userFarms[msg.sender].pop();

    }

    function sellFarm(uint256 _idFarm) public  tokenAddressSet farmExists(_idFarm) onlyFarmOwner(_idFarm){
        IERC20 token = IERC20(tokenAddress);

        uint256 sellPrice = getFarmSellPrice(_idFarm);

        require(token.balanceOf(address(this)) >= sellPrice, "Not enough balance in contract");

        require(token.transfer(msg.sender, sellPrice), "Transfer failed");
        removeFarm(_idFarm);

        allFarms[_idFarm].owner = address(this); // Передаем ферму контракту

        emit FarmSold(msg.sender, _idFarm, getFarmSellPrice(_idFarm));
    }

    function getIdsFarm(address _address) external view returns(uint256[] memory) {
        return userFarms[_address];
    }

    function getFarmSellPrice(uint256 _idFarm) public  view tokenAddressSet farmExists(_idFarm) returns (uint256) {

        uint256 upgradeCostRewardRate = 0;
        uint256 rateLevel = allFarms[_idFarm].rateLvl;
        for (uint256 i = 1; i <= rateLevel; i++) {
            upgradeCostRewardRate += currentCostUpgradeRewardRate(i - 1);
        }

        uint256 upgradeCostMaxCapacity = 0;
        uint256 capacityLevel = allFarms[_idFarm].capacityLvl;
        for (uint256 i = 1; i <= capacityLevel; i++) {
            upgradeCostMaxCapacity += currentCostUpgradeMaxCapacity(i - 1);
        }

        uint256 totalUpgradeCost = upgradeCostRewardRate + upgradeCostMaxCapacity;
        uint256 sellPrice = (FARM_PRICE + totalUpgradeCost) / 2;
        return sellPrice;
        
    }

    receive() external payable {
        revert("Please use CRT token to buy and upgrade farms!");
    }

    fallback() external {
        console.logBytes(msg.data);
    }


}
