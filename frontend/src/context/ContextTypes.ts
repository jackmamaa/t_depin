import { DepositInfo } from '../hooks/useDeposit'
import { InstanceInfo, ProviderResources } from '../hooks/useInstance'
import { VpnInfo } from '../hooks/useVPN'
import { SshKey } from '../sshKey/useKey'
import { LaunchScript } from '../launchScript/useScript'

export interface LoadingStates {
    isUpdating: boolean;
    isClaimingFaucet: boolean;
    isTerminatingDeposit: boolean;
    isInstanceCreating: Map<string, boolean>;
    isInstanceTerminating: boolean;
    isVpnCreating: boolean;
    isVpnTerminating: boolean;
    isLoadingResources: boolean;
    isInstancesLoading: boolean;
    isDepositsLoading: boolean;
    isVPNsLoading: boolean;
    isKeysLoading: boolean;
    isScriptsLoading: boolean;
}

export interface GlobalContextType {
  // Deposits
  deposits: DepositInfo[]
  setDeposits: React.Dispatch<React.SetStateAction<DepositInfo[]>>
  reloadDeposits: number
  setReloadDeposits: React.Dispatch<React.SetStateAction<number>>
  getDeposits: () => Promise<void>
  getDepositData: (deposit: DepositInfo) => Promise<void>

  // Instances
  instances: InstanceInfo[]
  setInstances: React.Dispatch<React.SetStateAction<InstanceInfo[]>>
  reloadInstances: number
  setReloadInstances: React.Dispatch<React.SetStateAction<number>>
  getInstances: () => Promise<void>
  providerResources: ProviderResources[]
  getInstanceResources: (providerId: string) => Promise<void>

  // VPCs
  vpns: VpnInfo[]
  setVPNs: React.Dispatch<React.SetStateAction<VpnInfo[]>>
  reloadVPNs: number
  setReloadVPNs: React.Dispatch<React.SetStateAction<number>>
  getVPNs: () => Promise<void>

  // SSH Keys
  keys: SshKey[]
  setKeys: React.Dispatch<React.SetStateAction<SshKey[]>>
  reloadKeys: number
  setReloadKeys: React.Dispatch<React.SetStateAction<number>>
  getKeys: () => Promise<void>

  // Scripts
  scripts: LaunchScript[]
  setScripts: React.Dispatch<React.SetStateAction<LaunchScript[]>>
  reloadScripts: number
  setReloadScripts: React.Dispatch<React.SetStateAction<number>>
  getScripts: () => Promise<void>

  // Wallet & Network
  address: `0x${string}` | undefined
  chainId: number | undefined
  balance: string
  glmBalance: string
  isHolesky: boolean
  isPolygon: boolean
  networkName: string
  isWalletConnected: boolean

  // Faucet
  isFaucetClaimed: boolean
  setIsFaucetClaimed: React.Dispatch<React.SetStateAction<boolean>>
  checkFaucetStatus: () => Promise<void>

  // Utilities
  isLoadingState: LoadingStates
  setIsLoadingState: React.Dispatch<React.SetStateAction<LoadingStates>>
  randomString: (length: number) => string
  truncateId: (id: string | number | undefined | null, start?: number, end?: number) => string
  checkDecimalZero: (value: string | number, fixed?: number) => number | string;
  fetchWithoutLoading: (fetchFn: () => Promise<void>) => Promise<void>
} 