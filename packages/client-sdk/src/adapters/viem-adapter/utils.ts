import { ClientSDKError, ErrorCode } from '../../types';

/**
 * Normalize errors into ClientSDKError instances
 */
export function wrapError(error: unknown, method?: string, params?: unknown): ClientSDKError {
  // Determine error code based on error type
  let code = ErrorCode.UNKNOWN_ERROR;
  let message = 'An unexpected error occurred';

  if (error instanceof ClientSDKError) {
    // Re-throw ClientSDK errors directly
    throw error;
  }

  // Handle viem-specific errors with type guards
  const errorObj = error as Record<string, unknown> & {
    code?: string | number;
    message?: string;
    data?: { message?: string };
    cancelled?: boolean;
    replacement?: unknown;
    name?: string;
    cause?: { reason?: string };
  };

  const errorMessage = errorObj?.message?.toLowerCase() ?? '';
  const dataMessage = (errorObj?.data?.message as string)?.toLowerCase() ?? '';
  const causeReason = (errorObj?.cause?.reason as string)?.toLowerCase() ?? '';

  // Handle user rejection cases (viem specific and standard)
  if (
    errorObj?.name === 'UserRejectedRequestError' ||
    errorObj?.code === 'ACTION_REJECTED' ||
    errorObj?.code === 4001 || // MetaMask user rejected
    errorMessage.includes('user denied transaction signature') ||
    errorMessage.includes('userrefusedondevice') ||
    (errorMessage.includes('cancelled') && !errorObj?.cancelled) ||
    errorMessage.includes('rejected transaction') ||
    dataMessage.includes('rejected transaction') ||
    errorMessage.includes('user rejected')
  ) {
    code = ErrorCode.TRANSACTION_REJECTED;
    message = 'Transaction Rejected';
  }
  // Handle network switch rejection
  else if (errorObj?.code === 4902) {
    code = ErrorCode.NETWORK_ERROR;
    message = 'Network not available in wallet';
  }
  // Handle transaction replacement cases (viem specific)
  else if (
    errorObj?.name === 'TransactionReplacedError' ||
    errorObj?.code === 'TRANSACTION_REPLACED'
  ) {
    code = ErrorCode.TRANSACTION_REPLACED;
    if (errorObj.cancelled) {
      message = 'Transaction was cancelled';
    } else if (errorObj.replacement) {
      message = 'Transaction was replaced with a new transaction (usually due to speed up)';
    }
  }
  // Handle Ledger specific errors
  else if (errorMessage.includes('ledger') || dataMessage.includes('ledger')) {
    code = ErrorCode.HARDWARE_WALLET_ERROR;
    message = 'Error with Ledger device. Please ensure device is connected and unlocked';
  }
  // Handle pending transaction errors
  else if (
    errorObj?.code === -32002 &&
    errorMessage.includes('pending') &&
    dataMessage.includes('pending')
  ) {
    code = ErrorCode.TRANSACTION_PENDING;
    message = 'Transaction already pending in wallet. Please check your wallet';
  }
  // Handle invalid amount errors
  else if (dataMessage.includes('invalid amount') || errorMessage.includes('invalid amount')) {
    code = ErrorCode.INVALID_INPUT;
    message = 'Price calculation is incorrect, contact support!';
  }
  // Handle insufficient funds (viem specific and standard)
  else if (
    errorObj?.name === 'InsufficientFundsError' ||
    errorObj?.code === 'INSUFFICIENT_FUNDS' ||
    dataMessage.includes('insufficient funds') ||
    errorMessage.includes('insufficient funds') ||
    causeReason.includes('insufficient funds')
  ) {
    code = ErrorCode.INSUFFICIENT_FUNDS;
    message =
      'Your wallet does not have enough funds to complete this transaction. Please try again with a different wallet or add more funds to your wallet.';
  }
  // Handle insufficient balance for transaction
  else if (
    dataMessage.includes('balance too low to proceed') ||
    errorMessage.includes('balance too low to proceed')
  ) {
    code = ErrorCode.INSUFFICIENT_FUNDS;
    message =
      'Your wallet does not have enough funds to complete this transaction. Please try again with a different wallet or add more funds to your wallet.';
  }
  // Handle nonce too low errors
  else if (
    errorObj?.name === 'NonceExhaustedError' ||
    dataMessage.includes('nonce too low') ||
    errorMessage.includes('nonce too low')
  ) {
    code = ErrorCode.NONCE_ERROR;
    message = 'Transaction nonce is too low. Please try again';
  }
  // Handle gas price too low (viem specific)
  else if (
    errorObj?.name === 'FeeCapTooLowError' ||
    errorMessage.includes('max fee per gas less than block base fee') ||
    dataMessage.includes('max fee per gas less than block base fee')
  ) {
    code = ErrorCode.GAS_PRICE_TOO_LOW;
    message = 'Gas price too low for current network conditions. Please try again';
  }
  // Handle timeout errors (viem specific)
  else if (
    errorObj?.name === 'TimeoutError' ||
    errorObj?.code === 'TIMEOUT' ||
    dataMessage.includes('timeout') ||
    errorMessage.includes('timeout')
  ) {
    code = ErrorCode.TIMEOUT;
    message =
      'Transaction timed out. Your wallet connection is having issues. Disconnect and reconnect your wallet, then please try again';
  }
  // Handle network disconnection
  else if (
    dataMessage.includes('network disconnected') ||
    errorMessage.includes('network disconnected')
  ) {
    code = ErrorCode.NETWORK_ERROR;
    message = 'Network connection lost. Please check your internet connection and try again';
  }
  // Handle wrong network errors (viem specific)
  else if (
    errorObj?.name === 'ChainMismatchError' ||
    dataMessage.includes('wrong network') ||
    errorMessage.includes('wrong network')
  ) {
    code = ErrorCode.WRONG_NETWORK;
    message = 'Wrong network selected. Please switch to the correct network';
  }
  // Handle user balance too low to pay for gas fees
  else if (
    dataMessage.includes('insufficient funds for gas') ||
    errorMessage.includes('insufficient funds for gas')
  ) {
    code = ErrorCode.INSUFFICIENT_FUNDS;
    message =
      'Your wallet does not have enough funds to pay for gas fees. Please try again with a different wallet or add more funds to your wallet.';
  }
  // Handle ERC20 transfer amount exceeds balance
  else if (errorMessage.includes('erc20: transfer amount exceeds balance')) {
    code = ErrorCode.INSUFFICIENT_FUNDS;
    message = 'You do not have the required amount of ERC20 tokens to complete this transaction.';
  }
  // Handle base case gas estimation failures (viem specific)
  else if (
    errorObj?.name === 'EstimateGasExecutionError' ||
    errorObj?.code === 'UNPREDICTABLE_GAS_LIMIT' ||
    errorMessage.includes('cannot estimate gas') ||
    dataMessage.includes('cannot estimate gas')
  ) {
    code = ErrorCode.GAS_ESTIMATION_FAILED;
    console.error('Gas estimation error:', error);
    message = 'Unable to estimate gas for transaction. The transaction may fail. Please try again.';
  }
  // Handle call exceptions (viem specific)
  else if (
    errorObj?.name === 'ContractFunctionExecutionError' ||
    errorObj?.code === 'CALL_EXCEPTION'
  ) {
    code = ErrorCode.CONTRACT_ERROR;
    message = 'Transaction failed due to contract execution error';
  }
  // Handle revert errors (viem specific)
  else if (
    errorObj?.name === 'ContractFunctionRevertedError' ||
    errorMessage.includes('revert') ||
    errorMessage.includes('reverted')
  ) {
    code = ErrorCode.TRANSACTION_REVERTED;
    message = 'Transaction reverted';
  }
  // Handle transaction execution errors (viem specific)
  else if (errorObj?.name === 'TransactionExecutionError') {
    code = ErrorCode.TRANSACTION_FAILED;
    message = 'Transaction execution failed';
  }
  // Handle network errors
  else if (
    errorObj?.code === 'NETWORK_ERROR' ||
    errorMessage.includes('network') ||
    errorObj?.name === 'HttpRequestError'
  ) {
    code = ErrorCode.NETWORK_ERROR;
    message = 'Network error occurred';
  }
  // Default case - use original message if available
  else if (errorObj?.message) {
    // For debugging purposes, log the full error
    console.error('Transaction error:', error);
    message = 'Transaction failed. Please try again. If it fails again, please contact support.';
  }

  return new ClientSDKError(code, message, {
    adapterCode: code,
    adapterType: 'viem',
    method,
    params,
    originalError: error,
  });
}
