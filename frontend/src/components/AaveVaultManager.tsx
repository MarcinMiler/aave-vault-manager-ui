import React, { useState } from 'react'
import { useAccount, useReadContract, useWriteContract, useWaitForTransactionReceipt, useSwitchChain } from 'wagmi'
import { parseUnits, formatUnits } from 'viem'
import toast from 'react-hot-toast'
import { CONTRACTS, VAULT_ABI, ERC20_ABI, AAVE_PROTOCOL_DATA_PROVIDER_ABI, MAX_UINT256 } from '../config/web3'
import { base } from 'wagmi/chains'

type AssetType = 'USDC' | 'aUSDC'
type TabType = 'deposit' | 'withdrawal' | 'fee-management'

interface AssetConfig {
  address: `0x${string}`
  decimals: number
  name: string
}

const ASSETS: Record<AssetType, AssetConfig> = {
  USDC: {
    address: CONTRACTS.USDC_ADDRESS,
    decimals: 6,
    name: 'USDC'
  },
  aUSDC: {
    address: CONTRACTS.AUSDC_ADDRESS,
    decimals: 6,
    name: 'aUSDC'
  }
}

export default function AaveVaultManager() {
  const { address, isConnected, chain } = useAccount()
  const [activeTab, setActiveTab] = useState<TabType>('deposit')
  const [depositAmount, setDepositAmount] = useState('')
  const [selectedAsset, setSelectedAsset] = useState<AssetType>('USDC')
  const [isDepositing, setIsDepositing] = useState(false)
  const [newFeePercentage, setNewFeePercentage] = useState('')
  const [isSettingFee, setIsSettingFee] = useState(false)
  const [isClaimingFees, setIsClaimingFees] = useState(false)
  const [currentTransactionType, setCurrentTransactionType] = useState<'deposit' | 'approval' | null>(null)
  const [walletAuthError, setWalletAuthError] = useState(false)
  
  // Withdrawal state
  const [withdrawalAmount, setWithdrawalAmount] = useState('')
  const [selectedWithdrawalAsset, setSelectedWithdrawalAsset] = useState<AssetType>('USDC')
  const [isWithdrawing, setIsWithdrawing] = useState(false)
  
  const { writeContract, data: hash, error } = useWriteContract()
  
  // Separate hook for fee setting to avoid TypeScript conflicts
  const { writeContract: writeContractForFee, data: feeHash, error: feeError } = useWriteContract()
  
  // Separate hook for fee claiming to avoid TypeScript conflicts
  const { writeContract: writeContractForFeeClaim, data: claimHash, error: claimError } = useWriteContract()
  
  // Separate hook for withdrawal to avoid TypeScript conflicts
  const { writeContract: writeContractForWithdrawal, data: withdrawalHash, error: withdrawalError } = useWriteContract()
  
  // Handle chain switching
  const { switchChain } = useSwitchChain()
  const handleSwitchToBase = async () => {
    try {
      await switchChain({ chainId: base.id })
      toast.success('Successfully switched to Base network!')
    } catch (error) {
      console.error('Failed to switch chain:', error)
      toast.error('Failed to switch to Base network. Please switch manually in your wallet.')
    }
  }
  
  // Check if user is on the correct chain
  const isOnCorrectChain = chain?.id === base.id
  
  // Wait for transaction confirmation
  const { isLoading: isConfirming, isSuccess: isConfirmed } = useWaitForTransactionReceipt({
    hash,
  })

  // Wait for fee transaction confirmation
  const { isLoading: isFeeConfirming, isSuccess: isFeeConfirmed } = useWaitForTransactionReceipt({
    hash: feeHash,
  })

  // Wait for fee claim transaction confirmation
  const { isLoading: isClaimConfirming, isSuccess: isClaimConfirmed } = useWaitForTransactionReceipt({
    hash: claimHash,
  })

  // Wait for withdrawal transaction confirmation
  const { isLoading: isWithdrawalConfirming, isSuccess: isWithdrawalConfirmed } = useWaitForTransactionReceipt({
    hash: withdrawalHash,
  })

  const currentAsset = ASSETS[selectedAsset]

  // Read vault total assets
  const { 
    data: totalAssets, 
    refetch: refetchTotalAssets, 
    isLoading: isLoadingTotalAssets, 
    isError: isTotalAssetsError, 
    error: totalAssetsError 
  } = useReadContract({
    address: CONTRACTS.VAULT_ADDRESS,
    abi: VAULT_ABI,
    functionName: 'totalAssets',
  })

  // Read user's selected asset balance
  const { data: assetBalance, isLoading: isLoadingAssetBalance } = useReadContract({
    address: currentAsset.address,
    abi: ERC20_ABI,
    functionName: 'balanceOf',
    args: address ? [address] : undefined,
  })

  // Read selected asset allowance for the vault
  const { data: assetAllowance, refetch: refetchAllowance, isLoading: isLoadingAllowance } = useReadContract({
    address: currentAsset.address,
    abi: ERC20_ABI,
    functionName: 'allowance',
    args: address ? [address, CONTRACTS.VAULT_ADDRESS] : undefined,
  })

  // Read user's USDC balance (for display purposes)
  const { data: usdcBalance, isLoading: isLoadingUsdcBalance } = useReadContract({
    address: CONTRACTS.USDC_ADDRESS,
    abi: ERC20_ABI,
    functionName: 'balanceOf',
    args: address ? [address] : undefined,
  })

  // Read user's aUSDC balance (for display purposes)
  const { data: aUsdcBalance, isLoading: isLoadingAUsdcBalance } = useReadContract({
    address: CONTRACTS.AUSDC_ADDRESS,
    abi: ERC20_ABI,
    functionName: 'balanceOf',
    args: address ? [address] : undefined,
  })

  // Read user's vault shares balance
  const { data: userShares, refetch: refetchUserShares, isLoading: isLoadingUserShares } = useReadContract({
    address: CONTRACTS.VAULT_ADDRESS,
    abi: VAULT_ABI,
    functionName: 'balanceOf',
    args: address ? [address] : undefined,
  })

  // Read maximum deposit amount for the connected user
  const { data: maxDepositAmount, isLoading: isLoadingMaxDeposit, refetch: refetchMaxDeposit } = useReadContract({
    address: CONTRACTS.VAULT_ADDRESS,
    abi: VAULT_ABI,
    functionName: 'maxDeposit',
    args: address ? [address] : undefined,
  })

  // Read maximum withdrawal amount for the connected user
  const { data: maxWithdrawAmount, isLoading: isLoadingMaxWithdraw, refetch: refetchMaxWithdraw } = useReadContract({
    address: CONTRACTS.VAULT_ADDRESS,
    abi: VAULT_ABI,
    functionName: 'maxWithdraw',
    args: address ? [address] : undefined,
  })

  // Read how many assets the user can withdraw with their current shares
  const { data: previewWithdrawAssets, isLoading: isLoadingPreviewWithdraw, refetch: refetchPreviewWithdraw } = useReadContract({
    address: CONTRACTS.VAULT_ADDRESS,
    abi: VAULT_ABI,
    functionName: 'previewRedeem',
    args: userShares ? [userShares] : undefined,
  })

  // Read current vault fee
  const { data: currentFee, isLoading: isLoadingFee } = useReadContract({
    address: CONTRACTS.VAULT_ADDRESS,
    abi: VAULT_ABI,
    functionName: 'getFee',
  })

  // Read contract owner
  const { data: contractOwner, isLoading: isLoadingOwner } = useReadContract({
    address: CONTRACTS.VAULT_ADDRESS,
    abi: VAULT_ABI,
    functionName: 'owner',
  })

  // Read claimable fees
  const { data: claimableFees, isLoading: isLoadingClaimableFees } = useReadContract({
    address: CONTRACTS.VAULT_ADDRESS,
    abi: VAULT_ABI,
    functionName: 'getClaimableFees',
  })

  // Read USDC reserve data directly using the simpler protocol data provider
  const { data: usdcReserveData, isLoading: isLoadingUsdcReserve, error: usdcReserveError } = useReadContract({
    address: CONTRACTS.AAVE_PROTOCOL_DATA_PROVIDER,
    abi: AAVE_PROTOCOL_DATA_PROVIDER_ABI,
    functionName: 'getReserveData',
    args: [CONTRACTS.USDC_ADDRESS],
  })

  const handleApprove = async () => {
    if (!address) return
    
    setCurrentTransactionType('approval')
    toast.loading(`Approving ${currentAsset.name} for vault...`, {
      id: 'approval-transaction',
      duration: Infinity,
    })
    
    try {
      writeContract({
        address: currentAsset.address,
        abi: ERC20_ABI,
        functionName: 'approve',
        args: [CONTRACTS.VAULT_ADDRESS, BigInt(MAX_UINT256)],
        chainId: base.id,
      })
    } catch (err) {
      console.error('Approval failed:', err)
      setCurrentTransactionType(null)
      toast.dismiss('approval-transaction')
    }
  }

  const handleDeposit = async () => {
    if (!depositAmount || !address) return
    
    setIsDepositing(true)
    setCurrentTransactionType('deposit')
    toast.loading(`Depositing ${depositAmount} ${selectedAsset}...`, {
      id: 'deposit-transaction',
      duration: Infinity,
    })
    
    try {
      const amount = parseUnits(depositAmount, currentAsset.decimals)
      
      // Use different contract methods based on the asset type
      const functionName = selectedAsset === 'aUSDC' ? 'depositATokens' : 'deposit'
      
      writeContract({
        address: CONTRACTS.VAULT_ADDRESS,
        abi: VAULT_ABI,
        functionName,
        args: [amount, address],
        chainId: base.id,
      })
    } catch (err) {
      console.error('Deposit failed:', err)
      setCurrentTransactionType(null)
      toast.dismiss('deposit-transaction')
    }
  }

  const handleSetFee = async () => {
    if (!newFeePercentage || !address) return
    
    setIsSettingFee(true)
    toast.loading(`Setting fee to ${newFeePercentage}%...`, {
      id: 'fee-transaction',
      duration: Infinity,
    })
    
    try {
      // Convert percentage to wei (18 decimals)
      // e.g., 10% becomes 0.1 * 10^18
      const feePercentageAsDecimal = parseFloat(newFeePercentage) / 100
      const feeInWei = parseUnits(feePercentageAsDecimal.toString(), 18)
      
      writeContractForFee({
        address: CONTRACTS.VAULT_ADDRESS,
        abi: VAULT_ABI,
        functionName: 'setFee',
        args: [feeInWei],
        chainId: base.id,
      } as any)
    } catch (err) {
      console.error('Set fee failed:', err)
      toast.dismiss('fee-transaction')
    }
  }

  const handleClaimFees = async () => {
    if (!address) return
    
    setIsClaimingFees(true)
    toast.loading('Claiming fees...', {
      id: 'claim-transaction',
      duration: Infinity,
    })
    
    try {
      writeContractForFeeClaim({
        address: CONTRACTS.VAULT_ADDRESS,
        abi: VAULT_ABI,
        functionName: 'claimRewards',
        args: [address],
        chainId: base.id,
      } as any)
    } catch (err) {
      console.error('Claim rewards failed:', err)
      toast.dismiss('claim-transaction')
    }
  }

  const handleWithdraw = async () => {
    if (!withdrawalAmount || !address) return
    
    setIsWithdrawing(true)
    toast.loading(`Withdrawing ${withdrawalAmount} ${selectedWithdrawalAsset}...`, {
      id: 'withdrawal-transaction',
      duration: Infinity,
    })
    
    try {
      const amount = parseUnits(withdrawalAmount, ASSETS[selectedWithdrawalAsset].decimals)
      
      // Use different contract methods based on the asset type
      const functionName = selectedWithdrawalAsset === 'aUSDC' ? 'withdrawATokens' : 'withdraw'
      
      writeContractForWithdrawal({
        address: CONTRACTS.VAULT_ADDRESS,
        abi: VAULT_ABI,
        functionName,
        args: [amount, address, address],
        chainId: base.id,
      })
    } catch (err) {
      console.error('Withdrawal failed:', err)
      toast.dismiss('withdrawal-transaction')
    }
  }

  // Check if user has enough allowance
  const hasEnoughAllowance = () => {
    if (!depositAmount || !assetAllowance) return false
    const amount = parseUnits(depositAmount, currentAsset.decimals)
    // Consider allowance sufficient if it's much larger than the deposit amount
    // This handles both infinite approvals and large finite approvals
    return BigInt(assetAllowance) >= amount
  }

  // Check if deposit amount exceeds maximum allowed
  const isDepositAmountValid = () => {
    if (!depositAmount || !maxDepositAmount) return true
    const amount = parseUnits(depositAmount, currentAsset.decimals)
    return amount <= BigInt(maxDepositAmount)
  }

  // Check if withdrawal amount exceeds maximum allowed
  const isWithdrawalAmountValid = () => {
    if (!withdrawalAmount || !maxWithdrawAmount) return true
    const amount = parseUnits(withdrawalAmount, ASSETS[selectedWithdrawalAsset].decimals)
    return amount <= BigInt(maxWithdrawAmount)
  }

  // Get formatted max deposit for display
  const getFormattedMaxDeposit = () => {
    if (!maxDepositAmount) return '0'
    return formatUnits(BigInt(maxDepositAmount), 6)
  }

  // Format fee as percentage (fee is stored as decimal with 18 decimals, e.g., 0.1e18 = 10%)
  const getFormattedFee = () => {
    if (!currentFee) return '0'
    // Convert from wei (18 decimals) to decimal, then multiply by 100 for percentage
    const feeAsDecimal = formatUnits(BigInt(currentFee), 18)
    const feePercentage = parseFloat(feeAsDecimal) * 100
    return feePercentage.toFixed(2)
  }

  // Format claimable fees in USDC
  const getFormattedClaimableFees = () => {
    if (!claimableFees) return '0'
    // Claimable fees are in USDC (6 decimals)
    return formatUnits(BigInt(claimableFees), 6)
  }

  // Get formatted max withdrawal for display
  const getFormattedMaxWithdraw = () => {
    if (!maxWithdrawAmount) return '0'
    return formatUnits(BigInt(maxWithdrawAmount), 6)
  }

  // Get formatted available assets from shares
  const getFormattedAvailableAssets = () => {
    if (!previewWithdrawAssets) return '0'
    return formatUnits(BigInt(previewWithdrawAssets), 6)
  }

  // Get calculated vault yield (Aave yield - vault fee)
  const getVaultYield = () => {
    if (isLoadingUsdcReserve || isLoadingFee) return 'Loading...'

    if (usdcReserveError || !usdcReserveData || !currentFee) {
      return 'No data'
    }

    try {
      // Get Aave yield percentage
      const liquidityRate = usdcReserveData[5] as bigint
      const liquidityRateDecimal = formatUnits(liquidityRate, 27) // Ray units (27 decimals)
      const aaveYieldPercentage = parseFloat(liquidityRateDecimal) * 100

      // Get vault fee percentage
      const feeAsDecimal = formatUnits(BigInt(currentFee), 18)
      const feePercentage = parseFloat(feeAsDecimal) * 100

      // Calculate vault yield: Aave yield × (1 - fee percentage as decimal)
      // Example: 5.20% yield with 10% fee = 5.20% × (1 - 0.10) = 4.68%
      const feeAsDecimalRatio = feePercentage / 100
      const vaultYield = aaveYieldPercentage * (1 - feeAsDecimalRatio)
      
      return vaultYield.toFixed(2)
    } catch (error) {
      console.error('Error calculating vault yield:', error)
      return 'Calculation Error'
    }
  }

  // Refresh data after successful transaction
  React.useEffect(() => {
    if (isConfirmed) {
      if (currentTransactionType === 'approval') {
        // This is an approval transaction
        refetchAllowance()
        setCurrentTransactionType(null)
        toast.dismiss('approval-transaction')
        toast.success(`${currentAsset.name} approved for vault!`, {
          duration: 4000,
        })
      } else if (currentTransactionType === 'deposit') {
        // This is a deposit transaction
        refetchTotalAssets()
        refetchAllowance()
        refetchMaxDeposit()
        setDepositAmount('')
        setIsDepositing(false)
        setCurrentTransactionType(null)
        toast.dismiss('deposit-transaction')
        toast.success(`Successfully deposited ${selectedAsset}!`, {
          duration: 4000,
        })
      }
    }
  }, [isConfirmed, refetchTotalAssets, refetchAllowance, refetchMaxDeposit, selectedAsset, currentAsset.name, currentTransactionType])

  // Handle deposit and approval transaction errors
  React.useEffect(() => {
    if (error) {
      if (currentTransactionType === 'approval') {
        // This is an approval transaction error
        setCurrentTransactionType(null)
        toast.dismiss('approval-transaction')
        toast.error(`Approval failed: ${error.message || 'Transaction rejected'}`, {
          duration: 6000,
        })
      } else if (currentTransactionType === 'deposit') {
        // This is a deposit transaction error
        setCurrentTransactionType(null)
        toast.dismiss('deposit-transaction')
        toast.error(`Deposit failed: ${error.message || 'Transaction rejected'}`, {
          duration: 6000,
        })
        setIsDepositing(false)
      }
    }
  }, [error, currentTransactionType])

  // Refresh data after successful fee transaction
  React.useEffect(() => {
    if (isFeeConfirmed) {
      refetchTotalAssets() // This will refresh the fee display
      setNewFeePercentage('')
      setIsSettingFee(false)
      toast.dismiss('fee-transaction')
      toast.success('Fee percentage updated successfully!', {
        duration: 4000,
      })
    }
  }, [isFeeConfirmed, refetchTotalAssets])

  // Handle fee transaction errors
  React.useEffect(() => {
    if (feeError) {
      toast.dismiss('fee-transaction')
      toast.error(`Fee update failed: ${feeError.message || 'Transaction rejected'}`, {
        duration: 6000,
      })
      setIsSettingFee(false)
    }
  }, [feeError])

  // Refresh data after successful fee claim transaction
  React.useEffect(() => {
    if (isClaimConfirmed) {
      refetchTotalAssets() // This will refresh the claimable fees display
      setIsClaimingFees(false)
      toast.dismiss('claim-transaction')
      toast.success('Fees claimed successfully!', {
        duration: 4000,
      })
    }
  }, [isClaimConfirmed, refetchTotalAssets])

  // Handle fee claim transaction errors
  React.useEffect(() => {
    if (claimError) {
      toast.dismiss('claim-transaction')
      toast.error(`Fee claim failed: ${claimError.message || 'Transaction rejected'}`, {
        duration: 6000,
      })
      setIsClaimingFees(false)
    }
  }, [claimError])

  // Refresh data after successful withdrawal transaction
  React.useEffect(() => {
    if (isWithdrawalConfirmed) {
      refetchTotalAssets()
      refetchUserShares()
      refetchMaxWithdraw()
      refetchPreviewWithdraw()
      setWithdrawalAmount('')
      setIsWithdrawing(false)
      toast.dismiss('withdrawal-transaction')
      toast.success(`Successfully withdrew ${selectedWithdrawalAsset}!`, {
        duration: 4000,
      })
    }
  }, [isWithdrawalConfirmed, refetchTotalAssets, refetchUserShares, refetchMaxWithdraw, refetchPreviewWithdraw, selectedWithdrawalAsset])

  // Handle withdrawal transaction errors
  React.useEffect(() => {
    if (withdrawalError) {
      toast.dismiss('withdrawal-transaction')
      toast.error(`Withdrawal failed: ${withdrawalError.message || 'Transaction rejected'}`, {
        duration: 6000,
      })
      setIsWithdrawing(false)
    }
  }, [withdrawalError])

  // Debug totalAssets error
  React.useEffect(() => {
    if (isTotalAssetsError && totalAssetsError) {
      console.error('Total Assets Error:', totalAssetsError)
    }
  }, [isTotalAssetsError, totalAssetsError])

  // Handle wallet authorization errors
  React.useEffect(() => {
    const checkWalletAuth = () => {
      try {
        // This will trigger if wallet extension hasn't authorized the site
        if (window.ethereum && !isConnected) {
          window.ethereum.request({ method: 'eth_accounts' })
            .then((accounts: string[]) => {
              if (accounts.length === 0) {
                setWalletAuthError(false)
              }
            })
            .catch((error: any) => {
              if (error.message?.includes('not been authorized') || 
                  error.message?.includes('Unauthorized') ||
                  error.code === 4001) {
                setWalletAuthError(true)
              }
            })
        } else {
          setWalletAuthError(false)
        }
      } catch (error) {
        console.log('Wallet auth check error:', error)
      }
    }

    checkWalletAuth()
  }, [isConnected])

  // Handle wallet connection errors globally
  React.useEffect(() => {
    const handleError = (event: ErrorEvent) => {
      if (event.message?.includes('not been authorized') || 
          event.message?.includes('Unauthorized')) {
        setWalletAuthError(true)
        toast.error('Please connect your wallet to this site', {
          duration: 5000,
          id: 'wallet-auth-error'
        })
      }
    }

    window.addEventListener('error', handleError)
    return () => window.removeEventListener('error', handleError)
  }, [])

  if (!isConnected) {
    return (
      <div style={{ 
        padding: '60px 40px', 
        textAlign: 'center',
        color: '#64748b'
      }}>
        <div style={{
          marginBottom: '20px',
          fontSize: '48px'
        }}>
          🔗
        </div>
        <h2 style={{ 
          color: '#334155',
          marginBottom: '10px',
          fontSize: '1.5rem',
          fontWeight: '600'
        }}>
          Connect your wallet
        </h2>
        <p style={{ margin: '0', fontSize: '16px' }}>
          Connect your wallet to start using the Aave USDC vault
        </p>
        
        {walletAuthError && (
          <div style={{
            marginTop: '20px',
            padding: '16px',
            background: '#fef3c7',
            border: '1px solid #fcd34d',
            borderRadius: '12px',
            color: '#92400e',
            fontSize: '14px'
          }}>
            <strong>⚠️ Wallet Authorization Required</strong>
            <br />
            Your wallet extension needs to authorize this site. Please:
            <ol style={{ margin: '10px 0', textAlign: 'left', paddingLeft: '20px' }}>
              <li>Open your wallet extension (MetaMask, etc.)</li>
              <li>Look for "Connect" or "Connect to site" option</li>
              <li>Authorize localhost:3000 (or this domain)</li>
              <li>Refresh this page</li>
            </ol>
          </div>
        )}
      </div>
    )
  }

  // Check if user is on the wrong chain
  if (!isOnCorrectChain) {
    return (
      <div style={{ 
        padding: '60px 40px', 
        textAlign: 'center',
        color: '#64748b'
      }}>
        <div style={{
          marginBottom: '20px',
          fontSize: '48px'
        }}>
          ⚠️
        </div>
        <h2 style={{ 
          color: '#334155',
          marginBottom: '10px',
          fontSize: '1.5rem',
          fontWeight: '600'
        }}>
          Wrong Network
        </h2>
        <p style={{ margin: '0 0 20px 0', fontSize: '16px' }}>
          Please switch to the Base network to use the Aave USDC vault.
        </p>
        <div style={{ 
          background: '#fef3c7', 
          border: '1px solid #fcd34d',
          borderRadius: '12px',
          padding: '16px',
          marginBottom: '20px',
          fontSize: '14px',
          color: '#92400e'
        }}>
          <strong>Current Network:</strong> {chain?.name || 'Unknown'} (Chain ID: {chain?.id})<br />
          <strong>Required Network:</strong> Base (Chain ID: 8453)
        </div>
        <button
          onClick={handleSwitchToBase}
          style={{
            padding: '12px 24px',
            fontSize: '16px',
            backgroundColor: '#10b981',
            color: 'white',
            border: 'none',
            borderRadius: '12px',
            cursor: 'pointer',
            fontWeight: '600',
            transition: 'background-color 0.2s ease'
          }}
          onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#059669'}
          onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#10b981'}
        >
          Switch to Base Network
        </button>
        <p style={{ margin: '16px 0 0 0', fontSize: '12px', color: '#64748b' }}>
          If the automatic switch doesn't work, please manually switch to Base in your wallet
        </p>
      </div>
    )
  }

  return (
    <div style={{ padding: '0' }}>
      {/* Vault Statistics Section */}
      <div style={{
        padding: '30px 40px',
        borderBottom: '1px solid #e2e8f0',
        background: 'linear-gradient(135deg, #f8fafc 0%, #e2e8f0 100%)'
      }}>
        <h2 style={{
          margin: '0 0 25px 0',
          color: '#1e293b',
          fontSize: '1.5rem',
          fontWeight: '600'
        }}>
          Vault Statistics
        </h2>
        
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
          gap: '20px'
        }}>
          <div style={{
            background: 'white',
            padding: '20px',
            borderRadius: '12px',
            boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
            border: '1px solid #e2e8f0'
          }}>
            <div style={{ color: '#64748b', fontSize: '14px', marginBottom: '8px', fontWeight: '500' }}>
              Total Vault Locked
            </div>
            <div style={{ color: '#1e293b', fontSize: '24px', fontWeight: '700' }}>
              {isLoadingTotalAssets ? (
                '...'
              ) : isTotalAssetsError ? (
                <span style={{ color: '#ef4444', fontSize: '14px' }}>Error</span>
              ) : totalAssets ? (
                `${formatUnits(BigInt(totalAssets), 6)} USDC`
              ) : (
                '0 USDC'
              )}
            </div>
          </div>

          <div style={{
            background: 'white',
            padding: '20px',
            borderRadius: '12px',
            boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
            border: '1px solid #e2e8f0'
          }}>
            <div style={{ color: '#64748b', fontSize: '14px', marginBottom: '8px', fontWeight: '500' }}>
              Current Fee
            </div>
            <div style={{ color: '#1e293b', fontSize: '24px', fontWeight: '700' }}>
              {isLoadingFee ? '...' : `${getFormattedFee()}%`}
            </div>
          </div>

          <div style={{
            background: 'white',
            padding: '20px',
            borderRadius: '12px',
            boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
            border: '1px solid #e2e8f0'
          }}>
            <div style={{ color: '#64748b', fontSize: '14px', marginBottom: '8px', fontWeight: '500' }}>
              Your Vault Shares
            </div>
            <div style={{ color: '#1e293b', fontSize: '20px', fontWeight: '600' }}>
              {isLoadingUserShares ? '...' : `${formatUnits(BigInt(userShares || 0), 18)} shares`}
            </div>
          </div>

          <div style={{
            background: 'white',
            padding: '20px',
            borderRadius: '12px',
            boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
            border: '1px solid #e2e8f0'
          }}>
            <div style={{ color: '#64748b', fontSize: '14px', marginBottom: '8px', fontWeight: '500' }}>
              Total Value of Shares
            </div>
            <div style={{ color: '#1e293b', fontSize: '20px', fontWeight: '600' }}>
              {isLoadingPreviewWithdraw ? '...' : `${getFormattedAvailableAssets()} USDC`}
            </div>
          </div>

          <div style={{
            background: 'white',
            padding: '20px',
            borderRadius: '12px',
            boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
            border: '1px solid #e2e8f0'
          }}>
            <div style={{ color: '#64748b', fontSize: '14px', marginBottom: '8px', fontWeight: '500' }}>
              Aave USDC Yield
            </div>
            <div style={{ color: '#1e293b', fontSize: '20px', fontWeight: '600' }}>
              {isLoadingUsdcReserve ? (
                '...'
              ) : usdcReserveError ? (
                <span style={{ color: '#ef4444', fontSize: '14px' }}>
                  Error: {usdcReserveError.message.slice(0, 30)}...
                </span>
              ) : usdcReserveData ? (
                (() => {
                  try {
                    const liquidityRate = usdcReserveData[5] as bigint
                    const liquidityRateDecimal = formatUnits(liquidityRate, 27)
                    const liquidityRatePercentage = (parseFloat(liquidityRateDecimal) * 100).toFixed(2)
                    return `${liquidityRatePercentage}% APY`
                  } catch (error) {
                    return <span style={{ color: '#ef4444', fontSize: '14px' }}>Parse Error</span>
                  }
                })()
              ) : (
                <span style={{ color: '#ef4444', fontSize: '14px' }}>No data</span>
              )}
            </div>
          </div>

          <div style={{
            background: 'white',
            padding: '20px',
            borderRadius: '12px',
            boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
            border: '1px solid #e2e8f0'
          }}>
            <div style={{ color: '#64748b', fontSize: '14px', marginBottom: '8px', fontWeight: '500' }}>
              Vault Yield
            </div>
            <div style={{ color: '#1e293b', fontSize: '20px', fontWeight: '600' }}>
              {isLoadingUsdcReserve || isLoadingFee ? (
                '...'
              ) : usdcReserveError || !usdcReserveData || !currentFee ? (
                <span style={{ color: '#ef4444', fontSize: '14px' }}>No data</span>
              ) : (
                `${getVaultYield()}%`
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Tab Navigation */}
      <div style={{
        display: 'flex',
        background: '#f8fafc',
        borderBottom: '1px solid #e2e8f0'
      }}>
        <button
          onClick={() => setActiveTab('deposit')}
          style={{
            flex: 1,
            padding: '20px',
            background: activeTab === 'deposit' ? 'white' : 'transparent',
            border: 'none',
            borderBottom: activeTab === 'deposit' ? '3px solid #10b981' : '3px solid transparent',
            cursor: 'pointer',
            fontSize: '16px',
            fontWeight: '600',
            color: activeTab === 'deposit' ? '#10b981' : '#64748b',
            transition: 'all 0.2s ease'
          }}
        >
          💰 Deposit
        </button>
        <button
          onClick={() => setActiveTab('withdrawal')}
          style={{
            flex: 1,
            padding: '20px',
            background: activeTab === 'withdrawal' ? 'white' : 'transparent',
            border: 'none',
            borderBottom: activeTab === 'withdrawal' ? '3px solid #10b981' : '3px solid transparent',
            cursor: 'pointer',
            fontSize: '16px',
            fontWeight: '600',
            color: activeTab === 'withdrawal' ? '#10b981' : '#64748b',
            transition: 'all 0.2s ease'
          }}
        >
          💸 Withdrawal
        </button>
        <button
          onClick={() => setActiveTab('fee-management')}
          style={{
            flex: 1,
            padding: '20px',
            background: activeTab === 'fee-management' ? 'white' : 'transparent',
            border: 'none',
            borderBottom: activeTab === 'fee-management' ? '3px solid #10b981' : '3px solid transparent',
            cursor: 'pointer',
            fontSize: '16px',
            fontWeight: '600',
            color: activeTab === 'fee-management' ? '#10b981' : '#64748b',
            transition: 'all 0.2s ease'
          }}
        >
          🔧 Fee Management
        </button>
      </div>

      {/* Tab Content */}
      <div style={{ padding: '40px' }}>
        {activeTab === 'deposit' && (
          <div>
            {/* Asset Selector */}
            <div style={{ marginBottom: '25px' }}>
              <label style={{ 
                display: 'block', 
                marginBottom: '8px', 
                fontWeight: '600',
                color: '#374151',
                fontSize: '14px'
              }}>
                Select Asset
              </label>
              <select
                value={selectedAsset}
                onChange={(e) => setSelectedAsset(e.target.value as AssetType)}
                style={{
                  width: '100%',
                  padding: '12px 16px',
                  fontSize: '16px',
                  border: '2px solid #e5e7eb',
                  borderRadius: '12px',
                  backgroundColor: 'white',
                  color: '#374151',
                  outline: 'none',
                  transition: 'border-color 0.2s ease'
                }}
                onFocus={(e) => e.target.style.borderColor = '#10b981'}
                onBlur={(e) => e.target.style.borderColor = '#e5e7eb'}
              >
                <option value="USDC">USDC</option>
                <option value="aUSDC">aUSDC</option>
              </select>
            </div>

            {/* Asset Info */}
            <div style={{ 
              marginBottom: '25px', 
              padding: '20px', 
              background: '#f0f9ff', 
              borderRadius: '12px',
              border: '1px solid #bae6fd'
            }}>
              <div style={{ marginBottom: '10px', color: '#0c4a6e', fontSize: '14px' }}>
                <strong>Your {currentAsset.name} Balance:</strong>{' '}
                {isLoadingAssetBalance 
                  ? 'Loading...'
                  : `${formatUnits(BigInt(assetBalance || 0), currentAsset.decimals)} ${currentAsset.name}`
                }
              </div>
              <div style={{ color: '#0c4a6e', fontSize: '14px' }}>
                <strong>Max Deposit Possible:</strong>{' '}
                {isLoadingMaxDeposit ? 'Loading...' : `${getFormattedMaxDeposit()} USDC`}
              </div>
            </div>
            
            {/* Amount Input */}
            <div style={{ marginBottom: '25px' }}>
              <label style={{ 
                display: 'block', 
                marginBottom: '8px', 
                fontWeight: '600',
                color: '#374151',
                fontSize: '14px'
              }}>
                Amount
              </label>
              <div style={{ display: 'flex', gap: '12px' }}>
                <input
                  type="number"
                  placeholder={`Enter ${currentAsset.name} amount`}
                  value={depositAmount}
                  onChange={(e) => setDepositAmount(e.target.value)}
                  style={{
                    flex: 1,
                    padding: '12px 16px',
                    fontSize: '16px',
                    border: `2px solid ${!isDepositAmountValid() ? '#ef4444' : '#e5e7eb'}`,
                    borderRadius: '12px',
                    outline: 'none',
                    transition: 'border-color 0.2s ease'
                  }}
                  onFocus={(e) => e.target.style.borderColor = !isDepositAmountValid() ? '#ef4444' : '#10b981'}
                  onBlur={(e) => e.target.style.borderColor = !isDepositAmountValid() ? '#ef4444' : '#e5e7eb'}
                />
                <button
                  onClick={() => setDepositAmount(getFormattedMaxDeposit())}
                  disabled={!maxDepositAmount || isLoadingMaxDeposit}
                  style={{
                    padding: '12px 20px',
                    fontSize: '14px',
                    backgroundColor: '#10b981',
                    color: 'white',
                    border: 'none',
                    borderRadius: '12px',
                    cursor: 'pointer',
                    fontWeight: '600',
                    transition: 'background-color 0.2s ease'
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#059669'}
                  onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#10b981'}
                >
                  MAX
                </button>
              </div>
              {!isDepositAmountValid() && (
                <div style={{ 
                  marginTop: '8px', 
                  color: '#ef4444', 
                  fontSize: '14px',
                  fontWeight: '500'
                }}>
                  ⚠️ Amount exceeds maximum deposit limit of {getFormattedMaxDeposit()} USDC
                </div>
              )}
            </div>
            
            {/* Action Buttons */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {depositAmount && !hasEnoughAllowance() && (
                <button
                  onClick={handleApprove}
                  disabled={isConfirming}
                  style={{
                    width: '100%',
                    padding: '16px',
                    fontSize: '16px',
                    backgroundColor: '#f59e0b',
                    color: 'white',
                    border: 'none',
                    borderRadius: '12px',
                    cursor: 'pointer',
                    fontWeight: '600',
                    transition: 'background-color 0.2s ease'
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#d97706'}
                  onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#f59e0b'}
                >
                  {isConfirming ? 'Approving...' : `Approve ${currentAsset.name}`}
                </button>
              )}
              
              <button
                onClick={handleDeposit}
                disabled={!depositAmount || !hasEnoughAllowance() || !isDepositAmountValid() || isDepositing || isConfirming}
                style={{
                  width: '100%',
                  padding: '16px',
                  fontSize: '16px',
                  backgroundColor: hasEnoughAllowance() && depositAmount && isDepositAmountValid() ? '#10b981' : '#9ca3af',
                  color: 'white',
                  border: 'none',
                  borderRadius: '12px',
                  cursor: hasEnoughAllowance() && depositAmount && isDepositAmountValid() ? 'pointer' : 'not-allowed',
                  fontWeight: '600',
                  transition: 'background-color 0.2s ease'
                }}
                onMouseEnter={(e) => {
                  if (hasEnoughAllowance() && depositAmount && isDepositAmountValid()) {
                    e.currentTarget.style.backgroundColor = '#059669'
                  }
                }}
                onMouseLeave={(e) => {
                  if (hasEnoughAllowance() && depositAmount && isDepositAmountValid()) {
                    e.currentTarget.style.backgroundColor = '#10b981'
                  }
                }}
              >
                {isDepositing || isConfirming ? 'Depositing...' : `Deposit ${currentAsset.name}`}
              </button>
            </div>
            
            {/* Status Messages */}
            {error && (
              <div style={{ 
                marginTop: '16px', 
                padding: '12px 16px',
                backgroundColor: '#fef2f2',
                border: '1px solid #fecaca',
                borderRadius: '8px',
                color: '#dc2626',
                fontSize: '14px'
              }}>
                Error: {error.message}
              </div>
            )}
            
          </div>
        )}

        {activeTab === 'withdrawal' && (
          <div>
            {/* Asset Selector */}
            <div style={{ marginBottom: '25px' }}>
              <label style={{ 
                display: 'block', 
                marginBottom: '8px', 
                fontWeight: '600',
                color: '#374151',
                fontSize: '14px'
              }}>
                Select Asset
              </label>
              <select
                value={selectedWithdrawalAsset}
                onChange={(e) => setSelectedWithdrawalAsset(e.target.value as AssetType)}
                style={{
                  width: '100%',
                  padding: '12px 16px',
                  fontSize: '16px',
                  border: '2px solid #e5e7eb',
                  borderRadius: '12px',
                  backgroundColor: 'white',
                  color: '#374151',
                  outline: 'none',
                  transition: 'border-color 0.2s ease'
                }}
                onFocus={(e) => e.target.style.borderColor = '#10b981'}
                onBlur={(e) => e.target.style.borderColor = '#e5e7eb'}
              >
                <option value="USDC">USDC</option>
                <option value="aUSDC">aUSDC</option>
              </select>
            </div>

            {/* Asset Info */}
            <div style={{ 
              marginBottom: '25px', 
              padding: '20px', 
              background: '#f0f9ff', 
              borderRadius: '12px',
              border: '1px solid #bae6fd'
            }}>
              <div style={{ marginBottom: '10px', color: '#0c4a6e', fontSize: '14px' }}>
                <strong>Your {ASSETS[selectedWithdrawalAsset].name} Balance:</strong>{' '}
                {selectedWithdrawalAsset === 'USDC' ? (
                  isLoadingUsdcBalance ? 'Loading...' : `${formatUnits(BigInt(usdcBalance || 0), ASSETS[selectedWithdrawalAsset].decimals)} ${ASSETS[selectedWithdrawalAsset].name}`
                ) : (
                  isLoadingAUsdcBalance ? 'Loading...' : `${formatUnits(BigInt(aUsdcBalance || 0), ASSETS[selectedWithdrawalAsset].decimals)} ${ASSETS[selectedWithdrawalAsset].name}`
                )}
              </div>
              <div style={{ marginBottom: '10px', color: '#0c4a6e', fontSize: '14px' }}>
                <strong>Your Vault Shares:</strong>{' '}
                {isLoadingUserShares ? 'Loading...' : `${formatUnits(BigInt(userShares || 0), 18)} shares`}
              </div>
              <div style={{ marginBottom: '10px', color: '#0c4a6e', fontSize: '14px' }}>
                <strong>Available to Withdraw:</strong>{' '}
                {isLoadingPreviewWithdraw ? 'Loading...' : `${getFormattedAvailableAssets()} USDC equivalent`}
              </div>
              <div style={{ color: '#0c4a6e', fontSize: '14px' }}>
                <strong>Max Withdrawal:</strong>{' '}
                {isLoadingMaxWithdraw ? 'Loading...' : `${getFormattedMaxWithdraw()} ${ASSETS[selectedWithdrawalAsset].name}`}
              </div>
            </div>
            
            {/* Amount Input */}
            <div style={{ marginBottom: '25px' }}>
              <label style={{ 
                display: 'block', 
                marginBottom: '8px', 
                fontWeight: '600',
                color: '#374151',
                fontSize: '14px'
              }}>
                Amount
              </label>
              <div style={{ display: 'flex', gap: '12px' }}>
                <input
                  type="number"
                  placeholder={`Enter ${ASSETS[selectedWithdrawalAsset].name} amount`}
                  value={withdrawalAmount}
                  onChange={(e) => setWithdrawalAmount(e.target.value)}
                  style={{
                    flex: 1,
                    padding: '12px 16px',
                    fontSize: '16px',
                    border: `2px solid ${!isWithdrawalAmountValid() ? '#ef4444' : '#e5e7eb'}`,
                    borderRadius: '12px',
                    outline: 'none',
                    transition: 'border-color 0.2s ease'
                  }}
                  onFocus={(e) => e.target.style.borderColor = !isWithdrawalAmountValid() ? '#ef4444' : '#10b981'}
                  onBlur={(e) => e.target.style.borderColor = !isWithdrawalAmountValid() ? '#ef4444' : '#e5e7eb'}
                />
                <button
                  onClick={() => setWithdrawalAmount(getFormattedMaxWithdraw())}
                  disabled={!maxWithdrawAmount || isLoadingMaxWithdraw}
                  style={{
                    padding: '12px 20px',
                    fontSize: '14px',
                    backgroundColor: '#10b981',
                    color: 'white',
                    border: 'none',
                    borderRadius: '12px',
                    cursor: 'pointer',
                    fontWeight: '600',
                    transition: 'background-color 0.2s ease'
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#059669'}
                  onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#10b981'}
                >
                  MAX
                </button>
              </div>
              {!isWithdrawalAmountValid() && (
                <div style={{ 
                  marginTop: '8px', 
                  color: '#ef4444', 
                  fontSize: '14px',
                  fontWeight: '500'
                }}>
                  ⚠️ Amount exceeds maximum withdrawal limit of {getFormattedMaxWithdraw()} {ASSETS[selectedWithdrawalAsset].name}
                </div>
              )}
            </div>
            
            {/* Action Buttons */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              
              <button
                onClick={handleWithdraw}
                disabled={!withdrawalAmount || !isWithdrawalAmountValid() || isWithdrawing || isWithdrawalConfirming || !userShares || userShares === BigInt(0)}
                style={{
                  width: '100%',
                  padding: '16px',
                  fontSize: '16px',
                  backgroundColor: withdrawalAmount && isWithdrawalAmountValid() && userShares && userShares > BigInt(0) ? '#dc2626' : '#9ca3af',
                  color: 'white',
                  border: 'none',
                  borderRadius: '12px',
                  cursor: withdrawalAmount && isWithdrawalAmountValid() && userShares && userShares > BigInt(0) ? 'pointer' : 'not-allowed',
                  fontWeight: '600',
                  transition: 'background-color 0.2s ease'
                }}
                onMouseEnter={(e) => {
                  if (withdrawalAmount && isWithdrawalAmountValid() && userShares && userShares > BigInt(0)) {
                    e.currentTarget.style.backgroundColor = '#b91c1c'
                  }
                }}
                onMouseLeave={(e) => {
                  if (withdrawalAmount && isWithdrawalAmountValid() && userShares && userShares > BigInt(0)) {
                    e.currentTarget.style.backgroundColor = '#dc2626'
                  }
                }}
              >
                {isWithdrawing || isWithdrawalConfirming ? 'Withdrawing...' : `Withdraw ${ASSETS[selectedWithdrawalAsset].name}`}
              </button>
            </div>
            
            {/* Status Messages */}
            {withdrawalError && (
              <div style={{ 
                marginTop: '16px', 
                padding: '12px 16px',
                backgroundColor: '#fef2f2',
                border: '1px solid #fecaca',
                borderRadius: '8px',
                color: '#dc2626',
                fontSize: '14px'
              }}>
                Error: {withdrawalError.message}
              </div>
            )}
            
            {isWithdrawalConfirmed && (
              <div style={{ 
                marginTop: '16px', 
                padding: '12px 16px',
                backgroundColor: '#f0fdf4',
                border: '1px solid #bbf7d0',
                borderRadius: '8px',
                color: '#166534',
                fontSize: '14px',
                fontWeight: '600'
              }}>
                ✅ Withdrawal successful!
              </div>
            )}

            {/* No Shares Warning */}
            {userShares === BigInt(0) && !isLoadingUserShares && (
              <div style={{ 
                marginTop: '16px', 
                padding: '12px 16px',
                backgroundColor: '#fef3c7',
                border: '1px solid #fcd34d',
                borderRadius: '8px',
                color: '#92400e',
                fontSize: '14px',
                fontWeight: '500'
              }}>
                ℹ️ You don't have any vault shares to withdraw. Make a deposit first.
              </div>
            )}
          </div>
        )}

        {activeTab === 'fee-management' && (
          <div>
            {/* Owner Information */}
            <div style={{ 
              marginBottom: '30px', 
              padding: '20px', 
              background: '#f0f9ff', 
              borderRadius: '12px',
              border: '1px solid #bae6fd'
            }}>
              <h3 style={{
                margin: '0 0 15px 0',
                color: '#0c4a6e',
                fontSize: '1.2rem',
                fontWeight: '600'
              }}>
                Access Information
              </h3>
              <div style={{ fontSize: '14px', color: '#0c4a6e', marginBottom: '8px' }}>
                <strong>Current Fee:</strong> {isLoadingFee ? 'Loading...' : `${getFormattedFee()}%`}
              </div>
              <div style={{ fontSize: '14px', color: '#0c4a6e', marginBottom: '8px' }}>
                <strong>Claimable Fees:</strong> {isLoadingClaimableFees ? 'Loading...' : `${getFormattedClaimableFees()} USDC`}
              </div>
              <div style={{ fontSize: '14px', color: '#0c4a6e', marginBottom: '8px' }}>
                <strong>Your Address:</strong> {address}
              </div>
              <div style={{ fontSize: '14px', color: '#0c4a6e', marginBottom: '8px' }}>
                <strong>Owner Address:</strong> {contractOwner || 'Loading...'}
              </div>
              {address && contractOwner && (
                <div style={{ 
                  marginTop: '12px',
                  padding: '10px 12px',
                  borderRadius: '8px',
                  fontSize: '14px',
                  fontWeight: '600',
                  backgroundColor: address.toLowerCase() === contractOwner.toLowerCase() ? '#dcfce7' : '#fef2f2',
                  color: address.toLowerCase() === contractOwner.toLowerCase() ? '#166534' : '#dc2626',
                  border: `1px solid ${address.toLowerCase() === contractOwner.toLowerCase() ? '#bbf7d0' : '#fecaca'}`
                }}>
                  {address.toLowerCase() === contractOwner.toLowerCase() ? 
                    '✅ You are the contract owner and can manage fees' : 
                    '❌ Only the contract owner can modify fees'
                  }
                </div>
              )}
            </div>

            {/* Claimable Fees Card */}
            <div style={{
              marginBottom: '30px',
              padding: '25px',
              background: 'linear-gradient(135deg, #ecfdf5 0%, #f0fdf4 100%)',
              borderRadius: '16px',
              border: '2px solid #10b981',
              boxShadow: '0 4px 12px rgba(16, 185, 129, 0.15)'
            }}>
              <h3 style={{
                margin: '0 0 15px 0',
                color: '#065f46',
                fontSize: '1.3rem',
                fontWeight: '700',
                display: 'flex',
                alignItems: 'center',
                gap: '10px'
              }}>
                💰 Acquired Fees
              </h3>
              <div style={{
                background: 'white',
                padding: '20px',
                borderRadius: '12px',
                border: '1px solid #bbf7d0',
                textAlign: 'center'
              }}>
                <div style={{ color: '#065f46', fontSize: '14px', marginBottom: '8px', fontWeight: '500' }}>
                  Total Claimable Fees
                </div>
                <div style={{ 
                  color: '#065f46', 
                  fontSize: '32px', 
                  fontWeight: '900',
                  textShadow: '0 1px 2px rgba(0,0,0,0.1)'
                }}>
                  {isLoadingClaimableFees ? (
                    <span style={{ fontSize: '18px' }}>Loading...</span>
                  ) : (
                    `${getFormattedClaimableFees()} USDC`
                  )}
                </div>
                <div style={{ 
                  color: '#047857', 
                  fontSize: '12px', 
                  marginTop: '8px',
                  fontWeight: '500'
                }}>
                  Fees accumulated from vault operations
                </div>
                
                {/* Collect Rewards Button - Only show for contract owner */}
                {address && contractOwner && address.toLowerCase() === contractOwner.toLowerCase() && (
                  <div style={{ marginTop: '20px' }}>
                    <button
                      onClick={handleClaimFees}
                      disabled={!claimableFees || BigInt(claimableFees) === BigInt(0) || isClaimingFees || isClaimConfirming}
                      style={{
                        padding: '12px 24px',
                        fontSize: '16px',
                        backgroundColor: claimableFees && BigInt(claimableFees) > BigInt(0) ? '#10b981' : '#9ca3af',
                        color: 'white',
                        border: 'none',
                        borderRadius: '10px',
                        cursor: claimableFees && BigInt(claimableFees) > BigInt(0) ? 'pointer' : 'not-allowed',
                        fontWeight: '600',
                        transition: 'background-color 0.2s ease',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                        margin: '0 auto'
                      }}
                      onMouseEnter={(e) => {
                        if (claimableFees && BigInt(claimableFees) > BigInt(0)) {
                          e.currentTarget.style.backgroundColor = '#059669'
                        }
                      }}
                      onMouseLeave={(e) => {
                        if (claimableFees && BigInt(claimableFees) > BigInt(0)) {
                          e.currentTarget.style.backgroundColor = '#10b981'
                        }
                      }}
                    >
                      {isClaimingFees || isClaimConfirming ? (
                        <>
                          <span>🔄</span>
                          Collecting...
                        </>
                      ) : (
                        <>
                          <span>💵</span>
                          Collect All Rewards
                        </>
                      )}
                    </button>
                    
                    {claimError && (
                      <div style={{ 
                        marginTop: '12px',
                        padding: '8px 12px',
                        backgroundColor: '#fef2f2',
                        border: '1px solid #fecaca',
                        borderRadius: '6px',
                        color: '#dc2626',
                        fontSize: '12px'
                      }}>
                        Error: {claimError.message}
                      </div>
                    )}
                    
                    {isClaimConfirmed && (
                      <div style={{ 
                        marginTop: '12px',
                        padding: '8px 12px',
                        backgroundColor: '#f0fdf4',
                        border: '1px solid #bbf7d0',
                        borderRadius: '6px',
                        color: '#166534',
                        fontSize: '12px',
                        fontWeight: '600'
                      }}>
                        ✅ Rewards collected successfully!
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* Fee Management Form */}
            {address && contractOwner && address.toLowerCase() === contractOwner.toLowerCase() ? (
              <div style={{
                padding: '30px',
                background: '#fffbeb',
                border: '2px solid #fbbf24',
                borderRadius: '12px'
              }}>
                <h3 style={{
                  margin: '0 0 25px 0',
                  color: '#92400e',
                  fontSize: '1.3rem',
                  fontWeight: '600'
                }}>
                  🔧 Update Vault Fee
                </h3>
                
                <div style={{ marginBottom: '25px' }}>
                  <label style={{ 
                    display: 'block', 
                    marginBottom: '8px', 
                    fontWeight: '600',
                    color: '#92400e',
                    fontSize: '14px'
                  }}>
                    New Fee Percentage
                  </label>
                  <input
                    type="number"
                    placeholder="Enter fee percentage (e.g., 2.5 for 2.5%)"
                    value={newFeePercentage}
                    onChange={(e) => setNewFeePercentage(e.target.value)}
                    min="0"
                    max="100"
                    step="0.01"
                    style={{
                      width: '100%',
                      padding: '12px 16px',
                      fontSize: '16px',
                      border: '2px solid #fbbf24',
                      borderRadius: '12px',
                      outline: 'none',
                      backgroundColor: 'white'
                    }}
                  />
                  <div style={{ 
                    marginTop: '8px', 
                    fontSize: '12px', 
                    color: '#92400e'
                  }}>
                    Current fee: {getFormattedFee()}%
                  </div>
                </div>
                
                <button
                  onClick={handleSetFee}
                  disabled={!newFeePercentage || isSettingFee || isFeeConfirming}
                  style={{
                    width: '100%',
                    padding: '16px',
                    fontSize: '16px',
                    backgroundColor: newFeePercentage ? '#dc2626' : '#9ca3af',
                    color: 'white',
                    border: 'none',
                    borderRadius: '12px',
                    cursor: newFeePercentage ? 'pointer' : 'not-allowed',
                    fontWeight: '600',
                    transition: 'background-color 0.2s ease'
                  }}
                  onMouseEnter={(e) => {
                    if (newFeePercentage) {
                      e.currentTarget.style.backgroundColor = '#b91c1c'
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (newFeePercentage) {
                      e.currentTarget.style.backgroundColor = '#dc2626'
                    }
                  }}
                >
                  {isSettingFee || isFeeConfirming ? 'Updating Fee...' : 'Update Fee'}
                </button>
                
                {feeError && (
                  <div style={{ 
                    marginTop: '16px',
                    padding: '12px 16px',
                    backgroundColor: '#fef2f2',
                    border: '1px solid #fecaca',
                    borderRadius: '8px',
                    color: '#dc2626',
                    fontSize: '14px'
                  }}>
                    Error: {feeError.message}
                  </div>
                )}
                
                {isFeeConfirmed && (
                  <div style={{ 
                    marginTop: '16px',
                    padding: '12px 16px',
                    backgroundColor: '#f0fdf4',
                    border: '1px solid #bbf7d0',
                    borderRadius: '8px',
                    color: '#166534',
                    fontSize: '14px',
                    fontWeight: '600'
                  }}>
                    ✅ Fee updated successfully!
                  </div>
                )}
              </div>
            ) : (
              <div style={{
                textAlign: 'center',
                padding: '60px 40px',
                color: '#64748b'
              }}>
                <div style={{
                  marginBottom: '20px',
                  fontSize: '48px'
                }}>
                  🔒
                </div>
                <h3 style={{
                  color: '#334155',
                  marginBottom: '10px',
                  fontSize: '1.3rem',
                  fontWeight: '600'
                }}>
                  Access Restricted
                </h3>
                <p style={{ margin: '0', fontSize: '16px' }}>
                  Only the contract owner can modify vault fees.
                </p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
} 