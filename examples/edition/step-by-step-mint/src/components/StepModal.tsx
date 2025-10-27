'use client'

import { useState } from 'react'
import { TransactionStep } from '@manifoldxyz/client-sdk'
import { formatEther } from 'viem'

interface StepModalProps {
  isOpen: boolean
  onClose: () => void
  steps: TransactionStep[]
  onExecuteStep: (stepIndex: number) => Promise<void>
  currentStepIndex: number
  stepStatuses: string[]
  formattedCost: string
}

export default function StepModal({
  isOpen,
  onClose,
  steps,
  onExecuteStep,
  currentStepIndex,
  stepStatuses,
  formattedCost
}: StepModalProps) {
  const [isExecuting, setIsExecuting] = useState(false)

  if (!isOpen) return null

  const handleExecuteStep = async (index: number) => {
    setIsExecuting(true)
    try {
      await onExecuteStep(index)
    } catch (error) {
      console.error('Error executing step:', error)
    } finally {
      setIsExecuting(false)
    }
  }

  const getStepStatus = (index: number) => {
    if (stepStatuses[index]) return stepStatuses[index]
    if (index < currentStepIndex) return 'completed'
    if (index === currentStepIndex) return 'pending'
    return 'idle'
  }

  const getStepIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return '✓'
      case 'executing':
        return '⏳'
      case 'failed':
        return '✗'
      case 'pending':
        return '•'
      default:
        return '○'
    }
  }

  const getStepColor = (status: string) => {
    switch (status) {
      case 'completed':
        return 'text-green-500'
      case 'executing':
        return 'text-yellow-500'
      case 'failed':
        return 'text-red-500'
      case 'pending':
        return 'text-blue-500'
      default:
        return 'text-gray-400'
    }
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg max-w-lg w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          <div className="flex justify-between items-start mb-6">
            <div>
              <h2 className="text-2xl font-bold text-gray-900">Transaction Steps</h2>
              <p className="text-sm text-gray-600 mt-1">
                Complete each step to finish your purchase
              </p>
            </div>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-500"
              disabled={isExecuting}
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          <div className="mb-6 p-4 bg-blue-50 rounded-lg">
            <div className="flex justify-between items-center">
              <span className="text-sm font-medium text-gray-700">Total Cost</span>
              <span className="text-lg font-bold text-gray-900">
                {formattedCost} ETH
              </span>
            </div>
          </div>

          <div className="space-y-4">
            {steps.map((step, index) => {
              const status = getStepStatus(index)
              const isCurrentStep = index === currentStepIndex
              const isDisabled = !isCurrentStep || isExecuting || status === 'completed'

              return (
                <div
                  key={index}
                  className={`border rounded-lg p-4 ${
                    isCurrentStep ? 'border-blue-500 bg-blue-50' : 'border-gray-200'
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center mb-2">
                        <span className={`mr-3 text-xl ${getStepColor(status)}`}>
                          {getStepIcon(status)}
                        </span>
                        <h3 className="font-semibold text-gray-900">
                          Step {index + 1}: {step.name || step.type}
                        </h3>
                      </div>
                      
                      {step.description && (
                        <p className="text-sm text-gray-600 ml-8 mb-2">
                          {step.description}
                        </p>
                      )}

                      {step.cost && (
                        <div className="ml-8 text-xs text-gray-500">
                          {step.cost.native && (
                            <span>Cost: {formatEther(BigInt(step.cost.native.value.toString()))} {step.cost.native.symbol}</span>
                          )}
                        </div>
                      )}

                    </div>

                    <button
                      onClick={() => handleExecuteStep(index)}
                      disabled={isDisabled}
                      className={`ml-4 px-4 py-2 rounded-lg font-medium transition-colors ${
                        isDisabled
                          ? 'bg-gray-200 text-gray-400 cursor-not-allowed'
                          : 'bg-blue-600 text-white hover:bg-blue-700'
                      }`}
                    >
                      {status === 'completed' ? 'Done' : 
                       status === 'executing' ? 'Executing...' :
                       isCurrentStep ? 'Execute' : 'Waiting'}
                    </button>
                  </div>
                </div>
              )
            })}
          </div>

          <div className="mt-6 pt-4 border-t">
            <div className="flex justify-between items-center">
              <p className="text-sm text-gray-600">
                Progress: {currentStepIndex} of {steps.length} steps completed
              </p>
              <div className="flex gap-2">
                <button
                  onClick={onClose}
                  disabled={isExecuting}
                  className="px-4 py-2 text-gray-700 hover:text-gray-900 disabled:opacity-50"
                >
                  {currentStepIndex >= steps.length ? 'Close' : 'Cancel'}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}