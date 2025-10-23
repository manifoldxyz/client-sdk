# Advanced use cases

We strongly recommend following this tutorial if you plan to support an [Edition](../../reference/editionproduct.md) product with any of the following configurations:

* Price set using an ERC-20 token

As discussed in [**Transaction Steps**](../../reference/transactionstep.md), purchasing a product might require more than one on-chain transaction. We recommend executing each transaction explicitly (e.g., via button clicks).

This tutorial demonstrates how to handle the above using the SDK.

The repo ships with a full example at [examples/step-by-step-mint](https://github.com/manifoldxyz/client-sdk/tree/main/examples/step-by-step-mint), showing how to implement minting with a [Blind Mint](../../sdk/product/blind-mint/) product.                        &#x20;

**Install dependencies**

```bash
cd examples/step-by-step-mint
npm install
```

**Configure environment** – Copy `.env.example` to `.env` and set  the following:

```bash
NEXT_PUBLIC_INSTANCE_ID= # You blind mint instance ID from Manifold Studio 
NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID= # Get one at https://dashboard.reown.com/sign-in
NEXT_PUBLIC_ALCHEMY_API_KEY= # Get one at https://dashboard.alchemy.com/
```

**Run locally**

```bash
npm run dev
```

**Key implementation steps**

1. Follow [RainbowKit setup instructions](https://rainbowkit.com/docs/installation)

Make sure you render [ConnectButton](https://rainbowkit.com/docs/connect-button) on the page. This handles the user’s wallet connection, which is required to create an [Account](../../reference/account.md) that the SDK uses to perform checks and execute transactions later.

```typescript
'use client';

import { ConnectButton } from '@rainbow-me/rainbowkit';

export default function Home() {
  return (
    <main>
      <div>
        <ConnectButton />
      </div>
    </main>
  );
}
```

3. Implement the [MintButton.tsx](../../examples/step-by-step-mint/src/components/MintButton.tsx)

On button click, initialize the client, fetch the product, and call `preparePurchase` to get the steps.

This is handled within [handlePreparePurchase](https://github.com/manifoldxyz/client-sdk/blob/3131d4374ad98b48ba1d17cc1a29e58428ebd121/examples/step-by-step-mint/src/components/MintButton.tsx#L28).

a. Create a [Manifold Client](../../sdk/manifold-client/)

```typescript
const client = createClient({
  httpRPCs: {
    1: process.env.NEXT_PUBLIC_RPC_URL_MAINNET,
    8453: process.env.NEXT_PUBLIC_RPC_URL_BASE
  }
});
```

b. Fetch the product and validate the type

```typescript
const product = await client.getProduct(INSTANCE_ID);
if (!isBlindMintProduct(product)) {
  throw new Error('Is not a blind mint instance')
}
```

c. Check the product status to ensure it’s still active

```typescript
const productStatus = await product.getStatus();
if (productStatus !== 'active') {
  throw new Error(`Product is ${productStatus}`);
}
```

e. Prepare the purchase by specifying the purchase amount and capture the returned [PreparedPurchase](../../reference/preparedpurchase.md)

```typescript
const preparedPurchase = await product.preparePurchase({
  address: address,
  payload: {
    quantity
  }
});
setPreparedPurchase(prepared)
```

Implement a function responsible for executing an individual step. This is handled in [handleExecuteStep](https://github.com/manifoldxyz/client-sdk/blob/3131d4374ad98b48ba1d17cc1a29e58428ebd121/examples/step-by-step-mint/src/components/MintButton.tsx#L70)

a.  Create an [Account](../../reference/account.md)  representing the connected user.

<pre class="language-tsx"><code class="lang-tsx">import { createAccountViem } from '@manifoldxyz/client-sdk'
<strong>export default function MintButton({ instanceId, quantity = 1 }: MintButtonButtonProps) {
</strong>  const { data: walletClient } = useWalletClient()
  //...other codes
  
  const handlePreparePurchase = async () => {
    const account = createAccountViem({
      walletClient: walletClient
    })
    //...other codes
  }
}
  
</code></pre>

b. Execute the step by calling the [execute](../../sdk/transaction-steps/execute.md) function on each step

<pre class="language-tsx"><code class="lang-tsx">import { createAccountViem } from '@manifoldxyz/client-sdk'
<strong>export default function MintButton({ instanceId, quantity = 1 }: MintButtonButtonProps) {
</strong>  const { data: walletClient } = useWalletClient()
  //...other codes
  
  const handlePreparePurchase = async (stepIndex: number) => {
   //...other codes
   const step = preparedPurchase.steps[stepIndex]
   if (!step) {
    setError('Invalid step index')
    return
   }
   try {
    const result = await step.execute(account)
   catch (error) {
    setError(err.message || 'Transaction failed')
   }
   //...other codes
  }
}
  
</code></pre>

c. Render the [StepModal](../../examples/step-by-step-mint/src/components/StepModal.tsx)

```tsx
  {preparedPurchase && (
      <StepModal
        isOpen={isModalOpen}
        onClose={handleCloseModal}
        steps={preparedPurchase.steps}
        onExecuteStep={handleExecuteStep}
        currentStepIndex={currentStepIndex}
        stepStatuses={stepStatuses}
        totalCost={BigInt(preparedPurchase.cost.total.native.value.toString())}
      />
    )}
```

Putting it all together

```typescript
'use client'

import { useState } from 'react'
import { useAccount } from 'wagmi'
import { createClient, BlindMintProduct, PreparedPurchase, createAccountViem } from '@manifoldxyz/client-sdk'
import { useWalletClient } from 'wagmi'
import StepModal from './StepModal'
import { client } from '@/utils/SDKClient'

interface MintButtonButtonProps {
  instanceId: string
  quantity?: number
}

export default function MintButton({ instanceId, quantity = 1 }: MintButtonButtonProps) {
  const { address, isConnected } = useAccount()
  const { data: walletClient } = useWalletClient()
  
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [product, setProduct] = useState<BlindMintProduct | null>(null)
  const [preparedPurchase, setPreparedPurchase] = useState<PreparedPurchase | null>(null)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [currentStepIndex, setCurrentStepIndex] = useState(0)
  const [stepStatuses, setStepStatuses] = useState<string[]>([])
  const [purchaseComplete, setPurchaseComplete] = useState(false)

  const handlePreparePurchase = async () => {
    if (!address || !walletClient) {
      setError('Please connect your wallet first')
      return
    }

    setIsLoading(true)
    setError(null)
    setPurchaseComplete(false)

    try {

      const fetchedProduct = await client.getProduct(instanceId) as BlindMintProduct
      setProduct(fetchedProduct)

      const status = await fetchedProduct.getStatus()
      if (status !== 'active') {
        throw new Error(`Product is ${status}`)
      }

      const allocations = await fetchedProduct.getAllocations({ recipientAddress: address })
      if (!allocations.isEligible) {
        throw new Error(allocations.reason || 'Not eligible to mint')
      }

      const prepared = await fetchedProduct.preparePurchase({
        address,
        payload: { quantity }
      })

      setPreparedPurchase(prepared)
      setStepStatuses(new Array(prepared.steps.length).fill('idle'))
      setCurrentStepIndex(0)
      setIsModalOpen(true)
    } catch (err) {
      console.error('Error preparing purchase:', err)
      setError(err instanceof Error ? err.message : 'Failed to prepare purchase')
    } finally {
      setIsLoading(false)
    }
  }

  const handleExecuteStep = async (stepIndex: number) => {
    if (!walletClient || !preparedPurchase || !product) {
      setError('Missing required data')
      return
    }

    const step = preparedPurchase.steps[stepIndex]
    if (!step) {
      setError('Invalid step index')
      return
    }

    setStepStatuses(prev => {
      const newStatuses = [...prev]
      newStatuses[stepIndex] = 'executing'
      return newStatuses
    })

    try {
      const account = createAccountViem({
        walletClient: walletClient as any
      })

      const result = await step.execute(account)

      setStepStatuses(prev => {
        const newStatuses = [...prev]
        newStatuses[stepIndex] = 'completed'
        return newStatuses
      })

      if (stepIndex < preparedPurchase.steps.length - 1) {
        setCurrentStepIndex(stepIndex + 1)
      } else {
        setPurchaseComplete(true)
        setTimeout(() => {
          setIsModalOpen(false)
          setCurrentStepIndex(0)
          setStepStatuses([])
        }, 2000)
      }

      console.log(`Step ${stepIndex + 1} completed:`, result)
    } catch (err) {
      console.error(`Error executing step ${stepIndex + 1}:`, err)
      setStepStatuses(prev => {
        const newStatuses = [...prev]
        newStatuses[stepIndex] = 'failed'
        return newStatuses
      })
      setError(err instanceof Error ? err.message : 'Transaction failed')
    }
  }

  const handleCloseModal = () => {
    if (!stepStatuses.some(status => status === 'executing')) {
      setIsModalOpen(false)
      setPreparedPurchase(null)
      setCurrentStepIndex(0)
      setStepStatuses([])
    }
  }

  return (
    <>
      <div className="flex flex-col items-center gap-4">
        {!isConnected ? (
          <p className="text-gray-600">Please connect your wallet to mint</p>
        ) : (
          <button
            onClick={handlePreparePurchase}
            disabled={isLoading}
            className="px-6 py-3 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
          >
            {isLoading ? 'Preparing...' : `Mint ${quantity} Blind Box${quantity > 1 ? 'es' : ''}`}
          </button>
        )}

        {error && (
          <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-red-800 text-sm">{error}</p>
          </div>
        )}

        {purchaseComplete && (
          <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
            <p className="text-green-800 text-sm font-semibold">Purchase completed successfully!</p>
          </div>
        )}
      </div>

      {preparedPurchase && (
        <StepModal
          isOpen={isModalOpen}
          onClose={handleCloseModal}
          steps={preparedPurchase.steps}
          onExecuteStep={handleExecuteStep}
          currentStepIndex={currentStepIndex}
          stepStatuses={stepStatuses}
          formattedCost={preparedPurchase.cost.total.native.formatted}
        />
      )}
    </>
  )
}
```

Best practices:

* Validate the product type using [isBlindMintProduct](../../sdk/product/blind-mint/isblindmintproduct.md) or [isEditionProduct](../../sdk/product/edition-product/iseditionproduct.md) to ensure proper TypeScript typings.
* Run [getStatus](../../sdk/product/common/getstatus.md) before attempting a purchase to verify the product is available.
* Handle [ClientSDKError](../../reference/clientsdkerror.md) codes for scenarios like ineligibility, sold-out items, or insufficient funds.
* See each method’s documentation for detailed error descriptions.

