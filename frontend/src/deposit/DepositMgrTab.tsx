import { useState, useEffect, useRef } from 'react'
import { useAccount, useChainId, useWalletClient } from 'wagmi'
import { parseEther } from 'viem'
import { toast } from 'react-toastify'
import { configs, getPublicClient, getNetworkConfig } from '../config'
import { useGlobalContext } from '../context/GlobalContext'
import { CreateDepositForm } from './CreateDepositForm'
import { useDeposit, DepositInfo } from '../hooks/useDeposit'
import { PopupWindow, ActionDropdown } from '../components'
import DepositTable from './DepositTable'
import DepositDetails from './DepositDetailsForm'
import { useParams, useNavigate } from 'react-router-dom'

export default function DepositMgr() {
  const { 
    instances,
    deposits, 
    glmBalance, 
    networkName,
    setDeposits, 
    setReloadDeposits,  
    truncateId,
    checkDecimalZero,
    isLoadingState,
    setIsLoadingState,
  } = useGlobalContext()
  const { addDeposit, updateDeposit, deleteDeposit, createAllocation, updateAllocation } = useDeposit()
  const { address } = useAccount()
  const { data: walletClient } = useWalletClient()
  const chainId = useChainId()
  const publicClient = getPublicClient(chainId)
  const networkConfig = getNetworkConfig(chainId)
  const [selectedDeposits, setSelectedDeposits] = useState<string[]>([])
  const [formType, setFormType] = useState<'new' | 'modify'>('new')
  const [selectedDeposit, setSelectedDeposit] = useState<DepositInfo | null>(null)
  const [detailPanelHeight, setDetailPanelHeight] = useState(400)
  const [showTerminateConfirm, setShowTerminateConfirm] = useState(false)
  const [showDepositForm, setShowDepositForm] = useState(false)
  const [formValues, setFormValues] = useState({
    name: '',
    amount: 0.1,
    additionalAmount: 0.1,
    validTo: new Date(new Date().getTime() - (new Date().getTimezoneOffset() * 60000))
      .toISOString()
      .slice(0, 16)
  })
  const { depositId } = useParams();
  const navigate = useNavigate();
  const flatFeeAmount = import.meta.env.VITE_DEPOSIT_FEE_AMOUNT
  const tableRef = useRef<HTMLDivElement>(null);
  const [headerHeight, setHeaderHeight] = useState(0);
  const headerRef = useRef<HTMLDivElement>(null);
  const [tableHeaderHeight, setTableHeaderHeight] = useState(0);
  const tableHeaderRef = useRef<HTMLTableSectionElement>(null);

  const createAllowance = async (amount: bigint = parseEther('1000')) => {
    if (!walletClient || !address) {
      toast.error('Wallet not connected')
      return
    }

    try {
      const { request } = await publicClient.simulateContract({
        address: networkConfig.contracts.GLM_CONTRACT_ADDRESS as `0x${string}`,
        abi: networkConfig.abis.GlmAbi,
        functionName: 'increaseAllowance',
        args: [networkConfig.contracts.LOCK_CONTRACT_ADDRESS, amount],
        account: address,
      })
      const hash = await walletClient.writeContract(request)
      await publicClient.waitForTransactionReceipt({ hash })
      toast.success('Allowance created')
      return true
    } catch (error) {
      if (error instanceof Error && error.message.includes('User rejected the request')) {
        toast.info('Create allowance cancelled')
      } else {
        console.error('createAllowanceFailed', error)
        toast.error('Create allowance failed')
      }
      return false
    }
  }

  const checkAllowance = async (amount: bigint) => {
    const allowance = await publicClient.readContract({
      address: networkConfig.contracts.GLM_CONTRACT_ADDRESS as `0x${string}`,
      abi: networkConfig.abis.GlmAbi,
      functionName: 'allowance',
      args: [address, networkConfig.contracts.LOCK_CONTRACT_ADDRESS],
    }) as bigint
    return allowance >= amount
  }

  const sendDeposit = async (amount: number, flatFeeAmount: number, validToTimestamp: number) => {
    if (!walletClient || !address) {
      toast.error('Wallet not connected')
      return null
    }

    const nonce = Math.floor(Math.random() * 1000000)
    try {
      const { request } = await publicClient.simulateContract({
        address: networkConfig.contracts.LOCK_CONTRACT_ADDRESS as `0x${string}`,
        abi: networkConfig.abis.LockPaymentAbi,
        functionName: 'createDeposit',
        args: [
          BigInt(nonce),
          configs.YAGNA_REQUESTOR_ADDRESS,
          parseEther(amount.toString()),
          parseEther(flatFeeAmount.toString()),
          BigInt(validToTimestamp),
        ],
        account: address,
      })
      const hash = await walletClient.writeContract(request)
      const receipt = await publicClient.waitForTransactionReceipt({ hash })
      const depositId = await getDepositId(nonce, address)
      return depositId && { depositId, hash: receipt.transactionHash, nonce }
    } catch (error) {
      if (error instanceof Error && error.message.includes('User rejected the request')) {
        toast.info('Transaction cancelled')
        return false
      } else {
        console.error('Failed to create deposit', error)
        toast.error('Failed to create deposit')
      }
    }
    return null
  }

  const getDepositId = async (nonce: number, funder: string) => {
    const result = await publicClient.readContract({
      address: networkConfig.contracts.LOCK_CONTRACT_ADDRESS as `0x${string}`,
      abi: networkConfig.abis.LockPaymentAbi,
      functionName: 'idFromNonceAndFunder',
      args: [BigInt(nonce), funder as `0x${string}`],
    })
    return result ? result.toString() : null
  }

  const handleSubmitCreate = async (values: any) => {
    const now = Math.floor(Date.now() / 1000)
    const validToTimestamp = Math.floor(new Date(values.validTo).getTime() / 1000)
    if (validToTimestamp <= now) {
      toast.error('Valid to date must be in the future')
      return
    }

    let amount = values.amount
    let balance = checkDecimalZero(glmBalance)
    if (typeof balance === 'string') {
      toast.error('Insufficient balance')
      return
    }
    if (balance === amount) {
      amount -= Number(flatFeeAmount)
    }

    const totalAmount = Number(amount) + Number(flatFeeAmount)
    const tempId = 'pending_' + Date.now()
    const tempDeposit: DepositInfo = {
      wallet_address: address as `0x${string}`,
      name: values.name,
      deposit_id: tempId,
      amount: amount,
      expiration: validToTimestamp,
      state: 'Creating',
    }
    setDeposits(prev => [...prev, tempDeposit])
    setIsLoadingState(prev => ({...prev, isCreatingDeposit: true}))
    await addDeposit(tempDeposit)

    try {
      const checkAllowanceResult = await checkAllowance(parseEther(totalAmount.toString()))
      if (!checkAllowanceResult) {
        const createAllowanceResult = await createAllowance(parseEther(totalAmount.toString()))
        if (!createAllowanceResult) throw new Error('Failed to create allowance')
      }

      const result = await sendDeposit(amount, flatFeeAmount, validToTimestamp)
      if (result) {
        const { depositId, hash, nonce } = result
        const allocation = await createAllocation({ ...tempDeposit, tx_hash: hash }, depositId)
        if (allocation) {
          setDeposits(prev => prev.map(d => 
            d.deposit_id === tempId ? {
              ...d,
              deposit_id: depositId,
              allocation_id: allocation.id,
              tx_hash: hash,
              balance: amount,
              nonce: BigInt(nonce),
              state: 'Active'
            } : d
          ))
        } else {
          throw new Error('Failed to create allocation')
        }
      } else {
        throw new Error('Failed to create deposit')
      }
    } catch (error) {
      if (error instanceof Error && !error.message.includes('allowance')) {
        toast.error('Failed to create deposit')
      }
      deleteDeposit(tempId)
      setDeposits(prev => prev.filter(d => d.deposit_id !== tempId))
    } finally {
      setIsLoadingState(prev => ({...prev, isCreatingDeposit: false}))
    }
  }

  const checkBeforeActions = (depositId: string) => {
    const deposit = deposits.find(d => d.deposit_id === depositId)
    if (deposit && (deposit.expiration <= Math.floor(Date.now() / 1000))) {
      toast.info(`Deposit expired`)
      return false
    }
    return true
  }

  const handleTerminateDeposit = async (depositIds: string[]) => {
    if (!walletClient || !address) {
      toast.info('Please reconnect your wallet first');
      return
    }
    let depositsToTerminate: DepositInfo[] = []
    let currentTimestamp = BigInt(Math.floor(Date.now() / 1000))
    try {
      depositsToTerminate = deposits.filter(d => 
        depositIds.includes(d.deposit_id) && BigInt(d.expiration) < currentTimestamp
      );

      if (depositsToTerminate.length === 0) {
        toast.info('No expired deposits to terminate');
        return;
      }

      const nonExpiredDepositIds = depositIds.filter(id => !depositsToTerminate.map(d => d.deposit_id).includes(id));
      if (nonExpiredDepositIds.length > 0) {
        toast.info(`Deposit not yet due, unable to terminate\n${nonExpiredDepositIds.join(', ')}`);
      }

      const depositNonces = depositsToTerminate.map(d => BigInt(d.nonce || 0));
      setDeposits(prev => prev.map(d => 
        depositsToTerminate.map(td => td.deposit_id).includes(d.deposit_id) ? {...d, state: 'Terminating'} : d
      ))

      const { request } = await publicClient.simulateContract({
        address: networkConfig.contracts.LOCK_CONTRACT_ADDRESS as `0x${string}`,
        abi: networkConfig.abis.LockPaymentAbi,
        functionName: 'terminateDeposit',
        args: [depositNonces],
        account: address,
      })
      const hash = await walletClient.writeContract(request)
      await publicClient.waitForTransactionReceipt({ hash })
      depositsToTerminate.forEach(deposit => deleteDeposit(deposit.deposit_id))
    
      setDeposits(prevDeposits => prevDeposits.filter(d => !depositsToTerminate.map(td => td.deposit_id).includes(d.deposit_id)))
      setSelectedDeposit(null)
      setSelectedDeposits([])
    } catch (error) {
      if (error instanceof Error && error.message.includes('User rejected the request')) {
        toast.info('Terminate cancelled')
        setDeposits(prev => prev.map(d => 
          depositsToTerminate.map(td => td.deposit_id).includes(d.deposit_id) ? {...d, state: 'Expired'} : d
        ))
      } else {
        console.error('Terminate deposit failed', error)
      }
    }
  }

  const handleExtendDeposit = async (depositId: string, nonce: bigint, additionalAmount: number, additionalFlatFee: number, newValidTo: number) => {
    const deposit = deposits.find(d => d.deposit_id === depositId)
    if (!deposit || !walletClient) {
      toast.error('Invalid deposit')
      return
    }
    if (deposit.expiration - 60 <= Math.floor(Date.now() / 1000) && deposit.allocation_id) {
      toast.info('Deposit expires soon, cannot be modified.')
      return
    }

    if (newValidTo <= deposit.expiration && additionalAmount === 0) {
      toast.info('Please modify the amount or extend the time')
      return
    }
  
    try {
      setIsLoadingState(prev => ({...prev, isModifyingDeposit: true}))
      setDeposits(prev => prev.map(d => 
        d.deposit_id === depositId ? {...d, state: 'Modifying'} : d
      ))

      const currentAllowance = await checkAllowance(parseEther(additionalAmount.toString()))
      currentAllowance || await createAllowance(parseEther(additionalAmount.toString()))

      const { request } = await publicClient.simulateContract({
        address: networkConfig.contracts.LOCK_CONTRACT_ADDRESS as `0x${string}`,
        abi: networkConfig.abis.LockPaymentAbi,
        functionName: 'extendDeposit',
        args: [
          BigInt(nonce),
          parseEther(additionalAmount.toString()),
          parseEther(additionalFlatFee.toString()),
          BigInt(newValidTo),
        ],
        account: address,
      })
      const hash = await walletClient.writeContract(request)
      await publicClient.waitForTransactionReceipt({ hash })
      const newTotalAmount = Number(deposit.amount) + additionalAmount
      await updateDeposit(depositId, {
        amount: newTotalAmount,
        expiration: newValidTo
      })
      deposit.allocation_id && await updateAllocation(deposit.allocation_id, depositId, newTotalAmount, newValidTo)
      setDeposits(prev => prev.map(d => 
        d.deposit_id === depositId ? {...d, state: 'Active', expiration: newValidTo, amount: newTotalAmount} : d
      ))
    } catch (error) {
      if (error instanceof Error && error.message.includes('User rejected the request')) {
        toast.info('Modify cancelled')
        setDeposits(prev => prev.map(d => 
          d.deposit_id === depositId ? {...d, state: 'Active'} : d
        ))
      }
    } finally {
      setIsLoadingState(prev => ({...prev, isModifyingDeposit: false}))
    }
  }

  const handleUpdateDepositName = async (depositId: string, newName: string) => {
    const deposit = deposits.find(d => d.deposit_id === depositId)
    if (deposit?.name !== newName) {
      await updateDeposit(depositId, { name: newName })
      setDeposits(prev => prev.map(d => 
        d.deposit_id === depositId ? { ...d, name: newName } : d
      ))
    }
  }

  const handleFormView = (type: 'new' | 'modify') => {
    if (type === 'modify' && !checkBeforeActions(selectedDeposits[0])) return
    setFormType(type)
    setShowDepositForm(true)
    setFormValues(
      type === 'new' 
        ? {
            ...formValues,
            name: '',
            amount: 0.1,
            validTo: new Date(new Date().getTime() - (new Date().getTimezoneOffset() * 60000))
              .toISOString()
              .slice(0, 16)
          }
        : {
            ...formValues,
            name: deposits.find(d => d.deposit_id === selectedDeposits[0])?.name || '',
            additionalAmount: 0.1,
            validTo: new Date(Number(deposits.find(d => d.deposit_id === selectedDeposits[0])?.expiration) * 1000 - 
              (new Date().getTimezoneOffset() * 60000))
              .toISOString()
              .slice(0, 16)
          }
    )
  }

  const handleFormSubmit = async () => {
    setShowDepositForm(false)
    if (formType === 'new') {
      await handleSubmitCreate(formValues)
    } else {
      try {
        for (const depositId of selectedDeposits) {
          const deposit = deposits.find(d => d.deposit_id === depositId)
          if (deposit && deposit.nonce) {
            await handleExtendDeposit(
              depositId, 
              deposit.nonce, 
              Number(formValues.amount), 
              0, 
              Math.floor(new Date(formValues.validTo).getTime() / 1000)
            )
          }
        }
      } catch (error) {
        console.error('Failed to modify deposits', error)
      }
    }
  }

  const canTerminateDeposits = () => {
    if (selectedDeposits.length === 0) return false;
    
    return deposits
      .filter(d => selectedDeposits.includes(d.deposit_id))
      .some(d => d.state === 'Expired');
  }

  const getTerminateDepositStatus = (depositIds: string[]) => {
    const now = Math.floor(Date.now() / 1000)
    return deposits
      .filter(d => depositIds.includes(d.deposit_id))
      .reduce((acc, d) => {
        if (d.expiration <= now) {
          acc.canTerminate.push(d)
        } else {
          acc.cannotTerminate.push(d)
        }
        return acc
      }, { canTerminate: [] as DepositInfo[], cannotTerminate: [] as DepositInfo[] })
  }

  const handleTerminateConfirm = () => {
    setShowTerminateConfirm(false)
    const { canTerminate } = getTerminateDepositStatus(selectedDeposits)
    if (canTerminate.length > 0) {
      handleTerminateDeposit(canTerminate.map(d => d.deposit_id))
    }
  }

  const renderTerminateConfirmContent = () => {
    const { canTerminate, cannotTerminate } = getTerminateDepositStatus(selectedDeposits)
    return (
      <div className="text-left min-w-[400px]">
        {canTerminate.length > 0 && (
          <>
            <h2>Confirm termination:</h2>
            <div className="max-h-[120px] overflow-y-auto pr-2">
                <ul className="list-disc ml-4 text-sm text-base-content/50">
                  {canTerminate.map(d => (
                    <li key={d.deposit_id}>
                      {d.name} - {truncateId(d.deposit_id, 8, 16)} (Expired)
                    </li>
                  ))}
              </ul>
            </div>
          </>
        )}
        {cannotTerminate.length > 0 && (
          <>
              <h2>Unable to terminate:</h2>
              <div className="max-h-[120px] overflow-y-auto pr-2">
                <ul className="list-disc ml-4 text-warning text-sm text-base-content/50">
                  {cannotTerminate.map(d => (
                  <li key={d.deposit_id}>
                    {d.name} - {truncateId(d.deposit_id, 8, 16)} (Not expired)
                  </li>
                ))}
              </ul>
            </div>
          </>
        )}
      </div>
    )
  }

  const handleSelectDeposit = (depositId: string) => {
    setSelectedDeposits(prev => 
      prev.includes(depositId) 
        ? prev.filter(id => id !== depositId)
        : [...prev, depositId]
    )
  }

  const handleRowClick = (deposit: DepositInfo) => {
    setSelectedDeposits(prev => prev.includes(deposit.deposit_id) ? [] : [deposit.deposit_id])
    if (deposit.deposit_id === selectedDeposit?.deposit_id) {
      setSelectedDeposit(null)
      navigate('/deposit')
    } else {
      setSelectedDeposit(deposits.find(d => d.deposit_id === deposit.deposit_id) || null)
      navigate(`/deposit/${deposit.deposit_id}`)
      
      setTimeout(() => {
        const row = document.querySelector(`[data-deposit-id="${deposit.deposit_id}"]`);
        if (row && tableRef.current) {
          const rowRect = row.getBoundingClientRect();
          const containerRect = tableRef.current.getBoundingClientRect();
          
          if (rowRect.bottom > containerRect.bottom || rowRect.top < containerRect.top) {
            row.scrollIntoView({ behavior: 'smooth', block: 'center' });
          }
        }
      }, 100);
    }
  }

  useEffect(() => {
    if (depositId) {
      const deposit = deposits.find(d => d.deposit_id === depositId);
      if (deposit) {
        setSelectedDeposit(deposit);
        setSelectedDeposits([deposit.deposit_id]);
      }
    }
  }, [depositId, deposits]);

  const renderCreateFormContent = () => {
    return (
      <div className="min-w-[500px]">
        <CreateDepositForm
          deposits={deposits}
          type={formType}
          formValues={formValues}
          onValuesChange={setFormValues}
          isLoadingState={isLoadingState}
          availableBalance={checkDecimalZero(glmBalance)}
          balance={glmBalance}
        />
      </div>
    )
  }

  useEffect(() => {
    const updateHeaderHeight = () => {
      if (headerRef.current) {
        setHeaderHeight(headerRef.current.offsetHeight);
      }
    };

    updateHeaderHeight();
    window.addEventListener('resize', updateHeaderHeight);

    return () => {
      window.removeEventListener('resize', updateHeaderHeight);
    };
  }, []);

  useEffect(() => {
    const updateTableHeaderHeight = () => {
      if (tableHeaderRef.current) {
        setTableHeaderHeight(tableHeaderRef.current.offsetHeight);
      }
    };

    updateTableHeaderHeight();
    window.addEventListener('resize', updateTableHeaderHeight);

    return () => {
      window.removeEventListener('resize', updateTableHeaderHeight);
    };
  }, []);

  return (
    <div className="card bg-base-100 w-full h-full">
      <div className="card-body p-0">
        <div className="flex flex-col h-full">
          <div ref={headerRef} className="flex-none bg-base-100">
            <div className="p-8 pb-4">
              <h1 className="text-2xl font-bold">
                Deposit Manager 
                <span className="text-base text-base-content/50">
                  ({selectedDeposits.length}/{deposits.length})
                </span>
              </h1>
            </div>
            
            <div className="p-8 flex justify-between">
              <button
                onClick={() => handleFormView('new')}
                className="btn btn-primary btn-sm">
                Create Deposit
              </button>
              <div className="flex gap-2">
              <button
                  onClick={() => setReloadDeposits(v => v + 1)}
                  className="btn btn-outline btn-sm"
                  disabled={isLoadingState.isDepositsLoading}>
                  Reload
                </button>
                <ActionDropdown 
                  items={[
                    {
                      label: 'Modify',
                      onClick: () => handleFormView('modify'),
                      disabled: selectedDeposit?.state !== 'Active'
                    },
                    {
                      label: 'Terminate',
                      onClick: () => setShowTerminateConfirm(true),
                      className: 'text-error hover:text-error',
                      disabled: !canTerminateDeposits()
                    }
                  ]}
                />
              </div>
            </div>
          </div>

          <div className="flex-1 overflow-hidden">
            <div 
              ref={tableRef}
              className="h-full overflow-auto" 
              style={{ 
                height: selectedDeposit 
                  ? `calc(100vh - ${detailPanelHeight + headerHeight + tableHeaderHeight + 12}px)`
                  : `calc(100vh - ${headerHeight + tableHeaderHeight + 12}px)`
              }}
            >
              <DepositTable 
                deposits={deposits}
                isDepositsLoading={isLoadingState.isDepositsLoading}
                selectedDeposits={selectedDeposits}
                onSelectAll={() => 
                  setSelectedDeposits(deposits.length === selectedDeposits.length 
                    ? [] 
                    : deposits.map(d => d.deposit_id))
                }
                onSelectDeposit={handleSelectDeposit}
                onRowClick={handleRowClick}
                selectedDeposit={selectedDeposit}
                truncateId={truncateId}
                onUpdateDepositName={handleUpdateDepositName}
                tableHeaderRef={tableHeaderRef}
              />
            </div>
          </div>

          {selectedDeposit && (
            <div className="flex-none">
              <DepositDetails 
                instances={instances}
                networkName={networkName}
                deposit={selectedDeposit}
                onClose={() => {
                  setSelectedDeposit(null);
                  navigate('/deposit');
                }}
                onHeightChange={setDetailPanelHeight}
              />
            </div>
          )}

          {showDepositForm && (
            <PopupWindow
              title={formType === 'new' ? 'Create Deposit' : 'Modify Deposit'}
              content={renderCreateFormContent()}
              onClose={() => setShowDepositForm(false)}
              closeText="Cancel"
              onConfirm={() => {
                if (formType === 'new') {
                  if (!formValues.name || deposits.some(deposit => deposit.name === formValues.name)) {
                    const nameInput = document.querySelector('input[name="name"]')
                    nameInput?.classList.add('shake')
                    setTimeout(() => nameInput?.classList.remove('shake'), 500)
                    return
                  }
                }
                handleFormSubmit()
              }}
              confirmText={formType === 'new' ? 'Create' : 'Modify'}
              tips={formType === 'new' 
                ? 'Create a deposit that can be used to allocate funds to create instances, and each deposit will be charged 0.01GLM.' 
                : 'Modify the deposit amount and valid time, there are no fees for modifying your deposit'}
            />
          )}

          {showTerminateConfirm && (
            <PopupWindow
              title="Terminate Deposit"
              content={renderTerminateConfirmContent()}
              onClose={() => setShowTerminateConfirm(false)}
              closeText="Cancel"
              onConfirm={handleTerminateConfirm}
              tips="Terminate the deposit and withdraw the deposit."
            />
          )}
        </div>
      </div>
    </div>
  )
}
