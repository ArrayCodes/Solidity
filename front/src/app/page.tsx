"use client";

import React, { useState, useEffect, FormEvent, useRef } from "react";

import { ethers } from "ethers";
import { P2EFarm__factory, Carrot__factory } from "@/typechain";
import type { P2EFarm, Carrot } from "@/typechain";
import type { BrowserProvider } from "ethers";

import ConnectWallet from "@/components/ConnectWallet";
import WaitingForTransactionMessage from "@/components/WaitingForTransactionMessage";
import TransactionErrorMessage from "@/components/TransactionErrorMessage";
import Alert from "@/components/AlertProps";

const SEPOLIA_NETWORK_ID = "0xaa36a7";
const P2E_FARM_ADDRESS = "0xFDb12306A0a6CBC6d6136E1AD2B8CBeEEdd5124F"
const TOKEN_ADDRESS = "0xe9a5b2Ca78841EB2C7135aEB616Ac0851093957c"

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
    }, 1);
    return () => clearInterval(interval);
  }, []);

  const _connectWallet = async () => {
    //addSuccess('Вы успешно подключились')
    if (window.ethereum === undefined) {
      setNetworkError("Please install Metamask!");
      addError("Please install Metamask!");


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

  
  
  
  
  
  

  const [alerts, setAlerts] = useState<{ id: number; type: string; message: string }[]>([]);

  const addError = (message: string) => {
    const newId = alerts.length ? alerts[alerts.length - 1].id + 1 : 1;
    const newAlerts = [...alerts, { id: newId, type: "error", message }];
    if (newAlerts.length > 5) {
      newAlerts.shift(); // Удаляем первый элемент, если количество больше 5
    }
    setAlerts(newAlerts);
  
    // Добавляем таймер для удаления алерта через 5 секунд
    setTimeout(() => {
      removeAlert(newId);
    }, 5000);
  };
  
  const addSuccess = (message: string) => {
    const newId = alerts.length ? alerts[alerts.length - 1].id + 1 : 1;
    const newAlerts = [...alerts, { id: newId, type: "success", message }];
    if (newAlerts.length > 5) {
      newAlerts.shift(); // Удаляем первый элемент, если количество больше 5
    }
    setAlerts(newAlerts);
  
    // Добавляем таймер для удаления алерта через 5 секунд
    setTimeout(() => {
      removeAlert(newId);
    }, 5000);
  };
  
  

  const removeAlert = (id: number) => {
    const filteredAlerts = alerts.filter((alert) => alert.id !== id);
    setAlerts(filteredAlerts);
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

    if (chosenChainId === SEPOLIA_NETWORK_ID) {
      return true;
    }

    addError("Please connect to Sepolia network (https://sepolia.infura.io/v3/)!");

    return false;
  };

  const _resetState = () => {
    setNetworkError(undefined);
    setTransactionError(undefined);
    setTxBeingSent(undefined);
    setCurrentBalance(undefined);
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
      addError("Произошла ошибка, повторите попытку!");

    } finally {
      setTxBeingSent(undefined);
    }
  };

  const _currentCostUpgradeMaxCapacity = async (capacityLevel: ethers.BigNumberish,) => {
    return await currentConnection!!.p2e_game!!.currentCostUpgradeMaxCapacity(capacityLevel)
  };

  const _currentCostUpgradeRewardRate = async (rateLvl: ethers.BigNumberish,) => {
    return await currentConnection!!.p2e_game!!.currentCostUpgradeRewardRate(rateLvl)
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
      await currentConnection.token.approve(await currentConnection.p2e_game.getAddress(), await _currentCostUpgradeMaxCapacity(capacityLevel))

      const response = await currentConnection.p2e_game.upgradeMaxCapacity(idFarm);
      setTxBeingSent(response.hash);
      await response.wait();

    } catch (err) {
      addError("Произошла ошибка, повторите попытку!");
      console.error(err);

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
      await currentConnection.token.approve(await currentConnection.p2e_game.getAddress(), await _currentCostUpgradeRewardRate(rateLvl))

      const response = await currentConnection.p2e_game.upgradeRewardRate(idFarm);
      setTxBeingSent(response.hash);
      await response.wait();

    } catch (err) {
      console.error(err);
      addError("Произошла ошибка, повторите попытку!");

    } finally {
      setTxBeingSent(undefined);
    }
  };

  const _calculateCapacity = (
    farm: FarmProps,
  ) => {
    if (!currentConnection?.p2e_game || !currentConnection?.signer || !currentConnection?.token) {
      return {rewards: 0, calculatedCapacity: 0, calculatedRewardRate: 0};
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
    return {rewards, calculatedCapacity, calculatedRewardRate};
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
      addError("Произошла ошибка, повторите попытку!");

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
      addError("Произошла ошибка, повторите попытку!");

    } finally {
      setTxBeingSent(undefined);
    }
  };

  const MAX_CAPACITY_UPGRADE_COST = 200;
  const REWARD_RATE_UPGRADE_COST = 100;

  const availableFarms = () => {
    const farmsList = farms.map((farm) => {
      return (
        <li className="farm" key={farm.idFarm}>
          <button className="farm__sale" onClick={(e) => _handleSellFarm(farm.idFarm,e)}>$</button>
          <div className="farm__content">
            <div className="farm__top">
              <div className="farm__icon">
                <svg height="60px" width="60px" version="1.1" id="Layer_1" xmlns="http://www.w3.org/2000/svg"  viewBox="0 0 511.787 511.787"  fill="#000000"><g id="SVGRepo_bgCarrier" stroke-width="0"></g><g id="SVGRepo_tracerCarrier" stroke-linecap="round" stroke-linejoin="round"></g><g id="SVGRepo_iconCarrier"> <g transform="translate(1 1)"> <polygon style={{fill:'#1CD759'}} points="434.093,186.52 389.72,108.867 254.893,41.453 120.067,108.867 75.693,186.52 33.027,186.52 91.907,84.12 254.893,7.32 417.88,84.12 476.76,186.52 "></polygon> <polygon style={{fill:'#FD9808'}} points="389.72,108.867 254.893,41.453 120.067,108.867 75.693,186.52 58.627,186.52 58.627,502.253 451.16,502.253 451.16,186.52 434.093,186.52 "></polygon> <path style={{fill:'#FFDD09'}} d="M367.533,108.867l-125.44-67.413l-125.44,67.413L74.84,186.52H58.627v315.733H425.56v-299.52 c0-4.267-1.707-8.533-4.267-11.093c-10.24-11.093-21.333-22.187-28.16-35.84L367.533,108.867z"></path> <polygon style={{fill:'#33A9F8'}} points="178.093,502.253 331.693,502.253 331.693,348.653 178.093,348.653 "></polygon> <g> <polygon style={{fill:'#54C9FD'}} points="178.093,502.253 306.093,502.253 306.093,348.653 178.093,348.653 "></polygon> <polygon style={{fill:'#54C9FD'}} points="135.427,271.853 203.693,271.853 203.693,203.587 135.427,203.587 "></polygon> <polygon style={{fill:'#54C9FD'}} points="306.093,271.853 374.36,271.853 374.36,203.587 306.093,203.587 "></polygon> </g> <path d="M476.76,195.053h-42.667c-3.413,0-5.973-1.707-7.68-4.267l-43.52-75.093l-128-64.853l-128,64.853l-43.52,75.093 c-1.707,2.56-4.267,4.267-7.68,4.267H33.027c-3.413,0-5.973-1.707-7.68-4.267c-1.707-2.56-1.707-5.973,0-8.533l58.88-102.4 c0.853-1.707,2.56-2.56,3.413-3.413l162.987-76.8c2.56-0.853,5.12-0.853,7.68,0l163.84,76.8c1.707,0.853,2.56,1.707,3.413,3.413 l58.88,102.4c1.707,2.56,1.707,5.973,0,8.533C482.733,193.347,480.173,195.053,476.76,195.053z M439.213,177.987h23.04 l-50.347-87.04l-157.013-74.24L97.88,90.947l-50.347,87.04h23.04l41.813-73.387c0.853-1.707,1.707-2.56,3.413-3.413l134.827-67.413 c2.56-0.853,5.12-0.853,7.68,0l134.827,67.413c1.707,0.853,2.56,1.707,3.413,3.413L439.213,177.987z"></path> <path d="M331.693,510.787h-153.6c-5.12,0-8.533-3.413-8.533-8.533v-153.6c0-5.12,3.413-8.533,8.533-8.533h153.6 c5.12,0,8.533,3.413,8.533,8.533v153.6C340.227,507.373,336.813,510.787,331.693,510.787z M186.627,493.72H323.16V357.187H186.627 V493.72z"></path> <path d="M203.693,280.387h-68.267c-5.12,0-8.533-3.413-8.533-8.533v-68.267c0-5.12,3.413-8.533,8.533-8.533h68.267 c5.12,0,8.533,3.413,8.533,8.533v68.267C212.227,276.973,208.813,280.387,203.693,280.387z M143.96,263.32h51.2v-51.2h-51.2V263.32 z"></path> <path d="M331.693,510.787c-2.56,0-4.267-0.853-5.973-2.56l-153.6-153.6c-3.413-3.413-3.413-8.533,0-11.947 c3.413-3.413,8.533-3.413,11.947,0l153.6,153.6c3.413,3.413,3.413,8.533,0,11.947C335.96,509.933,334.253,510.787,331.693,510.787z "></path> <path d="M178.093,510.787c-2.56,0-4.267-0.853-5.973-2.56c-3.413-3.413-3.413-8.533,0-11.947l153.6-153.6 c3.413-3.413,8.533-3.413,11.947,0c3.413,3.413,3.413,8.533,0,11.947l-153.6,153.6C182.36,509.933,180.653,510.787,178.093,510.787 z"></path> <path d="M135.427,280.387h-8.533c-5.12,0-8.533-3.413-8.533-8.533c0-5.12,3.413-8.533,8.533-8.533h8.533 c5.12,0,8.533,3.413,8.533,8.533C143.96,276.973,140.547,280.387,135.427,280.387z"></path> <path d="M212.227,280.387h-8.533c-5.12,0-8.533-3.413-8.533-8.533c0-5.12,3.413-8.533,8.533-8.533h8.533 c5.12,0,8.533,3.413,8.533,8.533C220.76,276.973,217.347,280.387,212.227,280.387z"></path> <path d="M374.36,280.387h-68.267c-5.12,0-8.533-3.413-8.533-8.533v-68.267c0-5.12,3.413-8.533,8.533-8.533h68.267 c5.12,0,8.533,3.413,8.533,8.533v68.267C382.893,276.973,379.48,280.387,374.36,280.387z M314.627,263.32h51.2v-51.2h-51.2V263.32z "></path> <path d="M306.093,280.387h-8.533c-5.12,0-8.533-3.413-8.533-8.533c0-5.12,3.413-8.533,8.533-8.533h8.533 c5.12,0,8.533,3.413,8.533,8.533C314.627,276.973,311.213,280.387,306.093,280.387z"></path> <path d="M382.893,280.387h-8.533c-5.12,0-8.533-3.413-8.533-8.533c0-5.12,3.413-8.533,8.533-8.533h8.533 c5.12,0,8.533,3.413,8.533,8.533C391.427,276.973,388.013,280.387,382.893,280.387z"></path> <path d="M280.493,143.853h-51.2c-5.12,0-8.533-3.413-8.533-8.533v-17.067c0-18.773,15.36-34.133,34.133-34.133 s34.133,15.36,34.133,34.133v17.067C289.027,140.44,285.613,143.853,280.493,143.853z M237.827,126.787h34.133v-8.533 c0-9.387-7.68-17.067-17.067-17.067c-9.387,0-17.067,7.68-17.067,17.067V126.787z"></path> <path d="M451.16,510.787H58.627c-5.12,0-8.533-3.413-8.533-8.533V186.52c0-5.12,3.413-8.533,8.533-8.533h11.947l41.813-73.387 c0.853-1.707,1.707-2.56,3.413-3.413l134.827-67.413c2.56-0.853,5.12-0.853,7.68,0l134.827,67.413 c1.707,0.853,2.56,1.707,3.413,3.413l41.813,73.387h12.8c5.12,0,8.533,3.413,8.533,8.533v315.733 C459.693,507.373,456.28,510.787,451.16,510.787z M67.16,493.72h375.467V195.053h-8.533c-3.413,0-5.973-1.707-7.68-4.267 l-43.52-75.093l-128-64.853l-128,64.853l-43.52,75.093c-1.707,2.56-4.267,4.267-7.68,4.267H67.16V493.72z"></path> </g> </g></svg>
              </div>
              <div className="farm__text">
                <p className="farm__name">
                  <b>ID:</b> {farm.idFarm.toString().substring(0,14)}...{farm.idFarm.toString().substring(farm.idFarm.toString().length - 14)}
                </p>
                <div className="farm__text-btns">
                  <div className="farm__text-btns-item">
                    <p>
                      <b>Capacity</b> lvl: {farm.capacityLvl.toString()} 
                    </p>
                    <button className="btn btn_yellow" onClick={(e) => _handleUpgradeCapacityLevel(farm.idFarm, farm.capacityLvl, e) }>  Upgrade {MAX_CAPACITY_UPGRADE_COST * Number(farm.capacityLvl)} <img src='https://i.ibb.co/0Bt8Bn5/icon.png' alt='CRT Icon' style={{ width: '30px', height: '30px', verticalAlign: 'middle' , marginRight: '-7x'}} />  </button>
                  </div>
                  <div className="farm__text-btns-item">
                    <p>
                      <b>Rate</b> lvl: {farm.rateLvl.toString()}
                    </p>
                    <button className="btn btn_yellow" onClick={(e) => _handleUpgradeRateLevel(farm.idFarm, farm.rateLvl, e)}> Upgrade {REWARD_RATE_UPGRADE_COST * Number(farm.rateLvl)} <img src='https://i.ibb.co/0Bt8Bn5/icon.png' alt='CRT Icon' style={{ width: '30px', height: '30px', verticalAlign: 'middle' , marginRight: '-7x'}} /> </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
          <div className="farm__bottom">
            <button className="btn" onClick={(e) => _handleClaimRewards(farm.idFarm, e)}> Claim 
              <span>{Math.round(_calculateCapacity(farm).rewards)}/{_calculateCapacity(farm).calculatedCapacity} (+{_calculateCapacity(farm).calculatedRewardRate/10}/sec) </span>
              <div style={{ width: `${(_calculateCapacity(farm).rewards / _calculateCapacity(farm).calculatedCapacity)* 100}%` }} className={(_calculateCapacity(farm).rewards / _calculateCapacity(farm).calculatedCapacity)* 100 === 100 ? "bg full" : "bg"}></div>
            </button>
          </div>
          {/* <div className="farm__action">
            <button onClick={(e) => _handleSellFarm(farm.idFarm,e)}> Sell Farm </button>
          </div> */}
        </li>
      );
    });

    return farmsList;
  };


  const _addToken = async () => {
    if (!currentConnection?.p2e_game || !currentConnection?.signer || !currentConnection?.token) {
      return false;
    }

    const tokenAddress = "0xe9a5b2Ca78841EB2C7135aEB616Ac0851093957c";
    const tokenSymbol = "CRT";
    const tokenDecimals = 18;
    const tokenImage = "https://ibb.co/5GncnTQ";
    
    try {
        // 'wasAdded' is a boolean. Like any RPC method, an error can be thrown.
        const wasAdded = await window.ethereum.request({
            method: "wallet_watchAsset",
            params: {
                type: "ERC20",
                options: {
                    // The address of the token.
                    address: tokenAddress,
                    // A ticker symbol or shorthand, up to 5 characters.
                    symbol: tokenSymbol,
                    // The number of decimals in the token.
                    decimals: tokenDecimals,
                    // A string URL of the token logo.
                    image: tokenImage,
                },
            },
        });
    
        if (wasAdded) {
            console.log("Thanks for your interest!");
        } else {
            console.log("Your loss!");
        }
    } catch (error) {
        console.log(error);
    }
    
    
  };

    const _openWebsite = () => {
        // Открываем сайт в новой вкладке браузера
        window.open("https://app.uniswap.org/swap", "_blank");
    };




  return (
    <main className="container">
      {!currentConnection?.signer && (
        <ConnectWallet
          connectWallet={_connectWallet}
          networkError={networkError}
          dismiss={_dismissNetworkError}
        />
      )}

      {currentConnection?.signer && (
        <div style={{ display: 'flex', alignItems: 'center' }}>
          <p style={{ marginBottom: '10px', marginRight: '10px' }}>
            <span className="address">
              {currentConnection.signer.address.substring(0,5)}...{currentConnection.signer.address.substring(currentConnection.signer.address.length - 5)}
              <img src='https://upload.wikimedia.org/wikipedia/commons/thumb/3/36/MetaMask_Fox.svg/512px-MetaMask_Fox.svg.png'/>
            </span>
          </p>
          <button className="btn btn_yellow" style={{ marginRight: '15px' }} onClick={_addToken}> Add token </button>
          <button className="btn btn_yellow" onClick={_openWebsite}> Buy/Sell token </button>
        </div>
      )}

      {txBeingSent && <WaitingForTransactionMessage txHash={txBeingSent} />}

      {transactionError && (
        <TransactionErrorMessage
          message={_getRpcErrorMessage(transactionError)}
          dismiss={_dismissTransactionError}
        />
      )}

      {currentBalance && (
        <p style={{ marginBottom: '10px' }}>
          <b>Your balance: </b> 
          
          {Number(ethers.formatEther(currentBalance)).toFixed(1)} <img src='https://i.ibb.co/0Bt8Bn5/icon.png' alt='CRT Icon' style={{ width: '30px', height: '30px', verticalAlign: 'middle' , marginRight: '-7x'}} /> CRT
        </p>
      )}
      
      {currentConnection?.signer && (<button className="btn btn_yellow" onClick={(e) => _handleBuyFarm(e)}>
        Buy Farm 100<img src='https://i.ibb.co/0Bt8Bn5/icon.png' alt='CRT Icon' style={{ width: '30px', height: '30px', verticalAlign: 'middle' , marginRight: '-7x'}} />
      </button>)}

      {farms!!.length > 0 && <ul className="farms">{availableFarms()}</ul>}


      <div className="alerts">
        {alerts.map((alert) => (
          <Alert key={alert.id} id={alert.id} type={alert.type} message={alert.message} onClose={removeAlert} />
        ))}
      </div>

    </main>
  );
}

