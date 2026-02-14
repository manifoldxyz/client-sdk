import { parseAbiItem } from 'viem';

/**
 * Normalize an ABI array by converting any human-readable string ABI entries
 * (e.g., "function balanceOf(address owner) view returns (uint256)")
 * into JSON ABI objects that viem/wagmi expect.
 *
 * This prevents errors like "Cannot use 'in' operator to search for 'name' in ..."
 * which occur when string ABI entries are passed to viem's readContract or
 * estimateContractGas functions.
 *
 * @param abi - An ABI array that may contain a mix of JSON objects and human-readable strings
 * @returns A normalized ABI array with all entries as JSON objects
 */
export function normalizeAbi(abi: readonly unknown[]): readonly unknown[] {
  return abi.map((item) => {
    if (typeof item === 'string') {
      try {
        // parseAbiItem expects a specific signature type, but we accept arbitrary strings
        // eslint-disable-next-line @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-return
        return (parseAbiItem as any)(item);
      } catch {
        // If parsing fails, return the original item
        return item;
      }
    }
    return item;
  });
}
