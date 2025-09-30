import { ethers } from 'ethers';
import type { PublicClient } from 'viem';
import { ClientSDKError, ErrorCode } from '../types/errors';

export interface GasEstimationParams {
  contract: ethers.Contract;
  method: string;
  args: unknown[];
  from: string;
  value?: ethers.BigNumber;
  fallbackGas?: ethers.BigNumber;
}

/**
 * Generic gas estimation function with fallback
 * Can be reused across all product types
 */
export async function estimateGas(params: GasEstimationParams): Promise<ethers.BigNumber> {
  const {
    contract,
    method,
    args,
    from,
    value,
    fallbackGas = ethers.BigNumber.from(200000),
  } = params;

  try {
    // Check if the method exists on the contract
    if (!contract.estimateGas[method]) {
      throw new ClientSDKError(
        ErrorCode.ESTIMATION_FAILED,
        `Method ${method} not found on contract`,
      );
    }

    // Prepare overrides
    const overrides: ethers.Overrides & { from?: string; value?: ethers.BigNumber } = { from };
    if (value) {
      overrides.value = value;
    }

    // Estimate gas
    const estimateMethod = contract.estimateGas[method] as (
      ...args: unknown[]
    ) => Promise<ethers.BigNumber>;
    const gasEstimate = await estimateMethod(...args, overrides);

    return gasEstimate;
  } catch (error) {
    console.warn(`Gas estimation failed for ${method}, using fallback:`, error);
    return fallbackGas;
  }
}

/**
 * Apply gas buffer to an estimate
 * @param gasEstimate The base gas estimate
 * @param bufferPercentage Buffer percentage (e.g., 30 for 30%)
 */
export function applyGasBuffer(
  gasEstimate: ethers.BigNumber,
  bufferPercentage: number = 30,
): ethers.BigNumber {
  const buffer = 100 + bufferPercentage;
  return gasEstimate.mul(buffer).div(100);
}

/**
 * Check ERC20 token balance
 */
export async function checkERC20Balance(
  tokenAddress: string,
  ownerAddress: string,
  provider:
    | ethers.providers.JsonRpcProvider
    | ethers.providers.Web3Provider
    | ethers.providers.JsonRpcSigner,
): Promise<ethers.BigNumber> {
  const erc20Abi = ['function balanceOf(address owner) view returns (uint256)'];

  const contract = new ethers.Contract(tokenAddress, erc20Abi, provider);
  const balanceOf = contract.balanceOf as (owner: string) => Promise<ethers.BigNumber>;
  const balance = await balanceOf(ownerAddress);
  return balance;
}

/**
 * Check ERC20 token balance using viem client
 */
export async function checkERC20BalanceViem(
  tokenAddress: string,
  ownerAddress: string,
  publicClient: Pick<PublicClient, 'readContract'>,
): Promise<bigint> {
  const erc20Abi = [
    {
      name: 'balanceOf',
      type: 'function',
      stateMutability: 'view',
      inputs: [{ name: 'owner', type: 'address' }],
      outputs: [{ name: '', type: 'uint256' }],
    },
  ] as const;

  const balance = await publicClient.readContract({
    address: tokenAddress as `0x${string}`,
    abi: erc20Abi,
    functionName: 'balanceOf',
    args: [ownerAddress as `0x${string}`],
  });

  return balance;
}

/**
 * Check ERC20 token allowance
 */
export async function checkERC20Allowance(
  tokenAddress: string,
  ownerAddress: string,
  spenderAddress: string,
  provider: ethers.providers.Provider,
): Promise<ethers.BigNumber> {
  const erc20Abi = ['function allowance(address owner, address spender) view returns (uint256)'];

  const contract = new ethers.Contract(tokenAddress, erc20Abi, provider);
  const allowanceMethod = contract.allowance as (
    owner: string,
    spender: string,
  ) => Promise<ethers.BigNumber>;
  const allowance = await allowanceMethod(ownerAddress, spenderAddress);
  return allowance;
}

/**
 * Create ERC20 approval transaction
 */
export function createERC20ApprovalTx(
  tokenAddress: string,
  spenderAddress: string,
  amount: ethers.BigNumber,
): { to: string; data: string } {
  const erc20Interface = new ethers.utils.Interface([
    'function approve(address spender, uint256 amount)',
  ]);

  const data = erc20Interface.encodeFunctionData('approve', [spenderAddress, amount]);

  return {
    to: tokenAddress,
    data,
  };
}
