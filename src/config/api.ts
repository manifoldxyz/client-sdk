import type { 
  ApiConfig, 
  ApiEndpoints, 
  ApiAuthConfig, 
  ApiRequestConfig, 
  ApiResponseConfig,
  RetryDelayConfig,
  RequestInterceptor,
  ResponseValidationConfig,
  ResponseTransformationConfig,
  ResponseErrorConfig
} from '../types/config';
import type { NetworkId } from '../types/common';

/**
 * API configuration for Manifold services and external integrations
 * Based on BlindMint requirements and gachapon-widgets patterns
 */

// =============================================================================
// ENVIRONMENT-BASED API CONFIGURATION
// =============================================================================

/**
 * Create API configuration based on environment
 */
export function createApiConfig(options: {
  environment?: 'development' | 'production' | 'test';
  apiKey?: string;
  enableAuth?: boolean;
  strictValidation?: boolean;
  customEndpoints?: Partial<ApiEndpoints>;
} = {}): ApiConfig {
  const {
    environment = 'production',
    apiKey,
    enableAuth = true,
    strictValidation = false,
    customEndpoints
  } = options;

  return {
    endpoints: createApiEndpoints(environment, customEndpoints),
    auth: createAuthConfig(apiKey, enableAuth),
    requests: createRequestConfig(environment),
    responses: createResponseConfig(environment, strictValidation)
  };
}

// =============================================================================
// API ENDPOINTS CONFIGURATION
// =============================================================================

/**
 * Configure API endpoints for different environments
 */
function createApiEndpoints(
  environment: string,
  customEndpoints?: Partial<ApiEndpoints>
): ApiEndpoints {
  const baseEndpoints: ApiEndpoints = {
    manifold: getManifoldApiUrl(environment),
    studioApps: getStudioAppsUrl(environment),
    ipfsGateway: getIpfsGatewayUrl(environment),
    arweaveGateway: getArweaveGatewayUrl(environment),
    custom: {
      // Price feeds
      coingecko: 'https://api.coingecko.com/api/v3',
      opensea: 'https://api.opensea.io/v1',
      
      // Gas estimation services
      ethGasStation: 'https://ethgasstation.info/api',
      gasNow: 'https://www.gasnow.org/api/v3',
      
      // Metadata services  
      nftPort: 'https://api.nftport.xyz/v0',
      alchemy: 'https://eth-mainnet.g.alchemy.com/v2',
      
      // Analytics and monitoring
      mixpanel: 'https://api.mixpanel.com',
      sentry: 'https://sentry.io/api/0'
    }
  };

  return {
    ...baseEndpoints,
    ...customEndpoints,
    custom: {
      ...baseEndpoints.custom,
      ...customEndpoints?.custom
    }
  };
}

/**
 * Get Manifold API URL by environment
 */
function getManifoldApiUrl(environment: string): string {
  switch (environment) {
    case 'development':
      return 'https://api-dev.manifold.xyz';
    case 'test':
      return 'http://localhost:3000';
    case 'production':
    default:
      return 'https://api.manifold.xyz';
  }
}

/**
 * Get Studio Apps URL by environment
 */
function getStudioAppsUrl(environment: string): string {
  switch (environment) {
    case 'development':
      return 'https://studio-dev.manifold.xyz';
    case 'test':
      return 'http://localhost:3001';
    case 'production':
    default:
      return 'https://studio.manifold.xyz';
  }
}

/**
 * Get IPFS Gateway URL by environment
 */
function getIpfsGatewayUrl(environment: string): string {
  // Use Manifold's IPFS gateway for better reliability
  return environment === 'test' 
    ? 'http://localhost:8080'
    : 'https://ipfs.manifold.xyz';
}

/**
 * Get Arweave Gateway URL by environment
 */
function getArweaveGatewayUrl(environment: string): string {
  return environment === 'test'
    ? 'http://localhost:1984'
    : 'https://arweave.net';
}

// =============================================================================
// AUTHENTICATION CONFIGURATION
// =============================================================================

/**
 * Configure API authentication
 */
function createAuthConfig(apiKey?: string, enableAuth: boolean = true): ApiAuthConfig {
  return {
    apiKey: enableAuth ? apiKey : undefined,
    strategy: apiKey ? 'api-key' : 'none',
    customHeaders: {
      'User-Agent': 'Manifold-Client-SDK/0.1.0',
      'Accept': 'application/json',
      'Content-Type': 'application/json'
    }
  };
}

// =============================================================================
// REQUEST CONFIGURATION
// =============================================================================

/**
 * Configure API request behavior
 */
function createRequestConfig(environment: string): ApiRequestConfig {
  const isProduction = environment === 'production';
  const isTest = environment === 'test';

  return {
    timeout: isTest ? 1000 : (isProduction ? 10000 : 5000),
    maxRetries: isTest ? 0 : 3,
    retryDelay: createRetryDelayConfig(environment),
    interceptors: createRequestInterceptors(environment)
  };
}

/**
 * Configure retry delay strategy
 */
function createRetryDelayConfig(environment: string): RetryDelayConfig {
  const isTest = environment === 'test';

  return {
    strategy: isTest ? 'fixed' : 'exponential',
    baseDelay: isTest ? 100 : 1000,
    maxDelay: isTest ? 500 : 10000,
    jitter: isTest ? 0 : 0.1
  };
}

/**
 * Configure request interceptors
 */
function createRequestInterceptors(environment: string): RequestInterceptor[] {
  const interceptors: RequestInterceptor[] = [];

  // Add auth interceptor if not in test
  if (environment !== 'test') {
    interceptors.push({
      name: 'auth',
      enabled: true,
      config: {
        headerName: 'Authorization',
        tokenPrefix: 'Bearer'
      }
    });
  }

  // Add request ID interceptor for tracking
  interceptors.push({
    name: 'requestId',
    enabled: true,
    config: {
      headerName: 'X-Request-ID',
      generateId: true
    }
  });

  // Add development logging interceptor
  if (environment === 'development') {
    interceptors.push({
      name: 'logging',
      enabled: true,
      config: {
        logRequests: true,
        logResponses: true,
        logErrors: true
      }
    });
  }

  return interceptors;
}

// =============================================================================
// RESPONSE CONFIGURATION
// =============================================================================

/**
 * Configure API response handling
 */
function createResponseConfig(
  environment: string,
  strictValidation: boolean
): ApiResponseConfig {
  return {
    validation: createValidationConfig(environment, strictValidation),
    transformation: createTransformationConfig(environment),
    errorHandling: createErrorHandlingConfig(environment)
  };
}

/**
 * Configure response validation
 */
function createValidationConfig(
  environment: string,
  strictValidation: boolean
): ResponseValidationConfig {
  return {
    validateSchemas: strictValidation || environment === 'development',
    strict: strictValidation,
    customValidators: [
      'manifold-response',
      'ethereum-address',
      'token-metadata'
    ]
  };
}

/**
 * Configure response transformation
 */
function createTransformationConfig(environment: string): ResponseTransformationConfig {
  return {
    enabled: true,
    preserveOriginal: environment === 'development',
    rules: [
      {
        from: 'data.attributes',
        to: 'attributes',
        condition: 'exists'
      },
      {
        from: 'data.relationships',
        to: 'relationships',
        condition: 'exists'
      },
      {
        from: 'meta.pagination',
        to: 'pagination',
        condition: 'exists'
      }
    ]
  };
}

/**
 * Configure error handling
 */
function createErrorHandlingConfig(environment: string): ResponseErrorConfig {
  return {
    transformStrategy: 'normalize',
    retryOnErrors: [
      'NETWORK_ERROR',
      'TIMEOUT',
      'RATE_LIMITED',
      'SERVER_ERROR'
    ],
    customHandlers: [
      {
        pattern: 'authentication',
        handler: 'refreshAuth',
        continueOnError: false
      },
      {
        pattern: 'rateLimit',
        handler: 'backoff',
        continueOnError: true
      },
      {
        pattern: 'validation',
        handler: 'logAndContinue',
        continueOnError: environment !== 'production'
      }
    ]
  };
}

// =============================================================================
// API ENDPOINT TEMPLATES
// =============================================================================

/**
 * API endpoint templates for different operations
 */
export const API_ENDPOINTS = {
  // Manifold API endpoints
  manifold: {
    product: '/products/{instanceId}',
    products: '/workspaces/{workspaceId}/products',
    allocation: '/products/{instanceId}/allocations',
    purchase: '/products/{instanceId}/purchase',
    metadata: '/metadata/{contractAddress}/{tokenId}',
    workspace: '/workspaces/{workspaceId}'
  },

  // Studio Apps endpoints
  studioApps: {
    blindMint: '/blind-mint/{instanceId}',
    preview: '/preview/{instanceId}',
    config: '/config/{instanceId}',
    analytics: '/analytics/{instanceId}'
  },

  // External service endpoints
  external: {
    coingecko: {
      price: '/simple/price',
      history: '/coins/{id}/market_chart'
    },
    opensea: {
      asset: '/assets/{contractAddress}/{tokenId}',
      collection: '/collections/{slug}',
      events: '/events'
    },
    ethGasStation: {
      gasPrice: '/ethgasAPI.json'
    }
  }
} as const;

// =============================================================================
// NETWORK-SPECIFIC API CONFIGURATIONS
// =============================================================================

/**
 * API configurations that vary by network
 */
export const NETWORK_API_CONFIG: Record<NetworkId, Partial<ApiConfig>> = {
  1: { // Ethereum
    requests: {
      timeout: 15000, // Longer timeout for mainnet
      maxRetries: 5,
      retryDelay: { strategy: 'exponential', baseDelay: 1000, maxDelay: 8000, jitter: 0.1 },
      interceptors: []
    }
  },
  137: { // Polygon
    requests: {
      timeout: 8000,
      maxRetries: 3,
      retryDelay: { strategy: 'exponential', baseDelay: 500, maxDelay: 4000, jitter: 0.1 },
      interceptors: []
    }
  },
  8453: { // Base
    requests: {
      timeout: 5000,
      maxRetries: 2,
      retryDelay: { strategy: 'exponential', baseDelay: 500, maxDelay: 2000, jitter: 0.1 },
      interceptors: []
    }
  },
  42161: { // Arbitrum
    requests: {
      timeout: 5000,
      maxRetries: 2,
      retryDelay: { strategy: 'exponential', baseDelay: 500, maxDelay: 2000, jitter: 0.1 },
      interceptors: []
    }
  },
  10: { // Optimism
    requests: {
      timeout: 5000,
      maxRetries: 2,
      retryDelay: { strategy: 'exponential', baseDelay: 500, maxDelay: 2000, jitter: 0.1 },
      interceptors: []
    }
  }
};

// =============================================================================
// API UTILITIES
// =============================================================================

/**
 * Build URL from endpoint template and parameters
 */
export function buildApiUrl(
  baseUrl: string,
  endpoint: string,
  params: Record<string, string | number>
): string {
  let url = `${baseUrl}${endpoint}`;
  
  Object.entries(params).forEach(([key, value]) => {
    url = url.replace(`{${key}}`, String(value));
  });
  
  return url;
}

/**
 * Get API configuration for specific network
 */
export function getNetworkApiConfig(
  networkId: NetworkId,
  baseConfig: ApiConfig
): ApiConfig {
  const networkOverrides = NETWORK_API_CONFIG[networkId];
  
  if (!networkOverrides) {
    return baseConfig;
  }

  return {
    ...baseConfig,
    requests: {
      ...baseConfig.requests,
      ...networkOverrides.requests
    },
    responses: {
      ...baseConfig.responses,
      ...networkOverrides.responses
    }
  };
}

/**
 * Validate API endpoint parameters
 */
export function validateEndpointParams(
  endpoint: string,
  params: Record<string, unknown>
): boolean {
  const requiredParams = endpoint.match(/{([^}]+)}/g)?.map(p => p.slice(1, -1)) || [];
  
  return requiredParams.every(param => 
    params[param] !== undefined && params[param] !== null
  );
}

// =============================================================================
// DEVELOPMENT AND TESTING CONFIGURATIONS
// =============================================================================

/**
 * API configuration for development environment
 */
export const DEVELOPMENT_API_CONFIG: ApiConfig = createApiConfig({
  environment: 'development',
  enableAuth: false,
  strictValidation: true,
  customEndpoints: {
    manifold: 'http://localhost:3000',
    studioApps: 'http://localhost:3001'
  }
});

/**
 * API configuration for testing environment
 */
export const TEST_API_CONFIG: ApiConfig = createApiConfig({
  environment: 'test',
  enableAuth: false,
  strictValidation: false,
  customEndpoints: {
    manifold: 'http://localhost:3000',
    studioApps: 'http://localhost:3001',
    ipfsGateway: 'http://localhost:8080',
    arweaveGateway: 'http://localhost:1984'
  }
});