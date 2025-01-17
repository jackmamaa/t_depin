import { useState } from 'react'
import { useAccount, useChainId } from 'wagmi'
import { formatEther } from 'viem'
import { getPublicClient, getNetworkConfig } from '../config'
import { useApi } from '../api';

export interface DepositInfo {
  wallet_address?: string;
  name?: string;
  tx_hash?: string;
  deposit_id: string;
  expiration: number;
  allocation_id?: string;
  amount: number;
  balance?: number;
  nonce?: bigint;
  state?: string;
}

export function useDeposit() {
  const { address } = useAccount()
  const [deposits, setDeposits] = useState<DepositInfo[]>([])
  const [reloadDeposits, setReloadDeposits] = useState<number>(0)
  const chainId = useChainId()
  const publicClient = getPublicClient(chainId)
  const networkConfig = getNetworkConfig(chainId)
  const apiRequest = useApi()

  const addDeposit = async (datas: DepositInfo) => {
    try {
      const response = await apiRequest.post('/insert/deposit', { data: datas });
      return response
    } catch (error) {
      console.error('Add deposit failed:', error);
      throw error;
    }
  }
  
  const updateDeposit = async (depositId: string, updates: any) => {
    try {
      const response = await apiRequest.put(`/update/deposit/${depositId}`, { updates });
      return response
    } catch (error) {
      console.error('Update deposit for id failed:', error);
      throw error;
    }
  }

  const deleteDeposit = async (depositId: string) => {
    try {
      const response = await apiRequest.delete(`/delete/deposit/${depositId}`);
      return response
    } catch (error) {
      console.error('Deposit Info Deleted Failed', error);
      throw error;
    }
  }

  const createAllocation = async (datas: DepositInfo, depositId: string) => {
    try {
      const depositInfo = {
        contract: networkConfig.contracts.LOCK_CONTRACT_ADDRESS,
        tempId: datas.deposit_id,
        id: depositId,
        tx_hash: datas.tx_hash,
        budget: datas.amount,
        expirationSec: datas.expiration,
      }
      const response = await apiRequest.post('/deposit/create-allocation', { deposit: depositInfo });
      if (response.ok) {
        return response.data
      } else {
        throw new Error(response.details)
      }
    } catch (error) {
      console.error('Create deposit failed:', error);
      throw error;
    }
  }

  const updateAllocation = async (allocationId: string, depositId: string, newTotalAmount: number, newValidTo: number) => {
    try {
      const response = await apiRequest.put(`/deposit/update-allocation/${allocationId}`, { depositId, newTotalAmount, newValidTo });
      return response
    } catch (error: any) {
      throw error;
    }
  }

  const getDepositData = async (deposit: DepositInfo) => {
    try {
      const result = await publicClient.readContract({
        address: networkConfig.contracts.LOCK_CONTRACT_ADDRESS as `0x${string}`,
        abi: networkConfig.abis.LockPaymentAbi,
        functionName: 'getDeposit',
        args: [BigInt(deposit.deposit_id)],
      }) as { validTo: bigint; amount: bigint; nonce: bigint }
      if (result) {
        const updatedDeposit: DepositInfo = {
          wallet_address: deposit.wallet_address,
          name: deposit.name,
          tx_hash: deposit.tx_hash,
          deposit_id: deposit.deposit_id,
          expiration: Number(result.validTo),
          allocation_id: deposit.allocation_id,
          amount: deposit.amount,
          balance: Number(formatEther(result.amount)),
          nonce: result.nonce,
          state: result.validTo > Math.floor(Date.now() / 1000) ? 'Active' : 'Expired',
        }

        setDeposits(prevDeposits => {
          const index = prevDeposits.findIndex(d => d.deposit_id === deposit.deposit_id)
          if (index !== -1) {
            const newDeposits = [...prevDeposits]
            newDeposits[index] = updatedDeposit
            return newDeposits
          } else {
            return [...prevDeposits, updatedDeposit]
          }
        })
      }
    } catch (error) {
      console.error('Deposit data get failed', error)
    }
  }

  const getDeposits = async () => {
    try {
      const response = await apiRequest.get(`/get/deposit/${address}`);
      const deposits = Array.isArray(response.data as DepositInfo[]) && response.data;
      const existingDepositIds = deposits.map((d: any) => d.deposit_id);
      setDeposits(prevDeposits => 
        prevDeposits.filter(d => existingDepositIds.includes(d.deposit_id))
      );
      for (const deposit of deposits) {
        if (!deposit.deposit_id.includes('pending')) {
          await getDepositData(deposit);
        } else {
          setDeposits(prevDeposits => {
            const existingIndex = prevDeposits.findIndex(d => d.deposit_id === deposit.deposit_id);
            if (existingIndex >= 0) {
              const updatedDeposits = [...prevDeposits];
              updatedDeposits[existingIndex] = deposit;
              return updatedDeposits;
            }
            return [...prevDeposits, deposit];
          });
        }
      }
    } catch (error) {
      console.error('Check Existing Deposits Failed:', error);
      throw error;
    }
  }

  return {
    deposits,
    setDeposits,
    reloadDeposits,
    setReloadDeposits,
    getDepositData, 
    getDeposits,
    createAllocation,
    addDeposit,
    updateDeposit,
    deleteDeposit,
    updateAllocation,
  }
}