import { createContext, useContext, useState, useEffect } from 'react'
import { useAccount, useBalance, useChainId } from 'wagmi'
import { formatEther } from 'viem'
import { configs, getNetworkName, getNetworkConfig } from '../config'
import { useDeposit } from '../hooks/useDeposit'
import { useInstance, InstanceInfo } from '../hooks/useInstance'
import { useVPN } from '../hooks/useVPN'
import { useKey } from '../sshKey/useKey'
import { useScript } from '../launchScript/useScript'
import { GlobalContextType, LoadingStates } from './ContextTypes'
import { useApi } from '../api'

const GlobalContext = createContext<GlobalContextType | undefined>(undefined)

export const GlobalProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const deposit = useDeposit()
  const instance = useInstance()
  const vpn = useVPN()
  const key = useKey()
  const script = useScript()
  const chainId = useChainId()
  const networkConfig = getNetworkConfig(chainId)
  const { address, isConnected } = useAccount()
  const [isWalletConnected, setIsWalletConnected] = useState(false)
  const [isFaucetClaimed, setIsFaucetClaimed] = useState(false)
  const [isLoadingState, setIsLoadingState] = useState<LoadingStates>({
    isUpdating: false,
    isClaimingFaucet: false,
    isTerminatingDeposit: false,
    isInstanceCreating: new Map<string, boolean>(),
    isInstanceTerminating: false,
    isVpnCreating: false,
    isVpnTerminating: false,
    isLoadingResources: false,
    isInstancesLoading: false,
    isDepositsLoading: false,
    isVPNsLoading: false,
    isKeysLoading: false,
    isScriptsLoading: false
  })

  const { data: ethBalance } = useBalance({ address, query: { refetchInterval: 1000 } })
  const { data: glmBalance } = useBalance({
    address,
    token: networkConfig?.contracts.GLM_CONTRACT_ADDRESS as `0x${string}`,
    query: {
      refetchInterval: 1000
    }
  })

  const isHolesky = chainId === configs.holesky.ChainId
  const isPolygon = chainId === configs.polygon.ChainId
  const networkName = (getNetworkName(chainId) || 'Unknown Network').toLowerCase()
  const apiRequest = useApi()

  const truncateId = (id: string | number | undefined | null, start: number = 8, end: number = 8) => {
    if (!id) return '---'
    const str = id.toString()
    return str.length <= start + end ? str : `${str.slice(0, start)}...${str.slice(-end)}`
  }

  const randomString = (length: number): string => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'
    return Array.from({ length }, () => chars.charAt(Math.floor(Math.random() * chars.length))).join('')
  }

  const checkDecimalZero = (value: string | number, fixed: number = 6): number | string => {
    const numValue = Number(value)
    if (numValue === 0) {
      return 0
    }
    const multiplier = Math.pow(10, fixed)
    const truncatedNum = Math.floor(Math.abs(numValue) * multiplier) / multiplier
    const minValue = Number(`0.${'0'.repeat(fixed-1)}1`)
    if (truncatedNum < minValue) {
     return `< ${minValue}`
    }
    
    return numValue < 0 ? -truncatedNum : truncatedNum
  }

  const checkFaucetStatus = async () => {
    try {
      const data = await apiRequest.get(`/faucet/check/${address}`)
      setIsFaucetClaimed(data.success)
    } catch (error) {
      console.error('Failed to check faucet status:', error)
    }
  }

  const updateVpnNodes = () => {
    if (instance.instances.length >= 0 && vpn.vpns.length > 0) {
      const vpcInstances = new Map<string, Set<string>>()
      vpn.vpns.forEach(vpn => vpcInstances.set(vpn.vpn_id, new Set()))
      
      instance.instances.forEach((instance: InstanceInfo) => {
        if (instance.vpn_id && instance.ipv4_address) {
          vpcInstances.get(instance.vpn_id)?.add(instance.ipv4_address)
        }
      })

      vpn.setVPNs(prevVPNs => prevVPNs.map(vpn => ({
        ...vpn,
        nodes: Array.from(vpcInstances.get(vpn.vpn_id) || [])
      })))
    }
  }

  const fetchWithLoading = async (fetchFn: () => Promise<void>, loadingState: keyof LoadingStates) => {
    setIsLoadingState(prev => ({...prev, [loadingState]: true}))
    try {
      await fetchFn()
    } finally {
      setIsLoadingState(prev => ({...prev, [loadingState]: false}))
    }
  }

  const fetchWithoutLoading = async (fetchFn: () => Promise<void>) => {
    try {
      await fetchFn()
    } catch (error) {
      console.error('Auto refresh failed:', error)
    }
  }

  useEffect(() => {
    setIsWalletConnected(isConnected)
    if (!isConnected) {
      deposit.setDeposits([])
      instance.setInstances([])
      vpn.setVPNs([])
      key.setKeys([])
      script.setScripts([])
    }
  }, [isConnected])

  useEffect(() => {
    if (isWalletConnected && networkName === 'holesky') checkFaucetStatus()
  }, [
    isWalletConnected, 
    address, 
    networkName
  ])

  useEffect(() => {
    fetchWithLoading(deposit.getDeposits, 'isDepositsLoading')
  }, [
    isWalletConnected, 
    address, 
    networkName, 
    deposit.reloadDeposits
  ])

  useEffect(() => {
    fetchWithLoading(instance.getInstances, 'isInstancesLoading')
  }, [
    isWalletConnected, 
    address, 
    networkName, 
    instance.reloadInstances
  ])

  useEffect(() => {
    fetchWithLoading(key.getKeys, 'isKeysLoading')
  }, [
    isWalletConnected, 
    address, 
    networkName, 
    key.reloadKeys
  ])

  useEffect(() => {
    fetchWithLoading(script.getScripts, 'isScriptsLoading')
  }, [
    isWalletConnected, 
    address, 
    networkName, 
    script.reloadScripts
  ])


  useEffect(() => {
    fetchWithLoading(vpn.getVPNs, 'isVPNsLoading')
  }, [
    isWalletConnected, 
    address, 
    networkName, 
    vpn.reloadVPNs
  ])

  useEffect(() => {
    updateVpnNodes()
  }, [instance.instances, vpn.vpns.length])

  const contextValue: GlobalContextType = {
    ...deposit,
    ...instance,
    ...vpn,
    ...key,
    ...script,
    isLoadingState,
    setIsLoadingState,
    truncateId,
    randomString,
    checkDecimalZero,
    isFaucetClaimed,
    setIsFaucetClaimed,
    checkFaucetStatus,
    address,
    chainId,
    balance: ethBalance ? formatEther(ethBalance.value) : '-',
    glmBalance: glmBalance ? formatEther(glmBalance.value) : '-',
    isHolesky,
    isPolygon,
    networkName,
    isWalletConnected,
    fetchWithoutLoading
  }

  return (
    <GlobalContext.Provider value={contextValue}>
      {children}
    </GlobalContext.Provider>
  )
}

export const useGlobalContext = () => {
  const context = useContext(GlobalContext)
  if (!context) {
    throw new Error('useGlobalContext must be used within a GlobalProvider')
  }
  return context
}
