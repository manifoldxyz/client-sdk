# Account Adapters

The SDK requires two types of blockchain connections:

## Public Providers

[Public providers](../public-provider-adapters/README.md) enable read-only blockchain operations like fetching balances, estimating gas, and reading contracts. They are **required** when initializing the Manifold Client.

- [Viem Public Provider](../public-provider-adapters/viem.md) - For Viem users
- [Ethers v5 Public Provider](../public-provider-adapters/ethersv5.md) - For Ethers v5 users

## Account Adapters

An [account](../../reference/account.md) is required to execute on-chain transactions.\
Both [**purchase**](../product/common/purchase.md) and [**execute**](../transaction-steps/execute.md) operations require an account, as they involve triggering transactions on the user's behalf.\
The SDK provides convenient methods for creating an account using popular Web3 libraries:

- [**Viem**](viem.md) - Modern, TypeScript-first library
- [**Ethers v5**](ethersv5.md) - Popular, battle-tested library

## Quick Start

```typescript
import { createClient, createPublicProviderViem, createAccountViem } from '@manifoldxyz/client-sdk';
import { createPublicClient, createWalletClient, http } from 'viem';
import { mainnet } from 'viem/chains';

// 1. Create public provider for blockchain reads
const publicClient = createPublicClient({
  chain: mainnet,
  transport: http('YOUR_RPC_URL')
});
const publicProvider = createPublicProviderViem({ 1: publicClient });

// 2. Initialize Manifold client
const client = createClient({ publicProvider });

// 3. Create account for transactions (when needed)
const walletClient = createWalletClient({ /* ... */ });
const account = createAccountViem({ walletClient });
```
