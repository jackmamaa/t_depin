import { useAccount, useReadContract, useWalletClient, useChainId } from 'wagmi'
import { useState } from 'react'
import { ethers } from 'ethers'
import { toast } from 'react-toastify'
import { getNetworkConfig } from '../config'
import { useGlobalContext } from '../context/GlobalContext'
import { useApi } from '../api'
import { FaRegCheckCircle } from "react-icons/fa";

interface ClaimConfig {
  address: string;
  nonce: number;
  signature: string;
}

export default function ClaimFaucet() {
  const { address } = useAccount()
  const { data: walletClient } = useWalletClient()
  const { isWalletConnected, networkName, isFaucetClaimed, setIsFaucetClaimed } = useGlobalContext()
  const [ isLoading, setIsLoading ] = useState(false)
  const chainId = useChainId()
  const networkConfig = getNetworkConfig(chainId)
  const apiRequest = useApi()
  const { data: nonce } = useReadContract({
    address: networkConfig.contracts.FAUCET_CONTRACT_ADDRESS as `0x${string}`,
    abi: networkConfig.abis.FaucetAbi,
    functionName: 'getNonce',
    args: [address],
  })

  const claimFaucet = async () => {
    if (!address || !isWalletConnected) {
      toast.error('Wallet not connected')
      return
    }
    setIsLoading(true)
    
    try {
      const provider = new ethers.providers.Web3Provider(walletClient as any)
      const signer = provider.getSigner()

      const messageHash = ethers.utils.solidityKeccak256(
        ['address', 'uint256', 'address'],
        [address, nonce, networkConfig.contracts.FAUCET_CONTRACT_ADDRESS]
      )
      const messageHashBinary = ethers.utils.arrayify(messageHash)
      const signature = await signer.signMessage(messageHashBinary)
      const claimConfig: ClaimConfig = { address, nonce: Number(nonce), signature }

      const response = await apiRequest.post('/faucet/claim', { claimConfig })
      if (!response.ok) {
        throw new Error(response.error)
      }
      if (response.status === 200) {
        toast.success(`Transaction sent ${response.data.txHash}`)
        toast.success('Tokens claimed successfully')
      } else {
        toast.info(response.details)
      }
      setIsFaucetClaimed(true)
    } catch (error: any) {
      console.error('Claim tokens failed:', error)
      toast.error(error.message || 'Claim tokens failed')
      
      if (error.message === 'Faucet already claimed') {
        setIsFaucetClaimed(true)
      }
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="card bg-base-100 w-full h-full">
      <div className="card-body">
        <h1 className="text-2xl font-bold mb-8 text-base-content">Faucet</h1>
        {isWalletConnected && networkName === 'holesky' ? (
          <div className="flex-1 flex items-center justify-center py-8">
            <div className="text-center max-w-2xl mx-auto bg-base-200 p-8 rounded-xl">
              <div className="space-y-6 mb-8">
                <h2 className="text-xl font-bold text-primary">GolemNetwork Testnet Faucet</h2>
                <div className="space-y-4">
                  <p className="text-lg text-base-content/70">
                    Get some GLM tokens on the holesky testnet.
                  </p>
                  <div className="bg-base-300 p-4 rounded-lg">
                    <p className="text-lg font-medium text-primary">Rewards:</p>
                    <ul className="mt-2 space-y-2">
                      <li className="text-base-content/70">• 10 GLM</li>
                      <li className="text-base-content/70">• 0.01 ETH</li>
                    </ul>
                  </div>
                  <p className="text-sm text-base-content/60 italic">
                    Note: Each address can only claim once.
                  </p>
                </div>
              </div>
              
              <button
                onClick={isFaucetClaimed ? undefined : claimFaucet}
                disabled={isLoading || isFaucetClaimed}
                className={`btn btn-primary btn-xl w-64`}
              >
                {isLoading
                 ? <span className="loading loading-spinner">Claiming...</span>
                 : isFaucetClaimed
                  ? 'Claimed'
                  : 'Claim Tokens'}
              </button>
              
              {isFaucetClaimed && (
                <div className="mt-6 alert alert-success shadow-lg">
                  <FaRegCheckCircle />
                  <span>You have successfully claimed your tokens!</span>
                </div>
              )}
            </div>
          </div>
        ) : (
          <div className="alert alert-warning shadow-lg">
            <span>Only supported on holesky claim faucet</span>
          </div>
        )}
      </div>
    </div>
  )
}
