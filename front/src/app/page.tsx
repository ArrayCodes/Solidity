"use client";

import React, { useState, useEffect, FormEvent } from "react";

import { ethers } from "ethers";
import { P2EFarm__factory, Carrot__factory } from "@/typechain";
import type { P2EFarm, Carrot } from "@/typechain";
import type { BrowserProvider } from "ethers";

import ConnectWallet from "@/components/ConnectWallet";
import WaitingForTransactionMessage from "@/components/WaitingForTransactionMessage";
import TransactionErrorMessage from "@/components/TransactionErrorMessage";

const SEPOLIA_NETWORK_ID = "0xaa36a7";
const P2E_FARM_ADDRESS = "0xEC23e89F986522Ce570f13413C069EeF7536E70D"
const TOKEN_ADDRESS = "0x0388DdFE3627F48b084782EC291A4D00c6f08b6a"

declare let window: any;

type CurrentConnectionProps = {
  provider: BrowserProvider | undefined;
  p2e_game: P2EFarm | undefined;
  token: Carrot | undefined;
  signer: ethers.JsonRpcSigner | undefined;
};

type FarmProps = {
  owner: ethers.AddressLike
  idFarm: ethers.BigNumberish;
  rateLvl: ethers.BigNumberish,
  capacityLvl: ethers.BigNumberish,
  balance: ethers.BigNumberish,
  lastClaimTime: ethers.BigNumberish
};

export default function Home() {
  const [networkError, setNetworkError] = useState<string>();
  const [txBeingSent, setTxBeingSent] = useState<string>();
  const [transactionError, setTransactionError] = useState<any>();
  const [currentBalance, setCurrentBalance] = useState<string>();
  const [isOwner, setIsOwner] = useState<boolean>(false);
  const [index, setIndex] = useState<Number>();
  const [farms, setFarms] = useState<FarmProps[]>([]);
  const [currentConnection, setCurrentConnection] = useState<CurrentConnectionProps>();

  useEffect(() => {
    (async () => {
      if (currentConnection?.provider && currentConnection.signer) {
        setCurrentBalance(
          (
            await currentConnection!!.token!!.balanceOf(currentConnection!!.signer!!.address)
          ).toString()
        );

        const farmsIds = await currentConnection!!.p2e_game!!.getIdsFarm(currentConnection.signer);
        const farms:FarmProps[] = (await Promise.all(farmsIds.map(
          (id) => currentConnection.p2e_game!!.allFarms(id)
        ))).map(
          (farm) => {
            return {
              owner: farm.owner,
              idFarm: farm.idFarm, 
              rateLvl: farm.rateLvl, 
              capacityLvl: farm.capacityLvl, 
              balance: farm.balance, 
              lastClaimTime: farm.lastClaimTime
            }; 
          }
        );
  
        setFarms(farms)            

        setInterval(() => 1)
      }
    })();
  }, [currentConnection, txBeingSent]);

  useEffect(() => {
    const interval = setInterval(() => {
      setIndex(new Date().getTime());
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  const _connectWallet = async () => {
    if (window.ethereum === undefined) {
      setNetworkError("Please install Metamask!");

      return;
    }

    if (!(await _checkNetwork())) {
      return;
    }

    const [selectedAccount] = await window.ethereum.request({
      method: "eth_requestAccounts",
    });

    await _initialize(ethers.getAddress(selectedAccount));

    window.ethereum.on(
      "accountsChanged",
      async ([newAccount]: [newAccount: string]) => {
        if (newAccount === undefined) {
          return _resetState();
        }
        
        await _initialize(ethers.getAddress(newAccount));
        
      }
    );

    window.ethereum.on("chainChanged", ([_networkId]: any) => {
      _resetState();
    });
  };

  const _initialize = async (selectedAccount: string) => {
    const provider = new ethers.BrowserProvider(window.ethereum);
    const signer = await provider.getSigner(selectedAccount);
    
    setCurrentConnection({
      provider: provider,
      p2e_game: P2EFarm__factory.connect(P2E_FARM_ADDRESS, signer),
      token: Carrot__factory.connect(TOKEN_ADDRESS, signer),
      signer: signer,
    });

  };

  const _checkNetwork = async (): Promise<boolean> => {
    const chosenChainId = await window.ethereum.request({
      method: "eth_chainId",
    });

    console.log(chosenChainId)

    if (chosenChainId === SEPOLIA_NETWORK_ID) {
      return true;
    }

    setNetworkError("Please connect to Sepolia network (https://sepolia.infura.io/v3/)!");

    return false;
  };

  const _resetState = () => {
    setNetworkError(undefined);
    setTransactionError(undefined);
    setTxBeingSent(undefined);
    setCurrentBalance(undefined);
    setIsOwner(false);
    setCurrentConnection({
      provider: undefined,
      signer: undefined,
      p2e_game: undefined,
      token: undefined,
    });
    setFarms([]);

  };

  const _dismissNetworkError = () => {
    setNetworkError(undefined);
  };

  const _dismissTransactionError = () => {
    setTransactionError(undefined);
  };

  const _getRpcErrorMessage = (error: any): string => {
    console.log(error);
    if (error.data) {
      return error.data.message;
    }

    return error.message;
  };

  const _handleBuyFarm = async (
    event: React.MouseEvent<HTMLButtonElement>
  ) => {
    event.preventDefault();

    if (!currentConnection?.p2e_game || !currentConnection?.signer || !currentConnection?.token) {
      return false;
    }

    try {
      await currentConnection.token.approve(await currentConnection.p2e_game.getAddress(), await currentConnection.p2e_game.FARM_PRICE())

      const response = await currentConnection.p2e_game.buyFarm();
      setTxBeingSent(response.hash);
      await response.wait();

    } catch (err) {
      console.error(err);

      setTransactionError(err);
    } finally {
      setTxBeingSent(undefined);
    }
  };

  const _handleUpgradeCapacityLevel = async (
    idFarm: ethers.BigNumberish,
    capacityLevel: ethers.BigNumberish,
    event: React.MouseEvent<HTMLButtonElement>
  ) => {
    event.preventDefault();

    if (!currentConnection?.p2e_game || !currentConnection?.signer || !currentConnection?.token) {
      return false;
    }

    try {
      await currentConnection.token.approve(await currentConnection.p2e_game.getAddress(), await currentConnection.p2e_game.currentCostUpgradeMaxCapacity(capacityLevel))

      const response = await currentConnection.p2e_game.upgradeMaxCapacity(idFarm);
      setTxBeingSent(response.hash);
      await response.wait();

    } catch (err) {
      console.error(err);

      setTransactionError(err);
    } finally {
      setTxBeingSent(undefined);
    }
  };

  const _handleUpgradeRateLevel = async (
    idFarm: ethers.BigNumberish,
    rateLvl: ethers.BigNumberish,
    event: React.MouseEvent<HTMLButtonElement>
  ) => {
    event.preventDefault();

    if (!currentConnection?.p2e_game || !currentConnection?.signer || !currentConnection?.token) {
      return false;
    }

    try {
      await currentConnection.token.approve(await currentConnection.p2e_game.getAddress(), await currentConnection.p2e_game.currentCostUpgradeRewardRate(rateLvl))

      const response = await currentConnection.p2e_game.upgradeRewardRate(idFarm);
      setTxBeingSent(response.hash);
      await response.wait();

    } catch (err) {
      console.error(err);

      setTransactionError(err);
    } finally {
      setTxBeingSent(undefined);
    }
  };

  const _calculateCapacity = (
    farm: FarmProps,
  ) => {
    if (!currentConnection?.p2e_game || !currentConnection?.signer || !currentConnection?.token) {
      return false;
    }

    const elapsedTime = new Date().getTime() / 1000 - Number(farm.lastClaimTime);
    const CLAIM_INTERVAL = 10

    const growthCoefficientCapacity = 20; 
    const DEFAULT_MAX_CAPACITY = 100
    const calculatedCapacity = DEFAULT_MAX_CAPACITY + ((Number(farm.capacityLvl) - 1) *(growthCoefficientCapacity));

    const growthCoefficientRewardRate = 2; 
    const DEFAULT_REWARD_RATE = 10
    const calculatedRewardRate = DEFAULT_REWARD_RATE + ((Number(farm.rateLvl) - 1) *(growthCoefficientRewardRate));

    let rewards = elapsedTime/CLAIM_INTERVAL * calculatedRewardRate
    rewards = Math.min(rewards, calculatedCapacity);
    return rewards;
  };
 
  const _handleClaimRewards = async (
    idFarm: ethers.BigNumberish,
    event: React.MouseEvent<HTMLButtonElement>
  ) => {
    event.preventDefault();

    if (!currentConnection?.p2e_game || !currentConnection?.signer || !currentConnection?.token) {
      return false;
    }

    try {
      const response = await currentConnection.p2e_game.claimRewards(idFarm);
      setTxBeingSent(response.hash);
      await response.wait();

    } catch (err) {
      console.error(err);

      setTransactionError(err);
    } finally {
      setTxBeingSent(undefined);
    }
  };

  const _handleSellFarm = async (
    idFarm: ethers.BigNumberish,
    event: React.MouseEvent<HTMLButtonElement>
  ) => {
    event.preventDefault();

    if (!currentConnection?.p2e_game || !currentConnection?.signer || !currentConnection?.token) {
      return false;
    }

    try {
      const response = await currentConnection.p2e_game.sellFarm(idFarm);
      setTxBeingSent(response.hash);
      await response.wait();

    } catch (err) {
      console.error(err);

      setTransactionError(err);
    } finally {
      setTxBeingSent(undefined);
    }
  };

  const availableFarms = () => {
    const farmsList = farms.map((farm) => {
      return (
        <li key={farm.idFarm}>
          <>
          <br></br>

            Farm ID: {farm.idFarm.toString()}
            <br />
            Capacity Level: {farm.capacityLvl.toString()} 
            &nbsp;
            <button onClick={(e) => _handleUpgradeCapacityLevel(farm.idFarm, farm.capacityLvl, e)}>  Upgrade </button>
            <br />
            Rate Level: {farm.rateLvl.toString()}
            &nbsp;
            <button onClick={(e) => _handleUpgradeRateLevel(farm.idFarm, farm.rateLvl, e)}> Upgrade </button>
            <br />
            In capacity : {_calculateCapacity(farm).toString()}
            &nbsp;
            <button onClick={(e) => _handleClaimRewards(farm.idFarm,e)}> Claim </button>
            <br />
            <button onClick={(e) => _handleSellFarm(farm.idFarm,e)}> Sell Farm </button>
            <br />

          </>
        </li>
      );
    });

    return farmsList;
  };


  return (
    <main>
      {!currentConnection?.signer && (
        <ConnectWallet
          connectWallet={_connectWallet}
          networkError={networkError}
          dismiss={_dismissNetworkError}
        />
      )}

      {currentConnection?.signer && (
        <p>Your address: {currentConnection.signer.address}</p>
      )}

      {txBeingSent && <WaitingForTransactionMessage txHash={txBeingSent} />}

      {transactionError && (
        <TransactionErrorMessage
          message={_getRpcErrorMessage(transactionError)}
          dismiss={_dismissTransactionError}
        />
      )}

      {currentBalance && (
        <p>Your balance: {ethers.formatEther(currentBalance)} CRT</p>
      )}
      
      {currentConnection && (<button onClick={(e) => _handleBuyFarm(e)}>
        Buy
      </button>)}

      {farms!!.length > 0 && <ul>{availableFarms()}</ul>}

    </main>
  );
}