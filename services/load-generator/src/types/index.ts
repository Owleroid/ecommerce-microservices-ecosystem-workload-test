export interface LoadTestConfig {
  apiUrl: string;
  scenario: 'auth' | 'profile' | 'avatar' | 'all';
  duration: number; // seconds
  rps: number; // requests per second
  mode: 'constant' | 'burst';
  burstInterval?: number; // seconds between bursts
  burstMultiplier?: number; // multiplier for burst RPS
  verbose?: boolean;
}

export interface RequestResult {
  timestamp: number;
  duration: number; // milliseconds
  statusCode: number;
  success: boolean;
  error?: string;
  scenario: string;
  endpoint: string;
}

export interface MetricsSummary {
  scenario: string;
  totalRequests: number;
  successfulRequests: number;
  failedRequests: number;
  errorRate: number;
  duration: number; // seconds
  actualRPS: number;
  latency: {
    min: number;
    max: number;
    mean: number;
    p50: number;
    p90: number;
    p95: number;
    p99: number;
  };
  statusCodes: Record<number, number>;
  errors: Record<string, number>;
}

export interface TestUser {
  email: string;
  password: string;
  accessToken?: string;
}
