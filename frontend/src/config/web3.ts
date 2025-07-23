import { createConfig, http } from 'wagmi'
import { base } from 'wagmi/chains'
import { getDefaultConfig } from 'connectkit'

export const config = createConfig(
  getDefaultConfig({
    // Your dApps chains
    chains: [base],
    transports: {
      // RPC URL for each chain
      [base.id]: http(),
    },

    // Required API Keys
    walletConnectProjectId: '',

    // Required App Info
    appName: "Ramp AAVE USDC Vault",

    // Optional App Info
    appDescription: "DeFi lending platform for AAVE USDC vault",
    appUrl: "https://lending.ramp.io", // Update this with your actual URL
    appIcon: "https://lending.ramp.io/logo.png", // Update this with your actual icon URL, no bigger than 1024x1024px (max. 1MB)
  }),
)

// Contract addresses on Base
export const CONTRACTS = {
  // Vault contract address (you may need to update this for Base)
  VAULT_ADDRESS: '0x26B3D10418807513f38C35f68Ed011d2250d9eC4' as const,
  // USDC on Base
  USDC_ADDRESS: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913' as const,
  // aUSDC on Base
  AUSDC_ADDRESS: '0x4e65fE4DbA92790696d040ac24Aa414708F5c0AB' as const,
  // Aave V3 contracts on Base
  AAVE_POOL_ADDRESSES_PROVIDER: '0xe20fCBdBfFC4Dd138cE8b2E6FBb6CB49777ad64D' as const,
  AAVE_UI_POOL_DATA_PROVIDER: '0x68100bD5345eA474D93577127C11F39FF8463e93' as const,
  // Alternative data provider (if the UI provider doesn't work)
  AAVE_PROTOCOL_DATA_PROVIDER: '0x2d8A3C5677189723C4cB8873CfC9C8976FDF38Ac' as const,
}

// Constants for infinite approvals
export const MAX_UINT256 = '0xffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff' as const

// Vault ABI - extracted the key functions we need
export const VAULT_ABI = [
  {
    name: 'deposit',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'assets', type: 'uint256' },
      { name: 'receiver', type: 'address' },
    ],
    outputs: [{ name: 'shares', type: 'uint256' }],
  },
  {
    name: 'depositATokens',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'assets', type: 'uint256' },
      { name: 'receiver', type: 'address' },
    ],
    outputs: [{ name: 'shares', type: 'uint256' }],
  },
  {
    name: 'withdraw',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'assets', type: 'uint256' },
      { name: 'receiver', type: 'address' },
      { name: 'owner', type: 'address' },
    ],
    outputs: [{ name: 'shares', type: 'uint256' }],
  },
  {
    name: 'withdrawATokens',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'assets', type: 'uint256' },
      { name: 'receiver', type: 'address' },
      { name: 'owner', type: 'address' },
    ],
    outputs: [{ name: 'shares', type: 'uint256' }],
  },
  {
    name: 'redeem',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'shares', type: 'uint256' },
      { name: 'receiver', type: 'address' },
      { name: 'owner', type: 'address' },
    ],
    outputs: [{ name: 'assets', type: 'uint256' }],
  },
  {
    name: 'redeemAsATokens',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'shares', type: 'uint256' },
      { name: 'receiver', type: 'address' },
      { name: 'owner', type: 'address' },
    ],
    outputs: [{ name: 'assets', type: 'uint256' }],
  },
  {
    name: 'totalAssets',
    type: 'function',
    stateMutability: 'view',
    inputs: [],
    outputs: [{ name: 'totalManagedAssets', type: 'uint256' }],
  },
  {
    name: 'maxDeposit',
    type: 'function',
    stateMutability: 'view',
    inputs: [{ name: '', type: 'address' }],
    outputs: [{ name: 'maxAssets', type: 'uint256' }],
  },
  {
    name: 'maxWithdraw',
    type: 'function',
    stateMutability: 'view',
    inputs: [{ name: 'owner', type: 'address' }],
    outputs: [{ name: 'maxAssets', type: 'uint256' }],
  },
  {
    name: 'maxRedeem',
    type: 'function',
    stateMutability: 'view',
    inputs: [{ name: 'owner', type: 'address' }],
    outputs: [{ name: 'maxShares', type: 'uint256' }],
  },
  {
    name: 'previewWithdraw',
    type: 'function',
    stateMutability: 'view',
    inputs: [{ name: 'assets', type: 'uint256' }],
    outputs: [{ name: 'shares', type: 'uint256' }],
  },
  {
    name: 'previewRedeem',
    type: 'function',
    stateMutability: 'view',
    inputs: [{ name: 'shares', type: 'uint256' }],
    outputs: [{ name: 'assets', type: 'uint256' }],
  },
  {
    name: 'balanceOf',
    type: 'function',
    stateMutability: 'view',
    inputs: [{ name: 'account', type: 'address' }],
    outputs: [{ name: '', type: 'uint256' }],
  },
  {
    name: 'getFee',
    type: 'function',
    stateMutability: 'view',
    inputs: [],
    outputs: [{ name: '', type: 'uint256' }],
  },
  {
    name: 'getClaimableFees',
    type: 'function',
    stateMutability: 'view',
    inputs: [],
    outputs: [{ name: '', type: 'uint256' }],
  },
  {
    name: 'setFee',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [{ name: 'newFee', type: 'uint256' }],
    outputs: [],
  },
  {
    name: 'claimRewards',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [{ name: 'to', type: 'address' }],
    outputs: [],
  },
  {
    name: 'owner',
    type: 'function',
    stateMutability: 'view',
    inputs: [],
    outputs: [{ name: '', type: 'address' }],
  },
  {
    name: 'UNDERLYING',
    type: 'function',
    stateMutability: 'view',
    inputs: [],
    outputs: [{ name: '', type: 'address' }],
  },
] as const

// USDC ABI - for approval and balance checking
export const ERC20_ABI = [
  {
    name: 'approve',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'spender', type: 'address' },
      { name: 'amount', type: 'uint256' },
    ],
    outputs: [{ name: '', type: 'bool' }],
  },
  {
    name: 'balanceOf',
    type: 'function',
    stateMutability: 'view',
    inputs: [{ name: 'account', type: 'address' }],
    outputs: [{ name: '', type: 'uint256' }],
  },
  {
    name: 'allowance',
    type: 'function',
    stateMutability: 'view',
    inputs: [
      { name: 'owner', type: 'address' },
      { name: 'spender', type: 'address' },
    ],
    outputs: [{ name: '', type: 'uint256' }],
  },
] as const

// Aave UiPoolDataProvider ABI - for fetching reserve data including yield information
export const AAVE_UI_POOL_DATA_PROVIDER_ABI = [
  {
    name: 'getReservesData',
    type: 'function',
    stateMutability: 'view',
    inputs: [
      { name: 'provider', type: 'address' },
    ],
    outputs: [
      {
        name: '',
        type: 'tuple[]',
        components: [
          { name: 'underlyingAsset', type: 'address' },
          { name: 'name', type: 'string' },
          { name: 'symbol', type: 'string' },
          { name: 'decimals', type: 'uint256' },
          { name: 'baseLTVasCollateral', type: 'uint256' },
          { name: 'reserveLiquidationThreshold', type: 'uint256' },
          { name: 'reserveLiquidationBonus', type: 'uint256' },
          { name: 'reserveFactor', type: 'uint256' },
          { name: 'usageAsCollateralEnabled', type: 'bool' },
          { name: 'borrowingEnabled', type: 'bool' },
          { name: 'isActive', type: 'bool' },
          { name: 'isFrozen', type: 'bool' },
          { name: 'liquidityIndex', type: 'uint128' },
          { name: 'variableBorrowIndex', type: 'uint128' },
          { name: 'liquidityRate', type: 'uint128' },
          { name: 'variableBorrowRate', type: 'uint128' },
          { name: 'lastUpdateTimestamp', type: 'uint40' },
          { name: 'aTokenAddress', type: 'address' },
          { name: 'variableDebtTokenAddress', type: 'address' },
          { name: 'interestRateStrategyAddress', type: 'address' },
          { name: 'availableLiquidity', type: 'uint256' },
          { name: 'totalScaledVariableDebt', type: 'uint256' },
          { name: 'priceInMarketReferenceCurrency', type: 'uint256' },
          { name: 'priceOracle', type: 'address' },
          { name: 'variableRateSlope1', type: 'uint256' },
          { name: 'variableRateSlope2', type: 'uint256' },
          { name: 'baseVariableBorrowRate', type: 'uint256' },
          { name: 'optimalUsageRatio', type: 'uint256' },
          { name: 'isPaused', type: 'bool' },
          { name: 'isSiloedBorrowing', type: 'bool' },
          { name: 'accruedToTreasury', type: 'uint128' },
          { name: 'unbacked', type: 'uint128' },
          { name: 'isolationModeTotalDebt', type: 'uint128' },
          { name: 'flashLoanEnabled', type: 'bool' },
          { name: 'debtCeiling', type: 'uint256' },
          { name: 'debtCeilingDecimals', type: 'uint256' },
          { name: 'eModeCategoryId', type: 'uint8' },
          { name: 'borrowCap', type: 'uint256' },
          { name: 'supplyCap', type: 'uint256' },
          { name: 'borrowableInIsolation', type: 'bool' },
          { name: 'virtualAccActive', type: 'bool' },
          { name: 'virtualUnderlyingBalance', type: 'uint128' },
        ],
      },
      {
        name: '',
        type: 'tuple',
        components: [
          { name: 'marketReferenceCurrencyUnit', type: 'uint256' },
          { name: 'marketReferenceCurrencyPriceInUsd', type: 'int256' },
          { name: 'networkBaseTokenPriceInUsd', type: 'int256' },
          { name: 'networkBaseTokenPriceDecimals', type: 'uint8' },
        ],
      },
    ],
  },
] as const

// Alternative simpler Aave Protocol Data Provider ABI - for basic reserve data
export const AAVE_PROTOCOL_DATA_PROVIDER_ABI = [
  {
    name: 'getReserveData',
    type: 'function',
    stateMutability: 'view',
    inputs: [
      { name: 'asset', type: 'address' },
    ],
    outputs: [
      { name: 'unbacked', type: 'uint256' },
      { name: 'accruedToTreasuryScaled', type: 'uint256' },
      { name: 'totalAToken', type: 'uint256' },
      { name: 'totalStableDebt', type: 'uint256' },
      { name: 'totalVariableDebt', type: 'uint256' },
      { name: 'liquidityRate', type: 'uint256' },
      { name: 'variableBorrowRate', type: 'uint256' },
      { name: 'stableBorrowRate', type: 'uint256' },
      { name: 'averageStableBorrowRate', type: 'uint256' },
      { name: 'liquidityIndex', type: 'uint256' },
      { name: 'variableBorrowIndex', type: 'uint256' },
      { name: 'lastUpdateTimestamp', type: 'uint40' },
    ],
  },
] as const 