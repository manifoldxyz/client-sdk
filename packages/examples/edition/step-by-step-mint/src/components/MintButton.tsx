'use client'

import { useState } from 'react'
import { useAccount, useWalletClient } from 'wagmi'
import { EditionProduct, PreparedPurchase, createAccountViem, isEditionProduct } from '@manifoldxyz/client-sdk'
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
  const [product, setProduct] = useState<EditionProduct | null>(null)
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
      const fetchedProduct = await client.getProduct(instanceId)
      
      // Verify it's an Edition product
      if (!isEditionProduct(fetchedProduct)) {
        throw new Error('Product is not an Edition type')
      }
      
      setProduct(fetchedProduct)

      const status = await fetchedProduct.getStatus()
      if (status !== 'active') {
        throw new Error(`Edition product is ${status}`)
      }

      const allocations = await fetchedProduct.getAllocations({ recipientAddress: address })
      if (!allocations.isEligible) {
        throw new Error(allocations.reason || 'Not eligible to mint')
      }

      const prepared = await fetchedProduct.preparePurchase({
        userAddress: address,
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

    setStepStatuses((prev) => {
      const newStatuses = [...prev]
      newStatuses[stepIndex] = 'executing'
      return newStatuses
    })

    try {
      const account = createAccountViem({
        walletClient: walletClient!
      })

      const result = await step.execute(account)

      setStepStatuses((prev) => {
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
      setStepStatuses((prev) => {
        const newStatuses = [...prev]
        newStatuses[stepIndex] = 'failed'
        return newStatuses
      })
      setError(err instanceof Error ? err.message : 'Transaction failed')
    }
  }

  const handleCloseModal = () => {
    if (!stepStatuses.some((status) => status === 'executing')) {
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
            {isLoading ? 'Preparing...' : `Mint ${quantity} Edition${quantity > 1 ? 's' : ''}`}
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
